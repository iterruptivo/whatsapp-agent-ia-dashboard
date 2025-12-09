'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface PagoLocal {
  id: string;
  control_pago_id: string;
  tipo: 'separacion' | 'inicial' | 'cuota';
  numero_cuota: number | null;
  monto_esperado: number;
  monto_abonado: number;
  fecha_esperada: string;
  estado: 'pendiente' | 'parcial' | 'completado' | 'vencido';
  fue_desmarcado: boolean;
  created_at: string;
  updated_at: string;
}

export interface AbonoPago {
  id: string;
  pago_id: string;
  monto: number;
  fecha_abono: string;
  metodo_pago: string;
  comprobante_url: string | null;
  notas: string | null;
  registrado_por: string;
  created_at: string;
  // Campos de verificación por Finanzas
  verificado_finanzas: boolean;
  verificado_finanzas_por: string | null;
  verificado_finanzas_at: string | null;
  verificado_finanzas_nombre: string | null;
}

export interface PagoConAbonos extends PagoLocal {
  abonos: AbonoPago[];
}

export interface PagoStats {
  separacion: {
    esperado: number;
    abonado: number;
    estado: string;
  };
  inicial: {
    esperado: number;
    abonado: number;
    estado: string;
  };
  cuotas: {
    total: number;
    pagadas: number;
    parciales: number;
    pendientes: number;
    vencidas: number;
    proximaFecha: string | null;
  };
  totalVenta: number;
  totalAbonado: number;
  totalIntereses: number;
}

export async function getPagosLocal(controlPagoId: string): Promise<PagoConAbonos[]> {
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
    const { data: pagos, error: pagosError } = await supabase
      .from('pagos_local')
      .select('*')
      .eq('control_pago_id', controlPagoId)
      .order('fecha_esperada', { ascending: true });

    if (pagosError) {
      console.error('[PAGOS] Error obteniendo pagos:', pagosError);
      return [];
    }

    const pagosConAbonos: PagoConAbonos[] = await Promise.all(
      (pagos || []).map(async (pago) => {
        const { data: abonos } = await supabase
          .from('abonos_pago')
          .select('*')
          .eq('pago_id', pago.id)
          .order('fecha_abono', { ascending: false });

        return {
          ...pago,
          abonos: abonos || [],
        };
      })
    );

    return pagosConAbonos;
  } catch (error) {
    console.error('[PAGOS] Error:', error);
    return [];
  }
}

export async function getPagoStats(controlPagoId: string): Promise<PagoStats> {
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
    // Query: pagos + control_pagos (para obtener monto_venta)
    const [
      { data: pagos },
      { data: controlPago }
    ] = await Promise.all([
      supabase
        .from('pagos_local')
        .select('*')
        .eq('control_pago_id', controlPagoId),
      supabase
        .from('control_pagos')
        .select('monto_venta')
        .eq('id', controlPagoId)
        .single()
    ]);

    const totalVenta = controlPago?.monto_venta || 0;

    if (!pagos || pagos.length === 0) {
      return {
        separacion: { esperado: 0, abonado: 0, estado: 'pendiente' },
        inicial: { esperado: 0, abonado: 0, estado: 'pendiente' },
        cuotas: { total: 0, pagadas: 0, parciales: 0, pendientes: 0, vencidas: 0, proximaFecha: null },
        totalVenta,
        totalAbonado: 0,
        totalIntereses: 0,
      };
    }

    const pagoSeparacion = pagos.find(p => p.tipo === 'separacion');
    const pagoInicial = pagos.find(p => p.tipo === 'inicial');
    const cuotas = pagos.filter(p => p.tipo === 'cuota');

    const hoy = new Date().toISOString().split('T')[0];
    const cuotasPagadas = cuotas.filter(c => c.estado === 'completado').length;
    const cuotasParciales = cuotas.filter(c => c.estado === 'parcial').length;
    const cuotasPendientes = cuotas.filter(c => c.estado === 'pendiente' && c.fecha_esperada >= hoy).length;
    const cuotasVencidas = cuotas.filter(c =>
      (c.estado === 'pendiente' || c.estado === 'parcial') && c.fecha_esperada < hoy
    ).length;

    const cuotasPendientesOrdenadas = cuotas.filter(c => c.estado === 'pendiente' && c.fecha_esperada >= hoy);
    const proximaFecha = cuotasPendientesOrdenadas.length > 0 ? cuotasPendientesOrdenadas[0].fecha_esperada : null;

    // Calcular total intereses (solo de cuotas)
    const totalIntereses = cuotas.reduce((sum, c) => sum + (c.interes_esperado || 0), 0);

    // Calcular total abonado (separación + inicial + cuotas)
    const totalAbonado =
      (pagoSeparacion?.monto_abonado || 0) +
      (pagoInicial?.monto_abonado || 0) +
      cuotas.reduce((sum, c) => sum + c.monto_abonado, 0);

    return {
      separacion: {
        esperado: pagoSeparacion?.monto_esperado || 0,
        abonado: pagoSeparacion?.monto_abonado || 0,
        estado: pagoSeparacion?.estado || 'pendiente',
      },
      inicial: {
        esperado: pagoInicial?.monto_esperado || 0,
        abonado: pagoInicial?.monto_abonado || 0,
        estado: pagoInicial?.estado || 'pendiente',
      },
      cuotas: {
        total: cuotas.length,
        pagadas: cuotasPagadas,
        parciales: cuotasParciales,
        pendientes: cuotasPendientes,
        vencidas: cuotasVencidas,
        proximaFecha,
      },
      totalVenta,
      totalAbonado,
      totalIntereses,
    };
  } catch (error) {
    console.error('[PAGOS] Error obteniendo stats:', error);
    return {
      separacion: { esperado: 0, abonado: 0, estado: 'pendiente' },
      inicial: { esperado: 0, abonado: 0, estado: 'pendiente' },
      cuotas: { total: 0, pagadas: 0, parciales: 0, pendientes: 0, vencidas: 0, proximaFecha: null },
      totalVenta: 0,
      totalAbonado: 0,
      totalIntereses: 0,
    };
  }
}

export async function registrarAbono(data: {
  pagoId: string;
  monto: number;
  fechaAbono: string;
  metodoPago: string;
  comprobanteUrl?: string;
  notas?: string;
  registradoPor: string;
}) {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'No autenticado' };
    }

    if (data.monto <= 0) {
      return { success: false, message: 'El monto debe ser mayor a 0' };
    }

    const { data: pago } = await supabase
      .from('pagos_local')
      .select('monto_esperado, monto_abonado')
      .eq('id', data.pagoId)
      .single();

    if (!pago) {
      return { success: false, message: 'Pago no encontrado' };
    }

    const montoRestante = pago.monto_esperado - pago.monto_abonado;

    // Redondear a centavos (2 decimales) para evitar errores de punto flotante
    const montoCentavos = Math.round(data.monto * 100);
    const restanteCentavos = Math.round(montoRestante * 100);

    if (montoCentavos > restanteCentavos) {
      return {
        success: false,
        message: `El monto excede lo que falta pagar ($${montoRestante.toFixed(2)})`
      };
    }

    const { error } = await supabase
      .from('abonos_pago')
      .insert({
        pago_id: data.pagoId,
        monto: data.monto,
        fecha_abono: data.fechaAbono,
        metodo_pago: data.metodoPago,
        comprobante_url: data.comprobanteUrl || null,
        notas: data.notas || null,
        registrado_por: data.registradoPor,
      });

    if (error) {
      console.error('[PAGOS] Error registrando abono:', error);
      return { success: false, message: 'Error al registrar abono' };
    }

    return { success: true, message: 'Abono registrado exitosamente' };
  } catch (error) {
    console.error('[PAGOS] Error:', error);
    return { success: false, message: 'Error inesperado al registrar abono' };
  }
}

export async function toggleSeparacionPagada(data: {
  pagoId: string;
  pagado: boolean;
  usuarioId: string;
  montoSeparacion: number;
}) {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'No autenticado' };
    }

    if (data.pagado) {
      const { data: abonos } = await supabase
        .from('abonos_pago')
        .select('*')
        .eq('pago_id', data.pagoId);

      if (abonos && abonos.length > 0) {
        return { success: false, message: 'La separación ya tiene abonos registrados' };
      }

      const { error } = await supabase
        .from('abonos_pago')
        .insert({
          pago_id: data.pagoId,
          monto: data.montoSeparacion,
          fecha_abono: new Date().toISOString().split('T')[0],
          metodo_pago: 'Efectivo',
          notas: 'Separación marcada como pagada',
          registrado_por: data.usuarioId,
        });

      if (error) {
        console.error('[PAGOS] Error marcando separación como pagada:', error);
        return { success: false, message: 'Error al marcar como pagado' };
      }

      return { success: true, message: 'Separación marcada como pagada' };
    } else {
      // Eliminar abonos
      const { error: deleteError } = await supabase
        .from('abonos_pago')
        .delete()
        .eq('pago_id', data.pagoId);

      if (deleteError) {
        console.error('[PAGOS] Error desmarcando separación:', deleteError);
        return { success: false, message: 'Error al desmarcar' };
      }

      // UPDATE manual: resetear monto_abonado, estado y marcar fue_desmarcado
      // El trigger solo se dispara en INSERT, no en DELETE
      const { error: updateError } = await supabase
        .from('pagos_local')
        .update({
          monto_abonado: 0,
          estado: 'pendiente',
          fue_desmarcado: true,
        })
        .eq('id', data.pagoId);

      if (updateError) {
        console.error('[PAGOS] Error actualizando pago_local:', updateError);
        return { success: false, message: 'Error al actualizar estado del pago' };
      }

      return { success: true, message: 'Separación marcada como NO pagada' };
    }
  } catch (error) {
    console.error('[PAGOS] Error en toggleSeparacionPagada:', error);
    return { success: false, message: 'Error inesperado' };
  }
}

// Verificación de abono por Finanzas (IRREVERSIBLE)
export async function toggleVerificacionAbono(data: {
  abonoId: string;
  verificado: boolean;
  usuarioId: string;
  usuarioNombre: string;
}) {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'No autenticado' };
    }

    // Verificar que el usuario sea rol finanzas
    const { data: userData } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', data.usuarioId)
      .single();

    if (!userData || userData.rol !== 'finanzas') {
      return { success: false, message: 'Solo el rol Finanzas puede verificar abonos' };
    }

    // BLOQUEAR desverificación (acción irreversible)
    if (!data.verificado) {
      return { success: false, message: 'La verificación es irreversible y no puede deshacerse' };
    }

    // Verificar que el abono no esté ya verificado
    const { data: abonoActual } = await supabase
      .from('abonos_pago')
      .select('verificado_finanzas')
      .eq('id', data.abonoId)
      .single();

    if (abonoActual?.verificado_finanzas) {
      return { success: false, message: 'Este abono ya fue verificado' };
    }

    // Marcar como verificado - usar fecha Lima Perú
    const fechaLima = new Date().toLocaleString('en-US', { timeZone: 'America/Lima' });
    const fechaVerificacion = new Date(fechaLima).toISOString();

    const { error } = await supabase
      .from('abonos_pago')
      .update({
        verificado_finanzas: true,
        verificado_finanzas_por: data.usuarioId,
        verificado_finanzas_at: fechaVerificacion,
        verificado_finanzas_nombre: data.usuarioNombre,
      })
      .eq('id', data.abonoId);

    if (error) {
      console.error('[PAGOS] Error verificando abono:', error);
      return { success: false, message: 'Error al verificar abono' };
    }

    return { success: true, message: 'Abono verificado por Finanzas' };
  } catch (error) {
    console.error('[PAGOS] Error en toggleVerificacionAbono:', error);
    return { success: false, message: 'Error inesperado' };
  }
}
