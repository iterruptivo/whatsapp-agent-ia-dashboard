# Resumen Ejecutivo: Módulo Purchase Requisitions

**Fecha:** 13 Enero 2026
**Para:** Equipo Técnico ECOPLAZA
**Documento Completo:** `MODULO_ORDENES_SERVICIO_INVESTIGACION_2026.md`

---

## TL;DR - Decisiones Clave

| Aspecto | Recomendación |
|---------|--------------|
| **Nombre del Módulo** | "Purchase Requisitions" (backend) / "Solicitudes de Compra" (UI) |
| **Workflow Type** | Threshold-Based Approval (4 niveles según monto) |
| **Form Design** | Single-page con accordions (no wizard) |
| **Approval UI** | Inbox-style list (no Kanban) |
| **Notificaciones** | Email + In-app (must), WhatsApp (nice-to-have >S/ 10K) |
| **Storage** | Supabase Storage (5 archivos × 10MB) |
| **MVP Timeline** | 2 semanas (formulario + workflow básico + aprobación) |

---

## Estados del Workflow

```
DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED/REJECTED
                                    ↓
                              COMPLETED/CANCELLED
```

**Transiciones Críticas:**
- `REJECTED` puede volver a `SUBMITTED` (editar y reenviar)
- Solo el `current_approver` puede cambiar a `APPROVED/REJECTED`
- `APPROVED` puede convertirse en PO o cancelarse

---

## Approval Rules Recomendadas para ECOPLAZA

| Monto | Aprobador | SLA | Ejemplo |
|-------|-----------|-----|---------|
| < S/ 500 | Auto-aprobado | Inmediato | Útiles oficina |
| S/ 500 - S/ 2,000 | Manager | 24h | Silla ergonómica |
| S/ 2,000 - S/ 10,000 | Manager + Director | 72h | Laptops equipo |
| > S/ 10,000 | Gerente General + CFO | 5 días | Renovación oficina |
| Emergency (cualquier monto) | Gerente General | 4h | Reparación urgente |

---

## Campos del Formulario - Obligatorios

✅ **Básicos:**
- Título (ej: "Laptops para equipo de ventas")
- Categoría (IT, Marketing, Facilities, etc.)
- Prioridad (Low, Medium, High, Urgent)
- Fecha requerida

✅ **Financieros:**
- Descripción del item
- Cantidad
- Precio unitario
- Total (auto-calculado)

✅ **Justificación:**
- Por qué es necesario (textarea)

**Opcionales:** Proveedor sugerido, centro de costo, adjuntos, notas

---

## Flujo de Notificaciones

### 1. PR Enviada → Email a Aprobador
```
Subject: [Acción Requerida] Nueva Solicitud - S/ 17,500

PR-2026-00145: Laptops para Equipo de Ventas
Solicitante: Juan Pérez
Monto: S/ 17,500

[Ver Detalles] [Aprobar] [Rechazar]

⏱ Responder en 48 horas
```

### 2. Sin respuesta +24h → Reminder Email
```
Subject: ⏰ Recordatorio: PR-2026-00145 pendiente

Has recibido esta solicitud hace 24 horas.
⚠️ Será escalada en 24h si no respondes.
```

### 3. Sin respuesta +48h → Escalation
```
Escalar a Director/Gerente
Email + WhatsApp (si >S/ 10K)
```

---

## Schema de Base de Datos (Simplificado)

### Tabla Principal: `purchase_requisitions`

```sql
CREATE TABLE purchase_requisitions (
  id UUID PRIMARY KEY,
  pr_number VARCHAR(20) UNIQUE, -- PR-2026-00001
  proyecto_id UUID,

  -- Requester
  requester_id UUID NOT NULL,
  department VARCHAR(100),

  -- Basics
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',

  -- Financials
  item_description TEXT NOT NULL,
  quantity DECIMAL(10,2),
  unit_price DECIMAL(10,2),
  total_amount DECIMAL(10,2),

  -- Details
  justification TEXT NOT NULL,
  required_by_date DATE NOT NULL,
  preferred_vendor VARCHAR(255),
  attachments JSONB,

  -- Workflow
  status VARCHAR(30) DEFAULT 'draft',
  current_approver_id UUID,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID,
  rejected_at TIMESTAMP,
  rejection_reason TEXT
);
```

### Tabla Secundaria: `pr_approval_history`

```sql
CREATE TABLE pr_approval_history (
  id UUID PRIMARY KEY,
  pr_id UUID,
  approver_id UUID,
  action VARCHAR(20), -- submitted, approved, rejected, escalated
  previous_status VARCHAR(30),
  new_status VARCHAR(30),
  comments TEXT,
  created_at TIMESTAMP
);
```

---

## Componentes UI Recomendados

### 1. Formulario de Creación
**File:** `components/purchase-requisitions/CreatePRForm.tsx`

```
┌──────────────────────────────────────────┐
│  Nueva Solicitud de Compra               │
├──────────────────────────────────────────┤
│  📋 INFORMACIÓN BÁSICA ▼                 │
│     ├─ Título*                           │
│     ├─ Categoría*                        │
│     └─ Fecha Requerida*                  │
│                                          │
│  💰 DETALLES FINANCIEROS ▼               │
│     ├─ Descripción*                      │
│     ├─ Cantidad*  Precio Unit*           │
│     └─ Total: S/ 17,500 (auto)           │
│                                          │
│  📝 JUSTIFICACIÓN ▼                      │
│     └─ Por qué es necesario*             │
│                                          │
│  📎 ADJUNTOS ▶ (colapsado)               │
│  🏢 INFO ADICIONAL ▶ (colapsado)         │
│                                          │
│  [Guardar Borrador]  [Enviar]           │
└──────────────────────────────────────────┘
```

### 2. Bandeja de Aprobación (Inbox)
**File:** `components/purchase-requisitions/PRInboxList.tsx`

```
┌────────────────────────────────────────────┐
│  Solicitudes Pendientes (3)               │
├────────────────────────────────────────────┤
│  🔴 PR-2026-00145                          │
│     Laptops Equipo Ventas | S/ 17,500     │
│     Juan Pérez | Alta | Hace 2h           │
├────────────────────────────────────────────┤
│  🟡 PR-2026-00143                          │
│     Licencias Adobe | S/ 4,200            │
│     María García | Media | Ayer           │
└────────────────────────────────────────────┘
```

### 3. Vista Detalle
**File:** `components/purchase-requisitions/PRDetailView.tsx`

```
┌─────────────────────────────────────────┐
│  ← Volver    PR-2026-00145    [PDF]    │
├─────────────────────────────────────────┤
│  STATUS: 🟡 Pending Approval            │
│                                         │
│  [Información en 2 columnas]            │
│                                         │
│  📋 Timeline de Actividad               │
│  ● 13 Ene 10:30 - Creado                │
│  ● 13 Ene 10:32 - Enviado a aprobación  │
│  ● 13 Ene 12:15 - Visto por aprobador   │
│                                         │
│  💬 Comentarios                          │
│                                         │
│  [❌ Rechazar]    [✅ Aprobar]          │
└─────────────────────────────────────────┘
```

---

## Server Actions Necesarias

**File:** `lib/actions-purchase-requisitions.ts`

```typescript
// Core Actions
export async function createPR(input: CreatePRInput)
export async function submitPR(prId: string)
export async function approvePR(prId: string, userId: string)
export async function rejectPR(prId: string, userId: string, reason: string)
export async function cancelPR(prId: string, userId: string)

// Query Actions
export async function getPRById(prId: string)
export async function getMyPRs(userId: string)
export async function getPendingApprovals(userId: string)
export async function getPRHistory(prId: string)

// Utility
export async function getApplicableApprovalRule(amount: number, category: string)
export async function assignApprover(prId: string)
export async function sendPRNotification(prId: string, type: NotificationType)
```

---

## Métricas a Trackear (KPIs)

Dashboard debe mostrar:

| Métrica | Cálculo | Benchmark |
|---------|---------|-----------|
| **PR Cycle Time** | AVG(approved_at - created_at) | <3 días |
| **Approval Rate** | (Approved / Total) × 100 | >80% |
| **First-Pass Yield** | (Approved sin edits / Total) × 100 | >70% |
| **Escalation Rate** | (Escalated / Total) × 100 | <10% |
| **Avg Response Time** | AVG(action_at - assigned_at) | <24h |

**Queries en:** Sección 9 del documento completo

---

## Roadmap de Implementación

### Fase 1: MVP (2 semanas) ✅ Prioridad Alta
- Formulario de creación
- Submit workflow (Draft → Submitted → Pending)
- Aprobación manual (dropdown de aprobador)
- Inbox para aprobadores
- Email notifications básicas
- Vista detalle con timeline

### Fase 2: Automation (2 semanas)
- Approval rules engine (auto-assign aprobador)
- Threshold-based routing
- Reminders automáticos (24h)
- In-app notifications con badge
- Mejores email templates

### Fase 3: Advanced (2 semanas)
- Delegación de aprobación
- Escalation automática
- Dashboard con métricas
- WhatsApp notifications (>S/ 10K)
- Reportes exportables

---

## Sistemas que Usar como Referencia

Para inspiración UI/UX:

1. **ServiceNow** - Mejor UX empresarial, mobile-first
2. **Jira Service Management** - Timeline de actividad excelente
3. **Monday.com** - Visual, colorido, friendly
4. **SAP Fiori** - Enterprise-grade, pero complejo

**Recomendación:** Combinar simplicidad de Monday.com con robustez de ServiceNow.

---

## Checklist Pre-Desarrollo

Antes de escribir código, definir:

- [ ] **Approval rules de ECOPLAZA:** ¿Qué montos? ¿Qué roles aprueban?
- [ ] **Categorías de compra:** IT, Marketing, Facilities, HR, Sales, Other?
- [ ] **¿Multi-proyecto?** ¿O solo proyecto activo del usuario?
- [ ] **¿Requiere WhatsApp?** ¿Para qué montos/situaciones?
- [ ] **Email provider:** ¿Resend? ¿SendGrid? ¿SMTP actual?
- [ ] **Roles de usuarios:** ¿Todos pueden crear PRs? ¿O solo ciertos roles?

---

## Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Aprobadores no revisan emails | Alto | In-app notifications + reminders |
| Bottleneck en un aprobador | Alto | Delegación + escalation automática |
| Solicitudes mal documentadas | Medio | Validación en formulario + help text |
| Storage lleno (adjuntos) | Bajo | Límite 5 archivos × 10MB = 50MB max |
| PRs duplicadas | Bajo | Validar título/monto similares |

---

## Preguntas Frecuentes (FAQ)

**Q: ¿Por qué "Purchase Requisition" y no "Service Order"?**
A: "Purchase Requisition" es el término estándar en SAP, Oracle, ServiceNow. "Service Order" se usa más en Field Service Management (reparaciones, instalaciones). Para ECOPLAZA, PR es más apropiado.

**Q: ¿Por qué Inbox-style y no Kanban?**
A: Volumen proyectado <50 PRs/mes. Inbox es más eficiente para bajo volumen. Kanban es mejor para >100 items o equipos visuales.

**Q: ¿Necesito implementar multi-nivel approval desde el inicio?**
A: No. MVP puede tener single approver. Fase 2 agrega multi-nivel con approval rules.

**Q: ¿Cómo manejo PRs de diferentes proyectos?**
A: Filtrar por `proyecto_id`. Usuario selecciona proyecto al crear PR (si tiene acceso a múltiples).

**Q: ¿Qué pasa si el aprobador está de vacaciones?**
A: Fase 2: Delegación. Fase 3: Escalation automática después de timeout.

---

## Contacto y Soporte

**Documento Completo:** `docs/research/MODULO_ORDENES_SERVICIO_INVESTIGACION_2026.md` (70+ páginas)

**Contenido del Documento Completo:**
- Análisis detallado de SAP, Oracle, ServiceNow, Jira, Monday.com
- Flujos de workflow con diagramas
- Templates de email profesionales
- Queries SQL para métricas
- Schema completo de base de datos
- Casos de estudio (UNC, ServiceNow, Construcción)
- 24 fuentes con URLs

**Próximos Pasos:**
1. Revisar este resumen con stakeholders
2. Definir approval rules específicas
3. Aprobar mockups de UI
4. Iniciar desarrollo Fase 1

---

**Generado:** 13 Enero 2026
**Versión:** 1.0
**Investigador:** Strategic Researcher - ECOPLAZA
