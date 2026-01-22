'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type {
  Notification,
  NotificationPreferences,
  NotificationTemplate,
  CreateNotificationInput,
  UpdatePreferencesInput,
  NotificationFilters,
  NotificationPagination,
  PaginatedNotifications,
  NotificationType,
  NotificationCategory,
} from '@/lib/types/notifications';
import { TYPE_TO_CATEGORY, NOTIFICATION_LIMITS } from '@/lib/types/notifications';

// ============================================================================
// HELPER: Crear cliente Supabase
// ============================================================================

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

// ============================================================================
// TIPOS DE RESPUESTA
// ============================================================================

interface NotificationResponse {
  success: boolean;
  data?: Notification;
  error?: string;
}

interface NotificationActionResponse {
  success: boolean;
  error?: string;
}

interface BulkNotificationResponse {
  success: boolean;
  sent_count: number;
  failed_count: number;
  error?: string;
}

// ============================================================================
// NOTIFICACIONES - CRUD
// ============================================================================

/**
 * Crear una nueva notificación
 * Usado por otros módulos para notificar usuarios
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<NotificationResponse> {
  try {
    const supabase = await createClient();

    // Calcular fecha de expiración (5 meses por defecto)
    const expiresAt = input.expires_at ||
      new Date(Date.now() + NOTIFICATION_LIMITS.RETENTION_MONTHS * 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: input.user_id,
        proyecto_id: input.proyecto_id || null,
        type: input.type,
        category: input.category,
        priority: input.priority || 'normal',
        title: input.title.substring(0, NOTIFICATION_LIMITS.MAX_TITLE_LENGTH),
        message: input.message.substring(0, NOTIFICATION_LIMITS.MAX_MESSAGE_LENGTH),
        metadata: input.metadata || {},
        action_url: input.action_url || null,
        action_label: input.action_label || null,
        actor_id: input.actor_id || null,
        actor_name: input.actor_name || null,
        actor_avatar_url: input.actor_avatar_url || null,
        parent_id: input.parent_id || null,
        thread_key: input.thread_key || null,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error('[notifications] Error creating:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Notification };
  } catch (error) {
    console.error('[notifications] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtener notificaciones del usuario actual con paginación keyset
 */
export async function getNotifications(
  filters?: NotificationFilters,
  pagination?: NotificationPagination
): Promise<PaginatedNotifications> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: [], next_cursor: null, has_more: false, total_unread: 0 };
    }

    const limit = Math.min(
      pagination?.limit || NOTIFICATION_LIMITS.DEFAULT_PER_PAGE,
      NOTIFICATION_LIMITS.MAX_PER_PAGE
    );

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // +1 para saber si hay más

    // Keyset pagination (NO usar OFFSET)
    if (pagination?.cursor) {
      query = query.lt('created_at', pagination.cursor);
    }

    // Aplicar filtros
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.is_read !== undefined) {
      query = query.eq('is_read', filters.is_read);
    }
    if (filters?.is_saved !== undefined) {
      query = query.eq('is_saved', filters.is_saved);
    }
    if (filters?.from_date) {
      query = query.gte('created_at', filters.from_date);
    }
    if (filters?.to_date) {
      query = query.lte('created_at', filters.to_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[notifications] Error fetching:', error);
      return { data: [], next_cursor: null, has_more: false, total_unread: 0 };
    }

    const notifications = data || [];
    const has_more = notifications.length > limit;
    const result = has_more ? notifications.slice(0, limit) : notifications;
    const next_cursor = has_more && result.length > 0
      ? result[result.length - 1].created_at
      : null;

    // Obtener contador de no leídas
    const unreadCount = await getUnreadCount();

    return {
      data: result as Notification[],
      next_cursor,
      has_more,
      total_unread: unreadCount,
    };
  } catch (error) {
    console.error('[notifications] Error:', error);
    return { data: [], next_cursor: null, has_more: false, total_unread: 0 };
  }
}

/**
 * Obtener una notificación por ID
 */
export async function getNotificationById(id: string): Promise<Notification | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('[notifications] Error fetching by id:', error);
      return null;
    }

    return data as Notification;
  } catch (error) {
    console.error('[notifications] Error:', error);
    return null;
  }
}

/**
 * Obtener contador de notificaciones no leídas
 * Optimizado para el badge (<50ms)
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return 0;

    // Usar función RPC optimizada si existe, sino count directo
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .is('deleted_at', null);

    if (error) {
      console.error('[notifications] Error counting unread:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('[notifications] Error:', error);
    return 0;
  }
}

/**
 * Marcar notificación como leída
 */
export async function markAsRead(
  notificationId: string
): Promise<NotificationActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[notifications] Error marking as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[notifications] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Marcar todas las notificaciones como leídas
 * Usa batch update (max 10K por llamada)
 */
export async function markAllAsRead(): Promise<{
  success: boolean;
  updated_count: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, updated_count: 0, error: 'No autenticado' };
    }

    // Intentar usar función RPC si existe
    const { data, error } = await supabase.rpc('mark_all_as_read_batch', {
      p_user_id: user.id,
      p_limit: 10000,
    });

    if (error) {
      // Fallback a update directo si RPC no existe
      console.warn('[notifications] RPC not available, using direct update');

      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .is('deleted_at', null);

      if (updateError) {
        return { success: false, updated_count: 0, error: updateError.message };
      }

      return { success: true, updated_count: -1 }; // -1 indica que no sabemos cuántos
    }

    return { success: true, updated_count: data || 0 };
  } catch (error) {
    console.error('[notifications] Error:', error);
    return {
      success: false,
      updated_count: 0,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Guardar/desguardar notificación (pin)
 */
export async function toggleSaveNotification(
  notificationId: string
): Promise<{ success: boolean; is_saved: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, is_saved: false, error: 'No autenticado' };
    }

    // Obtener estado actual
    const { data: current } = await supabase
      .from('notifications')
      .select('is_saved')
      .eq('id', notificationId)
      .eq('user_id', user.id)
      .single();

    if (!current) {
      return { success: false, is_saved: false, error: 'Notificación no encontrada' };
    }

    const newValue = !current.is_saved;

    const { error } = await supabase
      .from('notifications')
      .update({ is_saved: newValue })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[notifications] Error toggling save:', error);
      return { success: false, is_saved: current.is_saved, error: error.message };
    }

    return { success: true, is_saved: newValue };
  } catch (error) {
    console.error('[notifications] Error:', error);
    return {
      success: false,
      is_saved: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Archivar notificación
 */
export async function archiveNotification(
  notificationId: string
): Promise<NotificationActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_archived: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[notifications] Error archiving:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[notifications] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Eliminar notificación (soft delete)
 */
export async function deleteNotification(
  notificationId: string
): Promise<NotificationActionResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const { error } = await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[notifications] Error deleting:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[notifications] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// ============================================================================
// PREFERENCIAS
// ============================================================================

/**
 * Obtener preferencias del usuario actual
 * Crea preferencias default si no existen
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[notifications] Error fetching preferences:', error);
      return null;
    }

    if (!data) {
      // Crear preferencias default
      const defaultPrefs = {
        user_id: user.id,
        channels: { in_app: true, email: true, whatsapp: false, push: false },
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        digest_enabled: false,
        digest_frequency: 'daily',
        digest_time: '09:00',
        category_preferences: {},
      };

      const { data: created, error: createError } = await supabase
        .from('notification_preferences')
        .insert(defaultPrefs)
        .select()
        .single();

      if (createError) {
        console.error('[notifications] Error creating default preferences:', createError);
        return null;
      }

      return created as NotificationPreferences;
    }

    return data as NotificationPreferences;
  } catch (error) {
    console.error('[notifications] Error:', error);
    return null;
  }
}

/**
 * Actualizar preferencias del usuario
 */
export async function updateNotificationPreferences(
  input: UpdatePreferencesInput
): Promise<{ success: boolean; data?: NotificationPreferences; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Obtener preferencias actuales
    const current = await getNotificationPreferences();
    if (!current) {
      return { success: false, error: 'No se pudieron obtener preferencias' };
    }

    // Merge con input
    const updated = {
      channels: { ...current.channels, ...input.channels },
      quiet_hours_enabled: input.quiet_hours_enabled ?? current.quiet_hours_enabled,
      quiet_hours_start: input.quiet_hours_start ?? current.quiet_hours_start,
      quiet_hours_end: input.quiet_hours_end ?? current.quiet_hours_end,
      digest_enabled: input.digest_enabled ?? current.digest_enabled,
      digest_frequency: input.digest_frequency ?? current.digest_frequency,
      digest_time: input.digest_time ?? current.digest_time,
      category_preferences: {
        ...current.category_preferences,
        ...input.category_preferences
      },
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('notification_preferences')
      .update(updated)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[notifications] Error updating preferences:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as NotificationPreferences };
  } catch (error) {
    console.error('[notifications] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// ============================================================================
// TEMPLATES
// ============================================================================

/**
 * Obtener todos los templates activos
 */
export async function getNotificationTemplates(): Promise<NotificationTemplate[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('is_active', true)
      .order('type');

    if (error) {
      console.error('[notifications] Error fetching templates:', error);
      return [];
    }

    return (data || []) as NotificationTemplate[];
  } catch (error) {
    console.error('[notifications] Error:', error);
    return [];
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Enviar notificación a múltiples usuarios
 */
export async function sendBulkNotification(
  user_ids: string[],
  input: Omit<CreateNotificationInput, 'user_id'>
): Promise<BulkNotificationResponse> {
  let sent_count = 0;
  let failed_count = 0;

  for (const user_id of user_ids) {
    const result = await createNotification({ ...input, user_id });
    if (result.success) {
      sent_count++;
    } else {
      failed_count++;
    }
  }

  return {
    success: failed_count === 0,
    sent_count,
    failed_count,
    error: failed_count > 0 ? `${failed_count} notificaciones fallaron` : undefined,
  };
}

// ============================================================================
// HELPERS DE ALTO NIVEL (para eventos específicos)
// ============================================================================

/**
 * Helper interno para procesar template con variables
 */
function processTemplate(template: string, variables: Record<string, unknown>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return result;
}

/**
 * Notificar lead asignado
 */
export async function notifyLeadAssigned(params: {
  assignee_id: string;
  lead_id: string;
  lead_nombre: string;
  lead_telefono?: string;
  proyecto_id: string;
  proyecto_nombre: string;
  actor_id: string;
  actor_name: string;
}): Promise<NotificationActionResponse> {
  const result = await createNotification({
    user_id: params.assignee_id,
    proyecto_id: params.proyecto_id,
    type: 'lead_assigned',
    category: 'leads',
    priority: 'normal',
    title: 'Nuevo lead asignado',
    message: `${params.actor_name} te asignó el lead de ${params.lead_nombre}`,
    metadata: {
      lead_id: params.lead_id,
      lead_nombre: params.lead_nombre,
      lead_telefono: params.lead_telefono,
      proyecto_nombre: params.proyecto_nombre,
    },
    action_url: `/operativo?lead=${params.lead_id}`,
    action_label: 'Ver lead',
    actor_id: params.actor_id,
    actor_name: params.actor_name,
  });

  return { success: result.success, error: result.error };
}

/**
 * Notificar PR pendiente de aprobación
 */
export async function notifyPRPendingApproval(params: {
  approver_id: string;
  pr_id: string;
  pr_number: string;
  amount: number;
  currency: string;
  requester_id: string;
  requester_name: string;
  title: string;
}): Promise<NotificationActionResponse> {
  const result = await createNotification({
    user_id: params.approver_id,
    type: 'pr_pending_approval',
    category: 'purchase_requisitions',
    priority: 'high',
    title: `Solicitud ${params.pr_number} requiere aprobación`,
    message: `${params.requester_name} solicita ${params.currency} ${params.amount.toLocaleString()} - ${params.title}`,
    metadata: {
      pr_id: params.pr_id,
      pr_number: params.pr_number,
      amount: params.amount,
      currency: params.currency,
      requester_id: params.requester_id,
      requester_name: params.requester_name,
    },
    action_url: `/solicitudes-compra/${params.pr_id}`,
    action_label: 'Revisar solicitud',
    actor_id: params.requester_id,
    actor_name: params.requester_name,
  });

  return { success: result.success, error: result.error };
}

/**
 * Notificar PR aprobada
 */
export async function notifyPRApproved(params: {
  requester_id: string;
  pr_id: string;
  pr_number: string;
  amount: number;
  approver_name: string;
}): Promise<NotificationActionResponse> {
  const result = await createNotification({
    user_id: params.requester_id,
    type: 'pr_approved',
    category: 'purchase_requisitions',
    priority: 'normal',
    title: `Solicitud ${params.pr_number} aprobada`,
    message: `Tu solicitud fue aprobada por ${params.approver_name}`,
    metadata: {
      pr_id: params.pr_id,
      pr_number: params.pr_number,
      amount: params.amount,
    },
    action_url: `/solicitudes-compra/${params.pr_id}`,
    action_label: 'Ver solicitud',
    actor_name: params.approver_name,
  });

  return { success: result.success, error: result.error };
}

/**
 * Notificar PR rechazada
 */
export async function notifyPRRejected(params: {
  requester_id: string;
  pr_id: string;
  pr_number: string;
  amount: number;
  approver_name: string;
  rejection_reason: string;
}): Promise<NotificationActionResponse> {
  const result = await createNotification({
    user_id: params.requester_id,
    type: 'pr_rejected',
    category: 'purchase_requisitions',
    priority: 'high',
    title: `Solicitud ${params.pr_number} rechazada`,
    message: `${params.approver_name} rechazó tu solicitud: ${params.rejection_reason}`,
    metadata: {
      pr_id: params.pr_id,
      pr_number: params.pr_number,
      amount: params.amount,
      rejection_reason: params.rejection_reason,
    },
    action_url: `/solicitudes-compra/${params.pr_id}`,
    action_label: 'Ver detalles',
    actor_name: params.approver_name,
  });

  return { success: result.success, error: result.error };
}

/**
 * Notificar pago registrado (a finanzas)
 */
export async function notifyPaymentRegistered(params: {
  finanzas_user_ids: string[];
  pago_id: string;
  monto: number;
  local_codigo: string;
  cliente_nombre: string;
  registrado_por: string;
}): Promise<NotificationActionResponse> {
  const result = await sendBulkNotification(params.finanzas_user_ids, {
    type: 'payment_registered',
    category: 'pagos',
    priority: 'normal',
    title: 'Nuevo pago registrado',
    message: `${params.registrado_por} registró S/ ${params.monto.toLocaleString()} - ${params.local_codigo}`,
    metadata: {
      pago_id: params.pago_id,
      monto: params.monto,
      local_codigo: params.local_codigo,
      cliente_nombre: params.cliente_nombre,
    },
    action_url: `/control-pagos?pago=${params.pago_id}`,
    action_label: 'Validar pago',
    actor_name: params.registrado_por,
  });

  return { success: result.success, error: result.error };
}

/**
 * Notificar pago validado (al vendedor)
 */
export async function notifyPaymentValidated(params: {
  vendedor_id: string;
  pago_id: string;
  monto: number;
  local_codigo: string;
  validado_por: string;
}): Promise<NotificationActionResponse> {
  const result = await createNotification({
    user_id: params.vendedor_id,
    type: 'payment_validated',
    category: 'pagos',
    priority: 'normal',
    title: 'Pago validado',
    message: `${params.validado_por} validó el pago de S/ ${params.monto.toLocaleString()} - ${params.local_codigo}`,
    metadata: {
      pago_id: params.pago_id,
      monto: params.monto,
      local_codigo: params.local_codigo,
    },
    action_url: `/control-pagos?pago=${params.pago_id}`,
    action_label: 'Ver pago',
    actor_name: params.validado_por,
  });

  return { success: result.success, error: result.error };
}
