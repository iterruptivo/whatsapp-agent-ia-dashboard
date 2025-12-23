import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente Supabase con anon key (público)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// CORS headers para permitir acceso desde cualquier origen (app móvil)
function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

/**
 * GET /api/public/proyectos
 *
 * Endpoint público para obtener todos los proyectos activos.
 * NO requiere autenticación.
 *
 * Usado por: App móvil para cargar dropdown de proyectos en login
 *
 * Response:
 * {
 *   "success": true,
 *   "proyectos": [
 *     { "id": "uuid", "nombre": "Proyecto Trapiche", "slug": "trapiche", "color": "#1b967a" }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');

  try {
    // Crear cliente Supabase público
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Obtener proyectos activos (ordenados alfabéticamente)
    const { data: proyectos, error: proyectosError } = await supabase
      .from('proyectos')
      .select('id, nombre, slug, color')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (proyectosError) {
      console.error('Error fetching proyectos:', proyectosError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener proyectos' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    // Retornar lista de proyectos
    return NextResponse.json({
      success: true,
      proyectos: proyectos || [],
    }, { headers: corsHeaders(origin) });

  } catch (error) {
    console.error('Error en GET /api/public/proyectos:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
