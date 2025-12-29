import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/executive/summary
 *
 * KPIs principales del dashboard ejecutivo
 * Query params: ?proyecto_id=uuid (opcional)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "total_leads": 20000,
 *     "leads_completos": 9000,
 *     "leads_visitaron": 1300,
 *     "locales_vendidos": 156,
 *     "revenue_total": 8700000,
 *     "total_locales": 823,
 *     "tasa_conversion": 0.78,
 *     "promedio_venta": 55769
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const searchParams = request.nextUrl.searchParams;
    const proyectoId = searchParams.get('proyecto_id');

    // Query para KPIs principales
    const query = `
      SELECT
        (SELECT COUNT(*) FROM leads WHERE ${proyectoId ? `proyecto_id = '${proyectoId}'` : '1=1'}) as total_leads,
        (SELECT COUNT(*) FROM leads WHERE ${proyectoId ? `proyecto_id = '${proyectoId}' AND` : ''} estado = 'lead_completo') as leads_completos,
        (SELECT COUNT(*) FROM leads WHERE ${proyectoId ? `proyecto_id = '${proyectoId}' AND` : ''} asistio = true) as leads_visitaron,
        (SELECT COUNT(*) FROM locales WHERE ${proyectoId ? `proyecto_id = '${proyectoId}' AND` : ''} estado = 'rojo') as locales_vendidos,
        (SELECT COALESCE(SUM(monto_venta), 0) FROM locales WHERE ${proyectoId ? `proyecto_id = '${proyectoId}' AND` : ''} estado = 'rojo') as revenue_total,
        (SELECT COUNT(*) FROM locales WHERE ${proyectoId ? `proyecto_id = '${proyectoId}'` : '1=1'}) as total_locales
    `;

    const { data, error } = await supabase.rpc('execute_sql', { sql: query }).single();

    // Type assertion for the RPC result
    interface RPCResult {
      total_leads: number;
      leads_completos: number;
      leads_visitaron: number;
      locales_vendidos: number;
      revenue_total: number;
      total_locales: number;
    }

    if (error) {
      // Fallback: usar queries individuales
      const [leadsRes, leadsCompletosRes, leadsVisitaronRes, vendidosRes, revenueRes, localesRes] = await Promise.all([
        proyectoId
          ? supabase.from('leads').select('id', { count: 'exact', head: true }).eq('proyecto_id', proyectoId)
          : supabase.from('leads').select('id', { count: 'exact', head: true }),
        proyectoId
          ? supabase.from('leads').select('id', { count: 'exact', head: true }).eq('proyecto_id', proyectoId).eq('estado', 'lead_completo')
          : supabase.from('leads').select('id', { count: 'exact', head: true }).eq('estado', 'lead_completo'),
        proyectoId
          ? supabase.from('leads').select('id', { count: 'exact', head: true }).eq('proyecto_id', proyectoId).eq('asistio', true)
          : supabase.from('leads').select('id', { count: 'exact', head: true }).eq('asistio', true),
        proyectoId
          ? supabase.from('locales').select('id', { count: 'exact', head: true }).eq('proyecto_id', proyectoId).eq('estado', 'rojo')
          : supabase.from('locales').select('id', { count: 'exact', head: true }).eq('estado', 'rojo'),
        proyectoId
          ? supabase.from('locales').select('monto_venta').eq('proyecto_id', proyectoId).eq('estado', 'rojo')
          : supabase.from('locales').select('monto_venta').eq('estado', 'rojo'),
        proyectoId
          ? supabase.from('locales').select('id', { count: 'exact', head: true }).eq('proyecto_id', proyectoId)
          : supabase.from('locales').select('id', { count: 'exact', head: true }),
      ]);

      const total_leads = leadsRes.count || 0;
      const leads_completos = leadsCompletosRes.count || 0;
      const leads_visitaron = leadsVisitaronRes.count || 0;
      const locales_vendidos = vendidosRes.count || 0;
      const revenue_total = revenueRes.data?.reduce((sum, item) => sum + (item.monto_venta || 0), 0) || 0;
      const total_locales = localesRes.count || 0;

      const tasa_conversion = total_leads > 0 ? ((locales_vendidos / total_leads) * 100).toFixed(2) : '0.00';
      const promedio_venta = locales_vendidos > 0 ? Math.round(revenue_total / locales_vendidos) : 0;

      return NextResponse.json({
        success: true,
        data: {
          total_leads,
          leads_completos,
          leads_visitaron,
          locales_vendidos,
          revenue_total,
          total_locales,
          tasa_conversion: parseFloat(tasa_conversion),
          promedio_venta,
        }
      });
    }

    // Si RPC funcionó
    const rpcData = data as RPCResult;
    const tasa_conversion = rpcData.total_leads > 0 ? ((rpcData.locales_vendidos / rpcData.total_leads) * 100).toFixed(2) : '0.00';
    const promedio_venta = rpcData.locales_vendidos > 0 ? Math.round(rpcData.revenue_total / rpcData.locales_vendidos) : 0;

    return NextResponse.json({
      success: true,
      data: {
        ...rpcData,
        tasa_conversion: parseFloat(tasa_conversion),
        promedio_venta,
      }
    });

  } catch (error) {
    console.error('Error en GET /api/executive/summary:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener KPIs principales' },
      { status: 500 }
    );
  }
}
