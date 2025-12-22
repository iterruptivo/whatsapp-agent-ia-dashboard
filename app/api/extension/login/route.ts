import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente Supabase con service role para validaciones
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// CORS headers para la extensión de Chrome
function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email y contraseña son requeridos' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Crear cliente Supabase para autenticación
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Intentar login con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    // Obtener datos del usuario de la tabla usuarios
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, email, nombre, rol, vendedor_id, activo')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado en el sistema' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    // Verificar que el usuario está activo
    if (!userData.activo) {
      return NextResponse.json(
        { success: false, error: 'Tu cuenta ha sido desactivada' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    // Verificar que el usuario tiene rol permitido (vendedor, vendedor_caseta, coordinador, admin, jefe_ventas)
    // SESIÓN 74: Agregar 'coordinador' a roles permitidos
    const rolesPermitidos = ['vendedor', 'vendedor_caseta', 'coordinador', 'admin', 'jefe_ventas'];
    if (!rolesPermitidos.includes(userData.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para usar esta extensión' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    // Obtener proyectos activos
    const { data: proyectos, error: proyectosError } = await supabase
      .from('proyectos')
      .select('id, nombre, slug, color, activo')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (proyectosError) {
      console.error('Error fetching proyectos:', proyectosError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener proyectos' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    // Retornar datos de sesión
    return NextResponse.json({
      success: true,
      session: {
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        expires_at: authData.session?.expires_at,
      },
      user: {
        id: userData.id,
        email: userData.email,
        nombre: userData.nombre,
        rol: userData.rol,
        vendedor_id: userData.vendedor_id,
      },
      proyectos: proyectos || [],
    }, { headers: corsHeaders(origin) });

  } catch (error) {
    console.error('Error en login de extensión:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
