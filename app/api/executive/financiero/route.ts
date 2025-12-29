import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente Supabase con service role (para bypass RLS en API routes server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/executive/financiero
 *
 * Salud financiera: Morosidad, inicial pendiente, proyección de cobros
 * Query params: ?proyecto_id=uuid (opcional)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "morosidad": {
 *       "pagos_vencidos": 45,
 *       "monto_vencido": 127500,
 *       "clientes_morosos": 12,
 *       "porcentaje_morosidad": 8.5
 *     },
 *     "inicial_pendiente": {
 *       "cantidad": 23,
 *       "monto_total": 450000
 *     },
 *     "proyeccion_mes": {
 *       "pagos_esperados": 67,
 *       "monto_esperado": 320000
 *     }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const searchParams = request.nextUrl.searchParams;
    const proyectoId = searchParams.get('proyecto_id');

    // Obtener todos los controles de pago
    // Nota: inicial_pagado se calcula como (monto_inicial - inicial_restante)
    let controlPagosQuery = supabase
      .from('control_pagos')
      .select('id, proyecto_id, monto_inicial, inicial_restante');

    if (proyectoId) {
      controlPagosQuery = controlPagosQuery.eq('proyecto_id', proyectoId);
    }

    const { data: controlesData, error: controlesError } = await controlPagosQuery;

    if (controlesError) {
      console.error('Error fetching control_pagos:', controlesError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener controles de pago' },
        { status: 500 }
      );
    }

    // Calcular inicial_pagado a partir de monto_inicial - inicial_restante
    const controles = (controlesData || []).map(c => ({
      ...c,
      inicial_pagado: (c.monto_inicial || 0) - (c.inicial_restante || 0)
    }));

    // Obtener todos los pagos
    let pagosQuery = supabase
      .from('pagos_local')
      .select('control_pago_id, estado, fecha_esperada, monto_esperado, monto_abonado');

    const { data: pagosData, error: pagosError } = await pagosQuery;

    if (pagosError) {
      console.error('Error fetching pagos_local:', pagosError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener pagos' },
        { status: 500 }
      );
    }

    // Filtrar pagos por control_pago_id si estamos filtrando por proyecto
    const controlIds = new Set(controles.map(c => c.id));
    const pagos = (pagosData || []).filter(p =>
      !proyectoId || controlIds.has(p.control_pago_id)
    );

    // Fecha actual
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Calcular fin de mes
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    finMes.setHours(23, 59, 59, 999);

    // MOROSIDAD: Pagos vencidos (pendientes o parciales con fecha pasada)
    const pagosVencidos = pagos.filter(p => {
      if (p.estado !== 'pendiente' && p.estado !== 'parcial') return false;
      if (!p.fecha_esperada) return false;
      const fechaPago = new Date(p.fecha_esperada);
      return fechaPago < hoy;
    });

    const pagos_vencidos_count = pagosVencidos.length;
    const monto_vencido = pagosVencidos.reduce((sum, p) => {
      const pendiente = (p.monto_esperado || 0) - (p.monto_abonado || 0);
      return sum + pendiente;
    }, 0);

    // Contar clientes morosos (control_pago_id únicos)
    const clientesMorososSet = new Set(pagosVencidos.map(p => p.control_pago_id));
    const clientes_morosos = clientesMorososSet.size;

    // Porcentaje de morosidad (clientes morosos / total clientes)
    const total_clientes = controles.length;
    const porcentaje_morosidad = total_clientes > 0
      ? parseFloat(((clientes_morosos / total_clientes) * 100).toFixed(2))
      : 0;

    // INICIAL PENDIENTE
    // inicial_restante > 0 significa que aún queda por pagar del inicial
    const inicialesPendientes = controles.filter(c => {
      const restante = c.inicial_restante || 0;
      return restante > 0;
    });

    const inicial_pendiente_cantidad = inicialesPendientes.length;
    const inicial_pendiente_monto = inicialesPendientes.reduce((sum, c) => {
      // inicial_restante es directamente el monto pendiente
      return sum + (c.inicial_restante || 0);
    }, 0);

    // PROYECCIÓN DE COBROS DEL MES
    const pagosEsteMes = pagos.filter(p => {
      if (p.estado === 'pagado') return false;
      if (!p.fecha_esperada) return false;
      const fechaPago = new Date(p.fecha_esperada);
      return fechaPago >= hoy && fechaPago <= finMes;
    });

    const proyeccion_pagos = pagosEsteMes.length;
    const proyeccion_monto = pagosEsteMes.reduce((sum, p) => {
      const pendiente = (p.monto_esperado || 0) - (p.monto_abonado || 0);
      return sum + pendiente;
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        morosidad: {
          pagos_vencidos: pagos_vencidos_count,
          monto_vencido: Math.round(monto_vencido),
          clientes_morosos,
          porcentaje_morosidad,
        },
        inicial_pendiente: {
          cantidad: inicial_pendiente_cantidad,
          monto_total: Math.round(inicial_pendiente_monto),
        },
        proyeccion_mes: {
          pagos_esperados: proyeccion_pagos,
          monto_esperado: Math.round(proyeccion_monto),
        },
      }
    });

  } catch (error) {
    console.error('Error en GET /api/executive/financiero:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener salud financiera' },
      { status: 500 }
    );
  }
}
