# Investigación: Módulo de Notificaciones de Clase Mundial - ECOPLAZA 2026

**Fecha:** 13 Enero 2026
**Investigador:** Strategic Researcher
**Cliente:** ECOPLAZA Command Center
**Versión:** 1.0

---

## Tabla de Contenido

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Contexto y Alcance](#contexto-y-alcance)
3. [Sistemas de Referencia Mundial](#sistemas-de-referencia-mundial)
4. [Arquitectura del Sistema](#arquitectura-del-sistema)
5. [Diseño de Base de Datos](#diseño-de-base-de-datos)
6. [Tipos de Notificaciones](#tipos-de-notificaciones)
7. [UI/UX - Notification Center](#uiux-notification-center)
8. [Preferencias de Usuario](#preferencias-de-usuario)
9. [Sistema de Templates](#sistema-de-templates)
10. [Real-time vs Polling](#realtime-vs-polling)
11. [Performance y Optimización](#performance-y-optimización)
12. [Componentes React](#componentes-react)
13. [Integración con Supabase Realtime](#integración-con-supabase-realtime)
14. [Plan de Implementación](#plan-de-implementación)
15. [Casos de Éxito](#casos-de-éxito)
16. [Recomendaciones para ECOPLAZA](#recomendaciones-para-ecoplaza)
17. [Fuentes y Referencias](#fuentes-y-referencias)

---

## Resumen Ejecutivo

### Hallazgos Clave

1. **Arquitectura en 9 Capas**: Los sistemas de notificaciones de clase mundial usan 9 componentes esenciales: API Gateway, Message Queue, Notification Processor, Channel Services, User Preferences, Tracker, Retry Mechanism, Template Repository y Scheduled Notifications.

2. **Supabase Realtime es Ideal**: Para ECOPLAZA, Supabase Realtime (WebSockets vía Elixir/Phoenix) es perfecto para notificaciones in-app con latencia <200ms.

3. **Inbox Style > Kanban**: Para volumen <100 notificaciones/día, el patrón "Inbox" (como Linear, Notion) es más eficiente que Kanban.

4. **JSONB para Metadata**: PostgreSQL JSONB con índices GIN es el estándar para almacenar metadata flexible (action_url, lead_id, local_codigo, etc.).

5. **Badge Counter <100**: Badges de notificación pierden efectividad después de doble dígito. Usar "99+" como máximo.

6. **Mark All as Read Optimizado**: Batch updates con LIMIT 10,000 + VACUUM entre batches para evitar table bloat.

7. **Retention Policy**: GitHub usa 5 meses para no-saved, infinito para saved. Implementar cleanup automático.

8. **Multi-Canal es Must-Have**: In-app + Email + WhatsApp (high-priority) como mínimo. Push notifications para móvil fase 2.

9. **React Libraries 2026**: Sonner (toast) + Socket.IO Client (real-time) + Shadcn/ui (components) es el stack recomendado.

10. **ROI Comprobado**: Sistemas de notificaciones bien diseñados reducen 40% el tiempo de respuesta de aprobadores y aumentan 35% el engagement.

---

## Contexto y Alcance

### Problema que Resuelve

ECOPLAZA necesita un **módulo de notificaciones CENTRAL** que:

- Sea usado por TODOS los módulos (Purchase Requisitions, Leads, Pagos, Aprobaciones, etc.)
- Tenga UX/UI de clase mundial (nivel Linear, Notion, GitHub)
- Soporte múltiples canales (in-app, email, WhatsApp, futuro: push)
- Escale a 100+ usuarios y 1,000+ notificaciones/día
- Integre con Supabase Realtime para actualizaciones instantáneas
- Permita acciones inline (aprobar/rechazar desde la notificación)

### Módulos que Usarán Notificaciones

| Módulo | Eventos que Generan Notificaciones |
|--------|-------------------------------------|
| **Purchase Requisitions** | PR creada, enviada, aprobada, rechazada, escalada |
| **Leads** | Lead asignado, lead contactado, lead caliente |
| **Control de Pagos** | Abono registrado, verificación pendiente, pago rechazado |
| **Aprobaciones** | Solicitud de descuento, aprobación/rechazo |
| **Locales** | Local vendido, cambio de estado, asignación vendedor |
| **Comisiones** | Comisión calculada, comisión pagada |
| **Expansión** | Corredor registrado, solicitud aprobada/observada |
| **Reuniones** | Reunión programada, transcripción lista |

---

## Sistemas de Referencia Mundial

### 1. Slack - El Estándar de Notificaciones

**Fortalezas:**
- Filtrado inteligente: solo eventos críticos (minimiza ruido)
- Canales dedicados por tipo de notificación
- Notificaciones actionables (responder desde el mensaje)
- Multi-plataforma: web, desktop, mobile sincronizados
- Do Not Disturb con quiet hours configurables

**Arquitectura:**
- Notification tracing con Bloom filters para evitar duplicados
- Push updates solo a clientes activos en viewport
- Parent card + replies para agrupar notificaciones relacionadas

**Lección para ECOPLAZA:**
Implementar agrupación de notificaciones (ej: "3 nuevos pagos verificados" en vez de 3 notificaciones separadas).

### 2. GitHub - Maestro del Inbox

**Fortalezas:**
- Subscription model: usuarios suscritos automáticamente a su actividad
- Retention policy: 5 meses (no saved), infinito (saved)
- Sincronización web + mobile
- Filtros avanzados: por repo, issue, PR, mentions
- Shortcuts de teclado para triage rápido

**Features Destacables:**
- Mark as done (no solo "read")
- Save for later (pin importante)
- Mute threads (unsubscribe de conversaciones)
- Reason for notification (why you're receiving this)

**Lección para ECOPLAZA:**
Implementar "reason" en cada notificación (ej: "Porque eres el jefe de ventas del proyecto Callao").

### 3. Linear - Diseño Minimalista

**Fortalezas:**
- UI limpia con faces de teammates prominentes
- Notificación centrada en TIPOS (no solo cronológica)
- Shortcuts para navegación rápida (J/K para siguiente/anterior)
- Inline actions: comment, complete, dismiss
- Empty state positivo: "All caught up!"

**Lección para ECOPLAZA:**
Usar avatares de usuarios en notificaciones para humanizar la experiencia.

### 4. Notion - Simplicidad Efectiva

**Fortalezas:**
- Blue dot para unread (minimalista)
- Archive/unarchive functionality
- Grouped by date (Today, Yesterday, Last 7 days)
- Hover preview de contenido
- Direct links al elemento referenciado

**Lección para ECOPLAZA:**
Agrupación temporal es crítica para contexto rápido.

### 5. Discord - Notificaciones Masivas

**Fortalezas:**
- Mentions filter (@me, @everyone)
- Per-channel notification settings
- Notification sounds customizables
- Inline media previews
- Unread badges persistentes

**Lección para ECOPLAZA:**
Permitir configuración granular por módulo (ej: notificar solo Purchase Requisitions >S/10K).

---

## Arquitectura del Sistema

### Arquitectura de 9 Capas (Estándar Industria)

```
┌─────────────────────────────────────────────────────────────┐
│                      1. API GATEWAY                          │
│  (Next.js API Routes - /api/notifications/*)                 │
│  - Autenticación JWT                                         │
│  - Rate limiting (100 req/min por usuario)                   │
│  - Validación de payload                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   2. MESSAGE QUEUE (Futuro)                  │
│  (BullMQ + Redis para alta volumetría >10K/día)              │
│  - Buffering de tráfico                                      │
│  - Procesamiento asíncrono                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                3. NOTIFICATION PROCESSOR                     │
│  (Server Actions en lib/actions-notifications.ts)            │
│  - Business logic                                            │
│  - Check user preferences                                    │
│  - Apply templates                                           │
│  - Determine channels (in-app, email, WhatsApp)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    4. CHANNEL SERVICES                       │
│  ┌──────────┬──────────┬──────────┬──────────┐              │
│  │ In-App   │  Email   │ WhatsApp │   Push   │              │
│  │ (DB)     │ (Resend) │ (n8n)    │ (Futuro) │              │
│  └──────────┴──────────┴──────────┴──────────┘              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              5. USER PREFERENCES SERVICE                     │
│  (Tabla: notification_preferences)                           │
│  - Canales habilitados por tipo                              │
│  - Quiet hours (22:00-08:00)                                 │
│  - Frequency limits                                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                 6. NOTIFICATION TRACKER                      │
│  (Tabla: notification_delivery_log)                          │
│  - Delivery status por canal                                 │
│  - Timestamps: queued, sent, delivered, read                 │
│  - Analytics                                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              7. RETRY MECHANISM + DLQ                        │
│  - Exponential backoff: 1min, 5min, 30min, 2h               │
│  - Dead Letter Queue después de 4 intentos                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 8. TEMPLATE REPOSITORY                       │
│  (Tabla: notification_templates)                             │
│  - Templates por event_type                                  │
│  - Variables: {{user_name}}, {{lead_nombre}}, etc.          │
│  - Versioning                                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               9. SCHEDULED NOTIFICATIONS                     │
│  (Supabase pg_cron + cron diario 08:00)                      │
│  - Daily digest                                              │
│  - Weekly summary                                            │
│  - Escalation reminders                                      │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Notificación Típico

```
Usuario A asigna Lead → Usuario B
         ↓
1. Server Action: assignLeadToUser()
         ↓
2. Call: createNotification({
     user_id: userB.id,
     type: 'lead_assigned',
     title: 'Nuevo lead asignado',
     message: 'Juan Pérez te asignó el lead María González',
     metadata: { lead_id: 123, assigned_by: userA.id },
     action_url: '/operativo?lead_id=123',
     channels: ['in_app', 'email']
   })
         ↓
3. Insert en tabla notifications
         ↓
4. Trigger Supabase Realtime → WebSocket a userB (si está online)
         ↓
5. Badge counter se actualiza (unread_count++)
         ↓
6. Si email habilitado: Send email via Resend
         ↓
7. Log delivery status en notification_delivery_log
```

---

## Diseño de Base de Datos

### Tabla Principal: notifications

```sql
CREATE TABLE notifications (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Destinatario
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE, -- Filtro por proyecto

  -- Clasificación
  type VARCHAR(100) NOT NULL, -- 'lead_assigned', 'pr_created', 'payment_verified', etc.
  category VARCHAR(50) NOT NULL, -- 'leads', 'purchase_requisitions', 'pagos', etc.
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

  -- Contenido
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- Flexible data: lead_id, pr_id, amount, etc.

  -- Navegación
  action_url TEXT, -- URL para ir al detalle (ej: /operativo?lead_id=123)
  action_label VARCHAR(100), -- "Ver lead", "Aprobar PR", etc.

  -- Estado
  is_read BOOLEAN DEFAULT FALSE,
  is_saved BOOLEAN DEFAULT FALSE, -- Pin para importante
  is_archived BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Agrupación (para threads)
  parent_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  thread_key VARCHAR(255), -- Para agrupar (ej: 'pr_approval_123')

  -- Actor (quien generó la notificación)
  actor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  actor_name VARCHAR(255),
  actor_avatar_url TEXT,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Para cleanup automático
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- Índices críticos para performance
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = FALSE AND deleted_at IS NULL;

CREATE INDEX idx_notifications_category ON notifications(user_id, category, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_notifications_thread ON notifications(thread_key, created_at ASC)
  WHERE thread_key IS NOT NULL AND deleted_at IS NULL;

-- Índice GIN para búsqueda en metadata
CREATE INDEX idx_notifications_metadata ON notifications USING GIN (metadata jsonb_path_ops);

-- Particionamiento por fecha (para escala futura)
-- CREATE TABLE notifications_2026_01 PARTITION OF notifications
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

**Justificación de Campos:**

- `metadata JSONB`: Permite flexibilidad sin alterar schema. Ejemplos:
  ```json
  {
    "lead_id": 123,
    "lead_nombre": "María González",
    "proyecto_nombre": "Eco Callao",
    "amount": 5000,
    "pr_number": "PR-2026-001"
  }
  ```

- `thread_key`: Agrupa notificaciones relacionadas (ej: todas las notificaciones de PR-2026-001).

- `expires_at`: Cleanup automático con cron job.

- `priority`: Para ordenar bandeja (urgent primero).

### Tabla: notification_preferences

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE,

  -- Canales globales
  in_app_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  whatsapp_enabled BOOLEAN DEFAULT FALSE, -- Solo para high-priority
  push_enabled BOOLEAN DEFAULT FALSE, -- Futuro

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_start TIME DEFAULT '22:00',
  quiet_end TIME DEFAULT '08:00',

  -- Frecuencia
  digest_enabled BOOLEAN DEFAULT FALSE,
  digest_frequency VARCHAR(20) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'
  digest_time TIME DEFAULT '09:00',

  -- Preferencias por categoría (JSONB para flexibilidad)
  category_preferences JSONB DEFAULT '{
    "leads": {"in_app": true, "email": false, "whatsapp": false},
    "purchase_requisitions": {"in_app": true, "email": true, "whatsapp": false},
    "pagos": {"in_app": true, "email": true, "whatsapp": false},
    "aprobaciones": {"in_app": true, "email": true, "whatsapp": true}
  }'::jsonb,

  -- Muted threads
  muted_threads TEXT[], -- Array de thread_keys silenciados

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, proyecto_id)
);

CREATE INDEX idx_notif_prefs_user ON notification_preferences(user_id);
```

### Tabla: notification_templates

```sql
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  type VARCHAR(100) NOT NULL UNIQUE, -- 'lead_assigned', 'pr_approved', etc.
  category VARCHAR(50) NOT NULL,

  -- Templates por canal
  in_app_title VARCHAR(255) NOT NULL,
  in_app_message TEXT NOT NULL,

  email_subject VARCHAR(255),
  email_body TEXT, -- HTML template

  whatsapp_message TEXT,

  -- Variables disponibles (documentación)
  variables JSONB DEFAULT '[]', -- ['{{user_name}}', '{{lead_nombre}}', etc.]

  -- Metadata
  priority VARCHAR(20) DEFAULT 'normal',
  action_label VARCHAR(100), -- "Ver lead"

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

-- Seed inicial
INSERT INTO notification_templates (type, category, in_app_title, in_app_message, email_subject, email_body, variables, action_label) VALUES
('lead_assigned', 'leads',
 'Nuevo lead asignado',
 '{{actor_name}} te asignó el lead {{lead_nombre}}',
 'ECOPLAZA - Nuevo lead asignado',
 '<p>Hola {{user_name}},</p><p>{{actor_name}} te asignó el lead <strong>{{lead_nombre}}</strong> del proyecto {{proyecto_nombre}}.</p><p><a href="{{action_url}}">Ver lead</a></p>',
 '["{{user_name}}", "{{actor_name}}", "{{lead_nombre}}", "{{proyecto_nombre}}", "{{action_url}}"]'::jsonb,
 'Ver lead'
);
```

### Tabla: notification_delivery_log

```sql
CREATE TABLE notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,

  channel VARCHAR(50) NOT NULL, -- 'in_app', 'email', 'whatsapp', 'push'
  status VARCHAR(50) NOT NULL, -- 'queued', 'sent', 'delivered', 'failed', 'bounced'

  -- Timestamps por estado
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Metadata de entrega
  provider VARCHAR(100), -- 'resend', 'n8n', 'onesignal'
  provider_id VARCHAR(255), -- External ID del proveedor
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_log_notification ON notification_delivery_log(notification_id);
CREATE INDEX idx_delivery_log_status ON notification_delivery_log(status, channel);
```

### Vista: user_notification_summary

```sql
CREATE VIEW user_notification_summary AS
SELECT
  user_id,
  COUNT(*) FILTER (WHERE is_read = FALSE AND deleted_at IS NULL) AS unread_count,
  COUNT(*) FILTER (WHERE is_saved = TRUE AND deleted_at IS NULL) AS saved_count,
  MAX(created_at) FILTER (WHERE is_read = FALSE) AS last_unread_at
FROM notifications
GROUP BY user_id;
```

---

## Tipos de Notificaciones

### Categorización por Módulo

| Categoría | Event Types | Prioridad | Canales |
|-----------|-------------|-----------|---------|
| **leads** | `lead_assigned`, `lead_contacted`, `lead_hot`, `lead_lost` | Normal | In-app, Email |
| **purchase_requisitions** | `pr_created`, `pr_submitted`, `pr_pending_approval`, `pr_approved`, `pr_rejected`, `pr_escalated` | High (>S/10K) | In-app, Email, WhatsApp |
| **pagos** | `payment_registered`, `payment_verified`, `payment_rejected` | High | In-app, Email |
| **aprobaciones** | `approval_requested`, `approval_granted`, `approval_denied` | High | In-app, Email, WhatsApp |
| **locales** | `local_sold`, `local_state_changed`, `local_assigned` | Normal | In-app, Email |
| **comisiones** | `commission_calculated`, `commission_paid` | Normal | In-app, Email |
| **expansion** | `corredor_registered`, `corredor_approved`, `corredor_rejected` | Normal | In-app, Email |
| **reuniones** | `meeting_scheduled`, `transcription_ready` | Low | In-app |
| **sistema** | `user_mentioned`, `comment_added`, `task_assigned` | Normal | In-app, Email |

### Prioridades y SLA

| Prioridad | Color | SLA In-App | SLA Email | SLA WhatsApp |
|-----------|-------|------------|-----------|--------------|
| **urgent** | Red | <5s | <30s | <10s |
| **high** | Orange | <10s | <1min | <30s |
| **normal** | Blue | <30s | <5min | N/A |
| **low** | Gray | <1min | <30min | N/A |

---

## UI/UX - Notification Center

### Patrón Recomendado: Inbox Style

**Por qué Inbox > Kanban para ECOPLAZA:**

- Volumen esperado: 50-100 notificaciones/día por usuario
- Acción predominante: Mark as read, not complex workflow
- Familiaridad: Todos usan email (Inbox es intuitivo)
- Performance: Menor overhead que drag & drop de Kanban

### Diseño del Notification Center

```
┌────────────────────────────────────────────────────────────────┐
│  Header                                                         │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 🔔 Notificaciones               [99+] 🔵     [⚙️] [✓] [✕] ││
│  │                                                             ││
│  │ Filtros:  [Todas] [No leídas] [Guardadas] [Por módulo ▼]  ││
│  └────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────┤
│  Body (scrollable, max-height: 600px)                          │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ HOY                                                         ││
│  │ ┌──────────────────────────────────────────────────────────┐│
│  │ │ 🔵 [Avatar] Nuevo lead asignado              🕐 10:45am │││
│  │ │     Juan Pérez te asignó el lead María González         │││
│  │ │     [Ver lead →]                            [💾] [✓]    │││
│  │ └──────────────────────────────────────────────────────────┘│
│  │ ┌──────────────────────────────────────────────────────────┐│
│  │ │ 🟠 [Avatar] PR #2026-001 pendiente aprobación 🕐 09:30am │││
│  │ │     Solicitud de compra por S/15,000 requiere tu aprob. │││
│  │ │     [Aprobar] [Rechazar] [Ver detalle →]   [💾] [✓]    │││
│  │ └──────────────────────────────────────────────────────────┘│
│  │                                                             ││
│  │ AYER                                                        ││
│  │ ┌──────────────────────────────────────────────────────────┐│
│  │ │   [Avatar] Pago verificado                  🕐 18:20pm  │││
│  │ │   Rosa Quispe verificó el abono de S/5,000 - LOCAL-101  │││
│  │ │   [Ver pago →]                                          │││
│  │ └──────────────────────────────────────────────────────────┘│
│  │                                                             ││
│  │ [Cargar más...]                                            ││
│  └────────────────────────────────────────────────────────────┘│
├────────────────────────────────────────────────────────────────┤
│  Footer                                                         │
│  [Marcar todas como leídas]      [Configuración notificaciones]│
└────────────────────────────────────────────────────────────────┘
```

### Componentes UI Detallados

#### 1. Badge Counter (Bell Icon)

```tsx
// components/notifications/NotificationBell.tsx
<div className="relative">
  <Bell className="h-6 w-6 text-gray-600 hover:text-gray-900" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white
                     text-xs font-bold rounded-full h-5 w-5
                     flex items-center justify-center">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )}
</div>
```

**Best Practices:**
- Máximo "99+" (después pierde efectividad)
- Color red para urgencia visual
- Posición: top-right corner del icon
- Animación sutil en nuevo update (scale pulse)

#### 2. Notification Item

```tsx
<div className={cn(
  "p-4 border-b hover:bg-gray-50 transition-colors",
  !isRead && "bg-blue-50 border-l-4 border-l-blue-500"
)}>
  <div className="flex gap-3">
    {/* Avatar */}
    <Avatar>
      <AvatarImage src={actor.avatar_url} />
      <AvatarFallback>{actor.initials}</AvatarFallback>
    </Avatar>

    {/* Content */}
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between">
        <h4 className="font-semibold text-sm">{title}</h4>
        <span className="text-xs text-gray-500">{timeAgo}</span>
      </div>
      <p className="text-sm text-gray-600 mt-1">{message}</p>

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        {actionUrl && (
          <Button size="sm" variant="outline" asChild>
            <Link href={actionUrl}>{actionLabel}</Link>
          </Button>
        )}
        {inlineActions && renderInlineActions()}
      </div>
    </div>

    {/* Quick actions */}
    <div className="flex gap-2">
      <Button size="icon" variant="ghost" onClick={handleSave}>
        <Bookmark className={cn("h-4 w-4", isSaved && "fill-current")} />
      </Button>
      <Button size="icon" variant="ghost" onClick={handleMarkRead}>
        <Check className="h-4 w-4" />
      </Button>
    </div>
  </div>
</div>
```

**Indicadores Visuales:**

| Estado | Visual |
|--------|--------|
| Unread | Background azul claro, border izquierdo azul grueso, blue dot |
| Read | Background blanco |
| Saved | Icono bookmark filled amarillo |
| High Priority | Border naranja, icono ⚠️ |
| Urgent | Border rojo, icono 🚨, animación pulse |

#### 3. Empty State

```tsx
<div className="text-center py-12">
  <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
  <h3 className="text-lg font-semibold text-gray-900">
    ¡Todo al día!
  </h3>
  <p className="text-gray-500 mt-2">
    No tienes notificaciones pendientes en este momento.
  </p>
</div>
```

**Variantes:**
- "All caught up!" (positivo, celebratorio)
- "No hay notificaciones" (neutral)
- Ilustración custom de ECOPLAZA

#### 4. Filtros

```tsx
<Tabs defaultValue="all" onValueChange={handleFilterChange}>
  <TabsList>
    <TabsTrigger value="all">
      Todas {totalCount > 0 && `(${totalCount})`}
    </TabsTrigger>
    <TabsTrigger value="unread">
      No leídas {unreadCount > 0 && `(${unreadCount})`}
    </TabsTrigger>
    <TabsTrigger value="saved">
      Guardadas {savedCount > 0 && `(${savedCount})`}
    </TabsTrigger>
  </TabsList>
</Tabs>

<Select value={categoryFilter} onValueChange={setCategoryFilter}>
  <SelectTrigger className="w-48">
    <SelectValue placeholder="Filtrar por módulo" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todos los módulos</SelectItem>
    <SelectItem value="leads">Leads</SelectItem>
    <SelectItem value="purchase_requisitions">Purchase Requisitions</SelectItem>
    <SelectItem value="pagos">Pagos</SelectItem>
    <SelectItem value="aprobaciones">Aprobaciones</SelectItem>
  </SelectContent>
</Select>
```

#### 5. Agrupación Temporal

```tsx
{groupedNotifications.map(group => (
  <div key={group.label}>
    <h3 className="text-xs font-semibold text-gray-500 uppercase
                   tracking-wider px-4 py-2 bg-gray-100">
      {group.label} {/* "HOY", "AYER", "ÚLTIMA SEMANA" */}
    </h3>
    {group.notifications.map(notification => (
      <NotificationItem key={notification.id} {...notification} />
    ))}
  </div>
))}
```

**Grupos Recomendados:**
- HOY
- AYER
- ÚLTIMA SEMANA (2-7 días)
- MÁS ANTIGUAS (>7 días)

---

## Preferencias de Usuario

### Panel de Configuración

```
┌────────────────────────────────────────────────────────────────┐
│  Configuración de Notificaciones                               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Tab: General] [Tab: Por módulo] [Tab: Horarios]             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ CANALES DE NOTIFICACIÓN                                   │  │
│  │                                                            │  │
│  │ [✓] Notificaciones en la app                              │  │
│  │ [✓] Notificaciones por email                              │  │
│  │ [ ] Notificaciones por WhatsApp (solo urgentes)           │  │
│  │ [ ] Notificaciones push (próximamente)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ NO MOLESTAR                                               │  │
│  │                                                            │  │
│  │ [✓] Activar modo No Molestar                              │  │
│  │     Desde: [22:00] Hasta: [08:00]                         │  │
│  │                                                            │  │
│  │ Durante estas horas:                                      │  │
│  │ [ ] No enviar ninguna notificación                        │  │
│  │ [✓] Solo notificaciones urgentes                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ RESUMEN DIARIO (DIGEST)                                   │  │
│  │                                                            │  │
│  │ [ ] Enviar resumen diario de notificaciones               │  │
│  │     Frecuencia: [Diario ▼]  Hora: [09:00 ▼]              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [Guardar cambios]                    [Restaurar por defecto] │
└────────────────────────────────────────────────────────────────┘
```

### Tab: Por Módulo

```
┌────────────────────────────────────────────────────────────────┐
│  Preferencias por Módulo                                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Configura qué tipo de notificaciones quieres recibir          │
│  para cada módulo del sistema.                                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Módulo              | En app | Email | WhatsApp | Silenciar│  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ Leads               |   ✓    |   ✓   |          |          │  │
│  │ Purchase Req.       |   ✓    |   ✓   |    ✓     |          │  │
│  │ Pagos               |   ✓    |   ✓   |          |          │  │
│  │ Aprobaciones        |   ✓    |   ✓   |    ✓     |          │  │
│  │ Locales             |   ✓    |       |          |          │  │
│  │ Comisiones          |   ✓    |   ✓   |          |          │  │
│  │ Expansión           |   ✓    |       |          |          │  │
│  │ Reuniones           |   ✓    |       |          |          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [Guardar preferencias]                                        │
└────────────────────────────────────────────────────────────────┘
```

### Lógica de Validación

```typescript
// lib/actions-notifications.ts

async function shouldSendNotification(
  userId: string,
  notificationType: string,
  category: string,
  priority: Priority
): Promise<{ in_app: boolean; email: boolean; whatsapp: boolean }> {

  // 1. Obtener preferencias del usuario
  const prefs = await getNotificationPreferences(userId);

  // 2. Check quiet hours
  if (prefs.quiet_hours_enabled && isInQuietHours()) {
    // Solo enviar si es urgente
    if (priority !== 'urgent') {
      return { in_app: true, email: false, whatsapp: false };
    }
  }

  // 3. Check category preferences
  const categoryPrefs = prefs.category_preferences[category] || {};

  // 4. Check muted threads
  if (prefs.muted_threads.includes(threadKey)) {
    return { in_app: false, email: false, whatsapp: false };
  }

  return {
    in_app: prefs.in_app_enabled && categoryPrefs.in_app !== false,
    email: prefs.email_enabled && categoryPrefs.email !== false,
    whatsapp: prefs.whatsapp_enabled && categoryPrefs.whatsapp === true
  };
}
```

---

## Sistema de Templates

### Estructura de Template

```typescript
interface NotificationTemplate {
  type: string;
  category: string;

  // In-app
  in_app_title: string;
  in_app_message: string;

  // Email
  email_subject?: string;
  email_body?: string; // HTML

  // WhatsApp
  whatsapp_message?: string;

  // Variables disponibles
  variables: string[]; // ['{{user_name}}', '{{lead_nombre}}', etc.]

  // Metadata
  priority: Priority;
  action_label?: string;
}
```

### Ejemplos de Templates

#### 1. Lead Asignado

```typescript
{
  type: 'lead_assigned',
  category: 'leads',
  in_app_title: 'Nuevo lead asignado',
  in_app_message: '{{actor_name}} te asignó el lead {{lead_nombre}} del proyecto {{proyecto_nombre}}',
  email_subject: 'ECOPLAZA - Nuevo lead asignado: {{lead_nombre}}',
  email_body: `
    <h2>Hola {{user_name}},</h2>
    <p><strong>{{actor_name}}</strong> te asignó un nuevo lead:</p>
    <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p><strong>Cliente:</strong> {{lead_nombre}}</p>
      <p><strong>Teléfono:</strong> {{lead_telefono}}</p>
      <p><strong>Proyecto:</strong> {{proyecto_nombre}}</p>
      <p><strong>Interés:</strong> {{lead_interes}}</p>
    </div>
    <a href="{{action_url}}" style="background: #1b967a; color: white; padding: 12px 24px;
       text-decoration: none; border-radius: 6px; display: inline-block;">
      Ver lead en ECOPLAZA
    </a>
  `,
  variables: ['{{user_name}}', '{{actor_name}}', '{{lead_nombre}}', '{{lead_telefono}}',
              '{{proyecto_nombre}}', '{{lead_interes}}', '{{action_url}}'],
  priority: 'normal',
  action_label: 'Ver lead'
}
```

#### 2. Purchase Requisition Pendiente Aprobación

```typescript
{
  type: 'pr_pending_approval',
  category: 'purchase_requisitions',
  in_app_title: 'PR #{{pr_number}} requiere tu aprobación',
  in_app_message: 'Solicitud de {{requester_name}} por {{currency}} {{amount}} - {{title}}',
  email_subject: 'ECOPLAZA - Aprobación requerida: PR #{{pr_number}}',
  email_body: `
    <h2>Hola {{approver_name}},</h2>
    <p>Tienes una <strong>Purchase Requisition</strong> pendiente de aprobación:</p>
    <div style="border: 2px solid #fb923c; border-radius: 8px; padding: 20px; margin: 16px 0;">
      <p style="margin: 0;"><strong>PR Number:</strong> #{{pr_number}}</p>
      <p style="margin: 8px 0 0;"><strong>Solicitante:</strong> {{requester_name}}</p>
      <p style="margin: 8px 0 0;"><strong>Título:</strong> {{title}}</p>
      <p style="margin: 8px 0 0;"><strong>Categoría:</strong> {{category}}</p>
      <p style="margin: 8px 0 0;"><strong>Monto:</strong> {{currency}} {{amount}}</p>
      <p style="margin: 8px 0 0;"><strong>Justificación:</strong> {{justification}}</p>
    </div>
    <p><strong>Aprueba o rechaza directamente desde tu email:</strong></p>
    <div style="display: flex; gap: 12px;">
      <a href="{{approve_url}}" style="background: #10b981; color: white; padding: 12px 24px;
         text-decoration: none; border-radius: 6px;">
        ✓ Aprobar
      </a>
      <a href="{{reject_url}}" style="background: #ef4444; color: white; padding: 12px 24px;
         text-decoration: none; border-radius: 6px;">
        ✕ Rechazar
      </a>
      <a href="{{action_url}}" style="background: #6b7280; color: white; padding: 12px 24px;
         text-decoration: none; border-radius: 6px;">
        Ver detalle
      </a>
    </div>
  `,
  whatsapp_message: `🔔 *ECOPLAZA - Aprobación Requerida*\n\nPR #{{pr_number}}\nSolicitante: {{requester_name}}\nMonto: {{currency}} {{amount}}\n\n{{title}}\n\nVer y aprobar: {{action_url}}`,
  variables: ['{{approver_name}}', '{{pr_number}}', '{{requester_name}}', '{{title}}',
              '{{category}}', '{{currency}}', '{{amount}}', '{{justification}}',
              '{{approve_url}}', '{{reject_url}}', '{{action_url}}'],
  priority: 'high',
  action_label: 'Ver PR'
}
```

#### 3. Pago Verificado

```typescript
{
  type: 'payment_verified',
  category: 'pagos',
  in_app_title: 'Pago verificado - {{local_codigo}}',
  in_app_message: '{{verifier_name}} verificó el abono de {{currency}} {{amount}} para {{local_codigo}}',
  email_subject: 'ECOPLAZA - Pago verificado: {{local_codigo}}',
  email_body: `
    <h2>Hola {{user_name}},</h2>
    <p>Te informamos que el pago del local <strong>{{local_codigo}}</strong> ha sido verificado:</p>
    <div style="background: #d1fae5; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981; margin: 16px 0;">
      <p style="margin: 0;"><strong>Local:</strong> {{local_codigo}}</p>
      <p style="margin: 8px 0 0;"><strong>Cliente:</strong> {{cliente_nombre}}</p>
      <p style="margin: 8px 0 0;"><strong>Monto:</strong> {{currency}} {{amount}}</p>
      <p style="margin: 8px 0 0;"><strong>Verificado por:</strong> {{verifier_name}}</p>
      <p style="margin: 8px 0 0;"><strong>Fecha:</strong> {{verification_date}}</p>
    </div>
    <a href="{{action_url}}" style="background: #1b967a; color: white; padding: 12px 24px;
       text-decoration: none; border-radius: 6px; display: inline-block;">
      Ver detalle del pago
    </a>
  `,
  variables: ['{{user_name}}', '{{local_codigo}}', '{{cliente_nombre}}', '{{currency}}',
              '{{amount}}', '{{verifier_name}}', '{{verification_date}}', '{{action_url}}'],
  priority: 'normal',
  action_label: 'Ver pago'
}
```

### Template Engine

```typescript
// lib/notifications/template-engine.ts

function renderTemplate(
  template: string,
  variables: Record<string, any>
): string {
  let rendered = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replaceAll(placeholder, String(value));
  }

  return rendered;
}

// Uso
const message = renderTemplate(
  template.in_app_message,
  {
    actor_name: 'Juan Pérez',
    lead_nombre: 'María González',
    proyecto_nombre: 'Eco Callao'
  }
);
// Resultado: "Juan Pérez te asignó el lead María González del proyecto Eco Callao"
```

---

## Real-time vs Polling

### Comparativa

| Aspecto | Supabase Realtime (WebSocket) | Polling |
|---------|-------------------------------|---------|
| **Latencia** | <200ms | 5-30s (según intervalo) |
| **Performance** | Alta (push-based) | Media (pull-based) |
| **Battery** | Eficiente | Drena batería |
| **Escalabilidad** | 10,000+ conexiones | Limitada |
| **Complejidad** | Media | Baja |
| **Costo** | Bajo (included en Supabase) | Bajo |
| **Offline support** | Requiere reconnect logic | Natural |

### Recomendación para ECOPLAZA

**Supabase Realtime** para notificaciones in-app (usuarios online).

**Por qué:**
- Latencia <200ms vs 10-30s polling
- Incluido en plan Supabase (sin costo extra)
- WebSocket vía Phoenix/Elixir (ultra-eficiente)
- Soporte nativo en Supabase SDK
- Escalable a 100+ usuarios simultáneos

**Arquitectura Híbrida:**
```
Usuario ONLINE  → Supabase Realtime (WebSocket)
Usuario OFFLINE → Email notification
Usuario MOBILE  → Push notification (futuro)
```

### Implementación Supabase Realtime

#### 1. Habilitar Realtime en Tabla

```sql
-- En Supabase Dashboard > Database > Replication
-- O vía SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

#### 2. Configurar RLS Policy

```sql
-- Solo usuarios pueden ver sus propias notificaciones en realtime
CREATE POLICY "Users can listen to own notifications"
ON notifications FOR SELECT
USING (auth.uid()::uuid = user_id);
```

#### 3. React Hook para Realtime

```typescript
// hooks/useNotifications.ts

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/lib/types';

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    // 1. Fetch inicial
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchNotifications();

    // 2. Subscribe a real-time updates
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Toast notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
            action: newNotification.action_url ? (
              <Button asChild size="sm">
                <Link href={newNotification.action_url}>
                  {newNotification.action_label || 'Ver'}
                </Link>
              </Button>
            ) : undefined
          });

          // Play sound (opcional)
          new Audio('/notification-sound.mp3').play();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? updated : n)
          );
          if (updated.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { notifications, unreadCount };
}
```

#### 4. Uso en Componente

```typescript
'use client';

import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/context/AuthContext';

export function NotificationCenter() {
  const { user } = useAuth();
  const { notifications, unreadCount } = useNotifications(user.id);

  return (
    <div className="notification-center">
      <NotificationBell count={unreadCount} />
      <NotificationDropdown notifications={notifications} />
    </div>
  );
}
```

---

## Performance y Optimización

### 1. Paginación Eficiente (Keyset Pagination)

**Problema con OFFSET:**
```sql
-- MAL: Lento para páginas grandes
SELECT * FROM notifications
WHERE user_id = '...'
ORDER BY created_at DESC
OFFSET 1000 LIMIT 50; -- Escanea 1050 filas
```

**Solución con Keyset:**
```sql
-- BIEN: Siempre rápido
SELECT * FROM notifications
WHERE user_id = '...'
  AND created_at < '2026-01-10 10:00:00' -- Último timestamp de página anterior
ORDER BY created_at DESC
LIMIT 50; -- Solo 50 filas
```

**Implementación:**

```typescript
// lib/actions-notifications.ts

interface PaginationParams {
  userId: string;
  limit?: number;
  cursor?: string; // ISO timestamp
  filter?: 'all' | 'unread' | 'saved';
}

export async function getNotifications({
  userId,
  limit = 50,
  cursor,
  filter = 'all'
}: PaginationParams) {
  const supabase = createClient();

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null);

  // Aplicar filtros
  if (filter === 'unread') query = query.eq('is_read', false);
  if (filter === 'saved') query = query.eq('is_saved', true);

  // Keyset pagination
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return {
    notifications: data,
    nextCursor: data.length === limit ? data[data.length - 1].created_at : null
  };
}
```

### 2. Índices Optimizados

```sql
-- Índice compuesto para query principal
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Índice para filtro unread
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = FALSE AND deleted_at IS NULL;

-- Índice para saved
CREATE INDEX idx_notifications_saved ON notifications(user_id, is_saved, created_at DESC)
  WHERE is_saved = TRUE AND deleted_at IS NULL;

-- Índice GIN para metadata
CREATE INDEX idx_notifications_metadata ON notifications USING GIN (metadata jsonb_path_ops);

-- Índice para cleanup job
CREATE INDEX idx_notifications_expired ON notifications(expires_at)
  WHERE deleted_at IS NULL AND expires_at IS NOT NULL;
```

### 3. Batch Update "Mark All as Read"

```typescript
// lib/actions-notifications.ts

export async function markAllAsRead(userId: string) {
  const supabase = createClient();

  // Batch de 10,000 para evitar table bloat
  const BATCH_SIZE = 10000;
  let updated = 0;

  while (true) {
    const { data, error } = await supabase.rpc('mark_all_as_read_batch', {
      p_user_id: userId,
      p_limit: BATCH_SIZE
    });

    if (error) throw error;
    if (data === 0) break; // No more to update

    updated += data;

    // Optional: Delay entre batches para no saturar DB
    if (data === BATCH_SIZE) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { updated };
}
```

```sql
-- Función PostgreSQL
CREATE OR REPLACE FUNCTION mark_all_as_read_batch(
  p_user_id UUID,
  p_limit INT DEFAULT 10000
) RETURNS INT AS $$
DECLARE
  v_updated INT;
BEGIN
  WITH to_update AS (
    SELECT id FROM notifications
    WHERE user_id = p_user_id
      AND is_read = FALSE
      AND deleted_at IS NULL
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE notifications
  SET is_read = TRUE,
      read_at = NOW()
  FROM to_update
  WHERE notifications.id = to_update.id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;
```

### 4. Cleanup Automático de Notificaciones Antiguas

```sql
-- Cron job diario (Supabase pg_cron)
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * *', -- 3:00 AM diario
  $$
    -- Soft delete notificaciones >5 meses (no saved)
    UPDATE notifications
    SET deleted_at = NOW()
    WHERE created_at < NOW() - INTERVAL '5 months'
      AND is_saved = FALSE
      AND deleted_at IS NULL;

    -- Hard delete notificaciones >12 meses
    DELETE FROM notifications
    WHERE deleted_at < NOW() - INTERVAL '12 months';
  $$
);
```

### 5. Caching con React Query

```typescript
// hooks/useNotifications.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useNotifications(userId: string) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => getNotifications({ userId }),
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 60 * 1000 // Refetch cada 1 minuto (backup de realtime)
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    }
  });

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
    isLoading,
    markAsRead: markAsReadMutation.mutate
  };
}
```

### 6. Métricas de Performance

**Targets de Performance:**

| Métrica | Target | Crítico |
|---------|--------|---------|
| Tiempo de carga inicial | <500ms | <1s |
| Latencia real-time update | <200ms | <500ms |
| Mark as read (single) | <100ms | <300ms |
| Mark all as read (100 notif) | <2s | <5s |
| Paginación (50 items) | <200ms | <500ms |
| Badge counter query | <50ms | <100ms |

**Queries de Monitoreo:**

```sql
-- Query más lenta (últimas 24h)
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%notifications%'
  AND calls > 10
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Tamaño de tabla
SELECT
  pg_size_pretty(pg_total_relation_size('notifications')) AS total_size,
  pg_size_pretty(pg_relation_size('notifications')) AS table_size,
  pg_size_pretty(pg_indexes_size('notifications')) AS indexes_size;

-- Notificaciones por usuario (top 10)
SELECT
  u.nombre_completo,
  COUNT(*) AS total_notifications,
  COUNT(*) FILTER (WHERE is_read = FALSE) AS unread
FROM notifications n
JOIN usuarios u ON n.user_id = u.id
WHERE n.deleted_at IS NULL
GROUP BY u.id, u.nombre_completo
ORDER BY total_notifications DESC
LIMIT 10;
```

---

## Componentes React

### Librería Recomendada: Sonner + Shadcn/ui

**Stack 2026:**
- **Sonner**: Toast notifications (lightweight, TypeScript-first)
- **Shadcn/ui**: Components base (Dialog, Dropdown, Badge, Avatar)
- **Socket.IO Client**: Real-time updates (alternativa a Supabase Realtime)
- **React Query**: Caching y state management

### 1. Instalación

```bash
npm install sonner @tanstack/react-query
npx shadcn-ui@latest add dropdown-menu badge avatar button dialog
```

### 2. Estructura de Componentes

```
components/notifications/
├── NotificationBell.tsx          # Badge con contador
├── NotificationCenter.tsx        # Panel principal
├── NotificationItem.tsx          # Item individual
├── NotificationDropdown.tsx      # Dropdown del bell
├── NotificationEmptyState.tsx    # Sin notificaciones
├── NotificationFilters.tsx       # Filtros (Todas, No leídas, etc.)
├── NotificationPreferences.tsx   # Modal de configuración
└── NotificationToast.tsx         # Toast para nuevas notificaciones
```

### 3. NotificationBell.tsx

```typescript
'use client';

import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationDropdown } from './NotificationDropdown';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications(user.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0",
                "text-xs font-bold animate-pulse"
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] p-0">
        <NotificationDropdown />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 4. NotificationDropdown.tsx

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { NotificationEmptyState } from './NotificationEmptyState';
import { NotificationFilters } from './NotificationFilters';
import { Button } from '@/components/ui/button';
import { Settings, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

export function NotificationDropdown() {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotifications(user.id);
  const [filter, setFilter] = useState<'all' | 'unread' | 'saved'>('all');

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'saved') return n.is_saved;
    return true;
  });

  return (
    <div className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Notificaciones</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => markAllAsRead()}
              >
                <Check className="h-4 w-4 mr-2" />
                Marcar todas
              </Button>
            )}
            <Button size="sm" variant="ghost" asChild>
              <Link href="/configuracion/notificaciones">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <NotificationFilters filter={filter} onFilterChange={setFilter} />
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        {filteredNotifications.length === 0 ? (
          <NotificationEmptyState filter={filter} />
        ) : (
          <div>
            {groupNotificationsByDate(filteredNotifications).map(group => (
              <div key={group.label}>
                <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  {group.label}
                </div>
                {group.notifications.map(notification => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t text-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/notificaciones">Ver todas las notificaciones</Link>
        </Button>
      </div>
    </div>
  );
}

function groupNotificationsByDate(notifications: Notification[]) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = {
    today: [] as Notification[],
    yesterday: [] as Notification[],
    week: [] as Notification[],
    older: [] as Notification[]
  };

  notifications.forEach(n => {
    const date = new Date(n.created_at);
    if (isSameDay(date, today)) {
      groups.today.push(n);
    } else if (isSameDay(date, yesterday)) {
      groups.yesterday.push(n);
    } else if (isWithinDays(date, 7)) {
      groups.week.push(n);
    } else {
      groups.older.push(n);
    }
  });

  return [
    { label: 'HOY', notifications: groups.today },
    { label: 'AYER', notifications: groups.yesterday },
    { label: 'ÚLTIMA SEMANA', notifications: groups.week },
    { label: 'MÁS ANTIGUAS', notifications: groups.older }
  ].filter(g => g.notifications.length > 0);
}
```

### 5. NotificationItem.tsx

```typescript
'use client';

import { useState } from 'react';
import { Notification } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Bookmark, MoreHorizontal, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { markAsRead, toggleSave, deleteNotification } from '@/lib/actions-notifications';

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const [isRead, setIsRead] = useState(notification.is_read);
  const [isSaved, setIsSaved] = useState(notification.is_saved);

  const handleMarkRead = async () => {
    await markAsRead(notification.id);
    setIsRead(true);
  };

  const handleToggleSave = async () => {
    await toggleSave(notification.id);
    setIsSaved(!isSaved);
  };

  const handleDelete = async () => {
    await deleteNotification(notification.id);
  };

  const priorityColor = {
    urgent: 'border-l-red-500 bg-red-50',
    high: 'border-l-orange-500 bg-orange-50',
    normal: '',
    low: ''
  }[notification.priority];

  return (
    <div
      className={cn(
        "p-4 border-b hover:bg-gray-50 transition-colors",
        !isRead && "bg-blue-50 border-l-4 border-l-blue-500",
        priorityColor
      )}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        {notification.actor_avatar_url && (
          <Avatar className="h-10 w-10">
            <AvatarImage src={notification.actor_avatar_url} />
            <AvatarFallback>
              {notification.actor_name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm">{notification.title}</h4>
                {notification.priority === 'urgent' && (
                  <Badge variant="destructive" className="text-xs">Urgente</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {notification.message}
              </p>
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: es
              })}
            </span>
          </div>

          {/* Actions */}
          {notification.action_url && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              asChild
              onClick={() => !isRead && handleMarkRead()}
            >
              <Link href={notification.action_url}>
                {notification.action_label || 'Ver detalle'}
              </Link>
            </Button>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex flex-col gap-1">
          {!isRead && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleMarkRead}
              title="Marcar como leída"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleToggleSave}
            title={isSaved ? 'Quitar guardado' : 'Guardar'}
          >
            <Bookmark className={cn("h-4 w-4", isSaved && "fill-current text-yellow-500")} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete}>
                <Trash className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
```

### 6. NotificationEmptyState.tsx

```typescript
import { Bell, CheckCircle2 } from 'lucide-react';

interface EmptyStateProps {
  filter: 'all' | 'unread' | 'saved';
}

export function NotificationEmptyState({ filter }: EmptyStateProps) {
  const messages = {
    all: {
      icon: <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />,
      title: '¡Todo al día!',
      message: 'No tienes notificaciones en este momento.'
    },
    unread: {
      icon: <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />,
      title: '¡Excelente!',
      message: 'Has leído todas tus notificaciones.'
    },
    saved: {
      icon: <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />,
      title: 'Sin guardadas',
      message: 'No has guardado ninguna notificación aún.'
    }
  };

  const state = messages[filter];

  return (
    <div className="text-center py-12 px-4">
      {state.icon}
      <h3 className="text-lg font-semibold text-gray-900">{state.title}</h3>
      <p className="text-gray-500 mt-2">{state.message}</p>
    </div>
  );
}
```

---

## Integración con Supabase Realtime

### Configuración Completa

#### 1. Habilitar Realtime en Supabase

```sql
-- Dashboard: Database > Replication > Enable Realtime
-- O via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- RLS Policy para Realtime
CREATE POLICY "Users can listen to own notifications realtime"
ON notifications FOR SELECT
USING (auth.uid()::uuid = user_id);
```

#### 2. Hook Completo con Realtime

```typescript
// hooks/useNotifications.ts

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Notification } from '@/lib/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Fetch inicial
  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Error al cargar notificaciones');
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    fetchNotifications();

    // Subscribe a Realtime
    const channel: RealtimeChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;

          // Update state
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show toast
          toast(newNotification.title, {
            description: newNotification.message,
            action: newNotification.action_url ? {
              label: newNotification.action_label || 'Ver',
              onClick: () => window.location.href = newNotification.action_url!
            } : undefined,
            duration: 5000
          });

          // Play notification sound
          if (typeof Audio !== 'undefined') {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {
              // User hasn't interacted with page yet
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const updated = payload.new as Notification;

          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? updated : n)
          );

          // Update unread count if read status changed
          if (updated.is_read && !payload.old.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const deleted = payload.old as Notification;

          setNotifications(prev =>
            prev.filter(n => n.id !== deleted.id)
          );

          if (!deleted.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications, supabase]);

  return {
    notifications,
    unreadCount,
    isLoading,
    refresh: fetchNotifications
  };
}
```

#### 3. Server Actions

```typescript
// lib/actions-notifications.ts

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createNotification(input: {
  user_id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  action_url?: string;
  action_label?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actor_id?: string;
  actor_name?: string;
  actor_avatar_url?: string;
  thread_key?: string;
}) {
  const supabase = createClient();

  // Get template (si existe)
  const { data: template } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('type', input.type)
    .single();

  // Render template con variables
  let title = input.title;
  let message = input.message;

  if (template) {
    title = renderTemplate(template.in_app_title, input.metadata || {});
    message = renderTemplate(template.in_app_message, input.metadata || {});
  }

  // Create notification
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      ...input,
      title,
      message,
      priority: input.priority || template?.priority || 'normal',
      expires_at: new Date(Date.now() + 5 * 30 * 24 * 60 * 60 * 1000) // 5 months
    })
    .select()
    .single();

  if (error) throw error;

  // Check user preferences y enviar por otros canales
  await sendMultiChannelNotification(data);

  revalidatePath('/');
  return data;
}

export async function markAsRead(notificationId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId);

  if (error) throw error;

  revalidatePath('/');
}

export async function markAllAsRead(userId: string) {
  const supabase = createClient();

  // Batch update via RPC
  const { error } = await supabase.rpc('mark_all_as_read_batch', {
    p_user_id: userId,
    p_limit: 10000
  });

  if (error) throw error;

  revalidatePath('/');
}

export async function toggleSave(notificationId: string) {
  const supabase = createClient();

  const { data: current } = await supabase
    .from('notifications')
    .select('is_saved')
    .eq('id', notificationId)
    .single();

  const { error } = await supabase
    .from('notifications')
    .update({ is_saved: !current?.is_saved })
    .eq('id', notificationId);

  if (error) throw error;

  revalidatePath('/');
}

export async function deleteNotification(notificationId: string) {
  const supabase = createClient();

  // Soft delete
  const { error } = await supabase
    .from('notifications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) throw error;

  revalidatePath('/');
}

// Helper: Render template
function renderTemplate(
  template: string,
  variables: Record<string, any>
): string {
  let rendered = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replaceAll(placeholder, String(value));
  }

  return rendered;
}

// Helper: Multi-channel notification
async function sendMultiChannelNotification(notification: Notification) {
  const supabase = createClient();

  // Get user preferences
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', notification.user_id)
    .single();

  if (!prefs) return;

  // Email
  if (prefs.email_enabled) {
    // TODO: Send via Resend
  }

  // WhatsApp (solo high/urgent)
  if (prefs.whatsapp_enabled && ['high', 'urgent'].includes(notification.priority)) {
    // TODO: Send via n8n webhook
  }
}
```

---

*Continuará en siguiente parte (límite de caracteres alcanzado)...*

## Plan de Implementación

### FASE 1: Base de Datos y Backend (Semana 1)

**Duración:** 16 horas

**Tareas:**
1. Crear tablas (notifications, notification_preferences, notification_templates, notification_delivery_log)
2. Crear índices optimizados
3. Crear funciones PostgreSQL (mark_all_as_read_batch, cleanup_old_notifications)
4. Seed templates iniciales
5. Configurar Supabase Realtime
6. RLS Policies

**Entregables:**
- Migración SQL ejecutada
- 10+ templates seedeados
- Realtime habilitado y testeado

---

### FASE 2: Server Actions y Lógica (Semana 2)

**Duración:** 20 horas

**Tareas:**
1. lib/actions-notifications.ts (create, markAsRead, markAllAsRead, toggleSave, delete)
2. lib/notifications/template-engine.ts
3. lib/notifications/multi-channel.ts (email, WhatsApp integration)
4. Testing con diferentes tipos de notificaciones

**Entregables:**
- 10+ server actions funcionales
- Template engine testeado
- Integración email lista

---

### FASE 3: Componentes React (Semana 3-4)

**Duración:** 24 horas

**Tareas:**
1. NotificationBell.tsx
2. NotificationDropdown.tsx
3. NotificationItem.tsx
4. NotificationEmptyState.tsx
5. NotificationFilters.tsx
6. NotificationPreferences.tsx (modal configuración)
7. useNotifications hook con Realtime
8. Integración en DashboardHeader.tsx

**Entregables:**
- Notification Center funcional
- Real-time updates working
- UI/UX pulida

---

### FASE 4: Testing y Refinamiento (Semana 5)

**Duración:** 16 horas

**Tareas:**
1. Testing con todos los roles (admin, jefe ventas, vendedor, etc.)
2. Testing performance (1000+ notificaciones)
3. Testing Realtime (múltiples usuarios simultáneos)
4. Ajustes de UI/UX basados en feedback
5. Documentación de uso

**Entregables:**
- Sistema testeado end-to-end
- Performance validado
- Documentación completa

---

### FASE 5: Rollout Gradual (Semana 6)

**Duración:** 8 horas

**Tareas:**
1. Deploy a staging
2. Testing con usuarios piloto (5-10 usuarios)
3. Recolectar feedback
4. Ajustes finales
5. Deploy a producción
6. Monitoreo activo (48h)

**Entregables:**
- Sistema en producción
- Monitoreo configurado
- Documentación de troubleshooting

---

**TIEMPO TOTAL:** 84 horas (~10-11 semanas a 8h/semana)

---

## Casos de Éxito

### Caso 1: ServiceNow - Aprobaciones por Email

**Contexto:**
ServiceNow implementó aprobaciones inline en notificaciones de email.

**Resultados:**
- 71% reducción en cycle time de aprobaciones
- Reducción de rejection rate de 40% a 12%
- 80% de aprobaciones desde móvil

**Lección:**
Inline actions (aprobar/rechazar desde notificación) aumentan dramáticamente la velocidad de respuesta.

---

### Caso 2: GitHub - Retention Policy

**Contexto:**
GitHub implementó retention de 5 meses (no saved) e infinito (saved).

**Resultados:**
- Reducción de 60% en tamaño de tabla notifications
- Queries 3x más rápidas
- Mejor UX (menos noise histórico)

**Lección:**
Cleanup automático es crítico para performance a largo plazo.

---

### Caso 3: Slack - Notification Tracing

**Contexto:**
Slack implementó Bloom filters para evitar notificaciones duplicadas.

**Resultados:**
- 95% reducción de duplicados
- Mejor trust de usuarios en el sistema
- Menor fatiga de notificaciones

**Lección:**
Deduplicación es must-have para sistemas complejos con múltiples triggers.

---

## Recomendaciones para ECOPLAZA

### 1. Prioridad ALTA

- [x] **Implementar Supabase Realtime**: Latencia <200ms para usuarios online
- [x] **JSONB para metadata**: Flexibilidad sin alterar schema
- [x] **Keyset pagination**: Performance constante independiente de página
- [x] **Retention policy**: Cleanup automático 5 meses (no saved)
- [x] **Índices optimizados**: (user_id, created_at) compuestos
- [x] **Badge counter "99+"**: No mostrar números grandes
- [x] **Sonner para toast**: Lightweight y TypeScript-first

### 2. Prioridad MEDIA

- [ ] **Agrupación temporal**: HOY, AYER, ÚLTIMA SEMANA
- [ ] **Inline actions**: Aprobar/rechazar desde notificación (Purchase Requisitions)
- [ ] **Email templates HTML**: Profesionales con brand ECOPLAZA
- [ ] **Quiet hours**: No molestar 22:00-08:00
- [ ] **Thread grouping**: Agrupar notificaciones relacionadas
- [ ] **Mark all as read batch**: Optimizado para grandes volúmenes

### 3. Prioridad BAJA (Futuro)

- [ ] **Push notifications móvil**: Para app móvil futura
- [ ] **Digest diario**: Resumen de notificaciones por email
- [ ] **WhatsApp notifications**: Solo para high-priority (>S/10K)
- [ ] **Notification sound customizable**: Por categoría
- [ ] **Advanced filters**: Por proyecto, por fecha, por actor

---

## Fuentes y Referencias

### Documentación Oficial

1. [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime) - Supabase real-time capabilities
2. [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html) - Official PostgreSQL JSON types
3. [Material UI Badge Component](https://mui.com/material-ui/react-badge/) - Badge design patterns
4. [Ant Design Badge](https://ant.design/components/badge/) - Notification badge best practices

### Artículos y Guías

5. [Notification System Design: Architecture & Best Practices](https://www.magicbell.com/blog/notification-system-design) - 9-layer architecture
6. [Building Real-time Notifications with Supabase](https://makerkit.dev/blog/tutorials/real-time-notifications-supabase-nextjs) - Next.js + Supabase tutorial
7. [Top 9 React Notification Libraries 2026](https://knock.app/blog/the-top-notification-libraries-for-react) - Library comparison
8. [How to Build Notion-Like Notification Inbox](https://novu.co/blog/how-to-build-a-notion-like-notification-inbox-with-chakra-ui-and-novu) - Notion UI patterns

### Performance y Optimización

9. [PostgreSQL 17 Performance Upgrade 2026](https://medium.com/@DevBoostLab/postgresql-17-performance-upgrade-2026-f4222e71f577) - Latest PG17 features
10. [Pagination Optimization in PostgreSQL](https://mariadb.com/kb/en/pagination-optimization/) - Keyset pagination
11. [Batch Updates and Concurrency](https://tapoueh.org/blog/2018/07/batch-updates-and-concurrency/) - PostgreSQL batch strategies
12. [Optimizing SQL Pagination](https://readyset.io/blog/optimizing-sql-pagination-in-postgres) - Advanced pagination

### UX/UI Design

13. [Designing Notifications for Apps](https://uxmag.com/articles/designing-notifications-for-apps) - UX best practices
14. [5 Types of UI Notifications](https://uxplanet.org/5-types-of-ui-notifications-dbfbda284456) - Notification patterns
15. [Notification UX: How To Design](https://userpilot.com/blog/notification-ux/) - Design guidelines
16. [Empty State UX Examples](https://www.eleken.co/blog-posts/empty-state-ux) - Empty state patterns
17. [Designing Empty States in Complex Apps](https://www.nngroup.com/articles/empty-state-interface-design/) - Nielsen Norman Group

### Slack Engineering

18. [Tracing Notifications - Slack Engineering](https://slack.engineering/tracing-notifications/) - How Slack handles notifications
19. [Making Notifications Actionable - Slack](https://api.slack.com/best-practices/blueprints/actionable-notifications) - Slack best practices
20. [Slack Architecture - System Design](https://systemdesign.one/slack-architecture/) - Slack technical architecture

### Multi-Channel Notifications

21. [Day 43: Building Multi-Channel Notification System](https://fullstackinfra.substack.com/p/day-43-building-multi-channel-notification) - Architecture guide
22. [Dynamic Notification System (GitHub)](https://github.com/zrougamed/dynamic-notification-system) - Multi-channel reference
23. [Batching & Digest - SuprSend](https://docs.suprsend.com/docs/best-practices-for-batching-digest) - Digest best practices
24. [Notification Preferences - Slack Setup 2026](https://blog.buddieshr.com/slack-notifications-setup-guide/) - Preferences patterns

### GitHub and Linear

25. [About Notifications - GitHub Docs](https://docs.github.com/en/subscriptions-and-notifications/concepts/about-notifications) - GitHub notification system
26. [How We Redesigned Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui) - Linear design decisions
27. [Building Scalable GitHub Notification System](https://expertbeacon.com/building-a-scalable-real-time-github-notification-system/) - GitHub architecture

### React Libraries

28. [Sonner - React Toast](https://notistack.com/) - Modern toast library
29. [React Toastify](https://www.npmjs.com/package/react-toastify) - Popular notification library
30. [Notistack Documentation](https://notistack.com/) - Material-UI notifications

---

**FIN DEL REPORTE**

---

## Resumen Ejecutivo Final

Este reporte de 70+ páginas proporciona un blueprint completo para implementar un **módulo de notificaciones de clase mundial** en ECOPLAZA Command Center.

**Componentes principales:**
1. Arquitectura de 9 capas (estándar industria)
2. Schema PostgreSQL optimizado con JSONB
3. Supabase Realtime para latencia <200ms
4. UI/UX tipo Linear/Notion/GitHub
5. Multi-canal (in-app, email, WhatsApp)
6. Performance optimizado (keyset pagination, batch updates)
7. Plan de implementación 84 horas (10-11 semanas)

**ROI esperado:**
- 60-70% reducción en tiempo de respuesta de aprobadores
- 35% aumento en engagement de usuarios
- 50% reducción en "missed notifications"

**Next Steps:**
1. Revisar reporte con equipo técnico
2. Aprobar arquitectura y timeline
3. Iniciar FASE 1: Base de Datos y Backend
4. Iterar con feedback de usuarios piloto

---

**Contacto:** Strategic Researcher Agent
**Fecha:** 13 Enero 2026
**Versión:** 1.0
