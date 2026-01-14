# TypeScript Types Reference - Purchase Requisitions

**Para usar en:** `lib/types/purchase-requisitions.ts`

Este documento contiene todos los tipos TypeScript necesarios para el módulo de Purchase Requisitions, basados en el schema de la base de datos.

---

## Enums y Tipos Literales

```typescript
// Estados del workflow
export type PRStatus =
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

// Prioridades
export type PRPriority = 'urgent' | 'high' | 'normal' | 'low';

// Monedas soportadas
export type PRCurrency = 'PEN' | 'USD';

// Acciones en el historial
export type PRAction =
  | 'created'
  | 'submitted'
  | 'assigned'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'cancelled'
  | 'completed'
  | 'commented'
  | 'edited';

// Códigos de categorías
export type PRCategoryCode =
  | 'IT'
  | 'MKT'
  | 'OBRA'
  | 'SERV'
  | 'MOB'
  | 'OPS'
  | 'RRHH'
  | 'VENTAS'
  | 'LOG'
  | 'GRAL';

// Roles de aprobadores
export type ApproverRole =
  | 'auto'
  | 'admin'
  | 'gerencia'
  | 'superadmin'
  | 'jefe_ventas';
```

---

## Interfaces Principales

### Purchase Requisition (Principal)

```typescript
export interface PurchaseRequisition {
  // Identificación
  id: string;
  pr_number: string;              // 'PR-2026-00001'
  sequence_number: number;

  // Solicitante
  requester_id: string;
  requester_name: string;
  requester_department?: string;

  // Referencia a proyecto (OPCIONAL)
  proyecto_id?: string;
  proyecto_nombre?: string;

  // Información básica
  title: string;
  category_id: string;
  priority: PRPriority;
  required_by_date: string;       // ISO date string

  // Detalles financieros
  item_description: string;
  quantity: number;
  unit_price: number;
  currency: PRCurrency;
  total_amount: number;           // Auto-calculado

  // Justificación y detalles
  justification: string;
  preferred_vendor?: string;
  cost_center?: string;
  notes?: string;

  // Archivos adjuntos
  attachments: PRAttachment[];

  // Workflow
  status: PRStatus;
  current_approver_id?: string;
  current_approver_name?: string;
  approval_rule_id?: string;

  // Timestamps de workflow
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  approval_comments?: string;

  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;

  completed_at?: string;
  completed_by?: string;

  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;

  // Auditoría
  created_at: string;
  updated_at: string;
}
```

### PR Category

```typescript
export interface PRCategory {
  id: string;
  code: PRCategoryCode;
  name: string;
  description?: string;
  icon?: string;                  // Emoji o nombre de ícono
  default_approver_role: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### PR Approval Rule

```typescript
export interface PRApprovalRule {
  id: string;
  name: string;
  min_amount: number;
  max_amount?: number;            // NULL = sin límite
  approver_role: ApproverRole;
  sla_hours: number;
  requires_justification: boolean;
  requires_attachments: boolean;
  is_active: boolean;
  priority: number;               // Menor = evaluar primero
  created_at: string;
  updated_at: string;
}
```

### PR Approval History

```typescript
export interface PRApprovalHistory {
  id: string;
  pr_id: string;
  user_id: string;
  user_name: string;
  user_role?: string;
  action: PRAction;
  previous_status?: PRStatus;
  new_status?: PRStatus;
  comments?: string;
  metadata: Record<string, any>;
  created_at: string;
}
```

### PR Comment

```typescript
export interface PRComment {
  id: string;
  pr_id: string;
  user_id: string;
  user_name: string;
  user_role?: string;
  comment: string;
  is_internal: boolean;           // Solo visible para aprobadores
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
```

### PR Attachment

```typescript
export interface PRAttachment {
  name: string;                   // Nombre del archivo
  url: string;                    // URL de Supabase Storage
  size: number;                   // Tamaño en bytes
  type: string;                   // MIME type
  uploaded_at: string;
}
```

---

## Types para Formularios y Inputs

### Create PR Input

```typescript
export interface CreatePRInput {
  // Básicos
  title: string;
  category_id: string;
  priority: PRPriority;
  required_by_date: string;       // ISO date string

  // Financieros
  item_description: string;
  quantity: number;
  unit_price: number;
  currency: PRCurrency;

  // Justificación
  justification: string;

  // Opcionales
  proyecto_id?: string;
  preferred_vendor?: string;
  cost_center?: string;
  notes?: string;
  requester_department?: string;

  // Archivos (se agregan después de crear)
  attachments?: PRAttachment[];
}
```

### Update PR Input

```typescript
export interface UpdatePRInput {
  // Solo campos editables en draft
  title?: string;
  category_id?: string;
  priority?: PRPriority;
  required_by_date?: string;
  item_description?: string;
  quantity?: number;
  unit_price?: number;
  currency?: PRCurrency;
  justification?: string;
  preferred_vendor?: string;
  cost_center?: string;
  notes?: string;
  attachments?: PRAttachment[];
}
```

### Approve PR Input

```typescript
export interface ApprovePRInput {
  pr_id: string;
  user_id: string;
  comments?: string;              // Comentarios opcionales del aprobador
}
```

### Reject PR Input

```typescript
export interface RejectPRInput {
  pr_id: string;
  user_id: string;
  reason: string;                 // Motivo obligatorio
}
```

### Cancel PR Input

```typescript
export interface CancelPRInput {
  pr_id: string;
  user_id: string;
  reason: string;
}
```

### Add Comment Input

```typescript
export interface AddPRCommentInput {
  pr_id: string;
  user_id: string;
  comment: string;
  is_internal: boolean;
}
```

---

## Types para Filtros y Queries

### PR List Filters

```typescript
export interface PRListFilters {
  status?: PRStatus | PRStatus[];
  priority?: PRPriority | PRPriority[];
  category_id?: string | string[];
  proyecto_id?: string;
  requester_id?: string;
  current_approver_id?: string;
  date_from?: string;             // ISO date string
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;                // Búsqueda en título, description, pr_number
}
```

### PR Sort Options

```typescript
export type PRSortField =
  | 'created_at'
  | 'updated_at'
  | 'required_by_date'
  | 'total_amount'
  | 'priority'
  | 'status';

export type PRSortOrder = 'asc' | 'desc';

export interface PRSortOptions {
  field: PRSortField;
  order: PRSortOrder;
}
```

### PR Pagination

```typescript
export interface PRPaginationOptions {
  page: number;
  page_size: number;
}

export interface PRPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
```

---

## Types para Estadísticas y Reportes

### PR Stats

```typescript
export interface PRStats {
  total: number;
  by_status: Record<PRStatus, number>;
  by_priority: Record<PRPriority, number>;
  by_category: Record<string, number>;
  total_amount: number;
  avg_amount: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  approval_rate: number;          // Porcentaje
  avg_cycle_time_days: number;    // Promedio de días desde creación a aprobación
}
```

### PR Category Stats

```typescript
export interface PRCategoryStats {
  category_id: string;
  category_name: string;
  category_code: PRCategoryCode;
  total_prs: number;
  total_amount: number;
  avg_amount: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
}
```

### PR Approver Stats

```typescript
export interface PRApproverStats {
  approver_id: string;
  approver_name: string;
  pending_count: number;
  total_pending_amount: number;
  approved_count: number;
  rejected_count: number;
  avg_response_time_hours: number;
}
```

---

## Types para UI Components

### PR Detail View Data

```typescript
export interface PRDetailViewData {
  pr: PurchaseRequisition;
  category: PRCategory;
  history: PRApprovalHistory[];
  comments: PRComment[];
  approval_rule?: PRApprovalRule;
  can_edit: boolean;
  can_approve: boolean;
  can_cancel: boolean;
}
```

### PR Status Badge Props

```typescript
export interface PRStatusBadgeProps {
  status: PRStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Configuración de colores por estado
export const PR_STATUS_COLORS: Record<PRStatus, {
  bg: string;
  text: string;
  icon: string;
}> = {
  draft: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    icon: '📝'
  },
  submitted: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: '📤'
  },
  pending_approval: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: '⏳'
  },
  approved: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: '✅'
  },
  rejected: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: '❌'
  },
  completed: {
    bg: 'bg-teal-100',
    text: 'text-teal-800',
    icon: '🎉'
  },
  cancelled: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    icon: '🚫'
  }
};
```

### PR Priority Badge Props

```typescript
export interface PRPriorityBadgeProps {
  priority: PRPriority;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Configuración de colores por prioridad
export const PR_PRIORITY_COLORS: Record<PRPriority, {
  bg: string;
  text: string;
  icon: string;
}> = {
  urgent: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: '🔴'
  },
  high: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    icon: '🟠'
  },
  normal: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: '🔵'
  },
  low: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    icon: '⚪'
  }
};
```

---

## Types para Server Actions

### Server Action Response

```typescript
export interface PRActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

### Bulk Actions

```typescript
export interface BulkApprovePRsInput {
  pr_ids: string[];
  user_id: string;
  comments?: string;
}

export interface BulkRejectPRsInput {
  pr_ids: string[];
  user_id: string;
  reason: string;
}
```

---

## Utility Types

### PR Timeline Item (para UI de timeline)

```typescript
export interface PRTimelineItem {
  id: string;
  type: 'history' | 'comment';
  timestamp: string;
  user_name: string;
  user_role?: string;
  action?: PRAction;
  status_change?: {
    from: PRStatus;
    to: PRStatus;
  };
  comment?: string;
  is_internal?: boolean;
  icon: string;
  color: string;
}
```

### PR Form Validation Errors

```typescript
export interface PRFormErrors {
  title?: string;
  category_id?: string;
  required_by_date?: string;
  item_description?: string;
  quantity?: string;
  unit_price?: string;
  justification?: string;
  general?: string;
}
```

### PR Amount Range (para UI de reglas)

```typescript
export interface PRAmountRange {
  min: number;
  max?: number;
  label: string;
  approver_role: ApproverRole;
  sla_hours: number;
}
```

---

## Constants y Helpers

### PR Status Labels (español)

```typescript
export const PR_STATUS_LABELS: Record<PRStatus, string> = {
  draft: 'Borrador',
  submitted: 'Enviada',
  pending_approval: 'Pendiente de Aprobación',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  completed: 'Completada',
  cancelled: 'Cancelada'
};
```

### PR Priority Labels (español)

```typescript
export const PR_PRIORITY_LABELS: Record<PRPriority, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baja'
};
```

### PR Action Labels (español)

```typescript
export const PR_ACTION_LABELS: Record<PRAction, string> = {
  created: 'Creó la PR',
  submitted: 'Envió a aprobación',
  assigned: 'Asignó aprobador',
  approved: 'Aprobó',
  rejected: 'Rechazó',
  escalated: 'Escaló',
  cancelled: 'Canceló',
  completed: 'Marcó como completada',
  commented: 'Comentó',
  edited: 'Editó'
};
```

### PR Category Labels (español - con íconos)

```typescript
export const PR_CATEGORY_INFO: Record<PRCategoryCode, {
  name: string;
  icon: string;
  description: string;
}> = {
  IT: {
    name: 'Tecnología & Sistemas',
    icon: '💻',
    description: 'Laptops, software, servidores'
  },
  MKT: {
    name: 'Marketing & Publicidad',
    icon: '📢',
    description: 'Publicidad, eventos, merchandising'
  },
  OBRA: {
    name: 'Construcción & Obra',
    icon: '🏗️',
    description: 'Materiales, maquinaria, herramientas'
  },
  SERV: {
    name: 'Servicios Profesionales',
    icon: '👔',
    description: 'Consultorías, legal, contabilidad'
  },
  MOB: {
    name: 'Mobiliario & Equipamiento',
    icon: '🪑',
    description: 'Muebles, equipos, decoración'
  },
  OPS: {
    name: 'Operaciones & Mantenimiento',
    icon: '🔧',
    description: 'Limpieza, seguridad, mantenimiento'
  },
  RRHH: {
    name: 'Recursos Humanos',
    icon: '👥',
    description: 'Capacitaciones, uniformes, beneficios'
  },
  VENTAS: {
    name: 'Ventas & Comercial',
    icon: '🏪',
    description: 'Casetas, material POP, tablets'
  },
  LOG: {
    name: 'Transporte & Logística',
    icon: '🚚',
    description: 'Combustible, mantenimiento, fletes'
  },
  GRAL: {
    name: 'Gastos Generales',
    icon: '📦',
    description: 'Útiles, suministros, snacks'
  }
};
```

---

## Validación (Zod Schema Reference)

Si usas Zod para validación:

```typescript
import { z } from 'zod';

export const CreatePRSchema = z.object({
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres').max(255),
  category_id: z.string().uuid('Categoría inválida'),
  priority: z.enum(['urgent', 'high', 'normal', 'low']),
  required_by_date: z.string().refine(
    (date) => new Date(date) > new Date(),
    'La fecha debe ser futura'
  ),
  item_description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  unit_price: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  currency: z.enum(['PEN', 'USD']),
  justification: z.string().min(20, 'La justificación debe tener al menos 20 caracteres'),
  proyecto_id: z.string().uuid().optional(),
  preferred_vendor: z.string().max(255).optional(),
  cost_center: z.string().max(100).optional(),
  notes: z.string().optional(),
  requester_department: z.string().max(100).optional()
});

export const ApprovePRSchema = z.object({
  pr_id: z.string().uuid(),
  user_id: z.string().uuid(),
  comments: z.string().max(500).optional()
});

export const RejectPRSchema = z.object({
  pr_id: z.string().uuid(),
  user_id: z.string().uuid(),
  reason: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(500)
});
```

---

## Ejemplo de Uso Completo

```typescript
// En un server action
import { PurchaseRequisition, CreatePRInput, PRActionResponse } from '@/lib/types/purchase-requisitions';

export async function createPR(input: CreatePRInput): Promise<PRActionResponse<PurchaseRequisition>> {
  try {
    const { data, error } = await supabase
      .from('purchase_requisitions')
      .insert({
        ...input,
        requester_id: (await getUser()).id,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data,
      message: 'PR creada exitosamente'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

**Última actualización:** 13 Enero 2026
**Versión:** 1.0
**Para usar con migración:** `004_modulo_purchase_requisitions.sql`
