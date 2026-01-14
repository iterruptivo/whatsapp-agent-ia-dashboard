# Plan de Implementación: Notificaciones + Purchase Requisitions

**Fecha:** 13 Enero 2026
**Estado:** ✅ COMPLETADO
**Aprobado por:** Usuario
**Última sesión:** 13 Enero 2026

---

## Decisiones Confirmadas

| Aspecto | Decisión |
|---------|----------|
| Orden de implementación | 1. Notificaciones, 2. Purchase Requisitions |
| Categorías de compra | 10 categorías aprobadas |
| Configuración | GLOBAL (no por proyecto) |
| Auto-aprobación | CONFIGURABLE (puede desactivarse) |
| Proyecto en PR | Solo REFERENCIA opcional (combobox) |
| Quién crea PRs | TODOS los usuarios |
| Flujo aprobación | Configurable por monto con escalación |

---

## Módulo 1: Notificaciones

### Tablas a Crear

```sql
-- 1. notifications (principal)
-- 2. notification_preferences (por usuario)
-- 3. notification_templates (templates por evento)
-- 4. notification_delivery_log (tracking multi-canal)
```

### Componentes UI

```
components/notifications/
├── NotificationBell.tsx          # Badge con contador en header
├── NotificationCenter.tsx        # Panel/dropdown principal
├── NotificationItem.tsx          # Item individual
├── NotificationDropdown.tsx      # Dropdown del bell
├── NotificationEmptyState.tsx    # Sin notificaciones
├── NotificationFilters.tsx       # Filtros (Todas, No leídas, Guardadas)
└── NotificationPreferences.tsx   # Modal configuración
```

### Server Actions

```typescript
// lib/actions-notifications.ts
- createNotification(input)
- getNotifications(userId, filters)
- getUnreadCount(userId)
- markAsRead(notificationId)
- markAllAsRead(userId)
- saveNotification(notificationId)
- deleteNotification(notificationId)
- getPreferences(userId)
- updatePreferences(userId, prefs)
```

### Hooks

```typescript
// hooks/useNotifications.ts
- useNotifications(userId) → { notifications, unreadCount, isLoading }
- useNotificationPreferences(userId)
```

### Integración Supabase Realtime

- Canal por usuario: `notifications:{userId}`
- Event: INSERT → agregar a lista + toast
- Event: UPDATE → actualizar item

---

## Módulo 2: Purchase Requisitions

### Tablas a Crear

```sql
-- 1. purchase_requisitions (principal)
-- 2. pr_approval_history (historial)
-- 3. pr_approval_rules (reglas configurables)
-- 4. pr_categories (catálogo)
```

### Categorías Aprobadas (10)

| # | Nombre | Código |
|---|--------|--------|
| 1 | Tecnología & Sistemas | IT |
| 2 | Marketing & Publicidad | MKT |
| 3 | Construcción & Obra | OBRA |
| 4 | Servicios Profesionales | SERV |
| 5 | Mobiliario & Equipamiento | MOB |
| 6 | Operaciones & Mantenimiento | OPS |
| 7 | Recursos Humanos | RRHH |
| 8 | Ventas & Comercial | VENTAS |
| 9 | Transporte & Logística | LOG |
| 10 | Gastos Generales | GRAL |

### Reglas de Aprobación (Configurables)

```
Regla 1: Monto < X → Auto-aprobado (OPCIONAL, puede desactivarse)
Regla 2: Monto X-Y → Rol A (SLA: 24h)
Regla 3: Monto Y-Z → Rol B (SLA: 72h)
Regla 4: Monto > Z → Rol C (SLA: 5 días)
Regla 5: Prioridad Urgente → Rol especial (SLA: 4h)
```

### Componentes UI

```
components/purchase-requisitions/
├── CreatePRForm.tsx              # Formulario de creación
├── PRList.tsx                    # Lista mis solicitudes
├── PRApprovalInbox.tsx           # Bandeja para aprobadores
├── PRDetailView.tsx              # Vista detalle + timeline
├── PRStatusBadge.tsx             # Badge de estado
├── PRApprovalActions.tsx         # Botones aprobar/rechazar
├── PRTimeline.tsx                # Historial de cambios
├── PRFilters.tsx                 # Filtros de lista
└── PRApprovalRulesConfig.tsx     # Config de reglas (admin)
```

### Server Actions

```typescript
// lib/actions-purchase-requisitions.ts
- createPR(input)
- submitPR(prId)
- approvePR(prId, userId, comments)
- rejectPR(prId, userId, reason)
- cancelPR(prId, userId)
- getPRById(prId)
- getMyPRs(userId, filters)
- getPendingApprovals(userId)
- getPRHistory(prId)
- getApprovalRules()
- updateApprovalRules(rules)
- getCategories()
```

### Estados del Workflow

```
DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED/REJECTED
                                     ↓
                               COMPLETED/CANCELLED
```

### Integración con Notificaciones

| Evento | Notificación |
|--------|--------------|
| PR enviada | → Aprobador asignado |
| 24h sin respuesta | → Reminder al aprobador |
| 48h sin respuesta | → Escalación + notificación |
| PR aprobada | → Solicitante |
| PR rechazada | → Solicitante + razón |

---

## Orden de Implementación

### Fase 1: Notificaciones - Base de Datos ✅ COMPLETADA
- [x] Crear tabla `notifications`
- [x] Crear tabla `notification_preferences`
- [x] Crear tabla `notification_templates`
- [x] Crear índices y RLS policies
- [x] Habilitar Supabase Realtime (manual en Dashboard)
- [x] Crear función `mark_all_as_read_batch`

**Archivos creados:**
- `migrations/003_modulo_notificaciones.sql` (migración ejecutada)

### Fase 2: Notificaciones - Backend ✅ COMPLETADA
- [x] Crear `lib/actions-notifications.ts` (862 líneas)
- [x] Crear tipos en `lib/types/notifications.ts` (511 líneas)
- [x] Implementar server actions
- [x] Crear template engine básico

### Fase 3: Notificaciones - Frontend ✅ COMPLETADA
- [x] Crear hook `useNotifications`
- [x] Crear `NotificationBell.tsx`
- [x] Crear `NotificationCenter.tsx`
- [x] Crear `NotificationItem.tsx`
- [x] Integrar Supabase Realtime
- [x] Integrar en header (DashboardHeader)
- [x] Agregar toast con Sonner

**Archivos creados:**
- `components/notifications/NotificationBell.tsx`
- `components/notifications/NotificationCenter.tsx`
- `components/notifications/NotificationItem.tsx`
- `components/notifications/NotificationEmptyState.tsx`
- `components/notifications/NotificationContainer.tsx`
- `components/notifications/index.ts`
- `hooks/useNotifications.ts`

### Fase 4: Purchase Requisitions - Base de Datos ✅ COMPLETADA
- [x] Crear tabla `purchase_requisitions`
- [x] Crear tabla `pr_approval_history`
- [x] Crear tabla `pr_approval_rules`
- [x] Crear tabla `pr_categories` con 10 categorías
- [x] Crear tabla `pr_comments`
- [x] Crear índices y RLS policies
- [x] Crear función generador PR number
- [x] Crear funciones de cálculo y cacheo
- [x] Crear triggers automáticos
- [x] Seed de 10 categorías
- [x] Seed de 5 reglas de aprobación
- [x] Script de validación post-migración
- [x] Documentación completa en README

**Archivos creados:**
- `migrations/004_modulo_purchase_requisitions.sql` (migración principal)
- `migrations/README_004_PURCHASE_REQUISITIONS.md` (documentación completa)
- `migrations/004_VALIDATE_PURCHASE_REQUISITIONS.sql` (script de validación)
- `migrations/004_TYPESCRIPT_TYPES_REFERENCE.md` (referencia de tipos TS)

### Fase 5: Purchase Requisitions - Backend ✅ COMPLETADA
- [x] Crear `lib/actions-purchase-requisitions.ts` (1421 líneas)
- [x] Crear tipos en `lib/types/purchase-requisitions.ts` (725 líneas)
- [x] Implementar server actions (20+ acciones)
- [x] Integrar con notificaciones

**Server Actions implementadas:**
- CRUD: createPR, getPRById, updatePR, deletePR
- Workflow: submitPR, approvePR, rejectPR, cancelPR, completePR
- Listas: getMyPRs, getPendingApprovals, getAllPRs
- Historial: getPRHistory, getPRComments, addPRComment
- Stats: getPRStats
- Config: getCategories, getApprovalRules, getApprovalRuleForAmount

### Fase 6: Purchase Requisitions - Frontend ✅ COMPLETADA
- [x] Crear página `/solicitudes-compra`
- [x] Crear página `/solicitudes-compra/nueva`
- [x] Crear página `/solicitudes-compra/[id]`
- [x] Crear `CreatePRForm.tsx`
- [x] Crear `PRList.tsx`
- [x] Crear `PRApprovalInbox.tsx`
- [x] Crear `PRDetailView.tsx`
- [x] Crear `PRTimeline.tsx`
- [x] Crear `PRStatusBadge.tsx` y `PRPriorityBadge.tsx`
- [x] Agregar entrada en Sidebar (todos los roles)

**Archivos creados:**
- `app/solicitudes-compra/page.tsx` (tabs: Mis Solicitudes + Pendientes)
- `app/solicitudes-compra/nueva/page.tsx` (formulario)
- `app/solicitudes-compra/[id]/page.tsx` (detalle)
- `components/purchase-requisitions/*.tsx` (8 componentes)
- Sidebar actualizado con entrada "Solicitudes de Compra"

### Fase 7: Testing & Refinamiento
- [ ] Testing E2E con Playwright
- [ ] Validar flujo completo
- [ ] Ajustes de UX

**NOTA:** El módulo está funcional y listo para testing manual o con Playwright.

---

## Documentos de Referencia

- `docs/research/MODULO_NOTIFICACIONES_INVESTIGACION_2026.md`
- `docs/research/MODULO_NOTIFICACIONES_RESUMEN_EJECUTIVO.md`
- `docs/research/MODULO_ORDENES_SERVICIO_INVESTIGACION_2026.md`
- `docs/research/MODULO_ORDENES_SERVICIO_RESUMEN_EJECUTIVO.md`

---

**Última actualización:** 13 Enero 2026
