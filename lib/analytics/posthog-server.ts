// ============================================================================
// POSTHOG SERVER-SIDE ANALYTICS
// ============================================================================
// Para uso en Server Actions y API Routes
// Usa la API de PostHog directamente (no el SDK cliente)
// ============================================================================

const POSTHOG_API_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Capturar evento desde el servidor
 * @param eventName Nombre del evento (ej: 'lead_assigned')
 * @param distinctId ID unico del usuario (usuario.id)
 * @param properties Propiedades del evento
 */
export async function captureServerEvent(
  eventName: string,
  distinctId: string,
  properties: EventProperties = {}
): Promise<void> {
  // Skip si no hay API key configurada
  if (!POSTHOG_API_KEY) {
    console.log(`[PostHog Server] Skipped ${eventName} - No API key`);
    return;
  }

  try {
    const response = await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        event: eventName,
        distinct_id: distinctId,
        properties: {
          ...properties,
          $lib: 'ecoplaza-server',
          $lib_version: '1.0.0',
        },
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error(`[PostHog Server] Error capturing ${eventName}:`, response.status);
    } else {
      console.log(`[PostHog Server] Captured: ${eventName}`);
    }
  } catch (error) {
    // Non-blocking - solo log
    console.error(`[PostHog Server] Failed to capture ${eventName}:`, error);
  }
}

// ============================================================================
// EVENTOS DE NEGOCIO PREDEFINIDOS
// ============================================================================

/**
 * Lead asignado a vendedor
 */
export async function trackLeadAssigned(
  userId: string,
  data: {
    lead_id: string;
    lead_nombre?: string;
    vendedor_id: string;
    vendedor_nombre?: string;
    proyecto_id?: string;
    was_reassigned: boolean;
  }
): Promise<void> {
  await captureServerEvent('lead_assigned', userId, {
    lead_id: data.lead_id,
    lead_nombre: data.lead_nombre,
    vendedor_id: data.vendedor_id,
    vendedor_nombre: data.vendedor_nombre,
    proyecto_id: data.proyecto_id,
    was_reassigned: data.was_reassigned,
  });
}

/**
 * Lead liberado (sin asignar)
 */
export async function trackLeadLiberated(
  userId: string,
  data: {
    lead_id: string;
    lead_nombre?: string;
    proyecto_id?: string;
  }
): Promise<void> {
  await captureServerEvent('lead_liberated', userId, {
    lead_id: data.lead_id,
    lead_nombre: data.lead_nombre,
    proyecto_id: data.proyecto_id,
  });
}

/**
 * Estado de local cambiado (semaforo)
 */
export async function trackLocalStatusChanged(
  userId: string,
  data: {
    local_id: string;
    local_codigo?: string;
    estado_anterior: string;
    estado_nuevo: string;
    proyecto_id?: string;
    monto_venta?: number;
  }
): Promise<void> {
  await captureServerEvent('local_status_changed', userId, {
    local_id: data.local_id,
    local_codigo: data.local_codigo,
    estado_anterior: data.estado_anterior,
    estado_nuevo: data.estado_nuevo,
    proyecto_id: data.proyecto_id,
    monto_venta: data.monto_venta,
  });
}

/**
 * Lead manual creado
 */
export async function trackLeadCreated(
  userId: string,
  data: {
    lead_id: string;
    lead_nombre?: string;
    proyecto_id?: string;
    source: 'import' | 'vinculacion' | 'visita_proyecto';
  }
): Promise<void> {
  await captureServerEvent('lead_created', userId, {
    lead_id: data.lead_id,
    lead_nombre: data.lead_nombre,
    proyecto_id: data.proyecto_id,
    source: data.source,
  });
}

/**
 * Visita registrada (asistio = true)
 */
export async function trackVisitaRegistered(
  userId: string,
  data: {
    lead_id: string;
    lead_nombre?: string;
    proyecto_id?: string;
    was_new_lead: boolean;
  }
): Promise<void> {
  await captureServerEvent('visita_registered', userId, {
    lead_id: data.lead_id,
    lead_nombre: data.lead_nombre,
    proyecto_id: data.proyecto_id,
    was_new_lead: data.was_new_lead,
  });
}

/**
 * Pago/Abono registrado
 */
export async function trackPagoRegistered(
  userId: string,
  data: {
    pago_id: string;
    tipo: 'separacion' | 'inicial' | 'cuota';
    monto: number;
    local_codigo?: string;
    proyecto_id?: string;
  }
): Promise<void> {
  await captureServerEvent('pago_registered', userId, {
    pago_id: data.pago_id,
    tipo: data.tipo,
    monto: data.monto,
    local_codigo: data.local_codigo,
    proyecto_id: data.proyecto_id,
  });
}

/**
 * Venta cerrada (local paso a ROJO)
 */
export async function trackVentaCerrada(
  userId: string,
  data: {
    local_id: string;
    local_codigo?: string;
    monto_venta: number;
    proyecto_id?: string;
    vendedor_id?: string;
  }
): Promise<void> {
  await captureServerEvent('venta_cerrada', userId, {
    local_id: data.local_id,
    local_codigo: data.local_codigo,
    monto_venta: data.monto_venta,
    proyecto_id: data.proyecto_id,
    vendedor_id: data.vendedor_id,
  });
}
