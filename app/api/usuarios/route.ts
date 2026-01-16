import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper para crear cliente Supabase
async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

// ============================================================================
// GET /api/usuarios - Obtener lista de usuarios
// ============================================================================
// Query params:
//   - activos_only: boolean (default: true) - Solo usuarios activos
//   - rol: string - Filtrar por rol específico
//   - con_reuniones: boolean - Solo usuarios que han creado reuniones
//   - proyecto_id: string - Requerido si con_reuniones=true
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado', usuarios: [] },
        { status: 401 }
      );
    }

    // Obtener parámetros de query
    const searchParams = request.nextUrl.searchParams;
    const activosOnly = searchParams.get('activos_only') !== 'false';
    const rol = searchParams.get('rol');
    const conReuniones = searchParams.get('con_reuniones') === 'true';
    const proyectoId = searchParams.get('proyecto_id');

    // Si se solicita filtrar por reuniones, proyecto_id es requerido
    if (conReuniones && !proyectoId) {
      return NextResponse.json(
        { success: false, error: 'proyecto_id es requerido cuando con_reuniones=true', usuarios: [] },
        { status: 400 }
      );
    }

    // Si se solicita filtrar por usuarios con reuniones
    if (conReuniones) {
      // PASO 1: Obtener IDs únicos de usuarios que han creado reuniones en el proyecto
      const { data: reunionesData, error: reunionesError } = await supabase
        .from('reuniones')
        .select('created_by')
        .eq('proyecto_id', proyectoId!)
        .not('created_by', 'is', null);

      if (reunionesError) {
        console.error('[GET /api/usuarios] Error obteniendo reuniones:', reunionesError);
        return NextResponse.json(
          { success: false, error: reunionesError.message, usuarios: [] },
          { status: 500 }
        );
      }

      // Extraer IDs únicos de creadores
      const creatorsIds = Array.from(
        new Set(reunionesData?.map(r => r.created_by).filter(Boolean) || [])
      );

      // Si no hay creadores, retornar lista vacía
      if (creatorsIds.length === 0) {
        return NextResponse.json({
          success: true,
          usuarios: [],
          total: 0,
        });
      }

      // PASO 2: Obtener usuarios que están en la lista de creadores
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, nombre, email, rol, activo')
        .in('id', creatorsIds);

      if (usuariosError) {
        console.error('[GET /api/usuarios] Error obteniendo usuarios:', usuariosError);
        return NextResponse.json(
          { success: false, error: usuariosError.message, usuarios: [] },
          { status: 500 }
        );
      }

      // Filtrar por activos si se solicita
      let usuarios = usuariosData || [];
      if (activosOnly) {
        usuarios = usuarios.filter(u => u.activo);
      }

      // Filtrar por rol si se especifica
      if (rol) {
        usuarios = usuarios.filter(u => u.rol === rol);
      }

      // Ordenar por nombre
      usuarios.sort((a, b) => a.nombre.localeCompare(b.nombre));

      return NextResponse.json({
        success: true,
        usuarios,
        total: usuarios.length,
      });
    }

    // Flujo normal (sin filtro de reuniones)
    let query = supabase
      .from('usuarios')
      .select('id, nombre, email, rol, activo')
      .order('nombre', { ascending: true });

    // Filtrar por activos
    if (activosOnly) {
      query = query.eq('activo', true);
    }

    // Filtrar por rol si se especifica
    if (rol) {
      query = query.eq('rol', rol);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /api/usuarios] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message, usuarios: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      usuarios: data || [],
      total: data?.length || 0,
    });
  } catch (error: any) {
    console.error('[GET /api/usuarios] Error inesperado:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno', usuarios: [] },
      { status: 500 }
    );
  }
}
