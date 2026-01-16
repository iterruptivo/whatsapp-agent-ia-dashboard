import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { GetReunionesResponse, ReunionListItem, PaginationMetadata } from '@/types/reuniones';

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
// GET /api/reuniones - Obtener lista de reuniones con paginación optimizada
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<GetReunionesResponse>> {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado', reuniones: [], pagination: {} as PaginationMetadata },
        { status: 401 }
      );
    }

    // Obtener datos del usuario para permisos
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado', reuniones: [], pagination: {} as PaginationMetadata },
        { status: 404 }
      );
    }

    // Obtener parámetros de query
    const searchParams = request.nextUrl.searchParams;
    const proyectoId = searchParams.get('proyecto_id');
    const estado = searchParams.get('estado');
    const fechaDesde = searchParams.get('fecha_desde');
    const fechaHasta = searchParams.get('fecha_hasta');
    const createdByFilter = searchParams.get('created_by_filter'); // 'mine', 'all', o UUID

    // Paginación
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    // PASO 1: Query optimizada para lista (sin campos pesados)
    // Incluir campos de permisos para badges de visibilidad
    let query = supabase
      .from('reuniones')
      .select(`
        id,
        titulo,
        fecha_reunion,
        estado,
        duracion_segundos,
        created_at,
        created_by,
        participantes,
        es_publico,
        link_token,
        roles_permitidos,
        usuarios_permitidos
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // LÓGICA DE PERMISOS: Roles administrativos ven todo, otros roles deben estar autorizados
    const rolesAdministrativos = ['superadmin', 'admin', 'gerencia'];
    const esRolAdministrativo = rolesAdministrativos.includes(usuario.rol);

    if (!esRolAdministrativo) {
      // Solo aplica filtros a roles NO administrativos
      query = query.or(
        `created_by.eq.${user.id},usuarios_permitidos.cs.{${user.id}},roles_permitidos.cs.{${usuario.rol}}`
      );
    }
    // Si es rol administrativo, NO aplicamos ningún filtro de permisos (ve todo)

    // Filtro de creador (disponible para roles con acceso)
    if (createdByFilter && esRolAdministrativo) {
      if (createdByFilter === 'mine') {
        query = query.eq('created_by', user.id);
      } else if (createdByFilter !== 'all') {
        // UUID específico
        query = query.eq('created_by', createdByFilter);
      }
      // 'all' = no aplicar filtro
    }

    // Filtros
    if (proyectoId) {
      query = query.eq('proyecto_id', proyectoId);
    }

    if (estado) {
      query = query.eq('estado', estado);
    }

    if (fechaDesde) {
      query = query.gte('fecha_reunion', fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte('fecha_reunion', fechaHasta);
    }

    // Paginación
    query = query.range(offset, offset + limit - 1);

    const { data: reunionesRaw, error: reunionesError, count } = await query;

    if (reunionesError) {
      console.error('[GET /api/reuniones] Error obteniendo reuniones:', reunionesError);
      return NextResponse.json(
        { success: false, error: reunionesError.message, reuniones: [], pagination: {} as PaginationMetadata },
        { status: 500 }
      );
    }

    // PASO 2: Obtener COUNT de action_items para cada reunión
    const reunionIds = reunionesRaw?.map(r => r.id) || [];

    let actionItemsCounts: Record<string, number> = {};
    if (reunionIds.length > 0) {
      const { data: actionItemsData, error: actionItemsError } = await supabase
        .from('reunion_action_items')
        .select('reunion_id')
        .in('reunion_id', reunionIds);

      if (!actionItemsError && actionItemsData) {
        // Contar action items por reunión
        actionItemsCounts = actionItemsData.reduce((acc, item) => {
          acc[item.reunion_id] = (acc[item.reunion_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // PASO 3: Transformar a ReunionListItem
    const reuniones: ReunionListItem[] = (reunionesRaw || []).map((r) => ({
      id: r.id,
      titulo: r.titulo,
      fecha_reunion: r.fecha_reunion,
      estado: r.estado,
      duracion_segundos: r.duracion_segundos,
      created_at: r.created_at,
      created_by: r.created_by,
      action_items_count: actionItemsCounts[r.id] || 0,
      participantes_count: r.participantes ? r.participantes.length : 0,
      es_publico: r.es_publico || false,
      link_token: r.link_token || null,
      roles_permitidos: r.roles_permitidos || null,
      usuarios_permitidos: r.usuarios_permitidos || null,
    }));

    // PASO 4: Metadata de paginación
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    const pagination: PaginationMetadata = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return NextResponse.json({
      success: true,
      reuniones,
      pagination,
    });
  } catch (error: any) {
    console.error('[GET /api/reuniones] Error inesperado:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error interno del servidor',
        reuniones: [],
        pagination: {} as PaginationMetadata,
      },
      { status: 500 }
    );
  }
}
