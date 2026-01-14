# Schema de Base de Datos - Módulo de Notificaciones

**Fecha:** 13 Enero 2026
**Migración:** `migrations/003_modulo_notificaciones.sql`
**Estado:** LISTO PARA EJECUTAR

---

## Resumen Ejecutivo

Este schema implementa un sistema de notificaciones de clase mundial tipo Linear/Notion con:

- **4 tablas principales** (notifications, preferences, templates, delivery_log)
- **9 índices optimizados** para queries frecuentes
- **5 funciones** para operaciones batch
- **RLS policies completas** por rol
- **8 templates seed** para eventos comunes
- **Supabase Realtime** habilitado

### Características Clave

| Característica | Implementación |
|----------------|----------------|
| Real-time updates | Supabase Realtime (WebSocket) |
| Badge counter | Función optimizada (<50ms) |
| Mark all as read | Batch de 10K con SKIP LOCKED |
| Retention | 5 meses automático |
| Multi-canal | In-app, Email, WhatsApp |
| Metadata flexible | JSONB con GIN index |
| Threading | parent_id + thread_key |
| Soft delete | deleted_at para auditoría |

---

## Tablas

### 1. notifications (Principal)

Almacena todas las notificaciones del sistema.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,              -- FK a usuarios
  proyecto_id UUID,                   -- FK a proyectos (opcional)

  type VARCHAR(100) NOT NULL,         -- 'lead_assigned', 'pr_approved'
  category VARCHAR(50) NOT NULL,      -- 'leads', 'purchase_requisitions'
  priority VARCHAR(20) DEFAULT 'normal',

  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  action_url TEXT,
  action_label VARCHAR(100),

  is_read BOOLEAN DEFAULT FALSE,
  is_saved BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  parent_id UUID,                     -- Threading
  thread_key VARCHAR(255),

  actor_id UUID,
  actor_name VARCHAR(255),
  actor_avatar_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

#### Índices Críticos

```sql
-- Índice principal (usado en listado)
idx_notifications_user_created: (user_id, created_at DESC) WHERE deleted_at IS NULL

-- Badge counter (usado en header)
idx_notifications_unread: (user_id, is_read, created_at DESC) WHERE is_read = FALSE

-- Búsquedas en metadata
idx_notifications_metadata: GIN (metadata jsonb_path_ops)

-- Filtros por categoría
idx_notifications_category: (user_id, category, created_at DESC)

-- Cleanup automático
idx_notifications_cleanup: (expires_at) WHERE expires_at IS NOT NULL

-- Threading
idx_notifications_thread: (thread_key, created_at) WHERE thread_key IS NOT NULL

-- Prioridad (urgentes)
idx_notifications_priority: (user_id, priority, created_at DESC)
```

#### Categorías Válidas

- `leads` - Gestión de leads
- `purchase_requisitions` - Órdenes de compra
- `pagos` - Pagos de clientes
- `aprobaciones` - Aprobaciones generales
- `locales` - Gestión de locales
- `comisiones` - Cálculo de comisiones
- `expansion` - Módulo de corredores
- `reuniones` - Reuniones y transcripciones
- `sistema` - Notificaciones del sistema

#### Priorities

- `urgent` - Requiere atención inmediata (<1 hora)
- `high` - Alta prioridad (<4 horas)
- `normal` - Prioridad normal (<24 horas)
- `low` - Baja prioridad (informativa)

#### Metadata Ejemplos

```json
// Lead asignado
{
  "lead_id": "uuid",
  "lead_nombre": "María González",
  "lead_telefono": "+51987654321",
  "proyecto_id": "uuid",
  "proyecto_nombre": "Portal de Primavera"
}

// PR pendiente
{
  "pr_id": "uuid",
  "pr_number": "PR-001",
  "amount": "15000.00",
  "currency": "S/",
  "category": "Tecnología & Sistemas",
  "requester_id": "uuid",
  "requester_name": "Juan Pérez"
}

// Pago registrado
{
  "pago_id": "uuid",
  "local_id": "uuid",
  "local_codigo": "LOCAL-101",
  "amount": "5000.00",
  "currency": "S/",
  "cliente_id": "uuid",
  "cliente_nombre": "Ana Torres"
}
```

---

### 2. notification_preferences

Preferencias de notificaciones por usuario.

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,

  channels JSONB DEFAULT '{"in_app": true, "email": true, "whatsapp": false}',

  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',

  digest_enabled BOOLEAN DEFAULT FALSE,
  digest_frequency VARCHAR(20) DEFAULT 'daily',
  digest_time TIME DEFAULT '09:00',

  category_preferences JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Channels JSONB

```json
{
  "in_app": true,      // Notificaciones en la app
  "email": true,       // Notificaciones por email
  "whatsapp": false,   // Solo urgentes (high-priority)
  "push": false        // Para futuro (mobile app)
}
```

#### Category Preferences JSONB

Override de canales por categoría:

```json
{
  "leads": {
    "in_app": true,
    "email": false
  },
  "purchase_requisitions": {
    "in_app": true,
    "email": true,
    "whatsapp": true  // PRs > S/10K van por WhatsApp
  },
  "pagos": {
    "in_app": true,
    "email": true,
    "whatsapp": false
  }
}
```

---

### 3. notification_templates

Templates reutilizables con placeholders.

```sql
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY,
  type VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,

  in_app_title VARCHAR(255) NOT NULL,
  in_app_message TEXT NOT NULL,

  email_subject VARCHAR(255),
  email_body TEXT,

  whatsapp_message TEXT,

  priority VARCHAR(20) DEFAULT 'normal',
  action_label VARCHAR(100),

  is_active BOOLEAN DEFAULT TRUE,
  version INT DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Placeholders Soportados

Los templates usan sintaxis `{{variable}}`:

```
{{user_name}}           - Nombre del usuario
{{actor_name}}          - Quien generó la notificación
{{lead_nombre}}         - Nombre del lead
{{lead_telefono}}       - Teléfono del lead
{{proyecto_nombre}}     - Nombre del proyecto
{{pr_number}}           - Número de PR
{{amount}}              - Monto
{{currency}}            - Moneda (S/, USD)
{{approver_name}}       - Nombre del aprobador
{{rejection_reason}}    - Motivo de rechazo
{{local_codigo}}        - Código del local
{{cliente_nombre}}      - Nombre del cliente
{{action_url}}          - URL de acción
{{approve_url}}         - URL para aprobar
{{reject_url}}          - URL para rechazar
```

#### Templates Seed

La migración incluye 8 templates iniciales:

1. `lead_assigned` - Lead asignado
2. `lead_contacted` - Lead contactado
3. `pr_created` - PR creada
4. `pr_pending_approval` - PR pendiente de aprobación
5. `pr_approved` - PR aprobada
6. `pr_rejected` - PR rechazada
7. `payment_registered` - Pago registrado
8. `payment_verified` - Pago verificado

---

### 4. notification_delivery_log

Log de entregas multi-canal (opcional, para tracking avanzado).

```sql
CREATE TABLE notification_delivery_log (
  id UUID PRIMARY KEY,
  notification_id UUID NOT NULL,

  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',

  provider VARCHAR(50),
  provider_message_id VARCHAR(255),
  provider_response JSONB,

  error_message TEXT,
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMPTZ,

  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Channels

- `in_app` - Notificación en la aplicación
- `email` - Email (Resend)
- `whatsapp` - WhatsApp (WATI/n8n)
- `push` - Push notification (futuro)

#### Status

- `pending` - Pendiente de envío
- `sent` - Enviado
- `delivered` - Entregado (confirmado)
- `failed` - Falló
- `bounced` - Rebotó (email)

---

## Funciones

### 1. mark_all_as_read_batch

Marca hasta 10K notificaciones como leídas en batch.

```sql
SELECT mark_all_as_read_batch(
  p_user_id := 'user-uuid',
  p_limit := 10000
);
-- Returns: INT (número de notificaciones actualizadas)
```

**Uso:**
- Para "Marcar todas como leídas" en el UI
- Si devuelve 10000, ejecutar nuevamente
- Usa SKIP LOCKED para evitar deadlocks

### 2. get_unread_notification_count

Obtiene el contador de no leídas (badge en header).

```sql
SELECT get_unread_notification_count('user-uuid');
-- Returns: INT (número de no leídas)
```

**Performance:** <50ms con índice `idx_notifications_unread`

### 3. cleanup_old_notifications

Soft delete de notificaciones antiguas (5 meses default).

```sql
SELECT cleanup_old_notifications(5);  -- 5 meses
-- Returns: INT (número de notificaciones eliminadas)
```

**Configurar con pg_cron:**
```sql
SELECT cron.schedule(
  'cleanup-notifications',
  '0 3 * * *',  -- 3:00 AM diario
  'SELECT cleanup_old_notifications(5);'
);
```

### 4. mark_expired_notifications

Marca notificaciones que llegaron a su `expires_at`.

```sql
SELECT mark_expired_notifications();
-- Returns: INT (número marcadas como deleted)
```

**Configurar con pg_cron:**
```sql
SELECT cron.schedule(
  'mark-expired-notifications',
  '0 4 * * *',  -- 4:00 AM diario
  'SELECT mark_expired_notifications();'
);
```

### 5. create_default_notification_preferences

Crea preferencias default para nuevo usuario.

```sql
SELECT create_default_notification_preferences('user-uuid');
-- Returns: UUID (id de preferencias creadas)
```

**Uso:** Ejecutar al registrar un usuario nuevo.

---

## RLS Policies

### notifications

| Policy | Acción | Condición |
|--------|--------|-----------|
| Users can view own notifications | SELECT | user_id = auth.uid() AND deleted_at IS NULL |
| Users can update own notifications | UPDATE | user_id = auth.uid() |
| Service can insert notifications | INSERT | true (cualquier authenticated) |
| Users can delete own notifications | UPDATE | user_id = auth.uid() |

### notification_preferences

| Policy | Acción | Condición |
|--------|--------|-----------|
| Users can view own preferences | SELECT | user_id = auth.uid() |
| Users can manage own preferences | ALL | user_id = auth.uid() |

### notification_templates

| Policy | Acción | Condición |
|--------|--------|-----------|
| Authenticated users can view templates | SELECT | is_active = TRUE |
| Admins can manage templates | ALL | rol IN ('superadmin', 'admin') |

### notification_delivery_log

| Policy | Acción | Condición |
|--------|--------|-----------|
| Users can view own delivery log | SELECT | notification.user_id = auth.uid() |
| Service can manage delivery log | ALL | true |

---

## Supabase Realtime

Para habilitar real-time updates:

### Opción 1: Dashboard de Supabase

1. Ir a **Settings > Database > Publications**
2. Seleccionar **supabase_realtime**
3. Hacer clic en **Add table**
4. Seleccionar **notifications**

### Opción 2: SQL (si tienes permisos)

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### Client-Side (Next.js)

```typescript
const channel = supabase
  .channel(`notifications:${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    const newNotification = payload.new as Notification;
    // Agregar a lista + mostrar toast
  })
  .subscribe();
```

---

## Queries Comunes

### Obtener notificaciones de usuario (paginación keyset)

```sql
-- Primera página
SELECT *
FROM notifications
WHERE user_id = 'user-uuid'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- Página siguiente
SELECT *
FROM notifications
WHERE user_id = 'user-uuid'
  AND deleted_at IS NULL
  AND created_at < '2026-01-13T10:00:00Z'  -- last created_at de página anterior
ORDER BY created_at DESC
LIMIT 50;
```

### Filtrar por categoría

```sql
SELECT *
FROM notifications
WHERE user_id = 'user-uuid'
  AND category = 'purchase_requisitions'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;
```

### Solo no leídas

```sql
SELECT *
FROM notifications
WHERE user_id = 'user-uuid'
  AND is_read = FALSE
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;
```

### Solo guardadas (pinned)

```sql
SELECT *
FROM notifications
WHERE user_id = 'user-uuid'
  AND is_saved = TRUE
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;
```

### Notificaciones agrupadas por thread

```sql
SELECT
  thread_key,
  COUNT(*) as count,
  MAX(created_at) as latest,
  ARRAY_AGG(id ORDER BY created_at DESC) as notification_ids
FROM notifications
WHERE user_id = 'user-uuid'
  AND thread_key IS NOT NULL
  AND deleted_at IS NULL
GROUP BY thread_key
ORDER BY latest DESC;
```

---

## Performance Benchmarks

| Query | Target | Índice Usado |
|-------|--------|--------------|
| Cargar 50 notificaciones | <200ms | idx_notifications_user_created |
| Badge counter | <50ms | idx_notifications_unread |
| Mark as read (single) | <100ms | PRIMARY KEY |
| Mark all as read (100) | <2s | idx_notifications_unread |
| Filtrar por categoría | <200ms | idx_notifications_category |
| Búsqueda en metadata | <300ms | idx_notifications_metadata (GIN) |

---

## Estrategia de Retention

### Notificaciones Normales

- **Retention:** 5 meses desde created_at
- **Acción:** Soft delete (deleted_at = NOW())
- **Frecuencia:** Diario (3:00 AM)
- **Excepción:** is_saved = TRUE (no se eliminan)

### Notificaciones Expiradas

- **Condición:** expires_at < NOW()
- **Acción:** Soft delete
- **Frecuencia:** Diario (4:00 AM)
- **Excepción:** is_saved = TRUE

### Purge Completo (Opcional)

Para eliminar físicamente registros soft-deleted antiguos:

```sql
DELETE FROM notifications
WHERE deleted_at < NOW() - INTERVAL '3 months';
```

**Nota:** Ejecutar en horario de bajo tráfico (madrugada).

---

## Consideraciones de Seguridad

### 1. Service Role vs Authenticated

La policy "Service can insert notifications" permite a cualquier usuario autenticado insertar notificaciones. En producción, considerar:

- Usar `service_role` key solo desde server actions
- Agregar validación adicional en el backend
- Considerar crear un rol específico `notification_service`

### 2. Metadata JSONB

- Validar datos antes de insertar en metadata
- No almacenar información sensible (passwords, tokens)
- Limitar tamaño del JSON (<1MB)

### 3. XSS en Templates

- Sanitizar HTML en email_body antes de renderizar
- Escapar placeholders en el cliente
- Usar biblioteca como DOMPurify

### 4. Rate Limiting

Implementar rate limiting para prevenir spam:

- Max 100 notificaciones por usuario por hora
- Max 10 notificaciones del mismo tipo en 5 minutos

---

## Testing

### Crear notificación de prueba

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
  actor_name,
  expires_at
) VALUES (
  'user-uuid',
  'lead_assigned',
  'leads',
  'normal',
  'Nuevo lead asignado',
  'Juan te asignó el lead María González',
  '{"lead_id": "lead-uuid", "lead_nombre": "María González"}'::jsonb,
  '/leads/lead-uuid',
  'Ver lead',
  'Juan Pérez',
  NOW() + INTERVAL '5 months'
);
```

### Verificar badge counter

```sql
SELECT get_unread_notification_count('user-uuid');
```

### Simular mark all as read

```sql
SELECT mark_all_as_read_batch('user-uuid', 100);
```

### Verificar templates

```sql
SELECT type, category, priority, is_active
FROM notification_templates
WHERE is_active = TRUE;
```

---

## Troubleshooting

### Badge counter incorrecto

```sql
-- Recalcular
SELECT COUNT(*)
FROM notifications
WHERE user_id = 'user-uuid'
  AND is_read = FALSE
  AND deleted_at IS NULL;

-- Verificar índice
EXPLAIN ANALYZE
SELECT COUNT(*)
FROM notifications
WHERE user_id = 'user-uuid'
  AND is_read = FALSE
  AND deleted_at IS NULL;
-- Debe usar idx_notifications_unread
```

### Notificaciones no llegan en real-time

1. Verificar que Realtime está habilitado:
   ```sql
   SELECT * FROM pg_publication_tables
   WHERE pubname = 'supabase_realtime'
   AND tablename = 'notifications';
   ```

2. Verificar RLS policies:
   ```sql
   SELECT * FROM notifications
   WHERE user_id = 'user-uuid'
   LIMIT 1;
   -- Si no devuelve nada, hay problema con RLS
   ```

3. Verificar conexión WebSocket en cliente

### Performance lento en listado

1. Verificar uso de índices:
   ```sql
   EXPLAIN ANALYZE
   SELECT *
   FROM notifications
   WHERE user_id = 'user-uuid'
     AND deleted_at IS NULL
   ORDER BY created_at DESC
   LIMIT 50;
   -- Debe usar idx_notifications_user_created
   ```

2. Si no usa índice, ejecutar:
   ```sql
   REINDEX INDEX idx_notifications_user_created;
   ANALYZE notifications;
   ```

---

## Migración de Datos Existentes

Si ya tienes un sistema de notificaciones antiguo:

```sql
-- Ejemplo: migrar desde tabla legacy_notifications
INSERT INTO notifications (
  user_id,
  type,
  category,
  priority,
  title,
  message,
  metadata,
  action_url,
  is_read,
  created_at
)
SELECT
  user_id,
  notification_type,
  'sistema',  -- categoría default
  'normal',
  title,
  body,
  '{}'::jsonb,  -- metadata vacío
  link_url,
  read_flag,
  created_at
FROM legacy_notifications
WHERE created_at > NOW() - INTERVAL '3 months';  -- Solo últimos 3 meses
```

---

## Próximos Pasos

### Fase 2: Backend (20h)

- [ ] Crear `lib/actions-notifications.ts`
- [ ] Crear `lib/types/notifications.ts`
- [ ] Implementar template engine
- [ ] Integrar con Resend (email)
- [ ] Integrar con n8n (WhatsApp)

### Fase 3: Frontend (24h)

- [ ] Hook `useNotifications`
- [ ] Componente `NotificationBell`
- [ ] Componente `NotificationCenter`
- [ ] Componente `NotificationItem`
- [ ] Integrar Supabase Realtime
- [ ] Toast con Sonner

### Fase 4: Testing (16h)

- [ ] E2E con Playwright
- [ ] Performance testing
- [ ] Load testing (10K notificaciones)

---

**Última actualización:** 13 Enero 2026
**Versión:** 1.0
**Autor:** Database Architect (DataDev)
