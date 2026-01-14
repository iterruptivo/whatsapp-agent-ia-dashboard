// ============================================================================
// COMPONENT: NotificationContainer
// ============================================================================
// Descripción: Contenedor que integra Bell + Center (para usar en Header)
// Features: Auto-fetch unread count, estado global del dropdown
// Uso: <NotificationContainer /> en DashboardHeader.tsx
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import NotificationBell from './NotificationBell';
import NotificationCenter from './NotificationCenter';
import { getUnreadCount } from '@/lib/actions-notifications';

export default function NotificationContainer() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Cargar contador inicial
  useEffect(() => {
    loadUnreadCount();
  }, []);

  const loadUnreadCount = async () => {
    const count = await getUnreadCount();
    setUnreadCount(count);
  };

  // Actualizar contador cuando cierra el centro
  const handleClose = () => {
    setIsOpen(false);
    loadUnreadCount(); // Refresh count
  };

  return (
    <>
      <NotificationBell
        unreadCount={unreadCount}
        onClick={() => setIsOpen(!isOpen)}
      />
      <NotificationCenter
        isOpen={isOpen}
        onClose={handleClose}
      />
    </>
  );
}
