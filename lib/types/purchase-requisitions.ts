/**
 * TypeScript Types - Purchase Requisitions Module
 *
 * Tipos para el módulo de solicitudes de compra (Purchase Requisitions).
 * Basado en schema de base de datos: migrations/004_modulo_purchase_requisitions.sql
 *
 * @author Backend Dev Agent
 * @version 1.0
 * @date 2026-01-13
 */

// ============================================================================
// ENUMS Y TIPOS LITERALES
// ============================================================================

/**
 * Estados del workflow de PR
 */
export type PRStatus =
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

/**
 * Prioridades de PR
 */
export type PRPriority = 'urgent' | 'high' | 'normal' | 'low';

/**
 * Monedas soportadas
 */
export type PRCurrency = 'PEN' | 'USD';

/**
 * Acciones en el historial de aprobaciones
 */
export type PRAction =
  | 'created'
  | 'submitted'
  | 'assigned'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'cancelled'
  | 'completed'
  | 'commented'
  | 'edited';

/**
 * Códigos de categorías de PR
 */
export type PRCategoryCode =
  | 'IT'
  | 'MKT'
  | 'OBRA'
  | 'SERV'
  | 'MOB'
  | 'OPS'
  | 'RRHH'
  | 'VENTAS'
  | 'LOG'
  | 'GRAL';

/**
 * Roles de aprobadores en el workflow
 */
export type ApproverRole =
  | 'auto'
  | 'admin'
  | 'gerencia'
  | 'superadmin'
  | 'jefe_ventas';

// ============================================================================
// INTERFACES PRINCIPALES
// ============================================================================

/**
 * Interfaz principal de Purchase Requisition
 */
export interface PurchaseRequisition {
  // Identificación
  id: string;
  pr_number: string;              // 'PR-2026-00001'
  sequence_number: number;

  // Solicitante
  requester_id: string;
  requester_name: string;
  requester_department?: string;

  // Referencia a proyecto (OPCIONAL)
  proyecto_id?: string;
  proyecto_nombre?: string;

  // Información básica
  title: string;
  category_id: string;
  priority: PRPriority;
  required_by_date: string;       // ISO date string

  // Detalles financieros
  item_description: string;
  quantity: number;
  unit_price: number;
  currency: PRCurrency;
  total_amount: number;           // Auto-calculado

  // Justificación y detalles
  justification: string;
  preferred_vendor?: string;
  cost_center?: string;
  notes?: string;

  // Archivos adjuntos
  attachments: PRAttachment[];

  // Workflow
  status: PRStatus;
  current_approver_id?: string;
  current_approver_name?: string;
  approval_rule_id?: string;

  // Timestamps de workflow
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  approval_comments?: string;

  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;

  completed_at?: string;
  completed_by?: string;

  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;

  // Auditoría
  created_at: string;
  updated_at: string;
}

/**
 * Categoría de Purchase Requisition
 */
export interface PRCategory {
  id: string;
  code: PRCategoryCode;
  name: string;
  description?: string;
  icon?: string;                  // Emoji o nombre de ícono
  default_approver_role: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Regla de aprobación automática basada en montos
 */
export interface PRApprovalRule {
  id: string;
  name: string;
  min_amount: number;
  max_amount?: number;            // NULL = sin límite
  approver_role: ApproverRole;
  sla_hours: number;
  requires_justification: boolean;
  requires_attachments: boolean;
  is_active: boolean;
  priority: number;               // Menor = evaluar primero
  created_at: string;
  updated_at: string;
}

/**
 * Historial de aprobaciones y acciones
 */
export interface PRApprovalHistory {
  id: string;
  pr_id: string;
  user_id: string;
  user_name: string;
  user_role?: string;
  action: PRAction;
  previous_status?: PRStatus;
  new_status?: PRStatus;
  comments?: string;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * Comentario en una PR
 */
export interface PRComment {
  id: string;
  pr_id: string;
  user_id: string;
  user_name: string;
  user_role?: string;
  comment: string;
  is_internal: boolean;           // Solo visible para aprobadores
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/**
 * Archivo adjunto en una PR
 */
export interface PRAttachment {
  name: string;                   // Nombre del archivo
  url: string;                    // URL de Supabase Storage
  size: number;                   // Tamaño en bytes
  type: string;                   // MIME type
  uploaded_at: string;
}

// ============================================================================
// TYPES PARA FORMULARIOS E INPUTS
// ============================================================================

/**
 * Input para crear una nueva PR
 */
export interface CreatePRInput {
  // Básicos
  title: string;
  category_id: string;
  priority: PRPriority;
  required_by_date: string;       // ISO date string

  // Financieros
  item_description: string;
  quantity: number;
  unit_price: number;
  currency: PRCurrency;

  // Justificación
  justification: string;

  // Opcionales
  proyecto_id?: string;
  preferred_vendor?: string;
  cost_center?: string;
  notes?: string;
  requester_department?: string;

  // Archivos (se agregan después de crear)
  attachments?: PRAttachment[];
}

/**
 * Input para actualizar una PR (solo en estado draft)
 */
export interface UpdatePRInput {
  title?: string;
  category_id?: string;
  priority?: PRPriority;
  required_by_date?: string;
  item_description?: string;
  quantity?: number;
  unit_price?: number;
  currency?: PRCurrency;
  justification?: string;
  preferred_vendor?: string;
  cost_center?: string;
  notes?: string;
  attachments?: PRAttachment[];
}

/**
 * Input para aprobar una PR
 */
export interface ApprovePRInput {
  pr_id: string;
  user_id: string;
  comments?: string;              // Comentarios opcionales del aprobador
}

/**
 * Input para rechazar una PR
 */
export interface RejectPRInput {
  pr_id: string;
  user_id: string;
  reason: string;                 // Motivo obligatorio
}

/**
 * Input para cancelar una PR
 */
export interface CancelPRInput {
  pr_id: string;
  user_id: string;
  reason: string;
}

/**
 * Input para agregar un comentario
 */
export interface AddPRCommentInput {
  pr_id: string;
  user_id: string;
  comment: string;
  is_internal: boolean;
}

// ============================================================================
// TYPES PARA FILTROS Y QUERIES
// ============================================================================

/**
 * Filtros para listar PRs
 */
export interface PRListFilters {
  status?: PRStatus | PRStatus[];
  priority?: PRPriority | PRPriority[];
  category_id?: string | string[];
  proyecto_id?: string;
  requester_id?: string;
  current_approver_id?: string;
  date_from?: string;             // ISO date string
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;                // Búsqueda en título, description, pr_number
}

/**
 * Campos por los que se puede ordenar
 */
export type PRSortField =
  | 'created_at'
  | 'updated_at'
  | 'required_by_date'
  | 'total_amount'
  | 'priority'
  | 'status';

/**
 * Orden de clasificación
 */
export type PRSortOrder = 'asc' | 'desc';

/**
 * Opciones de ordenamiento
 */
export interface PRSortOptions {
  field: PRSortField;
  order: PRSortOrder;
}

/**
 * Opciones de paginación
 */
export interface PRPaginationOptions {
  page: number;
  page_size: number;
}

/**
 * Respuesta paginada genérica
 */
export interface PRPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================================================
// TYPES PARA ESTADÍSTICAS Y REPORTES
// ============================================================================

/**
 * Estadísticas generales de PRs
 */
export interface PRStats {
  total: number;
  by_status: Record<PRStatus, number>;
  by_priority: Record<PRPriority, number>;
  by_category: Record<string, number>;
  total_amount: number;
  avg_amount: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  approval_rate: number;          // Porcentaje
  avg_cycle_time_days: number;    // Promedio de días desde creación a aprobación
}

/**
 * Estadísticas por categoría
 */
export interface PRCategoryStats {
  category_id: string;
  category_name: string;
  category_code: PRCategoryCode;
  total_prs: number;
  total_amount: number;
  avg_amount: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
}

/**
 * Estadísticas por aprobador
 */
export interface PRApproverStats {
  approver_id: string;
  approver_name: string;
  pending_count: number;
  total_pending_amount: number;
  approved_count: number;
  rejected_count: number;
  avg_response_time_hours: number;
}

// ============================================================================
// TYPES PARA UI COMPONENTS
// ============================================================================

/**
 * Datos completos para vista de detalle de PR
 */
export interface PRDetailViewData {
  pr: PurchaseRequisition;
  category: PRCategory;
  history: PRApprovalHistory[];
  comments: PRComment[];
  approval_rule?: PRApprovalRule;
  can_edit: boolean;
  can_approve: boolean;
  can_cancel: boolean;
}

/**
 * Props para badge de estado
 */
export interface PRStatusBadgeProps {
  status: PRStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Props para badge de prioridad
 */
export interface PRPriorityBadgeProps {
  priority: PRPriority;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Item de timeline para UI
 */
export interface PRTimelineItem {
  id: string;
  type: 'history' | 'comment';
  timestamp: string;
  user_name: string;
  user_role?: string;
  action?: PRAction;
  status_change?: {
    from: PRStatus;
    to: PRStatus;
  };
  comment?: string;
  is_internal?: boolean;
  icon: string;
  color: string;
}

// ============================================================================
// TYPES PARA SERVER ACTIONS
// ============================================================================

/**
 * Respuesta estándar de Server Actions
 */
export interface PRActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Input para aprobación masiva
 */
export interface BulkApprovePRsInput {
  pr_ids: string[];
  user_id: string;
  comments?: string;
}

/**
 * Input para rechazo masivo
 */
export interface BulkRejectPRsInput {
  pr_ids: string[];
  user_id: string;
  reason: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Errores de validación de formulario
 */
export interface PRFormErrors {
  title?: string;
  category_id?: string;
  required_by_date?: string;
  item_description?: string;
  quantity?: string;
  unit_price?: string;
  justification?: string;
  general?: string;
}

/**
 * Rango de montos para reglas de aprobación
 */
export interface PRAmountRange {
  min: number;
  max?: number;
  label: string;
  approver_role: ApproverRole;
  sla_hours: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Configuración de colores y emojis por estado
 */
export const PR_STATUS_COLORS: Record<PRStatus, {
  bg: string;
  text: string;
  icon: string;
}> = {
  draft: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    icon: '📝'
  },
  submitted: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: '📤'
  },
  pending_approval: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: '⏳'
  },
  approved: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: '✅'
  },
  rejected: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: '❌'
  },
  completed: {
    bg: 'bg-teal-100',
    text: 'text-teal-800',
    icon: '🎉'
  },
  cancelled: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    icon: '🚫'
  }
};

/**
 * Configuración de colores y emojis por prioridad
 */
export const PR_PRIORITY_COLORS: Record<PRPriority, {
  bg: string;
  text: string;
  icon: string;
}> = {
  urgent: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: '🔴'
  },
  high: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    icon: '🟠'
  },
  normal: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: '🔵'
  },
  low: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    icon: '⚪'
  }
};

/**
 * Labels en español para estados
 */
export const PR_STATUS_LABELS: Record<PRStatus, string> = {
  draft: 'Borrador',
  submitted: 'Enviada',
  pending_approval: 'Pendiente de Aprobación',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  completed: 'Completada',
  cancelled: 'Cancelada'
};

/**
 * Labels en español para prioridades
 */
export const PR_PRIORITY_LABELS: Record<PRPriority, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baja'
};

/**
 * Labels en español para acciones
 */
export const PR_ACTION_LABELS: Record<PRAction, string> = {
  created: 'Creó la PR',
  submitted: 'Envió a aprobación',
  assigned: 'Asignó aprobador',
  approved: 'Aprobó',
  rejected: 'Rechazó',
  escalated: 'Escaló',
  cancelled: 'Canceló',
  completed: 'Marcó como completada',
  commented: 'Comentó',
  edited: 'Editó'
};

/**
 * Información completa de categorías (español + íconos)
 */
export const PR_CATEGORY_INFO: Record<PRCategoryCode, {
  name: string;
  icon: string;
  description: string;
}> = {
  IT: {
    name: 'Tecnología & Sistemas',
    icon: '💻',
    description: 'Laptops, software, servidores'
  },
  MKT: {
    name: 'Marketing & Publicidad',
    icon: '📢',
    description: 'Publicidad, eventos, merchandising'
  },
  OBRA: {
    name: 'Construcción & Obra',
    icon: '🏗️',
    description: 'Materiales, maquinaria, herramientas'
  },
  SERV: {
    name: 'Servicios Profesionales',
    icon: '👔',
    description: 'Consultorías, legal, contabilidad'
  },
  MOB: {
    name: 'Mobiliario & Equipamiento',
    icon: '🪑',
    description: 'Muebles, equipos, decoración'
  },
  OPS: {
    name: 'Operaciones & Mantenimiento',
    icon: '🔧',
    description: 'Limpieza, seguridad, mantenimiento'
  },
  RRHH: {
    name: 'Recursos Humanos',
    icon: '👥',
    description: 'Capacitaciones, uniformes, beneficios'
  },
  VENTAS: {
    name: 'Ventas & Comercial',
    icon: '🏪',
    description: 'Casetas, material POP, tablets'
  },
  LOG: {
    name: 'Transporte & Logística',
    icon: '🚚',
    description: 'Combustible, mantenimiento, fletes'
  },
  GRAL: {
    name: 'Gastos Generales',
    icon: '📦',
    description: 'Útiles, suministros, snacks'
  }
};
