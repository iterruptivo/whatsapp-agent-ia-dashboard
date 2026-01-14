// ============================================================================
// COMPONENT: NotificationCenter
// ============================================================================
// Descripción: Panel principal de notificaciones (dropdown)
// Features: Tabs, filtros, agrupación temporal, infinite scroll, responsive
// ============================================================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { X, CheckCheck, Loader2 } from 'lucide-react';
import type { Notification, NotificationFilters } from '@/lib/types/notifications';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationItem from './NotificationItem';
import NotificationEmptyState from './NotificationEmptyState';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterTab = 'all' | 'unread' | 'saved';

export default function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Construir filtros según tab activo
  const filters: NotificationFilters | undefined = (() => {
    if (activeFilter === 'unread') return { is_read: false };
    if (activeFilter === 'saved') return { is_saved: true };
    return undefined;
  })();

  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    markAsRead,
    markAllAsRead,
    toggleSave,
    deleteNotif,
    loadMore,
    refresh,
  } = useNotifications({
    filters,
    limit: 20,
    enableRealtime: isOpen,
  });

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Infinite scroll handler
  const handleScroll = () => {
    if (!scrollRef.current || isLoading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const threshold = 100; // px before bottom

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      loadMore();
    }
  };

  // Agrupar notificaciones por fecha
  const groupedNotifs = groupNotificationsByDate(notifications);

  // Refresh cuando cambia el filtro
  useEffect(() => {
    if (isOpen) {
      refresh();
    }
  }, [activeFilter, isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity md:hidden"
        onClick={onClose}
      />

      {/* Panel (Dropdown en desktop, fullscreen en mobile) */}
      <div className="fixed inset-0 md:inset-auto md:top-16 md:right-4 md:w-[420px] md:max-h-[600px] bg-white md:rounded-lg shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-[#192c4d]">Notificaciones</h2>

          <div className="flex items-center gap-2">
            {/* Mark all as read */}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm font-medium text-[#1b967a] hover:text-[#156b5a] flex items-center gap-1"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Marcar todas</span>
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeFilter === 'all'
                ? 'text-[#1b967a] border-b-2 border-[#1b967a]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeFilter === 'unread'
                ? 'text-[#1b967a] border-b-2 border-[#1b967a]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            No leídas {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            onClick={() => setActiveFilter('saved')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeFilter === 'saved'
                ? 'text-[#1b967a] border-b-2 border-[#1b967a]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Guardadas
          </button>
        </div>

        {/* Content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto"
        >
          {/* Loading state (first load) */}
          {isLoading && notifications.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#1b967a] animate-spin" />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && notifications.length === 0 && (
            <NotificationEmptyState variant={activeFilter} />
          )}

          {/* Notifications list (grouped) */}
          {notifications.length > 0 && (
            <>
              {groupedNotifs.today.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-600 uppercase">Hoy</h3>
                  </div>
                  {groupedNotifs.today.map(notif => (
                    <NotificationItem
                      key={notif.id}
                      notification={notif}
                      onMarkAsRead={markAsRead}
                      onSave={toggleSave}
                      onDelete={deleteNotif}
                      onAction={(url) => {
                        window.location.href = url;
                        onClose();
                      }}
                    />
                  ))}
                </div>
              )}

              {groupedNotifs.yesterday.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-600 uppercase">Ayer</h3>
                  </div>
                  {groupedNotifs.yesterday.map(notif => (
                    <NotificationItem
                      key={notif.id}
                      notification={notif}
                      onMarkAsRead={markAsRead}
                      onSave={toggleSave}
                      onDelete={deleteNotif}
                      onAction={(url) => {
                        window.location.href = url;
                        onClose();
                      }}
                    />
                  ))}
                </div>
              )}

              {groupedNotifs.this_week.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-600 uppercase">Esta semana</h3>
                  </div>
                  {groupedNotifs.this_week.map(notif => (
                    <NotificationItem
                      key={notif.id}
                      notification={notif}
                      onMarkAsRead={markAsRead}
                      onSave={toggleSave}
                      onDelete={deleteNotif}
                      onAction={(url) => {
                        window.location.href = url;
                        onClose();
                      }}
                    />
                  ))}
                </div>
              )}

              {groupedNotifs.older.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-600 uppercase">Más antiguas</h3>
                  </div>
                  {groupedNotifs.older.map(notif => (
                    <NotificationItem
                      key={notif.id}
                      notification={notif}
                      onMarkAsRead={markAsRead}
                      onSave={toggleSave}
                      onDelete={deleteNotif}
                      onAction={(url) => {
                        window.location.href = url;
                        onClose();
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Loading more spinner */}
              {isLoading && notifications.length > 0 && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 text-[#1b967a] animate-spin" />
                </div>
              )}

              {/* End of list */}
              {!hasMore && notifications.length > 0 && (
                <div className="text-center py-4 text-sm text-gray-500">
                  No hay más notificaciones
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Agrupar notificaciones por fecha
 */
interface GroupedNotifications {
  today: Notification[];
  yesterday: Notification[];
  this_week: Notification[];
  older: Notification[];
}

function groupNotificationsByDate(notifications: Notification[]): GroupedNotifications {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000; // -1 día
  const weekStart = todayStart - 7 * 86400000; // -7 días

  const grouped: GroupedNotifications = {
    today: [],
    yesterday: [],
    this_week: [],
    older: [],
  };

  for (const notif of notifications) {
    const timestamp = new Date(notif.created_at).getTime();

    if (timestamp >= todayStart) {
      grouped.today.push(notif);
    } else if (timestamp >= yesterdayStart) {
      grouped.yesterday.push(notif);
    } else if (timestamp >= weekStart) {
      grouped.this_week.push(notif);
    } else {
      grouped.older.push(notif);
    }
  }

  return grouped;
}
