import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/executive/proyectos
 *
 * Comparativa multi-proyecto
 * No requiere query params (siempre devuelve todos los proyectos activos)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "proyecto_id": "uuid",
 *       "proyecto": "Proyecto Trapiche",
 *       "leads": 12000,
 *       "locales_total": 500,
 *       "locales_vendidos": 95,
 *       "ocupacion_porcentaje": 19.0,
 *       "revenue": 5200000
 *     },
 *     {
 *       "proyecto_id": "uuid",
 *       "proyecto": "Proyecto Callao",
 *       "leads": 8000,
 *       "locales_total": 323,
 *       "locales_vendidos": 61,
 *       "ocupacion_porcentaje": 18.9,
 *       "revenue": 3500000
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Obtener todos los proyectos activos
    const { data: proyectos, error: proyectosError } = await supabase
      .from('proyectos')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (proyectosError) {
      console.error('Error fetching proyectos:', proyectosError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener proyectos' },
        { status: 500 }
      );
    }

    if (!proyectos || proyectos.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Obtener leads de todos los proyectos
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, proyecto_id');

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener leads' },
        { status: 500 }
      );
    }

    // Obtener locales de todos los proyectos
    const { data: locales, error: localesError } = await supabase
      .from('locales')
      .select('id, proyecto_id, estado, monto_venta');

    if (localesError) {
      console.error('Error fetching locales:', localesError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener locales' },
        { status: 500 }
      );
    }

    // Procesar datos por proyecto
    const comparativa = proyectos.map(proyecto => {
      // Contar leads del proyecto
      const leadsProyecto = (leads || []).filter(l => l.proyecto_id === proyecto.id);
      const leads_count = leadsProyecto.length;

      // Contar locales del proyecto
      const localesProyecto = (locales || []).filter(l => l.proyecto_id === proyecto.id);
      const locales_total = localesProyecto.length;

      // Contar locales vendidos
      const localesVendidos = localesProyecto.filter(l => l.estado === 'rojo');
      const locales_vendidos = localesVendidos.length;

      // Calcular revenue
      const revenue = localesVendidos.reduce((sum, l) => sum + (l.monto_venta || 0), 0);

      // Calcular porcentaje de ocupación
      const ocupacion_porcentaje = locales_total > 0
        ? parseFloat(((locales_vendidos / locales_total) * 100).toFixed(2))
        : 0;

      return {
        proyecto_id: proyecto.id,
        proyecto: proyecto.nombre,
        leads: leads_count,
        locales_total,
        locales_vendidos,
        ocupacion_porcentaje,
        revenue,
      };
    });

    // Ordenar por revenue descendente
    comparativa.sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      success: true,
      data: comparativa,
    });

  } catch (error) {
    console.error('Error en GET /api/executive/proyectos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener comparativa de proyectos' },
      { status: 500 }
    );
  }
}
