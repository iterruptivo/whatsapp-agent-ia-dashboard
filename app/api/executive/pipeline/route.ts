import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/executive/pipeline
 *
 * Pipeline por estado de locales (sistema de semáforo)
 * Query params: ?proyecto_id=uuid (opcional)
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     { "estado": "verde", "cantidad": 500, "valor_total": 27500000 },
 *     { "estado": "amarillo", "cantidad": 120, "valor_total": 6600000 },
 *     { "estado": "naranja", "cantidad": 47, "valor_total": 2585000 },
 *     { "estado": "rojo", "cantidad": 156, "valor_total": 8580000 }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const searchParams = request.nextUrl.searchParams;
    const proyectoId = searchParams.get('proyecto_id');

    // Construir query para locales
    let localesQuery = supabase
      .from('locales')
      .select('estado, monto_venta, precio_base');

    if (proyectoId) {
      localesQuery = localesQuery.eq('proyecto_id', proyectoId);
    }

    const { data: locales, error } = await localesQuery;

    if (error) {
      console.error('Error fetching locales:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener datos de locales' },
        { status: 500 }
      );
    }

    // Agrupar por estado y calcular valores
    const estadosMap = new Map<string, { cantidad: number; valor_total: number }>();

    // Inicializar todos los estados
    ['verde', 'amarillo', 'naranja', 'rojo'].forEach(estado => {
      estadosMap.set(estado, { cantidad: 0, valor_total: 0 });
    });

    // Procesar locales
    (locales || []).forEach(local => {
      const estado = local.estado || 'verde';
      const valor = local.monto_venta || local.precio_base || 0;

      const current = estadosMap.get(estado) || { cantidad: 0, valor_total: 0 };
      estadosMap.set(estado, {
        cantidad: current.cantidad + 1,
        valor_total: current.valor_total + valor,
      });
    });

    // Convertir Map a array con orden específico
    const ordenEstados = ['verde', 'amarillo', 'naranja', 'rojo'];
    const pipeline = ordenEstados.map(estado => ({
      estado,
      cantidad: estadosMap.get(estado)?.cantidad || 0,
      valor_total: estadosMap.get(estado)?.valor_total || 0,
    }));

    return NextResponse.json({
      success: true,
      data: pipeline,
    });

  } catch (error) {
    console.error('Error en GET /api/executive/pipeline:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener pipeline de locales' },
      { status: 500 }
    );
  }
}
