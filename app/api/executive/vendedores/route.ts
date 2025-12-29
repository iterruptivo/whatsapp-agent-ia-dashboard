import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/executive/vendedores
 *
 * Ranking de vendedores por productividad
 * Query params: ?proyecto_id=uuid (opcional)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "vendedor_id": "uuid",
 *       "vendedor": "Juan Pérez",
 *       "leads_asignados": 450,
 *       "leads_visitaron": 180,
 *       "ventas_cerradas": 25,
 *       "monto_total": 680000,
 *       "comisiones_pendientes": 34000,
 *       "tasa_conversion": 5.56
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const searchParams = request.nextUrl.searchParams;
    const proyectoId = searchParams.get('proyecto_id');

    // Obtener usuarios activos con roles de vendedor
    const { data: usuarios, error: usuariosError } = await supabase
      .from('usuarios')
      .select('id, nombre, rol')
      .in('rol', ['vendedor', 'vendedor_caseta', 'jefe_ventas'])
      .eq('activo', true);

    if (usuariosError) {
      console.error('Error fetching usuarios:', usuariosError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener usuarios' },
        { status: 500 }
      );
    }

    if (!usuarios || usuarios.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Obtener datos de leads por vendedor
    let leadsQuery = supabase
      .from('leads')
      .select('vendedor_asignado_id, asistio');

    if (proyectoId) {
      leadsQuery = leadsQuery.eq('proyecto_id', proyectoId);
    }

    const { data: leads, error: leadsError } = await leadsQuery;

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener leads' },
        { status: 500 }
      );
    }

    // Obtener datos de locales vendidos por vendedor
    let localesQuery = supabase
      .from('locales')
      .select('vendedor_cerro_venta_id, monto_venta')
      .eq('estado', 'rojo');

    if (proyectoId) {
      localesQuery = localesQuery.eq('proyecto_id', proyectoId);
    }

    const { data: locales, error: localesError } = await localesQuery;

    if (localesError) {
      console.error('Error fetching locales:', localesError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener locales' },
        { status: 500 }
      );
    }

    // Obtener comisiones pendientes por usuario
    const { data: comisiones, error: comisionesError } = await supabase
      .from('comisiones')
      .select('usuario_id, monto_comision')
      .eq('estado', 'disponible');

    if (comisionesError) {
      console.error('Error fetching comisiones:', comisionesError);
    }

    // Procesar datos por vendedor
    const ranking = usuarios.map(usuario => {
      // Leads asignados a este vendedor
      const leadsAsignados = (leads || []).filter(l => l.vendedor_asignado_id === usuario.id);
      const leads_asignados = leadsAsignados.length;
      const leads_visitaron = leadsAsignados.filter(l => l.asistio === true).length;

      // Locales vendidos por este vendedor
      const ventasVendedor = (locales || []).filter(l => l.vendedor_cerro_venta_id === usuario.id);
      const ventas_cerradas = ventasVendedor.length;
      const monto_total = ventasVendedor.reduce((sum, l) => sum + (l.monto_venta || 0), 0);

      // Comisiones pendientes
      const comisionesVendedor = (comisiones || []).filter(c => c.usuario_id === usuario.id);
      const comisiones_pendientes = comisionesVendedor.reduce((sum, c) => sum + (c.monto_comision || 0), 0);

      // Tasa de conversión (ventas / leads asignados)
      const tasa_conversion = leads_asignados > 0
        ? parseFloat(((ventas_cerradas / leads_asignados) * 100).toFixed(2))
        : 0;

      return {
        vendedor_id: usuario.id,
        vendedor: usuario.nombre,
        leads_asignados,
        leads_visitaron,
        ventas_cerradas,
        monto_total,
        comisiones_pendientes,
        tasa_conversion,
      };
    });

    // Ordenar por monto total descendente
    ranking.sort((a, b) => b.monto_total - a.monto_total);

    return NextResponse.json({
      success: true,
      data: ranking,
    });

  } catch (error) {
    console.error('Error en GET /api/executive/vendedores:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener ranking de vendedores' },
      { status: 500 }
    );
  }
}
