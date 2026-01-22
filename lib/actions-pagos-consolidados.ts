'use server';

// ============================================================================
// SERVER ACTIONS: Pagos Consolidados (1 voucher = N locales)
// FASE 4 - Plan Procesos Finanzas-Ventas 2025
// ============================================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ============================================================================
// TYPES
// ============================================================================

export interface PagoConsolidado {
  id: string;
  proyecto_id: string;
  cliente_nombre: string | null;
  cliente_dni: string | null;
  cliente_telefono: string | null;
  monto_total: number;
  moneda: 'USD' | 'PEN';
  fecha_pago: string;
  comprobante_url: string | null;
  comprobante_ocr_data: Record<string, unknown> | null;
  numero_operacion: string | null;
  banco_origen: string | null;
  metodo_pago: string;
  estado: 'pendiente' | 'validado' | 'rechazado';
  validado_por: string | null;
  fecha_validacion: string | null;
  notas: string | null;
  created_at: string;
  created_by: string;
}

export interface DistribucionPago {
  id: string;
  pago_consolidado_id: string;
  control_pago_id: string;
  pago_id: string | null;
  monto_asignado: number;
  concepto: 'separacion' | 'inicial' | 'cuota' | 'abono_general';
  numero_cuota: number | null;
  abono_id: string | null;
  created_at: string;
}

export interface LocalCliente {
  control_pago_id: string;
  local_codigo: string;
  local_area: number;
  cliente_nombre: string;
  cliente_dni: string;
  monto_venta: number;
  moneda: string;
  separacion_pendiente: number;
  inicial_pendiente: number;
  total_pendiente: number;
  pagos: {
    id: string;
    tipo: string;
    numero_cuota: number | null;
    monto_esperado: number;
    monto_abonado: number;
    monto_restante: number;
    estado: string;
  }[];
}

export interface CreatePagoConsolidadoInput {
  proyectoId: string;
  clienteNombre?: string;
  clienteDni?: string;
  clienteTelefono?: string;
  montoTotal: number;
  moneda: 'USD' | 'PEN';
  fechaPago: string;
  comprobanteUrl?: string;
  comprobanteOcrData?: Record<string, unknown>;
  numeroOperacion?: string;
  bancoOrigen?: string;
  metodoPago?: string;
  notas?: string;
  createdBy: string;
  distribucion: {
    controlPagoId: string;
    pagoId?: string;
    montoAsignado: number;
    concepto: 'separacion' | 'inicial' | 'cuota' | 'abono_general';
    numeroCuota?: number;
  }[];
}

// ============================================================================
// HELPER: Create Supabase Client
// ============================================================================

async function getSupabase() {
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
// FUNCIONES
// ============================================================================

/**
 * Buscar locales de un cliente por DNI
 * Retorna todos los locales (control_pagos) que tiene el cliente con pagos pendientes
 */
export async function getLocalesCliente(
  proyectoId: string,
  clienteDni: string
): Promise<{ success: boolean; data?: LocalCliente[]; message?: string }> {
  const supabase = await getSupabase();

  try {
    // Buscar control_pagos por DNI del cliente (lead_telefono contiene DNI con prefijo 51)
    const { data: controlPagos, error: cpError } = await supabase
      .from('control_pagos')
      .select(`
        id,
        monto_venta,
        local:locales!inner(codigo, metraje),
        lead_nombre,
        lead_telefono
      `)
      .eq('proyecto_id', proyectoId)
      .eq('lead_telefono', clienteDni)
      .order('created_at', { ascending: false });

    if (cpError) {
      console.error('[PAGOS-CONSOLIDADOS] Error buscando control_pagos:', cpError);
      return { success: false, message: 'Error buscando locales del cliente' };
    }

    if (!controlPagos || controlPagos.length === 0) {
      return { success: true, data: [] };
    }

    // Para cada control_pago, obtener los pagos pendientes
    const localesCliente: LocalCliente[] = await Promise.all(
      controlPagos.map(async (cp) => {
        const { data: pagos } = await supabase
          .from('pagos_local')
          .select('*')
          .eq('control_pago_id', cp.id)
          .in('estado', ['pendiente', 'parcial'])
          .order('tipo', { ascending: true })
          .order('numero_cuota', { ascending: true });

        const pagosList = (pagos || []).map((p) => ({
          id: p.id,
          tipo: p.tipo,
          numero_cuota: p.numero_cuota,
          monto_esperado: p.monto_esperado,
          monto_abonado: p.monto_abonado,
          monto_restante: p.monto_esperado - p.monto_abonado,
          estado: p.estado,
        }));

        const separacionPendiente = pagosList
          .filter((p) => p.tipo === 'separacion')
          .reduce((sum, p) => sum + p.monto_restante, 0);

        const inicialPendiente = pagosList
          .filter((p) => p.tipo === 'inicial')
          .reduce((sum, p) => sum + p.monto_restante, 0);

        const totalPendiente = pagosList.reduce((sum, p) => sum + p.monto_restante, 0);

        // Handle Supabase relation - puede ser array o objeto
        const localRaw = cp.local as { codigo: string; metraje: number } | { codigo: string; metraje: number }[] | null;
        const local = Array.isArray(localRaw) ? localRaw[0] : localRaw;

        return {
          control_pago_id: cp.id,
          local_codigo: local?.codigo || 'N/A',
          local_area: local?.metraje || 0,
          cliente_nombre: cp.lead_nombre || '',
          cliente_dni: cp.lead_telefono || '',
          monto_venta: cp.monto_venta,
          moneda: 'USD', // Por defecto USD ya que control_pagos no tiene columna moneda
          separacion_pendiente: separacionPendiente,
          inicial_pendiente: inicialPendiente,
          total_pendiente: totalPendiente,
          pagos: pagosList,
        };
      })
    );

    return { success: true, data: localesCliente };
  } catch (error) {
    console.error('[PAGOS-CONSOLIDADOS] Error:', error);
    return { success: false, message: 'Error inesperado' };
  }
}

/**
 * Buscar un local específico por código
 */
export async function getLocalPorCodigo(
  proyectoId: string,
  codigoLocal: string
): Promise<{ success: boolean; data?: LocalCliente; message?: string }> {
  const supabase = await getSupabase();

  try {
    // Buscar el local
    const { data: local, error: localError } = await supabase
      .from('locales')
      .select('id, codigo, metraje')
      .eq('proyecto_id', proyectoId)
      .ilike('codigo', codigoLocal)
      .single();

    if (localError || !local) {
      return { success: false, message: 'Local no encontrado' };
    }

    // Buscar control_pago asociado
    const { data: controlPago, error: cpError } = await supabase
      .from('control_pagos')
      .select('*')
      .eq('local_id', local.id)
      .single();

    if (cpError || !controlPago) {
      return { success: false, message: 'Este local no tiene control de pagos activo' };
    }

    // Obtener pagos pendientes
    const { data: pagos } = await supabase
      .from('pagos_local')
      .select('*')
      .eq('control_pago_id', controlPago.id)
      .in('estado', ['pendiente', 'parcial'])
      .order('tipo', { ascending: true })
      .order('numero_cuota', { ascending: true });

    const pagosList = (pagos || []).map((p) => ({
      id: p.id,
      tipo: p.tipo,
      numero_cuota: p.numero_cuota,
      monto_esperado: p.monto_esperado,
      monto_abonado: p.monto_abonado,
      monto_restante: p.monto_esperado - p.monto_abonado,
      estado: p.estado,
    }));

    const separacionPendiente = pagosList
      .filter((p) => p.tipo === 'separacion')
      .reduce((sum, p) => sum + p.monto_restante, 0);

    const inicialPendiente = pagosList
      .filter((p) => p.tipo === 'inicial')
      .reduce((sum, p) => sum + p.monto_restante, 0);

    const totalPendiente = pagosList.reduce((sum, p) => sum + p.monto_restante, 0);

    return {
      success: true,
      data: {
        control_pago_id: controlPago.id,
        local_codigo: local.codigo,
        local_area: local.metraje,
        cliente_nombre: controlPago.lead_nombre || '',
        cliente_dni: controlPago.lead_telefono || '',
        monto_venta: controlPago.monto_venta,
        moneda: 'USD', // Por defecto USD ya que control_pagos no tiene columna moneda
        separacion_pendiente: separacionPendiente,
        inicial_pendiente: inicialPendiente,
        total_pendiente: totalPendiente,
        pagos: pagosList,
      },
    };
  } catch (error) {
    console.error('[PAGOS-CONSOLIDADOS] Error:', error);
    return { success: false, message: 'Error inesperado' };
  }
}

/**
 * Crear un pago consolidado con su distribución
 */
export async function createPagoConsolidado(
  input: CreatePagoConsolidadoInput
): Promise<{ success: boolean; pagoConsolidadoId?: string; message?: string }> {
  const supabase = await getSupabase();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'No autenticado' };
    }

    // Validar que la distribución suma el monto total
    const totalDistribuido = input.distribucion.reduce(
      (sum, d) => sum + d.montoAsignado,
      0
    );

    // Comparar con precisión de centavos
    const totalDistribuidoCents = Math.round(totalDistribuido * 100);
    const montoTotalCents = Math.round(input.montoTotal * 100);

    if (totalDistribuidoCents !== montoTotalCents) {
      return {
        success: false,
        message: `El total distribuido ($${totalDistribuido.toFixed(2)}) no coincide con el monto del pago ($${input.montoTotal.toFixed(2)})`,
      };
    }

    // Crear el pago consolidado
    const { data: pagoConsolidado, error: pcError } = await supabase
      .from('pagos_consolidados')
      .insert({
        proyecto_id: input.proyectoId,
        cliente_nombre: input.clienteNombre || null,
        cliente_dni: input.clienteDni || null,
        cliente_telefono: input.clienteTelefono || null,
        monto_total: input.montoTotal,
        moneda: input.moneda,
        fecha_pago: input.fechaPago,
        comprobante_url: input.comprobanteUrl || null,
        comprobante_ocr_data: input.comprobanteOcrData || null,
        numero_operacion: input.numeroOperacion || null,
        banco_origen: input.bancoOrigen || null,
        metodo_pago: input.metodoPago || 'transferencia',
        notas: input.notas || null,
        created_by: input.createdBy,
      })
      .select('id')
      .single();

    if (pcError || !pagoConsolidado) {
      console.error('[PAGOS-CONSOLIDADOS] Error creando pago consolidado:', pcError);
      return { success: false, message: 'Error al crear el pago consolidado' };
    }

    // Crear la distribución y los abonos
    for (const dist of input.distribucion) {
      // Determinar el pago_id según el concepto
      let pagoId = dist.pagoId;

      if (!pagoId && dist.concepto !== 'abono_general') {
        // Buscar el pago correspondiente
        const tipoMap: Record<string, string> = {
          separacion: 'separacion',
          inicial: 'inicial',
          cuota: 'cuota',
        };

        let query = supabase
          .from('pagos_local')
          .select('id')
          .eq('control_pago_id', dist.controlPagoId)
          .eq('tipo', tipoMap[dist.concepto]);

        if (dist.concepto === 'cuota' && dist.numeroCuota) {
          query = query.eq('numero_cuota', dist.numeroCuota);
        }

        const { data: pago } = await query.single();
        pagoId = pago?.id;
      }

      // Crear el registro de distribución
      const { data: distribucion, error: distError } = await supabase
        .from('pagos_consolidados_distribucion')
        .insert({
          pago_consolidado_id: pagoConsolidado.id,
          control_pago_id: dist.controlPagoId,
          pago_id: pagoId || null,
          monto_asignado: dist.montoAsignado,
          concepto: dist.concepto,
          numero_cuota: dist.numeroCuota || null,
        })
        .select('id')
        .single();

      if (distError) {
        console.error('[PAGOS-CONSOLIDADOS] Error creando distribución:', distError);
        // Continuar con las demás distribuciones
        continue;
      }

      // Si hay un pago_id, crear el abono correspondiente
      if (pagoId) {
        const { data: abono, error: abonoError } = await supabase
          .from('abonos_pago')
          .insert({
            pago_id: pagoId,
            monto: dist.montoAsignado,
            fecha_abono: input.fechaPago,
            metodo_pago: input.metodoPago || 'transferencia',
            comprobante_url: input.comprobanteUrl || null,
            notas: `Pago consolidado: ${pagoConsolidado.id}`,
            registrado_por: input.createdBy,
          })
          .select('id')
          .single();

        if (!abonoError && abono) {
          // Actualizar la distribución con el abono_id
          await supabase
            .from('pagos_consolidados_distribucion')
            .update({ abono_id: abono.id })
            .eq('id', distribucion.id);
        }
      }
    }

    return {
      success: true,
      pagoConsolidadoId: pagoConsolidado.id,
      message: 'Pago consolidado creado exitosamente',
    };
  } catch (error) {
    console.error('[PAGOS-CONSOLIDADOS] Error:', error);
    return { success: false, message: 'Error inesperado al crear el pago consolidado' };
  }
}

/**
 * Obtener pagos consolidados de un proyecto
 */
export async function getPagosConsolidados(
  proyectoId: string,
  estado?: 'pendiente' | 'validado' | 'rechazado'
): Promise<{ success: boolean; data?: PagoConsolidado[]; message?: string }> {
  const supabase = await getSupabase();

  try {
    let query = supabase
      .from('pagos_consolidados')
      .select('*')
      .eq('proyecto_id', proyectoId)
      .order('created_at', { ascending: false });

    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[PAGOS-CONSOLIDADOS] Error obteniendo pagos:', error);
      return { success: false, message: 'Error obteniendo pagos consolidados' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('[PAGOS-CONSOLIDADOS] Error:', error);
    return { success: false, message: 'Error inesperado' };
  }
}

/**
 * Obtener un pago consolidado con su distribución
 */
export async function getPagoConsolidadoConDistribucion(
  pagoConsolidadoId: string
): Promise<{
  success: boolean;
  data?: PagoConsolidado & { distribucion: DistribucionPago[] };
  message?: string;
}> {
  const supabase = await getSupabase();

  try {
    const { data: pago, error: pagoError } = await supabase
      .from('pagos_consolidados')
      .select('*')
      .eq('id', pagoConsolidadoId)
      .single();

    if (pagoError || !pago) {
      return { success: false, message: 'Pago consolidado no encontrado' };
    }

    const { data: distribucion, error: distError } = await supabase
      .from('pagos_consolidados_distribucion')
      .select('*')
      .eq('pago_consolidado_id', pagoConsolidadoId)
      .order('created_at', { ascending: true });

    if (distError) {
      console.error('[PAGOS-CONSOLIDADOS] Error obteniendo distribución:', distError);
    }

    return {
      success: true,
      data: {
        ...pago,
        distribucion: distribucion || [],
      },
    };
  } catch (error) {
    console.error('[PAGOS-CONSOLIDADOS] Error:', error);
    return { success: false, message: 'Error inesperado' };
  }
}

/**
 * Validar un pago consolidado (rol finanzas)
 */
export async function validarPagoConsolidado(
  pagoConsolidadoId: string,
  usuarioId: string
): Promise<{ success: boolean; message?: string }> {
  const supabase = await getSupabase();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'No autenticado' };
    }

    // Validar rol finanzas
    const { data: userData } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', usuarioId)
      .single();

    if (!userData || userData.rol !== 'finanzas') {
      return { success: false, message: 'Solo el rol Finanzas puede validar pagos' };
    }

    // Validar que esté pendiente
    const { data: pago } = await supabase
      .from('pagos_consolidados')
      .select('estado')
      .eq('id', pagoConsolidadoId)
      .single();

    if (!pago || pago.estado !== 'pendiente') {
      return { success: false, message: 'El pago ya fue procesado' };
    }

    // Actualizar estado
    const { error } = await supabase
      .from('pagos_consolidados')
      .update({
        estado: 'validado',
        validado_por: usuarioId,
        fecha_validacion: new Date().toISOString(),
      })
      .eq('id', pagoConsolidadoId);

    if (error) {
      console.error('[PAGOS-CONSOLIDADOS] Error validando:', error);
      return { success: false, message: 'Error al validar el pago' };
    }

    return { success: true, message: 'Pago validado exitosamente' };
  } catch (error) {
    console.error('[PAGOS-CONSOLIDADOS] Error:', error);
    return { success: false, message: 'Error inesperado' };
  }
}
