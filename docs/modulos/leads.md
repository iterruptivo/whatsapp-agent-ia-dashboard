# 📊 MÓDULO DE LEADS

## 📋 Índice
- [Estado Actual](#-estado-actual)
- [Sesiones Relacionadas](#-sesiones-relacionadas)
- [Funcionalidades](#-funcionalidades)
- [Sistema de Estados](#-sistema-de-estados)
- [Código Relevante](#-código-relevante)
- [Mejoras Pendientes](#-mejoras-pendientes)
- [Referencias](#-referencias)

---

## 🔄 Estado Actual

**SISTEMA OPERATIVO** - Última actualización: Sesión 46 (16 Nov 2025)

### Métricas Actuales:
- **Total Leads:** 1,417 (Proyecto Callao)
- **Límite Sistema:** 10,000 leads (usando `.range()`)
- **Estados Activos:** 5 (lead_completo, lead_incompleto, en_conversacion, conversacion_abandonada, lead_manual)
- **Keyset Pagination:** Implementada (sin JOINs) ✅

### Funcionalidades Principales:
- ✅ Captura automática vía n8n WhatsApp
- ✅ Import manual de leads (CSV/Excel - solo admin)
- ✅ Asignación de vendedor automática y manual
- ✅ Tracking de visitas físicas (columna "Asistió")
- ✅ Export a Excel
- ✅ Búsqueda exacta por código
- ✅ Filtros por proyecto, estado, vendedor, fecha

---

## 📝 Sesiones Relacionadas

### **Sesión 24** (27 Oct) - Email Field Display
**Implementado:** Display de campo email en tabla de leads
**Decisión:** Solo mostrar si lead tiene email (no NULL)
**UI:** Columna opcional, sin afectar layout

### **Sesión 25** (27 Oct) - WhatsApp Notification via n8n
**Implementado:** Webhook para notificar vendedor cuando se le asigna lead
**Flujo:** Admin asigna → n8n envía WhatsApp → Vendedor notificado
**Teléfono:** Extraído de tabla `vendedores`

### **Sesión 31** (31 Oct) - Búsqueda Exacta + Import Manual
**Problema:** Búsqueda "P-1" traía P-10, P-111, etc.
**Solución:** `.includes()` → `.===` (match exacto)
**Feature:** Sistema de import manual de leads (CSV/Excel)
- Admin puede importar leads de otros canales
- Asignar vendedor específico en CSV
- Nuevo estado: `lead_manual`
- Validación de duplicados por teléfono

### **Sesión 33** (3 Nov) - FIX CRÍTICO: Límite 1000/1406
**Problema:** Dashboard mostraba solo 1000 de 1,406 leads
**Root Cause:** Supabase PostgREST límite por defecto de 1000
**Solución:** `.limit(10000)` agregado a query
**Resultado:** Temporal (no funcionó con JOINs)

### **Sesión 33B** (3 Nov) - DEBUG: .limit() → .range()
**Problema:** `.limit(10000)` no funcionó
**Root Cause:** `.limit()` falla con queries que usan JOINs
**Solución:** `.limit(10000)` → `.range(0, 9999)`
**Resultado:** Temporal (persistió límite de 1000)

### **Sesión 33C** (3 Nov) - FASE 1: Remover JOINs
**Estrategia:** Fetch separado + enriquecimiento en código
**Cambio:**
- Query leads SIN JOINs
- Fetch vendedores por separado
- Fetch proyectos por separado
- Enriquecer en código (JavaScript)
**Resultado:** ✅ 1,417 leads mostrados correctamente

### **Sesión 41** (8 Nov) - Columna "Asistió" en Tabla + Panel
**Feature:** Tracking de visitas físicas al proyecto
**Backend:** Campo `asistio` (boolean) en tabla leads
**UI:**
- Columna "Asistió" en tabla (badges verde/gris)
- Campo en panel de detalles (sección Información de Contacto)
**Lógica:** `asistio = true` cuando lead se vincula a local

### **Sesión 41B** (10 Nov) - Columna "Fecha": fecha_captura → created_at
**Problema:** Columna "Fecha" mostraba `fecha_captura` (cuando completó datos)
**Usuario prefiere:** `created_at` (cuando entró al sistema)
**Cambio:** 1 línea modificada en LeadsTable.tsx
**Diferencia:** created_at puede ser 26 horas antes de fecha_captura

### **Sesión 46** (16 Nov) - ✅ **FIX CRÍTICO: PGRST116 en Import Manual**
**Problema:** Error PGRST116 al agregar lead manual con email leo@ecoplaza.com
**Síntoma:** "Cannot coerce the result to a single JSON object"
**Root Cause:** `.maybeSingle()` falla cuando encuentra duplicados en la DB (2+ leads con mismo teléfono)

**Análisis exhaustivo:**
- Log de consola mostraba objeto incompleto (solo 3 campos), pero era SOLO para debug
- Objeto real `pendingLeads` enviado SÍ tenía todos los campos
- Error venía de línea 244 de `actions.ts` al verificar duplicados
- `.maybeSingle()` espera 0 o 1 resultado, falla con múltiples filas

**Solución quirúrgica:**
```typescript
// ANTES (fallaba con duplicados)
const { data: existingLead } = await supabase
  .from('leads')
  .select('id')
  .eq('proyecto_id', proyectoId)
  .eq('telefono', lead.telefono)
  .maybeSingle(); // ❌ Falla si hay 2+ resultados

// DESPUÉS (maneja duplicados correctamente)
const { data: existingLeads } = await supabase
  .from('leads')
  .select('id')
  .eq('proyecto_id', proyectoId)
  .eq('telefono', lead.telefono)
  .limit(1); // ✅ Solo pregunta "¿existe al menos uno?"
```

**Archivos modificados:**
- `lib/actions.ts` (líneas 238-250): `.maybeSingle()` → `.limit(1)`
- `ManualLeadPanel.tsx` (línea 199): log completo del objeto

**Testing requerido:**
1. Agregar lead "Leo D Leon" con email leo@ecoplaza.com
2. Verificar que no falle con PGRST116
3. Confirmar que duplicados se detectan correctamente

**Lección aprendida:**
- `.maybeSingle()` es sensible a duplicados en la DB
- `.limit(1)` es más robusto para verificaciones de existencia
- Siempre usar `.limit(1)` cuando solo importa "¿existe?" (no "¿cuántos hay?")

**Commit:** `7fe69cf` - fix: PGRST116 en import manual - usar .limit(1) en vez de .maybeSingle()

---

## ⚙️ Funcionalidades

### **1. Captura Automática (n8n)**

**Flujo:**
```
Usuario → WhatsApp Bot Victoria → Captura datos (nombre, rubro, horario)
       → n8n webhook → Supabase leads table → Dashboard
```

**Estados Automáticos:**
- `lead_completo`: Nombre + rubro + horario
- `lead_incompleto`: Faltan datos
- `en_conversacion`: Conversación activa
- `conversacion_abandonada`: Usuario no responde

### **2. Import Manual (Admin Only)**

**Formato CSV/Excel:**
```csv
nombre,telefono,email_vendedor,email,rubro
Juan Pérez,987654321,alonso@ecoplaza.com,juan@example.com,Retail
```

**Validaciones:**
- Vendedor debe existir y tener rol "vendedor"
- Duplicados por teléfono en mismo proyecto se omiten
- Email y rubro son opcionales
- Estado automático: `lead_manual`

**Componente:** `components/leads/LeadImportModal.tsx`

### **3. Sistema de Búsqueda**

**Búsqueda Exacta:**
- Input de texto + botón "Search"
- Match exacto por código (case-insensitive)
- Botón "X" para limpiar búsqueda

**Ejemplo:**
- Buscar "P-1" → Solo muestra P-1 (NO P-10, P-111)

### **4. Filtros Avanzados**

**Por Proyecto:**
- Dropdown con todos los proyectos activos
- Cambio de proyecto recarga leads

**Por Estado:**
- lead_completo (verde)
- lead_incompleto (amarillo)
- en_conversacion (azul oscuro)
- conversacion_abandonada (gris)
- lead_manual (púrpura)

**Por Vendedor:**
- Dropdown de vendedores asignados
- "Todos" para ver sin filtro

**Por Fecha:**
- Rango desde/hasta
- Date pickers

### **5. Export a Excel**

**Botón:** "Exportar a Excel" (solo admin y vendedor)
**Formato:** xlsx con todas las columnas
**Filtros:** Respeta filtros activos en tabla

### **6. Columna "Asistió"**

**Propósito:** Identificar leads que visitaron físicamente el proyecto

**Display:**
- Badge verde con checkmark "Sí"
- Badge gris "No"

**Backend:**
- Campo `asistio` (boolean, default: false)
- Se marca `true` al vincular lead con local

**Business Value:**
- Analytics: Conversión visita → compra
- Priorizar seguimiento de leads que ya visitaron

### **7. Panel de Detalles**

**Información Mostrada:**
- Información de Contacto (nombre, teléfono, email, asistió)
- Proyecto y vendedor asignado
- Estado actual
- Timestamps (created_at, fecha_captura, updated_at)
- Rubro y horario de visita

**Acciones:**
- Reasignar vendedor (solo admin)
- Cambiar estado (admin y vendedor)
- Ver historial de cambios

---

## 📊 Sistema de Estados

### **Estados del Lead:**

**1. lead_completo** (Verde)
- Nombre + rubro + horario capturados
- Lead listo para seguimiento
- Vendedor puede contactar

**2. lead_incompleto** (Amarillo)
- Faltan datos
- Bot no pudo completar captura
- Requiere seguimiento manual

**3. en_conversacion** (Azul oscuro)
- Conversación activa con bot
- Lead está respondiendo
- Datos en proceso de captura

**4. conversacion_abandonada** (Gris)
- Usuario dejó de responder
- Conversación sin completar
- Seguimiento de baja prioridad

**5. lead_manual** (Púrpura)
- Importado manualmente por admin
- Origen: Otros canales (llamadas, email, walk-ins)
- Ya tiene vendedor asignado

### **Transiciones de Estado:**

```
en_conversacion → lead_completo (bot captura datos)
en_conversacion → conversacion_abandonada (usuario no responde)
en_conversacion → lead_incompleto (timeout sin datos completos)
lead_manual → (sin cambios automáticos, solo manual)
```

---

## 💻 Código Relevante

### **Archivos Principales:**

**1. lib/db.ts** (Función `getAllLeads()`)
```typescript
// KEYSET PAGINATION (sin JOINs)
export async function getAllLeads(
  dateFrom?: Date,
  dateTo?: Date,
  proyectoId?: string
): Promise<Lead[]> {
  // STEP 1: Fetch leads sin JOINs
  const { data: leadsData } = await supabase
    .from('leads')
    .select('*')
    .eq('proyecto_id', proyectoId)
    .range(0, 9999); // ← 10k leads max

  // STEP 2: Fetch vendedores por separado
  const { data: vendedoresData } = await supabase
    .from('vendedores')
    .select('id, nombre');

  // STEP 3: Enriquecer leads con data de vendedores
  return enrichedLeads;
}
```

**2. components/dashboard/LeadsTable.tsx** (485 líneas)
- Tabla principal de leads
- Columnas: Nombre, Teléfono, Email, Estado, Vendedor, Fecha, Asistió
- Búsqueda exacta
- Badges color-coded

**3. components/dashboard/LeadDetailPanel.tsx** (212 líneas)
- Panel slide-in desde la derecha
- Información completa del lead
- Acciones de admin/vendedor

**4. components/leads/LeadImportModal.tsx** (385 líneas)
- Modal de importación CSV/Excel
- Validación de vendedores
- Preview de primeras 5 filas
- Resumen post-import (éxitos, duplicados, errores)

**5. lib/actions.ts** (Server Action: `importManualLeads`)
```typescript
export async function importManualLeads(
  leads: LeadImport[],
  proyectoId: string
): Promise<ActionResult> {
  // 1. Validar vendedor existe y tiene rol "vendedor"
  // 2. Verificar duplicado por teléfono
  // 3. Insertar con estado "lead_manual"
  // 4. Retornar resumen (éxitos, duplicados, vendedores inválidos)
}
```

### **Interfaces TypeScript:**

```typescript
export interface Lead {
  id: string;
  proyecto_id: string;
  nombre: string;
  telefono: string;
  email?: string | null;
  rubro?: string | null;
  estado: 'lead_completo' | 'lead_incompleto' | 'en_conversacion' | 'conversacion_abandonada' | 'lead_manual';
  horario_visita?: string | null;
  vendedor_asignado_id?: string | null;
  asistio: boolean; // ← Sesión 41
  created_at: string;
  fecha_captura: string;
  updated_at: string;
  vendedor_nombre?: string | null;
  proyecto_nombre?: string | null;
  proyecto_color?: string | null;
}

export interface LeadImport {
  nombre: string;
  telefono: string;
  email_vendedor: string;
  email?: string;
  rubro?: string;
}
```

---

## ⏳ Mejoras Pendientes

### **MEJORA #1: Paginación Server-Side** 🟢

**Cuándo:** Cuando lleguen a ~8,000 leads (en ~3-5 años)

**Problema Actual:**
Con 1,417 leads, client-side filtering es aceptable. Con 8,000+ se volverá lento.

**Propuesta:**
- Implementar paginación real con `.range(from, to)`
- 100 leads por página
- Componente Pagination (Previous/Next)

**Esfuerzo:** 4-6 horas

[Ver detalles →](../mejoras-pendientes/pagination-server-side.md)

---

### **MEJORA #2: Analytics de Conversión** 🟡

**Propuesta:**
Dashboard de métricas:
- Tasa de conversión visita → compra (usando `asistio`)
- Leads por canal (n8n vs manual)
- Performance por vendedor
- Proyectos con más conversión

**Esfuerzo:** 8-10 horas

---

### **MEJORA #3: Notificaciones WhatsApp Automáticas** 🟡

**Propuesta:**
Notificar vendedor cuando:
- Lead cambia a `lead_completo`
- Lead marca `asistio = true` (visitó proyecto)
- Lead sin contactar por 48h

**Requiere:** Configuración adicional en n8n

**Esfuerzo:** 4-6 horas

---

## 📚 Referencias

### **Documentación Completa:**
- [Sesiones de Octubre 2025](../sesiones/2025-10-octubre.md) - Sesiones 24, 25, 31
- [Sesiones de Noviembre 2025](../sesiones/2025-11-noviembre.md) - Sesiones 33, 33B, 33C, 41, 41B

### **Mejoras Pendientes:**
- Paginación server-side (futuro)
- Analytics de conversión
- Notificaciones automáticas

### **Arquitectura:**
- [Stack Tecnológico](../arquitectura/stack-tecnologico.md#leads)
- [Decisiones Técnicas](../arquitectura/decisiones-tecnicas.md#leads)

---

**Última Actualización:** 10 Noviembre 2025 (Sesión 41B)
**Estado:** OPERATIVO ✅
**Total Leads:** 1,417

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
