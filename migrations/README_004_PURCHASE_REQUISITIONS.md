# Migración 004: Módulo Purchase Requisitions

**Fecha:** 13 Enero 2026
**Archivo:** `004_modulo_purchase_requisitions.sql`
**Módulo:** Sistema de Solicitudes de Compra con Workflow de Aprobación

---

## Descripción General

Esta migración crea el schema completo para el módulo de **Purchase Requisitions** (Solicitudes de Compra), un sistema de gestión de solicitudes internas con workflow de aprobación basado en reglas configurables por monto.

### Características Principales

- **Configuración GLOBAL**: Categorías y reglas de aprobación no dependen del proyecto
- **Auto-aprobación Configurable**: Puede activarse/desactivarse según necesidad
- **Proyecto como Referencia**: Campo opcional para contexto, no afecta permisos
- **Acceso Universal**: TODOS los usuarios pueden crear PRs
- **10 Categorías Aprobadas**: IT, MKT, OBRA, SERV, MOB, OPS, RRHH, VENTAS, LOG, GRAL
- **Workflow Completo**: Draft → Submitted → Pending → Approved/Rejected → Completed
- **Integración con Notificaciones**: Templates ya incluidos en `003_modulo_notificaciones.sql`

---

## Tablas Creadas

### 1. `pr_categories` - Catálogo de Categorías
Almacena las 10 categorías de compra aprobadas con sus configuraciones.

**Campos clave:**
- `code`: Código único (IT, MKT, OBRA, etc.)
- `name`: Nombre descriptivo
- `icon`: Emoji o nombre de ícono para UI
- `default_approver_role`: Rol que aprueba por defecto
- `display_order`: Orden de presentación

**Seed data incluido:** 10 categorías pre-cargadas

---

### 2. `pr_approval_rules` - Reglas de Aprobación
Configuración de reglas de aprobación basadas en montos.

**Campos clave:**
- `min_amount`, `max_amount`: Rango de montos aplicables
- `approver_role`: Rol que aprueba (auto, admin, gerencia, superadmin)
- `sla_hours`: SLA en horas (0 para auto, 4 urgente, 24 normal, etc.)
- `priority`: Orden de evaluación (menor = evaluar primero)
- `requires_justification`, `requires_attachments`: Requisitos

**Seed data incluido:** 5 reglas ejemplo

| Regla | Monto | Rol | SLA |
|-------|-------|-----|-----|
| Urgente | Cualquiera | Gerencia | 4h |
| Auto-aprobación | < S/ 500 | Auto | Inmediato |
| Manager | S/ 500 - S/ 2,000 | Admin | 24h |
| Director | S/ 2,000 - S/ 10,000 | Gerencia | 72h |
| Gerente General | > S/ 10,000 | Superadmin | 120h |

---

### 3. `purchase_requisitions` - Tabla Principal
Todas las solicitudes de compra del sistema.

**Campos clave:**
- `pr_number`: Autogenerado (PR-2026-00001)
- `requester_id`: Solicitante (usuario)
- `proyecto_id`: OPCIONAL, solo para contexto
- `category_id`: FK a pr_categories
- `quantity`, `unit_price`, `total_amount`: Financieros
- `status`: Draft, Submitted, Pending, Approved, Rejected, Completed, Cancelled
- `current_approver_id`: Aprobador asignado
- `attachments`: Array JSON de archivos (Supabase Storage)

**Triggers automáticos:**
- Generar `pr_number` automático
- Calcular `total_amount = quantity × unit_price`
- Cachear nombres (requester, proyecto, aprobador)
- Registrar cambios en historial

---

### 4. `pr_approval_history` - Historial de Acciones
Timeline completo de cada PR para auditoría y UI.

**Campos clave:**
- `pr_id`: FK a purchase_requisitions
- `user_id`, `user_name`: Quien hizo la acción
- `action`: created, submitted, assigned, approved, rejected, escalated, cancelled, etc.
- `previous_status`, `new_status`: Transiciones de estado
- `comments`: Comentarios de la acción

**Trigger automático:** Se inserta registro en cada cambio de estado

---

### 5. `pr_comments` - Comentarios
Comunicación entre solicitante y aprobadores.

**Campos clave:**
- `pr_id`: FK a purchase_requisitions
- `user_id`, `user_name`: Autor
- `comment`: Texto del comentario
- `is_internal`: TRUE = solo visible para aprobadores/admins
- `deleted_at`: Soft delete

---

## Funciones Creadas

| Función | Descripción |
|---------|-------------|
| `generate_pr_number()` | Genera PR-YYYY-NNNNN automáticamente |
| `calculate_pr_total()` | Calcula total_amount automáticamente |
| `get_approval_rule_for_amount(amount)` | Devuelve regla aplicable para un monto |
| `get_approver_role_for_pr(pr_id)` | Devuelve rol del aprobador según monto |
| `cache_pr_names()` | Cachea nombres para evitar JOINs |
| `log_pr_status_change()` | Registra cambios en historial |
| `update_pr_comment_timestamp()` | Actualiza updated_at en comentarios |
| `update_pr_category_timestamp()` | Actualiza updated_at en categorías |
| `update_pr_approval_rule_timestamp()` | Actualiza updated_at en reglas |

---

## RLS Policies

### `pr_categories` y `pr_approval_rules`
- **Lectura:** Todos los usuarios autenticados (configuración global)
- **Gestión:** Solo admins/superadmins

### `purchase_requisitions`
- **Ver:** Mis PRs + asignadas a mí + admins/gerencia ven todas
- **Crear:** TODOS los usuarios (decisión de negocio)
- **Actualizar:**
  - Solicitante: solo en estado `draft`
  - Aprobador: puede cambiar estado si está asignado
  - Admins: pueden actualizar cualquiera
- **Eliminar:** Solo admins (preferir soft delete vía `cancelled`)

### `pr_approval_history`
- **Ver:** Involucrados en la PR (solicitante, aprobador, admins)
- **Insertar:** Service role (triggers)

### `pr_comments`
- **Ver:** Según flag `is_internal`
  - Públicos: todos los involucrados
  - Internos: solo aprobadores y admins
- **Crear:** Solo involucrados en la PR
- **Actualizar/Eliminar:** Solo autor o admins

---

## Índices Optimizados

### Performance crítico para queries frecuentes:

```sql
-- Bandeja de aprobación (query MÁS FRECUENTE)
idx_pr_pending_approver ON (current_approver_id, status, created_at DESC)
  WHERE status = 'pending_approval'

-- Mis PRs como solicitante
idx_pr_requester ON (requester_id, created_at DESC)

-- Filtros por estado
idx_pr_status ON (status, created_at DESC)

-- Timeline de PR
idx_pr_history_pr ON (pr_id, created_at DESC)

-- Comentarios de PR
idx_pr_comments_pr ON (pr_id, created_at DESC)
  WHERE deleted_at IS NULL
```

---

## Integración con Notificaciones

El módulo de notificaciones (`003_modulo_notificaciones.sql`) **ya incluye** templates para PRs:

| Tipo | Descripción | Prioridad |
|------|-------------|-----------|
| `pr_created` | PR creada por solicitante | Normal |
| `pr_pending_approval` | PR asignada a aprobador | Alta |
| `pr_approved` | PR aprobada | Alta |
| `pr_rejected` | PR rechazada | Alta |

### Eventos a notificar en server actions:

```typescript
// Al enviar PR (status → pending_approval)
await createNotification({
  user_id: approver_id,
  type: 'pr_pending_approval',
  category: 'purchase_requisitions',
  // ... datos de la PR
});

// Al aprobar
await createNotification({
  user_id: requester_id,
  type: 'pr_approved',
  category: 'purchase_requisitions',
  // ...
});

// Al rechazar
await createNotification({
  user_id: requester_id,
  type: 'pr_rejected',
  category: 'purchase_requisitions',
  // ...
});
```

---

## Cómo Ejecutar la Migración

### Opción 1: Desde Supabase Dashboard

1. Ir a **SQL Editor** en Supabase Dashboard
2. Copiar todo el contenido de `004_modulo_purchase_requisitions.sql`
3. Ejecutar (Run)
4. Verificar que se crearon todas las tablas

### Opción 2: Desde CLI de Supabase

```bash
# Conectar a tu proyecto
supabase link --project-ref TU_PROJECT_REF

# Ejecutar migración
supabase db push --file migrations/004_modulo_purchase_requisitions.sql
```

### Opción 3: Desde psql local

```bash
psql -h DB_HOST -U postgres -d postgres -f migrations/004_modulo_purchase_requisitions.sql
```

---

## Verificación Post-Migración

Ejecutar estos queries para verificar que todo está OK:

```sql
-- Verificar que existen las 5 tablas
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'pr_%' OR tablename = 'purchase_requisitions';

-- Resultado esperado:
-- pr_categories
-- pr_approval_rules
-- purchase_requisitions
-- pr_approval_history
-- pr_comments

-- Verificar seed de categorías (debe devolver 10)
SELECT COUNT(*) FROM pr_categories;

-- Verificar seed de reglas (debe devolver 5)
SELECT COUNT(*) FROM pr_approval_rules;

-- Verificar funciones creadas
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%pr%';

-- Resultado esperado:
-- generate_pr_number
-- calculate_pr_total
-- get_approval_rule_for_amount
-- get_approver_role_for_pr
-- cache_pr_names
-- log_pr_status_change
-- update_pr_comment_timestamp
-- update_pr_category_timestamp
-- update_pr_approval_rule_timestamp

-- Verificar RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND (tablename LIKE 'pr_%' OR tablename = 'purchase_requisitions');

-- Todos deben tener rowsecurity = true
```

---

## Queries de Ejemplo

### Bandeja de aprobación del usuario actual

```sql
SELECT
  pr.id,
  pr.pr_number,
  pr.title,
  pr.requester_name,
  pr.total_amount,
  pr.currency,
  pr.priority,
  pr.created_at,
  pr.required_by_date,
  cat.name as category_name
FROM purchase_requisitions pr
JOIN pr_categories cat ON pr.category_id = cat.id
WHERE pr.current_approver_id = auth.uid()
  AND pr.status = 'pending_approval'
ORDER BY
  CASE pr.priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'normal' THEN 3
    WHEN 'low' THEN 4
  END,
  pr.created_at ASC;
```

### Mis PRs como solicitante

```sql
SELECT
  pr.id,
  pr.pr_number,
  pr.title,
  pr.status,
  pr.total_amount,
  pr.currency,
  pr.current_approver_name,
  pr.created_at,
  cat.name as category_name,
  cat.icon
FROM purchase_requisitions pr
JOIN pr_categories cat ON pr.category_id = cat.id
WHERE pr.requester_id = auth.uid()
ORDER BY pr.created_at DESC;
```

### Timeline de una PR

```sql
SELECT
  h.id,
  h.action,
  h.user_name,
  h.user_role,
  h.previous_status,
  h.new_status,
  h.comments,
  h.created_at
FROM pr_approval_history h
WHERE h.pr_id = 'UUID_DE_LA_PR'
ORDER BY h.created_at DESC;
```

### Determinar regla aplicable para un monto

```sql
-- Para S/ 1,500
SELECT * FROM get_approval_rule_for_amount(1500.00);

-- Debería devolver: "Aprobación Manager" (S/ 500 - S/ 2,000)
```

### Estadísticas de PRs por estado

```sql
SELECT
  status,
  COUNT(*) as total,
  SUM(total_amount) as total_amount,
  AVG(total_amount) as avg_amount
FROM purchase_requisitions
WHERE requester_id = auth.uid()
GROUP BY status
ORDER BY
  CASE status
    WHEN 'pending_approval' THEN 1
    WHEN 'approved' THEN 2
    WHEN 'completed' THEN 3
    WHEN 'rejected' THEN 4
    WHEN 'draft' THEN 5
    WHEN 'cancelled' THEN 6
  END;
```

---

## Próximos Pasos (Desarrollo)

### 1. Backend - Server Actions
Crear `lib/actions-purchase-requisitions.ts`:

```typescript
// Core Actions
- createPR(input: CreatePRInput): Promise<PR>
- submitPR(prId: string): Promise<PR>
- approvePR(prId: string, userId: string, comments?: string): Promise<PR>
- rejectPR(prId: string, userId: string, reason: string): Promise<PR>
- cancelPR(prId: string, userId: string, reason: string): Promise<PR>
- completePR(prId: string, userId: string): Promise<PR>

// Query Actions
- getPRById(prId: string): Promise<PR>
- getMyPRs(userId: string, filters?: Filters): Promise<PR[]>
- getPendingApprovals(userId: string): Promise<PR[]>
- getPRHistory(prId: string): Promise<HistoryEntry[]>
- getPRComments(prId: string): Promise<Comment[]>
- addPRComment(prId: string, userId: string, comment: string, isInternal: boolean): Promise<Comment>

// Config Actions
- getCategories(): Promise<Category[]>
- getApprovalRules(): Promise<Rule[]>
- updateApprovalRules(rules: Rule[]): Promise<void>
```

### 2. Frontend - Tipos TypeScript
Crear `lib/types/purchase-requisitions.ts`:

```typescript
export type PRStatus =
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export type PRPriority = 'urgent' | 'high' | 'normal' | 'low';

export type PRCurrency = 'PEN' | 'USD';

export interface PurchaseRequisition {
  id: string;
  pr_number: string;
  requester_id: string;
  requester_name: string;
  proyecto_id?: string;
  proyecto_nombre?: string;
  title: string;
  category_id: string;
  priority: PRPriority;
  required_by_date: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  currency: PRCurrency;
  total_amount: number;
  justification: string;
  preferred_vendor?: string;
  cost_center?: string;
  notes?: string;
  attachments: Attachment[];
  status: PRStatus;
  current_approver_id?: string;
  current_approver_name?: string;
  approval_rule_id?: string;
  // timestamps...
}

export interface PRCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  default_approver_role: string;
  display_order: number;
  is_active: boolean;
}

export interface PRApprovalRule {
  id: string;
  name: string;
  min_amount: number;
  max_amount?: number;
  approver_role: string;
  sla_hours: number;
  requires_justification: boolean;
  requires_attachments: boolean;
  is_active: boolean;
  priority: number;
}

// ... más tipos
```

### 3. Frontend - Componentes UI
Estructura de componentes:

```
components/purchase-requisitions/
├── CreatePRForm.tsx              # Formulario de creación
├── PRList.tsx                    # Lista mis PRs
├── PRApprovalInbox.tsx           # Bandeja aprobadores
├── PRDetailView.tsx              # Vista detalle + acciones
├── PRStatusBadge.tsx             # Badge de estado
├── PRPriorityBadge.tsx           # Badge de prioridad
├── PRTimeline.tsx                # Timeline de historial
├── PRComments.tsx                # Sección de comentarios
├── PRApprovalActions.tsx         # Botones aprobar/rechazar
├── PRFilters.tsx                 # Filtros de lista
├── PRCategorySelect.tsx          # Selector de categoría
└── config/
    └── PRApprovalRulesConfig.tsx # Configuración de reglas (admin)
```

### 4. Frontend - Páginas
```
app/
├── solicitudes-compra/
│   ├── page.tsx                  # Lista principal
│   ├── nueva/
│   │   └── page.tsx              # Crear nueva PR
│   ├── [id]/
│   │   └── page.tsx              # Detalle de PR
│   └── aprobaciones/
│       └── page.tsx              # Bandeja de aprobación
└── configuracion-pr/
    └── page.tsx                  # Config reglas (admin)
```

### 5. Integración con Notificaciones

En `lib/actions-purchase-requisitions.ts`:

```typescript
import { createNotification } from './actions-notifications';

export async function submitPR(prId: string) {
  // 1. Actualizar estado a 'pending_approval'
  // 2. Determinar aprobador según regla
  // 3. Asignar current_approver_id
  // 4. Crear notificación

  const { data: pr } = await supabase
    .from('purchase_requisitions')
    .update({
      status: 'pending_approval',
      current_approver_id: approverId,
      submitted_at: new Date()
    })
    .eq('id', prId)
    .select()
    .single();

  // Notificar al aprobador
  await createNotification({
    user_id: approverId,
    type: 'pr_pending_approval',
    category: 'purchase_requisitions',
    priority: 'high',
    title: `PR ${pr.pr_number} requiere tu aprobación`,
    message: `${pr.requester_name} solicita ${pr.currency} ${pr.total_amount}`,
    action_url: `/solicitudes-compra/${prId}`,
    action_label: 'Ver PR',
    metadata: {
      pr_id: prId,
      pr_number: pr.pr_number,
      amount: pr.total_amount,
      currency: pr.currency,
      requester_name: pr.requester_name
    }
  });

  return pr;
}
```

---

## Desactivar Auto-aprobación

Si ECOPLAZA decide NO usar auto-aprobación:

```sql
UPDATE pr_approval_rules
SET is_active = FALSE
WHERE approver_role = 'auto';
```

Para reactivarla:

```sql
UPDATE pr_approval_rules
SET is_active = TRUE
WHERE approver_role = 'auto';
```

---

## Ajustar Reglas de Aprobación

Ejemplo: Cambiar límite de auto-aprobación de S/ 500 a S/ 300:

```sql
UPDATE pr_approval_rules
SET max_amount = 300
WHERE name = 'Auto-aprobación (gastos menores)';
```

Ejemplo: Agregar nueva regla para compras de OBRA > S/ 50,000:

```sql
INSERT INTO pr_approval_rules (
  name,
  min_amount,
  max_amount,
  approver_role,
  sla_hours,
  requires_justification,
  requires_attachments,
  priority,
  is_active
) VALUES (
  'Aprobación Directorio (Obra)',
  50000,
  NULL,
  'superadmin',
  240,  -- 10 días
  true,
  true,
  5,  -- Evaluar después de regla 4
  true
);
```

---

## Troubleshooting

### Error: "pr_number already exists"
- **Causa:** Race condition en generación de secuencia
- **Solución:** La función `generate_pr_number()` usa `FOR UPDATE` para evitar esto
- Si persiste, verificar que el trigger está activo

### Error: "No approval rule found for amount"
- **Causa:** No hay regla que cubra el monto
- **Solución:** Verificar que hay una regla con `max_amount = NULL` para cubrir montos altos

### Error: "User cannot approve PR"
- **Causa:** RLS policy bloquea actualización
- **Solución:** Verificar que `current_approver_id = auth.uid()` en la PR

### PRs no aparecen en bandeja de aprobación
- **Causa:** Estado no es 'pending_approval' o current_approver_id incorrecto
- **Solución:** Verificar query y datos de la PR

---

## Métricas y KPIs Recomendados

Para dashboard de métricas:

```sql
-- Cycle Time Promedio (días desde creación hasta aprobación)
SELECT
  AVG(EXTRACT(EPOCH FROM (approved_at - created_at)) / 86400) as avg_days
FROM purchase_requisitions
WHERE status = 'approved'
  AND approved_at IS NOT NULL;

-- Approval Rate (% aprobadas vs total)
SELECT
  COUNT(*) FILTER (WHERE status = 'approved') * 100.0 / COUNT(*) as approval_rate
FROM purchase_requisitions
WHERE status IN ('approved', 'rejected');

-- PRs por categoría (mes actual)
SELECT
  c.name,
  COUNT(*) as total,
  SUM(pr.total_amount) as total_amount
FROM purchase_requisitions pr
JOIN pr_categories c ON pr.category_id = c.id
WHERE EXTRACT(YEAR FROM pr.created_at) = EXTRACT(YEAR FROM NOW())
  AND EXTRACT(MONTH FROM pr.created_at) = EXTRACT(MONTH FROM NOW())
GROUP BY c.name
ORDER BY total_amount DESC;

-- PRs pendientes por aprobador
SELECT
  u.nombre as approver,
  COUNT(*) as pending_count,
  SUM(pr.total_amount) as total_pending_amount
FROM purchase_requisitions pr
JOIN usuarios u ON pr.current_approver_id = u.id
WHERE pr.status = 'pending_approval'
GROUP BY u.nombre
ORDER BY pending_count DESC;
```

---

## Contacto y Soporte

**Documentos de Referencia:**
- `docs/research/MODULO_ORDENES_SERVICIO_RESUMEN_EJECUTIVO.md`
- `docs/research/MODULO_ORDENES_SERVICIO_INVESTIGACION_2026.md`
- `context/PLAN_MODULOS_NOTIFICACIONES_PR.md`

**Migración Relacionada:**
- `003_modulo_notificaciones.sql` (templates de notificaciones)

---

**Última actualización:** 13 Enero 2026
**Versión:** 1.0
**Autor:** DataDev - Database Architect
