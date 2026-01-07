'use server';

// ============================================================================
// SERVER ACTIONS: Reuniones
// ============================================================================
// CRUD de reuniones y filtros
// ============================================================================

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
import {
  Reunion,
  ReunionActionItem,
  GetReunionesParams,
  GetReunionDetalleResponse,
} from '@/types/reuniones';

// ============================================================================
// OBTENER LISTA DE REUNIONES
// ============================================================================

export async function getReuniones(params: GetReunionesParams = {}) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autorizado', reuniones: [], total: 0 };
    }

    // Construir query
    let query = supabase
      .from('reuniones')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (params.proyecto_id) {
      query = query.eq('proyecto_id', params.proyecto_id);
    }

    if (params.estado) {
      query = query.eq('estado', params.estado);
    }

    if (params.created_by) {
      query = query.eq('created_by', params.created_by);
    }

    // Paginación
    const limit = params.limit || 20;
    const offset = params.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[getReuniones] Error:', error);
      return { success: false, error: error.message, reuniones: [], total: 0 };
    }

    return {
      success: true,
      reuniones: (data as Reunion[]) || [],
      total: count || 0,
      hasMore: count ? offset + limit < count : false,
    };
  } catch (error: any) {
    console.error('[getReuniones] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener reuniones',
      reuniones: [],
      total: 0,
    };
  }
}

// ============================================================================
// OBTENER DETALLE DE REUNIÓN
// ============================================================================

export async function getReunionDetalle(
  reunionId: string
): Promise<{ success: boolean; data?: GetReunionDetalleResponse; error?: string }> {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autorizado' };
    }

    // Obtener reunión
    const { data: reunion, error: reunionError } = await supabase
      .from('reuniones')
      .select('*')
      .eq('id', reunionId)
      .single();

    if (reunionError) {
      console.error('[getReunionDetalle] Error:', reunionError);
      return { success: false, error: reunionError.message };
    }

    // Obtener action items
    const { data: actionItems, error: actionItemsError } = await supabase
      .from('reunion_action_items')
      .select('*')
      .eq('reunion_id', reunionId)
      .order('created_at', { ascending: true });

    if (actionItemsError) {
      console.error('[getReunionDetalle] Error action items:', actionItemsError);
      return {
        success: false,
        error: actionItemsError.message,
      };
    }

    return {
      success: true,
      data: {
        reunion: reunion as Reunion,
        actionItems: (actionItems as ReunionActionItem[]) || [],
      },
    };
  } catch (error: any) {
    console.error('[getReunionDetalle] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener detalle de reunión',
    };
  }
}

// ============================================================================
// ACTUALIZAR ESTADO DE REUNIÓN
// ============================================================================

export async function updateReunionEstado(
  reunionId: string,
  estado: 'procesando' | 'completado' | 'error',
  errorMensaje?: string
) {
  try {
    const supabase = await createClient();

    const updateData: any = {
      estado,
      updated_at: new Date().toISOString(),
    };

    if (estado === 'completado') {
      updateData.processed_at = new Date().toISOString();
    }

    if (estado === 'error' && errorMensaje) {
      updateData.error_mensaje = errorMensaje;
    }

    const { error } = await supabase
      .from('reuniones')
      .update(updateData)
      .eq('id', reunionId);

    if (error) {
      console.error('[updateReunionEstado] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[updateReunionEstado] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al actualizar estado',
    };
  }
}

// ============================================================================
// ELIMINAR REUNIÓN (Solo admin)
// ============================================================================

export async function deleteReunion(reunionId: string) {
  try {
    const supabase = await createClient();

    // Verificar autenticación y rol
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autorizado' };
    }

    // Verificar que es admin
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!usuario || usuario.rol !== 'admin') {
      return {
        success: false,
        error: 'Solo administradores pueden eliminar reuniones',
      };
    }

    // Obtener path del archivo para eliminarlo del storage
    const { data: reunion } = await supabase
      .from('reuniones')
      .select('media_storage_path')
      .eq('id', reunionId)
      .single();

    // Eliminar archivo del storage si existe
    if (reunion?.media_storage_path) {
      await supabase.storage
        .from('reuniones-media')
        .remove([reunion.media_storage_path]);
    }

    // Eliminar reunión (cascade eliminará action items)
    const { error } = await supabase
      .from('reuniones')
      .delete()
      .eq('id', reunionId);

    if (error) {
      console.error('[deleteReunion] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[deleteReunion] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al eliminar reunión',
    };
  }
}
