# Ejemplos de Uso - Sistema de Notificaciones

**Fecha:** 13 Enero 2026
**Audiencia:** Desarrolladores Frontend/Backend

---

## Ejemplos SQL Directos

### 1. Crear Notificación Simple

```sql
INSERT INTO notifications (
  user_id,
  type,
  category,
  priority,
  title,
  message,
  action_url,
  action_label,
  actor_name,
  expires_at
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- user_id
  'lead_assigned',
  'leads',
  'normal',
  'Nuevo lead asignado',
  'Juan Pérez te asignó el lead María González',
  '/leads/abc123',
  'Ver lead',
  'Juan Pérez',
  NOW() + INTERVAL '5 months'
);
```

### 2. Crear Notificación con Metadata

```sql
INSERT INTO notifications (
  user_id,
  type,
  category,
  priority,
  title,
  message,
  metadata,
  action_url,
  action_label,
  actor_id,
  actor_name,
  actor_avatar_url,
  expires_at
) VALUES (
  'user-uuid',
  'lead_assigned',
  'leads',
  'normal',
  'Nuevo lead asignado',
  'Juan Pérez te asignó el lead María González',
  jsonb_build_object(
    'lead_id', 'lead-uuid',
    'lead_nombre', 'María González',
    'lead_telefono', '+51987654321',
    'proyecto_id', 'proyecto-uuid',
    'proyecto_nombre', 'Portal de Primavera'
  ),
  '/leads/lead-uuid',
  'Ver lead',
  'actor-uuid',
  'Juan Pérez',
  'https://example.com/avatars/juan.jpg',
  NOW() + INTERVAL '5 months'
);
```

### 3. Notificación de PR Pendiente con Thread

```sql
INSERT INTO notifications (
  user_id,
  type,
  category,
  priority,
  title,
  message,
  metadata,
  action_url,
  action_label,
  thread_key,
  actor_id,
  actor_name,
  expires_at
) VALUES (
  'approver-uuid',
  'pr_pending_approval',
  'purchase_requisitions',
  'high',
  'PR #001 requiere tu aprobación',
  'Juan Pérez solicita S/ 15,000.00',
  jsonb_build_object(
    'pr_id', 'pr-uuid',
    'pr_number', 'PR-001',
    'amount', '15000.00',
    'currency', 'S/',
    'category', 'Tecnología & Sistemas',
    'requester_id', 'requester-uuid',
    'requester_name', 'Juan Pérez',
    'approve_url', '/solicitudes-compra/pr-uuid/aprobar',
    'reject_url', '/solicitudes-compra/pr-uuid/rechazar'
  ),
  '/solicitudes-compra/pr-uuid',
  'Ver PR',
  'pr-001',  -- thread_key para agrupar
  'requester-uuid',
  'Juan Pérez',
  NOW() + INTERVAL '3 months'  -- PRs expiran antes
);
```

### 4. Notificación con Reply (Threading)

```sql
-- Notificación principal
INSERT INTO notifications (
  id,  -- Especificar ID para el reply
  user_id,
  type,
  category,
  title,
  message,
  thread_key
) VALUES (
  'parent-uuid',
  'user-uuid',
  'pr_pending_approval',
  'purchase_requisitions',
  'PR #001 pendiente',
  'Tu PR está pendiente de aprobación',
  'pr-001'
);

-- Reply cuando se aprueba
INSERT INTO notifications (
  user_id,
  type,
  category,
  title,
  message,
  parent_id,  -- Referencia al padre
  thread_key
) VALUES (
  'user-uuid',
  'pr_approved',
  'purchase_requisitions',
  'PR #001 aprobada',
  'Tu PR fue aprobada por Ana Torres',
  'parent-uuid',  -- ID de la notificación padre
  'pr-001'
);
```

---

## Ejemplos de Server Actions (Next.js)

### Server Action: Crear Notificación

```typescript
// lib/actions-notifications.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function createNotification(input: {
  userId: string;
  type: string;
  category: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  actorId?: string;
  actorName?: string;
  actorAvatarUrl?: string;
  threadKey?: string;
  parentId?: string;
}) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: input.userId,
      type: input.type,
      category: input.category,
      priority: input.priority || 'normal',
      title: input.title,
      message: input.message,
      metadata: input.metadata || {},
      action_url: input.actionUrl,
      action_label: input.actionLabel,
      actor_id: input.actorId,
      actor_name: input.actorName,
      actor_avatar_url: input.actorAvatarUrl,
      thread_key: input.threadKey,
      parent_id: input.parentId,
      expires_at: new Date(Date.now() + 5 * 30 * 24 * 60 * 60 * 1000), // 5 meses
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Ejemplo de Uso: Lead Asignado

```typescript
// En tu server action que asigna leads
import { createNotification } from '@/lib/actions-notifications';

export async function asignarLead(leadId: string, vendedorId: string, actorId: string) {
  // ... lógica de asignación ...

  // Obtener datos del lead y actor
  const lead = await getLeadById(leadId);
  const actor = await getUsuarioById(actorId);

  // Crear notificación
  await createNotification({
    userId: vendedorId,
    type: 'lead_assigned',
    category: 'leads',
    priority: 'normal',
    title: 'Nuevo lead asignado',
    message: `${actor.nombre} te asignó el lead ${lead.nombre}`,
    metadata: {
      lead_id: lead.id,
      lead_nombre: lead.nombre,
      lead_telefono: lead.telefono,
      proyecto_id: lead.proyecto_id,
      proyecto_nombre: lead.proyecto_nombre,
    },
    actionUrl: `/leads/${lead.id}`,
    actionLabel: 'Ver lead',
    actorId: actor.id,
    actorName: actor.nombre,
    actorAvatarUrl: actor.avatar_url,
    threadKey: `lead-${lead.id}`,
  });

  return { success: true };
}
```

### Ejemplo de Uso: PR Pendiente Aprobación

```typescript
export async function submitPR(prId: string, approverId: string, requesterId: string) {
  // ... lógica de submit ...

  const pr = await getPRById(prId);
  const requester = await getUsuarioById(requesterId);

  await createNotification({
    userId: approverId,
    type: 'pr_pending_approval',
    category: 'purchase_requisitions',
    priority: 'high',
    title: `PR #${pr.number} requiere tu aprobación`,
    message: `${requester.nombre} solicita ${pr.currency} ${pr.amount}`,
    metadata: {
      pr_id: pr.id,
      pr_number: pr.number,
      amount: pr.amount,
      currency: pr.currency,
      category: pr.category,
      requester_id: requester.id,
      requester_name: requester.nombre,
      approve_url: `/solicitudes-compra/${pr.id}/aprobar`,
      reject_url: `/solicitudes-compra/${pr.id}/rechazar`,
    },
    actionUrl: `/solicitudes-compra/${pr.id}`,
    actionLabel: 'Ver PR',
    actorId: requester.id,
    actorName: requester.nombre,
    actorAvatarUrl: requester.avatar_url,
    threadKey: `pr-${pr.number}`,
  });

  // Si monto >S/10K, también enviar por WhatsApp
  if (parseFloat(pr.amount) > 10000) {
    await sendWhatsAppNotification(approverId, {
      message: `🔔 *Aprobación Requerida*\n\nPR #${pr.number}\nMonto: ${pr.currency} ${pr.amount}\n\nAprobar: ${process.env.NEXT_PUBLIC_BASE_URL}/solicitudes-compra/${pr.id}/aprobar`,
    });
  }

  return { success: true };
}
```

### Server Action: Obtener Notificaciones

```typescript
export async function getNotifications(
  userId: string,
  filters?: {
    category?: string;
    isRead?: boolean;
    isSaved?: boolean;
    limit?: number;
    cursorCreatedAt?: string;
  }
) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.isRead !== undefined) {
    query = query.eq('is_read', filters.isRead);
  }

  if (filters?.isSaved !== undefined) {
    query = query.eq('is_saved', filters.isSaved);
  }

  // Keyset pagination
  if (filters?.cursorCreatedAt) {
    query = query.lt('created_at', filters.cursorCreatedAt);
  }

  query = query.order('created_at', { ascending: false }).limit(filters?.limit || 50);

  const { data, error } = await query;

  if (error) throw error;
  return data;
}
```

### Server Action: Marcar Como Leída

```typescript
export async function markAsRead(notificationId: string, userId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .eq('user_id', userId) // Seguridad: solo su notificación
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Server Action: Marcar Todas Como Leídas

```typescript
export async function markAllAsRead(userId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Usar función SQL optimizada
  const { data, error } = await supabase.rpc('mark_all_as_read_batch', {
    p_user_id: userId,
    p_limit: 10000,
  });

  if (error) throw error;

  // Si marcó 10K, puede haber más
  if (data === 10000) {
    // Ejecutar nuevamente
    return markAllAsRead(userId);
  }

  return { count: data };
}
```

### Server Action: Obtener Contador

```typescript
export async function getUnreadCount(userId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase.rpc('get_unread_notification_count', {
    p_user_id: userId,
  });

  if (error) throw error;
  return data as number;
}
```

---

## Ejemplos de Frontend (React)

### Hook: useNotifications con Realtime

```typescript
// hooks/useNotifications.ts
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  category: string;
  priority: string;
  title: string;
  message: string;
  metadata: Record<string, any>;
  action_url?: string;
  action_label?: string;
  is_read: boolean;
  is_saved: boolean;
  actor_name?: string;
  actor_avatar_url?: string;
  created_at: string;
};

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // 1. Fetch inicial
    const fetchNotifications = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
      setIsLoading(false);
    };

    fetchNotifications();

    // 2. Subscribe a Realtime
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;

          // Agregar a la lista
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Mostrar toast
          toast(newNotification.title, {
            description: newNotification.message,
            action: newNotification.action_url
              ? {
                  label: newNotification.action_label || 'Ver',
                  onClick: () => {
                    window.location.href = newNotification.action_url!;
                  },
                }
              : undefined,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;

          // Actualizar en la lista
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          );

          // Actualizar contador si cambió is_read
          if (updatedNotification.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  return { notifications, unreadCount, isLoading };
}
```

### Componente: NotificationBell

```typescript
// components/notifications/NotificationBell.tsx
'use client';

import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function NotificationBell({ userId }: { userId: string }) {
  const { unreadCount } = useNotifications(userId);

  // Mostrar "99+" si >99
  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full p-0 text-[10px] flex items-center justify-center"
        >
          {displayCount}
        </Badge>
      )}
    </Button>
  );
}
```

### Componente: NotificationItem

```typescript
// components/notifications/NotificationItem.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import type { Notification } from '@/hooks/useNotifications';

export function NotificationItem({
  notification,
  onMarkAsRead,
  onSave,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onSave: (id: string, saved: boolean) => void;
}) {
  const priorityColors = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    normal: 'bg-blue-500',
    low: 'bg-gray-500',
  };

  return (
    <div
      className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
        !notification.is_read ? 'bg-blue-50' : ''
      }`}
      onClick={() => {
        if (!notification.is_read) {
          onMarkAsRead(notification.id);
        }
        if (notification.action_url) {
          window.location.href = notification.action_url;
        }
      }}
    >
      <div className="flex gap-3">
        {/* Indicador de prioridad */}
        {!notification.is_read && (
          <div
            className={`w-2 h-2 rounded-full mt-2 ${
              priorityColors[notification.priority as keyof typeof priorityColors]
            }`}
          />
        )}

        {/* Avatar del actor */}
        {notification.actor_avatar_url && (
          <Avatar className="h-10 w-10">
            <AvatarImage src={notification.actor_avatar_url} />
            <AvatarFallback>{notification.actor_name?.[0] || 'A'}</AvatarFallback>
          </Avatar>
        )}

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-normal'}`}>
                {notification.title}
              </p>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
            </div>

            {/* Botón guardar */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onSave(notification.id, !notification.is_saved);
              }}
            >
              {notification.is_saved ? (
                <BookmarkCheck className="h-4 w-4 text-yellow-500" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Timestamp */}
          <p className="text-xs text-gray-400 mt-2">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: es,
            })}
          </p>

          {/* Action button */}
          {notification.action_label && notification.action_url && (
            <Button variant="link" size="sm" className="mt-2 p-0 h-auto">
              {notification.action_label} →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Componente: NotificationCenter

```typescript
// components/notifications/NotificationCenter.tsx
'use client';

import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { markAsRead, markAllAsRead, saveNotification } from '@/lib/actions-notifications';

export function NotificationCenter({ userId }: { userId: string }) {
  const { notifications, unreadCount } = useNotifications(userId);
  const [filter, setFilter] = useState<'all' | 'unread' | 'saved'>('all');

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'saved') return n.is_saved;
    return true;
  });

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id, userId);
  };

  const handleSave = async (id: string, saved: boolean) => {
    await saveNotification(id, userId, saved);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead(userId);
  };

  return (
    <div className="w-[400px] max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">Notificaciones</h2>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="unread">
            No leídas {unreadCount > 0 && `(${unreadCount})`}
          </TabsTrigger>
          <TabsTrigger value="saved">Guardadas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">¡Todo al día!</p>
            <p className="text-sm mt-2">No tienes notificaciones {filter === 'unread' && 'sin leer'}</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onSave={handleSave}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

---

## Ejemplo Completo: Integración en Header

```typescript
// components/dashboard/DashboardHeader.tsx
'use client';

import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function DashboardHeader({ userId }: { userId: string }) {
  return (
    <header className="border-b">
      <div className="flex items-center justify-between p-4">
        <h1>ECOPLAZA Dashboard</h1>

        <div className="flex items-center gap-4">
          {/* Notificaciones */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <NotificationBell userId={userId} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[400px] p-0">
              <NotificationCenter userId={userId} />
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Otros elementos del header */}
        </div>
      </div>
    </header>
  );
}
```

---

## Pruebas E2E con Playwright

```typescript
// tests/notifications.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Sistema de Notificaciones', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'alonso@ecoplaza.com');
    await page.fill('input[name="password"]', 'Q0KlC36J4M_y');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('debe mostrar badge con contador de notificaciones', async ({ page }) => {
    const badge = page.locator('[data-testid="notification-badge"]');
    await expect(badge).toBeVisible();

    const count = await badge.textContent();
    expect(parseInt(count || '0')).toBeGreaterThanOrEqual(0);
  });

  test('debe abrir el centro de notificaciones al hacer clic en el bell', async ({ page }) => {
    await page.click('[data-testid="notification-bell"]');
    await expect(page.locator('[data-testid="notification-center"]')).toBeVisible();
  });

  test('debe marcar notificación como leída al hacer clic', async ({ page }) => {
    await page.click('[data-testid="notification-bell"]');

    const firstNotification = page.locator('[data-testid="notification-item"]').first();
    const isUnread = await firstNotification.getAttribute('data-unread');

    if (isUnread === 'true') {
      const initialBadgeCount = parseInt(
        (await page.locator('[data-testid="notification-badge"]').textContent()) || '0'
      );

      await firstNotification.click();

      // Verificar que el badge decrementó
      const newBadgeCount = parseInt(
        (await page.locator('[data-testid="notification-badge"]').textContent()) || '0'
      );
      expect(newBadgeCount).toBe(initialBadgeCount - 1);
    }
  });

  test('debe marcar todas como leídas', async ({ page }) => {
    await page.click('[data-testid="notification-bell"]');
    await page.click('[data-testid="mark-all-read-button"]');

    // Verificar que el badge es 0 o no está visible
    const badge = page.locator('[data-testid="notification-badge"]');
    await expect(badge).not.toBeVisible();
  });

  test('debe filtrar por no leídas', async ({ page }) => {
    await page.click('[data-testid="notification-bell"]');
    await page.click('[data-testid="filter-unread"]');

    // Todas las notificaciones visibles deben estar sin leer
    const notifications = page.locator('[data-testid="notification-item"]');
    const count = await notifications.count();

    for (let i = 0; i < count; i++) {
      const isUnread = await notifications.nth(i).getAttribute('data-unread');
      expect(isUnread).toBe('true');
    }
  });

  test('debe guardar notificación', async ({ page }) => {
    await page.click('[data-testid="notification-bell"]');

    const saveButton = page.locator('[data-testid="save-notification-button"]').first();
    await saveButton.click();

    // Verificar que el icono cambió
    await expect(page.locator('[data-testid="saved-icon"]').first()).toBeVisible();
  });
});
```

---

**Última actualización:** 13 Enero 2026
**Versión:** 1.0
**Autor:** Database Architect (DataDev)
