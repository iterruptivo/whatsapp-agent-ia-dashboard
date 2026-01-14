// ============================================================================
// HOOK: useNotifications
// ============================================================================
// Descripción: Hook para manejar el estado de notificaciones con Realtime
// Features: Fetch inicial, Supabase Realtime, contador unread, paginación
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { Notification, NotificationFilters, PaginatedNotifications } from '@/lib/types/notifications';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  toggleSaveNotification,
  deleteNotification,
} from '@/lib/actions-notifications';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  cursor: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  toggleSave: (id: string) => Promise<void>;
  deleteNotif: (id: string) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface UseNotificationsOptions {
  filters?: NotificationFilters;
  limit?: number;
  enableRealtime?: boolean;
}

/**
 * Hook para gestionar notificaciones con Realtime y paginación
 */
export function useNotifications(options?: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  // Función para cargar notificaciones
  const loadNotifications = useCallback(async (loadCursor?: string | null) => {
    setIsLoading(true);
    try {
      const result: PaginatedNotifications = await getNotifications(
        options?.filters,
        {
          cursor: loadCursor || undefined,
          limit: options?.limit || 20,
        }
      );

      if (loadCursor) {
        // Load more (append)
        setNotifications(prev => [...prev, ...result.data]);
      } else {
        // Initial load (replace)
        setNotifications(result.data);
      }

      setUnreadCount(result.total_unread);
      setHasMore(result.has_more);
      setCursor(result.next_cursor);
    } catch (error) {
      console.error('[useNotifications] Error loading:', error);
    } finally {
      setIsLoading(false);
    }
  }, [options?.filters, options?.limit]);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!options?.enableRealtime) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Obtener user_id actual
    let userId: string | null = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      userId = user?.id || null;
    });

    const channel = supabase
      .channel('notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: userId ? `user_id=eq.${userId}` : undefined,
        },
        (payload) => {
          console.log('[Realtime] New notification:', payload.new);
          const newNotif = payload.new as Notification;

          // Add to top of list
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show browser notification
          showBrowserNotification(newNotif);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: userId ? `user_id=eq.${userId}` : undefined,
        },
        (payload) => {
          console.log('[Realtime] Updated notification:', payload.new);
          const updated = payload.new as Notification;

          // Update in list
          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? updated : n)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options?.enableRealtime]);

  // Mark as read
  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[useNotifications] Error marking as read:', error);
    }
  }, []);

  // Mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('[useNotifications] Error marking all as read:', error);
    }
  }, []);

  // Toggle save
  const handleToggleSave = useCallback(async (id: string) => {
    try {
      const result = await toggleSaveNotification(id);
      if (result.success) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, is_saved: result.is_saved } : n)
        );
      }
    } catch (error) {
      console.error('[useNotifications] Error toggling save:', error);
    }
  }, []);

  // Delete notification
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('[useNotifications] Error deleting:', error);
    }
  }, []);

  // Load more (keyset pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await loadNotifications(cursor);
  }, [hasMore, isLoading, cursor, loadNotifications]);

  // Refresh
  const refresh = useCallback(async () => {
    await loadNotifications(null);
  }, [loadNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    cursor,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    toggleSave: handleToggleSave,
    deleteNotif: handleDelete,
    loadMore,
    refresh,
  };
}

/**
 * Mostrar notificación del navegador
 */
function showBrowserNotification(notification: Notification) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;

  // Pedir permiso si no lo tenemos
  if (Notification.permission === 'default') {
    Notification.requestPermission();
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
      });
    } catch (error) {
      console.error('[Browser Notification] Error:', error);
    }
  }
}
