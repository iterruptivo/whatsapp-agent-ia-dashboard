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
}

export interface PagoConAbonos extends PagoLocal {
  abonos: AbonoPago[];
}

export interface PagoStats {
  inicial: {
    esperado: number;
    abonado: number;
    porcentaje: number;
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
    const { data: pagos } = await supabase
      .from('pagos_local')
      .select('*')
      .eq('control_pago_id', controlPagoId);

    if (!pagos || pagos.length === 0) {
      return {
        inicial: { esperado: 0, abonado: 0, porcentaje: 0, estado: 'pendiente' },
        cuotas: { total: 0, pagadas: 0, parciales: 0, pendientes: 0, vencidas: 0, proximaFecha: null },
      };
    }

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

    return {
      inicial: {
        esperado: pagoInicial?.monto_esperado || 0,
        abonado: pagoInicial?.monto_abonado || 0,
        porcentaje: pagoInicial
          ? Math.round((pagoInicial.monto_abonado / pagoInicial.monto_esperado) * 100)
          : 0,
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
    };
  } catch (error) {
    console.error('[PAGOS] Error obteniendo stats:', error);
    return {
      inicial: { esperado: 0, abonado: 0, porcentaje: 0, estado: 'pendiente' },
      cuotas: { total: 0, pagadas: 0, parciales: 0, pendientes: 0, vencidas: 0, proximaFecha: null },
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
    if (data.monto > montoRestante) {
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
      const { error } = await supabase
        .from('abonos_pago')
        .delete()
        .eq('pago_id', data.pagoId);

      if (error) {
        console.error('[PAGOS] Error desmarcando separación:', error);
        return { success: false, message: 'Error al desmarcar' };
      }

      return { success: true, message: 'Separación marcada como NO pagada' };
    }
  } catch (error) {
    console.error('[PAGOS] Error en toggleSeparacionPagada:', error);
    return { success: false, message: 'Error inesperado' };
  }
}
