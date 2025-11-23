// ============================================================================
// SERVER ACTIONS: Control de Pagos
// ============================================================================
// Descripción: Server actions para gestión de control de pagos (post-venta)
// Tabla: control_pagos
// Sesión: 54
// ============================================================================

'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ProcesarVentaData {
  // Datos del local
  localId: string;
  codigoLocal: string;
  proyectoId: string;
  proyectoNombre: string;
  metraje: number;

  // Datos del cliente
  leadId: string;
  leadNombre: string;
  leadTelefono: string;

  // Montos
  montoVenta: number;
  montoSeparacion: number;
  montoInicial: number;
  inicialRestante: number;
  montoRestante: number;

  // Financiamiento
  conFinanciamiento: boolean;
  porcentajeInicial: number | null;
  numeroCuotas: number;
  tea: number | null;
  fechaPrimerPago: string;

  // Calendario
  calendarioCuotas: any[];

  // Usuario procesando
  procesadoPor: string;
  vendedorId?: string;
}

export interface ControlPago {
  id: string;
  local_id: string;
  codigo_local: string;
  proyecto_id: string;
  proyecto_nombre: string;
  metraje: number;
  lead_id: string | null;
  lead_nombre: string;
  lead_telefono: string;
  monto_venta: number;
  monto_separacion: number;
  monto_inicial: number;
  inicial_restante: number;
  monto_restante: number;
  con_financiamiento: boolean;
  porcentaje_inicial: number | null;
  numero_cuotas: number;
  tea: number | null;
  fecha_primer_pago: string;
  calendario_cuotas: any[];
  estado: 'activo' | 'completado' | 'cancelado';
  procesado_por: string;
  vendedor_id: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MUTATIONS - PROCESAR VENTA
// ============================================================================

/**
 * Procesar venta de un local y moverlo a control de pagos
 *
 * PASOS:
 * 1. Validar autenticación (solo admin/jefe_ventas)
 * 2. Validar que local no esté ya en control_pagos
 * 3. INSERT en control_pagos con snapshot completo de datos
 * 4. UPDATE locales SET en_control_pagos = true
 * 5. INSERT en locales_historial
 *
 * @param data Datos completos de la venta procesada
 * @returns Success/error con mensaje
 */
export async function procesarVentaLocal(data: ProcesarVentaData) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  try {
    // 1. Validar autenticación
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'No autenticado' };
    }

    // 2. Validar rol (solo admin y jefe_ventas pueden procesar)
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!usuario || !['admin', 'jefe_ventas'].includes(usuario.rol)) {
      return { success: false, message: 'Sin permisos para procesar venta' };
    }

    // 3. Validar que local no esté ya en control_pagos
    const { data: existingControl } = await supabase
      .from('control_pagos')
      .select('id')
      .eq('local_id', data.localId)
      .maybeSingle();

    if (existingControl) {
      return { success: false, message: 'Este local ya está en control de pagos' };
    }

    // 4. Resolver vendedor_id: buscar usuario.id desde vendedores.id
    let usuarioVendedorId: string | null = null;

    if (data.vendedorId) {
      const { data: usuarioVendedor, error: vendedorError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('vendedor_id', data.vendedorId)
        .maybeSingle();

      if (vendedorError) {
        console.error('[CONTROL_PAGOS] Error buscando usuario del vendedor:', vendedorError);
      } else if (usuarioVendedor) {
        usuarioVendedorId = usuarioVendedor.id;
      } else {
        console.warn('[CONTROL_PAGOS] ⚠️ Vendedor no encontrado en tabla usuarios:', data.vendedorId);
      }
    }

    // 5. INSERT en control_pagos
    const { error: insertError } = await supabase
      .from('control_pagos')
      .insert({
        local_id: data.localId,
        codigo_local: data.codigoLocal,
        proyecto_id: data.proyectoId,
        proyecto_nombre: data.proyectoNombre,
        metraje: data.metraje,
        lead_id: data.leadId,
        lead_nombre: data.leadNombre,
        lead_telefono: data.leadTelefono,
        monto_venta: data.montoVenta,
        monto_separacion: data.montoSeparacion,
        monto_inicial: data.montoInicial,
        inicial_restante: data.inicialRestante,
        monto_restante: data.montoRestante,
        con_financiamiento: data.conFinanciamiento,
        porcentaje_inicial: data.porcentajeInicial,
        numero_cuotas: data.numeroCuotas,
        tea: data.tea,
        fecha_primer_pago: data.fechaPrimerPago,
        calendario_cuotas: data.calendarioCuotas,
        estado: 'activo',
        procesado_por: data.procesadoPor,
        vendedor_id: usuarioVendedorId,
      });

    if (insertError) {
      console.error('[CONTROL_PAGOS] Error insertando control_pagos:', insertError);
      return { success: false, message: 'Error al crear control de pagos' };
    }

    // 6. UPDATE locales SET en_control_pagos = true
    const { error: updateError } = await supabase
      .from('locales')
      .update({ en_control_pagos: true })
      .eq('id', data.localId);

    if (updateError) {
      console.error('[CONTROL_PAGOS] Error actualizando local:', updateError);
      return { success: false, message: 'Error al actualizar estado del local' };
    }

    // 7. INSERT en locales_historial
    const accion = `Local procesado para control de pagos. Monto de venta: $${data.montoVenta.toFixed(2)}, Financiamiento: ${data.conFinanciamiento ? 'Sí' : 'No'}, Cuotas: ${data.numeroCuotas}, Monto restante: $${data.montoRestante.toFixed(2)}`;

    const { error: historialError } = await supabase
      .from('locales_historial')
      .insert({
        local_id: data.localId,
        accion: accion,
        usuario_id: data.procesadoPor,
        estado_anterior: 'rojo',
        estado_nuevo: 'rojo',
      });

    if (historialError) {
      console.error('[CONTROL_PAGOS] Error en historial:', historialError);
      // No retornar error, solo log
    }

    console.log('[CONTROL_PAGOS] ✅ Venta procesada exitosamente:', data.codigoLocal);

    return {
      success: true,
      message: 'Venta procesada exitosamente. El local ahora está en Control de Pagos.',
    };

  } catch (error) {
    console.error('[CONTROL_PAGOS] Error procesando venta:', error);
    return { success: false, message: 'Error inesperado al procesar venta' };
  }
}

// ============================================================================
// QUERIES - GET CONTROL PAGOS
// ============================================================================

/**
 * Obtener todos los control_pagos activos
 *
 * @returns Array de control_pagos ordenados por fecha de creación DESC
 */
export async function getAllControlPagos(): Promise<ControlPago[]> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  try {
    const { data, error } = await supabase
      .from('control_pagos')
      .select('*')
      .eq('estado', 'activo')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CONTROL_PAGOS] Error obteniendo control_pagos:', error);
      return [];
    }

    return data as ControlPago[] || [];
  } catch (error) {
    console.error('[CONTROL_PAGOS] Error in getAllControlPagos:', error);
    return [];
  }
}

/**
 * Obtener un control_pago por ID
 *
 * @param id ID del control_pago
 * @returns Control_pago o null si no existe
 */
export async function getControlPagoById(id: string): Promise<ControlPago | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  try {
    const { data, error } = await supabase
      .from('control_pagos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[CONTROL_PAGOS] Error obteniendo control_pago:', error);
      return null;
    }

    return data as ControlPago;
  } catch (error) {
    console.error('[CONTROL_PAGOS] Error in getControlPagoById:', error);
    return null;
  }
}

/**
 * Obtener control_pago por local_id
 *
 * @param localId ID del local
 * @returns Control_pago o null si no existe
 */
export async function getControlPagoByLocalId(localId: string): Promise<ControlPago | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  try {
    const { data, error } = await supabase
      .from('control_pagos')
      .select('*')
      .eq('local_id', localId)
      .maybeSingle();

    if (error) {
      console.error('[CONTROL_PAGOS] Error obteniendo control_pago por localId:', error);
      return null;
    }

    return data as ControlPago | null;
  } catch (error) {
    console.error('[CONTROL_PAGOS] Error in getControlPagoByLocalId:', error);
    return null;
  }
}

// ============================================================================
// ESTADÍSTICAS
// ============================================================================

/**
 * Obtener estadísticas de control de pagos
 *
 * @returns Contadores por estado
 */
export async function getControlPagosStats() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  try {
    const { data, error } = await supabase
      .from('control_pagos')
      .select('estado', { count: 'exact' });

    if (error) {
      console.error('[CONTROL_PAGOS] Error obteniendo stats:', error);
      return { activo: 0, completado: 0, cancelado: 0, total: 0 };
    }

    const stats = {
      activo: data?.filter(cp => cp.estado === 'activo').length || 0,
      completado: data?.filter(cp => cp.estado === 'completado').length || 0,
      cancelado: data?.filter(cp => cp.estado === 'cancelado').length || 0,
      total: data?.length || 0,
    };

    return stats;
  } catch (error) {
    console.error('[CONTROL_PAGOS] Error in getControlPagosStats:', error);
    return { activo: 0, completado: 0, cancelado: 0, total: 0 };
  }
}
