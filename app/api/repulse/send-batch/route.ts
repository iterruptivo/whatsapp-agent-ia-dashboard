// ============================================================================
// API ROUTE: /api/repulse/send-batch
// ============================================================================
// Descripción: Procesa envío masivo de repulses en background
// El endpoint responde inmediatamente y procesa en segundo plano
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente de Supabase con service role para operaciones de background
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const N8N_WEBHOOK_URL = process.env.N8N_REPULSE_WEBHOOK_URL;

interface LeadParaEnvio {
  historial_id: string;
  repulse_lead_id: string;
  lead_id: string;
  proyecto_id: string;
  telefono: string;
  nombre: string | null;
  mensaje: string;
  fecha_visita?: string;  // Para template de Meta
}

interface BatchRequest {
  leads: LeadParaEnvio[];
  batchId: string;
}

// Respuesta esperada de n8n (después de enviar a Meta)
interface N8nResponse {
  success: boolean;
  whatsapp_message_id: string | null;
  status: 'accepted' | 'error';
  error: string | null;
  contacts: Array<{ input: string; wa_id: string }> | null;
}

// Sleep helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Inyectar mensaje de Repulse en el historial de conversación del lead
 * Solo se llama cuando Meta confirma que el mensaje fue aceptado
 */
async function inyectarMensajeEnHistorial(leadId: string, mensaje: string): Promise<void> {
  try {
    // 1. Obtener el historial actual del lead
    const { data: lead, error: errorFetch } = await supabase
      .from('leads')
      .select('historial_reciente, historial_conversacion')
      .eq('id', leadId)
      .single();

    if (errorFetch || !lead) {
      console.error('[Repulse] Error fetching lead for historial injection:', errorFetch);
      return;
    }

    // 2. Crear el mensaje en formato texto plano
    const timestamp = new Date().toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const mensajeTextoRepulse = `\n\n--- REPULSE [${timestamp}] ---\n[Mensaje enviado por sistema]\n${mensaje}\n---`;

    // 3. APPEND al historial_reciente
    let nuevoHistorialReciente = lead.historial_reciente || '';
    try {
      const parsed = JSON.parse(nuevoHistorialReciente);
      if (Array.isArray(parsed)) {
        parsed.push({
          sender: 'Repulse',
          text: mensaje,
          tipo: 'repulse',
          timestamp: new Date().toISOString(),
        });
        nuevoHistorialReciente = JSON.stringify(parsed);
      } else {
        nuevoHistorialReciente = nuevoHistorialReciente + mensajeTextoRepulse;
      }
    } catch {
      nuevoHistorialReciente = nuevoHistorialReciente + mensajeTextoRepulse;
    }

    // 4. APPEND al historial_conversacion
    let nuevoHistorialCompleto = lead.historial_conversacion || '';
    try {
      const parsed = JSON.parse(nuevoHistorialCompleto);
      if (Array.isArray(parsed)) {
        parsed.push({
          sender: 'Repulse',
          text: mensaje,
          tipo: 'repulse',
          timestamp: new Date().toISOString(),
        });
        nuevoHistorialCompleto = JSON.stringify(parsed);
      } else {
        nuevoHistorialCompleto = nuevoHistorialCompleto + mensajeTextoRepulse;
      }
    } catch {
      nuevoHistorialCompleto = nuevoHistorialCompleto + mensajeTextoRepulse;
    }

    // 5. UPDATE en tabla leads
    const { error: errorUpdate } = await supabase
      .from('leads')
      .update({
        historial_reciente: nuevoHistorialReciente,
        historial_conversacion: nuevoHistorialCompleto,
        ultimo_mensaje: `[REPULSE]: ${mensaje.substring(0, 100)}...`,
      })
      .eq('id', leadId);

    if (errorUpdate) {
      console.error('[Repulse] Error updating historial:', errorUpdate);
    }
  } catch (error) {
    console.error('[Repulse] Error in inyectarMensajeEnHistorial:', error);
  }
}

/**
 * Procesa un lead individual: envía a n8n y actualiza estado
 * Solo inyecta en historial_conversacion si Meta confirma éxito
 */
async function procesarLeadIndividual(lead: LeadParaEnvio, batchId: string): Promise<boolean> {
  try {
    // 1. Marcar como "enviando"
    await supabase
      .from('repulse_historial')
      .update({ envio_estado: 'enviando' })
      .eq('id', lead.historial_id);

    // 2. Enviar a n8n webhook
    if (!N8N_WEBHOOK_URL) {
      throw new Error('N8N_REPULSE_WEBHOOK_URL no configurado');
    }

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        telefono: lead.telefono,
        mensaje: lead.mensaje,
        nombre: lead.nombre || 'Cliente',
        fecha_visita: lead.fecha_visita || 'fecha por confirmar',
        proyectoId: lead.proyecto_id,
        lead_id: lead.lead_id,
        repulse_lead_id: lead.repulse_lead_id,
      }),
    });

    // 3. Rate limit (500ms entre envíos)
    await sleep(500);

    // 4. Parsear respuesta de n8n (que incluye resultado de Meta)
    if (!response.ok) {
      const errorText = await response.text();
      await supabase
        .from('repulse_historial')
        .update({
          envio_estado: 'error',
          envio_error: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
        })
        .eq('id', lead.historial_id);
      return false;
    }

    // 5. Parsear JSON de n8n con resultado de Meta
    let n8nResult: N8nResponse;
    try {
      n8nResult = await response.json();
    } catch {
      // Si no es JSON válido, asumir éxito (backward compatibility)
      n8nResult = { success: true, whatsapp_message_id: null, status: 'accepted', error: null, contacts: null };
    }

    // 6. Verificar si Meta aceptó el mensaje
    if (n8nResult.success && n8nResult.status === 'accepted') {
      // ✅ Meta confirmó - actualizar historial con whatsapp_message_id
      await supabase
        .from('repulse_historial')
        .update({
          envio_estado: 'enviado',
          enviado_at: new Date().toISOString(),
          whatsapp_message_id: n8nResult.whatsapp_message_id,  // Guardar para trazabilidad
        })
        .eq('id', lead.historial_id);

      // Actualizar repulse_leads: incrementar contador y estado
      const { data: currentLead } = await supabase
        .from('repulse_leads')
        .select('conteo_repulses')
        .eq('id', lead.repulse_lead_id)
        .single();

      await supabase
        .from('repulse_leads')
        .update({
          estado: 'enviado',
          conteo_repulses: (currentLead?.conteo_repulses || 0) + 1,
          ultimo_repulse_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.repulse_lead_id);

      // ✅ INYECTAR EN HISTORIAL DE CONVERSACIÓN (solo si Meta confirmó)
      await inyectarMensajeEnHistorial(lead.lead_id, lead.mensaje);

      console.log(`[Repulse] ✅ Enviado a ${lead.telefono} - wamid: ${n8nResult.whatsapp_message_id}`);
      return true;
    } else {
      // ❌ Meta rechazó el mensaje
      const errorMsg = n8nResult.error || 'Meta rechazó el mensaje';
      await supabase
        .from('repulse_historial')
        .update({
          envio_estado: 'error',
          envio_error: `Meta: ${errorMsg}`,
        })
        .eq('id', lead.historial_id);

      console.log(`[Repulse] ❌ Error en ${lead.telefono}: ${errorMsg}`);
      return false;
    }
  } catch (error) {
    // Error de red o excepción
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    await supabase
      .from('repulse_historial')
      .update({
        envio_estado: 'error',
        envio_error: errorMessage,
      })
      .eq('id', lead.historial_id);
    console.log(`[Repulse] ❌ Excepción en ${lead.telefono}: ${errorMessage}`);
    return false;
  }
}

/**
 * Procesa el batch completo en background
 * Se ejecuta después de enviar la respuesta al cliente
 */
async function procesarEnvioBackground(leads: LeadParaEnvio[], batchId: string) {
  console.log(`[Repulse Batch ${batchId}] Iniciando procesamiento de ${leads.length} leads`);

  const CHUNK_SIZE = 10;
  let enviados = 0;
  let errores = 0;

  // Procesar en chunks para no saturar n8n
  for (let i = 0; i < leads.length; i += CHUNK_SIZE) {
    const chunk = leads.slice(i, i + CHUNK_SIZE);

    // Procesar chunk en paralelo
    const results = await Promise.all(
      chunk.map(lead => procesarLeadIndividual(lead, batchId))
    );

    // Contar resultados
    results.forEach(success => {
      if (success) enviados++;
      else errores++;
    });

    console.log(`[Repulse Batch ${batchId}] Progreso: ${enviados + errores}/${leads.length} (${enviados} ok, ${errores} err)`);

    // Pausa entre chunks (2 segundos)
    if (i + CHUNK_SIZE < leads.length) {
      await sleep(2000);
    }
  }

  console.log(`[Repulse Batch ${batchId}] COMPLETADO: ${enviados} enviados, ${errores} errores`);
}

/**
 * POST /api/repulse/send-batch
 * Inicia el procesamiento en background y responde inmediatamente
 */
export async function POST(request: NextRequest) {
  try {
    const body: BatchRequest = await request.json();
    const { leads, batchId } = body;

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionaron leads' },
        { status: 400 }
      );
    }

    if (!batchId) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó batchId' },
        { status: 400 }
      );
    }

    // Verificar que el webhook esté configurado
    if (!N8N_WEBHOOK_URL) {
      return NextResponse.json(
        { success: false, error: 'N8N_REPULSE_WEBHOOK_URL no está configurado' },
        { status: 500 }
      );
    }

    console.log(`[Repulse Batch] Recibido batch ${batchId} con ${leads.length} leads`);

    // IMPORTANTE: Iniciar procesamiento en background (fire-and-forget)
    // No usamos await para responder inmediatamente
    procesarEnvioBackground(leads, batchId).catch(error => {
      console.error(`[Repulse Batch ${batchId}] Error fatal:`, error);
    });

    // Responder inmediatamente
    return NextResponse.json({
      success: true,
      batchId,
      total: leads.length,
      message: 'Procesamiento iniciado en background',
    });
  } catch (error) {
    console.error('[Repulse Batch] Error en POST:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/repulse/send-batch?batchId=xxx
 * Obtiene el estado actual de un batch
 */
export async function GET(request: NextRequest) {
  try {
    const batchId = request.nextUrl.searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { success: false, error: 'batchId es requerido' },
        { status: 400 }
      );
    }

    // Consultar estado del batch
    const { data, error } = await supabase
      .from('repulse_historial')
      .select('envio_estado')
      .eq('batch_id', batchId);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Calcular estadísticas
    const total = data?.length || 0;
    const enviados = data?.filter(d => d.envio_estado === 'enviado').length || 0;
    const errores = data?.filter(d => d.envio_estado === 'error').length || 0;
    const pendientes = data?.filter(d => d.envio_estado === 'pendiente').length || 0;
    const enviando = data?.filter(d => d.envio_estado === 'enviando').length || 0;

    return NextResponse.json({
      success: true,
      batchId,
      total,
      enviados,
      errores,
      pendientes,
      enviando,
      completado: pendientes === 0 && enviando === 0,
    });
  } catch (error) {
    console.error('[Repulse Batch] Error en GET:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener estado' },
      { status: 500 }
    );
  }
}
