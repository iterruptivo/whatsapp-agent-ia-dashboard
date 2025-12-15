import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================================================
// FASE 1 CAMBIO 3: Cache de usuarios con TTL 5min
// ============================================================================
interface UserCacheEntry {
  rol: string;
  activo: boolean;
  timestamp: number;
}

const userCache = new Map<string, UserCacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

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

  // ============================================================================
  // SECURITY FIX: Validate session with server (resolves Vercel warning)
  // ============================================================================
  // Session from getSession() comes from cookies and may not be authentic.
  // We must validate it with getUser() which contacts Supabase Auth server.
  let validatedUser = null;

  if (session) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      // Session is invalid (expired, tampered, etc.) - treat as logged out
      console.warn('[MIDDLEWARE] Session validation failed, treating as logged out:', userError?.message);
      // Don't use this session
      validatedUser = null;
    } else {
      // Session is valid and authenticated by server
      validatedUser = user;
    }
  }

  const { pathname } = req.nextUrl;

  // ============================================================================
  // EXTENSION API ROUTES - Allow without middleware auth (API handles its own auth)
  // ============================================================================
  if (pathname.startsWith('/api/extension')) {
    // Las rutas de la extensión Chrome manejan su propia autenticación via Bearer token
    // No necesitan pasar por el middleware de sesión de cookies
    return res;
  }

  // ============================================================================
  // PUBLIC ROUTES - Allow without authentication
  // ============================================================================
  if (pathname === '/login') {
    // If already logged in (and session is valid), redirect to appropriate dashboard
    if (validatedUser) {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', validatedUser.id)
        .single();

      if (userData?.rol === 'admin' || userData?.rol === 'marketing') {
        return NextResponse.redirect(new URL('/', req.url));
      } else if (userData?.rol === 'vendedor' || userData?.rol === 'jefe_ventas') {
        return NextResponse.redirect(new URL('/operativo', req.url));
      } else if (userData?.rol === 'vendedor_caseta' || userData?.rol === 'coordinador') {
        return NextResponse.redirect(new URL('/locales', req.url));
      } else if (userData?.rol === 'finanzas') {
        return NextResponse.redirect(new URL('/control-pagos', req.url));
      }
    }
    return res;
  }

  // ============================================================================
  // PROTECTED ROUTES - Require authentication
  // ============================================================================

  // No validated user - redirect to login
  if (!validatedUser) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // FASE 1 CAMBIO 3: Verificar cache antes de query a usuarios
  let userData: { rol: string; activo: boolean } | null = null;
  const cacheKey = validatedUser.id;
  const cachedEntry = userCache.get(cacheKey);

  if (cachedEntry) {
    const cacheAge = Date.now() - cachedEntry.timestamp;
    if (cacheAge < CACHE_TTL) {
      console.log('[MIDDLEWARE] ✅ Using cached user data (age:', Math.round(cacheAge / 1000), 'seconds)');
      userData = { rol: cachedEntry.rol, activo: cachedEntry.activo };
    } else {
      console.log('[MIDDLEWARE] Cache expired, removing stale entry');
      userCache.delete(cacheKey);
    }
  }

  // Si no hay cache válido, fetch de BD
  if (!userData) {
    console.log('[MIDDLEWARE] Cache miss, fetching from DB');
    const { data, error } = await supabase
      .from('usuarios')
      .select('rol, activo')
      .eq('id', validatedUser.id)
      .single();

    // User not found in usuarios table or error fetching
    // ============================================================================
    // FIX #4: Graceful degradation - NO logout por errores transitorios
    // ============================================================================
    if (error || !data) {
      console.warn('[MIDDLEWARE WARNING] Error fetching user data (allowing access):', error);
      console.warn('[MIDDLEWARE] User will be protected by RLS policies');
      // Permitir acceso - RLS policies + auth-context protegen
      // NO hacer logout por errores transitorios de red/timeout
      return res;
    }

    userData = data;

    // FASE 1 CAMBIO 3: Guardar en cache
    userCache.set(cacheKey, {
      rol: data.rol,
      activo: data.activo,
      timestamp: Date.now()
    });
    console.log('[MIDDLEWARE] ✅ User data cached successfully');
  }

  // User is deactivated
  if (!userData.activo) {
    console.error('User is deactivated:', validatedUser.email);
    await supabase.auth.signOut();
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'deactivated');
    return NextResponse.redirect(loginUrl);
  }

  // ============================================================================
  // ROLE-BASED ACCESS CONTROL
  // ============================================================================

  const isAdminRoute = pathname === '/';
  const isConfiguracionRoute = pathname.startsWith('/configuracion-proyectos');
  const isOperativoRoute = pathname.startsWith('/operativo');
  const isLocalesRoute = pathname.startsWith('/locales');
  const isControlPagosRoute = pathname.startsWith('/control-pagos');
  const isComisionesRoute = pathname.startsWith('/comisiones');
  const isRepulseRoute = pathname.startsWith('/repulse');

  // ADMIN ROUTES (/) - Admin and Marketing can access
  if (isAdminRoute) {
    if (userData.rol === 'admin' || userData.rol === 'marketing') {
      // Admin and Marketing can access Insights
      return res;
    } else if (userData.rol === 'vendedor') {
      // Vendedor trying to access admin dashboard - redirect to operativo
      return NextResponse.redirect(new URL('/operativo', req.url));
    } else if (userData.rol === 'finanzas') {
      // Finanzas SOLO puede acceder a /control-pagos
      return NextResponse.redirect(new URL('/control-pagos', req.url));
    } else if (userData.rol === 'jefe_ventas' || userData.rol === 'vendedor_caseta' || userData.rol === 'coordinador') {
      // Jefe/Caseta/Coordinador trying to access admin - redirect to locales
      return NextResponse.redirect(new URL('/locales', req.url));
    }
    return res;
  }

  // CONFIGURACION ROUTES (/configuracion-proyectos) - Admin only
  if (isConfiguracionRoute) {
    if (userData.rol !== 'admin') {
      // Non-admin trying to access configuracion - redirect based on role
      if (userData.rol === 'vendedor') {
        return NextResponse.redirect(new URL('/operativo', req.url));
      } else if (userData.rol === 'finanzas') {
        return NextResponse.redirect(new URL('/control-pagos', req.url));
      } else if (userData.rol === 'marketing') {
        return NextResponse.redirect(new URL('/', req.url));
      } else if (userData.rol === 'jefe_ventas' || userData.rol === 'vendedor_caseta' || userData.rol === 'coordinador') {
        return NextResponse.redirect(new URL('/locales', req.url));
      }
    }
    // Admin can access
    return res;
  }

  // OPERATIVO ROUTES (/operativo)
  if (isOperativoRoute) {
    // Admin, jefe_ventas, vendedor, vendedor_caseta and marketing can access operativo
    if (userData.rol === 'admin' || userData.rol === 'jefe_ventas' || userData.rol === 'vendedor' || userData.rol === 'vendedor_caseta' || userData.rol === 'marketing') {
      return res;
    }
    // Finanzas SOLO puede acceder a /control-pagos
    if (userData.rol === 'finanzas') {
      return NextResponse.redirect(new URL('/control-pagos', req.url));
    }
    // Coordinador trying to access operativo - redirect to locales
    if (userData.rol === 'coordinador') {
      return NextResponse.redirect(new URL('/locales', req.url));
    }
    return res;
  }

  // LOCALES ROUTES (/locales)
  if (isLocalesRoute) {
    // Finanzas SOLO puede acceder a /control-pagos
    if (userData.rol === 'finanzas') {
      return NextResponse.redirect(new URL('/control-pagos', req.url));
    }
    // Marketing SOLO puede acceder a / y /operativo
    if (userData.rol === 'marketing') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    // ALL other authenticated users can access locales
    return res;
  }

  // CONTROL DE PAGOS ROUTES (/control-pagos) - Admin, jefe_ventas and finanzas
  if (isControlPagosRoute) {
    // Admin, jefe_ventas and finanzas can access
    if (userData.rol === 'admin' || userData.rol === 'jefe_ventas' || userData.rol === 'finanzas') {
      return res;
    }
    // Non-authorized user trying to access control-pagos - redirect based on role
    if (userData.rol === 'vendedor') {
      return NextResponse.redirect(new URL('/operativo', req.url));
    } else if (userData.rol === 'marketing') {
      return NextResponse.redirect(new URL('/', req.url));
    } else if (userData.rol === 'vendedor_caseta' || userData.rol === 'coordinador') {
      return NextResponse.redirect(new URL('/locales', req.url));
    }
    return res;
  }

  // COMISIONES ROUTES (/comisiones)
  if (isComisionesRoute) {
    // Finanzas SOLO puede acceder a /control-pagos
    if (userData.rol === 'finanzas') {
      return NextResponse.redirect(new URL('/control-pagos', req.url));
    }
    // Marketing SOLO puede acceder a / y /operativo
    if (userData.rol === 'marketing') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    // ALL other authenticated users can access comisiones
    return res;
  }

  // REPULSE ROUTES (/repulse) - Admin and jefe_ventas only
  // Nota: Preparado para incluir vendedor en el futuro
  if (isRepulseRoute) {
    if (userData.rol !== 'admin' && userData.rol !== 'jefe_ventas') {
      // Non-authorized user trying to access repulse - redirect based on role
      if (userData.rol === 'vendedor') {
        return NextResponse.redirect(new URL('/operativo', req.url));
      } else if (userData.rol === 'finanzas') {
        return NextResponse.redirect(new URL('/control-pagos', req.url));
      } else if (userData.rol === 'marketing') {
        return NextResponse.redirect(new URL('/', req.url));
      } else if (userData.rol === 'vendedor_caseta' || userData.rol === 'coordinador') {
        return NextResponse.redirect(new URL('/locales', req.url));
      }
    }
    // Admin and jefe_ventas can access
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
