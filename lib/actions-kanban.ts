'use server';

/**
 * Server Actions para el Kanban de Leads
 *
 * Maneja las operaciones de drag & drop y actualización de leads
 */

import { supabase } from './supabase';
import { revalidatePath } from 'next/cache';
import { getDefaultTipificacionForColumn } from './kanban-config';

// ============================================
// TIPOS
// ============================================

interface MoveLeadResult {
  success: boolean;
  error?: string;
  lead?: {
    id: string;
    tipificacion_nivel_1: string | null;
    tipificacion_nivel_2: string | null;
  };
}

interface UpdateKanbanConfigResult {
  success: boolean;
  error?: string;
}

// ============================================
// ACCIONES DE LEADS
// ============================================

/**
 * Mueve un lead a una nueva columna del Kanban
 * Actualiza la tipificación según el mapeo configurado
 */
export async function moveLeadToColumn(
  leadId: string,
  targetColumn: string
): Promise<MoveLeadResult> {
  try {
    // Obtener tipificación por defecto para la columna destino
    const { nivel_1, nivel_2 } = getDefaultTipificacionForColumn(targetColumn);

    // Actualizar el lead
    const { data, error } = await supabase
      .from('leads')
      .update({
        tipificacion_nivel_1: nivel_1,
        tipificacion_nivel_2: nivel_2,
        // No reseteamos nivel_3, el usuario puede mantenerlo o cambiarlo manualmente
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .select('id, tipificacion_nivel_1, tipificacion_nivel_2')
      .single();

    if (error) {
      console.error('Error al mover lead:', error);
      return { success: false, error: error.message };
    }

    // Revalidar la página para refrescar los datos
    revalidatePath('/operativo');

    return {
      success: true,
      lead: {
        id: data.id,
        tipificacion_nivel_1: data.tipificacion_nivel_1,
        tipificacion_nivel_2: data.tipificacion_nivel_2,
      },
    };
  } catch (error) {
    console.error('Error inesperado al mover lead:', error);
    return {
      success: false,
      error: 'Error inesperado al mover el lead',
    };
  }
}

/**
 * Mueve un lead a una columna con tipificación específica
 * (Para cuando el usuario quiere especificar el nivel_2 exacto)
 */
export async function moveLeadWithTipificacion(
  leadId: string,
  nivel1: string | null,
  nivel2: string | null,
  nivel3?: string | null
): Promise<MoveLeadResult> {
  try {
    const updateData: Record<string, unknown> = {
      tipificacion_nivel_1: nivel1,
      tipificacion_nivel_2: nivel2,
      updated_at: new Date().toISOString(),
    };

    // Solo actualizar nivel_3 si se proporciona
    if (nivel3 !== undefined) {
      updateData.tipificacion_nivel_3 = nivel3;
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId)
      .select('id, tipificacion_nivel_1, tipificacion_nivel_2')
      .single();

    if (error) {
      console.error('Error al actualizar tipificación:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/operativo');

    return {
      success: true,
      lead: {
        id: data.id,
        tipificacion_nivel_1: data.tipificacion_nivel_1,
        tipificacion_nivel_2: data.tipificacion_nivel_2,
      },
    };
  } catch (error) {
    console.error('Error inesperado:', error);
    return {
      success: false,
      error: 'Error inesperado al actualizar tipificación',
    };
  }
}

// ============================================
// ACCIONES DE CONFIGURACIÓN
// ============================================

/**
 * Actualiza el nombre o color de una columna
 */
export async function updateKanbanColumn(
  columnId: string,
  updates: { columna_nombre?: string; columna_color?: string; activo?: boolean }
): Promise<UpdateKanbanConfigResult> {
  try {
    const { error } = await supabase
      .from('kanban_config')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', columnId);

    if (error) {
      console.error('Error al actualizar columna:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/operativo');
    revalidatePath('/configuracion/kanban');

    return { success: true };
  } catch (error) {
    console.error('Error inesperado:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

/**
 * Actualiza el mapeo de una tipificación a una columna
 */
export async function updateKanbanMapping(
  mappingId: string,
  newColumnCode: string
): Promise<UpdateKanbanConfigResult> {
  try {
    const { error } = await supabase
      .from('kanban_tipificacion_mapping')
      .update({
        columna_codigo: newColumnCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mappingId);

    if (error) {
      console.error('Error al actualizar mapeo:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/operativo');
    revalidatePath('/configuracion/kanban');

    return { success: true };
  } catch (error) {
    console.error('Error inesperado:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

/**
 * Agrega un nuevo mapeo de tipificación
 */
export async function addKanbanMapping(
  nivel1: string | null,
  nivel2: string | null,
  columnCode: string,
  prioridad: number = 50
): Promise<UpdateKanbanConfigResult> {
  try {
    const { error } = await supabase
      .from('kanban_tipificacion_mapping')
      .insert({
        tipificacion_nivel_1: nivel1,
        tipificacion_nivel_2: nivel2,
        columna_codigo: columnCode,
        prioridad,
      });

    if (error) {
      console.error('Error al agregar mapeo:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/configuracion/kanban');

    return { success: true };
  } catch (error) {
    console.error('Error inesperado:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

/**
 * Elimina un mapeo de tipificación
 */
export async function deleteKanbanMapping(
  mappingId: string
): Promise<UpdateKanbanConfigResult> {
  try {
    const { error } = await supabase
      .from('kanban_tipificacion_mapping')
      .delete()
      .eq('id', mappingId);

    if (error) {
      console.error('Error al eliminar mapeo:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/configuracion/kanban');

    return { success: true };
  } catch (error) {
    console.error('Error inesperado:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

/**
 * Crea o actualiza un mapeo de tipificación (upsert)
 * Busca por (nivel_1, nivel_2) y actualiza o crea si no existe
 */
export async function upsertKanbanMapping(
  nivel1: string | null,
  nivel2: string | null,
  columnCode: string,
  prioridad: number = 50
): Promise<UpdateKanbanConfigResult & { mappingId?: string }> {
  try {
    // Primero buscar si ya existe el mapeo
    let query = supabase
      .from('kanban_tipificacion_mapping')
      .select('id');

    // Handle null values properly
    if (nivel1 === null) {
      query = query.is('tipificacion_nivel_1', null);
    } else {
      query = query.eq('tipificacion_nivel_1', nivel1);
    }

    if (nivel2 === null) {
      query = query.is('tipificacion_nivel_2', null);
    } else {
      query = query.eq('tipificacion_nivel_2', nivel2);
    }

    const { data: existing, error: findError } = await query.maybeSingle();

    if (findError) {
      console.error('Error al buscar mapeo:', findError);
      return { success: false, error: findError.message };
    }

    if (existing) {
      // Actualizar existente
      const { error: updateError } = await supabase
        .from('kanban_tipificacion_mapping')
        .update({
          columna_codigo: columnCode,
          prioridad,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error al actualizar mapeo:', updateError);
        return { success: false, error: updateError.message };
      }

      revalidatePath('/operativo');
      revalidatePath('/configuracion-kanban');

      return { success: true, mappingId: existing.id };
    } else {
      // Crear nuevo
      const { data: newMapping, error: insertError } = await supabase
        .from('kanban_tipificacion_mapping')
        .insert({
          tipificacion_nivel_1: nivel1,
          tipificacion_nivel_2: nivel2,
          columna_codigo: columnCode,
          prioridad,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error al crear mapeo:', insertError);
        return { success: false, error: insertError.message };
      }

      revalidatePath('/operativo');
      revalidatePath('/configuracion-kanban');

      return { success: true, mappingId: newMapping?.id };
    }
  } catch (error) {
    console.error('Error inesperado:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

/**
 * Reordena las columnas del Kanban
 */
export async function reorderKanbanColumns(
  columnOrders: { id: string; orden: number }[]
): Promise<UpdateKanbanConfigResult> {
  try {
    // Actualizar cada columna con su nuevo orden
    for (const { id, orden } of columnOrders) {
      const { error } = await supabase
        .from('kanban_config')
        .update({
          columna_orden: orden,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        console.error('Error al reordenar columna:', error);
        return { success: false, error: error.message };
      }
    }

    revalidatePath('/operativo');
    revalidatePath('/configuracion/kanban');

    return { success: true };
  } catch (error) {
    console.error('Error inesperado:', error);
    return { success: false, error: 'Error inesperado' };
  }
}
