// ============================================================================
// DATA LAYER: Locales en Venta
// ============================================================================
// Descripción: Queries y funciones para gestión de locales con tiempo real
// Tablas: locales, locales_historial
// ============================================================================

import { supabase } from './supabase';

// ============================================================================
// INTERFACES
// ============================================================================

export interface Local {
  id: string;
  codigo: string; // LC-4325456
  proyecto_id: string;
  proyecto_nombre?: string; // Via JOIN (opcional)
  metraje: number; // 4.5, 6.0, etc.
  estado: 'verde' | 'amarillo' | 'naranja' | 'rojo';
  bloqueado: boolean;
  vendedor_actual_id: string | null;
  vendedor_actual_nombre?: string | null; // Via JOIN (opcional)
  vendedor_cerro_venta_id: string | null;
  vendedor_cerro_venta_nombre?: string | null; // Via JOIN (opcional)
  fecha_cierre_venta: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalHistorial {
  id: string;
  local_id: string;
  usuario_id: string;
  usuario_nombre?: string; // Via JOIN (opcional)
  estado_anterior: 'verde' | 'amarillo' | 'naranja' | 'rojo';
  estado_nuevo: 'verde' | 'amarillo' | 'naranja' | 'rojo';
  accion: string | null;
  created_at: string;
}

export interface LocalImportRow {
  codigo: string;
  proyecto: string; // slug del proyecto (trapiche, callao, san-gabriel)
  metraje: number;
}

// ============================================================================
// QUERIES - GET LOCALES
// ============================================================================

/**
 * Obtener todos los locales con paginación y filtros
 * @param options Opciones de paginación y filtros
 * @returns Array de locales con información de proyectos y vendedores
 */
export async function getAllLocales(options?: {
  proyectoId?: string;
  estado?: string;
  metrajeMin?: number;
  metrajeMax?: number;
  page?: number;
  pageSize?: number;
}) {
  try {
    // Configurar paginación
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Query base con JOINs
    let query = supabase
      .from('locales')
      .select(`
        *,
        proyecto:proyectos!proyecto_id(nombre),
        vendedor_actual:vendedores!vendedor_actual_id(nombre),
        vendedor_cerro_venta:vendedores!vendedor_cerro_venta_id(nombre)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (options?.proyectoId) {
      query = query.eq('proyecto_id', options.proyectoId);
    }

    if (options?.estado) {
      query = query.eq('estado', options.estado);
    }

    if (options?.metrajeMin !== undefined) {
      query = query.gte('metraje', options.metrajeMin);
    }

    if (options?.metrajeMax !== undefined) {
      query = query.lte('metraje', options.metrajeMax);
    }

    // Paginación
    query = query.range(from, to);

    // Ejecutar query
    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching locales:', error);
      return { data: [], count: 0 };
    }

    // Transformar data (aplanar JOINs)
    const locales: Local[] = (data || []).map((local: any) => ({
      ...local,
      proyecto_nombre: local.proyecto?.nombre || null,
      vendedor_actual_nombre: local.vendedor_actual?.nombre || null,
      vendedor_cerro_venta_nombre: local.vendedor_cerro_venta?.nombre || null,
    }));

    return { data: locales, count: count || 0 };
  } catch (error) {
    console.error('Error in getAllLocales:', error);
    return { data: [], count: 0 };
  }
}

/**
 * Obtener un local por ID
 * @param localId ID del local
 * @returns Local con información completa
 */
export async function getLocalById(localId: string) {
  try {
    const { data, error } = await supabase
      .from('locales')
      .select(`
        *,
        proyecto:proyectos!proyecto_id(nombre),
        vendedor_actual:vendedores!vendedor_actual_id(nombre),
        vendedor_cerro_venta:vendedores!vendedor_cerro_venta_id(nombre)
      `)
      .eq('id', localId)
      .single();

    if (error) {
      console.error('Error fetching local:', error);
      return null;
    }

    // Transformar data
    const local: Local = {
      ...data,
      proyecto_nombre: data.proyecto?.nombre || null,
      vendedor_actual_nombre: data.vendedor_actual?.nombre || null,
      vendedor_cerro_venta_nombre: data.vendedor_cerro_venta?.nombre || null,
    };

    return local;
  } catch (error) {
    console.error('Error in getLocalById:', error);
    return null;
  }
}

// ============================================================================
// QUERIES - GET HISTORIAL
// ============================================================================

/**
 * Obtener historial de cambios de un local
 * @param localId ID del local
 * @returns Array de cambios ordenados por fecha DESC
 */
export async function getLocalHistorial(localId: string) {
  try {
    const { data, error } = await supabase
      .from('locales_historial')
      .select(`
        *,
        usuario:usuarios!usuario_id(nombre)
      `)
      .eq('local_id', localId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching historial:', error);
      return [];
    }

    // Transformar data
    const historial: LocalHistorial[] = (data || []).map((item: any) => ({
      ...item,
      usuario_nombre: item.usuario?.nombre || 'Usuario desconocido',
    }));

    return historial;
  } catch (error) {
    console.error('Error in getLocalHistorial:', error);
    return [];
  }
}

// ============================================================================
// QUERIES - ESTADÍSTICAS
// ============================================================================

/**
 * Obtener estadísticas de locales por estado
 * @param proyectoId Filtrar por proyecto (opcional)
 * @returns Contadores por estado
 */
export async function getLocalesStats(proyectoId?: string) {
  try {
    let query = supabase
      .from('locales')
      .select('estado', { count: 'exact' });

    if (proyectoId) {
      query = query.eq('proyecto_id', proyectoId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching stats:', error);
      return { verde: 0, amarillo: 0, naranja: 0, rojo: 0, total: 0 };
    }

    // Contar por estado
    const stats = {
      verde: data?.filter(l => l.estado === 'verde').length || 0,
      amarillo: data?.filter(l => l.estado === 'amarillo').length || 0,
      naranja: data?.filter(l => l.estado === 'naranja').length || 0,
      rojo: data?.filter(l => l.estado === 'rojo').length || 0,
      total: data?.length || 0,
    };

    return stats;
  } catch (error) {
    console.error('Error in getLocalesStats:', error);
    return { verde: 0, amarillo: 0, naranja: 0, rojo: 0, total: 0 };
  }
}

// ============================================================================
// MUTATIONS - UPDATE ESTADO
// ============================================================================

/**
 * Actualizar estado de un local
 * IMPORTANTE: Esta función NO debe usarse directamente desde componentes
 * Usar Server Action updateLocalEstado() en lib/actions-locales.ts
 *
 * @param localId ID del local
 * @param nuevoEstado Nuevo estado del local
 * @param vendedorId ID del vendedor que hace el cambio
 * @returns Success/error
 */
export async function updateLocalEstadoQuery(
  localId: string,
  nuevoEstado: 'verde' | 'amarillo' | 'naranja' | 'rojo',
  vendedorId?: string,
  usuarioId?: string // ID del usuario que hace el cambio (para historial)
) {
  try {
    // Obtener local actual
    const local = await getLocalById(localId);
    if (!local) {
      return { success: false, message: 'Local no encontrado' };
    }

    // Guardar estado anterior para el historial
    const estadoAnterior = local.estado;

    // Validar que no esté bloqueado (solo admin puede cambiar)
    if (local.bloqueado && nuevoEstado !== 'verde') {
      return { success: false, message: 'Local bloqueado. Solo admin puede desbloquear.' };
    }

    // Preparar update
    const updateData: any = {
      estado: nuevoEstado,
      vendedor_actual_id: vendedorId || null,
    };

    // Si pasa a rojo, guardar vendedor que cerró venta
    if (nuevoEstado === 'rojo') {
      updateData.vendedor_cerro_venta_id = vendedorId;
      // bloqueado y fecha_cierre_venta se setean automáticamente por trigger
    }

    // 🔓 Si pasa a verde, desbloquear y limpiar campos relacionados
    if (nuevoEstado === 'verde') {
      updateData.bloqueado = false;
      updateData.vendedor_cerro_venta_id = null;
      updateData.fecha_cierre_venta = null;
    }

    // Ejecutar update
    const { error } = await supabase
      .from('locales')
      .update(updateData)
      .eq('id', localId);

    if (error) {
      console.error('Error updating local:', error);
      return { success: false, message: 'Error al actualizar local' };
    }

    // 📝 Insertar historial manualmente con usuario correcto
    // Solo si el estado realmente cambió y tenemos usuarioId
    if (estadoAnterior !== nuevoEstado && usuarioId) {
      const accion =
        nuevoEstado === 'rojo' ? 'Vendedor cerró venta' :
        nuevoEstado === 'naranja' ? 'Cliente confirmó que tomará el local' :
        nuevoEstado === 'amarillo' ? 'Vendedor inició negociación' :
        nuevoEstado === 'verde' ? 'Local liberado' :
        'Cambio de estado';

      const { error: historialError } = await supabase
        .from('locales_historial')
        .insert({
          local_id: localId,
          usuario_id: usuarioId, // ✅ Usuario correcto (no NULL)
          estado_anterior: estadoAnterior,
          estado_nuevo: nuevoEstado,
          accion: accion,
        });

      if (historialError) {
        console.error('Error insertando historial:', historialError);
        // No fallar toda la operación si solo falla el historial
      }
    }

    return { success: true, message: 'Estado actualizado correctamente' };
  } catch (error) {
    console.error('Error in updateLocalEstadoQuery:', error);
    return { success: false, message: 'Error inesperado' };
  }
}

// ============================================================================
// MUTATIONS - IMPORTAR LOCALES
// ============================================================================

/**
 * Importar locales desde CSV/Excel
 * IMPORTANTE: Esta función NO debe usarse directamente desde componentes
 * Usar Server Action importLocales() en lib/actions-locales.ts
 *
 * @param locales Array de locales a importar
 * @returns Success/error con estadísticas
 */
export async function importLocalesQuery(locales: LocalImportRow[]) {
  try {
    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const local of locales) {
      // Validar que proyecto existe
      const { data: proyecto, error: proyectoError } = await supabase
        .from('proyectos')
        .select('id')
        .eq('slug', local.proyecto)
        .single();

      if (proyectoError || !proyecto) {
        errors.push(`Proyecto "${local.proyecto}" no encontrado para local ${local.codigo}`);
        skipped++;
        continue;
      }

      // Verificar si código ya existe
      const { data: existente } = await supabase
        .from('locales')
        .select('id')
        .eq('codigo', local.codigo)
        .single();

      if (existente) {
        errors.push(`Local ${local.codigo} ya existe (skipped)`);
        skipped++;
        continue;
      }

      // Insertar local
      const { error: insertError } = await supabase
        .from('locales')
        .insert({
          codigo: local.codigo,
          proyecto_id: proyecto.id,
          metraje: local.metraje,
          estado: 'verde', // Default
          bloqueado: false,
        });

      if (insertError) {
        console.error('Error inserting local:', insertError);
        errors.push(`Error al insertar local ${local.codigo}: ${insertError.message}`);
        skipped++;
      } else {
        inserted++;
      }
    }

    return {
      success: true,
      inserted,
      skipped,
      total: locales.length,
      errors,
    };
  } catch (error) {
    console.error('Error in importLocalesQuery:', error);
    return {
      success: false,
      inserted: 0,
      skipped: 0,
      total: locales.length,
      errors: ['Error inesperado durante importación'],
    };
  }
}

// ============================================================================
// MUTATIONS - DELETE LOCAL
// ============================================================================

/**
 * Eliminar un local (solo admin)
 * IMPORTANTE: Esta función NO debe usarse directamente desde componentes
 * Usar Server Action deleteLocal() en lib/actions-locales.ts
 *
 * @param localId ID del local a eliminar
 * @returns Success/error
 */
export async function deleteLocalQuery(localId: string) {
  try {
    const { error } = await supabase
      .from('locales')
      .delete()
      .eq('id', localId);

    if (error) {
      console.error('Error deleting local:', error);
      return { success: false, message: 'Error al eliminar local' };
    }

    return { success: true, message: 'Local eliminado correctamente' };
  } catch (error) {
    console.error('Error in deleteLocalQuery:', error);
    return { success: false, message: 'Error inesperado' };
  }
}
