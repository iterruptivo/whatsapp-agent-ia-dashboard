import { supabase } from './supabase';

// Proyecto interface matching Supabase proyectos table
export interface Proyecto {
  id: string;
  nombre: string;
  slug: string;
  color: string | null;
  activo: boolean;
  created_at?: string;
}

// Updated Lead interface matching Supabase schema
export interface Lead {
  id: string;
  telefono: string;
  email: string | null; // Email del lead (nullable)
  nombre: string | null;
  rubro: string | null;
  horario_visita: string | null;
  horario_visita_timestamp: string | null; // ISO timestamp parseado del horario (nullable para backwards compatibility)
  estado: string | null;
  estado_al_notificar: string | null; // Estado en el momento de notificar a vendedores
  historial_conversacion: string | null;
  historial_reciente: string | null;
  resumen_historial: string | null;
  ultimo_mensaje: string | null;
  intentos_bot: number;
  fecha_captura: string;
  created_at: string;
  updated_at: string;
  notificacion_enviada: boolean;
  vendedor_asignado_id: string | null; // ID del vendedor asignado (nullable - lead disponible si null)
  vendedor_nombre?: string | null; // Nombre del vendedor (obtenido via JOIN, opcional)
  proyecto_id: string; // ID del proyecto (Trapiche, Callao, etc.)
  proyecto_nombre?: string | null; // Nombre del proyecto (obtenido via JOIN, opcional)
  proyecto_color?: string | null; // Color del proyecto (obtenido via JOIN, opcional)
}

// Vendedor interface matching Supabase vendedores table
export interface Vendedor {
  id: string;
  nombre: string;
  telefono: string;
  activo: boolean;
}

// Get all proyectos from Supabase (only active ones by default)
export async function getAllProyectos(includeInactive = false): Promise<Proyecto[]> {
  try {
    let query = supabase
      .from('proyectos')
      .select('id, nombre, slug, color, activo, created_at');

    // Filter by active status unless includeInactive is true
    if (!includeInactive) {
      query = query.eq('activo', true);
    }

    const { data, error } = await query.order('nombre', { ascending: true });

    if (error) {
      console.error('Error fetching proyectos:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllProyectos:', error);
    return [];
  }
}

// Get all vendedores from Supabase (only active ones by default)
export async function getAllVendedores(includeInactive = false): Promise<Vendedor[]> {
  try {
    let query = supabase
      .from('vendedores')
      .select('id, nombre, telefono, activo');

    // Filter by active status unless includeInactive is true
    if (!includeInactive) {
      query = query.eq('activo', true);
    }

    const { data, error } = await query.order('nombre', { ascending: true });

    if (error) {
      console.error('Error fetching vendedores:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllVendedores:', error);
    return [];
  }
}

// Get all leads from Supabase with optional date range and proyecto filtering
// FASE 1 FIX: Removed JOINs to avoid Supabase 1000-record limit on complex queries
// Fetches vendedores and proyectos separately, then enriches data in application code
export async function getAllLeads(dateFrom?: Date, dateTo?: Date, proyectoId?: string): Promise<Lead[]> {
  try {
    console.log('[DB] getAllLeads() - FASE 1: Fetching without JOINs');

    // STEP 1: Fetch leads WITHOUT JOINs (simpler query to avoid 1000 limit)
    let leadsQuery = supabase
      .from('leads')
      .select('*');  // No JOINs - fetch only lead data

    // CRITICAL: Filter by proyecto_id if provided (for multi-proyecto support)
    if (proyectoId) {
      leadsQuery = leadsQuery.eq('proyecto_id', proyectoId);
    }

    // Apply date range filter if provided
    if (dateFrom) {
      leadsQuery = leadsQuery.gte('fecha_captura', dateFrom.toISOString());
    }

    if (dateTo) {
      leadsQuery = leadsQuery.lte('fecha_captura', dateTo.toISOString());
    }

    const { data: leadsData, error: leadsError } = await leadsQuery
      .order('created_at', { ascending: false })
      .range(0, 9999); // Should work better without JOINs

    if (leadsError) {
      console.error('[DB] Error fetching leads:', leadsError);
      return [];
    }

    console.log('[DB] ✅ Leads fetched (no JOINs):', leadsData?.length || 0);

    // STEP 2: Fetch vendedores separately (small table, cacheable)
    const { data: vendedoresData, error: vendedoresError } = await supabase
      .from('vendedores')
      .select('id, nombre');

    if (vendedoresError) {
      console.warn('[DB] ⚠️ Error fetching vendedores (will proceed without):', vendedoresError);
    }

    console.log('[DB] ✅ Vendedores fetched:', vendedoresData?.length || 0);

    // STEP 3: Fetch proyectos separately (small table, cacheable)
    const { data: proyectosData, error: proyectosError } = await supabase
      .from('proyectos')
      .select('id, nombre, color');

    if (proyectosError) {
      console.warn('[DB] ⚠️ Error fetching proyectos (will proceed without):', proyectosError);
    }

    console.log('[DB] ✅ Proyectos fetched:', proyectosData?.length || 0);

    // STEP 4: Enrich leads with vendedor/proyecto info (replaces JOIN logic)
    const enrichedLeads = (leadsData || []).map(lead => {
      const vendedor = vendedoresData?.find(v => v.id === lead.vendedor_asignado_id);
      const proyecto = proyectosData?.find(p => p.id === lead.proyecto_id);

      return {
        ...lead,
        vendedor_nombre: vendedor?.nombre || null,
        proyecto_nombre: proyecto?.nombre || null,
        proyecto_color: proyecto?.color || null,
      };
    });

    console.log('[DB] ✅ getAllLeads() FINAL COUNT:', enrichedLeads.length);

    return enrichedLeads as Lead[];
  } catch (error) {
    console.error('[DB] ❌ Error in getAllLeads:', error);
    return [];
  }
}

// Get lead statistics
export async function getLeadStats() {
  try {
    const leads = await getAllLeads();
    const total = leads.length;

    const completos = leads.filter(l => l.estado === 'lead_completo').length;
    const incompletos = leads.filter(l => l.estado === 'lead_incompleto').length;
    const conversacion = leads.filter(l => l.estado === 'en_conversacion').length;
    const abandonados = leads.filter(l => l.estado === 'conversacion_abandonada').length;

    const tasaConversion = total > 0 ? ((completos / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      completos,
      incompletos,
      conversacion,
      abandonados,
      tasaConversion,
    };
  } catch (error) {
    console.error('Error in getLeadStats:', error);
    return {
      total: 0,
      completos: 0,
      incompletos: 0,
      conversacion: 0,
      abandonados: 0,
      tasaConversion: '0.0',
    };
  }
}

// Get chart data for visualization
// Muestra la distribución de estados en el momento de notificar a vendedores
export async function getChartData() {
  try {
    const leads = await getAllLeads();

    // Solo considerar leads que fueron notificados a vendedores (tienen estado_al_notificar)
    const leadsNotificados = leads.filter(l => l.estado_al_notificar !== null);

    return [
      {
        name: 'Lead Completo',
        value: leadsNotificados.filter(l => l.estado_al_notificar === 'lead_completo').length,
        color: '#1b967a'
      },
      {
        name: 'Lead Incompleto',
        value: leadsNotificados.filter(l => l.estado_al_notificar === 'lead_incompleto').length,
        color: '#fbde17'
      },
      {
        name: 'En Conversación',
        value: leadsNotificados.filter(l => l.estado_al_notificar === 'en_conversacion').length,
        color: '#192c4d'
      },
      {
        name: 'Abandonado',
        value: leadsNotificados.filter(l => l.estado_al_notificar === 'conversacion_abandonada').length,
        color: '#cbd5e1'
      },
    ];
  } catch (error) {
    console.error('Error in getChartData:', error);
    return [
      { name: 'Lead Completo', value: 0, color: '#1b967a' },
      { name: 'Lead Incompleto', value: 0, color: '#fbde17' },
      { name: 'En Conversación', value: 0, color: '#192c4d' },
      { name: 'Abandonado', value: 0, color: '#cbd5e1' },
    ];
  }
}

// ============================================================================
// SEARCH LEAD BY PHONE (para tracking de locales)
// ============================================================================

/**
 * Buscar lead por número de teléfono en todos los proyectos
 * @param telefono Número de teléfono a buscar
 * @returns Lead encontrado o null
 */
export async function searchLeadByPhone(telefono: string): Promise<Lead | null> {
  try {
    // Limpiar teléfono (remover espacios, guiones, paréntesis)
    const cleanPhone = telefono.replace(/[\s\-\(\)]/g, '');

    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        proyecto:proyectos!leads_proyecto_id_fkey(nombre, color)
      `)
      .eq('telefono', cleanPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      console.error('Error searching lead by phone:', error);
      return null;
    }

    if (!data) return null;

    // Map proyecto JOIN data
    return {
      ...data,
      proyecto_nombre: data.proyecto?.nombre || null,
      proyecto_color: data.proyecto?.color || null,
    };
  } catch (error) {
    console.error('Error in searchLeadByPhone:', error);
    return null;
  }
}
