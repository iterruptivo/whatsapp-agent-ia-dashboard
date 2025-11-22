// ============================================================================
// SERVER ACTIONS: Locales en Venta
// ============================================================================
// Descripción: Server Actions para mutaciones de locales
// Uso: Componentes cliente llaman estas funciones para cambios de estado
// ============================================================================

'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from './supabase';
import {
  updateLocalEstadoQuery,
  importLocalesQuery,
  deleteLocalQuery,
  updateMontoVentaQuery,
  registerLeadTrackingQuery,
  registerLocalLeadRelation,
  getLocalById,
  type LocalImportRow,
} from './locales';
import { createManualLead } from './actions';

// ============================================================================
// UPDATE ESTADO DE LOCAL
// ============================================================================

/**
 * SESIÓN 48C: Actualizada para aceptar comentario opcional + monto de venta
 * Cambiar estado de un local (semáforo)
 * @param localId ID del local
 * @param nuevoEstado Nuevo estado (verde, amarillo, naranja, rojo)
 * @param vendedorId ID del vendedor que hace el cambio
 * @param usuarioId ID del usuario que hace el cambio (para historial)
 * @param comentario Comentario del vendedor (REQUERIDO para NARANJA desde vendedor)
 * @param telefono Teléfono para vinculación (lead existente o nuevo)
 * @param nombreCliente Nombre del cliente para vinculación
 * @param montoVenta Monto de venta en USD (REQUERIDO para NARANJA)
 * @param leadId ID del lead si existe (para actualizar asistio)
 * @param proyectoId ID del proyecto (si se quiere crear lead manual)
 * @param agregarComoLead Flag para crear o no el lead manual en la tabla leads
 * @returns Success/error con mensaje
 */
export async function updateLocalEstado(
  localId: string,
  nuevoEstado: 'verde' | 'amarillo' | 'naranja' | 'rojo',
  vendedorId?: string,
  usuarioId?: string,
  comentario?: string,
  telefono?: string,
  nombreCliente?: string,
  montoSeparacion?: number, // ← NUEVO: monto de separación en USD
  montoVenta?: number, // ← NUEVO: monto de venta en USD
  leadId?: string,
  proyectoId?: string,
  agregarComoLead?: boolean
) {
  try {
    // ============================================================================
    // SESIÓN 48: VALIDACIÓN - Vendedor NO puede cambiar desde NARANJA
    // ============================================================================

    // Obtener local actual para validar estado
    const local = await getLocalById(localId);
    if (!local) {
      return { success: false, message: 'Local no encontrado' };
    }

    // Obtener rol del usuario si tenemos usuarioId
    let userRole: string | null = null;
    if (usuarioId) {
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('rol')
        .eq('id', usuarioId)
        .single();

      if (!userError && userData) {
        userRole = userData.rol;
      }
    }

    // VALIDACIÓN CRÍTICA: Vendedor NO puede cambiar desde NARANJA
    if (
      local.estado === 'naranja' &&
      userRole &&
      (userRole === 'vendedor' || userRole === 'vendedor_caseta')
    ) {
      return {
        success: false,
        message: 'Solo jefes de ventas o administradores pueden cambiar el estado de un local confirmado (NARANJA)',
      };
    }

    // SESIÓN 48C: Validar comentario si viene desde vendedor a NARANJA
    // (Frontend ya validó, esto es doble seguridad)
    if (nuevoEstado === 'naranja' && comentario && comentario.trim().length < 10) {
      return {
        success: false,
        message: 'El comentario debe tener al menos 10 caracteres',
      };
    }

    // GUARDAR ESTADO ANTERIOR antes de cambiar (para historial correcto)
    const estadoAnterior = local.estado;

    // Continuar con el flujo normal
    const result = await updateLocalEstadoQuery(localId, nuevoEstado, vendedorId, usuarioId, comentario, montoSeparacion, montoVenta, telefono, nombreCliente);

    if (result.success) {
      // ============================================================================
      // VINCULACIÓN OBLIGATORIA AL CAMBIAR A NARANJA
      // ============================================================================
      if (nuevoEstado === 'naranja' && telefono && nombreCliente) {
        console.log('[NARANJA] Vinculando lead:', { telefono, nombreCliente, leadId, proyectoId, agregarComoLead, estadoAnterior });

        // Variable para almacenar el leadId final (existente o recién creado)
        let finalLeadId = leadId;

        // ============================================================================
        // CREAR LEAD MANUAL SI NO EXISTE Y CHECKBOX ESTÁ CHECKED
        // ============================================================================
        if (!leadId && agregarComoLead && proyectoId && vendedorId) {
          console.log('[NARANJA] 🆕 Creando nuevo lead manual:', { nombre: nombreCliente, telefono, proyectoId });

          const createResult = await createManualLead(
            nombreCliente,
            telefono,
            proyectoId,
            vendedorId
          );

          if (createResult.success && createResult.leadId) {
            finalLeadId = createResult.leadId;
            console.log('[NARANJA] ✅ Lead manual creado:', { leadId: finalLeadId });
          } else {
            console.error('[NARANJA] ⚠️ Error creando lead manual:', createResult.message);
            // No bloqueamos el flujo, solo logueamos el error
          }
        }

        // NOTA: Ya no usamos registerLeadTracking() porque el historial
        // se guarda directamente en updateLocalEstadoQuery() con comentario + montos
        console.log('[NARANJA] ✅ Lead vinculado (historial ya guardado en updateLocalEstadoQuery)');

        // ============================================================================
        // REGISTRAR EN TABLA RELACIONAL locales_leads
        // ============================================================================
        const relationResult = await registerLocalLeadRelation(
          localId,
          telefono,
          finalLeadId,  // leadId existente o recién creado (puede ser undefined)
          vendedorId,
          usuarioId,
          montoSeparacion,
          montoVenta
        );

        if (relationResult.success) {
          console.log('[NARANJA] ✅ Relación local-lead registrada en tabla locales_leads');
        } else {
          console.error('[NARANJA] ⚠️ Error registrando relación en locales_leads:', relationResult.message);
          // No bloqueamos el flujo, solo logueamos el error
        }

        // Si existe finalLeadId (lead existente o recién creado), actualizar asistio='Si'
        if (finalLeadId) {
          const { error: asistioError } = await supabase
            .from('leads')
            .update({ asistio: true })
            .eq('id', finalLeadId);

          if (asistioError) {
            console.error('[NARANJA] ⚠️ Error actualizando asistio:', asistioError);
          } else {
            console.log('[NARANJA] ✅ Campo asistio actualizado a "Sí" para leadId:', finalLeadId);
          }
        }
      }

      // Revalidar página de locales para reflejar cambios
      revalidatePath('/locales');
    }

    return result;
  } catch (error) {
    console.error('Error in updateLocalEstado:', error);
    return { success: false, message: 'Error inesperado al actualizar estado' };
  }
}

// ============================================================================
// IMPORTAR LOCALES DESDE CSV/EXCEL
// ============================================================================

/**
 * Importar múltiples locales desde CSV/Excel
 * @param locales Array de locales a importar
 * @param proyectoId ID del proyecto al que se asignarán todos los locales
 * @returns Estadísticas de importación (inserted, skipped, errors)
 */
export async function importLocales(locales: LocalImportRow[], proyectoId: string) {
  try {
    const result = await importLocalesQuery(locales, proyectoId);

    if (result.success && result.inserted > 0) {
      // Revalidar página de locales
      revalidatePath('/locales');
    }

    return result;
  } catch (error) {
    console.error('Error in importLocales:', error);
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
// ELIMINAR LOCAL (ADMIN ONLY)
// ============================================================================

/**
 * Eliminar un local (solo admin)
 * @param localId ID del local a eliminar
 * @returns Success/error
 */
export async function deleteLocal(localId: string) {
  try {
    const result = await deleteLocalQuery(localId);

    if (result.success) {
      // Revalidar página de locales
      revalidatePath('/locales');
    }

    return result;
  } catch (error) {
    console.error('Error in deleteLocal:', error);
    return { success: false, message: 'Error inesperado al eliminar local' };
  }
}

// ============================================================================
// DESBLOQUEAR LOCAL (ADMIN + JEFE VENTAS)
// ============================================================================

/**
 * Desbloquear un local bloqueado (admin o jefe_ventas)
 * Setea estado a verde y bloqueado = false
 * @param localId ID del local a desbloquear
 * @param usuarioId ID del usuario (admin o jefe_ventas) que desbloquea
 * @returns Success/error
 */
export async function desbloquearLocal(localId: string, usuarioId?: string) {
  try {
    // Usar updateLocalEstado con estado verde para desbloquear
    const result = await updateLocalEstadoQuery(localId, 'verde', undefined, usuarioId);

    if (result.success) {
      revalidatePath('/locales');
    }

    return result;
  } catch (error) {
    console.error('Error in desbloquearLocal:', error);
    return { success: false, message: 'Error inesperado al desbloquear local' };
  }
}

// ============================================================================
// UPDATE MONTO DE VENTA
// ============================================================================

/**
 * Actualizar monto de venta de un local (solo vendedor/vendedor_caseta en estado naranja)
 * @param localId ID del local
 * @param monto Monto de venta propuesto
 * @param usuarioId ID del usuario (vendedor) que establece el monto
 * @returns Success/error
 */
export async function updateMontoVenta(
  localId: string,
  monto: number,
  usuarioId?: string
) {
  try {
    const result = await updateMontoVentaQuery(localId, monto, usuarioId);

    if (result.success) {
      revalidatePath('/locales');
    }

    return result;
  } catch (error) {
    console.error('Error in updateMontoVenta:', error);
    return { success: false, message: 'Error inesperado al actualizar monto' };
  }
}

// ============================================================================
// REGISTER LEAD TRACKING
// ============================================================================

/**
 * Registrar lead vinculado a local (tracking)
 * @param localId ID del local
 * @param telefono Teléfono del lead
 * @param nombre Nombre del lead
 * @param usuarioId ID del usuario (vendedor) que registra
 * @param estadoAnterior Estado anterior del local
 * @param estadoNuevo Estado nuevo del local
 * @param montoVenta Monto de venta en USD
 * @returns Success/error
 */
export async function registerLeadTracking(
  localId: string,
  telefono: string,
  nombre: string,
  usuarioId?: string,
  estadoAnterior?: string,
  estadoNuevo?: string,
  montoVenta?: number // ✅ NUEVO: Monto de venta en USD
) {
  try {
    const result = await registerLeadTrackingQuery(
      localId,
      telefono,
      nombre,
      usuarioId,
      estadoAnterior,
      estadoNuevo,
      montoVenta
    );

    if (result.success) {
      revalidatePath('/locales');
    }

    return result;
  } catch (error) {
    console.error('Error in registerLeadTracking:', error);
    return { success: false, message: 'Error inesperado al registrar tracking' };
  }
}

// ============================================================================
// SESIÓN 48: AUTO-LIBERACIÓN DE LOCALES EXPIRADOS (TIMER 120 HORAS)
// ============================================================================

/**
 * Liberar automáticamente locales en NARANJA que superaron 120 horas
 * Se ejecuta cada vez que se carga la página de locales (polling cada 60s)
 *
 * Flujo:
 * 1. Buscar locales en NARANJA con naranja_timestamp < (NOW - 120 horas)
 * 2. Cambiar a VERDE automáticamente
 * 3. Limpiar campos naranja_timestamp y naranja_vendedor_id
 * 4. Registrar en historial: "Local liberado automáticamente por vencimiento de tiempo (120 horas)"
 *
 * @returns { liberados: number, errores: number } - Estadísticas de liberación
 */
export async function autoLiberarLocalesExpirados() {
  try {
    console.log('[AUTO-LIBERACIÓN] Iniciando verificación de locales expirados...');

    // PASO 1: Calcular timestamp de hace 120 horas
    const hace120horas = new Date();
    hace120horas.setHours(hace120horas.getHours() - 120);
    const timestamp120h = hace120horas.toISOString();

    // PASO 2: Buscar locales en NARANJA que superaron 120 horas
    const { data: localesExpirados, error: fetchError } = await supabase
      .from('locales')
      .select('id, codigo, naranja_timestamp, vendedor_actual_id')
      .eq('estado', 'naranja')
      .not('naranja_timestamp', 'is', null)
      .lt('naranja_timestamp', timestamp120h);

    if (fetchError) {
      console.error('[AUTO-LIBERACIÓN] ❌ Error fetching locales expirados:', fetchError);
      return { liberados: 0, errores: 1 };
    }

    if (!localesExpirados || localesExpirados.length === 0) {
      // No hay locales expirados - todo OK
      return { liberados: 0, errores: 0 };
    }

    console.log(`[AUTO-LIBERACIÓN] ⏰ Encontrados ${localesExpirados.length} locales expirados, liberando...`);

    // PASO 3: Liberar cada local
    let liberados = 0;
    let errores = 0;

    for (const local of localesExpirados) {
      try {
        // Calcular horas transcurridas (para logging)
        const horasTranscurridas = local.naranja_timestamp
          ? Math.floor((Date.now() - new Date(local.naranja_timestamp).getTime()) / (1000 * 60 * 60))
          : 0;

        console.log(`[AUTO-LIBERACIÓN] Local ${local.codigo} - Expirado hace ${horasTranscurridas}h (timestamp: ${local.naranja_timestamp})`);

        // Cambiar a VERDE y limpiar campos
        const { error: updateError } = await supabase
          .from('locales')
          .update({
            estado: 'verde',
            vendedor_actual_id: null,
            naranja_timestamp: null,
            naranja_vendedor_id: null,
            bloqueado: false,
            monto_venta: null, // Limpiar monto también (nueva negociación = nuevo monto)
          })
          .eq('id', local.id);

        if (updateError) {
          console.error(`[AUTO-LIBERACIÓN] ❌ Error liberando local ${local.codigo}:`, updateError);
          errores++;
          continue;
        }

        // Registrar en historial (usuario_id = NULL porque es automático)
        const { error: historialError } = await supabase
          .from('locales_historial')
          .insert({
            local_id: local.id,
            usuario_id: null, // Sistema automático (no hay usuario)
            estado_anterior: 'naranja',
            estado_nuevo: 'verde',
            accion: 'Local liberado automáticamente por vencimiento de tiempo (120 horas)',
          });

        if (historialError) {
          console.error(`[AUTO-LIBERACIÓN] ⚠️ Error registrando historial para local ${local.codigo}:`, historialError);
          // No fallar la operación si solo falla el historial
        }

        console.log(`[AUTO-LIBERACIÓN] ✅ Local ${local.codigo} liberado exitosamente`);
        liberados++;
      } catch (error) {
        console.error(`[AUTO-LIBERACIÓN] ❌ Error inesperado liberando local ${local.codigo}:`, error);
        errores++;
      }
    }

    console.log(`[AUTO-LIBERACIÓN] ✅ Proceso completado - Liberados: ${liberados} | Errores: ${errores}`);

    // Si hubo liberaciones, revalidar página
    if (liberados > 0) {
      revalidatePath('/locales');
    }

    return { liberados, errores };
  } catch (error) {
    console.error('[AUTO-LIBERACIÓN] ❌ Error inesperado en proceso de auto-liberación:', error);
    return { liberados: 0, errores: 1 };
  }
}

// ============================================================================
// SESIÓN 52C: GUARDAR DATOS PARA REGISTRO DE VENTA (MODAL PREVIO)
// ============================================================================

/**
 * Guardar datos necesarios para iniciar proceso de registro de venta
 * - Montos de separación y venta
 * - Vinculación de lead (existente o nuevo)
 * - Asignación de vendedor (SESIÓN 52D)
 * - Registro en historial
 *
 * @param localId ID del local
 * @param montoSeparacion Monto de separación en USD
 * @param montoVenta Monto de venta en USD
 * @param leadId ID del lead existente (opcional)
 * @param newLeadData Datos para crear nuevo lead manual (opcional)
 * @param usuarioId ID del usuario (admin/jefe_ventas) que registra
 * @param vendedorId ID del vendedor a asignar al local (SESIÓN 52D)
 * @returns Success/error con local actualizado
 */
export async function saveDatosRegistroVenta(
  localId: string,
  montoSeparacion: number,
  montoVenta: number,
  leadId: string | null,
  newLeadData: {
    telefono: string;
    nombre: string;
    proyectoId: string;
  } | null,
  usuarioId: string,
  vendedorId: string // SESIÓN 52D: Nuevo parámetro REQUERIDO
) {
  try {
    // PASO 1: Validar inputs server-side
    if (!localId || !usuarioId) {
      return { success: false, message: 'Datos incompletos (localId, usuarioId)' };
    }

    if (!montoSeparacion || montoSeparacion <= 0) {
      return { success: false, message: 'Monto de separación debe ser mayor a 0' };
    }

    if (!montoVenta || montoVenta <= 0) {
      return { success: false, message: 'Monto de venta debe ser mayor a 0' };
    }

    // SESIÓN 52D: Validar vendedorId
    if (!vendedorId || vendedorId.trim().length === 0) {
      return { success: false, message: 'Debe seleccionar un vendedor' };
    }

    // SESIÓN 52D: Validar que vendedor existe y tiene rol válido
    const { data: vendedorData, error: vendedorError } = await supabase
      .from('usuarios')
      .select('id, nombre, rol, vendedor_id')
      .eq('id', vendedorId)  // Buscar por ID de usuario
      .in('rol', ['vendedor', 'vendedor_caseta'])
      .single();

    if (vendedorError || !vendedorData) {
      console.error('[DATOS VENTA] ❌ Error validando vendedor:', vendedorError);
      return { success: false, message: 'Vendedor no encontrado o inválido' };
    }

    let finalLeadId = leadId;

    // PASO 2: Si newLeadData existe, crear nuevo lead manual
    if (!leadId && newLeadData) {
      console.log('[DATOS VENTA] Creando nuevo lead manual:', newLeadData);

      const createResult = await createManualLead(
        newLeadData.nombre,
        newLeadData.telefono,
        newLeadData.proyectoId,
        vendedorId // SESIÓN 52D: Usar vendedorId seleccionado por admin
      );

      if (createResult.success && createResult.leadId) {
        finalLeadId = createResult.leadId;
        console.log('[DATOS VENTA] ✅ Lead manual creado:', finalLeadId);
      } else {
        console.error('[DATOS VENTA] ⚠️ Error creando lead manual:', createResult.message);
        return { success: false, message: createResult.message || 'Error al crear lead manual' };
      }
    }

    // PASO 3: Actualizar local con montos, lead_id y vendedor_id (SESIÓN 52D)
    const { error: updateError } = await supabase
      .from('locales')
      .update({
        monto_separacion: montoSeparacion,
        monto_venta: montoVenta,
        lead_id: finalLeadId,
        vendedor_actual_id: vendedorData.vendedor_id, // SESIÓN 52D: Usar vendedor_id de la tabla vendedores
      })
      .eq('id', localId);

    if (updateError) {
      console.error('[DATOS VENTA] ❌ Error actualizando local:', updateError);
      return { success: false, message: 'Error al actualizar local' };
    }

    // PASO 4: Registrar en historial (SESIÓN 52D: Incluir vendedor asignado)
    const nombreCliente = newLeadData?.nombre || 'Lead existente';
    const accion = `Admin/Jefe Ventas completó datos para registro de venta: monto_separacion=$${montoSeparacion.toFixed(2)}, monto_venta=$${montoVenta.toFixed(2)}, lead=${nombreCliente}, vendedor_asignado=${vendedorData.nombre}`;

    const { error: historialError } = await supabase
      .from('locales_historial')
      .insert({
        local_id: localId,
        usuario_id: usuarioId,
        estado_anterior: 'rojo', // Asumimos que siempre viene de ROJO
        estado_nuevo: 'rojo', // Permanece en ROJO
        accion,
      });

    if (historialError) {
      console.error('[DATOS VENTA] ⚠️ Error registrando historial:', historialError);
      // No fallar la operación si solo falla el historial
    }

    // PASO 5: Obtener local actualizado para retornar
    const local = await getLocalById(localId);
    if (!local) {
      return { success: false, message: 'Local no encontrado después de actualizar' };
    }

    console.log('[DATOS VENTA] ✅ Datos guardados exitosamente:', {
      localId,
      montoSeparacion,
      montoVenta,
      leadId: finalLeadId,
    });

    revalidatePath('/locales');

    return {
      success: true,
      message: 'Datos guardados correctamente',
      local,
    };
  } catch (error) {
    console.error('[DATOS VENTA] ❌ Error inesperado:', error);
    return { success: false, message: 'Error inesperado al guardar datos' };
  }
}

// ============================================================================
// SESIÓN 48E: SALIR DE NEGOCIACIÓN (AMARILLO)
// ============================================================================

/**
 * Remover vendedor de la negociación de un local en AMARILLO
 * Si es el último vendedor, el local vuelve automáticamente a VERDE
 *
 * Flujo:
 * 1. Verificar que el local esté en AMARILLO
 * 2. Verificar que el vendedor esté en el array vendedores_negociando_ids
 * 3. Remover vendedor del array
 * 4. Si array queda vacío → cambiar local a VERDE + historial
 * 5. Si array tiene vendedores → solo actualizar array (local sigue AMARILLO)
 *
 * @param localId ID del local
 * @param vendedorId ID del vendedor que sale de la negociación
 * @param usuarioId ID del usuario (para historial)
 * @returns Success/error con mensaje
 */
export async function salirDeNegociacion(
  localId: string,
  vendedorId: string,
  usuarioId?: string
) {
  try {
    // PASO 1: Obtener local actual
    const local = await getLocalById(localId);
    if (!local) {
      return { success: false, message: 'Local no encontrado' };
    }

    // PASO 2: Validar que esté en AMARILLO
    if (local.estado !== 'amarillo') {
      return {
        success: false,
        message: 'Solo puedes salir de la negociación de locales en estado AMARILLO',
      };
    }

    // PASO 3: Verificar que el vendedor esté en el array
    const vendedoresActuales = local.vendedores_negociando_ids || [];
    if (!vendedoresActuales.includes(vendedorId)) {
      return {
        success: false,
        message: 'No estás en la negociación de este local',
      };
    }

    // PASO 4: Remover vendedor del array
    const vendedoresNuevos = vendedoresActuales.filter((id) => id !== vendedorId);

    // PASO 5: Decidir si el local vuelve a VERDE o se mantiene AMARILLO
    const nuevoEstado = vendedoresNuevos.length === 0 ? 'verde' : 'amarillo';

    // PASO 6: Actualizar local
    const { error: updateError } = await supabase
      .from('locales')
      .update({
        estado: nuevoEstado,
        vendedores_negociando_ids: vendedoresNuevos,
        // Si vuelve a VERDE, limpiar vendedor_actual_id
        ...(nuevoEstado === 'verde' && { vendedor_actual_id: null }),
      })
      .eq('id', localId);

    if (updateError) {
      console.error('[SALIR NEGOCIACIÓN] ❌ Error actualizando local:', updateError);
      return { success: false, message: 'Error al salir de la negociación' };
    }

    // PASO 7: Registrar en historial
    const { error: historialError } = await supabase
      .from('locales_historial')
      .insert({
        local_id: localId,
        usuario_id: usuarioId || null,
        estado_anterior: 'amarillo',
        estado_nuevo: nuevoEstado,
        accion:
          nuevoEstado === 'verde'
            ? 'Vendedor salió de la negociación (último vendedor, local liberado)'
            : `Vendedor salió de la negociación (${vendedoresNuevos.length} vendedor(es) restante(s))`,
      });

    if (historialError) {
      console.error('[SALIR NEGOCIACIÓN] ⚠️ Error registrando historial:', historialError);
      // No fallar la operación si solo falla el historial
    }

    // PASO 8: Revalidar página
    revalidatePath('/locales');

    return {
      success: true,
      message:
        nuevoEstado === 'verde'
          ? 'Saliste de la negociación. El local volvió a estado VERDE.'
          : `Saliste de la negociación. ${vendedoresNuevos.length} vendedor(es) aún negociando.`,
    };
  } catch (error) {
    console.error('[SALIR NEGOCIACIÓN] ❌ Error inesperado:', error);
    return { success: false, message: 'Error inesperado al salir de la negociación' };
  }
}
