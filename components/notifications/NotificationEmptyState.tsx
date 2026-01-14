// ============================================================================
// COMPONENT: NotificationEmptyState
// ============================================================================
// Descripción: Estado vacío cuando no hay notificaciones
// Features: Icono grande, mensaje positivo
// ============================================================================

'use client';

import { BellOff, Check } from 'lucide-react';

interface NotificationEmptyStateProps {
  variant?: 'all' | 'unread' | 'saved';
}

export default function NotificationEmptyState({ variant = 'all' }: NotificationEmptyStateProps) {
  const content = {
    all: {
      icon: BellOff,
      title: 'Sin notificaciones',
      subtitle: 'No tienes notificaciones aún',
    },
    unread: {
      icon: Check,
      title: '¡Todo al día!',
      subtitle: 'No tienes notificaciones pendientes',
    },
    saved: {
      icon: BellOff,
      title: 'Sin guardadas',
      subtitle: 'No has guardado ninguna notificación',
    },
  };

  const config = content[variant];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="bg-gray-100 rounded-full p-6 mb-4">
        <Icon className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {config.title}
      </h3>
      <p className="text-sm text-gray-500 text-center">
        {config.subtitle}
      </p>
    </div>
  );
}
