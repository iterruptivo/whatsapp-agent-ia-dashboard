import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente Supabase con service role (para bypass RLS en API routes server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/executive/canales
 *
 * Efectividad por canal UTM
 * REGLA IMPORTANTE: Agrupar "victoria" y números puros como "Victoria (IA)"
 * Query params: ?proyecto_id=uuid (opcional)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "canal": "Victoria (IA)",
 *       "leads": 5000,
 *       "visitaron": 750,
 *       "compraron": 45,
 *       "conversion_visita": 15.0,
 *       "conversion_compra": 6.0
 *     },
 *     {
 *       "canal": "Facebook",
 *       "leads": 8000,
 *       "visitaron": 400,
 *       "compraron": 60,
 *       "conversion_visita": 5.0,
 *       "conversion_compra": 15.0
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const searchParams = request.nextUrl.searchParams;
    const proyectoId = searchParams.get('proyecto_id');

    // Obtener todos los leads
    let leadsQuery = supabase
      .from('leads')
      .select('id, utm, asistio');

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

    // Obtener relaciones local-lead de locales vendidos (tabla junction locales_leads)
    // Los locales vendidos están en estado 'rojo'
    let localesQuery = supabase
      .from('locales')
      .select('id')
      .eq('estado', 'rojo');

    if (proyectoId) {
      localesQuery = localesQuery.eq('proyecto_id', proyectoId);
    }

    const { data: localesVendidos, error: localesError } = await localesQuery;

    if (localesError) {
      console.error('Error fetching locales:', localesError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener locales vendidos' },
        { status: 500 }
      );
    }

    // Obtener los lead_ids de la tabla junction locales_leads
    const localIds = (localesVendidos || []).map(l => l.id);
    let leadIdsCompraron = new Set<string>();

    if (localIds.length > 0) {
      const { data: localLeadsData } = await supabase
        .from('locales_leads')
        .select('lead_id')
        .in('local_id', localIds)
        .not('lead_id', 'is', null);

      leadIdsCompraron = new Set((localLeadsData || []).map(ll => ll.lead_id));
    }

    // Normalizar UTM y agrupar
    const canalesMap = new Map<string, { leads: number; visitaron: number; compraron: number }>();

    (leads || []).forEach(lead => {
      // Normalizar canal según regla de Victoria
      let canal = 'Directo';

      if (lead.utm) {
        // REGLA: Victoria (IA) = 'victoria' OR número puro
        const isNumerosPuro = /^\d+$/.test(lead.utm);

        if (lead.utm.toLowerCase() === 'victoria' || isNumerosPuro) {
          canal = 'Victoria (IA)';
        } else {
          // Capitalizar primera letra
          canal = lead.utm.charAt(0).toUpperCase() + lead.utm.slice(1).toLowerCase();
        }
      }

      // Obtener o crear entrada del canal
      const current = canalesMap.get(canal) || { leads: 0, visitaron: 0, compraron: 0 };

      // Incrementar contadores
      current.leads += 1;
      if (lead.asistio === true) {
        current.visitaron += 1;
      }
      if (leadIdsCompraron.has(lead.id)) {
        current.compraron += 1;
      }

      canalesMap.set(canal, current);
    });

    // Convertir Map a array y calcular conversiones
    const canales = Array.from(canalesMap.entries()).map(([canal, stats]) => {
      const conversion_visita = stats.leads > 0
        ? parseFloat(((stats.visitaron / stats.leads) * 100).toFixed(2))
        : 0;

      const conversion_compra = stats.visitaron > 0
        ? parseFloat(((stats.compraron / stats.visitaron) * 100).toFixed(2))
        : 0;

      return {
        canal,
        leads: stats.leads,
        visitaron: stats.visitaron,
        compraron: stats.compraron,
        conversion_visita,
        conversion_compra,
      };
    });

    // Ordenar por cantidad de leads descendente
    canales.sort((a, b) => b.leads - a.leads);

    return NextResponse.json({
      success: true,
      data: canales,
    });

  } catch (error) {
    console.error('Error en GET /api/executive/canales:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener efectividad por canal' },
      { status: 500 }
    );
  }
}
