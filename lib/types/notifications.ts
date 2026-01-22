/**
 * Tipos TypeScript para el Módulo de Notificaciones
 *
 * Este archivo contiene todos los tipos necesarios para el sistema de notificaciones
 * de ECOPLAZA, incluyendo tipos de base de datos, inputs/outputs para Server Actions,
 * y tipos para UI/Frontend.
 *
 * @module lib/types/notifications
 */

// ============================================================================
// TIPOS BASE (matching DB schema)
// ============================================================================

/**
 * Prioridades de notificación
 */
export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

/**
 * Categorías de notificación por módulo del sistema
 */
export type NotificationCategory =
  | 'leads'
  | 'purchase_requisitions'
  | 'pagos'
  | 'aprobaciones'
  | 'locales'
  | 'comisiones'
  | 'expansion'
  | 'reuniones'
  | 'system';

/**
 * Tipos de notificación (eventos específicos)
 */
export type NotificationType =
  // Leads
  | 'lead_assigned'
  | 'lead_contacted'
  | 'lead_hot'
  // Purchase Requisitions
  | 'pr_created'
  | 'pr_pending_approval'
  | 'pr_approved'
  | 'pr_rejected'
  | 'pr_escalated'
  // Pagos
  | 'payment_registered'
  | 'payment_validated'
  | 'payment_rejected'
  // Aprobaciones generales
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  // Locales
  | 'local_sold'
  | 'local_state_changed'
  // Comisiones
  | 'commission_calculated'
  | 'commission_paid'
  // Expansión
  | 'corredor_registered'
  | 'corredor_approved'
  // Reuniones
  | 'meeting_scheduled'
  | 'transcription_ready'
  // Sistema
  | 'system_announcement';

/**
 * Canales de entrega disponibles
 */
export type NotificationChannel = 'in_app' | 'email' | 'whatsapp' | 'push';

/**
 * Estados de entrega de notificación
 */
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

// ============================================================================
// INTERFACES PRINCIPALES (DB Tables)
// ============================================================================

/**
 * Notificación completa (tabla notifications)
 */
export interface Notification {
  id: string;
  user_id: string;
  proyecto_id: string | null;

  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;

  title: string;
  message: string;
  metadata: Record<string, unknown>;

  action_url: string | null;
  action_label: string | null;

  is_read: boolean;
  is_saved: boolean;
  is_archived: boolean;
  read_at: string | null;

  parent_id: string | null;
  thread_key: string | null;

  actor_id: string | null;
  actor_name: string | null;
  actor_avatar_url: string | null;

  created_at: string;
  expires_at: string | null;
  deleted_at: string | null;
}

/**
 * Preferencias de usuario para notificaciones (tabla notification_preferences)
 */
export interface NotificationPreferences {
  id: string;
  user_id: string;

  channels: {
    in_app: boolean;
    email: boolean;
    whatsapp: boolean;
    push: boolean;
  };

  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // Formato "HH:MM" e.g. "22:00"
  quiet_hours_end: string;   // Formato "HH:MM" e.g. "08:00"

  digest_enabled: boolean;
  digest_frequency: 'daily' | 'weekly';
  digest_time: string; // Formato "HH:MM" e.g. "09:00"

  /**
   * Preferencias por categoría
   * Permite habilitar/deshabilitar categorías y elegir canales específicos
   */
  category_preferences: Record<NotificationCategory, {
    enabled: boolean;
    channels: NotificationChannel[];
  }>;

  created_at: string;
  updated_at: string;
}

/**
 * Template de notificación (tabla notification_templates)
 */
export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  category: NotificationCategory;

  in_app_title: string;
  in_app_message: string;
  email_subject: string | null;
  email_body: string | null;
  whatsapp_message: string | null;

  priority: NotificationPriority;
  action_label: string | null;

  is_active: boolean;
  version: number;

  created_at: string;
  updated_at: string;
}

/**
 * Log de entrega de notificaciones (tabla notification_delivery_log)
 */
export interface NotificationDeliveryLog {
  id: string;
  notification_id: string;
  channel: NotificationChannel;
  status: DeliveryStatus;

  provider: string | null;
  provider_message_id: string | null;
  provider_response: Record<string, unknown> | null;

  error_message: string | null;
  retry_count: number;

  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  created_at: string;
}

// ============================================================================
// TIPOS PARA SERVER ACTIONS (Input/Output)
// ============================================================================

/**
 * Input para crear una nueva notificación
 * @example
 * ```typescript
 * const input: CreateNotificationInput = {
 *   user_id: 'uuid-123',
 *   type: 'lead_assigned',
 *   category: 'leads',
 *   title: 'Nuevo lead asignado',
 *   message: 'Se te ha asignado el lead de Juan Pérez',
 *   metadata: { lead_id: 'lead-456' },
 *   action_url: '/operativo/lead-456'
 * };
 * ```
 */
export interface CreateNotificationInput {
  user_id: string;
  proyecto_id?: string;

  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;

  title: string;
  message: string;
  metadata?: Record<string, unknown>;

  action_url?: string;
  action_label?: string;

  actor_id?: string;
  actor_name?: string;
  actor_avatar_url?: string;

  parent_id?: string;
  thread_key?: string;

  expires_at?: string;
}

/**
 * Filtros para listar notificaciones
 */
export interface NotificationFilters {
  category?: NotificationCategory;
  priority?: NotificationPriority;
  is_read?: boolean;
  is_saved?: boolean;
  search?: string;
  from_date?: string;
  to_date?: string;
}

/**
 * Paginación keyset para notificaciones
 * Usa cursor basado en created_at para mejor performance
 */
export interface NotificationPagination {
  cursor?: string; // ISO timestamp del último item
  limit?: number;  // default 20, max 50
}

/**
 * Respuesta paginada de notificaciones
 */
export interface PaginatedNotifications {
  data: Notification[];
  next_cursor: string | null;
  has_more: boolean;
  total_unread: number;
}

/**
 * Input para actualizar preferencias de usuario
 * Todos los campos son opcionales (partial update)
 */
export interface UpdatePreferencesInput {
  channels?: Partial<NotificationPreferences['channels']>;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  digest_enabled?: boolean;
  digest_frequency?: 'daily' | 'weekly';
  digest_time?: string;
  category_preferences?: Partial<NotificationPreferences['category_preferences']>;
}

// ============================================================================
// TIPOS PARA UI/FRONTEND
// ============================================================================

/**
 * Notificación enriquecida para UI con formato adicional
 */
export interface NotificationDisplay extends Notification {
  time_ago: string;           // "hace 2 horas", "hace 3 días"
  formatted_date: string;     // "13 Ene 10:30"
  is_recent: boolean;         // true si < 24 horas
  grouped_date: 'today' | 'yesterday' | 'this_week' | 'older';
}

/**
 * Agrupación temporal de notificaciones para UI
 */
export interface GroupedNotifications {
  today: NotificationDisplay[];
  yesterday: NotificationDisplay[];
  this_week: NotificationDisplay[];
  older: NotificationDisplay[];
}

/**
 * Estado global del Notification Center
 */
export interface NotificationCenterState {
  notifications: Notification[];
  unread_count: number;
  is_loading: boolean;
  is_open: boolean;
  active_filter: 'all' | 'unread' | 'saved';
  has_more: boolean;
  cursor: string | null;
}

/**
 * Props para el componente NotificationBell (campana)
 */
export interface NotificationBellProps {
  unread_count: number;
  onClick: () => void;
}

/**
 * Props para el componente NotificationItem
 */
export interface NotificationItemProps {
  notification: NotificationDisplay;
  onMarkAsRead: (id: string) => void;
  onSave: (id: string) => void;
  onDelete: (id: string) => void;
  onAction?: () => void;
}

/**
 * Props para el componente NotificationCenter (dropdown/modal)
 */
export interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Iconos emoji por categoría de notificación
 */
export const CATEGORY_ICONS: Record<NotificationCategory, string> = {
  leads: '👤',
  purchase_requisitions: '📋',
  pagos: '💰',
  aprobaciones: '✅',
  locales: '🏪',
  comisiones: '💵',
  expansion: '🌎',
  reuniones: '📅',
  system: '⚙️'
};

/**
 * Colores Tailwind por prioridad
 */
export const PRIORITY_COLORS: Record<NotificationPriority, string> = {
  urgent: '#ef4444',  // red-500
  high: '#f97316',    // orange-500
  normal: '#3b82f6',  // blue-500
  low: '#6b7280'      // gray-500
};

/**
 * Colores de fondo (background) para badges de prioridad
 */
export const PRIORITY_BG_COLORS: Record<NotificationPriority, string> = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  normal: 'bg-blue-100 text-blue-800',
  low: 'bg-gray-100 text-gray-800'
};

/**
 * Labels en español para categorías
 */
export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  leads: 'Leads',
  purchase_requisitions: 'Solicitudes de Compra',
  pagos: 'Pagos',
  aprobaciones: 'Aprobaciones',
  locales: 'Locales',
  comisiones: 'Comisiones',
  expansion: 'Expansión',
  reuniones: 'Reuniones',
  system: 'Sistema'
};

/**
 * Labels en español para prioridades
 */
export const PRIORITY_LABELS: Record<NotificationPriority, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baja'
};

/**
 * Límites del sistema de notificaciones
 */
export const NOTIFICATION_LIMITS = {
  /** Máximo de notificaciones por página */
  MAX_PER_PAGE: 50,
  /** Cantidad default por página */
  DEFAULT_PER_PAGE: 20,
  /** Máximo número a mostrar en badge (luego "99+") */
  MAX_BADGE_COUNT: 99,
  /** Retención de notificaciones leídas (meses) */
  RETENTION_MONTHS: 5,
  /** Máximo de caracteres en el título */
  MAX_TITLE_LENGTH: 200,
  /** Máximo de caracteres en el mensaje */
  MAX_MESSAGE_LENGTH: 1000
} as const;

/**
 * Canales default por categoría (configuración inicial)
 */
export const DEFAULT_CATEGORY_CHANNELS: Record<NotificationCategory, NotificationChannel[]> = {
  leads: ['in_app', 'email'],
  purchase_requisitions: ['in_app', 'email'],
  pagos: ['in_app', 'email'],
  aprobaciones: ['in_app', 'email', 'whatsapp'],
  locales: ['in_app'],
  comisiones: ['in_app', 'email'],
  expansion: ['in_app', 'email'],
  reuniones: ['in_app', 'email'],
  system: ['in_app']
};

/**
 * Prioridad default por tipo de notificación
 */
export const DEFAULT_TYPE_PRIORITY: Partial<Record<NotificationType, NotificationPriority>> = {
  lead_hot: 'urgent',
  pr_escalated: 'urgent',
  payment_rejected: 'high',
  approval_requested: 'high',
  commission_calculated: 'normal',
  transcription_ready: 'low'
};

/**
 * Mapeo de tipo de notificación a categoría
 */
export const TYPE_TO_CATEGORY: Record<NotificationType, NotificationCategory> = {
  // Leads
  lead_assigned: 'leads',
  lead_contacted: 'leads',
  lead_hot: 'leads',

  // Purchase Requisitions
  pr_created: 'purchase_requisitions',
  pr_pending_approval: 'purchase_requisitions',
  pr_approved: 'purchase_requisitions',
  pr_rejected: 'purchase_requisitions',
  pr_escalated: 'purchase_requisitions',

  // Pagos
  payment_registered: 'pagos',
  payment_validated: 'pagos',
  payment_rejected: 'pagos',

  // Aprobaciones
  approval_requested: 'aprobaciones',
  approval_granted: 'aprobaciones',
  approval_denied: 'aprobaciones',

  // Locales
  local_sold: 'locales',
  local_state_changed: 'locales',

  // Comisiones
  commission_calculated: 'comisiones',
  commission_paid: 'comisiones',

  // Expansión
  corredor_registered: 'expansion',
  corredor_approved: 'expansion',

  // Reuniones
  meeting_scheduled: 'reuniones',
  transcription_ready: 'reuniones',

  // Sistema
  system_announcement: 'system'
};
