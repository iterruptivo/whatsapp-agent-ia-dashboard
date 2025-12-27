/**
 * Configuración y tipos para el Kanban de Leads
 *
 * Este módulo maneja la configuración dinámica del Kanban,
 * leyendo las columnas, mapeos y tipificaciones desde la base de datos.
 */

import { supabase } from './supabase';

// ============================================
// CONSTANTES FALLBACK DE TIPIFICACIÓN
// (Usadas si la BD no responde)
// ============================================

/**
 * Opciones de Nivel 1 (categorías principales) - FALLBACK
 */
export const TIPIFICACION_NIVEL_1 = [
  { value: 'contactado', label: 'Contactado' },
  { value: 'no_contactado', label: 'No Contactado' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'otros', label: 'Otros' },
] as const;

/**
 * Opciones de Nivel 2 agrupadas por Nivel 1 - FALLBACK
 */
export const TIPIFICACION_NIVEL_2: Record<string, { value: string; label: string }[]> = {
  contactado: [
    { value: 'interesado', label: 'Interesado' },
    { value: 'no_interesado', label: 'No Interesado' },
    { value: 'cliente_evaluacion', label: 'Cliente en Evaluación' },
    { value: 'cliente_negociacion', label: 'Cliente en Negociación' },
    { value: 'cliente_cierre', label: 'Cliente en Cierre' },
  ],
  no_contactado: [
    { value: 'no_contesta', label: 'No Contesta' },
    { value: 'buzon_mensaje', label: 'Buzón / Mensaje' },
    { value: 'telefono_apagado', label: 'Teléfono Apagado' },
    { value: 'telefono_fuera_servicio', label: 'Fuera de Servicio' },
    { value: 'numero_incorrecto', label: 'Número Incorrecto' },
  ],
  seguimiento: [
    { value: 'pendiente_visita', label: 'Pendiente de Visita' },
    { value: 'pendiente_decision', label: 'Pendiente de Decisión' },
  ],
  otros: [
    { value: 'contacto_otra_area', label: 'Contacto de Otra Área' },
  ],
};

// ============================================
// FUNCIONES PARA TIPIFICACIONES DESDE BD
// ============================================

/**
 * Obtiene todas las tipificaciones de Nivel 1 desde BD
 * Con fallback a constantes si hay error
 */
export async function getTipificacionesN1FromDB(): Promise<{ value: string; label: string }[]> {
  try {
    const { data, error } = await supabase
      .from('tipificaciones_nivel_1')
      .select('codigo, label')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('[getTipificacionesN1FromDB] Usando fallback');
      return TIPIFICACION_NIVEL_1.map(t => ({ value: t.value, label: t.label }));
    }

    return data.map(t => ({ value: t.codigo, label: t.label }));
  } catch (error) {
    console.error('[getTipificacionesN1FromDB] Error:', error);
    return TIPIFICACION_NIVEL_1.map(t => ({ value: t.value, label: t.label }));
  }
}

/**
 * Obtiene todas las tipificaciones de Nivel 2 desde BD, agrupadas por N1
 * Con fallback a constantes si hay error
 */
export async function getTipificacionesN2MapFromDB(): Promise<Record<string, { value: string; label: string }[]>> {
  try {
    const { data, error } = await supabase
      .from('tipificaciones_nivel_2')
      .select('nivel_1_codigo, codigo, label')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('[getTipificacionesN2MapFromDB] Usando fallback');
      return TIPIFICACION_NIVEL_2;
    }

    // Agrupar por nivel_1_codigo
    const map: Record<string, { value: string; label: string }[]> = {};
    data.forEach(t => {
      if (!map[t.nivel_1_codigo]) {
        map[t.nivel_1_codigo] = [];
      }
      map[t.nivel_1_codigo].push({ value: t.codigo, label: t.label });
    });

    return map;
  } catch (error) {
    console.error('[getTipificacionesN2MapFromDB] Error:', error);
    return TIPIFICACION_NIVEL_2;
  }
}

/**
 * Obtiene todas las combinaciones N1+N2 desde BD para el mapeo Kanban
 * Incluye "Sin tipificar" y "N1 + cualquier subestado"
 */
export async function getTipificacionCombinationsFromDB(): Promise<TipificacionCombination[]> {
  try {
    // Obtener N1 desde BD
    const n1List = await getTipificacionesN1FromDB();
    const n2Map = await getTipificacionesN2MapFromDB();

    const combinations: TipificacionCombination[] = [];

    // Sin tipificar
    combinations.push({
      nivel_1: null,
      nivel_2: null,
      label: 'Sin tipificar',
      category: 'sin_tipificar',
    });

    // Para cada N1
    for (const n1 of n1List) {
      // N1 + cualquier subestado
      combinations.push({
        nivel_1: n1.value,
        nivel_2: null,
        label: `${n1.label} (cualquier subestado)`,
        category: n1.value,
      });

      // N1 + cada N2
      const n2List = n2Map[n1.value] || [];
      for (const n2 of n2List) {
        combinations.push({
          nivel_1: n1.value,
          nivel_2: n2.value,
          label: n2.label,
          category: n1.value,
        });
      }
    }

    return combinations;
  } catch (error) {
    console.error('[getTipificacionCombinationsFromDB] Error:', error);
    return ALL_TIPIFICACION_COMBINATIONS;
  }
}

/**
 * Todas las combinaciones válidas de (N1, N2) para el mapeo Kanban
 * Incluye combinaciones con N2=null para fallbacks por categoría
 * FALLBACK - Usar getTipificacionCombinationsFromDB() para datos de BD
 */
export interface TipificacionCombination {
  nivel_1: string | null;
  nivel_2: string | null;
  label: string;
  category: string;
}

export const ALL_TIPIFICACION_COMBINATIONS: TipificacionCombination[] = [
  // Sin tipificar
  { nivel_1: null, nivel_2: null, label: 'Sin tipificar', category: 'sin_tipificar' },

  // Contactado
  { nivel_1: 'contactado', nivel_2: null, label: 'Contactado (cualquier subestado)', category: 'contactado' },
  { nivel_1: 'contactado', nivel_2: 'interesado', label: 'Interesado', category: 'contactado' },
  { nivel_1: 'contactado', nivel_2: 'no_interesado', label: 'No Interesado', category: 'contactado' },
  { nivel_1: 'contactado', nivel_2: 'cliente_evaluacion', label: 'Cliente en Evaluación', category: 'contactado' },
  { nivel_1: 'contactado', nivel_2: 'cliente_negociacion', label: 'Cliente en Negociación', category: 'contactado' },
  { nivel_1: 'contactado', nivel_2: 'cliente_cierre', label: 'Cliente en Cierre', category: 'contactado' },

  // No Contactado
  { nivel_1: 'no_contactado', nivel_2: null, label: 'No Contactado (cualquier subestado)', category: 'no_contactado' },
  { nivel_1: 'no_contactado', nivel_2: 'no_contesta', label: 'No Contesta', category: 'no_contactado' },
  { nivel_1: 'no_contactado', nivel_2: 'buzon_mensaje', label: 'Buzón / Mensaje', category: 'no_contactado' },
  { nivel_1: 'no_contactado', nivel_2: 'telefono_apagado', label: 'Teléfono Apagado', category: 'no_contactado' },
  { nivel_1: 'no_contactado', nivel_2: 'telefono_fuera_servicio', label: 'Fuera de Servicio', category: 'no_contactado' },
  { nivel_1: 'no_contactado', nivel_2: 'numero_incorrecto', label: 'Número Incorrecto', category: 'no_contactado' },

  // Seguimiento
  { nivel_1: 'seguimiento', nivel_2: null, label: 'Seguimiento (cualquier subestado)', category: 'seguimiento' },
  { nivel_1: 'seguimiento', nivel_2: 'pendiente_visita', label: 'Pendiente de Visita', category: 'seguimiento' },
  { nivel_1: 'seguimiento', nivel_2: 'pendiente_decision', label: 'Pendiente de Decisión', category: 'seguimiento' },

  // Otros
  { nivel_1: 'otros', nivel_2: null, label: 'Otros (cualquier subestado)', category: 'otros' },
  { nivel_1: 'otros', nivel_2: 'contacto_otra_area', label: 'Contacto de Otra Área', category: 'otros' },
];

/**
 * Labels para las categorías de nivel 1
 */
export const NIVEL_1_LABELS: Record<string, string> = {
  sin_tipificar: 'Sin Tipificar',
  contactado: 'Contactado',
  no_contactado: 'No Contactado',
  seguimiento: 'Seguimiento',
  otros: 'Otros',
};

// ============================================
// TIPOS
// ============================================

export interface KanbanColumn {
  id: string;
  columna_codigo: string;
  columna_nombre: string;
  columna_color: string;
  columna_orden: number;
  activo: boolean;
}

export interface KanbanMapping {
  id: string;
  tipificacion_nivel_1: string | null;
  tipificacion_nivel_2: string | null;
  columna_codigo: string;
  prioridad: number;
}

export interface LeadForKanban {
  id: string;
  nombre: string | null;
  telefono: string;
  rubro: string | null;
  email: string | null;
  tipificacion_nivel_1: string | null;
  tipificacion_nivel_2: string | null;
  tipificacion_nivel_3: string | null;
  vendedor_asignado_id: string | null;
  vendedor_nombre?: string | null;
  proyecto_id: string;
  proyecto_nombre?: string | null;
  proyecto_color?: string | null;
  created_at: string;
  updated_at: string;
  columna_kanban?: string;
}

export interface KanbanData {
  columns: KanbanColumn[];
  mappings: KanbanMapping[];
  leads: LeadForKanban[];
}

// ============================================
// FUNCIONES DE LECTURA
// ============================================

/**
 * Obtiene todas las columnas activas del Kanban
 */
export async function getKanbanColumns(): Promise<KanbanColumn[]> {
  const { data, error } = await supabase
    .from('kanban_config')
    .select('*')
    .eq('activo', true)
    .order('columna_orden', { ascending: true });

  if (error) {
    console.error('Error al obtener columnas Kanban:', error);
    return [];
  }

  return data || [];
}

/**
 * Obtiene todos los mapeos de tipificación a columna
 */
export async function getKanbanMappings(): Promise<KanbanMapping[]> {
  const { data, error } = await supabase
    .from('kanban_tipificacion_mapping')
    .select('*')
    .order('prioridad', { ascending: false });

  if (error) {
    console.error('Error al obtener mapeos Kanban:', error);
    return [];
  }

  return data || [];
}

/**
 * Obtiene la columna Kanban para una tipificación específica
 * Usa la función SQL get_kanban_columna para consistencia
 */
export async function getKanbanColumnaForLead(
  nivel1: string | null,
  nivel2: string | null
): Promise<string> {
  const { data, error } = await supabase
    .rpc('get_kanban_columna', {
      p_nivel_1: nivel1,
      p_nivel_2: nivel2
    });

  if (error) {
    console.error('Error al obtener columna Kanban:', error);
    return 'nuevo';
  }

  return data || 'nuevo';
}

/**
 * Calcula la columna Kanban para un lead usando los mapeos en memoria
 * (Más eficiente cuando ya tenemos los mapeos cargados)
 */
export function calculateKanbanColumn(
  lead: { tipificacion_nivel_1: string | null; tipificacion_nivel_2: string | null },
  mappings: KanbanMapping[]
): string {
  const { tipificacion_nivel_1, tipificacion_nivel_2 } = lead;

  // Buscar mapeo exacto (nivel_1 + nivel_2)
  let mapping = mappings.find(
    m => m.tipificacion_nivel_1 === tipificacion_nivel_1 &&
         m.tipificacion_nivel_2 === tipificacion_nivel_2
  );

  // Si no hay mapeo exacto, buscar por nivel_1 solamente
  if (!mapping) {
    mapping = mappings.find(
      m => m.tipificacion_nivel_1 === tipificacion_nivel_1 &&
           m.tipificacion_nivel_2 === null
    );
  }

  // Si aún no hay mapeo, retornar 'nuevo' por defecto
  return mapping?.columna_codigo || 'nuevo';
}

/**
 * Obtiene leads con su columna Kanban calculada
 */
export async function getLeadsForKanban(
  proyectoId: string,
  vendedorId?: string | null
): Promise<LeadForKanban[]> {
  let query = supabase
    .from('leads')
    .select(`
      id,
      nombre,
      telefono,
      rubro,
      email,
      tipificacion_nivel_1,
      tipificacion_nivel_2,
      tipificacion_nivel_3,
      vendedor_asignado_id,
      proyecto_id,
      created_at,
      updated_at,
      vendedores:vendedor_asignado_id (nombre),
      proyectos:proyecto_id (nombre, color)
    `)
    .eq('proyecto_id', proyectoId)
    .order('updated_at', { ascending: false });

  // Filtrar por vendedor si se especifica
  if (vendedorId) {
    query = query.eq('vendedor_asignado_id', vendedorId);
  }

  const { data: leads, error } = await query;

  if (error) {
    console.error('Error al obtener leads para Kanban:', error);
    return [];
  }

  // Obtener mapeos una vez
  const mappings = await getKanbanMappings();

  // Procesar leads y calcular columna
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (leads || []).map((lead: any) => {
    const vendedor = lead.vendedores as { nombre: string } | null;
    const proyecto = lead.proyectos as { nombre: string; color: string } | null;

    return {
      id: lead.id,
      nombre: lead.nombre,
      telefono: lead.telefono,
      rubro: lead.rubro,
      email: lead.email,
      tipificacion_nivel_1: lead.tipificacion_nivel_1,
      tipificacion_nivel_2: lead.tipificacion_nivel_2,
      tipificacion_nivel_3: lead.tipificacion_nivel_3,
      vendedor_asignado_id: lead.vendedor_asignado_id,
      vendedor_nombre: vendedor?.nombre || null,
      proyecto_id: lead.proyecto_id,
      proyecto_nombre: proyecto?.nombre || null,
      proyecto_color: proyecto?.color || null,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      columna_kanban: calculateKanbanColumn(lead, mappings),
    };
  });
}

/**
 * Obtiene toda la data necesaria para renderizar el Kanban
 */
export async function getKanbanData(
  proyectoId: string,
  vendedorId?: string | null
): Promise<KanbanData> {
  const [columns, mappings, leads] = await Promise.all([
    getKanbanColumns(),
    getKanbanMappings(),
    getLeadsForKanban(proyectoId, vendedorId),
  ]);

  return { columns, mappings, leads };
}

// ============================================
// TIPIFICACIÓN POR DEFECTO AL MOVER
// ============================================

/**
 * Obtiene la tipificación por defecto cuando se mueve un lead a una columna
 */
export function getDefaultTipificacionForColumn(columna: string): {
  nivel_1: string | null;
  nivel_2: string | null;
} {
  const defaults: Record<string, { nivel_1: string | null; nivel_2: string | null }> = {
    nuevo: { nivel_1: null, nivel_2: null },
    contactando: { nivel_1: 'no_contactado', nivel_2: 'no_contesta' },
    en_conversacion: { nivel_1: 'contactado', nivel_2: 'interesado' },
    calificado: { nivel_1: 'contactado', nivel_2: 'cliente_evaluacion' },
    descartado: { nivel_1: 'contactado', nivel_2: 'no_interesado' },
  };

  return defaults[columna] || { nivel_1: null, nivel_2: null };
}
