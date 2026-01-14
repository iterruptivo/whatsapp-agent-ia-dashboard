// ============================================================================
// COMPONENT: NotificationItem
// ============================================================================
// Descripción: Componente individual de notificación
// Features: Avatar/icon, título, mensaje, tiempo, acciones hover, prioridad
// ============================================================================

'use client';

import { useState } from 'react';
import { MoreHorizontal, Check, Bookmark, BookmarkCheck, Trash2, ExternalLink } from 'lucide-react';
import type { Notification } from '@/lib/types/notifications';
import { CATEGORY_ICONS, PRIORITY_COLORS } from '@/lib/types/notifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onSave: (id: string) => void;
  onDelete: (id: string) => void;
  onAction?: (url: string) => void;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onSave,
  onDelete,
  onAction,
}: NotificationItemProps) {
  const [showActions, setShowActions] = useState(false);

  // Calcular tiempo relativo
  const timeAgo = getTimeAgo(notification.created_at);

  // Prioridad color
  const priorityColor = PRIORITY_COLORS[notification.priority];

  // Category icon
  const categoryIcon = CATEGORY_ICONS[notification.category] || '📢';

  const handleClick = () => {
    // Marcar como leída al hacer click
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }

    // Si tiene acción, ejecutarla
    if (notification.action_url && onAction) {
      onAction(notification.action_url);
    }
  };

  return (
    <div
      className={`relative group border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors ${
        !notification.is_read ? 'bg-blue-50/30' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex gap-3">
        {/* Blue dot for unread */}
        {!notification.is_read && (
          <div className="flex-shrink-0 pt-1">
            <div className="w-2 h-2 rounded-full bg-[#1b967a]" />
          </div>
        )}

        {/* Avatar or Icon */}
        <div className="flex-shrink-0">
          {notification.actor_avatar_url ? (
            <img
              src={notification.actor_avatar_url}
              alt={notification.actor_name || 'Usuario'}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xl">
              {categoryIcon}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
            {notification.title}
          </h4>

          {/* Message */}
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {notification.message}
          </p>

          {/* Footer: Time + Action Button */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{timeAgo}</span>

            {/* Priority indicator (urgent/high only) */}
            {(notification.priority === 'urgent' || notification.priority === 'high') && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded"
                style={{
                  backgroundColor: priorityColor + '20',
                  color: priorityColor,
                }}
              >
                {notification.priority === 'urgent' ? 'Urgente' : 'Alta'}
              </span>
            )}

            {/* Action button */}
            {notification.action_url && notification.action_label && (
              <button
                onClick={handleClick}
                className="text-xs font-medium text-[#1b967a] hover:text-[#156b5a] flex items-center gap-1"
              >
                {notification.action_label}
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Actions Menu (visible on hover) */}
        {showActions && (
          <div className="flex-shrink-0 flex items-start gap-1">
            {!notification.is_read && (
              <button
                onClick={() => onMarkAsRead(notification.id)}
                className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                title="Marcar como leída"
              >
                <Check className="w-4 h-4 text-gray-600" />
              </button>
            )}

            <button
              onClick={() => onSave(notification.id)}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
              title={notification.is_saved ? 'Quitar guardado' : 'Guardar'}
            >
              {notification.is_saved ? (
                <BookmarkCheck className="w-4 h-4 text-[#1b967a]" />
              ) : (
                <Bookmark className="w-4 h-4 text-gray-600" />
              )}
            </button>

            <button
              onClick={() => onDelete(notification.id)}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Calcular tiempo relativo (hace X)
 */
function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Hace un momento';
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `Hace ${minutes}m`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `Hace ${hours}h`;
  }
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return days === 1 ? 'Ayer' : `Hace ${days}d`;
  }

  // Más de una semana: mostrar fecha
  return date.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
  });
}
