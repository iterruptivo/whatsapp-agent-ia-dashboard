# Componentes de Notificaciones

## Descripción

Sistema completo de notificaciones in-app para ECOPLAZA con:
- Bell icon con badge de contador
- Notification Center (dropdown responsive)
- Realtime updates con Supabase
- Agrupación temporal (Hoy, Ayer, Esta semana)
- Infinite scroll con keyset pagination
- Filtros: Todas, No leídas, Guardadas

---

## Archivos Creados

```
components/notifications/
├── NotificationBell.tsx         - Campana con badge
├── NotificationCenter.tsx       - Panel/dropdown principal
├── NotificationItem.tsx         - Item individual de notificación
├── NotificationEmptyState.tsx   - Estado vacío
├── NotificationContainer.tsx    - Contenedor integrado (Bell + Center)
├── index.ts                     - Exports
└── README.md                    - Esta documentación

hooks/
└── useNotifications.ts          - Hook para gestionar estado y Realtime
```

---

## Integración Rápida

### 1. Agregar al Header

Edita `components/dashboard/DashboardHeader.tsx`:

```tsx
import { NotificationContainer } from '@/components/notifications';

export default function DashboardHeader() {
  return (
    <header className="...">
      {/* ... otros elementos ... */}

      {/* AGREGAR AQUÍ (antes del botón de menú) */}
      <NotificationContainer />

      <button onClick={onMenuClick}>
        <Menu className="w-6 h-6" />
      </button>
    </header>
  );
}
```

### 2. Probar localmente

```bash
# Terminal 1: Iniciar dev server (puerto 3000)
npm run dev

# Terminal 2: Crear notificación de prueba (psql o Supabase Studio)
INSERT INTO notifications (user_id, type, category, title, message)
VALUES (
  '(tu-user-id)',
  'system_announcement',
  'system',
  'Prueba de notificación',
  'Este es un mensaje de prueba'
);
```

---

## Uso Avanzado

### Componentes individuales

Si necesitas más control, puedes usar los componentes por separado:

```tsx
'use client';

import { useState } from 'react';
import { NotificationBell, NotificationCenter } from '@/components/notifications';
import { getUnreadCount } from '@/lib/actions-notifications';

export default function MyCustomHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [count, setCount] = useState(0);

  // Tu lógica personalizada...

  return (
    <div>
      <NotificationBell
        unreadCount={count}
        onClick={() => setIsOpen(!isOpen)}
      />
      <NotificationCenter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}
```

### Hook personalizado

```tsx
import { useNotifications } from '@/hooks/useNotifications';

export default function MyComponent() {
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
    filters: { is_read: false }, // Solo no leídas
    limit: 10,
    enableRealtime: true,
  });

  return (
    <div>
      <p>No leídas: {unreadCount}</p>
      {/* Tu UI personalizada */}
    </div>
  );
}
```

---

## Personalización de Estilos

Los componentes usan:
- **Color primario**: `#1b967a` (verde ECOPLAZA)
- **Color secundario**: `#192c4d` (navy)
- **Tailwind CSS**: Todos los estilos son clases Tailwind

### Modificar colores:

En `tailwind.config.ts`:
```ts
theme: {
  extend: {
    colors: {
      primary: '#1b967a', // Ya configurado
    },
  },
},
```

Los componentes usan `text-[#1b967a]` y `bg-[#1b967a]` directamente.

---

## Features

### NotificationBell
- Badge rojo con contador (max "99+")
- Animación sutil (pulse 2s)
- Color verde (#1b967a) cuando hay unread
- Aria-label para accesibilidad

### NotificationCenter
- **Tabs**: Todas, No leídas, Guardadas
- **Agrupación temporal**: Hoy, Ayer, Esta semana, Más antiguas
- **Infinite scroll**: Carga automática al hacer scroll
- **Realtime**: Updates automáticos con Supabase
- **Responsive**: Fullscreen en mobile, dropdown en desktop
- **ESC key**: Cierra el panel
- **Backdrop**: Click fuera cierra (mobile)

### NotificationItem
- Avatar del actor (o emoji de categoría)
- Blue dot para no leídas
- Tiempo relativo ("Hace 2h", "Ayer")
- Priority badge (urgente/alta)
- Action button (si tiene action_url)
- Hover actions: Marcar leída, Guardar, Eliminar

### useNotifications Hook
- Fetch paginado (keyset, NO offset)
- Supabase Realtime (opcional)
- Browser Notifications API (pedir permiso)
- Cache local de estado
- Funciones: markAsRead, markAllAsRead, toggleSave, deleteNotif, loadMore

---

## Testing

### 1. Testing manual

```tsx
// En cualquier server action:
import { createNotification } from '@/lib/actions-notifications';

await createNotification({
  user_id: '...',
  type: 'lead_assigned',
  category: 'leads',
  priority: 'high',
  title: 'Nuevo lead asignado',
  message: 'Se te asignó el lead de Juan Pérez',
  action_url: '/operativo?lead=123',
  action_label: 'Ver lead',
});
```

### 2. Testing Realtime

1. Abrir dos pestañas con el dashboard
2. Insertar notificación en Supabase Studio
3. Ver que aparece automáticamente en ambas pestañas

### 3. Testing de carga (performance)

```sql
-- Crear 1000 notificaciones de prueba
INSERT INTO notifications (user_id, type, category, title, message)
SELECT
  '(tu-user-id)',
  'system_announcement',
  'system',
  'Notificación #' || generate_series,
  'Mensaje de prueba ' || generate_series
FROM generate_series(1, 1000);
```

Verificar que:
- Carga rápida (<500ms)
- Scroll suave
- Infinite scroll funciona
- Sin memory leaks

---

## Troubleshooting

### Badge no muestra el número correcto
- Verificar que `getUnreadCount()` funciona en consola
- Revisar RLS policies en Supabase
- Check user_id en sesión

### Realtime no funciona
- Verificar que Supabase Realtime está habilitado en el proyecto
- Check que la tabla `notifications` tiene Realtime activado
- Revisar console del navegador para errores

### Scroll infinito no carga más
- Verificar `hasMore` en el estado
- Check que `cursor` no es null
- Revisar que hay suficientes notificaciones (>20)

### Notificaciones no se agrupan correctamente
- Verificar timestamps en formato ISO
- Check zona horaria del servidor vs cliente
- Revisar función `groupNotificationsByDate()`

---

## Próximos pasos (opcional)

1. **Email notifications**: Integrar con Resend/SendGrid
2. **WhatsApp notifications**: Webhook a n8n
3. **Push notifications**: Service Worker + Firebase
4. **Digest diario**: Cron job que envía resumen
5. **Templates personalizables**: Admin UI para editar templates

---

## Soporte

Ver documentación completa en:
- `lib/types/notifications.ts` - Tipos y constantes
- `lib/actions-notifications.ts` - Server Actions
- `migrations/003_modulo_notificaciones.sql` - Schema DB
