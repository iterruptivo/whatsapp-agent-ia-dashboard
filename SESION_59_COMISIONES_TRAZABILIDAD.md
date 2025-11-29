# 📋 SESIÓN 59 - Sistema de Comisiones: Trazabilidad + Fix Limpieza Datos

**Fecha:** 29 Noviembre 2025
**Tipo:** Bug Fix + Mejora de Trazabilidad
**Estado:** ⏳ **PENDING QA TESTING**

---

## 🎯 OBJETIVOS DE LA SESIÓN

1. ✅ **Implementar dual-tab view en /comisiones** (admin y jefe_ventas)
2. ✅ **Agregar trazabilidad completa en modal SplitComisionesModal**
3. ✅ **Fix: Limpiar campos de trazabilidad al resetear locales a VERDE**

---

## 📊 PARTE 1: DUAL-TAB VIEW EN /COMISIONES

### **Problema**
Admin y jefe_ventas necesitaban:
- **Tab "Mis Comisiones"**: Ver solo sus comisiones personales
- **Tab "Control Comisiones"**: Ver TODAS las comisiones de todos los vendedores

### **Solución Implementada**

#### **1. Backend: Nuevas Server Actions**

**Archivo:** `lib/actions-comisiones.ts`

**Nueva función: `getAllComisiones()`** (líneas 108-167)
```typescript
export async function getAllComisiones(): Promise<Comision[]> {
  // Validar que usuario sea admin o jefe_ventas
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (!usuario || !['admin', 'jefe_ventas'].includes(usuario.rol)) {
    return [];
  }

  // Fetch TODAS las comisiones (sin filtro por usuario_id)
  const { data: comisiones, error } = await supabase
    .from('comisiones')
    .select('*')
    .order('fecha_procesado', { ascending: false });

  // Fetch locales, usuarios, proyectos (JOINs manuales)
  // ...mapear y retornar
}
```

**Nueva función: `getAllComisionStats()`** (líneas 225-331)
```typescript
export async function getAllComisionStats(): Promise<ComisionStats> {
  // Validación RBAC (solo admin/jefe_ventas)

  // Fetch TODAS las comisiones
  const { data: comisiones } = await supabase
    .from('comisiones')
    .select('*');

  // Calcular stats consolidados
  return {
    total_generado: sum(monto_comision),
    disponible: sum(where estado = 'disponible'),
    pagado: sum(where estado = 'pagada'),
    pendiente_inicial: sum(where estado = 'pendiente_inicial'),
    count_total: comisiones.length,
    // ...
  };
}
```

#### **2. Frontend: Tabs + Lógica Condicional**

**Archivo:** `app/comisiones/page.tsx`

**State para tabs:**
```typescript
const [activeTab, setActiveTab] = useState<'mis' | 'control'>('mis');
const [comisiones, setComisiones] = useState<Comision[]>([]); // Mis comisiones
const [stats, setStats] = useState<ComisionStats>({ ... }); // Mis stats
const [allComisiones, setAllComisiones] = useState<Comision[]>([]); // TODAS
const [allStats, setAllStats] = useState<ComisionStats>({ ... }); // Stats globales
```

**fetchData() actualizada:**
```typescript
const fetchData = async () => {
  // SIEMPRE fetch comisiones propias
  const userComisiones = await getComisionesByUsuario(user.id);
  const userStats = await getComisionStats(user.id);

  setComisiones(userComisiones);
  setStats(userStats);

  // Admin/Jefe: TAMBIÉN fetch todas las comisiones
  if (user.rol === 'admin' || user.rol === 'jefe_ventas') {
    const allCom = await getAllComisiones();
    const allSt = await getAllComisionStats();

    setAllComisiones(allCom);
    setAllStats(allSt);
  }
};
```

**UI Tabs:**
```tsx
{isAdminOrJefe && (
  <div className="flex gap-2 mb-6 border-b border-gray-200">
    <button onClick={() => setActiveTab('mis')} className={...}>
      Mis Comisiones
    </button>
    <button onClick={() => setActiveTab('control')} className={...}>
      Control Comisiones
    </button>
  </div>
)}
```

**Props condicionales:**
```tsx
{/* Stats Cards - cambiar según tab */}
<ComisionStatsCards
  stats={activeTab === 'control' && isAdminOrJefe ? allStats : stats}
/>

{/* Chart - Solo mostrar en "Mis Comisiones" */}
{!(activeTab === 'control' && isAdminOrJefe) && (
  <ComisionesChart stats={stats} />
)}

{/* Tabla - cambiar según tab */}
<ComisionesDesgloseMensual
  comisiones={activeTab === 'control' && isAdminOrJefe ? allComisiones : comisiones}
  showVendedorColumn={activeTab === 'control' && isAdminOrJefe}
  showVendedorFilter={activeTab === 'control' && isAdminOrJefe}
/>
```

---

## 🔍 PARTE 2: TRAZABILIDAD EN MODAL COMISIONES

### **Problema**
Modal `SplitComisionesModal` no mostraba quién participó en cada etapa del proceso de venta.

### **Solución: 4 Campos de Trazabilidad**

**Archivo:** `components/comisiones/SplitComisionesModal.tsx`

**UI Implementada (líneas 119-144):**
```tsx
{/* Trazabilidad */}
<div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
  <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
    <Users className="h-4 w-4" />
    Trazabilidad del Proceso
  </h3>
  <div className="grid grid-cols-2 gap-3 text-sm">
    <div>
      <span className="text-blue-700 font-medium">Lead asignado a:</span>
      <p className="text-blue-900">{comisiones[0].vendedor_asignado_nombre || '-'}</p>
    </div>
    <div>
      <span className="text-blue-700 font-medium">Confirmó local (🟠):</span>
      <p className="text-blue-900">{comisiones[0].usuario_naranja_nombre || '-'}</p>
    </div>
    <div>
      <span className="text-blue-700 font-medium">Bloqueó local (🔴):</span>
      <p className="text-blue-900">{comisiones[0].usuario_rojo_nombre || '-'}</p>
    </div>
    <div>
      <span className="text-blue-700 font-medium">Procesó venta:</span>
      <p className="text-blue-900">{comisiones[0].usuario_procesado_nombre || '-'}</p>
    </div>
  </div>
</div>
```

**Backend: getComisionesByLocalId()**

**Archivo:** `lib/actions-comisiones.ts` (líneas 365-446)

**Flujo:**
1. Fetch comisiones del local
2. Fetch datos trazabilidad del local (vendedor_actual_id, usuario_paso_naranja_id, usuario_paso_rojo_id)
3. Fetch control_pagos para obtener procesado_por
4. Fetch nombres de todos los usuarios involucrados
5. Mapear comisiones con nombres

**Interface ComisionConTrazabilidad:**
```typescript
export interface ComisionConTrazabilidad extends Comision {
  vendedor_asignado_nombre?: string;    // De locales.vendedor_actual_id
  usuario_naranja_nombre?: string;       // De locales.usuario_paso_naranja_id
  usuario_rojo_nombre?: string;          // De locales.usuario_paso_rojo_id
  usuario_procesado_nombre?: string;     // De control_pagos.procesado_por
}
```

**Mapeo final:**
```typescript
return comisiones.map((c: any) => ({
  ...c,
  usuario_nombre: usuariosMap.get(c.usuario_id),
  vendedor_asignado_nombre: local.vendedor_actual_id
    ? usuariosMap.get(local.vendedor_actual_id)
    : undefined,
  usuario_naranja_nombre: local.usuario_paso_naranja_id
    ? usuariosMap.get(local.usuario_paso_naranja_id)
    : undefined,
  usuario_rojo_nombre: local.usuario_paso_rojo_id
    ? usuariosMap.get(local.usuario_paso_rojo_id)
    : undefined,
  usuario_procesado_nombre: controlPago?.procesado_por
    ? usuariosMap.get(controlPago.procesado_por)
    : undefined,
}));
```

---

## 🐛 PARTE 3: FIX CRÍTICO - LIMPIEZA DE TRAZABILIDAD AL RESETEAR

### **Problema Encontrado**

Usuario reportó que al resetear local PRUEBA-14 de ROJO → VERDE, el modal seguía mostrando "-" para "Lead asignado a", indicando datos huérfanos.

**Investigación:**
1. SQL reveló que `vendedor_actual_id = '9d367391-e382-4314-bdc7-e5f882f6549d'`
2. Usuario con ese UUID NO existe en tabla usuarios → fue eliminado
3. Al hacer LEFT JOIN, retorna NULL → modal muestra "-"

**Root Cause:**
Cuando local vuelve a VERDE, **NO se estaban limpiando los campos de trazabilidad** (vendedor_actual_id, usuario_paso_naranja_id, usuario_paso_rojo_id).

### **Solución Implementada**

#### **3 Funciones Corregidas**

---

#### **1. lib/locales.ts - updateLocalEstadoQuery()**

**Líneas modificadas:** 425-430

**ANTES:**
```typescript
if (nuevoEstado === 'verde') {
  updateData.bloqueado = false;
  updateData.vendedor_cerro_venta_id = null;
  updateData.fecha_cierre_venta = null;
  updateData.monto_separacion = null;
  updateData.monto_venta = null;
  updateData.naranja_timestamp = null;
  updateData.naranja_vendedor_id = null;
}
```

**DESPUÉS:**
```typescript
if (nuevoEstado === 'verde') {
  updateData.bloqueado = false;
  updateData.vendedor_cerro_venta_id = null;
  updateData.fecha_cierre_venta = null;
  updateData.monto_separacion = null;
  updateData.monto_venta = null;
  updateData.naranja_timestamp = null;
  updateData.naranja_vendedor_id = null;
  // SESIÓN 59: Limpiar campos de trazabilidad (sistema de comisiones)
  updateData.vendedor_actual_id = null;
  updateData.usuario_paso_naranja_id = null;
  updateData.usuario_paso_rojo_id = null;
  updateData.fecha_paso_naranja = null;
  updateData.fecha_paso_rojo = null;
}
```

**Uso:** Función llamada por:
- `updateLocalEstado()` (Server Action principal)
- `desbloquearLocal()` (Admin/Jefe resetea local bloqueado)

---

#### **2. lib/actions-locales.ts - autoLiberarLocalesExpirados()**

**Líneas modificadas:** 422-429

**Función:** Libera automáticamente locales en NARANJA que superaron 120 horas.

**ANTES:**
```typescript
.update({
  estado: 'verde',
  vendedor_actual_id: null,
  naranja_timestamp: null,
  naranja_vendedor_id: null,
  bloqueado: false,
  monto_venta: null,
})
```

**DESPUÉS:**
```typescript
.update({
  estado: 'verde',
  vendedor_actual_id: null,
  naranja_timestamp: null,
  naranja_vendedor_id: null,
  bloqueado: false,
  monto_venta: null,
  monto_separacion: null, // SESIÓN 59
  // SESIÓN 59: Limpiar campos de trazabilidad (sistema de comisiones)
  usuario_paso_naranja_id: null,
  usuario_paso_rojo_id: null,
  fecha_paso_naranja: null,
  fecha_paso_rojo: null,
  vendedor_cerro_venta_id: null,
  fecha_cierre_venta: null,
})
```

---

#### **3. lib/actions-locales.ts - salirDeNegociacion()**

**Líneas modificadas:** 784-806

**Función:** Vendedor sale de local en AMARILLO. Si es el último vendedor, local vuelve a VERDE.

**ANTES:**
```typescript
const { error: updateError } = await supabase
  .from('locales')
  .update({
    estado: nuevoEstado,
    vendedores_negociando_ids: vendedoresNuevos,
    ...(nuevoEstado === 'verde' && { vendedor_actual_id: null }),
  })
  .eq('id', localId);
```

**DESPUÉS:**
```typescript
const updateData: any = {
  estado: nuevoEstado,
  vendedores_negociando_ids: vendedoresNuevos,
};

// SESIÓN 59: Si vuelve a VERDE, limpiar TODOS los campos de trazabilidad
if (nuevoEstado === 'verde') {
  updateData.vendedor_actual_id = null;
  updateData.usuario_paso_naranja_id = null;
  updateData.usuario_paso_rojo_id = null;
  updateData.fecha_paso_naranja = null;
  updateData.fecha_paso_rojo = null;
  updateData.vendedor_cerro_venta_id = null;
  updateData.fecha_cierre_venta = null;
  updateData.monto_separacion = null;
  updateData.monto_venta = null;
  updateData.naranja_timestamp = null;
  updateData.naranja_vendedor_id = null;
  updateData.bloqueado = false;
}

const { error: updateError } = await supabase
  .from('locales')
  .update(updateData)
  .eq('id', localId);
```

---

### **Campos Limpiados en las 3 Funciones**

| Campo | Descripción | ¿Se limpia ahora? |
|-------|-------------|-------------------|
| `vendedor_actual_id` | Vendedor asignado (base comisión) | ✅ SÍ |
| `usuario_paso_naranja_id` | Usuario que confirmó local (🟠) | ✅ SÍ |
| `usuario_paso_rojo_id` | Usuario que bloqueó local (🔴) | ✅ SÍ |
| `fecha_paso_naranja` | Timestamp confirmación | ✅ SÍ |
| `fecha_paso_rojo` | Timestamp bloqueo | ✅ SÍ |
| `vendedor_cerro_venta_id` | Vendedor que cerró venta | ✅ SÍ |
| `fecha_cierre_venta` | Timestamp cierre | ✅ SÍ |
| `monto_separacion` | Monto separación USD | ✅ SÍ |
| `monto_venta` | Monto venta USD | ✅ SÍ |
| `naranja_timestamp` | Timer 120h | ✅ SÍ |
| `naranja_vendedor_id` | Vendedor exclusivo NARANJA | ✅ SÍ |
| `bloqueado` | Flag bloqueo | ✅ SÍ |

---

## 📁 ARCHIVOS MODIFICADOS

### **Backend**
- ✅ `lib/actions-comisiones.ts` (+146 líneas)
  - Nueva función: `getAllComisiones()`
  - Nueva función: `getAllComisionStats()`
  - Nueva función: `getComisionesByLocalId()`
  - Nueva interface: `ComisionConTrazabilidad`

- ✅ `lib/locales.ts` (+5 líneas)
  - Fix: `updateLocalEstadoQuery()` limpia trazabilidad

- ✅ `lib/actions-locales.ts` (+29 líneas)
  - Fix: `autoLiberarLocalesExpirados()` limpia trazabilidad
  - Fix: `salirDeNegociacion()` limpia trazabilidad

### **Frontend**
- ✅ `app/comisiones/page.tsx` (+60 líneas)
  - State para dual-tab (`activeTab`, `allComisiones`, `allStats`)
  - `fetchData()` actualizado con lógica RBAC
  - UI tabs condicional (solo admin/jefe_ventas)
  - Props condicionales para componentes

- ✅ `components/comisiones/SplitComisionesModal.tsx` (+26 líneas)
  - Sección "Trazabilidad del Proceso" (4 campos)
  - Grid 2x2 con nombres de usuarios

---

## 🧪 TESTING PENDIENTE

### **Test 1: Dual-Tab View**
**Usuario:** Admin o jefe_ventas
**Pasos:**
1. Ir a `/comisiones`
2. Verificar que aparecen 2 tabs: "Mis Comisiones" | "Control Comisiones"
3. Click en "Mis Comisiones" → Ver solo comisiones propias
4. Click en "Control Comisiones" → Ver TODAS las comisiones
5. Verificar que stats cards cambian según tab
6. Verificar que chart solo aparece en "Mis Comisiones"
7. Verificar que columna "Vendedor" solo aparece en "Control Comisiones"

### **Test 2: Trazabilidad Modal**
**Usuario:** Cualquier usuario con comisiones
**Pasos:**
1. Ir a `/comisiones`
2. Click en "Ver desglose" de cualquier local
3. Verificar sección "Trazabilidad del Proceso" azul claro
4. Verificar 4 campos:
   - Lead asignado a
   - Confirmó local (🟠)
   - Bloqueó local (🔴)
   - Procesó venta
5. Verificar que nombres aparecen correctamente (no "-" si usuario existe)

### **Test 3: Limpieza de Trazabilidad (CRÍTICO)**
**Usuario:** Admin o jefe_ventas
**Escenario:** Local PRUEBA-14 actualmente tiene datos huérfanos

**Pasos:**
1. **Verificar estado actual:**
   ```sql
   SELECT
     codigo,
     estado,
     vendedor_actual_id,
     usuario_paso_naranja_id,
     usuario_paso_rojo_id,
     fecha_paso_naranja,
     fecha_paso_rojo,
     monto_separacion,
     monto_venta
   FROM locales
   WHERE codigo = 'PRUEBA-14';
   ```
   **Esperado:** Campos con valores antiguos

2. **Resetear local a VERDE:**
   - Opción A: Desde UI `/locales`, click "Desbloquear" (si está bloqueado)
   - Opción B: Desde SQL:
     ```sql
     -- Simular desbloqueo manual llamando función
     -- (O usar botón UI si existe)
     ```

3. **Verificar limpieza en BD:**
   ```sql
   SELECT
     codigo,
     estado,
     vendedor_actual_id,
     usuario_paso_naranja_id,
     usuario_paso_rojo_id,
     fecha_paso_naranja,
     fecha_paso_rojo,
     monto_separacion,
     monto_venta,
     naranja_timestamp,
     naranja_vendedor_id,
     bloqueado
   FROM locales
   WHERE codigo = 'PRUEBA-14';
   ```
   **Esperado:**
   - `estado = 'verde'`
   - `vendedor_actual_id = NULL`
   - `usuario_paso_naranja_id = NULL`
   - `usuario_paso_rojo_id = NULL`
   - `fecha_paso_naranja = NULL`
   - `fecha_paso_rojo = NULL`
   - `monto_separacion = NULL`
   - `monto_venta = NULL`
   - `naranja_timestamp = NULL`
   - `naranja_vendedor_id = NULL`
   - `bloqueado = false`

4. **Volver a procesar local PRUEBA-14:**
   - Verde → Amarillo → Naranja → Rojo
   - Completar registro de venta
   - Ir a `/comisiones`
   - Abrir modal "Ver desglose" de PRUEBA-14
   - Verificar que trazabilidad muestra nombres correctos (NO "-")

---

## 🚨 CASOS EDGE

### **Caso 1: Usuario Eliminado**
**Problema:** Si usuario fue eliminado DESPUÉS de crear comisión, modal mostrará "-"
**Solución actual:** Mostramos "-" (aceptable para datos históricos)
**Mejora futura:** Mostrar "Usuario eliminado" en vez de "-"

### **Caso 2: Vendedor en múltiples fases**
**Problema:** Mismo vendedor puede estar en vendedor_asignado Y usuario_naranja
**Solución actual:** Modal muestra nombre en ambos campos (correcto)

### **Caso 3: Local sin comisiones**
**Problema:** Local en VERDE/AMARILLO sin comisiones generadas
**Solución actual:** Modal no se puede abrir (no hay botón "Ver desglose")

---

## 📝 NOTAS IMPORTANTES

### **Patrón de Limpieza VERDE**

Cuando un local vuelve a VERDE (desde cualquier estado), **SIEMPRE** debe limpiar:

1. **Campos de negociación:**
   - `monto_separacion`
   - `monto_venta`
   - `bloqueado`

2. **Campos de timer NARANJA:**
   - `naranja_timestamp`
   - `naranja_vendedor_id`

3. **Campos de trazabilidad (NUEVO en Sesión 59):**
   - `vendedor_actual_id`
   - `usuario_paso_naranja_id`
   - `usuario_paso_rojo_id`
   - `fecha_paso_naranja`
   - `fecha_paso_rojo`
   - `vendedor_cerro_venta_id`
   - `fecha_cierre_venta`

**Razón:** Local VERDE = disponible para nueva negociación = datos limpios

### **Snapshot en control_pagos**

Cuando local pasa a control de pagos:
- Se crea snapshot INMUTABLE en tabla `control_pagos`
- Incluye: `lead_id`, `lead_nombre`, `lead_telefono`, `procesado_por`, etc.
- Modal lee de `control_pagos.procesado_por` (NO de `locales.usuario_paso_rojo_id`)

### **Comisiones y Trazabilidad**

Tabla `comisiones` NO almacena trazabilidad directamente:
- Modal hace JOIN con `locales` para obtener `vendedor_actual_id`, `usuario_paso_naranja_id`, `usuario_paso_rojo_id`
- JOIN con `control_pagos` para obtener `procesado_por`
- JOIN con `usuarios` para mapear UUIDs → nombres

---

## 🔄 PRÓXIMOS PASOS (Post-Testing)

### **1. Si testing pasa ✅**
- Commit con mensaje detallado
- Push a `staging`
- Deploy a producción
- Actualizar CLAUDE.md con Sesión 59

### **2. Si testing falla ❌**
- Investigar logs de Supabase
- Verificar que RLS policies permiten UPDATE de campos de trazabilidad
- Verificar que funciones se están llamando correctamente desde UI

### **3. Mejoras futuras**
- [ ] Mostrar "Usuario eliminado" en vez de "-" en modal
- [ ] Agregar tooltip en trazabilidad explicando cada rol
- [ ] Exportar PDF con trazabilidad completa
- [ ] Dashboard de comisiones con filtros avanzados

---

## 📊 MÉTRICAS DE LA SESIÓN

- **Líneas agregadas:** ~266 líneas
- **Archivos modificados:** 5 archivos
- **Funciones nuevas:** 3 (getAllComisiones, getAllComisionStats, getComisionesByLocalId)
- **Funciones corregidas:** 3 (updateLocalEstadoQuery, autoLiberarLocalesExpirados, salirDeNegociacion)
- **Bugs resueltos:** 1 crítico (datos huérfanos en trazabilidad)
- **Features agregadas:** 2 (dual-tab view, trazabilidad modal)

---

## 🤝 CONCLUSIÓN

Sesión exitosa implementando sistema de trazabilidad completo para comisiones + fix crítico de limpieza de datos.

**Listo para testing cuando estés disponible.** 🚀

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**

**Co-Authored-By:** Claude Code Assistant
