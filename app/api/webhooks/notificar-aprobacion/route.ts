// ============================================================================
// WEBHOOK: Notificar Aprobacion de Descuento
// ============================================================================
// Descripcion: Endpoint para recibir eventos de aprobacion y enviar a n8n
// Uso: n8n llama a este endpoint o este llama al webhook de n8n
// Fase: 5 - Aprobacion de Descuentos
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase con service role para verificar datos
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface NotificacionPayload {
  tipo: 'nueva_solicitud' | 'solicitud_aprobada' | 'solicitud_rechazada';
  aprobacion_id: string;
  proyecto_id?: string;
  local_codigo?: string;
  vendedor_nombre?: string;
  vendedor_telefono?: string;
  precio_lista?: number;
  precio_negociado?: number;
  descuento_porcentaje?: number;
  aprobadores_requeridos?: string[];
  comentario_resolucion?: string;
}

export async function POST(request: NextRequest) {
  try {
    const payload: NotificacionPayload = await request.json();

    // Validar payload minimo
    if (!payload.tipo || !payload.aprobacion_id) {
      return NextResponse.json(
        { error: 'tipo y aprobacion_id son requeridos' },
        { status: 400 }
      );
    }

    // Obtener datos completos de la aprobacion
    const { data: aprobacion, error: fetchError } = await supabase
      .from('aprobaciones_descuento')
      .select(`
        *,
        local:locales(codigo, metraje),
        vendedor:usuarios!vendedor_id(nombre, email, telefono),
        proyecto:proyectos(nombre)
      `)
      .eq('id', payload.aprobacion_id)
      .single();

    if (fetchError || !aprobacion) {
      return NextResponse.json(
        { error: 'Aprobacion no encontrada' },
        { status: 404 }
      );
    }

    // Obtener telefonos de aprobadores
    let aprobadoresTelefonos: string[] = [];
    if (payload.tipo === 'nueva_solicitud' && aprobacion.aprobadores_requeridos?.length > 0) {
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('telefono, rol')
        .in('rol', aprobacion.aprobadores_requeridos)
        .eq('proyecto_id', aprobacion.proyecto_id)
        .eq('estado', 'activo');

      if (usuarios) {
        aprobadoresTelefonos = usuarios
          .map(u => u.telefono)
          .filter(t => t && t.length > 0);
      }
    }

    // Construir mensaje para WhatsApp
    let mensaje = '';
    const local = aprobacion.local as { codigo: string; metraje: number } | null;
    const vendedor = aprobacion.vendedor as { nombre: string; email: string; telefono?: string } | null;
    const proyecto = aprobacion.proyecto as { nombre: string } | null;

    switch (payload.tipo) {
      case 'nueva_solicitud':
        mensaje = `📋 *Nueva Solicitud de Descuento*\n\n` +
          `📍 Local: ${local?.codigo || 'N/A'}\n` +
          `🏢 Proyecto: ${proyecto?.nombre || 'N/A'}\n` +
          `👤 Vendedor: ${vendedor?.nombre || 'N/A'}\n\n` +
          `💰 Precio Lista: $${aprobacion.precio_lista?.toLocaleString() || '0'}\n` +
          `💵 Precio Negociado: $${aprobacion.precio_negociado?.toLocaleString() || '0'}\n` +
          `📉 Descuento: ${aprobacion.descuento_porcentaje?.toFixed(1) || '0'}%\n\n` +
          `⏳ Requiere tu aprobacion.\n` +
          `Ingresa al dashboard para aprobar o rechazar.`;
        break;

      case 'solicitud_aprobada':
        mensaje = `✅ *Descuento Aprobado*\n\n` +
          `📍 Local: ${local?.codigo || 'N/A'}\n` +
          `💵 Precio Final: $${aprobacion.precio_negociado?.toLocaleString() || '0'}\n` +
          `📉 Descuento: ${aprobacion.descuento_porcentaje?.toFixed(1) || '0'}%\n\n` +
          `El descuento ha sido aprobado. Puedes continuar con la venta.`;
        break;

      case 'solicitud_rechazada':
        mensaje = `❌ *Descuento Rechazado*\n\n` +
          `📍 Local: ${local?.codigo || 'N/A'}\n` +
          `📉 Descuento solicitado: ${aprobacion.descuento_porcentaje?.toFixed(1) || '0'}%\n\n` +
          `Motivo: ${aprobacion.comentario_resolucion || 'No especificado'}\n\n` +
          `Debes negociar un nuevo precio con el cliente.`;
        break;
    }

    // Determinar destinatarios
    let destinatarios: string[] = [];
    if (payload.tipo === 'nueva_solicitud') {
      // Notificar a aprobadores
      destinatarios = aprobadoresTelefonos;
    } else {
      // Notificar al vendedor
      if (vendedor?.telefono) {
        destinatarios = [vendedor.telefono];
      }
    }

    // Si hay webhook de n8n configurado, enviar
    const n8nWebhook = process.env.N8N_WEBHOOK_WHATSAPP_NOTIFY;
    if (n8nWebhook && destinatarios.length > 0) {
      try {
        const response = await fetch(n8nWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destinatarios,
            mensaje,
            tipo: payload.tipo,
            aprobacion_id: aprobacion.id,
            proyecto_id: aprobacion.proyecto_id,
          }),
        });

        if (!response.ok) {
          console.error('Error enviando a n8n:', await response.text());
        }
      } catch (error) {
        console.error('Error webhook n8n:', error);
      }
    }

    return NextResponse.json({
      success: true,
      mensaje,
      destinatarios,
      aprobacion: {
        id: aprobacion.id,
        estado: aprobacion.estado,
        tipo: payload.tipo,
      },
    });
  } catch (error) {
    console.error('Error en webhook notificar-aprobacion:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET para verificar que el endpoint existe
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/webhooks/notificar-aprobacion',
    status: 'active',
    methods: ['POST'],
    description: 'Webhook para notificaciones de aprobacion de descuentos',
  });
}
