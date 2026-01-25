// =============================================================================
// SERVER ACTIONS: Dashboard con Carga Progresiva
// =============================================================================
// Descripción: Server Actions optimizadas para el dashboard principal
//              Usa COUNT queries y Promise.all para carga rápida y progresiva
//              Compatible con React Suspense y Streaming SSR
// =============================================================================

'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { unstable_cache } from 'next/cache';

// =============================================================================
// HELPER: Crear cliente Supabase con auth context
// =============================================================================

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

// =============================================================================
// INTERFACES
// =============================================================================

export interface DashboardStats {
  total: number;
  completos: number;
  incompletos: number;
  conversacion: number;
  abandonados: number;
  manuales: number;
  tasaConversion: string;
}

export interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

export interface ChartData {
  estados: ChartDataItem[];
  asistencias: ChartDataItem[];
  utm: ChartDataItem[];
}

export interface DistribucionLeads {
  total: number;
  sinAsignar: number;
  asignados: number;
  trabajados: number;
  pendientes: number;
}

export interface VendedorProductividad {
  vendedor_id: string;
  vendedor_nombre: string;
  total_leads: number;
  trabajados: number;
  pendientes: number;
  asistencias: number;
  tasa_trabajo: string;
  tasa_asistencia: string;
}

export interface ProyectoResumen {
  proyecto_id: string;
  proyecto_nombre: string;
  proyecto_color: string | null;
  total_leads: number;
  completos: number;
  incompletos: number;
  asistencias: number;
  tasa_conversion: string;
}

// =============================================================================
// 1. getDashboardStats - Stats principales del dashboard
// =============================================================================

export async function getDashboardStats(
  dateFrom: string,
  dateTo: string,
  proyectoId?: string
): Promise<DashboardStats> {
  try {
    const supabase = await createClient();

    // Construir query base con filtros de fecha
    const buildQuery = (additionalFilters?: any) => {
      let query = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('fecha_captura', dateFrom)
        .lte('fecha_captura', dateTo);

      if (proyectoId) {
        query = query.eq('proyecto_id', proyectoId);
      }

      if (additionalFilters) {
        Object.entries(additionalFilters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      return query;
    };

    // Ejecutar todos los COUNT queries en paralelo
    const [
      totalResult,
      completosResult,
      incompletosResult,
      conversacionResult,
      abandonadosResult,
      manualesResult,
    ] = await Promise.all([
      buildQuery(),
      buildQuery({ estado: 'lead_completo' }),
      buildQuery({ estado: 'lead_incompleto' }),
      buildQuery({ estado: 'en_conversacion' }),
      buildQuery({ estado: 'conversacion_abandonada' }),
      buildQuery({ utm: 'manual' }),
    ]);

    const total = totalResult.count || 0;
    const completos = completosResult.count || 0;
    const incompletos = incompletosResult.count || 0;
    const conversacion = conversacionResult.count || 0;
    const abandonados = abandonadosResult.count || 0;
    const manuales = manualesResult.count || 0;

    const tasaConversion = total > 0 ? ((completos / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      completos,
      incompletos,
      conversacion,
      abandonados,
      manuales,
      tasaConversion,
    };
  } catch (error) {
    console.error('[actions-dashboard] Error in getDashboardStats:', error);
    return {
      total: 0,
      completos: 0,
      incompletos: 0,
      conversacion: 0,
      abandonados: 0,
      manuales: 0,
      tasaConversion: '0.0',
    };
  }
}

// =============================================================================
// 2. getChartData - Datos para los 3 charts del dashboard
// =============================================================================

export async function getChartData(
  dateFrom: string,
  dateTo: string,
  proyectoId?: string
): Promise<ChartData> {
  try {
    const supabase = await createClient();

    // Query base con filtros
    const buildBaseQuery = () => {
      let query = supabase
        .from('leads')
        .select('estado_al_notificar, asistio, utm')
        .gte('fecha_captura', dateFrom)
        .lte('fecha_captura', dateTo);

      if (proyectoId) {
        query = query.eq('proyecto_id', proyectoId);
      }

      return query;
    };

    const { data, error } = await buildBaseQuery();

    if (error) {
      console.error('[actions-dashboard] Error fetching chart data:', error);
      throw error;
    }

    const leads = data || [];

    // 1. Chart de Estados (solo leads notificados)
    const leadsNotificados = leads.filter(l => l.estado_al_notificar !== null);
    const estados: ChartDataItem[] = [
      {
        name: 'Lead Completo',
        value: leadsNotificados.filter(l => l.estado_al_notificar === 'lead_completo').length,
        color: '#1b967a',
      },
      {
        name: 'Lead Incompleto',
        value: leadsNotificados.filter(l => l.estado_al_notificar === 'lead_incompleto').length,
        color: '#fbde17',
      },
      {
        name: 'En Conversación',
        value: leadsNotificados.filter(l => l.estado_al_notificar === 'en_conversacion').length,
        color: '#192c4d',
      },
      {
        name: 'Abandonado',
        value: leadsNotificados.filter(l => l.estado_al_notificar === 'conversacion_abandonada').length,
        color: '#cbd5e1',
      },
    ];

    // 2. Chart de Asistencias
    const asistencias: ChartDataItem[] = [
      {
        name: 'Asistieron',
        value: leads.filter(l => l.asistio === true).length,
        color: '#10b981',
      },
      {
        name: 'No Asistieron',
        value: leads.filter(l => l.asistio === false).length,
        color: '#ef4444',
      },
    ];

    // 3. Chart de UTM (Top 5 fuentes)
    const utmCounts = leads.reduce((acc, lead) => {
      const utm = lead.utm || 'Sin fuente';
      acc[utm] = (acc[utm] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const utmColors: Record<string, string> = {
      'facebook': '#1877f2',
      'google': '#ea4335',
      'instagram': '#e4405f',
      'manual': '#6b7280',
      'Sin fuente': '#9ca3af',
    };

    const utm: ChartDataItem[] = Object.entries(utmCounts)
      .map(([name, value]) => ({
        name,
        value,
        color: utmColors[name] || '#64748b',
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 fuentes

    return {
      estados,
      asistencias,
      utm,
    };
  } catch (error) {
    console.error('[actions-dashboard] Error in getChartData:', error);
    return {
      estados: [
        { name: 'Lead Completo', value: 0, color: '#1b967a' },
        { name: 'Lead Incompleto', value: 0, color: '#fbde17' },
        { name: 'En Conversación', value: 0, color: '#192c4d' },
        { name: 'Abandonado', value: 0, color: '#cbd5e1' },
      ],
      asistencias: [
        { name: 'Asistieron', value: 0, color: '#10b981' },
        { name: 'No Asistieron', value: 0, color: '#ef4444' },
      ],
      utm: [],
    };
  }
}

// =============================================================================
// 3. getDistribucionLeads - Stats para componente DistribucionLeads
// =============================================================================

export async function getDistribucionLeads(
  dateFrom: string,
  dateTo: string
): Promise<DistribucionLeads> {
  try {
    const supabase = await createClient();

    // Construir query base
    const buildQuery = (additionalFilters?: any) => {
      let query = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('fecha_captura', dateFrom)
        .lte('fecha_captura', dateTo);

      if (additionalFilters) {
        Object.entries(additionalFilters).forEach(([key, value]) => {
          if (value === null) {
            query = query.is(key, null);
          } else {
            query = query.eq(key, value);
          }
        });
      }

      return query;
    };

    // Ejecutar queries en paralelo
    const [
      totalResult,
      sinAsignarResult,
      asistieronResult,
    ] = await Promise.all([
      buildQuery(),
      buildQuery({ vendedor_asignado_id: null }),
      buildQuery({ asistio: true }),
    ]);

    const total = totalResult.count || 0;
    const sinAsignar = sinAsignarResult.count || 0;
    const trabajados = asistieronResult.count || 0;
    const asignados = total - sinAsignar;
    const pendientes = asignados - trabajados;

    return {
      total,
      sinAsignar,
      asignados,
      trabajados,
      pendientes,
    };
  } catch (error) {
    console.error('[actions-dashboard] Error in getDistribucionLeads:', error);
    return {
      total: 0,
      sinAsignar: 0,
      asignados: 0,
      trabajados: 0,
      pendientes: 0,
    };
  }
}

// =============================================================================
// 4. getControlProductividad - Stats de vendedores con sus leads
// =============================================================================

export async function getControlProductividad(
  proyectoId?: string
): Promise<VendedorProductividad[]> {
  try {
    const supabase = await createClient();

    // Query optimizada con GROUP BY y aggregations
    let query = supabase
      .from('leads')
      .select('vendedor_asignado_id, asistio')
      .not('vendedor_asignado_id', 'is', null);

    if (proyectoId) {
      query = query.eq('proyecto_id', proyectoId);
    }

    const { data: leads, error: leadsError } = await query;

    if (leadsError) {
      console.error('[actions-dashboard] Error fetching leads:', leadsError);
      throw leadsError;
    }

    // Obtener lista de vendedores activos
    const { data: vendedores, error: vendedoresError } = await supabase
      .from('vendedores')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (vendedoresError) {
      console.error('[actions-dashboard] Error fetching vendedores:', vendedoresError);
      throw vendedoresError;
    }

    // Agrupar leads por vendedor
    const vendedorStats = vendedores.map(vendedor => {
      const vendedorLeads = leads.filter(l => l.vendedor_asignado_id === vendedor.id);
      const total_leads = vendedorLeads.length;
      const trabajados = vendedorLeads.filter(l => l.asistio === true).length;
      const asistencias = trabajados; // Alias para claridad
      const pendientes = total_leads - trabajados;

      const tasa_trabajo = total_leads > 0 ? ((trabajados / total_leads) * 100).toFixed(1) : '0.0';
      const tasa_asistencia = tasa_trabajo; // Son lo mismo en este contexto

      return {
        vendedor_id: vendedor.id,
        vendedor_nombre: vendedor.nombre,
        total_leads,
        trabajados,
        pendientes,
        asistencias,
        tasa_trabajo,
        tasa_asistencia,
      };
    });

    // Ordenar por total de leads descendente
    return vendedorStats.sort((a, b) => b.total_leads - a.total_leads);
  } catch (error) {
    console.error('[actions-dashboard] Error in getControlProductividad:', error);
    return [];
  }
}

// =============================================================================
// 5. getResumenProyectos - Stats agregados por proyecto
// =============================================================================

export async function getResumenProyectos(): Promise<ProyectoResumen[]> {
  try {
    const supabase = await createClient();

    // Obtener proyectos activos
    const { data: proyectos, error: proyectosError } = await supabase
      .from('proyectos')
      .select('id, nombre, color')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (proyectosError) {
      console.error('[actions-dashboard] Error fetching proyectos:', proyectosError);
      throw proyectosError;
    }

    // Obtener todos los leads con sus estados y asistencias
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('proyecto_id, estado, asistio');

    if (leadsError) {
      console.error('[actions-dashboard] Error fetching leads:', leadsError);
      throw leadsError;
    }

    // Agrupar leads por proyecto
    const proyectoStats = proyectos.map(proyecto => {
      const proyectoLeads = leads.filter(l => l.proyecto_id === proyecto.id);
      const total_leads = proyectoLeads.length;
      const completos = proyectoLeads.filter(l => l.estado === 'lead_completo').length;
      const incompletos = proyectoLeads.filter(l => l.estado === 'lead_incompleto').length;
      const asistencias = proyectoLeads.filter(l => l.asistio === true).length;

      const tasa_conversion = total_leads > 0 ? ((completos / total_leads) * 100).toFixed(1) : '0.0';

      return {
        proyecto_id: proyecto.id,
        proyecto_nombre: proyecto.nombre,
        proyecto_color: proyecto.color,
        total_leads,
        completos,
        incompletos,
        asistencias,
        tasa_conversion,
      };
    });

    // Ordenar por total de leads descendente
    return proyectoStats.sort((a, b) => b.total_leads - a.total_leads);
  } catch (error) {
    console.error('[actions-dashboard] Error in getResumenProyectos:', error);
    return [];
  }
}

// =============================================================================
// CACHED VERSIONS (60 segundos TTL) - Usar para producción
// =============================================================================

export const getDashboardStatsCached = unstable_cache(
  async (dateFrom: string, dateTo: string, proyectoId?: string) => {
    return getDashboardStats(dateFrom, dateTo, proyectoId);
  },
  ['dashboard-stats'],
  {
    revalidate: 60, // 60 segundos
    tags: ['dashboard', 'stats'],
  }
);

export const getChartDataCached = unstable_cache(
  async (dateFrom: string, dateTo: string, proyectoId?: string) => {
    return getChartData(dateFrom, dateTo, proyectoId);
  },
  ['dashboard-charts'],
  {
    revalidate: 60,
    tags: ['dashboard', 'charts'],
  }
);

export const getDistribucionLeadsCached = unstable_cache(
  async (dateFrom: string, dateTo: string) => {
    return getDistribucionLeads(dateFrom, dateTo);
  },
  ['dashboard-distribucion'],
  {
    revalidate: 60,
    tags: ['dashboard', 'distribucion'],
  }
);

export const getControlProductividadCached = unstable_cache(
  async (proyectoId?: string) => {
    return getControlProductividad(proyectoId);
  },
  ['dashboard-productividad'],
  {
    revalidate: 60,
    tags: ['dashboard', 'productividad'],
  }
);

export const getResumenProyectosCached = unstable_cache(
  async () => {
    return getResumenProyectos();
  },
  ['dashboard-proyectos'],
  {
    revalidate: 60,
    tags: ['dashboard', 'proyectos'],
  }
);
