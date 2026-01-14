import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { UpdateReunionRequest, UpdateReunionResponse, Reunion } from '@/types/reuniones';

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
// GET /api/reuniones/[id] - Obtener detalle de reunión
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reunionId } = await params;
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener reunión
    const { data: reunion, error: reunionError } = await supabase
      .from('reuniones')
      .select('*')
      .eq('id', reunionId)
      .single();

    if (reunionError) {
      console.error('[GET /api/reuniones/[id]] Error:', reunionError);
      return NextResponse.json(
        { error: reunionError.message },
        { status: reunionError.code === 'PGRST116' ? 404 : 500 }
      );
    }

    // Obtener action items
    const { data: actionItems, error: actionItemsError } = await supabase
      .from('reunion_action_items')
      .select('*')
      .eq('reunion_id', reunionId)
      .order('created_at', { ascending: true });

    if (actionItemsError) {
      console.error('[GET /api/reuniones/[id]] Error action items:', actionItemsError);
      return NextResponse.json(
        { error: actionItemsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reunion,
      actionItems: actionItems || [],
    });
  } catch (error: any) {
    console.error('[GET /api/reuniones/[id]] Error inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/reuniones/[id] - Editar título y fecha de reunión
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<UpdateReunionResponse>> {
  try {
    const { id: reunionId } = await params;
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar permisos (solo superadmin, admin, jefe_ventas)
    const { data: perfil, error: perfilError } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (perfilError || !perfil) {
      console.error('[PATCH /api/reuniones/[id]] Error obteniendo perfil:', perfilError);
      return NextResponse.json(
        { success: false, error: 'No se pudo verificar permisos' },
        { status: 403 }
      );
    }

    const rolesPermitidos = ['superadmin', 'admin', 'jefe_ventas'];
    if (!rolesPermitidos.includes(perfil.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para editar reuniones' },
        { status: 403 }
      );
    }

    const body: UpdateReunionRequest = await request.json();

    // Validaciones
    const updates: Partial<Reunion> = {};

    if (body.titulo !== undefined) {
      const titulo = body.titulo.trim();
      if (titulo.length < 3) {
        return NextResponse.json(
          { success: false, error: 'El título debe tener al menos 3 caracteres' },
          { status: 400 }
        );
      }
      if (titulo.length > 200) {
        return NextResponse.json(
          { success: false, error: 'El título no puede exceder 200 caracteres' },
          { status: 400 }
        );
      }
      updates.titulo = titulo;
    }

    if (body.fecha_reunion !== undefined) {
      if (body.fecha_reunion === null) {
        updates.fecha_reunion = null;
      } else {
        // Validar que sea una fecha ISO válida
        const fecha = new Date(body.fecha_reunion);
        if (isNaN(fecha.getTime())) {
          return NextResponse.json(
            { success: false, error: 'Fecha de reunión inválida (debe ser ISO 8601)' },
            { status: 400 }
          );
        }
        updates.fecha_reunion = body.fecha_reunion;
      }
    }

    // Si no hay nada que actualizar
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    // Actualizar reunión
    const { data: reunionActualizada, error: updateError } = await supabase
      .from('reuniones')
      .update(updates)
      .eq('id', reunionId)
      .select('*')
      .single();

    if (updateError) {
      console.error('[PATCH /api/reuniones/[id]] Error actualizando:', updateError);
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Reunión no encontrada' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    console.log(`[PATCH /api/reuniones/[id]] Reunión ${reunionId} actualizada por usuario ${user.id}`);

    return NextResponse.json({
      success: true,
      reunion: reunionActualizada as Reunion,
    });
  } catch (error: any) {
    console.error('[PATCH /api/reuniones/[id]] Error inesperado:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
