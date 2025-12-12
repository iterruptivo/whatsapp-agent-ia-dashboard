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

**COMPLETADO** - Branch: `feature/repulse` → merged to `staging`
**Última actualización:** Sesión 68 (11 Dic 2025)

### Funcionalidades Implementadas:
- ✅ Tablas de base de datos (repulse_leads, repulse_templates, repulse_historial)
- ✅ Stored Procedure `detectar_leads_repulse()` para detección + reactivación
- ✅ Server Actions completas en `lib/actions-repulse.ts`
- ✅ Página `/repulse` con lista de leads y gestión de templates
- ✅ Modal de envío de repulse (`RepulseEnvioModal`) con emoji picker
- ✅ Integración en `/operativo` (selección múltiple + botón individual)
- ✅ Sistema de exclusión de leads (`excluido_repulse`)
- ✅ Campo `excluido_repulse` en interface Lead
- ✅ Integración webhook n8n para envío de mensajes WhatsApp
- ✅ ConfirmModal elegante (reemplaza `confirm()` del navegador)
- ✅ **Cron job pg_cron DIARIO (3:00 AM Perú)** - Actualizado Sesión 68
- ✅ Lógica de reactivación (leads enviados vuelven a pendiente tras 15 días)
- ✅ **Widget de Quota WhatsApp** (badge con indicador de consumo diario)
- ✅ **Modal informativo actualizado** con horario de cron correcto
- ✅ **Paginación tabla** (50 items/página, UI arriba y abajo) - Sesión 68
- ✅ **Sort por Fecha Lead** (click header para asc/desc) - Sesión 68

### Pendientes:
- ⏳ **Tracking de respuestas** (modificar flujo Victoria + endpoint `/api/repulse/response`)
- ⏳ Envío automático nocturno (cron job 11:00 PM)
- ⏳ Dashboard de métricas de repulse

### Ocultos en UI (no implementados):
- 🔒 Stats card "Respondieron" (comentado)
- 🔒 Stats card "Sin respuesta" (comentado)
- 🔒 Filtro por estado "respondio" (comentado)
- 🔒 Filtro por estado "sin_respuesta" (comentado)

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

La función realiza dos operaciones:
1. **Detectar nuevos leads** (30+ días sin compra)
2. **Reactivar leads enviados** (15+ días desde último envío)

```sql
CREATE OR REPLACE FUNCTION detectar_leads_repulse(p_proyecto_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count_nuevos INTEGER := 0;
  v_count_reactivados INTEGER := 0;
BEGIN
  -- 1. Insertar leads nuevos (30+ días sin compra)
  INSERT INTO repulse_leads (lead_id, proyecto_id, origen, estado)
  SELECT l.id, l.proyecto_id, 'cron_automatico', 'pendiente'
  FROM leads l
  WHERE l.proyecto_id = p_proyecto_id
    AND l.excluido_repulse = FALSE
    AND l.created_at <= NOW() - INTERVAL '30 days'
    AND NOT EXISTS (SELECT 1 FROM locales_leads ll WHERE ll.lead_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM repulse_leads rl WHERE rl.lead_id = l.id AND rl.proyecto_id = l.proyecto_id)
  ON CONFLICT (lead_id, proyecto_id) DO NOTHING;
  GET DIAGNOSTICS v_count_nuevos = ROW_COUNT;

  -- 2. Reactivar leads con estado='enviado' y último envío > 15 días
  UPDATE repulse_leads
  SET estado = 'pendiente'
  WHERE proyecto_id = p_proyecto_id
    AND estado = 'enviado'
    AND ultimo_repulse_at <= NOW() - INTERVAL '15 days';
  GET DIAGNOSTICS v_count_reactivados = ROW_COUNT;

  RETURN v_count_nuevos + v_count_reactivados;
END;
$$ LANGUAGE plpgsql;
```

**Ciclo de vida de un lead en Repulse:**
```
Lead nuevo (30+ días) ───► pendiente ───► enviado ─────┐
                               ▲                        │
                               │                        │
                               └── (15 días) ───────────┘

Lead responde ─────────────────────────────────► respondio
Lead excluido ─────────────────────────────────► excluido
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
| `getQuotaWhatsApp(limite?)` | Obtener quota disponible del día (default 250) |

---

## 🎨 Componentes UI

### Página `/repulse`
**Archivo:** `app/repulse/page.tsx`

Página principal del sistema de repulse con:
- Lista de leads en repulse
- Filtros por estado y búsqueda
- Gestión de templates
- Botón de envío batch
- **Paginación** (50 items por página, arriba y abajo)
- **Sort por Fecha Lead** (click en header para alternar asc/desc)

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

### 1. Detección Automática (pg_cron)
```
pg_cron (DIARIO, 3:00 AM Perú)
    ↓
detectar_leads_repulse() [SQL por cada proyecto activo]
    ↓
1. Nuevos leads agregados (30+ días sin compra)
2. Leads 'enviado' reactivados a 'pendiente' (15+ días)
    ↓
Leads listos en /repulse para envío manual
```

**Configuración del cron job (Actualizada Sesión 68 - 11 Dic 2025):**
```sql
SELECT cron.schedule(
  'detectar-leads-repulse',
  '0 8 * * *',  -- 08:00 UTC = 3:00 AM Perú
  $$
  SELECT detectar_leads_repulse(id)
  FROM proyectos
  WHERE activo = true
  $$
);
```

> **Cambio Sesión 68:** Cron actualizado de cada 15 días a **DIARIO** para detectar leads más rápidamente.

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

### 3. Envío de Mensajes (MANUAL)
```
Usuario en /repulse selecciona leads
    ↓
Abre RepulseEnvioModal (emoji picker disponible)
    ↓
Selecciona template o escribe mensaje personalizado
    ↓
prepararEnvioRepulseBatch()
    ↓
Registra en repulse_historial + actualiza estado='enviado'
    ↓
enviarRepulseViaWebhook()
    ↓
Webhook POST a n8n (delay 500ms entre envíos)
    ↓
n8n Switch rutea por proyectoId
    ↓
WhatsApp Graph API envía mensaje
    ↓
Modal muestra resultados (enviados/fallidos)
```

**Variable de entorno requerida:**
```
N8N_REPULSE_WEBHOOK_URL=https://iterruptivo.app.n8n.cloud/webhook/repulse-send
```

**Payload enviado a n8n:**
```json
{
  "telefono": "51999999999",
  "mensaje": "Hola Juan, tenemos una oferta...",
  "nombre": "Juan Pérez",
  "proyectoId": "uuid-del-proyecto",
  "lead_id": "uuid-del-lead",
  "repulse_lead_id": "uuid-del-repulse-lead"
}
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
| 1 | ~~Configurar cron job (cada 15 días)~~ | Alta | ✅ |
| 2 | ~~Integrar webhook n8n en RepulseEnvioModal~~ | Alta | ✅ |
| 3 | ~~**Widget de Quota WhatsApp**~~ | Alta | ✅ |
| 4 | **Envío Automático Nocturno (cron 11:00 PM)** | Alta | ⏳ |
| 5 | Endpoint API para recibir respuestas de n8n | Media | ⏳ |
| 6 | Dashboard de métricas de repulse | Baja | ⏳ |
| 7 | Notificaciones push cuando lead responde | Baja | ⏳ |

---

## 🚀 Mejora Planificada: Sistema de Quota y Envío Automático

**Fecha de diseño:** 6 Diciembre 2025
**Estado:** PARCIALMENTE IMPLEMENTADO (Widget ✅, Envío Nocturno ⏳)
**Prioridad:** Alta

### ✅ Widget de Quota Implementado (Sesión 65C - 7 Dic 2025)

**Ubicación:** Página `/repulse`, a la izquierda del botón "Actualizar"

**Características:**
- Badge con indicador de quota disponible (ej: "Quota: 205/250")
- Colores semánticos según consumo:
  - 🟢 Verde: <50% usado
  - 🟡 Amarillo: 50-80% usado
  - 🔴 Rojo: >80% usado
- Tooltip con información detallada al hover
- Usa timezone Perú (UTC-5) para cálculo correcto del día

**Función implementada:** `getQuotaWhatsApp()` en `lib/actions-repulse.ts`

```typescript
export interface QuotaInfo {
  leadsHoy: number;      // Leads de campaña que entraron hoy
  limite: number;        // Límite diario (default 250)
  disponible: number;    // Mensajes disponibles para Repulse
  porcentajeUsado: number;
}
```

**Lógica de cálculo:**
- Cuenta leads con `estado != 'lead_manual'` creados hoy (hora Perú)
- Estos son leads de campaña que consumieron mensajes de Victoria
- `disponible = limite - leadsHoy`

---

### ⏳ Pendiente: Envío Automático Nocturno

### Contexto del Problema

Meta WhatsApp Cloud API tiene un **límite de 250 mensajes business-initiated por día** para cuentas no verificadas. Actualmente, todos los flujos comparten este límite:

- **Victoria (chatbot)**: Respuestas automáticas a campañas
- **Repulse**: Mensajes de re-engagement
- **Campañas**: Mensajes masivos de marketing

**Riesgo:** Si se envían más de 250 mensajes en un día → **Penalización de Meta**

### Solución Propuesta

**Sistema de quota diaria + envío automático nocturno de Repulse**

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DEL DÍA                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  6:00 AM ──────────────────────────────────────► 11:00 PM  │
│     │                                                │      │
│     ▼                                                ▼      │
│  [Campañas + Victoria]                      [Cron Repulse]  │
│     │                                                │      │
│     ▼                                                ▼      │
│  n8n incrementa contador ──────► Supabase ◄── Consulta quota│
│  en cada envío                   (tabla)     250 - usados   │
│                                                      │      │
│                                                      ▼      │
│                                              Envía Repulse  │
│                                              (máx restante) │
│                                                             │
│  12:00 AM ──────────────────────────────────────────────── │
│     │                                                       │
│     ▼                                                       │
│  [Reset automático] → contador = 0                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementación Técnica

#### Decisión de Diseño: Usar tabla `leads` (NO crear tabla nueva)

> **Análisis:** La tabla `leads` ya tiene toda la información necesaria para calcular la quota diaria consumida. Cada lead que entra por campaña (estado != 'lead_manual') representa 1 mensaje de Victoria consumido.

**Lógica de consumo de quota:**
```
Lead entra por campaña → Victoria responde automáticamente → 1 mensaje consumido de los 250
Lead ingresado manualmente → NO consume quota (estado = 'lead_manual')
```

**Ventajas de usar `leads`:**
| Aspecto | Tabla nueva (descartada) | `leads` (elegido) |
|---------|--------------------------|-------------------|
| Mantenimiento | Tabla adicional | Ya existe |
| Historial | Solo contadores | Detalle completo del lead |
| Single source of truth | Puede desincronizar | Es la fuente real |
| Complejidad n8n | Modificar flujos | Zero cambios |

#### 1. Función para Obtener Quota (usando tabla leads)

```sql
-- Función para obtener quota disponible del día
-- Cuenta los leads que entraron HOY por campaña (consumieron quota de Victoria)
CREATE OR REPLACE FUNCTION get_quota_disponible_repulse(p_limite INTEGER DEFAULT 250)
RETURNS INTEGER AS $$
DECLARE
  v_leads_campaña INTEGER;
BEGIN
  -- Leads del día que NO son manuales = mensajes consumidos por Victoria
  SELECT COUNT(*)::INTEGER INTO v_leads_campaña
  FROM leads
  WHERE created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day'
    AND estado != 'lead_manual';

  RETURN GREATEST(0, p_limite - COALESCE(v_leads_campaña, 0));
END;
$$ LANGUAGE plpgsql STABLE;

-- Función para obtener conteo de mensajes consumidos hoy (para widget)
CREATE OR REPLACE FUNCTION get_mensajes_consumidos_hoy()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM leads
  WHERE created_at >= CURRENT_DATE
    AND created_at < CURRENT_DATE + INTERVAL '1 day'
    AND estado != 'lead_manual';
$$ LANGUAGE sql STABLE;
```

**Ejemplo de registro en `leads`:**
```sql
-- Lead ingresado manualmente (NO consume quota)
estado = 'lead_manual'

-- Lead de campaña (SÍ consume quota - Victoria respondió)
estado = 'nuevo', 'en_conversacion', 'interesado', etc.
```

#### 2. n8n NO necesita modificación

Los flujos existentes no requieren cambios porque:
- Victoria ya responde automáticamente a leads de campaña
- El INSERT en `leads` ya ocurre (es el flujo normal)
- Solo consultamos datos existentes, no agregamos tracking adicional

**Beneficio:** Zero cambios a flujos n8n existentes.

#### 3. Cron Job para Envío Automático Nocturno (11:00 PM)

```sql
SELECT cron.schedule(
  'repulse-automatico-noche',
  '0 4 * * *',  -- 04:00 UTC = 11:00 PM Perú
  $$
  SELECT net.http_post(
    'https://iterruptivo.app.n8n.cloud/webhook/repulse-auto-noche',
    '{}',
    'application/json'
  );
  $$
);
```

#### 4. Nuevo Flujo n8n: `repulse-auto-noche`

```
[Webhook Trigger: repulse-auto-noche]
      │
      ▼
[Supabase RPC: get_quota_disponible_repulse(250)] → quota_restante
      │
      ▼
[IF quota_restante > 0]
      │
      ▼
[Supabase Query: SELECT * FROM repulse_leads
                 WHERE estado = 'pendiente'
                 ORDER BY fecha_agregado ASC
                 LIMIT quota_restante]
      │
      ▼
[Loop: Para cada lead]
      │
      ├── [Enviar WhatsApp con mensaje de Repulse]
      └── [INSERT repulse_historial + UPDATE repulse_leads] ← Ya existe en flujo actual
      │
      ▼
[Log resultados]
```

**Lógica:** La función `get_quota_disponible_repulse()` consulta la tabla `leads` para ver cuántos leads de campaña entraron hoy, y calcula cuántos mensajes quedan disponibles.

#### 5. Indicador en Dashboard (Opcional)

En `/repulse`, mostrar widget con quota del día:

```
┌─────────────────────────────────┐
│  📊 Quota WhatsApp Hoy          │
│  ═══════════════════════════    │
│  Leads campaña hoy: 45          │
│  Disponibles para Repulse: 205  │
│  ████████░░░░░░░░░ 18% usado    │
│  (límite: 250/día)              │
└─────────────────────────────────┘
```

### Flujo Diario Esperado

| Hora | Acción | Ejemplo |
|------|--------|---------|
| 00:00 | Nuevo día, quota = 0/250 | leads campaña hoy = 0 |
| 06:00-22:00 | Campañas → Victoria responde | +45 leads = 45/250 usados |
| 23:00 | Cron consulta: `get_quota_disponible_repulse()` | Retorna 205 |
| 23:00-23:59 | Repulse envía automáticamente | Máx 205 mensajes |
| 23:59 | Día termina | Se usaron los 250 |

**Cálculo real:**
```
quota_disponible = 250 - COUNT(leads HOY donde estado != 'lead_manual')
```

### Beneficios

- ✅ **Maximiza uso de los 250 mensajes diarios** (no se desperdician)
- ✅ **Repulse no compite con campañas** durante el día
- ✅ **Completamente automático** - Sin intervención manual
- ✅ **Tracking en tiempo real** desde dashboard (consulta tabla `leads`)
- ✅ **Previene penalizaciones de Meta** por exceder límite
- ✅ **Zero cambios a n8n existente** - Solo consulta datos que ya existen

### Archivos a Crear/Modificar (SIMPLIFICADO)

| Archivo | Acción |
|---------|--------|
| `supabase/migrations/YYYYMMDD_quota_functions.sql` | Solo funciones (NO tabla nueva) |
| `lib/actions-repulse.ts` | Agregar `getQuotaDisponible()` |
| `components/repulse/WhatsAppQuotaWidget.tsx` | Widget indicador (opcional) |
| n8n: `repulse-auto-noche` | Nuevo flujo completo |

**¿Por qué NO se modifica n8n existente?** La quota se calcula desde `leads` (datos que ya existen). Zero cambios a flujos existentes.

### Estimación de Implementación (REDUCIDA)

| Fase | Descripción | Tiempo estimado |
|------|-------------|-----------------|
| 1 | Crear funciones SQL (sin tabla) | 15 min |
| 2 | ~~Modificar flujos n8n existentes~~ | ~~1 hora~~ **0 min** |
| 3 | Crear flujo n8n repulse-auto-noche | 1 hora |
| 4 | Widget indicador en dashboard | 30 min |
| 5 | Testing end-to-end | 30 min |
| **Total** | | **~2.5 horas** |

### Notas Adicionales

- El límite de 250 se puede aumentar verificando la cuenta Meta Business (1K → 10K → 100K → ilimitado)
- Si se verifica la cuenta, solo cambiar el parámetro en `get_quota_disponible_repulse(nuevo_limite)`
- Considerar agregar alertas cuando la quota está al 80% (200 mensajes)
- **Historial completo:** `repulse_historial` guarda CADA envío con fecha, mensaje, lead, proyecto - perfecto para analytics

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
| `1c4c800` | feat: integrate n8n webhook for repulse message sending |
| `07b704f` | fix: send proyecto_id to n8n webhook for routing |
| `015b604` | feat: replace browser confirm() with ConfirmModal in RepulseClient |
| `3a09381` | fix: sync repulse_leads status when re-including lead from /operativo |
| `b8a8fd4` | feat: improve quota badge UX - position, timezone, tooltip |
| `acd15f0` | docs: Update Repulse info modal - cron now runs daily at 3:00 AM |

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

- **Branch:** `feature/repulse` → merged to `staging`
- **Sesiones de desarrollo:** 65, 65B, 65C, 68 (5-11 Dic 2025)
- **Integración:** n8n + WhatsApp Business API ✅ COMPLETADA
- **Cron job:** pg_cron **DIARIO** (08:00 UTC / 3:00 AM Perú) - Actualizado Sesión 68
- **Widget Quota:** Implementado con timezone Perú (UTC-5)

---

## 🔧 Comandos Útiles

```sql
-- Verificar cron job
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'detectar-leads-repulse';

-- Ver historial de ejecuciones
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Ejecutar detección manualmente para TODOS los proyectos
SELECT
  p.nombre AS proyecto,
  detectar_leads_repulse(p.id) AS leads_agregados
FROM proyectos p
WHERE p.activo = true;

-- Ejecutar detección para UN proyecto específico
SELECT detectar_leads_repulse('uuid-del-proyecto');

-- Reprogramar cron (ejemplo: cambiar horario)
SELECT cron.unschedule('detectar-leads-repulse');
SELECT cron.schedule(
  'detectar-leads-repulse',
  '0 8 * * *',  -- 3:00 AM Perú
  $$
  SELECT detectar_leads_repulse(id)
  FROM proyectos
  WHERE activo = true
  $$
);
```

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
