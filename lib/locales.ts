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
  precio_base: number | null; // SESIÓN 56: Precio base de referencia del local
  estado: 'verde' | 'amarillo' | 'naranja' | 'rojo';
  bloqueado: boolean;
  monto_separacion: number | null; // Monto de separación (REQUERIDO al cambiar a NARANJA)
  monto_venta: number | null; // Monto de venta (REQUERIDO al cambiar a NARANJA)
  lead_id: string | null; // SESIÓN 52C: Lead vinculado al local (capturado en modal Datos)
  lead_nombre?: string | null; // Via JOIN - Nombre del cliente/lead asociado
  vendedor_actual_id: string | null;
  vendedor_actual_nombre?: string | null; // Via JOIN (opcional)
  vendedor_cerro_venta_id: string | null;
  vendedor_cerro_venta_nombre?: string | null; // Via JOIN (opcional)
  fecha_cierre_venta: string | null;
  // SESIÓN 48: Timer 120 horas para NARANJA + Exclusividad
  naranja_timestamp: string | null; // Timestamp cuando local pasó a NARANJA (para timer de 120 horas)
  naranja_vendedor_id: string | null; // ID del vendedor que puso en NARANJA (para exclusividad)
  // SESIÓN 48D: Contador de vendedores negociando (estado AMARILLO)
  vendedores_negociando_ids: string[]; // Array de UUIDs de vendedores negociando
  // SESIÓN 54: Flag para control de pagos (post-venta)
  en_control_pagos: boolean; // Si true, local ya fue procesado y está en control de pagos (bloquea acciones)
  // Sistema de comisiones: Track usuarios que pasaron a NARANJA/ROJO
  usuario_paso_naranja_id: string | null;
  fecha_paso_naranja: string | null;
  usuario_paso_rojo_id: string | null;
  fecha_paso_rojo: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalHistorial {
  id: string;
  local_id: string;
  usuario_id: string | null; // NULL cuando es acción del sistema
  usuario_nombre?: string; // Via JOIN (opcional)
  usuario_rol?: string; // Via JOIN (opcional) - rol del usuario
  estado_anterior: 'verde' | 'amarillo' | 'naranja' | 'rojo';
  estado_nuevo: 'verde' | 'amarillo' | 'naranja' | 'rojo';
  accion: string | null;
  created_at: string;
}

export interface LocalImportRow {
  codigo: string;
  metraje: number;
  estado?: 'verde' | 'amarillo' | 'naranja' | 'rojo'; // Opcional: default = 'verde'
  precio_base?: number | null; // SESIÓN 56: Opcional - si es 0 se rechaza, si está vacío se deja null
}

// ============================================================================
// HELPERS - GESTIÓN DE ARRAY VENDEDORES NEGOCIANDO (SESIÓN 48D)
// ============================================================================

/**
 * SESIÓN 48D: Agregar vendedor al array de negociando
 * Si vendedor ya está en el array, no lo duplica
 */
export function agregarVendedorNegociando(
  vendedoresActuales: string[],
  vendedorId: string
): string[] {
  if (vendedoresActuales.includes(vendedorId)) {
    return vendedoresActuales; // Ya está, no duplicar
  }
  return [...vendedoresActuales, vendedorId];
}

/**
 * SESIÓN 48D: Remover vendedor del array de negociando
 */
export function removerVendedorNegociando(
  vendedoresActuales: string[],
  vendedorId: string
): string[] {
  return vendedoresActuales.filter(id => id !== vendedorId);
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
    // NOTA: El JOIN con leads se hace por separado para evitar errores si no hay FK
    let query = supabase
      .from('locales')
      .select(`
        *,
        vendedores_negociando_ids,
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
      lead_nombre: null, // Se obtiene por separado si es necesario
    }));

    // Obtener nombres de leads para locales que tienen lead_id
    const localesConLead = locales.filter(l => l.lead_id);
    if (localesConLead.length > 0) {
      const leadIds = [...new Set(localesConLead.map(l => l.lead_id).filter(Boolean))] as string[];
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id, nombre')
        .in('id', leadIds);

      if (leadsData) {
        const leadsMap = new Map(leadsData.map(l => [l.id, l.nombre]));
        locales.forEach(local => {
          if (local.lead_id) {
            local.lead_nombre = leadsMap.get(local.lead_id) || null;
          }
        });
      }
    }

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
        vendedores_negociando_ids,
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
        usuario:usuarios!usuario_id(nombre, rol)
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
      // Si usuario_id es NULL → "Sistema", sino usar nombre del usuario
      usuario_nombre: item.usuario_id === null ? 'Sistema' : (item.usuario?.nombre || 'Usuario desconocido'),
      usuario_rol: item.usuario?.rol || null,
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
 * SESIÓN 48C: Actualizada para aceptar comentario opcional + monto de venta
 * Actualizar estado de un local
 * IMPORTANTE: Esta función NO debe usarse directamente desde componentes
 * Usar Server Action updateLocalEstado() en lib/actions-locales.ts
 *
 * @param localId ID del local
 * @param nuevoEstado Nuevo estado del local
 * @param vendedorId ID del vendedor que hace el cambio
 * @param usuarioId ID del usuario que hace el cambio (para historial)
 * @param comentario Comentario opcional (se guarda en locales_historial.accion)
 * @param montoVenta Monto de venta en USD (se guarda en locales.monto_venta)
 * @returns Success/error
 */
export async function updateLocalEstadoQuery(
  localId: string,
  nuevoEstado: 'verde' | 'amarillo' | 'naranja' | 'rojo',
  vendedorId?: string,
  usuarioId?: string,
  comentario?: string,
  montoSeparacion?: number, // ← NUEVO parámetro opcional
  montoVenta?: number, // ← NUEVO parámetro opcional
  telefono?: string, // ← NUEVO: para mostrar vinculación en historial
  nombreCliente?: string // ← NUEVO: para mostrar vinculación en historial
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

    // ============================================================================
    // SESIÓN 48: VALIDACIONES TIMER 120H + EXCLUSIVIDAD NARANJA
    // ============================================================================

    // VALIDACIÓN 1: Solo UN vendedor puede tener local en NARANJA (exclusividad)
    if (nuevoEstado === 'naranja') {
      // Verificar si otro vendedor ya lo tiene en NARANJA
      if (local.estado === 'naranja' && local.naranja_vendedor_id && local.naranja_vendedor_id !== vendedorId) {
        return {
          success: false,
          message: 'Este local ya está confirmado (NARANJA) por otro vendedor. Solo el jefe de ventas o administrador puede cambiar el estado.',
        };
      }
    }

    // VALIDACIÓN 2: Vendedor NO puede cambiar desde NARANJA
    // (Solo jefe_ventas o admin pueden cambiar desde NARANJA a otro estado)
    if (estadoAnterior === 'naranja' && vendedorId && local.naranja_vendedor_id === vendedorId) {
      // El vendedor que puso en NARANJA no puede cambiarlo a otro estado
      // Esta validación se debe hacer desde el Server Action con el rol del usuario
      // Aquí solo documentamos el comportamiento esperado
      // La validación real está en lib/actions-locales.ts
    }

    // ============================================================================
    // SESIÓN 48D: GESTIONAR ARRAY vendedores_negociando_ids
    // ============================================================================
    let vendedoresNegociando = local.vendedores_negociando_ids || [];

    if (nuevoEstado === 'amarillo' && vendedorId) {
      // Agregar vendedor al array (si no está ya)
      vendedoresNegociando = agregarVendedorNegociando(vendedoresNegociando, vendedorId);
    } else if (estadoAnterior === 'amarillo' && nuevoEstado === 'verde' && vendedorId) {
      // Vendedor sale de amarillo → remover del array
      vendedoresNegociando = removerVendedorNegociando(vendedoresNegociando, vendedorId);
    }
    // Si nuevoEstado != 'amarillo' → trigger limpiará array automáticamente

    // Preparar update
    const updateData: any = {
      estado: nuevoEstado,
      // FIX COMISIONES: Solo actualizar vendedor_actual_id si se proporciona explícitamente
      // NO sobrescribir con null cuando admin pasa a ROJO (preserva vendedor de NARANJA)
      ...(vendedorId !== undefined && { vendedor_actual_id: vendedorId }),
      vendedores_negociando_ids: vendedoresNegociando, // ← NUEVO: Array de vendedores
    };

    // SESIÓN 48: Setear timestamp, vendedor y montos cuando cambia a NARANJA
    if (nuevoEstado === 'naranja') {
      updateData.naranja_timestamp = new Date().toISOString();
      updateData.naranja_vendedor_id = vendedorId || null;
      updateData.usuario_paso_naranja_id = usuarioId || null;
      updateData.fecha_paso_naranja = new Date().toISOString();
      // Guardar monto de separación (REQUERIDO desde modal)
      if (montoSeparacion !== undefined && montoSeparacion !== null) {
        updateData.monto_separacion = montoSeparacion;
      }
      // Guardar monto de venta (REQUERIDO desde modal)
      if (montoVenta !== undefined && montoVenta !== null) {
        updateData.monto_venta = montoVenta;
      }
    }

    // SESIÓN 48: Limpiar campos cuando SALE de NARANJA
    if (estadoAnterior === 'naranja' && nuevoEstado !== 'naranja') {
      updateData.naranja_timestamp = null;
      updateData.naranja_vendedor_id = null;
    }

    // Si pasa a rojo, guardar vendedor que cerró venta
    if (nuevoEstado === 'rojo') {
      updateData.vendedor_cerro_venta_id = vendedorId;
      updateData.usuario_paso_rojo_id = usuarioId || null;
      updateData.fecha_paso_rojo = new Date().toISOString();
      // bloqueado y fecha_cierre_venta se setean automáticamente por trigger
    }

    // 🔓 Si pasa a verde, desbloquear y limpiar campos relacionados
    if (nuevoEstado === 'verde') {
      updateData.bloqueado = false;
      updateData.vendedor_cerro_venta_id = null;
      updateData.fecha_cierre_venta = null;
      updateData.monto_separacion = null; // Limpiar monto de separación (nueva negociación = nuevo monto)
      updateData.monto_venta = null; // Limpiar monto de venta (nueva negociación = nuevo monto)
      // SESIÓN 48: Limpiar timer NARANJA también
      updateData.naranja_timestamp = null;
      updateData.naranja_vendedor_id = null;
      // SESIÓN 59: Limpiar campos de trazabilidad (sistema de comisiones)
      updateData.vendedor_actual_id = null;
      updateData.usuario_paso_naranja_id = null;
      updateData.usuario_paso_rojo_id = null;
      updateData.fecha_paso_naranja = null;
      updateData.fecha_paso_rojo = null;
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
      let accion = 'Cambio de estado';

      // SESIÓN 48C: Si hay comentario, usarlo directamente
      if (comentario && comentario.trim().length > 0) {
        accion = comentario.trim();

        // Agregar vinculación del lead si viene (nombre + teléfono)
        if (telefono && nombreCliente) {
          accion += ` | Vinculó lead: ${nombreCliente} (Tel: ${telefono})`;
        }

        // Agregar montos al historial si vienen (formato: Comentario > vinculación > monto separación > monto venta)
        if (montoSeparacion !== undefined && montoSeparacion !== null) {
          accion += ` | Monto de Separación: $${montoSeparacion.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        if (montoVenta !== undefined && montoVenta !== null) {
          accion += ` | Monto de Venta: $${montoVenta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
      } else {
        // 🎯 CASO ESPECIAL: Admin asigna vendedor con amarillo/naranja
        if (vendedorId && (nuevoEstado === 'amarillo' || nuevoEstado === 'naranja')) {
          // Fetch admin name
          const { data: adminData } = await supabase
            .from('usuarios')
            .select('nombre, rol')
            .eq('id', usuarioId)
            .single();

          // Fetch vendedor name
          const { data: vendedorData } = await supabase
            .from('usuarios')
            .select('nombre')
            .eq('vendedor_id', vendedorId)
            .single();

          if (adminData?.rol === 'admin' && vendedorData?.nombre) {
            // Formato especial para admin
            const estadoTexto = nuevoEstado === 'amarillo' ? 'Amarillo' : 'Naranja';
            accion = `Admin ${adminData.nombre} asignó local a ${vendedorData.nombre} con estado ${estadoTexto}`;
          } else {
            // Fallback si no se pudieron obtener los nombres
            accion =
              nuevoEstado === 'amarillo' ? 'Vendedor inició negociación' :
              'Cliente confirmó que tomará el local';
          }
        } else {
          // Mensajes normales para otros casos
          accion =
            nuevoEstado === 'rojo' ? 'Vendedor cerró venta' :
            nuevoEstado === 'naranja' ? 'Cliente confirmó que tomará el local' :
            nuevoEstado === 'amarillo' ? 'Vendedor inició negociación' :
            nuevoEstado === 'verde' ? 'Local liberado' :
            'Cambio de estado';
        }
      }

      const { error: historialError } = await supabase
        .from('locales_historial')
        .insert({
          local_id: localId,
          usuario_id: usuarioId, // ✅ Usuario correcto (no NULL)
          estado_anterior: estadoAnterior,
          estado_nuevo: nuevoEstado,
          accion: accion, // ← SESIÓN 48C: Comentario guardado aquí
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
 * @param proyectoId ID del proyecto al que se asignarán todos los locales
 * @returns Success/error con estadísticas
 */
export async function importLocalesQuery(locales: LocalImportRow[], proyectoId: string) {
  try {
    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Validar que proyecto existe (una sola vez)
    const { data: proyecto, error: proyectoError } = await supabase
      .from('proyectos')
      .select('id, nombre')
      .eq('id', proyectoId)
      .single();

    if (proyectoError || !proyecto) {
      return {
        success: false,
        inserted: 0,
        skipped: locales.length,
        total: locales.length,
        errors: [`Proyecto no encontrado. Selecciona un proyecto válido.`],
      };
    }

    for (const local of locales) {

      // Verificar si código ya existe EN ESTE PROYECTO
      const { data: existente } = await supabase
        .from('locales')
        .select('id')
        .eq('codigo', local.codigo)
        .eq('proyecto_id', proyectoId)
        .maybeSingle();

      if (existente) {
        errors.push(`Local ${local.codigo} ya existe en proyecto ${proyecto.nombre} (skipped)`);
        skipped++;
        continue;
      }

      // Determinar estado (default: verde si no se especifica)
      const estado = local.estado || 'verde';

      // Validar estado
      const estadosValidos = ['verde', 'amarillo', 'naranja', 'rojo'];
      if (!estadosValidos.includes(estado)) {
        errors.push(`Estado "${local.estado}" inválido para local ${local.codigo} (debe ser verde/amarillo/naranja/rojo)`);
        skipped++;
        continue;
      }

      // SESIÓN 56: Validar precio_base - rechazar si es 0
      if (local.precio_base !== undefined && local.precio_base !== null && local.precio_base === 0) {
        errors.push(`Local ${local.codigo}: precio_base no puede ser 0 (skipped). Usa un valor > 0 o déjalo vacío.`);
        skipped++;
        continue;
      }

      // Si estado es rojo, el local debe estar bloqueado
      const bloqueado = estado === 'rojo';

      // Preparar datos para insertar
      const insertData: any = {
        codigo: local.codigo,
        proyecto_id: proyectoId,
        metraje: local.metraje,
        estado: estado,
        bloqueado: bloqueado,
      };

      // SESIÓN 56: Agregar precio_base si tiene valor válido (> 0)
      if (local.precio_base !== undefined && local.precio_base !== null && local.precio_base > 0) {
        insertData.precio_base = local.precio_base;
      }

      // Insertar local
      const { error: insertError } = await supabase
        .from('locales')
        .insert(insertData);

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

// ============================================================================
// MUTATIONS - UPDATE MONTO VENTA
// ============================================================================

/**
 * Actualizar monto de venta de un local
 * IMPORTANTE: Solo vendedores pueden actualizar (en estado naranja)
 * Registra cambio en historial
 *
 * @param localId ID del local
 * @param monto Monto de venta propuesto
 * @param usuarioId ID del usuario que actualiza
 * @returns Success/error
 */
export async function updateMontoVentaQuery(
  localId: string,
  monto: number,
  usuarioId?: string
) {
  try {
    // Fetch local actual
    const { data: local, error: fetchError } = await supabase
      .from('locales')
      .select('*')
      .eq('id', localId)
      .single();

    if (fetchError || !local) {
      return { success: false, message: 'Local no encontrado' };
    }

    // Validar que estado sea naranja
    if (local.estado !== 'naranja') {
      return {
        success: false,
        message: 'Solo se puede establecer monto en estado Confirmado (naranja)',
      };
    }

    // Capturar monto anterior
    const montoAnterior = local.monto_venta;

    // Update monto_venta
    const { error } = await supabase
      .from('locales')
      .update({ monto_venta: monto })
      .eq('id', localId);

    if (error) {
      console.error('Error updating monto_venta:', error);
      // Detectar error de columna inexistente
      if (error.message?.includes('column') || error.message?.includes('monto_venta')) {
        return {
          success: false,
          message: 'La columna monto_venta no existe en la base de datos. Ejecuta el SQL: ALTER TABLE locales ADD COLUMN monto_venta NUMERIC(10,2) NULL;',
        };
      }
      return {
        success: false,
        message: `Error al actualizar monto: ${error.message || 'Error desconocido'}`,
      };
    }

    // Registrar en historial (solo si cambió el monto y hay usuarioId)
    if (montoAnterior !== monto && usuarioId) {
      const accion = montoAnterior === null
        ? `Estableció monto de venta: $ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        : `Actualizó monto de $ ${montoAnterior.toLocaleString('en-US', { minimumFractionDigits: 2 })} a $ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

      const { error: historialError } = await supabase
        .from('locales_historial')
        .insert({
          local_id: localId,
          usuario_id: usuarioId,
          estado_anterior: local.estado, // Estado no cambia, pero lo registramos
          estado_nuevo: local.estado,
          accion: accion,
        });

      if (historialError) {
        console.error('Error insertando historial monto:', historialError);
        // No fallar operación si solo falla historial
      }
    }

    return {
      success: true,
      message: 'Monto actualizado correctamente',
    };
  } catch (error) {
    console.error('Error in updateMontoVentaQuery:', error);
    return { success: false, message: 'Error inesperado' };
  }
}

// ============================================================================
// REGISTER LEAD TRACKING
// ============================================================================

/**
 * Registrar tracking de lead vinculado a local en historial
 * @param localId ID del local
 * @param telefono Teléfono del lead
 * @param nombre Nombre del lead
 * @param usuarioId ID del usuario (vendedor) que registra
 * @param estadoAnterior Estado anterior del local
 * @param estadoNuevo Estado nuevo del local
 * @param montoVenta Monto de venta en USD
 * @returns Success/error
 */
export async function registerLeadTrackingQuery(
  localId: string,
  telefono: string,
  nombre: string,
  usuarioId?: string,
  estadoAnterior?: string,
  estadoNuevo?: string,
  montoVenta?: number // ✅ NUEVO: Monto de venta en USD
) {
  try {
    // Validar que local existe
    const local = await getLocalById(localId);
    if (!local) {
      return { success: false, message: 'Local no encontrado' };
    }

    // Crear acción descriptiva con formato de 2 líneas
    // Línea 1: Vinculación del lead
    // Línea 2: Monto de venta (con formato USD)
    const montoFormateado = montoVenta ? `$ ${montoVenta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$ 0.00';
    const accion = `Vinculó lead: ${nombre} (Tel: ${telefono})\nMonto de venta: ${montoFormateado}`;

    // Insertar en historial con estados correctos
    const { error } = await supabase
      .from('locales_historial')
      .insert({
        local_id: localId,
        usuario_id: usuarioId || null,
        // ✅ FIX: Si vienen estados pasados, usar esos; si no, usar local.estado (backward compatibility)
        estado_anterior: estadoAnterior || local.estado,
        estado_nuevo: estadoNuevo || local.estado,
        accion: accion,
      });

    if (error) {
      console.error('Error insertando tracking en historial:', error);
      return { success: false, message: 'Error al registrar tracking' };
    }

    // ✅ NUEVO: Marcar que el lead asistió al proyecto
    // Buscar lead por teléfono y actualizar asistio = true
    const { error: asistioError } = await supabase
      .from('leads')
      .update({ asistio: true })
      .eq('telefono', telefono);

    if (asistioError) {
      console.warn('[TRACKING] Error actualizando asistio para tel:', telefono, asistioError);
      // No fallar toda la operación si solo falla el update de asistio
      // El historial ya se registró exitosamente
    } else {
      console.log('[TRACKING] ✅ Lead marcado como asistido:', telefono);
    }

    return {
      success: true,
      message: 'Lead vinculado correctamente',
    };
  } catch (error) {
    console.error('Error in registerLeadTrackingQuery:', error);
    return { success: false, message: 'Error inesperado' };
  }
}

// ============================================================================
// REGISTER LOCAL LEAD RELATION (Tabla Relacional)
// ============================================================================

export async function registerLocalLeadRelation(
  localId: string,
  leadTelefono: string,
  leadId?: string,
  vendedorId?: string,
  usuarioId?: string,
  montoSeparacion?: number,
  montoVenta?: number
) {
  try {
    const { error } = await supabase
      .from('locales_leads')
      .insert({
        local_id: localId,
        lead_telefono: leadTelefono,
        lead_id: leadId || null,
        vendedor_id: vendedorId || null,
        usuario_id: usuarioId || null,
        monto_separacion: montoSeparacion || null,
        monto_venta: montoVenta || null,
      });

    if (error) {
      console.error('[RELATION] Error inserting locales_leads:', error);
      return { success: false, message: 'Error al registrar relación' };
    }

    console.log('[RELATION] ✅ Relación local-lead registrada:', { localId, leadTelefono });
    return { success: true, message: 'Relación registrada correctamente' };
  } catch (error) {
    console.error('Error in registerLocalLeadRelation:', error);
    return { success: false, message: 'Error inesperado' };
  }
}

// ============================================================================
// GET LOCAL LEADS (Obtener leads vinculados a un local)
// ============================================================================

export interface LocalLead {
  id: string;
  local_id: string;
  lead_telefono: string;
  lead_id: string | null;
  vendedor_id: string | null;
  usuario_id: string | null;
  monto_separacion: number | null;
  monto_venta: number | null;
  created_at: string;
  lead_nombre?: string | null;
  lead_email?: string | null;
  lead_rubro?: string | null;
  lead_asistio?: boolean | null;
  vendedor_nombre?: string | null;
  usuario_nombre?: string | null;
}

export async function getLocalLeads(localId: string): Promise<LocalLead[]> {
  try {
    const { data, error } = await supabase
      .from('locales_leads')
      .select(`
        *,
        leads:lead_id (
          nombre,
          email,
          rubro,
          asistio
        ),
        vendedores:vendedor_id (
          nombre
        ),
        usuarios:usuario_id (
          nombre
        )
      `)
      .eq('local_id', localId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching local leads:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      local_id: row.local_id,
      lead_telefono: row.lead_telefono,
      lead_id: row.lead_id,
      vendedor_id: row.vendedor_id,
      usuario_id: row.usuario_id,
      monto_separacion: row.monto_separacion,
      monto_venta: row.monto_venta,
      created_at: row.created_at,
      lead_nombre: row.leads?.nombre || null,
      lead_email: row.leads?.email || null,
      lead_rubro: row.leads?.rubro || null,
      lead_asistio: row.leads?.asistio || null,
      vendedor_nombre: row.vendedores?.nombre || null,
      usuario_nombre: row.usuarios?.nombre || null,
    }));
  } catch (error) {
    console.error('Error in getLocalLeads:', error);
    return [];
  }
}

// ============================================================================
// GET ALL VENDEDORES ACTIVOS (para asignación de admin)
// ============================================================================

export interface VendedorActivo {
  id: string;
  nombre: string;
  rol: 'vendedor' | 'vendedor_caseta' | 'coordinador' | 'jefe_ventas';
  vendedor_id: string;
  activo: boolean; // Incluido para compatibilidad con LeadsTable
}

/**
 * Obtiene todos los usuarios que pueden recibir leads asignados
 * Roles: vendedor, vendedor_caseta, coordinador, jefe_ventas
 * Usado por admin/jefe_ventas para asignar locales y leads
 */
export async function getAllVendedoresActivos(): Promise<VendedorActivo[]> {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, rol, vendedor_id, activo')
      .in('rol', ['vendedor', 'vendedor_caseta', 'coordinador', 'jefe_ventas'])
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('[LOCALES] Error fetching vendedores activos:', error);
      return [];
    }

    return (data || []) as VendedorActivo[];
  } catch (error) {
    console.error('[LOCALES] Error in getAllVendedoresActivos:', error);
    return [];
  }
}
