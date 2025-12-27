import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// CORS headers para la extensión de Chrome / Mobile App
function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

/**
 * Extrae el último timestamp del historial de conversación
 * Formato esperado: [25/12/24, 10:01] o [25/12/2024, 10:01]
 * Retorna Date o null si no encuentra
 */
function extractLastTimestampFromHistorial(historial: string): Date | null {
  if (!historial) return null;

  // Regex para capturar timestamps en formato [dd/mm/yy, HH:mm] o [dd/mm/yyyy, HH:mm]
  const regex = /\[(\d{2})\/(\d{2})\/(\d{2,4}),\s*(\d{2}):(\d{2})\]/g;

  let lastMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(historial)) !== null) {
    lastMatch = match;
  }

  if (!lastMatch) return null;

  const [, day, month, year, hour, minute] = lastMatch;

  // Convertir año de 2 dígitos a 4 dígitos
  let fullYear = parseInt(year);
  if (fullYear < 100) {
    fullYear = fullYear > 50 ? 1900 + fullYear : 2000 + fullYear;
  }

  // Crear fecha (mes es 0-indexed en JS)
  const date = new Date(fullYear, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));

  return isNaN(date.getTime()) ? null : date;
}

/**
 * Parsea un timestamp del formato de la extensión a Date
 * Acepta: "25/12/24, 10:01" o "2024-12-25T10:01:00Z" (ISO)
 */
function parseMessageTimestamp(timestamp: string): Date | null {
  if (!timestamp) return null;

  // Intentar ISO primero
  const isoDate = new Date(timestamp);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Intentar formato dd/mm/yy, HH:mm
  const match = timestamp.match(/(\d{2})\/(\d{2})\/(\d{2,4}),?\s*(\d{2}):(\d{2})/);
  if (match) {
    const [, day, month, year, hour, minute] = match;
    let fullYear = parseInt(year);
    if (fullYear < 100) {
      fullYear = fullYear > 50 ? 1900 + fullYear : 2000 + fullYear;
    }
    return new Date(fullYear, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
  }

  return null;
}

interface ConversationMessage {
  timestamp: string; // "25/12/24, 10:01" o ISO
  content: string;
  sender: string; // nombre del sender o "Usuario", "Vendedor", etc.
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get('origin');
  const { id: leadId } = await params;

  try {
    // Verificar autorización
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token de autorización requerido' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Crear cliente con el token del usuario para verificar sesión
    const supabaseUser = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verificar que el token es válido
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Sesión inválida o expirada' },
        { status: 401, headers: corsHeaders(origin) }
      );
    }

    // Usar service role para operaciones de base de datos
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener vendedor_id del usuario actual
    const { data: userData, error: userDataError } = await supabase
      .from('usuarios')
      .select('vendedor_id')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData?.vendedor_id) {
      return NextResponse.json(
        { success: false, error: 'Usuario no tiene vendedor asociado' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    const currentVendedorId = userData.vendedor_id;

    // Obtener el lead actual
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, vendedor_asignado_id, historial_conversacion, updated_at')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { success: false, error: 'Lead no encontrado' },
        { status: 404, headers: corsHeaders(origin) }
      );
    }

    // Verificar que el vendedor actual es el dueño del lead
    if (lead.vendedor_asignado_id !== currentVendedorId) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para actualizar este lead' },
        { status: 403, headers: corsHeaders(origin) }
      );
    }

    // Obtener datos del body
    const body = await request.json();
    const { mensajes, ultimoMensaje, historialReciente } = body as {
      mensajes: ConversationMessage[];
      ultimoMensaje?: string;
      historialReciente?: string;
    };

    if (!mensajes || !Array.isArray(mensajes) || mensajes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Se requiere un array de mensajes' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Extraer último timestamp del historial existente
    let lastTimestamp: Date | null = extractLastTimestampFromHistorial(lead.historial_conversacion || '');

    // Si no hay timestamp en el historial, usar updated_at como fallback
    if (!lastTimestamp && lead.updated_at) {
      lastTimestamp = new Date(lead.updated_at);
    }

    const lastTimestampMs = lastTimestamp ? lastTimestamp.getTime() : 0;

    // Filtrar solo mensajes nuevos (fecha > último timestamp del historial)
    const newMessages = mensajes.filter((msg) => {
      const msgDate = parseMessageTimestamp(msg.timestamp);
      if (!msgDate) return false; // Si no tiene timestamp válido, ignorar
      return msgDate.getTime() > lastTimestampMs;
    });

    if (newMessages.length === 0) {
      return NextResponse.json({
        success: true,
        mensajesAgregados: 0,
        message: 'No hay mensajes nuevos para agregar',
        ultimoTimestampHistorial: lastTimestamp?.toISOString() || null,
      }, { headers: corsHeaders(origin) });
    }

    // Ordenar mensajes por timestamp
    newMessages.sort((a, b) => {
      const dateA = parseMessageTimestamp(a.timestamp);
      const dateB = parseMessageTimestamp(b.timestamp);
      return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
    });

    // Formatear nuevos mensajes en el mismo formato del historial
    // Formato: [dd/mm/yy, HH:mm] Sender: Mensaje
    const newHistorialPart = newMessages.map(msg => {
      // Si el timestamp ya viene en formato [dd/mm/yy, HH:mm], usarlo directo
      let formattedTimestamp = msg.timestamp;

      // Si es ISO, convertir a formato local
      if (msg.timestamp.includes('T') || msg.timestamp.includes('-')) {
        const date = new Date(msg.timestamp);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        const hour = String(date.getHours()).padStart(2, '0');
        const minute = String(date.getMinutes()).padStart(2, '0');
        formattedTimestamp = `${day}/${month}/${year}, ${hour}:${minute}`;
      }

      return `[${formattedTimestamp}] ${msg.sender}: ${msg.content}`;
    }).join('\n');

    // Concatenar al historial existente
    let existingHistorial = lead.historial_conversacion || '';
    const updatedHistorial = existingHistorial
      ? `${existingHistorial}\n${newHistorialPart}`
      : newHistorialPart;

    // Obtener el último mensaje para guardar
    const lastNewMessage = newMessages[newMessages.length - 1];

    // Actualizar el lead
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        historial_conversacion: updatedHistorial,
        historial_reciente: historialReciente || null,
        ultimo_mensaje: ultimoMensaje || lastNewMessage.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead conversation:', updateError);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar la conversación' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    // Calcular el nuevo último timestamp
    const newestTimestamp = parseMessageTimestamp(lastNewMessage.timestamp);

    return NextResponse.json({
      success: true,
      mensajesAgregados: newMessages.length,
      message: `Se agregaron ${newMessages.length} mensajes nuevos`,
      ultimoTimestampHistorial: newestTimestamp?.toISOString() || null,
    }, { headers: corsHeaders(origin) });

  } catch (error) {
    console.error('Error en update-conversation:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
