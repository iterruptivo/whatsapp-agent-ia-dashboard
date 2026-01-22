// ============================================================================
// SERVER ACTIONS: Expediente Digital
// ============================================================================
// Descripcion: Funciones para gestionar el timeline del expediente
// Fase: 6 - Expediente Digital
// ============================================================================

'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper para obtener cliente Supabase
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

// Tipos
export interface ExpedienteEvento {
  id: string;
  control_pago_id: string;
  tipo_evento: string;
  descripcion: string | null;
  documento_tipo: string | null;
  documento_url: string | null;
  documento_nombre: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
  usuario_nombre?: string;
}

export interface ChecklistDocumentos {
  dni_titular: boolean;
  dni_conyuge: boolean;
  voucher_separacion: boolean;
  constancia_separacion: boolean;
  voucher_inicial: boolean;
  contrato: boolean;
  constancia_cancelacion: boolean;
  [key: string]: boolean;
}

export interface ExpedienteResumen {
  control_pago_id: string;
  expediente_completo: boolean;
  checklist: ChecklistDocumentos;
  total_eventos: number;
  total_documentos: number;
  eventos: ExpedienteEvento[];
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Obtiene el timeline completo del expediente
 */
export async function getExpedienteTimeline(controlPagoId: string): Promise<{
  success: boolean;
  data?: ExpedienteResumen;
  error?: string;
}> {
  try {
    const supabase = await getSupabaseClient();

    // 1. Obtener eventos del expediente
    const { data: eventos, error: eventosError } = await supabase
      .from('expediente_eventos')
      .select(`
        id,
        control_pago_id,
        tipo_evento,
        descripcion,
        documento_tipo,
        documento_url,
        documento_nombre,
        metadata,
        created_at,
        created_by
      `)
      .eq('control_pago_id', controlPagoId)
      .order('created_at', { ascending: true });

    if (eventosError) {
      console.error('Error obteniendo eventos:', eventosError);
      return { success: false, error: eventosError.message };
    }

    // 2. Obtener estado del checklist de control_pagos
    const { data: controlPago, error: cpError } = await supabase
      .from('control_pagos')
      .select('expediente_completo, checklist_documentos')
      .eq('id', controlPagoId)
      .single();

    if (cpError) {
      console.error('Error obteniendo control_pago:', cpError);
      return { success: false, error: cpError.message };
    }

    // 3. Enriquecer eventos con nombres de usuario
    const eventosEnriquecidos: ExpedienteEvento[] = [];
    const usuarioIds = [...new Set((eventos || []).map(e => e.created_by).filter(Boolean))];

    let usuariosMap: Record<string, string> = {};
    if (usuarioIds.length > 0) {
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .in('id', usuarioIds);

      if (usuarios) {
        usuariosMap = usuarios.reduce((acc, u) => {
          acc[u.id] = u.nombre;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    for (const evento of eventos || []) {
      eventosEnriquecidos.push({
        ...evento,
        usuario_nombre: evento.created_by ? usuariosMap[evento.created_by] || 'Usuario' : undefined
      });
    }

    // 4. Calcular resumen
    const checklist: ChecklistDocumentos = controlPago?.checklist_documentos || {
      dni_titular: false,
      dni_conyuge: false,
      voucher_separacion: false,
      constancia_separacion: false,
      voucher_inicial: false,
      contrato: false,
      constancia_cancelacion: false,
    };

    const totalDocumentos = eventosEnriquecidos.filter(e => e.documento_url).length;

    return {
      success: true,
      data: {
        control_pago_id: controlPagoId,
        expediente_completo: controlPago?.expediente_completo || false,
        checklist,
        total_eventos: eventosEnriquecidos.length,
        total_documentos: totalDocumentos,
        eventos: eventosEnriquecidos,
      }
    };
  } catch (error) {
    console.error('Error en getExpedienteTimeline:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Registra un nuevo evento en el expediente
 */
export async function registrarEventoExpediente(input: {
  controlPagoId: string;
  tipoEvento: string;
  descripcion?: string;
  documentoTipo?: string;
  documentoUrl?: string;
  documentoNombre?: string;
  metadata?: Record<string, unknown>;
  usuarioId?: string;
}): Promise<{
  success: boolean;
  data?: { id: string };
  error?: string;
}> {
  try {
    const supabase = await getSupabaseClient();

    const { data, error } = await supabase
      .from('expediente_eventos')
      .insert({
        control_pago_id: input.controlPagoId,
        tipo_evento: input.tipoEvento,
        descripcion: input.descripcion || null,
        documento_tipo: input.documentoTipo || null,
        documento_url: input.documentoUrl || null,
        documento_nombre: input.documentoNombre || null,
        metadata: input.metadata || {},
        created_by: input.usuarioId || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error registrando evento:', error);
      return { success: false, error: error.message };
    }

    // Actualizar checklist si es documento
    if (input.documentoTipo) {
      await actualizarChecklist(input.controlPagoId, input.documentoTipo, true);
    }

    return { success: true, data: { id: data.id } };
  } catch (error) {
    console.error('Error en registrarEventoExpediente:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Actualiza el checklist de documentos
 */
export async function actualizarChecklist(
  controlPagoId: string,
  documentoTipo: string,
  presente: boolean
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await getSupabaseClient();

    // Obtener checklist actual
    const { data: controlPago, error: getError } = await supabase
      .from('control_pagos')
      .select('checklist_documentos')
      .eq('id', controlPagoId)
      .single();

    if (getError) {
      return { success: false, error: getError.message };
    }

    // Actualizar checklist
    const checklist = controlPago?.checklist_documentos || {};
    checklist[documentoTipo] = presente;

    // Verificar si expediente esta completo (minimo: dni_titular + voucher_separacion)
    const expedienteCompleto =
      checklist.dni_titular === true &&
      checklist.voucher_separacion === true;

    // Guardar
    const { error: updateError } = await supabase
      .from('control_pagos')
      .update({
        checklist_documentos: checklist,
        expediente_completo: expedienteCompleto,
      })
      .eq('id', controlPagoId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error en actualizarChecklist:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Obtiene todos los documentos del expediente para descarga
 */
export async function getDocumentosExpediente(controlPagoId: string): Promise<{
  success: boolean;
  data?: {
    documentos: Array<{
      tipo: string;
      nombre: string;
      url: string;
      fecha: string;
    }>;
  };
  error?: string;
}> {
  try {
    const supabase = await getSupabaseClient();

    // Obtener eventos con documentos
    const { data: eventos, error } = await supabase
      .from('expediente_eventos')
      .select('documento_tipo, documento_nombre, documento_url, created_at')
      .eq('control_pago_id', controlPagoId)
      .not('documento_url', 'is', null)
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    const documentos = (eventos || []).map(e => ({
      tipo: e.documento_tipo || 'documento',
      nombre: e.documento_nombre || 'documento',
      url: e.documento_url!,
      fecha: e.created_at,
    }));

    return { success: true, data: { documentos } };
  } catch (error) {
    console.error('Error en getDocumentosExpediente:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Obtiene datos completos del expediente para generar el PDF
 */
export async function getExpedienteParaPDF(controlPagoId: string): Promise<{
  success: boolean;
  data?: {
    local: {
      codigo: string;
      nivel: string;
      area: number;
      precio: number;
    };
    cliente: {
      nombre: string;
      dni: string;
      telefono: string;
      email: string;
    };
    proyecto: {
      nombre: string;
    };
    pagos: Array<{
      tipo: string;
      monto: number;
      fecha: string;
      validado: boolean;
    }>;
    documentos: Array<{
      tipo: string;
      nombre: string;
      url: string;
      fecha: string;
    }>;
    eventos: ExpedienteEvento[];
  };
  error?: string;
}> {
  try {
    const supabase = await getSupabaseClient();

    // 1. Obtener control_pago con relaciones
    const { data: controlPago, error: cpError } = await supabase
      .from('control_pagos')
      .select(`
        id,
        monto_venta,
        locales (
          id,
          codigo,
          nivel,
          area_m2,
          precio_base,
          proyectos (
            id,
            nombre
          )
        ),
        leads (
          id,
          nombre,
          dni,
          telefono,
          email
        )
      `)
      .eq('id', controlPagoId)
      .single();

    if (cpError) {
      return { success: false, error: cpError.message };
    }

    // 2. Obtener pagos
    const { data: abonos, error: abonosError } = await supabase
      .from('abonos_pago')
      .select('id, tipo_pago, monto, fecha_pago, validado')
      .eq('control_pago_id', controlPagoId)
      .order('fecha_pago', { ascending: true });

    if (abonosError) {
      return { success: false, error: abonosError.message };
    }

    // 3. Obtener documentos
    const docsResult = await getDocumentosExpediente(controlPagoId);
    if (!docsResult.success) {
      return { success: false, error: docsResult.error };
    }

    // 4. Obtener timeline
    const timelineResult = await getExpedienteTimeline(controlPagoId);
    if (!timelineResult.success) {
      return { success: false, error: timelineResult.error };
    }

    // Construir respuesta - manejar tipos de Supabase
    type LocalData = { codigo: string; nivel: string; area_m2: number; precio_base: number; proyectos: { nombre: string } | { nombre: string }[] | null };
    type LeadData = { nombre: string; dni: string; telefono: string; email: string };

    const localRaw = controlPago.locales as LocalData | LocalData[] | null;
    const local = Array.isArray(localRaw) ? localRaw[0] : localRaw;

    const leadRaw = controlPago.leads as LeadData | LeadData[] | null;
    const lead = Array.isArray(leadRaw) ? leadRaw[0] : leadRaw;

    const proyectoNombre = local?.proyectos
      ? Array.isArray(local.proyectos)
        ? local.proyectos[0]?.nombre
        : local.proyectos.nombre
      : '';

    return {
      success: true,
      data: {
        local: {
          codigo: local?.codigo || '',
          nivel: local?.nivel || '',
          area: local?.area_m2 || 0,
          precio: controlPago.monto_venta || local?.precio_base || 0,
        },
        cliente: {
          nombre: lead?.nombre || '',
          dni: lead?.dni || '',
          telefono: lead?.telefono || '',
          email: lead?.email || '',
        },
        proyecto: {
          nombre: proyectoNombre || '',
        },
        pagos: (abonos || []).map(a => ({
          tipo: a.tipo_pago,
          monto: a.monto,
          fecha: a.fecha_pago,
          validado: a.validado,
        })),
        documentos: docsResult.data?.documentos || [],
        eventos: timelineResult.data?.eventos || [],
      }
    };
  } catch (error) {
    console.error('Error en getExpedienteParaPDF:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Registra eventos iniciales al crear ficha de inscripcion
 */
export async function registrarEventosFichaCreada(input: {
  controlPagoId: string;
  usuarioId: string;
  dniTitularUrl?: string;
  dniConyugeUrl?: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Evento de ficha creada
    await registrarEventoExpediente({
      controlPagoId: input.controlPagoId,
      tipoEvento: 'ficha_creada',
      descripcion: 'Ficha de inscripcion creada',
      usuarioId: input.usuarioId,
    });

    // Documento DNI titular
    if (input.dniTitularUrl) {
      await registrarEventoExpediente({
        controlPagoId: input.controlPagoId,
        tipoEvento: 'documento_subido',
        descripcion: 'DNI del titular adjuntado',
        documentoTipo: 'dni_titular',
        documentoUrl: input.dniTitularUrl,
        documentoNombre: 'DNI Titular',
        usuarioId: input.usuarioId,
      });
    }

    // Documento DNI conyuge
    if (input.dniConyugeUrl) {
      await registrarEventoExpediente({
        controlPagoId: input.controlPagoId,
        tipoEvento: 'documento_subido',
        descripcion: 'DNI del conyuge adjuntado',
        documentoTipo: 'dni_conyuge',
        documentoUrl: input.dniConyugeUrl,
        documentoNombre: 'DNI Conyuge',
        usuarioId: input.usuarioId,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error en registrarEventosFichaCreada:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Registra evento de pago
 */
export async function registrarEventoPago(input: {
  controlPagoId: string;
  tipoPago: string;
  monto: number;
  voucherUrl?: string;
  validado: boolean;
  usuarioId: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const tipoEvento = input.validado ? 'pago_validado' : 'pago_registrado';
    const descripcion = input.validado
      ? `Pago de ${input.tipoPago} validado: S/ ${input.monto.toFixed(2)}`
      : `Pago de ${input.tipoPago} registrado: S/ ${input.monto.toFixed(2)}`;

    await registrarEventoExpediente({
      controlPagoId: input.controlPagoId,
      tipoEvento,
      descripcion,
      documentoTipo: input.tipoPago === 'separacion' ? 'voucher_separacion' : 'voucher',
      documentoUrl: input.voucherUrl,
      documentoNombre: `Voucher ${input.tipoPago}`,
      metadata: {
        tipo_pago: input.tipoPago,
        monto: input.monto,
        validado: input.validado,
      },
      usuarioId: input.usuarioId,
    });

    return { success: true };
  } catch (error) {
    console.error('Error en registrarEventoPago:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Registra evento de constancia generada
 */
export async function registrarEventoConstancia(input: {
  controlPagoId: string;
  tipoConstancia: string;
  constanciaUrl: string;
  usuarioId: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await registrarEventoExpediente({
      controlPagoId: input.controlPagoId,
      tipoEvento: 'constancia_generada',
      descripcion: `Constancia de ${input.tipoConstancia} generada`,
      documentoTipo: `constancia_${input.tipoConstancia}`,
      documentoUrl: input.constanciaUrl,
      documentoNombre: `Constancia ${input.tipoConstancia}`,
      usuarioId: input.usuarioId,
    });

    return { success: true };
  } catch (error) {
    console.error('Error en registrarEventoConstancia:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

/**
 * Registra evento de contrato generado
 */
export async function registrarEventoContrato(input: {
  controlPagoId: string;
  contratoUrl: string;
  templateUsado: string;
  usuarioId: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await registrarEventoExpediente({
      controlPagoId: input.controlPagoId,
      tipoEvento: 'contrato_generado',
      descripcion: 'Contrato generado',
      documentoTipo: 'contrato',
      documentoUrl: input.contratoUrl,
      documentoNombre: 'Contrato de compraventa',
      metadata: {
        template_usado: input.templateUsado,
      },
      usuarioId: input.usuarioId,
    });

    // Actualizar checklist
    await actualizarChecklist(input.controlPagoId, 'contrato', true);

    return { success: true };
  } catch (error) {
    console.error('Error en registrarEventoContrato:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}
