'use server';

/**
 * Server Actions for Atribución de Fichas a Victoria
 *
 * Usa directamente las Fichas de Inscripción (clientes_ficha) como fuente de verdad
 * de ventas reales, en lugar de importar ventas externas.
 *
 * LÓGICA DE ATRIBUCIÓN VICTORIA:
 * Un lead es de Victoria si cumple CUALQUIERA:
 * 1. estado está en: en_conversacion, lead_completo, lead_incompleto, conversacion_abandonada
 * 2. utm contiene "form" (case insensitive)
 * 3. utm es numérico puro (IDs de campañas Meta como "120241039661610316")
 * 4. utm contiene "victoria" (case insensitive)
 *
 * Si NO cumple ninguna → es "Otro Canal"
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE CLIENT (Service Role para bypass RLS)
// ============================================================================

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// ============================================================================
// TYPES
// ============================================================================

export interface FichasAtribucionStats {
  totalFichas: number;
  fichasVictoria: number;
  fichasOtros: number;
  porcentajeVictoria: number;
  montoVictoriaUSD: number;
  montoVictoriaPEN: number;
  montoOtrosUSD: number;
  montoOtrosPEN: number;
}

export interface FichaAtribucion {
  ficha_id: string;
  fecha_ficha: string;
  cliente_nombre: string;
  cliente_dni: string;
  local_codigo: string;
  local_id: string;
  proyecto_nombre: string;
  proyecto_id: string;
  lead_id: string;
  lead_utm: string;
  lead_estado: string;
  total_abonado_usd: number;
  total_abonado_pen: number;
  es_victoria: boolean;
  badge_label: string;
}

export interface PaginatedFichasResult {
  data: FichaAtribucion[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StatsByMonth {
  mes: string;
  victoria: number;
  otros: number;
}

// ============================================================================
// HELPER: Determinar si un lead es de Victoria
// ============================================================================

const VICTORIA_ESTADOS = [
  'en_conversacion',
  'lead_completo',
  'lead_incompleto',
  'conversacion_abandonada'
];

function esLeadVictoria(utm: string | null, estado: string | null): boolean {
  // 1. Por estado
  if (estado && VICTORIA_ESTADOS.includes(estado)) {
    return true;
  }

  if (!utm) return false;

  const utmLower = utm.toLowerCase();

  // 2. UTM contiene "form"
  if (utmLower.includes('form')) {
    return true;
  }

  // 3. UTM contiene "victoria"
  if (utmLower.includes('victoria')) {
    return true;
  }

  // 4. UTM es numérico puro (IDs de Meta)
  if (/^\d+$/.test(utm)) {
    return true;
  }

  return false;
}

function getBadgeLabel(utm: string | null, esVictoria: boolean): string {
  if (esVictoria) {
    return 'Victoria';
  }
  return utm || 'Sin UTM';
}

// ============================================================================
// GET STATS (KPIs)
// ============================================================================

export async function getFichasAtribucionStats(
  mesDesde?: string,
  mesHasta?: string,
  proyectoId?: string
): Promise<FichasAtribucionStats> {
  const supabase = getSupabaseAdmin();

  try {
    // Query base: fichas con lead vinculado
    let query = supabase
      .from('clientes_ficha')
      .select(`
        id,
        created_at,
        lead_id,
        leads!inner (
          utm,
          estado
        ),
        locales!inner (
          proyecto_id
        ),
        depositos_ficha (
          monto,
          moneda
        )
      `)
      .not('lead_id', 'is', null);

    // Filtro por proyecto
    if (proyectoId) {
      query = query.eq('locales.proyecto_id', proyectoId);
    }

    // Filtro por fecha
    if (mesDesde) {
      query = query.gte('created_at', `${mesDesde}-01`);
    }
    if (mesHasta) {
      // Último día del mes
      const [year, month] = mesHasta.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      query = query.lte('created_at', `${mesHasta}-${lastDay}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ATRIBUCION] Error getting stats:', error);
      return {
        totalFichas: 0,
        fichasVictoria: 0,
        fichasOtros: 0,
        porcentajeVictoria: 0,
        montoVictoriaUSD: 0,
        montoVictoriaPEN: 0,
        montoOtrosUSD: 0,
        montoOtrosPEN: 0
      };
    }

    const stats: FichasAtribucionStats = {
      totalFichas: data?.length || 0,
      fichasVictoria: 0,
      fichasOtros: 0,
      porcentajeVictoria: 0,
      montoVictoriaUSD: 0,
      montoVictoriaPEN: 0,
      montoOtrosUSD: 0,
      montoOtrosPEN: 0
    };

    data?.forEach((ficha: any) => {
      const lead = ficha.leads;
      const esVictoria = esLeadVictoria(lead?.utm, lead?.estado);

      // Sumar depósitos
      let montoUSD = 0;
      let montoPEN = 0;
      ficha.depositos_ficha?.forEach((dep: any) => {
        if (dep.moneda === 'USD') {
          montoUSD += dep.monto || 0;
        } else if (dep.moneda === 'PEN') {
          montoPEN += dep.monto || 0;
        }
      });

      if (esVictoria) {
        stats.fichasVictoria++;
        stats.montoVictoriaUSD += montoUSD;
        stats.montoVictoriaPEN += montoPEN;
      } else {
        stats.fichasOtros++;
        stats.montoOtrosUSD += montoUSD;
        stats.montoOtrosPEN += montoPEN;
      }
    });

    stats.porcentajeVictoria = stats.totalFichas > 0
      ? Math.round((stats.fichasVictoria / stats.totalFichas) * 1000) / 10
      : 0;

    return stats;

  } catch (error) {
    console.error('[ATRIBUCION] Error in getFichasAtribucionStats:', error);
    return {
      totalFichas: 0,
      fichasVictoria: 0,
      fichasOtros: 0,
      porcentajeVictoria: 0,
      montoVictoriaUSD: 0,
      montoVictoriaPEN: 0,
      montoOtrosUSD: 0,
      montoOtrosPEN: 0
    };
  }
}

// ============================================================================
// GET FICHAS PAGINATED
// ============================================================================

export async function getFichasAtribucionPaginated(
  matchType: 'victoria' | 'otros' | 'all',
  page: number = 1,
  pageSize: number = 20,
  mesDesde?: string,
  mesHasta?: string,
  proyectoId?: string,
  clienteSearch?: string
): Promise<PaginatedFichasResult> {
  const supabase = getSupabaseAdmin();

  try {
    // Query base
    let query = supabase
      .from('clientes_ficha')
      .select(`
        id,
        created_at,
        lead_id,
        titular_nombres,
        titular_apellido_paterno,
        titular_apellido_materno,
        titular_numero_documento,
        local_id,
        leads!inner (
          id,
          utm,
          estado
        ),
        locales!inner (
          id,
          codigo,
          proyecto_id,
          proyectos!inner (
            id,
            nombre
          )
        ),
        depositos_ficha (
          monto,
          moneda
        )
      `, { count: 'exact' })
      .not('lead_id', 'is', null)
      .order('created_at', { ascending: false });

    // Filtro por proyecto
    if (proyectoId) {
      query = query.eq('locales.proyecto_id', proyectoId);
    }

    // Filtro por fecha
    if (mesDesde) {
      query = query.gte('created_at', `${mesDesde}-01`);
    }
    if (mesHasta) {
      const [year, month] = mesHasta.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      query = query.lte('created_at', `${mesHasta}-${lastDay}T23:59:59`);
    }

    // Búsqueda por cliente
    if (clienteSearch && clienteSearch.trim()) {
      const search = clienteSearch.trim();
      query = query.or(`titular_nombres.ilike.%${search}%,titular_apellido_paterno.ilike.%${search}%,titular_numero_documento.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[ATRIBUCION] Error getting fichas:', error);
      return {
        data: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }

    // Procesar y filtrar por matchType
    let processed: FichaAtribucion[] = (data || []).map((ficha: any) => {
      const lead = ficha.leads;
      const local = ficha.locales;
      const proyecto = local?.proyectos;

      const esVictoria = esLeadVictoria(lead?.utm, lead?.estado);

      // Sumar depósitos
      let totalUSD = 0;
      let totalPEN = 0;
      ficha.depositos_ficha?.forEach((dep: any) => {
        if (dep.moneda === 'USD') {
          totalUSD += dep.monto || 0;
        } else if (dep.moneda === 'PEN') {
          totalPEN += dep.monto || 0;
        }
      });

      const nombreCompleto = [
        ficha.titular_nombres,
        ficha.titular_apellido_paterno,
        ficha.titular_apellido_materno
      ].filter(Boolean).join(' ');

      return {
        ficha_id: ficha.id,
        fecha_ficha: ficha.created_at,
        cliente_nombre: nombreCompleto || 'Sin nombre',
        cliente_dni: ficha.titular_numero_documento || '',
        local_codigo: local?.codigo || '',
        local_id: local?.id || '',
        proyecto_nombre: proyecto?.nombre || '',
        proyecto_id: proyecto?.id || '',
        lead_id: lead?.id || '',
        lead_utm: lead?.utm || '',
        lead_estado: lead?.estado || '',
        total_abonado_usd: totalUSD,
        total_abonado_pen: totalPEN,
        es_victoria: esVictoria,
        badge_label: getBadgeLabel(lead?.utm, esVictoria)
      };
    });

    // Filtrar por matchType
    if (matchType === 'victoria') {
      processed = processed.filter(f => f.es_victoria);
    } else if (matchType === 'otros') {
      processed = processed.filter(f => !f.es_victoria);
    }

    const totalCount = processed.length;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Paginar
    const startIndex = (page - 1) * pageSize;
    const paginatedData = processed.slice(startIndex, startIndex + pageSize);

    return {
      data: paginatedData,
      totalCount,
      page,
      pageSize,
      totalPages
    };

  } catch (error) {
    console.error('[ATRIBUCION] Error in getFichasAtribucionPaginated:', error);
    return {
      data: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }
}

// ============================================================================
// GET STATS BY MONTH (Para gráficos)
// ============================================================================

export async function getFichasAtribucionByMonth(
  mesDesde?: string,
  mesHasta?: string,
  proyectoId?: string
): Promise<StatsByMonth[]> {
  const supabase = getSupabaseAdmin();

  try {
    let query = supabase
      .from('clientes_ficha')
      .select(`
        created_at,
        leads!inner (
          utm,
          estado
        ),
        locales!inner (
          proyecto_id
        )
      `)
      .not('lead_id', 'is', null);

    if (proyectoId) {
      query = query.eq('locales.proyecto_id', proyectoId);
    }

    if (mesDesde) {
      query = query.gte('created_at', `${mesDesde}-01`);
    }
    if (mesHasta) {
      const [year, month] = mesHasta.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      query = query.lte('created_at', `${mesHasta}-${lastDay}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ATRIBUCION] Error getting stats by month:', error);
      return [];
    }

    // Agrupar por mes
    const byMonth = new Map<string, { victoria: number; otros: number }>();

    data?.forEach((ficha: any) => {
      const fecha = new Date(ficha.created_at);
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

      if (!byMonth.has(mes)) {
        byMonth.set(mes, { victoria: 0, otros: 0 });
      }

      const stats = byMonth.get(mes)!;
      const lead = ficha.leads;

      if (esLeadVictoria(lead?.utm, lead?.estado)) {
        stats.victoria++;
      } else {
        stats.otros++;
      }
    });

    // Convertir a array y ordenar
    return Array.from(byMonth.entries())
      .map(([mes, stats]) => ({ mes, ...stats }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

  } catch (error) {
    console.error('[ATRIBUCION] Error in getFichasAtribucionByMonth:', error);
    return [];
  }
}

// ============================================================================
// EXPORT (Para Excel - sin paginación)
// ============================================================================

export async function getFichasAtribucionExport(
  matchType: 'victoria' | 'otros' | 'all',
  mesDesde?: string,
  mesHasta?: string,
  proyectoId?: string
): Promise<FichaAtribucion[]> {
  // Usar la función paginada con un pageSize muy grande
  const result = await getFichasAtribucionPaginated(
    matchType,
    1,
    10000, // Sin límite práctico
    mesDesde,
    mesHasta,
    proyectoId
  );

  return result.data;
}
