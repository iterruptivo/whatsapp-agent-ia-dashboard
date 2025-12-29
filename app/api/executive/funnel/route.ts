import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/executive/funnel
 *
 * Funnel de conversión: Captados → Completos → Visitaron → Ventas
 * Query params: ?proyecto_id=uuid (opcional)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "leads_captados": 20000,
 *     "leads_completos": 9000,
 *     "leads_visitaron": 1300,
 *     "ventas": 156,
 *     "conversion_completos": 45.0,
 *     "conversion_visitaron": 14.44,
 *     "conversion_ventas": 12.0
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const searchParams = request.nextUrl.searchParams;
    const proyectoId = searchParams.get('proyecto_id');

    // Construir query base para leads
    let leadsQuery = supabase.from('leads').select('estado, asistio');
    if (proyectoId) {
      leadsQuery = leadsQuery.eq('proyecto_id', proyectoId);
    }

    // Construir query para ventas (locales vendidos)
    let ventasQuery = supabase.from('locales').select('id', { count: 'exact', head: true }).eq('estado', 'rojo');
    if (proyectoId) {
      ventasQuery = ventasQuery.eq('proyecto_id', proyectoId);
    }

    // Ejecutar queries en paralelo
    const [leadsRes, ventasRes] = await Promise.all([
      leadsQuery,
      ventasQuery,
    ]);

    if (leadsRes.error) {
      console.error('Error fetching leads:', leadsRes.error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener datos de leads' },
        { status: 500 }
      );
    }

    if (ventasRes.error) {
      console.error('Error fetching ventas:', ventasRes.error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener datos de ventas' },
        { status: 500 }
      );
    }

    const leads = leadsRes.data || [];
    const leads_captados = leads.length;
    const leads_completos = leads.filter(l => l.estado === 'lead_completo').length;
    const leads_visitaron = leads.filter(l => l.asistio === true).length;
    const ventas = ventasRes.count || 0;

    // Calcular tasas de conversión
    const conversion_completos = leads_captados > 0
      ? parseFloat(((leads_completos / leads_captados) * 100).toFixed(2))
      : 0;

    const conversion_visitaron = leads_completos > 0
      ? parseFloat(((leads_visitaron / leads_completos) * 100).toFixed(2))
      : 0;

    const conversion_ventas = leads_visitaron > 0
      ? parseFloat(((ventas / leads_visitaron) * 100).toFixed(2))
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        leads_captados,
        leads_completos,
        leads_visitaron,
        ventas,
        conversion_completos,
        conversion_visitaron,
        conversion_ventas,
      }
    });

  } catch (error) {
    console.error('Error en GET /api/executive/funnel:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener funnel de conversión' },
      { status: 500 }
    );
  }
}
