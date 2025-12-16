import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// CORS headers para la extensión de Chrome
function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');

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

    // Obtener datos del body
    const body = await request.json();
    const {
      telefono,
      nombre,
      proyectoId,
      vendedorId,
      userId,
      rubro,
      email,
      horarioVisita,
      horarioVisitaTimestamp,
      historialConversacion,
      historialReciente,
      ultimoMensaje,
      tipificacionNivel1,
      tipificacionNivel2,
      tipificacionNivel3,
    } = body;

    // Validar campos requeridos
    if (!telefono || !nombre || !proyectoId) {
      return NextResponse.json(
        { success: false, error: 'Teléfono, nombre y proyecto son requeridos' },
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Limpiar teléfono (solo dígitos)
    const telefonoLimpio = telefono.replace(/[\s\-\(\)\+]/g, '');

    // Verificar duplicado por teléfono + proyecto
    const { data: existingLead, error: searchError } = await supabase
      .from('leads')
      .select(`
        id,
        nombre,
        telefono,
        vendedor_asignado_id,
        vendedores:vendedor_asignado_id(nombre)
      `)
      .eq('telefono', telefonoLimpio)
      .eq('proyecto_id', proyectoId)
      .limit(1)
      .single();

    if (existingLead && !searchError) {
      // Lead duplicado - retornar datos del existente
      const vendedorNombre = existingLead.vendedores && typeof existingLead.vendedores === 'object'
        ? (existingLead.vendedores as any).nombre
        : 'No asignado';

      return NextResponse.json({
        success: false,
        duplicate: true,
        existingLead: {
          id: existingLead.id,
          nombre: existingLead.nombre,
          telefono: existingLead.telefono,
          vendedor_nombre: vendedorNombre,
        },
      }, { headers: corsHeaders(origin) });
    }

    // Obtener vendedor_id del usuario si no se proporciona
    let finalVendedorId = vendedorId;
    if (!finalVendedorId && userId) {
      const { data: userData } = await supabase
        .from('usuarios')
        .select('vendedor_id')
        .eq('id', userId)
        .single();

      finalVendedorId = userData?.vendedor_id;
    }

    // Crear el lead
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        telefono: telefonoLimpio,
        nombre: nombre.trim(),
        email: email?.trim() || null,
        rubro: rubro?.trim() || null,
        horario_visita: horarioVisita || null,
        horario_visita_timestamp: horarioVisitaTimestamp || null,
        proyecto_id: proyectoId,
        vendedor_asignado_id: finalVendedorId || null,
        estado: 'lead_manual',
        utm: 'web_whatsapp_ce',
        asistio: false,
        notificacion_enviada: false,
        intentos_bot: 0,
        historial_conversacion: historialConversacion || null,
        historial_reciente: historialReciente || null,
        ultimo_mensaje: ultimoMensaje || null,
        tipificacion_nivel_1: tipificacionNivel1 || null,
        tipificacion_nivel_2: tipificacionNivel2 || null,
        tipificacion_nivel_3: tipificacionNivel3 || null,
        fecha_captura: new Date().toISOString(),
      })
      .select('id, nombre, telefono')
      .single();

    if (insertError) {
      console.error('Error creating lead:', insertError);
      return NextResponse.json(
        { success: false, error: 'Error al crear el lead' },
        { status: 500, headers: corsHeaders(origin) }
      );
    }

    return NextResponse.json({
      success: true,
      lead: {
        id: newLead.id,
        nombre: newLead.nombre,
        telefono: newLead.telefono,
      },
      message: `Lead "${newLead.nombre}" creado exitosamente`,
    }, { headers: corsHeaders(origin) });

  } catch (error) {
    console.error('Error en create-lead:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}
