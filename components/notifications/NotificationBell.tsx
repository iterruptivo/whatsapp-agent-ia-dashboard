// ============================================================================
// COMPONENT: NotificationBell
// ============================================================================
// Descripción: Campana de notificaciones con badge de contador
// Features: Badge con animación, max 99+, color corporativo
// ============================================================================

'use client';

import { Bell } from 'lucide-react';

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}

export default function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();
  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      aria-label={`Notificaciones${hasUnread ? ` (${unreadCount} no leídas)` : ''}`}
    >
      {/* Bell Icon */}
      <Bell className={`w-6 h-6 ${hasUnread ? 'text-[#1b967a]' : 'text-gray-600'}`} />

      {/* Badge */}
      {hasUnread && (
        <span
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-pulse"
          style={{ animationDuration: '2s' }}
        >
          {displayCount}
        </span>
      )}
    </button>
  );
}
