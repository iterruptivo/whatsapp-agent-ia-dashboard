// ============================================================================
// SERVER ACTIONS: Repulse
// ============================================================================
// Descripción: Server actions para gestión del sistema Repulse
// Tablas: repulse_leads, repulse_templates, repulse_historial, leads
// ============================================================================

'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ============================================================================
// INTERFACES
// ============================================================================

export interface RepulseTemplate {
  id: string;
  proyecto_id: string;
  nombre: string;
  mensaje: string;
  activo: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface RepulseLead {
  id: string;
  lead_id: string;
  proyecto_id: string;
  origen: 'cron_automatico' | 'manual';
  fecha_agregado: string;
  agregado_por: string | null;
  estado: 'pendiente' | 'enviado' | 'respondio' | 'sin_respuesta' | 'excluido';
  conteo_repulses: number;
  ultimo_repulse_at: string | null;
  template_usado_id: string | null;
  mensaje_personalizado: string | null;
  created_at: string;
  updated_at: string;
  // Datos del lead (JOIN)
  lead?: {
    id: string;
    nombre: string | null;
    telefono: string;
    email: string | null;
    rubro: string | null;
    estado: string | null;
    utm: string | null;
    created_at: string;
    vendedor_asignado_id: string | null;
  };
  // Datos del usuario que agregó (JOIN)
  agregado_por_usuario?: {
    nombre: string;
  };
}

export interface RepulseHistorial {
  id: string;
  repulse_lead_id: string;
  lead_id: string;
  proyecto_id: string;
  template_id: string | null;
  mensaje_enviado: string;
  enviado_at: string;
  enviado_por: string | null;
  respuesta_recibida: boolean;
  respuesta_at: string | null;
  notas: string | null;
}

// ============================================================================
// HELPER: Crear cliente Supabase
// ============================================================================

async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignorar errores en Server Components
          }
        },
      },
    }
  );
}

// ============================================================================
// TEMPLATES
// ============================================================================

/**
 * Obtener todos los templates de un proyecto
 */
export async function getRepulseTemplates(proyectoId: string): Promise<RepulseTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('repulse_templates')
    .select('*')
    .eq('proyecto_id', proyectoId)
    .eq('activo', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching repulse templates:', error);
    return [];
  }

  return data || [];
}

/**
 * Crear un nuevo template
 */
export async function createRepulseTemplate(
  proyectoId: string,
  nombre: string,
  mensaje: string,
  createdBy: string
): Promise<{ success: boolean; data?: RepulseTemplate; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('repulse_templates')
    .insert({
      proyecto_id: proyectoId,
      nombre,
      mensaje,
      created_by: createdBy,
      activo: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating repulse template:', error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Actualizar un template
 */
export async function updateRepulseTemplate(
  templateId: string,
  nombre: string,
  mensaje: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('repulse_templates')
    .update({
      nombre,
      mensaje,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId);

  if (error) {
    console.error('Error updating repulse template:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Desactivar un template (soft delete)
 */
export async function deleteRepulseTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('repulse_templates')
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq('id', templateId);

  if (error) {
    console.error('Error deleting repulse template:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// REPULSE LEADS
// ============================================================================

/**
 * Obtener todos los leads en repulse para un proyecto
 */
export async function getRepulseLeads(proyectoId: string): Promise<RepulseLead[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('repulse_leads')
    .select(`
      *,
      lead:lead_id (
        id,
        nombre,
        telefono,
        email,
        rubro,
        estado,
        utm,
        created_at,
        vendedor_asignado_id
      ),
      agregado_por_usuario:agregado_por (
        nombre
      )
    `)
    .eq('proyecto_id', proyectoId)
    .order('fecha_agregado', { ascending: false });

  if (error) {
    console.error('Error fetching repulse leads:', error);
    return [];
  }

  return data || [];
}

/**
 * Obtener leads pendientes para envío
 */
export async function getRepulseLeadsPendientes(proyectoId: string): Promise<RepulseLead[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('repulse_leads')
    .select(`
      *,
      lead:lead_id (
        id,
        nombre,
        telefono,
        email,
        rubro,
        estado,
        utm,
        created_at,
        vendedor_asignado_id
      )
    `)
    .eq('proyecto_id', proyectoId)
    .eq('estado', 'pendiente')
    .order('fecha_agregado', { ascending: true });

  if (error) {
    console.error('Error fetching pending repulse leads:', error);
    return [];
  }

  return data || [];
}

/**
 * Agregar lead manualmente a repulse
 */
export async function addLeadToRepulse(
  leadId: string,
  proyectoId: string,
  agregadoPor: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Verificar que el lead no esté excluido
  const { data: lead } = await supabase
    .from('leads')
    .select('excluido_repulse')
    .eq('id', leadId)
    .single();

  if (lead?.excluido_repulse) {
    return { success: false, error: 'Este lead está excluido de repulse' };
  }

  // Verificar que no tenga compra
  const { data: compra } = await supabase
    .from('locales_leads')
    .select('id')
    .eq('lead_id', leadId)
    .limit(1)
    .single();

  if (compra) {
    return { success: false, error: 'Este lead ya tiene una compra registrada' };
  }

  const { error } = await supabase
    .from('repulse_leads')
    .insert({
      lead_id: leadId,
      proyecto_id: proyectoId,
      origen: 'manual',
      agregado_por: agregadoPor,
      estado: 'pendiente',
    });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Este lead ya está en la lista de repulse' };
    }
    console.error('Error adding lead to repulse:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Agregar múltiples leads a repulse
 */
export async function addMultipleLeadsToRepulse(
  leadIds: string[],
  proyectoId: string,
  agregadoPor: string
): Promise<{ success: boolean; added: number; skipped: number; errors: string[] }> {
  const supabase = await createClient();
  let added = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const leadId of leadIds) {
    const result = await addLeadToRepulse(leadId, proyectoId, agregadoPor);
    if (result.success) {
      added++;
    } else {
      skipped++;
      if (result.error) {
        errors.push(`Lead ${leadId}: ${result.error}`);
      }
    }
  }

  return { success: added > 0, added, skipped, errors };
}

/**
 * Eliminar lead de repulse
 */
export async function removeLeadFromRepulse(
  repulseLeadId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('repulse_leads')
    .delete()
    .eq('id', repulseLeadId);

  if (error) {
    console.error('Error removing lead from repulse:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Actualizar estado de repulse lead
 */
export async function updateRepulseLeadEstado(
  repulseLeadId: string,
  estado: RepulseLead['estado']
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('repulse_leads')
    .update({
      estado,
      updated_at: new Date().toISOString(),
    })
    .eq('id', repulseLeadId);

  if (error) {
    console.error('Error updating repulse lead estado:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Excluir lead de futuros repulses
 */
export async function excluirLeadDeRepulse(
  leadId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Marcar en la tabla leads
  const { error: errorLead } = await supabase
    .from('leads')
    .update({ excluido_repulse: true })
    .eq('id', leadId);

  if (errorLead) {
    console.error('Error excluding lead from repulse:', errorLead);
    return { success: false, error: errorLead.message };
  }

  // Actualizar estado en repulse_leads si existe
  const { error: errorRepulse } = await supabase
    .from('repulse_leads')
    .update({ estado: 'excluido', updated_at: new Date().toISOString() })
    .eq('lead_id', leadId);

  if (errorRepulse) {
    console.error('Error updating repulse_leads estado:', errorRepulse);
    // No fallamos, ya se marcó el lead
  }

  return { success: true };
}

/**
 * Reincluir lead a repulse (quitar exclusión)
 */
export async function reincluirLeadEnRepulse(
  leadId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('leads')
    .update({ excluido_repulse: false })
    .eq('id', leadId);

  if (error) {
    console.error('Error re-including lead in repulse:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================================
// ENVÍO DE REPULSE
// ============================================================================

/**
 * Registrar envío de repulse y actualizar estado
 */
export async function registrarEnvioRepulse(
  repulseLeadId: string,
  leadId: string,
  proyectoId: string,
  mensaje: string,
  templateId: string | null,
  enviadoPor: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Registrar en historial
  const { error: errorHistorial } = await supabase
    .from('repulse_historial')
    .insert({
      repulse_lead_id: repulseLeadId,
      lead_id: leadId,
      proyecto_id: proyectoId,
      template_id: templateId,
      mensaje_enviado: mensaje,
      enviado_por: enviadoPor,
    });

  if (errorHistorial) {
    console.error('Error registering repulse historial:', errorHistorial);
    return { success: false, error: errorHistorial.message };
  }

  // 2. Actualizar repulse_lead
  const { error: errorUpdate } = await supabase
    .from('repulse_leads')
    .update({
      estado: 'enviado',
      conteo_repulses: supabase.rpc('increment_conteo'),
      ultimo_repulse_at: new Date().toISOString(),
      template_usado_id: templateId,
      mensaje_personalizado: templateId ? null : mensaje,
      updated_at: new Date().toISOString(),
    })
    .eq('id', repulseLeadId);

  // Si el RPC no funciona, hacerlo manualmente
  if (errorUpdate) {
    const { data: current } = await supabase
      .from('repulse_leads')
      .select('conteo_repulses')
      .eq('id', repulseLeadId)
      .single();

    await supabase
      .from('repulse_leads')
      .update({
        estado: 'enviado',
        conteo_repulses: (current?.conteo_repulses || 0) + 1,
        ultimo_repulse_at: new Date().toISOString(),
        template_usado_id: templateId,
        mensaje_personalizado: templateId ? null : mensaje,
        updated_at: new Date().toISOString(),
      })
      .eq('id', repulseLeadId);
  }

  return { success: true };
}

/**
 * Enviar repulse a múltiples leads (batch)
 * Retorna los datos para enviar a n8n
 */
export async function prepararEnvioRepulseBatch(
  repulseLeadIds: string[],
  mensaje: string,
  templateId: string | null,
  enviadoPor: string
): Promise<{
  success: boolean;
  leadsParaN8n: Array<{
    repulse_lead_id: string;
    lead_id: string;
    telefono: string;
    nombre: string | null;
    mensaje: string;
  }>;
  error?: string;
}> {
  const supabase = await createClient();

  // Obtener datos de los leads
  const { data: repulseLeads, error } = await supabase
    .from('repulse_leads')
    .select(`
      id,
      lead_id,
      proyecto_id,
      lead:lead_id (
        nombre,
        telefono
      )
    `)
    .in('id', repulseLeadIds);

  if (error || !repulseLeads) {
    console.error('Error fetching repulse leads for batch:', error);
    return { success: false, leadsParaN8n: [], error: error?.message };
  }

  const leadsParaN8n = [];

  for (const rl of repulseLeads) {
    // Supabase puede retornar array o objeto dependiendo de la relación
    const leadData = rl.lead as unknown;
    const lead = Array.isArray(leadData) ? leadData[0] : leadData;
    if (!lead || typeof lead !== 'object') continue;
    const leadTyped = lead as { nombre: string | null; telefono: string };

    // Personalizar mensaje con variables
    const mensajePersonalizado = mensaje
      .replace(/\{\{nombre\}\}/g, leadTyped.nombre || 'Cliente')
      .replace(/\{\{telefono\}\}/g, leadTyped.telefono);

    // Registrar el envío
    await registrarEnvioRepulse(
      rl.id,
      rl.lead_id,
      rl.proyecto_id,
      mensajePersonalizado,
      templateId,
      enviadoPor
    );

    leadsParaN8n.push({
      repulse_lead_id: rl.id,
      lead_id: rl.lead_id,
      telefono: leadTyped.telefono,
      nombre: leadTyped.nombre,
      mensaje: mensajePersonalizado,
    });
  }

  return { success: true, leadsParaN8n };
}

// ============================================================================
// HISTORIAL
// ============================================================================

/**
 * Obtener historial de envíos de un lead
 */
export async function getRepulseHistorialByLead(leadId: string): Promise<RepulseHistorial[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('repulse_historial')
    .select('*')
    .eq('lead_id', leadId)
    .order('enviado_at', { ascending: false });

  if (error) {
    console.error('Error fetching repulse historial:', error);
    return [];
  }

  return data || [];
}

/**
 * Marcar respuesta recibida
 */
export async function marcarRespuestaRepulse(
  historialId: string,
  notas?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: historial, error: errorFetch } = await supabase
    .from('repulse_historial')
    .select('repulse_lead_id')
    .eq('id', historialId)
    .single();

  if (errorFetch) {
    return { success: false, error: errorFetch.message };
  }

  // Actualizar historial
  const { error: errorHistorial } = await supabase
    .from('repulse_historial')
    .update({
      respuesta_recibida: true,
      respuesta_at: new Date().toISOString(),
      notas,
    })
    .eq('id', historialId);

  if (errorHistorial) {
    return { success: false, error: errorHistorial.message };
  }

  // Actualizar estado del repulse_lead
  if (historial?.repulse_lead_id) {
    await supabase
      .from('repulse_leads')
      .update({
        estado: 'respondio',
        updated_at: new Date().toISOString(),
      })
      .eq('id', historial.repulse_lead_id);
  }

  return { success: true };
}

// ============================================================================
// ESTADÍSTICAS
// ============================================================================

/**
 * Obtener estadísticas de repulse por proyecto
 */
export async function getRepulseStats(proyectoId: string): Promise<{
  total: number;
  pendientes: number;
  enviados: number;
  respondieron: number;
  sinRespuesta: number;
  excluidos: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('repulse_leads')
    .select('estado')
    .eq('proyecto_id', proyectoId);

  if (error || !data) {
    return {
      total: 0,
      pendientes: 0,
      enviados: 0,
      respondieron: 0,
      sinRespuesta: 0,
      excluidos: 0,
    };
  }

  return {
    total: data.length,
    pendientes: data.filter((d) => d.estado === 'pendiente').length,
    enviados: data.filter((d) => d.estado === 'enviado').length,
    respondieron: data.filter((d) => d.estado === 'respondio').length,
    sinRespuesta: data.filter((d) => d.estado === 'sin_respuesta').length,
    excluidos: data.filter((d) => d.estado === 'excluido').length,
  };
}

// ============================================================================
// DETECCIÓN AUTOMÁTICA (para llamar desde cron/n8n)
// ============================================================================

/**
 * Ejecutar detección de leads para repulse
 * Esta función llama al stored procedure de PostgreSQL
 */
export async function ejecutarDeteccionRepulse(
  proyectoId: string
): Promise<{ success: boolean; leadsAgregados: number; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('detectar_leads_repulse', {
    p_proyecto_id: proyectoId,
  });

  if (error) {
    console.error('Error executing detectar_leads_repulse:', error);
    return { success: false, leadsAgregados: 0, error: error.message };
  }

  return { success: true, leadsAgregados: data || 0 };
}

// ============================================================================
// ENVÍO VIA WEBHOOK N8N
// ============================================================================

/**
 * Enviar mensajes de repulse via webhook n8n
 * El webhook debe estar configurado en n8n para:
 * 1. Recibir array de leads con mensaje
 * 2. Enviar WhatsApp via Graph API
 * 3. Retornar confirmación
 */
export async function enviarRepulseViaWebhook(
  leadsParaN8n: Array<{
    repulse_lead_id: string;
    lead_id: string;
    telefono: string;
    nombre: string | null;
    mensaje: string;
  }>
): Promise<{
  success: boolean;
  enviados: number;
  errores: number;
  detalles: Array<{ telefono: string; status: 'ok' | 'error'; error?: string }>;
}> {
  // URL del webhook de n8n - debe configurarse en variables de entorno
  const webhookUrl = process.env.N8N_REPULSE_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('N8N_REPULSE_WEBHOOK_URL no está configurado');
    return {
      success: false,
      enviados: 0,
      errores: leadsParaN8n.length,
      detalles: leadsParaN8n.map((l) => ({
        telefono: l.telefono,
        status: 'error' as const,
        error: 'Webhook no configurado',
      })),
    };
  }

  try {
    // Llamar al webhook de n8n con todos los leads
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leads: leadsParaN8n,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error en webhook n8n:', errorText);
      return {
        success: false,
        enviados: 0,
        errores: leadsParaN8n.length,
        detalles: leadsParaN8n.map((l) => ({
          telefono: l.telefono,
          status: 'error' as const,
          error: `HTTP ${response.status}`,
        })),
      };
    }

    // n8n debería retornar el resultado del envío
    const result = await response.json();

    // Si n8n retorna detalles por lead
    if (result.detalles && Array.isArray(result.detalles)) {
      const enviados = result.detalles.filter((d: { status: string }) => d.status === 'ok').length;
      const errores = result.detalles.filter((d: { status: string }) => d.status === 'error').length;
      return {
        success: enviados > 0,
        enviados,
        errores,
        detalles: result.detalles,
      };
    }

    // Si n8n solo retorna success general
    return {
      success: true,
      enviados: leadsParaN8n.length,
      errores: 0,
      detalles: leadsParaN8n.map((l) => ({
        telefono: l.telefono,
        status: 'ok' as const,
      })),
    };
  } catch (error) {
    console.error('Error llamando webhook n8n:', error);
    return {
      success: false,
      enviados: 0,
      errores: leadsParaN8n.length,
      detalles: leadsParaN8n.map((l) => ({
        telefono: l.telefono,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Error desconocido',
      })),
    };
  }
}

// ============================================================================
// LEADS CANDIDATOS (para agregar manualmente desde /operativo)
// ============================================================================

/**
 * Obtener leads que son candidatos a repulse (para mostrar en /operativo)
 * Leads que:
 * - No están excluidos
 * - No tienen compra
 * - No están ya en repulse_leads
 * - Tienen más de 30 días
 */
export async function getLeadsCandidatosRepulse(
  proyectoId: string
): Promise<Array<{ id: string; nombre: string | null; telefono: string; created_at: string }>> {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('leads')
    .select('id, nombre, telefono, created_at')
    .eq('proyecto_id', proyectoId)
    .eq('excluido_repulse', false)
    .lte('created_at', thirtyDaysAgo.toISOString())
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching candidatos repulse:', error);
    return [];
  }

  // Filtrar los que ya tienen compra o están en repulse
  const { data: localesLeads } = await supabase
    .from('locales_leads')
    .select('lead_id')
    .not('lead_id', 'is', null);

  const { data: repulseLeads } = await supabase
    .from('repulse_leads')
    .select('lead_id')
    .eq('proyecto_id', proyectoId);

  const leadIdsConCompra = new Set((localesLeads || []).map((ll) => ll.lead_id));
  const leadIdsEnRepulse = new Set((repulseLeads || []).map((rl) => rl.lead_id));

  return data.filter(
    (lead) => !leadIdsConCompra.has(lead.id) && !leadIdsEnRepulse.has(lead.id)
  );
}
