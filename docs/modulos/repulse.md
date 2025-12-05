# 🔄 MÓDULO DE REPULSE

## 📋 Índice
- [Estado Actual](#-estado-actual)
- [Concepto](#-concepto)
- [Arquitectura de Base de Datos](#-arquitectura-de-base-de-datos)
- [Server Actions](#-server-actions)
- [Componentes UI](#-componentes-ui)
- [Integración con /operativo](#-integración-con-operativo)
- [Flujo de Trabajo](#-flujo-de-trabajo)
- [Pendientes](#-pendientes)
- [Referencias](#-referencias)

---

## 🔄 Estado Actual

**EN DESARROLLO** - Branch: `feature/repulse`
**Última actualización:** Sesión 65 (5 Dic 2025)

### Funcionalidades Implementadas:
- ✅ Tablas de base de datos (repulse_leads, repulse_templates, repulse_historial)
- ✅ Stored Procedure `detectar_leads_repulse()` para detección automática
- ✅ Server Actions completas en `lib/actions-repulse.ts`
- ✅ Página `/repulse` con lista de leads y gestión de templates
- ✅ Modal de envío de repulse (`RepulseEnvioModal`)
- ✅ Integración en `/operativo` (selección múltiple + botón individual)
- ✅ Sistema de exclusión de leads (`excluido_repulse`)
- ✅ Campo `excluido_repulse` en interface Lead

### Pendientes:
- ⏳ Integración con n8n (webhook para envío de mensajes)
- ⏳ Cron job cada 10 días para ejecutar `detectar_leads_repulse()`
- ⏳ Notificaciones de respuesta

---

## 💡 Concepto

**Repulse** es un sistema de re-engagement para leads que:
1. No han realizado una compra
2. Tienen más de 30 días en el sistema
3. No están excluidos manualmente

### Criterios de detección automática:
- Lead sin registro en `locales_leads` (sin compra)
- Lead con `created_at` > 30 días
- Lead con `excluido_repulse = false`
- Lead no ya presente en `repulse_leads`

### Estados de un lead en repulse:
| Estado | Descripción |
|--------|-------------|
| `pendiente` | Agregado, esperando envío |
| `enviado` | Mensaje enviado vía n8n |
| `respondio` | El lead contestó el mensaje |
| `sin_respuesta` | No respondió después de X tiempo |
| `excluido` | Excluido manualmente del sistema |

---

## 🗄️ Arquitectura de Base de Datos

### Tabla: `repulse_leads`
Leads marcados para recibir mensajes de repulse.

```sql
CREATE TABLE repulse_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id),
  origen VARCHAR(20) DEFAULT 'cron_automatico', -- 'cron_automatico' | 'manual'
  fecha_agregado TIMESTAMPTZ DEFAULT NOW(),
  agregado_por UUID REFERENCES usuarios(id),
  estado VARCHAR(20) DEFAULT 'pendiente',
  conteo_repulses INTEGER DEFAULT 0,
  ultimo_repulse_at TIMESTAMPTZ,
  template_usado_id UUID REFERENCES repulse_templates(id),
  mensaje_personalizado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, proyecto_id)
);
```

### Tabla: `repulse_templates`
Templates de mensajes predefinidos.

```sql
CREATE TABLE repulse_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id),
  nombre VARCHAR(100) NOT NULL,
  mensaje TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla: `repulse_historial`
Registro de cada envío realizado.

```sql
CREATE TABLE repulse_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repulse_lead_id UUID NOT NULL REFERENCES repulse_leads(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id),
  template_id UUID REFERENCES repulse_templates(id),
  mensaje_enviado TEXT NOT NULL,
  enviado_at TIMESTAMPTZ DEFAULT NOW(),
  enviado_por UUID REFERENCES usuarios(id),
  respuesta_recibida BOOLEAN DEFAULT false,
  respuesta_at TIMESTAMPTZ,
  notas TEXT
);
```

### Campo en tabla `leads`
```sql
ALTER TABLE leads ADD COLUMN excluido_repulse BOOLEAN DEFAULT false;
```

### Stored Procedure: `detectar_leads_repulse()`
```sql
CREATE OR REPLACE FUNCTION detectar_leads_repulse(p_proyecto_id UUID)
RETURNS INTEGER AS $$
DECLARE
  leads_agregados INTEGER := 0;
BEGIN
  INSERT INTO repulse_leads (lead_id, proyecto_id, origen)
  SELECT l.id, l.proyecto_id, 'cron_automatico'
  FROM leads l
  WHERE l.proyecto_id = p_proyecto_id
    AND l.excluido_repulse = false
    AND l.created_at < NOW() - INTERVAL '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM locales_leads ll WHERE ll.lead_id = l.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM repulse_leads rl WHERE rl.lead_id = l.id
    )
  ON CONFLICT (lead_id, proyecto_id) DO NOTHING;

  GET DIAGNOSTICS leads_agregados = ROW_COUNT;
  RETURN leads_agregados;
END;
$$ LANGUAGE plpgsql;
```

---

## ⚙️ Server Actions

**Archivo:** `lib/actions-repulse.ts`

### Interfaces

```typescript
interface RepulseTemplate {
  id: string;
  proyecto_id: string;
  nombre: string;
  mensaje: string;
  activo: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

interface RepulseLead {
  id: string;
  lead_id: string;
  proyecto_id: string;
  origen: 'cron_automatico' | 'manual';
  fecha_agregado: string;
  agregado_por: string | null;
  estado: 'pendiente' | 'enviado' | 'respondio' | 'sin_respuesta' | 'excluido';
  conteo_repulses: number;
  ultimo_repulse_at: string | null;
  template_usado_id: string | null;
  mensaje_personalizado: string | null;
  lead?: { /* datos del lead */ };
  agregado_por_usuario?: { nombre: string };
}

interface RepulseHistorial {
  id: string;
  repulse_lead_id: string;
  lead_id: string;
  proyecto_id: string;
  template_id: string | null;
  mensaje_enviado: string;
  enviado_at: string;
  enviado_por: string | null;
  respuesta_recibida: boolean;
  respuesta_at: string | null;
  notas: string | null;
}
```

### Funciones de Templates

| Función | Descripción |
|---------|-------------|
| `getRepulseTemplates(proyectoId)` | Obtener templates activos de un proyecto |
| `createRepulseTemplate(proyectoId, nombre, mensaje, createdBy)` | Crear nuevo template |
| `updateRepulseTemplate(templateId, nombre, mensaje)` | Actualizar template |
| `deleteRepulseTemplate(templateId)` | Desactivar template (soft delete) |

### Funciones de Leads

| Función | Descripción |
|---------|-------------|
| `getRepulseLeads(proyectoId)` | Obtener todos los leads en repulse |
| `getRepulseLeadsPendientes(proyectoId)` | Obtener leads pendientes de envío |
| `addLeadToRepulse(leadId, proyectoId, agregadoPor)` | Agregar lead individual |
| `addMultipleLeadsToRepulse(leadIds, proyectoId, agregadoPor)` | Agregar múltiples leads |
| `removeLeadFromRepulse(repulseLeadId)` | Eliminar lead de repulse |
| `updateRepulseLeadEstado(repulseLeadId, estado)` | Actualizar estado |
| `excluirLeadDeRepulse(leadId)` | Excluir permanentemente |
| `reincluirLeadEnRepulse(leadId)` | Quitar exclusión |

### Funciones de Envío

| Función | Descripción |
|---------|-------------|
| `registrarEnvioRepulse(...)` | Registrar envío individual en historial |
| `prepararEnvioRepulseBatch(repulseLeadIds, mensaje, templateId, enviadoPor)` | Preparar batch para n8n |

### Funciones de Historial

| Función | Descripción |
|---------|-------------|
| `getRepulseHistorialByLead(leadId)` | Obtener historial de un lead |
| `marcarRespuestaRepulse(historialId, notas?)` | Marcar respuesta recibida |

### Funciones de Estadísticas

| Función | Descripción |
|---------|-------------|
| `getRepulseStats(proyectoId)` | Conteos por estado |
| `ejecutarDeteccionRepulse(proyectoId)` | Ejecutar stored procedure |
| `getLeadsCandidatosRepulse(proyectoId)` | Leads elegibles para agregar |

---

## 🎨 Componentes UI

### Página `/repulse`
**Archivo:** `app/repulse/page.tsx`

Página principal del sistema de repulse con:
- Lista de leads en repulse
- Filtros por estado
- Gestión de templates
- Botón de envío batch

### RepulseEnvioModal
**Archivo:** `components/repulse/RepulseEnvioModal.tsx`

Modal para configurar y enviar mensajes:
- Selección de template o mensaje personalizado
- Variables: `{{nombre}}` - Nombre del lead
- Muestra conteo de leads seleccionados
- Prepara datos para n8n

**Props:**
```typescript
interface RepulseEnvioModalProps {
  selectedLeadIds: string[];
  templates: RepulseTemplate[];
  proyectoId: string;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}
```

---

## 🔗 Integración con /operativo

### LeadsTable.tsx
Agregado sistema de selección múltiple:

**Nuevas props:**
```typescript
showRepulseSelection?: boolean;      // Mostrar checkboxes
selectedLeadIds?: string[];          // IDs seleccionados
onSelectionChange?: (ids: string[]) => void;
onSendToRepulse?: () => void;        // Handler para botón
isAddingToRepulse?: boolean;         // Estado loading
```

**UI:**
- Checkboxes en cada fila de la tabla
- Select all/none en header
- Contador de seleccionados junto a "Leads Recientes"
- Botón "Enviar a Repulse" (amarillo/amber)
- Botón "Limpiar" con icono X

### LeadDetailPanel.tsx
Agregada sección de Repulse en panel de detalles:

**Nuevas props:**
```typescript
onSendToRepulse?: (leadId: string) => void;
onToggleExcludeRepulse?: (leadId: string, exclude: boolean) => void;
showRepulseButton?: boolean;
```

**Estados visuales:**
- **Lead NO excluido:** Muestra botones "Enviar a Repulse" y "Excluir permanentemente"
- **Lead excluido:** Muestra badge rojo "Excluido de Repulse" con link "Reincluir"

### OperativoClient.tsx
Handlers implementados:

```typescript
// Estado
const [selectedLeadIdsForRepulse, setSelectedLeadIdsForRepulse] = useState<string[]>([]);
const [isAddingToRepulse, setIsAddingToRepulse] = useState(false);

// Handlers
handleSendToRepulse(leadId: string)        // Individual
handleSendMultipleToRepulse()              // Batch
handleToggleExcludeRepulse(leadId, exclude) // Exclusión
```

---

## 📊 Flujo de Trabajo

### 1. Detección Automática (Cron)
```
Cron (cada 10 días)
    ↓
n8n llama endpoint
    ↓
ejecutarDeteccionRepulse(proyectoId)
    ↓
detectar_leads_repulse() [SQL]
    ↓
Leads agregados a repulse_leads
```

### 2. Agregado Manual desde /operativo
```
Usuario selecciona leads en tabla
    ↓
Click "Enviar a Repulse"
    ↓
addMultipleLeadsToRepulse()
    ↓
Validaciones (no compra, no excluido)
    ↓
Insert en repulse_leads
```

### 3. Envío de Mensajes
```
Usuario en /repulse selecciona leads
    ↓
Abre RepulseEnvioModal
    ↓
Selecciona template o escribe mensaje
    ↓
prepararEnvioRepulseBatch()
    ↓
Registra en repulse_historial
    ↓
Retorna datos para n8n
    ↓
[PENDIENTE] Webhook a n8n
    ↓
n8n envía WhatsApp
```

### 4. Exclusión Manual
```
Usuario abre panel de lead en /operativo
    ↓
Click "Excluir permanentemente de Repulse"
    ↓
excluirLeadDeRepulse(leadId)
    ↓
leads.excluido_repulse = true
    ↓
repulse_leads.estado = 'excluido' (si existe)
```

---

## ⏳ Pendientes

| # | Tarea | Prioridad | Estado |
|---|-------|-----------|--------|
| 1 | Configurar cron job (cada 10 días) | Alta | ⏳ |
| 2 | Integrar webhook n8n en RepulseEnvioModal | Alta | ⏳ |
| 3 | Endpoint API para recibir respuestas de n8n | Media | ⏳ |
| 4 | Dashboard de métricas de repulse | Baja | ⏳ |
| 5 | Notificaciones push cuando lead responde | Baja | ⏳ |

---

## 📝 Commits Relacionados

| Commit | Descripción |
|--------|-------------|
| `4e210fc` | feat: add repulse integration in /operativo page |
| `86c9ab2` | fix: correct property names for addMultipleLeadsToRepulse response |
| `6d32171` | refactor: move repulse selection actions next to table title |
| `9702f8c` | style: add border and X icon to "Limpiar" button |
| `a3d9a2f` | feat: add repulse exclusion toggle in LeadDetailPanel |
| `a9fbb2f` | style: add red border to exclude repulse button |

---

## 📁 Archivos Relevantes

| Archivo | Descripción |
|---------|-------------|
| `lib/actions-repulse.ts` | Server actions completas |
| `lib/db.ts` | Interface Lead con `excluido_repulse` |
| `app/repulse/page.tsx` | Página principal de repulse |
| `components/repulse/RepulseEnvioModal.tsx` | Modal de envío |
| `components/dashboard/LeadsTable.tsx` | Tabla con multi-select |
| `components/dashboard/LeadDetailPanel.tsx` | Panel con botones repulse |
| `components/dashboard/OperativoClient.tsx` | Lógica de integración |

---

## 🔐 Permisos

Roles con acceso a funcionalidades de repulse:
- `admin` ✅
- `jefe_ventas` ✅
- `vendedor` ❌

Verificación en `OperativoClient.tsx`:
```typescript
const showRepulseButton = ['admin', 'jefe_ventas'].includes(role);
```

---

## 📚 Referencias

- **Branch:** `feature/repulse`
- **Sesión de desarrollo:** 65 (5 Dic 2025)
- **Integración futura:** n8n + WhatsApp Business API

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
