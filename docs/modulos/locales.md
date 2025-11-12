# 🏢 MÓDULO DE LOCALES

## 📋 Índice
- [Estado Actual](#-estado-actual)
- [Sesiones Relacionadas](#-sesiones-relacionadas)
- [Sistema de Semáforo](#-sistema-de-semáforo)
- [Funcionalidades](#-funcionalidades)
- [Código Relevante](#-código-relevante)
- [Referencias](#-referencias)

---

## 🔄 Estado Actual

**SISTEMA OPERATIVO** - Última actualización: Sesión 38 (5 Nov 2025)

### Métricas:
- **Total Locales:** 823
- **Estados:** 4 (verde, amarillo, naranja, rojo)
- **Real-Time:** Supabase Realtime activo ✅
- **CSV Import:** Funcional ✅
- **Monto de Venta:** Campo implementado ✅

---

## 📝 Sesiones Relacionadas

### **Sesión 26** (28-29 Oct) - Sistema Completo
**Implementado:** Sistema de gestión de locales comerciales
- Workflow de negociación (semáforo 4 estados)
- Real-time updates (Supabase WebSockets)
- CSV bulk import
- Audit trail (historial de cambios)
- Role-based access control

### **Sesión 27** (28-29 Oct) - Historial Usuario Fix
**Problema:** Historial mostraba "Usuario desconocido"
**Root Cause:** Trigger usaba `auth.uid()` (retornaba NULL en Server Actions)
**Solución:** Manual historial insertion en código

### **Sesión 30** (31 Oct) - Monto de Venta + 2 Nuevos Roles
**Features:**
- Campo `monto_venta` con inline editing
- Roles: `jefe_ventas` y `vendedor_caseta`
- CSV import con estado opcional
- Display en dólares ($)

### **Sesión 38** (5 Nov) - Modal Vinculación + Spec Asistió
**UX Mejoras:** Modal de vinculación lead↔local mejorado
**Spec:** Columna "Asistió" para tracking de visitas físicas

---

## 🚦 Sistema de Semáforo

### **Estados del Local:**

**1. 🟢 Verde (verde)** - Disponible/Libre
- Sin asignar o liberado
- Cualquier vendedor puede iniciar negociación

**2. 🟡 Amarillo (amarillo)** - Negociación en Proceso
- Vendedor inició negociación con cliente
- Local reservado temporalmente
- Vendedor asignado visible

**3. 🟠 Naranja (naranja)** - Cliente Confirmó Interés
- Cliente confirma que tomará el local
- Negociación avanzada
- **Vendedor puede establecer monto de venta** (inline editing)

**4. 🔴 Rojo (rojo)** - VENDIDO (Locked)
- Venta cerrada y confirmada
- Solo Admin y Jefe Ventas pueden desbloquear

### **Transiciones Permitidas:**

```
Verde → Amarillo (Vendedor inicia negociación)
Amarillo → Naranja (Cliente confirma interés)
Naranja → Rojo (Vendedor cierra venta)
Amarillo/Naranja → Verde (Vendedor libera si negociación falla)
Rojo → Verde (Solo Admin/Jefe Ventas - desbloquear)
```

---

## ⚙️ Funcionalidades

### **1. Real-Time Updates**
```typescript
const channel = supabase.channel('locales-realtime')
channel
  .on('postgres_changes', { event: 'INSERT', table: 'locales' }, handleInsert)
  .on('postgres_changes', { event: 'UPDATE', table: 'locales' }, handleUpdate)
  .subscribe()
```

### **2. Inline Editing de Monto**
- Click para editar (estado naranja)
- Input number con validation
- Enter/Blur para guardar
- Display: `$ 25,000.50` (formato dólares)

### **3. CSV Bulk Import**
```csv
proyecto,codigo,metraje,estado
Galilea,L-001,25.5,verde
Galilea,L-002,30.0,rojo
```

### **4. Historial Completo**
- Slide-in panel
- Audit trail de cambios de estado
- Usuario que realizó acción
- Timestamps
- Registro de montos establecidos/modificados

### **5. Permisos por Rol**

| Rol              | Cambiar Estado | Establecer Monto | Bloquear (Rojo) |
|------------------|----------------|------------------|-----------------|
| admin            | ❌ (modal)     | ❌               | ✅              |
| jefe_ventas      | ❌ (modal)     | ❌               | ✅              |
| vendedor         | ✅             | ✅ (naranja)     | ❌              |
| vendedor_caseta  | ✅             | ✅ (naranja)     | ❌              |

---

## 💻 Código Relevante

### **Archivos Principales:**

**1. app/locales/page.tsx** - Route principal
**2. components/locales/LocalesClient.tsx** (337 líneas)
- Supabase Realtime subscription
- Estado global de locales

**3. components/locales/LocalesTable.tsx** (554 líneas)
- Tabla con paginación (100 items/page)
- Search, filtros, inline editing monto
- Estado change buttons

**4. components/locales/LocalImportModal.tsx** (343 líneas)
- CSV/Excel import con PapaParse
- Preview de primeras 5 filas
- Validación de columnas

**5. lib/locales.ts** (455 líneas)
- Query functions
- updateLocalEstadoQuery()
- updateMontoVentaQuery()
- importLocalesQuery()

**6. lib/actions-locales.ts** (131 líneas)
- Server Actions
- updateLocalEstado()
- desbloquearLocal()
- importLocales()

### **Base de Datos:**

**Tablas:**
- `locales` (id, proyecto, codigo, metraje, estado, monto_venta, vendedor_id)
- `locales_historial` (id, local_id, usuario_id, estado_anterior, estado_nuevo, accion)

**Índices:**
```sql
CREATE INDEX idx_locales_proyecto ON locales(proyecto);
CREATE INDEX idx_locales_estado ON locales(estado);
CREATE INDEX idx_locales_vendedor ON locales(vendedor_id);
```

---

## 📚 Referencias

- [Sesiones de Octubre 2025](../sesiones/2025-10-octubre.md#sesion-26) - Implementación completa
- [Sesiones de Noviembre 2025](../sesiones/2025-11-noviembre.md#sesion-38) - UX mejoras
- SQL: `consultas-leo/SQL_CREATE_LOCALES_TABLES.sql`

---

**Última Actualización:** 5 Noviembre 2025 (Sesión 38)
**Estado:** OPERATIVO ✅
**Total Locales:** 823

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
