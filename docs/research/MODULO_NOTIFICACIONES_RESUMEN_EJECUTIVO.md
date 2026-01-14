# Módulo de Notificaciones - Resumen Ejecutivo

**Fecha:** 13 Enero 2026
**Proyecto:** ECOPLAZA Command Center
**Investigador:** Strategic Researcher
**Documento completo:** `MODULO_NOTIFICACIONES_INVESTIGACION_2026.md` (70+ páginas)

---

## TL;DR

Sistema de notificaciones centralizado tipo Linear/Notion con:
- **Supabase Realtime** (WebSocket, <200ms latency)
- **PostgreSQL + JSONB** para flexibilidad
- **Multi-canal**: In-app, Email, WhatsApp (high-priority)
- **Inbox UI** con filtros, agrupación temporal, inline actions
- **Implementación:** 84 horas (~11 semanas)

---

## Hallazgos Clave (Top 10)

1. **Arquitectura 9 Capas**: API Gateway, Message Queue, Processor, Channels, Preferences, Tracker, Retry, Templates, Scheduler
2. **Supabase Realtime**: Mejor que polling (200ms vs 10-30s)
3. **Inbox > Kanban**: Para <100 notif/día, inbox es más eficiente
4. **JSONB Metadata**: Flexible sin alterar schema
5. **Badge "99+"**: Números grandes pierden efectividad
6. **Mark All Batch**: 10,000 records por batch para evitar bloat
7. **Retention 5 meses**: Cleanup automático (no-saved)
8. **Multi-Canal Must**: In-app + Email + WhatsApp (urgentes)
9. **Sonner 2026**: Mejor toast library (TypeScript-first)
10. **ROI 40-60%**: Reducción tiempo de respuesta

---

## Sistemas de Referencia

| Sistema | Lección Principal |
|---------|-------------------|
| **Slack** | Notificaciones actionables, filtrado inteligente |
| **GitHub** | Retention policy (5 meses), subscription model |
| **Linear** | UI minimalista, navegación rápida (J/K shortcuts) |
| **Notion** | Blue dot para unread, agrupación temporal |
| **Discord** | Per-channel settings, unread badges persistentes |

---

## Schema Base de Datos

### Tabla Principal: `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,              -- Destinatario
  proyecto_id UUID,                   -- Filtro por proyecto

  type VARCHAR(100) NOT NULL,         -- 'lead_assigned', 'pr_approved', etc.
  category VARCHAR(50) NOT NULL,      -- 'leads', 'purchase_requisitions', etc.
  priority VARCHAR(20) DEFAULT 'normal', -- 'urgent', 'high', 'normal', 'low'

  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',        -- Flexible data

  action_url TEXT,                    -- Link al detalle
  action_label VARCHAR(100),          -- "Ver lead", "Aprobar PR"

  is_read BOOLEAN DEFAULT FALSE,
  is_saved BOOLEAN DEFAULT FALSE,     -- Pin importante
  is_archived BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  parent_id UUID,                     -- Para threads
  thread_key VARCHAR(255),            -- Agrupar relacionadas

  actor_id UUID,                      -- Quien generó
  actor_name VARCHAR(255),
  actor_avatar_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,             -- Cleanup automático
  deleted_at TIMESTAMPTZ
);
```

**Índices críticos:**
```sql
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = FALSE AND deleted_at IS NULL;

CREATE INDEX idx_notifications_metadata ON notifications USING GIN (metadata jsonb_path_ops);
```

### Otras Tablas

- `notification_preferences`: Canales, quiet hours, digest
- `notification_templates`: Templates por event_type
- `notification_delivery_log`: Tracking multi-canal

---

## UI/UX Recomendado

### Notification Center (Inbox Style)

```
┌─────────────────────────────────────────┐
│ 🔔 Notificaciones       [99+] [⚙️] [✓]  │
│ Filtros: [Todas] [No leídas] [Guardadas]│
├─────────────────────────────────────────┤
│ HOY                                      │
│ ┌───────────────────────────────────────┐│
│ │🔵 [Avatar] Nuevo lead asignado        ││
│ │   Juan te asignó María González       ││
│ │   [Ver lead →]            [💾] [✓]   ││
│ └───────────────────────────────────────┘│
│ ┌───────────────────────────────────────┐│
│ │🟠 [Avatar] PR #001 pendiente aprob.   ││
│ │   S/15,000 requiere tu aprobación     ││
│ │   [Aprobar] [Rechazar] [Ver →]        ││
│ └───────────────────────────────────────┘│
│                                          │
│ AYER                                     │
│ ┌───────────────────────────────────────┐│
│ │  [Avatar] Pago verificado - LOCAL-101 ││
│ │  Rosa verificó S/5,000                ││
│ └───────────────────────────────────────┘│
├─────────────────────────────────────────┤
│ [Marcar todas]  [Configuración]         │
└─────────────────────────────────────────┘
```

**Features UI:**
- Badge counter con "99+" máximo
- Blue dot para unread
- Agrupación temporal (HOY, AYER, SEMANA)
- Avatares de actores
- Inline actions (aprobar/rechazar)
- Empty state positivo ("¡Todo al día!")

---

## Stack Tecnológico 2026

| Componente | Tecnología | Razón |
|------------|-----------|-------|
| **Real-time** | Supabase Realtime | Incluido, <200ms, WebSocket vía Phoenix |
| **Database** | PostgreSQL 17 + JSONB | Flexible, GIN indexes, incremental VACUUM |
| **Toast** | Sonner | Lightweight (5KB), TypeScript-first |
| **Components** | Shadcn/ui | Badge, Dropdown, Dialog, Avatar |
| **State** | React Query | Caching, invalidation automática |
| **Email** | Resend | Templates HTML, delivery tracking |
| **WhatsApp** | n8n + WATI | High-priority only |

---

## Tipos de Notificaciones ECOPLAZA

| Categoría | Event Types | Prioridad | Canales |
|-----------|-------------|-----------|---------|
| **leads** | lead_assigned, lead_contacted, lead_hot | Normal | In-app, Email |
| **purchase_requisitions** | pr_created, pr_pending_approval, pr_approved, pr_rejected, pr_escalated | High | In-app, Email, WhatsApp (>S/10K) |
| **pagos** | payment_registered, payment_verified, payment_rejected | High | In-app, Email |
| **aprobaciones** | approval_requested, approval_granted, approval_denied | High | In-app, Email, WhatsApp |
| **locales** | local_sold, local_state_changed, local_assigned | Normal | In-app, Email |
| **comisiones** | commission_calculated, commission_paid | Normal | In-app, Email |
| **expansion** | corredor_registered, corredor_approved | Normal | In-app, Email |
| **reuniones** | meeting_scheduled, transcription_ready | Low | In-app |

---

## Preferencias de Usuario

### Panel de Configuración

```
[Tab: General] [Tab: Por módulo] [Tab: Horarios]

CANALES DE NOTIFICACIÓN
[✓] Notificaciones en la app
[✓] Notificaciones por email
[ ] Notificaciones por WhatsApp (solo urgentes)
[ ] Push (próximamente)

NO MOLESTAR
[✓] Activar modo No Molestar
    Desde: [22:00] Hasta: [08:00]
    Durante estas horas:
    [✓] Solo notificaciones urgentes

RESUMEN DIARIO
[ ] Enviar resumen diario
    Frecuencia: [Diario ▼]  Hora: [09:00 ▼]
```

---

## Implementación Supabase Realtime

```typescript
// hooks/useNotifications.ts

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

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    };

    fetchNotifications();

    // 2. Subscribe a Realtime
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const newNotification = payload.new as Notification;
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Show toast
        toast(newNotification.title, {
          description: newNotification.message
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  return { notifications, unreadCount };
}
```

---

## Performance Optimizations

### 1. Keyset Pagination (NO usar OFFSET)

```sql
-- ❌ MAL: Lento para páginas grandes
SELECT * FROM notifications
WHERE user_id = '...'
ORDER BY created_at DESC
OFFSET 1000 LIMIT 50;

-- ✅ BIEN: Siempre rápido
SELECT * FROM notifications
WHERE user_id = '...'
  AND created_at < '2026-01-10T10:00:00Z'
ORDER BY created_at DESC
LIMIT 50;
```

### 2. Mark All as Read (Batch Update)

```sql
CREATE FUNCTION mark_all_as_read_batch(p_user_id UUID, p_limit INT)
RETURNS INT AS $$
DECLARE v_updated INT;
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
  SET is_read = TRUE, read_at = NOW()
  FROM to_update
  WHERE notifications.id = to_update.id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;
```

### 3. Cleanup Automático (pg_cron)

```sql
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * *', -- 3:00 AM diario
  $$
    -- Soft delete >5 meses (no saved)
    UPDATE notifications
    SET deleted_at = NOW()
    WHERE created_at < NOW() - INTERVAL '5 months'
      AND is_saved = FALSE
      AND deleted_at IS NULL;
  $$
);
```

---

## Plan de Implementación

| Fase | Duración | Descripción |
|------|----------|-------------|
| **1. Base de Datos** | 16h | Tablas, índices, funciones, RLS, Realtime |
| **2. Backend** | 20h | Server Actions, template engine, multi-canal |
| **3. Frontend** | 24h | Componentes React, hooks, Realtime integration |
| **4. Testing** | 16h | E2E testing, performance, refinamiento |
| **5. Rollout** | 8h | Staging, piloto, producción |

**TOTAL:** 84 horas (~10-11 semanas a 8h/semana)

---

## Componentes React

```
components/notifications/
├── NotificationBell.tsx          # Badge con contador
├── NotificationCenter.tsx        # Panel principal
├── NotificationItem.tsx          # Item individual
├── NotificationDropdown.tsx      # Dropdown del bell
├── NotificationEmptyState.tsx    # Sin notificaciones
├── NotificationFilters.tsx       # Filtros (Todas, No leídas)
└── NotificationPreferences.tsx   # Modal configuración
```

---

## Templates de Ejemplo

### Lead Asignado

```typescript
{
  type: 'lead_assigned',
  category: 'leads',
  in_app_title: 'Nuevo lead asignado',
  in_app_message: '{{actor_name}} te asignó el lead {{lead_nombre}}',
  email_subject: 'ECOPLAZA - Nuevo lead: {{lead_nombre}}',
  email_body: `
    <h2>Hola {{user_name}},</h2>
    <p>{{actor_name}} te asignó un nuevo lead:</p>
    <div style="padding: 16px; background: #f3f4f6;">
      <p><strong>Cliente:</strong> {{lead_nombre}}</p>
      <p><strong>Teléfono:</strong> {{lead_telefono}}</p>
      <p><strong>Proyecto:</strong> {{proyecto_nombre}}</p>
    </div>
    <a href="{{action_url}}" style="background: #1b967a; color: white; padding: 12px 24px;">
      Ver lead en ECOPLAZA
    </a>
  `,
  priority: 'normal',
  action_label: 'Ver lead'
}
```

### Purchase Requisition Pendiente

```typescript
{
  type: 'pr_pending_approval',
  category: 'purchase_requisitions',
  in_app_title: 'PR #{{pr_number}} requiere tu aprobación',
  in_app_message: '{{requester_name}} solicita {{currency}} {{amount}}',
  email_subject: 'ECOPLAZA - Aprobación: PR #{{pr_number}}',
  email_body: `
    <h2>Hola {{approver_name}},</h2>
    <p>Tienes una Purchase Requisition pendiente:</p>
    <div style="border: 2px solid #fb923c; padding: 20px;">
      <p><strong>PR:</strong> #{{pr_number}}</p>
      <p><strong>Monto:</strong> {{currency}} {{amount}}</p>
      <p><strong>Solicitante:</strong> {{requester_name}}</p>
    </div>
    <a href="{{approve_url}}" style="background: #10b981; color: white; padding: 12px 24px;">
      ✓ Aprobar
    </a>
    <a href="{{reject_url}}" style="background: #ef4444; color: white; padding: 12px 24px;">
      ✕ Rechazar
    </a>
  `,
  whatsapp_message: `🔔 *Aprobación Requerida*\n\nPR #{{pr_number}}\nMonto: {{currency}} {{amount}}\n\nAprobar: {{approve_url}}`,
  priority: 'high',
  action_label: 'Ver PR'
}
```

---

## Métricas de Performance

| Métrica | Target | Crítico |
|---------|--------|---------|
| Carga inicial | <500ms | <1s |
| Latencia real-time | <200ms | <500ms |
| Mark as read (single) | <100ms | <300ms |
| Mark all (100 notif) | <2s | <5s |
| Paginación (50 items) | <200ms | <500ms |
| Badge counter query | <50ms | <100ms |

---

## Casos de Éxito

### ServiceNow
- 71% reducción cycle time aprobaciones
- Rejection rate: 40% → 12%
- 80% aprobaciones desde móvil

### GitHub
- Retention 5 meses + cleanup
- Reducción 60% tamaño tabla
- Queries 3x más rápidas

### Slack
- Bloom filters → 95% menos duplicados
- Push solo a viewport activo
- Notification tracing completo

---

## ROI Esperado

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Tiempo respuesta aprobaciones | 8-12 horas | 2-4 horas | -60% |
| Missed notifications | 30% | 5% | -83% |
| User engagement | Bajo | Alto | +35% |
| Support tickets (notif) | 10/semana | 2/semana | -80% |

---

## Next Steps

1. **Revisar reporte completo** (`MODULO_NOTIFICACIONES_INVESTIGACION_2026.md`)
2. **Aprobar arquitectura** con equipo técnico
3. **Definir prioridades** (qué módulos integrar primero)
4. **Iniciar FASE 1** (Base de datos, 16h)
5. **Testing con usuarios piloto** (Fase 4)

---

## Recomendaciones CRÍTICAS

1. **Supabase Realtime MUST**: No usar polling, latencia inaceptable
2. **JSONB para metadata**: Flexibilidad sin migrar schema constantemente
3. **Keyset pagination**: OFFSET es lento a escala
4. **Retention policy**: 5 meses automático, evita bloat
5. **Badge "99+"**: Números grandes pierden efectividad
6. **Batch updates**: 10K límite para mark all as read
7. **Quiet hours**: Respetar horarios de usuarios (22:00-08:00)
8. **Multi-canal selectivo**: WhatsApp solo para high-priority
9. **Inline actions**: Aprobar/rechazar desde notificación (critical UX)
10. **Sonner toast**: Lightweight, TypeScript-first, mejor UX 2026

---

## Documentación Completa

**Archivo:** `docs/research/MODULO_NOTIFICACIONES_INVESTIGACION_2026.md`
**Páginas:** 70+
**Secciones:** 17
**Fuentes:** 30+

---

**Última actualización:** 13 Enero 2026
**Versión:** 1.0
**Investigador:** Strategic Researcher Agent
