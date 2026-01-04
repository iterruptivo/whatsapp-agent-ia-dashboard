'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper para crear cliente Supabase en server actions
async function getSupabaseClient() {
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
// TYPES
// ============================================================================

export interface RangoAprobacion {
  min: number;
  max: number;
  aprobadores: string[]; // Roles: 'jefe_ventas', 'admin', etc.
  descripcion: string;
}

export interface ConfigAprobaciones {
  id: string;
  proyecto_id: string;
  rangos: RangoAprobacion[];
  notificar_whatsapp: boolean;
  bloquear_hasta_aprobacion: boolean;
  permitir_venta_provisional: boolean;
  created_at: string;
  updated_at: string;
}

export interface AprobacionHistorial {
  rol: string;
  usuario_id: string;
  usuario_nombre: string;
  fecha: string;
  decision: 'aprobado' | 'rechazado';
  comentario?: string;
}

export interface AprobacionDescuento {
  id: string;
  proyecto_id: string;
  control_pago_id: string | null;
  local_id: string;
  precio_lista: number;
  precio_negociado: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  vendedor_id: string;
  vendedor_nombre: string | null;
  vendedor_comentario: string | null;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado';
  aprobadores_requeridos: string[];
  aprobaciones: AprobacionHistorial[];
  fecha_solicitud: string;
  fecha_resolucion: string | null;
  resuelto_por: string | null;
  comentario_resolucion: string | null;
  // Joins
  local?: {
    codigo: string;
    metraje: number;
    proyecto_nombre?: string;
  };
  vendedor?: {
    nombre: string;
    email: string;
  };
}

export interface CrearSolicitudInput {
  proyecto_id: string;
  local_id: string;
  control_pago_id?: string;
  precio_lista: number;
  precio_negociado: number;
  vendedor_id: string;
  vendedor_nombre: string;
  vendedor_comentario?: string;
}

// ============================================================================
// CONFIGURACION
// ============================================================================

/**
 * Obtener configuracion de aprobaciones de un proyecto
 */
export async function getConfigAprobaciones(
  proyectoId: string
): Promise<{ success: boolean; data?: ConfigAprobaciones; error?: string }> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('config_aprobaciones_descuento')
    .select('*')
    .eq('proyecto_id', proyectoId)
    .single();

  if (error) {
    // Si no existe, retornar config default
    if (error.code === 'PGRST116') {
      return {
        success: true,
        data: {
          id: '',
          proyecto_id: proyectoId,
          rangos: [
            { min: 0, max: 5, aprobadores: [], descripcion: 'Sin aprobacion requerida' },
            { min: 5, max: 10, aprobadores: ['jefe_ventas'], descripcion: 'Requiere Jefe de Ventas' },
            { min: 10, max: 15, aprobadores: ['jefe_ventas', 'admin'], descripcion: 'Requiere Jefe Ventas + Gerencia' },
            { min: 15, max: 100, aprobadores: ['admin'], descripcion: 'Solo Gerencia' },
          ],
          notificar_whatsapp: true,
          bloquear_hasta_aprobacion: true,
          permitir_venta_provisional: false,
          created_at: '',
          updated_at: '',
        },
      };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Guardar configuracion de aprobaciones
 */
export async function saveConfigAprobaciones(
  proyectoId: string,
  config: {
    rangos: RangoAprobacion[];
    notificar_whatsapp: boolean;
    bloquear_hasta_aprobacion: boolean;
    permitir_venta_provisional: boolean;
  },
  usuarioId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseClient();

  // Upsert: insertar o actualizar
  const { error } = await supabase
    .from('config_aprobaciones_descuento')
    .upsert(
      {
        proyecto_id: proyectoId,
        rangos: config.rangos,
        notificar_whatsapp: config.notificar_whatsapp,
        bloquear_hasta_aprobacion: config.bloquear_hasta_aprobacion,
        permitir_venta_provisional: config.permitir_venta_provisional,
        updated_by: usuarioId,
      },
      { onConflict: 'proyecto_id' }
    );

  if (error) {
    console.error('Error saving config aprobaciones:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// SOLICITUDES DE APROBACION
// ============================================================================

/**
 * Calcular que aprobadores se requieren segun el descuento
 */
export async function calcularAprobadoresRequeridos(
  proyectoId: string,
  descuentoPorcentaje: number
): Promise<{ success: boolean; aprobadores?: string[]; descripcion?: string; error?: string }> {
  const configResult = await getConfigAprobaciones(proyectoId);

  if (!configResult.success || !configResult.data) {
    return { success: false, error: configResult.error || 'No se pudo obtener configuracion' };
  }

  const rangos = configResult.data.rangos;

  // Buscar el rango que aplica
  for (const rango of rangos) {
    if (descuentoPorcentaje >= rango.min && descuentoPorcentaje < rango.max) {
      return {
        success: true,
        aprobadores: rango.aprobadores,
        descripcion: rango.descripcion
      };
    }
  }

  // Si el descuento es mayor al max del ultimo rango, usar ese
  const ultimoRango = rangos[rangos.length - 1];
  if (descuentoPorcentaje >= ultimoRango.max) {
    return {
      success: true,
      aprobadores: ultimoRango.aprobadores,
      descripcion: ultimoRango.descripcion
    };
  }

  return { success: true, aprobadores: [], descripcion: 'Sin aprobacion requerida' };
}

/**
 * Crear solicitud de aprobacion de descuento
 */
export async function crearSolicitudAprobacion(
  input: CrearSolicitudInput
): Promise<{ success: boolean; data?: AprobacionDescuento; requiresApproval: boolean; error?: string }> {
  const supabase = await getSupabaseClient();

  // Calcular porcentaje de descuento
  const descuentoPorcentaje = ((input.precio_lista - input.precio_negociado) / input.precio_lista) * 100;

  // Obtener aprobadores requeridos
  const aprobadoresResult = await calcularAprobadoresRequeridos(input.proyecto_id, descuentoPorcentaje);

  if (!aprobadoresResult.success) {
    return { success: false, requiresApproval: false, error: aprobadoresResult.error };
  }

  const aprobadores = aprobadoresResult.aprobadores || [];

  // Si no requiere aprobacion, retornar directamente
  if (aprobadores.length === 0) {
    return {
      success: true,
      requiresApproval: false,
      data: undefined
    };
  }

  // Crear solicitud
  const { data, error } = await supabase
    .from('aprobaciones_descuento')
    .insert({
      proyecto_id: input.proyecto_id,
      local_id: input.local_id,
      control_pago_id: input.control_pago_id || null,
      precio_lista: input.precio_lista,
      precio_negociado: input.precio_negociado,
      descuento_porcentaje: descuentoPorcentaje,
      vendedor_id: input.vendedor_id,
      vendedor_nombre: input.vendedor_nombre,
      vendedor_comentario: input.vendedor_comentario || null,
      estado: 'pendiente',
      aprobadores_requeridos: aprobadores,
      aprobaciones: [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating solicitud aprobacion:', error);
    return { success: false, requiresApproval: true, error: error.message };
  }

  // Notificar por webhook (si esta habilitado)
  const configResult = await getConfigAprobaciones(input.proyecto_id);
  if (configResult.success && configResult.data?.notificar_whatsapp) {
    try {
      await notificarAprobacionPendiente(data as AprobacionDescuento);
    } catch (notifError) {
      console.error('Error notificando aprobacion:', notifError);
      // No falla la operacion principal
    }
  }

  return { success: true, requiresApproval: true, data: data as AprobacionDescuento };
}

/**
 * Obtener aprobaciones pendientes (para aprobadores)
 */
export async function getAprobacionesPendientes(
  proyectoId: string,
  usuarioRol: string
): Promise<{ success: boolean; data?: AprobacionDescuento[]; error?: string }> {
  const supabase = await getSupabaseClient();

  // Query base
  let query = supabase
    .from('aprobaciones_descuento')
    .select(`
      *,
      local:locales(codigo, metraje),
      vendedor:usuarios!vendedor_id(nombre, email)
    `)
    .eq('proyecto_id', proyectoId)
    .eq('estado', 'pendiente')
    .order('fecha_solicitud', { ascending: false });

  // Si no es admin, filtrar por aprobadores que incluyan su rol
  if (usuarioRol !== 'admin') {
    query = query.contains('aprobadores_requeridos', [usuarioRol]);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error getting aprobaciones pendientes:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as AprobacionDescuento[] };
}

/**
 * Obtener todas las aprobaciones de un proyecto (historial)
 */
export async function getAprobacionesHistorial(
  proyectoId: string,
  filtros?: {
    estado?: string;
    vendedor_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
  }
): Promise<{ success: boolean; data?: AprobacionDescuento[]; error?: string }> {
  const supabase = await getSupabaseClient();

  let query = supabase
    .from('aprobaciones_descuento')
    .select(`
      *,
      local:locales(codigo, metraje),
      vendedor:usuarios!vendedor_id(nombre, email)
    `)
    .eq('proyecto_id', proyectoId)
    .order('fecha_solicitud', { ascending: false });

  // Aplicar filtros
  if (filtros?.estado) {
    query = query.eq('estado', filtros.estado);
  }
  if (filtros?.vendedor_id) {
    query = query.eq('vendedor_id', filtros.vendedor_id);
  }
  if (filtros?.fecha_desde) {
    query = query.gte('fecha_solicitud', filtros.fecha_desde);
  }
  if (filtros?.fecha_hasta) {
    query = query.lte('fecha_solicitud', filtros.fecha_hasta);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error getting aprobaciones historial:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as AprobacionDescuento[] };
}

/**
 * Obtener solicitudes de un vendedor especifico
 */
export async function getAprobacionesByVendedor(
  vendedorId: string
): Promise<{ success: boolean; data?: AprobacionDescuento[]; error?: string }> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('aprobaciones_descuento')
    .select(`
      *,
      local:locales(codigo, metraje)
    `)
    .eq('vendedor_id', vendedorId)
    .order('fecha_solicitud', { ascending: false });

  if (error) {
    console.error('Error getting aprobaciones by vendedor:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data as AprobacionDescuento[] };
}

/**
 * Aprobar descuento
 */
export async function aprobarDescuento(
  aprobacionId: string,
  usuarioId: string,
  usuarioNombre: string,
  usuarioRol: string,
  comentario?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseClient();

  // Obtener la solicitud actual
  const { data: solicitud, error: fetchError } = await supabase
    .from('aprobaciones_descuento')
    .select('*')
    .eq('id', aprobacionId)
    .single();

  if (fetchError || !solicitud) {
    return { success: false, error: 'Solicitud no encontrada' };
  }

  if (solicitud.estado !== 'pendiente') {
    return { success: false, error: 'Esta solicitud ya fue procesada' };
  }

  // Agregar aprobacion al historial
  const nuevaAprobacion: AprobacionHistorial = {
    rol: usuarioRol,
    usuario_id: usuarioId,
    usuario_nombre: usuarioNombre,
    fecha: new Date().toISOString(),
    decision: 'aprobado',
    comentario: comentario || undefined,
  };

  const aprobacionesActuales = (solicitud.aprobaciones || []) as AprobacionHistorial[];
  const aprobacionesUpdated = [...aprobacionesActuales, nuevaAprobacion];

  // Verificar si todos los aprobadores requeridos han aprobado
  const aprobadoresRequeridos = solicitud.aprobadores_requeridos as string[];
  const rolesAprobados = aprobacionesUpdated
    .filter(a => a.decision === 'aprobado')
    .map(a => a.rol);

  const todosAprobaron = aprobadoresRequeridos.every(rol => rolesAprobados.includes(rol));

  // Actualizar solicitud
  const updateData: Record<string, unknown> = {
    aprobaciones: aprobacionesUpdated,
    updated_at: new Date().toISOString(),
  };

  if (todosAprobaron) {
    updateData.estado = 'aprobado';
    updateData.fecha_resolucion = new Date().toISOString();
    updateData.resuelto_por = usuarioId;
    updateData.comentario_resolucion = comentario || 'Aprobado';
  }

  const { error: updateError } = await supabase
    .from('aprobaciones_descuento')
    .update(updateData)
    .eq('id', aprobacionId);

  if (updateError) {
    console.error('Error aprobando descuento:', updateError);
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Rechazar descuento
 */
export async function rechazarDescuento(
  aprobacionId: string,
  usuarioId: string,
  usuarioNombre: string,
  usuarioRol: string,
  comentario: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseClient();

  // Obtener la solicitud actual
  const { data: solicitud, error: fetchError } = await supabase
    .from('aprobaciones_descuento')
    .select('*')
    .eq('id', aprobacionId)
    .single();

  if (fetchError || !solicitud) {
    return { success: false, error: 'Solicitud no encontrada' };
  }

  if (solicitud.estado !== 'pendiente') {
    return { success: false, error: 'Esta solicitud ya fue procesada' };
  }

  // Agregar rechazo al historial
  const nuevoRechazo: AprobacionHistorial = {
    rol: usuarioRol,
    usuario_id: usuarioId,
    usuario_nombre: usuarioNombre,
    fecha: new Date().toISOString(),
    decision: 'rechazado',
    comentario,
  };

  const aprobacionesActuales = (solicitud.aprobaciones || []) as AprobacionHistorial[];
  const aprobacionesUpdated = [...aprobacionesActuales, nuevoRechazo];

  // Actualizar a rechazado (un rechazo es definitivo)
  const { error: updateError } = await supabase
    .from('aprobaciones_descuento')
    .update({
      aprobaciones: aprobacionesUpdated,
      estado: 'rechazado',
      fecha_resolucion: new Date().toISOString(),
      resuelto_por: usuarioId,
      comentario_resolucion: comentario,
      updated_at: new Date().toISOString(),
    })
    .eq('id', aprobacionId);

  if (updateError) {
    console.error('Error rechazando descuento:', updateError);
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Cancelar solicitud (solo el vendedor que la creo)
 */
export async function cancelarSolicitud(
  aprobacionId: string,
  vendedorId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseClient();

  // Verificar que el vendedor sea el creador
  const { data: solicitud, error: fetchError } = await supabase
    .from('aprobaciones_descuento')
    .select('vendedor_id, estado')
    .eq('id', aprobacionId)
    .single();

  if (fetchError || !solicitud) {
    return { success: false, error: 'Solicitud no encontrada' };
  }

  if (solicitud.vendedor_id !== vendedorId) {
    return { success: false, error: 'No tienes permiso para cancelar esta solicitud' };
  }

  if (solicitud.estado !== 'pendiente') {
    return { success: false, error: 'Solo se pueden cancelar solicitudes pendientes' };
  }

  // Cancelar
  const { error: updateError } = await supabase
    .from('aprobaciones_descuento')
    .update({
      estado: 'cancelado',
      fecha_resolucion: new Date().toISOString(),
      comentario_resolucion: 'Cancelado por el vendedor',
      updated_at: new Date().toISOString(),
    })
    .eq('id', aprobacionId);

  if (updateError) {
    console.error('Error cancelando solicitud:', updateError);
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

// ============================================================================
// ESTADISTICAS
// ============================================================================

/**
 * Obtener estadisticas de aprobaciones
 */
export async function getEstadisticasAprobaciones(
  proyectoId: string
): Promise<{
  success: boolean;
  data?: {
    total: number;
    pendientes: number;
    aprobadas: number;
    rechazadas: number;
    canceladas: number;
    descuento_promedio: number;
    tiempo_resolucion_promedio_horas: number;
  };
  error?: string;
}> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('aprobaciones_descuento')
    .select('estado, descuento_porcentaje, fecha_solicitud, fecha_resolucion')
    .eq('proyecto_id', proyectoId);

  if (error) {
    console.error('Error getting estadisticas:', error);
    return { success: false, error: error.message };
  }

  // Definir tipo para los datos
  type AprobacionRow = {
    estado: string;
    descuento_porcentaje: number | null;
    fecha_solicitud: string;
    fecha_resolucion: string | null;
  };

  const rows = data as AprobacionRow[];
  const total = rows.length;
  const pendientes = rows.filter((d: AprobacionRow) => d.estado === 'pendiente').length;
  const aprobadas = rows.filter((d: AprobacionRow) => d.estado === 'aprobado').length;
  const rechazadas = rows.filter((d: AprobacionRow) => d.estado === 'rechazado').length;
  const canceladas = rows.filter((d: AprobacionRow) => d.estado === 'cancelado').length;

  // Calcular descuento promedio
  const descuentos = rows.map((d: AprobacionRow) => d.descuento_porcentaje).filter((d): d is number => d != null);
  const descuento_promedio = descuentos.length > 0
    ? descuentos.reduce((a: number, b: number) => a + b, 0) / descuentos.length
    : 0;

  // Calcular tiempo de resolucion promedio (solo para resueltas)
  const resueltas = rows.filter((d: AprobacionRow) => d.fecha_resolucion && d.fecha_solicitud);
  let tiempo_resolucion_promedio_horas = 0;
  if (resueltas.length > 0) {
    const tiempos = resueltas.map((d: AprobacionRow) => {
      const inicio = new Date(d.fecha_solicitud).getTime();
      const fin = new Date(d.fecha_resolucion!).getTime();
      return (fin - inicio) / (1000 * 60 * 60); // horas
    });
    tiempo_resolucion_promedio_horas = tiempos.reduce((a: number, b: number) => a + b, 0) / tiempos.length;
  }

  return {
    success: true,
    data: {
      total,
      pendientes,
      aprobadas,
      rechazadas,
      canceladas,
      descuento_promedio,
      tiempo_resolucion_promedio_horas,
    },
  };
}

// ============================================================================
// NOTIFICACIONES (Webhook n8n)
// ============================================================================

/**
 * Notificar aprobacion pendiente via webhook n8n
 */
async function notificarAprobacionPendiente(aprobacion: AprobacionDescuento): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_APROBACIONES;

  if (!webhookUrl) {
    console.log('N8N_WEBHOOK_APROBACIONES no configurado, omitiendo notificacion');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tipo: 'nueva_solicitud',
        aprobacion_id: aprobacion.id,
        proyecto_id: aprobacion.proyecto_id,
        local_id: aprobacion.local_id,
        vendedor_nombre: aprobacion.vendedor_nombre,
        precio_lista: aprobacion.precio_lista,
        precio_negociado: aprobacion.precio_negociado,
        descuento_porcentaje: aprobacion.descuento_porcentaje,
        aprobadores_requeridos: aprobacion.aprobadores_requeridos,
        fecha_solicitud: aprobacion.fecha_solicitud,
      }),
    });

    if (!response.ok) {
      console.error('Error en webhook notificacion:', response.statusText);
    }
  } catch (error) {
    console.error('Error enviando notificacion webhook:', error);
  }
}

/**
 * Notificar resolucion de aprobacion via webhook n8n
 */
export async function notificarResolucion(
  aprobacion: AprobacionDescuento,
  tipo: 'aprobado' | 'rechazado'
): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_APROBACIONES;

  if (!webhookUrl) {
    console.log('N8N_WEBHOOK_APROBACIONES no configurado, omitiendo notificacion');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tipo: `solicitud_${tipo}`,
        aprobacion_id: aprobacion.id,
        proyecto_id: aprobacion.proyecto_id,
        local_id: aprobacion.local_id,
        vendedor_id: aprobacion.vendedor_id,
        vendedor_nombre: aprobacion.vendedor_nombre,
        comentario_resolucion: aprobacion.comentario_resolucion,
        fecha_resolucion: aprobacion.fecha_resolucion,
      }),
    });

    if (!response.ok) {
      console.error('Error en webhook resolucion:', response.statusText);
    }
  } catch (error) {
    console.error('Error enviando notificacion resolucion:', error);
  }
}
