'use server';

// ============================================================================
// SERVER ACTIONS: Action Items
// ============================================================================
// CRUD de action items y vincular a usuarios
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
import { ActionItemWithReunion } from '@/types/reuniones';

// ============================================================================
// OBTENER ACTION ITEMS DEL USUARIO
// ============================================================================

export async function getUserActionItems(includeCompleted: boolean = false) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autorizado', actionItems: [] };
    }

    // Obtener action items del usuario con información de la reunión
    const { data, error } = await supabase
      .from('reunion_action_items')
      .select(
        `
        *,
        reuniones (
          titulo,
          fecha_reunion
        )
      `
      )
      .eq('asignado_usuario_id', user.id)
      .eq('completado', includeCompleted ? undefined : false)
      .order('deadline', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getUserActionItems] Error:', error);
      return { success: false, error: error.message, actionItems: [] };
    }

    // Transformar datos
    const actionItems: ActionItemWithReunion[] = (data || []).map((item: any) => ({
      ...item,
      reunion_titulo: item.reuniones?.titulo || 'Sin título',
      reunion_fecha: item.reuniones?.fecha_reunion || null,
    }));

    return {
      success: true,
      actionItems,
    };
  } catch (error: any) {
    console.error('[getUserActionItems] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener action items',
      actionItems: [],
    };
  }
}

// ============================================================================
// MARCAR ACTION ITEM COMO COMPLETADO
// ============================================================================

export async function markActionItemCompleted(
  actionItemId: string,
  completed: boolean = true
) {
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

    const updateData: any = {
      completado: completed,
    };

    if (completed) {
      updateData.completado_at = new Date().toISOString();
      updateData.completado_por = user.id;
    } else {
      updateData.completado_at = null;
      updateData.completado_por = null;
    }

    const { error } = await supabase
      .from('reunion_action_items')
      .update(updateData)
      .eq('id', actionItemId);

    if (error) {
      console.error('[markActionItemCompleted] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[markActionItemCompleted] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al actualizar action item',
    };
  }
}

// ============================================================================
// VINCULAR ACTION ITEM A USUARIO
// ============================================================================

export async function linkActionItemToUser(
  actionItemId: string,
  usuarioId: string
) {
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

    // Verificar que el usuario existe
    const { data: targetUser, error: userError } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('id', usuarioId)
      .single();

    if (userError || !targetUser) {
      return {
        success: false,
        error: 'Usuario no encontrado',
      };
    }

    // Actualizar action item
    const { error } = await supabase
      .from('reunion_action_items')
      .update({
        asignado_usuario_id: usuarioId,
      })
      .eq('id', actionItemId);

    if (error) {
      console.error('[linkActionItemToUser] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[linkActionItemToUser] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al vincular action item',
    };
  }
}

// ============================================================================
// ACTUALIZAR ACTION ITEM
// ============================================================================

export async function updateActionItem(
  actionItemId: string,
  updates: {
    descripcion?: string;
    deadline?: string | null;
    prioridad?: 'alta' | 'media' | 'baja';
    asignado_usuario_id?: string | null;
  }
) {
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

    // Verificar permisos (admin o gerencia)
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!usuario || !['admin', 'gerencia'].includes(usuario.rol)) {
      return {
        success: false,
        error: 'No tiene permisos para editar action items',
      };
    }

    const { error } = await supabase
      .from('reunion_action_items')
      .update(updates)
      .eq('id', actionItemId);

    if (error) {
      console.error('[updateActionItem] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[updateActionItem] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al actualizar action item',
    };
  }
}
