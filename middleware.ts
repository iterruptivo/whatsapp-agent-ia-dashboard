import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // ============================================================================
  // PUBLIC ROUTES - Allow without authentication
  // ============================================================================
  if (pathname === '/login') {
    // If already logged in, redirect to appropriate dashboard
    if (session) {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', session.user.id)
        .single();

      if (userData?.rol === 'admin') {
        return NextResponse.redirect(new URL('/', req.url));
      } else if (userData?.rol === 'vendedor') {
        return NextResponse.redirect(new URL('/operativo', req.url));
      } else if (userData?.rol === 'jefe_ventas' || userData?.rol === 'vendedor_caseta') {
        return NextResponse.redirect(new URL('/locales', req.url));
      }
    }
    return res;
  }

  // ============================================================================
  // PROTECTED ROUTES - Require authentication
  // ============================================================================

  // No session - redirect to login
  if (!session) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch user data to get role
  const { data: userData, error } = await supabase
    .from('usuarios')
    .select('rol, activo')
    .eq('id', session.user.id)
    .single();

  // User not found in usuarios table or error fetching
  // ============================================================================
  // FIX #4: Graceful degradation - NO logout por errores transitorios
  // ============================================================================
  if (error || !userData) {
    console.warn('[MIDDLEWARE WARNING] Error fetching user data (allowing access):', error);
    console.warn('[MIDDLEWARE] User will be protected by RLS policies');
    // Permitir acceso - RLS policies + auth-context protegen
    // NO hacer logout por errores transitorios de red/timeout
    return res;
  }

  // User is deactivated
  if (!userData.activo) {
    console.error('User is deactivated:', session.user.email);
    await supabase.auth.signOut();
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'deactivated');
    return NextResponse.redirect(loginUrl);
  }

  // ============================================================================
  // ROLE-BASED ACCESS CONTROL
  // ============================================================================

  const isAdminRoute = pathname === '/';
  const isOperativoRoute = pathname.startsWith('/operativo');
  const isLocalesRoute = pathname.startsWith('/locales');

  // ADMIN ROUTES (/)
  if (isAdminRoute) {
    if (userData.rol === 'vendedor') {
      // Vendedor trying to access admin dashboard - redirect to operativo
      return NextResponse.redirect(new URL('/operativo', req.url));
    } else if (userData.rol === 'jefe_ventas' || userData.rol === 'vendedor_caseta') {
      // Jefe/Caseta trying to access admin - redirect to locales
      return NextResponse.redirect(new URL('/locales', req.url));
    }
    // Admin can access
    return res;
  }

  // OPERATIVO ROUTES (/operativo)
  if (isOperativoRoute) {
    // Admin and vendedor can access operativo
    if (userData.rol === 'admin' || userData.rol === 'vendedor') {
      return res;
    }
    // Jefe/Caseta trying to access operativo - redirect to locales
    if (userData.rol === 'jefe_ventas' || userData.rol === 'vendedor_caseta') {
      return NextResponse.redirect(new URL('/locales', req.url));
    }
    return res;
  }

  // LOCALES ROUTES (/locales)
  if (isLocalesRoute) {
    // ALL authenticated users can access locales (admin, vendedor, jefe_ventas, vendedor_caseta)
    return res;
  }

  // Default: allow access (for any other authenticated routes)
  return res;
}

// ============================================================================
// MATCHER CONFIGURATION
// ============================================================================
// Only run middleware on these routes
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.gif).*)',
  ],
};
