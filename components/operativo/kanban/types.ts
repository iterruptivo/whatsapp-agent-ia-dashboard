/**
 * Tipos para el Kanban de Leads
 */

export interface KanbanColumnConfig {
  id: string;
  columna_codigo: string;
  columna_nombre: string;
  columna_color: string;
  columna_orden: number;
  activo: boolean;
}

export interface LeadCard {
  id: string;
  nombre: string | null;
  telefono: string;
  rubro: string | null;
  email: string | null;
  utm_source: string | null; // Fuente del lead (campaña FB, WhatsApp, etc.)
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
  columna_kanban: string;
}

export interface KanbanBoardProps {
  columns: KanbanColumnConfig[];
  leads: LeadCard[];
  onLeadMove: (leadId: string, targetColumn: string) => Promise<void>;
  onLeadClick: (lead: LeadCard) => void;
  isLoading?: boolean;
}

export interface KanbanColumnProps {
  column: KanbanColumnConfig;
  leads: LeadCard[];
  totalCount: number;
  onLeadClick: (lead: LeadCard) => void;
  isOver?: boolean;
}

// Configuración de paginación del Kanban
export const KANBAN_PAGINATION = {
  INITIAL_ITEMS: 15,      // Items visibles inicialmente
  LOAD_MORE_BATCH: 15,    // Items a cargar por "Ver más"
} as const;

export interface KanbanCardProps {
  lead: LeadCard;
  onClick: () => void;
  isDragging?: boolean;
}

export type ViewMode = 'table' | 'kanban';
