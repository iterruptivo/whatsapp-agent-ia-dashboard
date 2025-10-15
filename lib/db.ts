import { supabase } from './supabase';

// Updated Lead interface matching Supabase schema
export interface Lead {
  id: string;
  telefono: string;
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
}

// Vendedor interface matching Supabase vendedores table
export interface Vendedor {
  id: string;
  nombre: string;
  telefono: string;
  activo: boolean;
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

// Get all leads from Supabase with optional date range filtering
// Includes vendedor info via LEFT JOIN for display purposes
export async function getAllLeads(dateFrom?: Date, dateTo?: Date): Promise<Lead[]> {
  try {
    // Use LEFT JOIN to include vendedor.nombre when vendedor_asignado_id is not null
    let query = supabase
      .from('leads')
      .select(`
        *,
        vendedor_nombre:vendedores(nombre)
      `);

    // Apply date range filter if provided
    if (dateFrom) {
      query = query.gte('fecha_captura', dateFrom.toISOString());
    }

    if (dateTo) {
      query = query.lte('fecha_captura', dateTo.toISOString());
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      return [];
    }

    // Transform data to flatten vendedor_nombre from nested object
    const transformedData = (data || []).map(lead => ({
      ...lead,
      vendedor_nombre: lead.vendedor_nombre?.nombre || null,
    }));

    return transformedData as Lead[];
  } catch (error) {
    console.error('Error in getAllLeads:', error);
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
