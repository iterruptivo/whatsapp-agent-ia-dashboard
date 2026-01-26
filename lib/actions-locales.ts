// ============================================================================
// SERVER ACTIONS: Locales en Venta
// ============================================================================
// Descripción: Server Actions para mutaciones de locales
// Uso: Componentes cliente llaman estas funciones para cambios de estado
// ============================================================================

'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from './supabase';
import { createServerClient } from '@supabase/ssr'; // SESIÓN 52D: Para Server Actions con auth
import { createClient as createSupabaseClient } from '@supabase/supabase-js'; // SESIÓN 106: Para admin client
import { cookies } from 'next/headers'; // SESIÓN 52D: Para Server Actions con auth
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
import { trackLocalStatusChanged, trackVentaCerrada } from './analytics/posthog-server';

// ============================================================================
// HELPER: Crear cliente Admin (service role) - BYPASA RLS
// SESIÓN 106: Para operaciones que necesitan bypass de RLS
// ============================================================================

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada');
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// ============================================================================
// UPDATE ESTADO DE LOCAL
// ============================================================================

/**
 * SESIÓN 48C: Actualizada para aceptar comentario opcional + monto de venta
 * Cambiar estado de un local (semáforo)
 *
 * RBAC: Requiere permiso locales:cambiar_estado
 *
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
  // RBAC: Validar permiso locales:cambiar_estado
  const { checkPermission } = await import('@/lib/permissions/server');
  const { PERMISOS_LOCALES } = await import('@/lib/permissions/types');

  const permissionCheck = await checkPermission(PERMISOS_LOCALES.CAMBIAR_ESTADO.modulo, PERMISOS_LOCALES.CAMBIAR_ESTADO.accion);
  if (!permissionCheck.ok) {
    return { success: false, message: permissionCheck.error || 'No autorizado para cambiar estado de local' };
  }

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

    // SESIÓN 101: Solo vendedor/vendedor_caseta NO pueden cambiar desde NARANJA
    // Coordinador y jefe_ventas SÍ pueden (porque también venden y gestionan)
    if (
      local.estado === 'naranja' &&
      userRole &&
      (userRole === 'vendedor' || userRole === 'vendedor_caseta')
    ) {
      return {
        success: false,
        message: 'Solo jefes de ventas, coordinadores o administradores pueden cambiar el estado de un local confirmado (NARANJA)',
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
      // Track local status change in PostHog (non-blocking)
      trackLocalStatusChanged(usuarioId || 'system', {
        local_id: localId,
        local_codigo: local.codigo,
        estado_anterior: estadoAnterior,
        estado_nuevo: nuevoEstado,
        proyecto_id: local.proyecto_id,
        monto_venta: montoVenta,
      }).catch(() => {});

      // Track venta cerrada if moving to ROJO
      if (nuevoEstado === 'rojo' && montoVenta) {
        trackVentaCerrada(usuarioId || 'system', {
          local_id: localId,
          local_codigo: local.codigo,
          monto_venta: montoVenta,
          proyecto_id: local.proyecto_id,
          vendedor_id: vendedorId,
        }).catch(() => {});
      }

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
        // OBTENER VENDEDOR ASIGNADO AL LEAD (para trazabilidad de comisiones)
        // ============================================================================
        let vendedorAsignadoId: string | undefined;
        if (finalLeadId) {
          const { data: leadData } = await supabase
            .from('leads')
            .select('vendedor_asignado_id')
            .eq('id', finalLeadId)
            .single();

          if (leadData?.vendedor_asignado_id) {
            vendedorAsignadoId = leadData.vendedor_asignado_id;
            console.log('[NARANJA] 📋 Vendedor asignado al lead:', vendedorAsignadoId);
          }
        }

        // ============================================================================
        // REGISTRAR EN TABLA RELACIONAL locales_leads
        // ============================================================================
        const relationResult = await registerLocalLeadRelation(
          localId,
          telefono,
          finalLeadId,  // leadId existente o recién creado (puede ser undefined)
          vendedorAsignadoId,  // Vendedor asignado al lead (NO el usuario que confirma)
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
 *
 * RBAC: Requiere permiso locales:delete
 *
 * @param localId ID del local a eliminar
 * @returns Success/error
 */
export async function deleteLocal(localId: string) {
  // RBAC: Validar permiso locales:delete
  const { checkPermission } = await import('@/lib/permissions/server');
  const { PERMISOS_LOCALES } = await import('@/lib/permissions/types');

  const permissionCheck = await checkPermission(PERMISOS_LOCALES.DELETE.modulo, PERMISOS_LOCALES.DELETE.accion);
  if (!permissionCheck.ok) {
    return { success: false, message: permissionCheck.error || 'No autorizado para eliminar locales' };
  }

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

    // PASO 1: Buscar TODOS los locales en NARANJA con timestamp
    // (necesitamos traerlos todos para considerar extensiones individuales)
    const { data: localesNaranja, error: fetchError } = await supabase
      .from('locales')
      .select('id, codigo, naranja_timestamp, vendedor_actual_id, extension_dias')
      .eq('estado', 'naranja')
      .not('naranja_timestamp', 'is', null);

    if (fetchError) {
      console.error('[AUTO-LIBERACIÓN] ❌ Error fetching locales:', fetchError);
      return { liberados: 0, errores: 1 };
    }

    // PASO 2: Filtrar los que realmente expiraron (considerando extensiones)
    const ahora = new Date();
    const localesExpirados = (localesNaranja || []).filter(local => {
      if (!local.naranja_timestamp) return false;

      const inicio = new Date(local.naranja_timestamp);
      const horasTotales = 120 + ((local.extension_dias || 0) * 120); // 120h base + 120h por extensión
      const fin = new Date(inicio.getTime() + horasTotales * 60 * 60 * 1000);

      return ahora > fin;
    });

    if (localesExpirados.length === 0) {
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
            monto_separacion: null, // SESIÓN 59: Limpiar monto de separación también
            // SESIÓN 59: Limpiar campos de trazabilidad (sistema de comisiones)
            usuario_paso_naranja_id: null,
            usuario_paso_rojo_id: null,
            fecha_paso_naranja: null,
            fecha_paso_rojo: null,
            vendedor_cerro_venta_id: null,
            fecha_cierre_venta: null,
            // SESIÓN 106: Limpiar campos de extensión
            extension_dias: 0,
            extension_usuario_id: null,
            extension_motivo: null,
            extension_at: null,
          })
          .eq('id', local.id);

        if (updateError) {
          console.error(`[AUTO-LIBERACIÓN] ❌ Error liberando local ${local.codigo}:`, updateError);
          errores++;
          continue;
        }

        // Registrar en historial (usuario_id = NULL porque es automático)
        const horasTotales = 120 + ((local.extension_dias || 0) * 120);
        const { error: historialError } = await supabase
          .from('locales_historial')
          .insert({
            local_id: local.id,
            usuario_id: null, // Sistema automático (no hay usuario)
            estado_anterior: 'naranja',
            estado_nuevo: 'verde',
            accion: local.extension_dias > 0
              ? `Local liberado automáticamente por vencimiento de tiempo (${horasTotales} horas, incluye extensión)`
              : 'Local liberado automáticamente por vencimiento de tiempo (120 horas)',
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
// SESIÓN 105: EXTENDER PLAZO DE RESERVA (NARANJA)
// ============================================================================

/**
 * Extender plazo de reserva de un local en estado NARANJA
 * Solo puede ser ejecutado por jefe_ventas
 * Máximo 1 extensión de 5 días (120 horas adicionales)
 */
export async function extenderPlazoReserva(
  localId: string,
  usuarioId: string,
  motivo: string
): Promise<{ success: boolean; message: string }> {
  try {
    // SESIÓN 106: Usar admin client para bypass RLS en server action
    const supabaseAdmin = createAdminClient();

    // 1. Obtener datos del local
    const { data: local, error: fetchError } = await supabaseAdmin
      .from('locales')
      .select('id, codigo, estado, extension_dias, naranja_timestamp')
      .eq('id', localId)
      .single();

    if (fetchError || !local) {
      return { success: false, message: 'Local no encontrado' };
    }

    // 2. Validar que esté en NARANJA
    if (local.estado !== 'naranja') {
      return { success: false, message: 'Solo se puede extender plazo de locales en estado NARANJA' };
    }

    // 3. Validar que no haya expirado
    if (local.naranja_timestamp) {
      const fin = new Date(local.naranja_timestamp);
      fin.setHours(fin.getHours() + 120 + (local.extension_dias * 120));
      if (new Date() > fin) {
        return { success: false, message: 'El plazo ya expiró, no se puede extender' };
      }
    }

    // 4. Validar que no haya usado la extensión
    if (local.extension_dias >= 1) {
      return { success: false, message: 'Este local ya usó su extensión máxima de plazo' };
    }

    // 5. Validar que el usuario sea jefe_ventas
    const { data: usuario, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('rol, nombre')
      .eq('id', usuarioId)
      .single();

    if (userError || !usuario) {
      console.error('[EXTENSION] Error buscando usuario:', userError, 'ID:', usuarioId);
      return { success: false, message: 'Usuario no encontrado' };
    }

    if (usuario.rol !== 'jefe_ventas') {
      return { success: false, message: 'Solo jefes de venta pueden extender el plazo' };
    }

    // 6. Actualizar el local con la extensión
    const { error: updateError } = await supabaseAdmin
      .from('locales')
      .update({
        extension_dias: 1,
        extension_usuario_id: usuarioId,
        extension_motivo: motivo,
        extension_at: new Date().toISOString(),
      })
      .eq('id', localId);

    if (updateError) {
      console.error('[EXTENSION] Error actualizando local:', updateError);
      return { success: false, message: 'Error al guardar la extensión' };
    }

    // 7. Registrar en historial
    await supabaseAdmin
      .from('locales_historial')
      .insert({
        local_id: localId,
        usuario_id: usuarioId,
        estado_anterior: 'naranja',
        estado_nuevo: 'naranja',
        accion: `Jefe de ventas ${usuario.nombre} extendió el plazo 5 días más. Motivo: ${motivo}`,
      });

    console.log(`[EXTENSION] ✅ Local ${local.codigo} extendido por ${usuario.nombre}`);

    revalidatePath('/locales');
    return { success: true, message: 'Plazo extendido exitosamente (+5 días)' };
  } catch (error) {
    console.error('[EXTENSION] Error inesperado:', error);
    return { success: false, message: 'Error inesperado al extender plazo' };
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
    // SESIÓN 52D: Crear Server Client con autenticación (patrón Sesión 51)
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
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

    // Validar autenticación
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('[DATOS VENTA] ❌ Error de autenticación:', authError);
      return { success: false, message: 'No autorizado' };
    }

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
    console.log('[DATOS VENTA] 🔍 Validando vendedorId recibido:', {
      vendedorId,
      tipo: typeof vendedorId,
      longitud: vendedorId?.length,
      estaVacio: !vendedorId || vendedorId.trim().length === 0
    });

    if (!vendedorId || vendedorId.trim().length === 0) {
      return { success: false, message: 'Debe seleccionar un vendedor' };
    }

    // SESIÓN 52D: Validar que vendedor existe y tiene rol válido (usando Server Client)
    // SESIÓN 74: Agregar 'coordinador' a roles válidos
    console.log('[DATOS VENTA] 🔍 Ejecutando query usuarios con .eq("id", vendedorId)');
    const { data: vendedorData, error: vendedorError } = await supabaseAuth
      .from('usuarios')
      .select('id, nombre, rol, vendedor_id')
      .eq('id', vendedorId)  // Buscar por ID de usuario
      .in('rol', ['vendedor', 'vendedor_caseta', 'coordinador'])
      .single();

    console.log('[DATOS VENTA] 🔍 Resultado de query:', {
      found: !!vendedorData,
      vendedorData,
      error: vendedorError
    });

    if (vendedorError || !vendedorData) {
      console.error('[DATOS VENTA] ❌ Error validando vendedor:', vendedorError);
      return { success: false, message: 'Vendedor no encontrado o inválido' };
    }

    let finalLeadId = leadId;
    let telefono = '';
    let nombreLead = '';

    // PASO 2A: Si usamos lead existente, obtener teléfono y nombre de BD
    if (leadId && !newLeadData) {
      console.log('[DATOS VENTA] Obteniendo teléfono de lead existente:', leadId);
      const { data: existingLead, error: leadError } = await supabaseAuth
        .from('leads')
        .select('telefono, nombre')
        .eq('id', leadId)
        .single();

      if (leadError || !existingLead) {
        console.error('[DATOS VENTA] ❌ Error obteniendo lead existente:', leadError);
        return { success: false, message: 'Lead no encontrado' };
      }

      telefono = existingLead.telefono;
      nombreLead = existingLead.nombre;
      console.log('[DATOS VENTA] ✅ Lead existente encontrado:', existingLead.nombre, 'Tel:', telefono);
    }

    // PASO 2B: Si newLeadData existe, crear nuevo lead manual
    if (!leadId && newLeadData) {
      console.log('[DATOS VENTA] Creando nuevo lead manual:', newLeadData);
      console.log('[DATOS VENTA] Pasando vendedor_id a createManualLead:', {
        usuarioId: vendedorId,
        vendedorId: vendedorData.vendedor_id
      });

      const createResult = await createManualLead(
        newLeadData.nombre,
        newLeadData.telefono,
        newLeadData.proyectoId,
        vendedorData.vendedor_id // SESIÓN 52D: Pasar vendedor_id (tabla vendedores), NO usuario.id
      );

      if (createResult.success && createResult.leadId) {
        finalLeadId = createResult.leadId;
        telefono = newLeadData.telefono;
        nombreLead = newLeadData.nombre;
        console.log('[DATOS VENTA] ✅ Lead manual creado:', finalLeadId);
      } else {
        console.error('[DATOS VENTA] ⚠️ Error creando lead manual:', createResult.message);
        return { success: false, message: createResult.message || 'Error al crear lead manual' };
      }
    }

    // PASO 3: Registrar relación en tabla locales_leads (junction table) - SESIÓN 52D
    const relationResult = await registerLocalLeadRelation(
      localId,
      telefono,
      finalLeadId ?? undefined,  // Convertir null a undefined
      vendedorData.vendedor_id,  // FK a tabla vendedores
      vendedorId,                 // FK a tabla usuarios (quien asigna/ejecuta)
      montoSeparacion,
      montoVenta
    );

    if (!relationResult.success) {
      console.error('[DATOS VENTA] ❌ Error registrando relación:', relationResult.message);
      return { success: false, message: 'Error al vincular lead con local' };
    }

    console.log('[DATOS VENTA] ✅ Relación lead-local registrada en locales_leads');

    // PASO 4: Actualizar local con montos y vendedor_id (SESIÓN 52D)
    console.log('[DATOS VENTA] 🔄 PASO 4: Actualizando local...', { localId, montoSeparacion, montoVenta });
    const { error: updateError } = await supabaseAuth
      .from('locales')
      .update({
        monto_separacion: montoSeparacion,
        monto_venta: montoVenta,
        // NOTA: lead_id NO se guarda en tabla locales, solo en locales_leads (relación)
        vendedor_actual_id: vendedorData.vendedor_id, // SESIÓN 52D: Usar vendedor_id de la tabla vendedores
        usuario_paso_naranja_id: vendedorId, // Sistema comisiones: vendedor asignado recibe comisión fase vendedor
        fecha_paso_naranja: new Date().toISOString(),
      })
      .eq('id', localId);

    if (updateError) {
      console.error('[DATOS VENTA] ❌ Error actualizando local:', updateError);
      return { success: false, message: 'Error al actualizar local' };
    }
    console.log('[DATOS VENTA] ✅ PASO 4 completado: Local actualizado');

    // PASO 5: Registrar en historial (SESIÓN 52D: Formato mejorado)
    console.log('[DATOS VENTA] 🔄 PASO 5: Registrando en historial...');

    // Obtener nombre y rol del usuario que ejecuta
    const { data: usuarioData, error: usuarioError } = await supabaseAuth
      .from('usuarios')
      .select('nombre, rol')
      .eq('id', usuarioId)
      .single();

    if (usuarioError || !usuarioData) {
      console.error('[DATOS VENTA] ⚠️ Error obteniendo usuario:', usuarioError);
      return { success: false, message: 'Usuario no encontrado' };
    }

    // Formato mejorado del historial
    const montoSeparacionFormateado = `$${montoSeparacion.toFixed(2)}`;
    const montoVentaFormateado = `$${montoVenta.toFixed(2)}`;
    const accion = `${usuarioData.nombre} (${usuarioData.rol}) completó datos para registro de venta: monto_separacion=${montoSeparacionFormateado} | monto_venta=${montoVentaFormateado} | Vinculó lead: ${nombreLead} (Tel: ${telefono}) | vendedor_asignado=${vendedorData.nombre}`;

    console.log('[DATOS VENTA] 📝 Acción a insertar:', accion);
    // SESIÓN 52D: Usar browser client (supabase) para INSERT historial, igual que updateLocalEstadoQuery
    // RLS policy permite INSERT con role anon (no authenticated)
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
      console.error('[DATOS VENTA] ❌ Error registrando historial:', historialError);
      // No fallar la operación si solo falla el historial
    } else {
      console.log('[DATOS VENTA] ✅ PASO 5 completado: Historial registrado');
    }

    // PASO 6: Obtener local actualizado para retornar
    console.log('[DATOS VENTA] 🔄 PASO 6: Obteniendo local actualizado...');
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
    const updateData: any = {
      estado: nuevoEstado,
      vendedores_negociando_ids: vendedoresNuevos,
    };

    // SESIÓN 59: Si vuelve a VERDE, limpiar TODOS los campos de trazabilidad
    if (nuevoEstado === 'verde') {
      updateData.vendedor_actual_id = null;
      updateData.usuario_paso_naranja_id = null;
      updateData.usuario_paso_rojo_id = null;
      updateData.fecha_paso_naranja = null;
      updateData.fecha_paso_rojo = null;
      updateData.vendedor_cerro_venta_id = null;
      updateData.fecha_cierre_venta = null;
      updateData.monto_separacion = null;
      updateData.monto_venta = null;
      updateData.naranja_timestamp = null;
      updateData.naranja_vendedor_id = null;
      updateData.bloqueado = false;
    }

    const { error: updateError } = await supabase
      .from('locales')
      .update(updateData)
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

// ============================================================================
// SESIÓN 56: ACTUALIZAR PRECIO BASE DE LOCAL
// ============================================================================

/**
 * Actualizar precio base de un local
 * @param localId ID del local
 * @param precioBase Precio base en USD (debe ser > 0)
 * @returns Success/error con mensaje
 */
export async function updatePrecioBase(
  localId: string,
  precioBase: number
): Promise<{ success: boolean; message: string }> {
  try {
    // Validar inputs
    if (!localId) {
      return { success: false, message: 'ID de local requerido' };
    }

    if (!precioBase || precioBase <= 0) {
      return { success: false, message: 'El precio base debe ser mayor a 0' };
    }

    // Actualizar en BD
    const { error: updateError } = await supabase
      .from('locales')
      .update({ precio_base: precioBase })
      .eq('id', localId);

    if (updateError) {
      console.error('[PRECIO BASE] ❌ Error actualizando:', updateError);
      return { success: false, message: 'Error al actualizar precio base' };
    }

    // Revalidar página
    revalidatePath('/locales');

    return {
      success: true,
      message: 'Precio base actualizado correctamente',
    };
  } catch (error) {
    console.error('[PRECIO BASE] ❌ Error inesperado:', error);
    return { success: false, message: 'Error inesperado al actualizar precio base' };
  }
}

// ============================================================================
// SESIÓN 107: ACTUALIZAR PISOS DISPONIBLES AUTOMÁTICAMENTE
// ============================================================================
// Cuando se importan locales o se crea un local excepcional con piso,
// esta función actualiza automáticamente proyecto_configuraciones.pisos_disponibles
// ============================================================================

/**
 * Actualiza pisos_disponibles en proyecto_configuraciones
 * Si el proyecto no tiene configuración, la crea
 * Si ya tiene pisos, solo agrega los nuevos (sin duplicados)
 */
export async function actualizarPisosDisponibles(
  proyectoId: string,
  pisosNuevos: string[]
): Promise<{ success: boolean; message: string }> {
  try {
    // Filtrar pisos vacíos
    const pisosValidos = pisosNuevos.filter(p => p && p.trim() !== '');

    if (pisosValidos.length === 0) {
      return { success: true, message: 'No hay pisos nuevos para agregar' };
    }

    console.log(`[PISOS CONFIG] Actualizando pisos para proyecto ${proyectoId}:`, pisosValidos);

    // 1. Obtener configuración actual
    const { data: config, error: getError } = await supabase
      .from('proyecto_configuraciones')
      .select('configuraciones_extra')
      .eq('proyecto_id', proyectoId)
      .maybeSingle();

    // 2. Preparar el array de pisos (existentes + nuevos, sin duplicados, ordenados)
    const pisosExistentes = config?.configuraciones_extra?.pisos_disponibles || [];
    const todosLosPisos = [...new Set([...pisosExistentes, ...pisosValidos])].sort();

    // Si no hay cambios, no hacer nada
    if (JSON.stringify(pisosExistentes.sort()) === JSON.stringify(todosLosPisos)) {
      console.log('[PISOS CONFIG] Sin cambios en pisos');
      return { success: true, message: 'Pisos ya configurados' };
    }

    // 3. Si no hay config, crear una nueva
    if (!config) {
      console.log('[PISOS CONFIG] Creando nueva configuración con pisos:', todosLosPisos);
      const { error: insertError } = await supabase
        .from('proyecto_configuraciones')
        .insert({
          proyecto_id: proyectoId,
          configuraciones_extra: {
            pisos_disponibles: todosLosPisos,
            cuotas_con_interes: [],
            cuotas_sin_interes: [],
            porcentajes_inicial: []
          }
        });

      if (insertError) {
        console.error('[PISOS CONFIG] ❌ Error al crear configuración:', insertError);
        return { success: false, message: `Error al crear configuración: ${insertError.message}` };
      }
      console.log('[PISOS CONFIG] ✅ Configuración creada con pisos:', todosLosPisos);
      return { success: true, message: `Configuración creada con pisos: ${todosLosPisos.join(', ')}` };
    }

    // 4. Si ya existe, actualizar
    const newConfigExtra = {
      ...config.configuraciones_extra,
      pisos_disponibles: todosLosPisos
    };

    const { error: updateError } = await supabase
      .from('proyecto_configuraciones')
      .update({ configuraciones_extra: newConfigExtra })
      .eq('proyecto_id', proyectoId);

    if (updateError) {
      console.error('[PISOS CONFIG] ❌ Error al actualizar:', updateError);
      return { success: false, message: `Error al actualizar: ${updateError.message}` };
    }

    console.log('[PISOS CONFIG] ✅ Pisos actualizados:', todosLosPisos);
    return { success: true, message: `Pisos actualizados: ${todosLosPisos.join(', ')}` };
  } catch (error) {
    console.error('[PISOS CONFIG] ❌ Error inesperado:', error);
    return { success: false, message: 'Error inesperado al actualizar pisos' };
  }
}

// ============================================================================
// SESIÓN 102: LOCALES EXCEPCIONALES
// ============================================================================
// Para regularizar ventas duplicadas históricas (ej: A-107-1, A-107-2)
// ============================================================================

/**
 * Crear un local excepcional para regularizar ventas duplicadas
 * Solo disponible para: superadmin, admin, jefe_ventas
 */
export async function crearLocalExcepcional(data: {
  codigo: string;
  proyecto_id: string;
  metraje: number;
  precio_base: number;
  piso?: string | null;
}): Promise<{ success: boolean; message: string; local?: { id: string; codigo: string } }> {
  try {
    // Crear Server Client con autenticación (patrón Sesión 51)
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    // Validar autenticación
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      return { success: false, message: 'No autenticado' };
    }

    // Obtener datos del usuario desde tabla usuarios
    const { data: userData, error: userError } = await supabaseAuth
      .from('usuarios')
      .select('id, nombre, rol')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    const rolesAutorizados = ['superadmin', 'admin', 'jefe_ventas'];
    if (!rolesAutorizados.includes(userData.rol)) {
      return { success: false, message: 'No autorizado. Solo admin y jefe de ventas pueden crear locales excepcionales.' };
    }

    // Validar datos
    if (!data.codigo?.trim()) {
      return { success: false, message: 'El código es requerido' };
    }

    if (!data.proyecto_id) {
      return { success: false, message: 'El proyecto es requerido' };
    }

    if (!data.metraje || data.metraje <= 0) {
      return { success: false, message: 'El metraje debe ser mayor a 0' };
    }

    if (!data.precio_base || data.precio_base <= 0) {
      return { success: false, message: 'El precio base debe ser mayor a 0' };
    }

    // Verificar que el código no exista en el proyecto (considerando piso)
    const { data: existente } = await supabase
      .from('locales')
      .select('id')
      .eq('proyecto_id', data.proyecto_id)
      .eq('codigo', data.codigo.trim())
      .eq('piso', data.piso || null)
      .single();

    if (existente) {
      return { success: false, message: `Ya existe un local con código "${data.codigo}" en este proyecto` };
    }

    // Crear el local excepcional
    const { data: nuevoLocal, error } = await supabase
      .from('locales')
      .insert({
        codigo: data.codigo.trim(),
        proyecto_id: data.proyecto_id,
        metraje: data.metraje,
        precio_base: data.precio_base,
        piso: data.piso || null,
        estado: 'verde',
        bloqueado: false,
        es_excepcional: true,
        en_control_pagos: false,
        vendedores_negociando_ids: [],
      })
      .select('id, codigo')
      .single();

    if (error) {
      console.error('[LOCAL EXCEPCIONAL] ❌ Error al crear:', error);
      return { success: false, message: 'Error al crear el local excepcional' };
    }

    // Registrar en historial
    const pisoInfo = data.piso ? `, piso: ${data.piso}` : '';
    await supabase.from('locales_historial').insert({
      local_id: nuevoLocal.id,
      usuario_id: userData.id,
      estado_anterior: 'verde',
      estado_nuevo: 'verde',
      accion: `Local excepcional creado: ${data.codigo}${pisoInfo} (metraje: ${data.metraje}m², precio: $${data.precio_base})`,
    });

    console.log(`[LOCAL EXCEPCIONAL] ✅ Creado: ${data.codigo} por ${userData.nombre}`);

    revalidatePath('/locales');

    return {
      success: true,
      message: `Local excepcional "${data.codigo}" creado correctamente`,
      local: nuevoLocal,
    };
  } catch (error) {
    console.error('[LOCAL EXCEPCIONAL] ❌ Error inesperado:', error);
    return { success: false, message: 'Error inesperado al crear local excepcional' };
  }
}

/**
 * Eliminar un local excepcional
 * Solo se puede eliminar si:
 * - El local tiene es_excepcional = true
 * - NO tiene ficha de inscripción (clientes_fichas)
 */
export async function eliminarLocalExcepcional(
  localId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Crear Server Client con autenticación (patrón Sesión 51)
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    // Validar autenticación
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      return { success: false, message: 'No autenticado' };
    }

    // Obtener datos del usuario desde tabla usuarios
    const { data: userData, error: userError } = await supabaseAuth
      .from('usuarios')
      .select('id, nombre, rol')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    const rolesAutorizados = ['superadmin', 'admin', 'jefe_ventas'];
    if (!rolesAutorizados.includes(userData.rol)) {
      return { success: false, message: 'No autorizado. Solo admin y jefe de ventas pueden eliminar locales excepcionales.' };
    }

    // Obtener el local
    const { data: local, error: localError } = await supabase
      .from('locales')
      .select('id, codigo, es_excepcional')
      .eq('id', localId)
      .single();

    if (localError || !local) {
      return { success: false, message: 'Local no encontrado' };
    }

    // Validar que sea excepcional
    if (!local.es_excepcional) {
      return { success: false, message: 'Solo se pueden eliminar locales excepcionales' };
    }

    // Verificar que no tenga ficha de inscripción
    const { data: ficha } = await supabase
      .from('clientes_fichas')
      .select('id')
      .eq('local_id', localId)
      .single();

    if (ficha) {
      return { success: false, message: 'No se puede eliminar: el local tiene una ficha de inscripción asociada' };
    }

    // Eliminar historial primero (FK constraint)
    await supabase
      .from('locales_historial')
      .delete()
      .eq('local_id', localId);

    // Eliminar el local
    const { error: deleteError } = await supabase
      .from('locales')
      .delete()
      .eq('id', localId);

    if (deleteError) {
      console.error('[LOCAL EXCEPCIONAL] ❌ Error al eliminar:', deleteError);
      return { success: false, message: 'Error al eliminar el local excepcional' };
    }

    console.log(`[LOCAL EXCEPCIONAL] ✅ Eliminado: ${local.codigo} por ${userData.nombre}`);

    revalidatePath('/locales');

    return {
      success: true,
      message: `Local excepcional "${local.codigo}" eliminado correctamente`,
    };
  } catch (error) {
    console.error('[LOCAL EXCEPCIONAL] ❌ Error inesperado:', error);
    return { success: false, message: 'Error inesperado al eliminar local excepcional' };
  }
}
