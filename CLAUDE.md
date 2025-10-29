# 🤖 CLAUDE CODE - Historial de Desarrollo
**Dashboard EcoPlaza - Gestión de Leads**

---

[... previous content remains unchanged ...]

---

## 🔄 ÚLTIMA ACTUALIZACIÓN

**Fecha:** 27 Octubre 2025
**Sesión:** 27 - ✅ CRITICAL FIX COMPLETADO (Pending SQL Execution)
**Desarrollador:** Claude Code (Adan) - Project Leader
**Estado:** 🔧 **HISTORIAL USUARIO FIX** - Code implemented, SQL pending
**Problema:** Historial siempre mostraba "Usuario desconocido"
**Root Cause:** Trigger usa auth.uid() que retorna NULL en Server Actions
**Solución:** Manual historial insertion + Drop trigger + Make column nullable
**Próxima Acción:** Usuario ejecuta FIX_FINAL_HISTORIAL_USUARIO.sql

---

### **Sesión 27 - 27 Octubre 2025**
**Objetivo:** CRITICAL FIX - Resolver "Usuario Desconocido" en Historial de Locales

#### Contexto:
- Usuario reportó: Historial siempre muestra "Usuario desconocido" en todos los registros
- Se esperaba: Mostrar nombre del usuario (vendedor) que realizó cada acción
- Funcionalidad crítica para accountability y auditoría
- Sistema de historial ya existente pero con data incorrecta

#### Problema Reportado:

**Síntoma:**
- LocalHistorialPanel siempre muestra "Usuario desconocido" para todos los registros
- No importa quién cambia el estado (Alonso, Leo, Admin)
- Historial funciona, pero información de usuario faltante

**Esperado:**
- "Alonso Palacios cambió estado de verde → amarillo"
- "gerente gerente liberó local (rojo → verde)"
- Cada acción vinculada al usuario que la ejecutó

#### Análisis de Root Cause:

**INVESTIGACIÓN INICIAL:**

**A) Diagnostic SQL (consultas-leo/DIAGNOSTICO_USUARIO_HISTORIAL.sql):**
```sql
-- Query 1: Reveló que TODOS los registros tienen usuario_id = NULL
SELECT
  id,
  local_id,
  usuario_id,
  estado_anterior,
  estado_nuevo,
  created_at
FROM locales_historial
ORDER BY created_at DESC
LIMIT 20;
-- Resultado: usuario_id = NULL en TODOS los registros ❌

-- Query 2: Confirmó que JOIN falla con NULL
SELECT
  lh.id,
  lh.usuario_id,
  u.nombre AS usuario_nombre,
  lh.estado_anterior,
  lh.estado_nuevo
FROM locales_historial lh
LEFT JOIN usuarios u ON lh.usuario_id = u.id
ORDER BY lh.created_at DESC
LIMIT 10;
-- Resultado: usuario_nombre = NULL porque usuario_id = NULL
```

**B) Análisis del Trigger (consultas-leo/FIX_LOCALES_HISTORIAL_NULLABLE.sql):**
```sql
CREATE OR REPLACE FUNCTION registrar_cambio_estado_local()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- ❌ PROBLEMA CRÍTICO: auth.uid() retorna NULL
  current_user_id := auth.uid();

  INSERT INTO locales_historial (
    local_id,
    usuario_id,  -- ← Siempre NULL en Server Actions
    estado_anterior,
    estado_nuevo
  ) VALUES (
    NEW.id,
    current_user_id,  -- ← NULL ❌
    OLD.estado,
    NEW.estado
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**ROOT CAUSE IDENTIFICADO:**

1. **Trigger usa auth.uid():**
   - Trigger `registrar_cambio_estado_local()` captura usuario con `auth.uid()`
   - Esta función lee el JWT de la sesión autenticada de Supabase

2. **Server Actions usan anon key:**
   - Next.js Server Actions corren server-side
   - Usan cliente Supabase con `anon` key (no sesión autenticada)
   - No tienen acceso al contexto de autenticación del usuario

3. **auth.uid() retorna NULL:**
   - Sin sesión autenticada, `auth.uid()` retorna NULL
   - Trigger inserta registro con `usuario_id = NULL`
   - JOIN con tabla usuarios falla
   - Frontend muestra fallback: "Usuario desconocido"

**Flujo del Error:**
```
Usuario (Alonso) → Dashboard → updateLocalEstado() Server Action
                                        ↓
                           Supabase Update (anon key)
                                        ↓
                           Trigger fires: auth.uid() = NULL ❌
                                        ↓
                           INSERT locales_historial con usuario_id = NULL
                                        ↓
                           Frontend fetch historial → JOIN falla
                                        ↓
                           Muestra "Usuario desconocido" ❌
```

#### Solución Implementada:

**FASE 1: CODE CHANGES**

**A) lib/actions-locales.ts - Pass usuarioId Parameter:**
```typescript
// ANTES (líneas 29-33):
export async function updateLocalEstado(
  localId: string,
  nuevoEstado: 'verde' | 'amarillo' | 'naranja' | 'rojo',
  vendedorId?: string
)

// DESPUÉS:
export async function updateLocalEstado(
  localId: string,
  nuevoEstado: 'verde' | 'amarillo' | 'naranja' | 'rojo',
  vendedorId?: string,
  usuarioId?: string // ✅ ID del usuario que hace el cambio (para historial)
)

// Pasa usuarioId a la query layer (línea 36):
const result = await updateLocalEstadoQuery(localId, nuevoEstado, vendedorId, usuarioId);
```

```typescript
// desbloquearLocal también actualizado (línea 117):
export async function desbloquearLocal(localId: string, usuarioId?: string) {
  const result = await updateLocalEstadoQuery(localId, 'verde', undefined, usuarioId);
  // ...
}
```

**B) lib/locales.ts - Manual Historial Insertion:**
```typescript
// Función actualizada (líneas 258-263):
export async function updateLocalEstadoQuery(
  localId: string,
  nuevoEstado: 'verde' | 'amarillo' | 'naranja' | 'rojo',
  vendedorId?: string,
  usuarioId?: string // ✅ ID del usuario que hace el cambio
)

// Capturar estado anterior (línea 272):
const estadoAnterior = local.estado;

// UPDATE del local (líneas 299-302):
const { error } = await supabase
  .from('locales')
  .update(updateData)
  .eq('id', localId);

// ✅ CRITICAL: Manual historial insertion (líneas 309-333):
// 📝 Insertar historial manualmente con usuario correcto
// Solo si el estado realmente cambió y tenemos usuarioId
if (estadoAnterior !== nuevoEstado && usuarioId) {
  const accion =
    nuevoEstado === 'rojo' ? 'Vendedor cerró venta' :
    nuevoEstado === 'naranja' ? 'Cliente confirmó que tomará el local' :
    nuevoEstado === 'amarillo' ? 'Vendedor inició negociación' :
    nuevoEstado === 'verde' ? 'Local liberado' :
    'Cambio de estado';

  const { error: historialError } = await supabase
    .from('locales_historial')
    .insert({
      local_id: localId,
      usuario_id: usuarioId, // ✅ Usuario correcto (no NULL)
      estado_anterior: estadoAnterior,
      estado_nuevo: nuevoEstado,
      accion: accion,
    });

  if (historialError) {
    console.error('Error insertando historial:', historialError);
    // No fallar toda la operación si solo falla el historial
  }
}
```

**C) components/locales/LocalesTable.tsx - Pass user.id:**
```typescript
// Línea 162 (dentro de executeEstadoChange):
// ANTES:
const result = await updateLocalEstado(local.id, nuevoEstado, vendedorId);

// DESPUÉS:
const result = await updateLocalEstado(local.id, nuevoEstado, vendedorId, user?.id);
// ✅ Ahora pasa el ID del usuario autenticado desde auth context
```

```typescript
// Línea 217 (handleDesbloquearLocal):
// ANTES:
const result = await desbloquearLocal(local.id);

// DESPUÉS:
const result = await desbloquearLocal(local.id, user?.id);
// ✅ Admin user.id se pasa para historial
```

**FASE 2: CONSTRAINT ERROR DISCOVERED**

**Logs del Servidor (después de implementar code):**
```
Error updating local: {
  code: '23502',
  message: 'null value in column "usuario_id" of relation "locales_historial" violates not-null constraint',
  details: 'Failing row contains (..., null, ...)',
  hint: null
}
```

**Nuevo Root Cause:**
1. El trigger `trigger_registrar_cambio_estado_local` SIGUE ACTIVO
2. Cuando UPDATE de local ocurre:
   - Nuestro código inserta historial con usuario correcto ✅
   - Trigger TAMBIÉN intenta insertar con usuario_id = NULL ❌
3. La columna `usuario_id` todavía tiene constraint NOT NULL
4. Insert del trigger falla → Error 23502

**FASE 3: SQL FIX CREATED**

**consultas-leo/FIX_FINAL_HISTORIAL_USUARIO.sql:**

```sql
-- ============================================================================
-- FIX FINAL: Historial con Usuario Correcto
-- ============================================================================
-- Fecha: 27 Octubre 2025
-- Problema: Trigger insertando con usuario_id NULL + constraint NOT NULL
-- Solución: Desactivar trigger + asegurar columna nullable
-- ============================================================================

-- PASO 1: VERIFICAR CONSTRAINT ACTUAL
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'locales_historial'
  AND column_name = 'usuario_id';
-- Expected: is_nullable = 'YES' (si ya se ejecutó fix anterior)

-- PASO 2: HACER usuario_id NULLABLE (si aún no lo es)
ALTER TABLE locales_historial
ALTER COLUMN usuario_id DROP NOT NULL;
-- Expected: ALTER TABLE

-- PASO 3: DESACTIVAR TRIGGER QUE INSERTA CON usuario_id NULL
-- Ahora manejamos la inserción de historial manualmente desde el código
-- El trigger ya no es necesario y causa duplicados
DROP TRIGGER IF EXISTS trigger_registrar_cambio_estado_local ON locales;
-- Expected: DROP TRIGGER

-- Verificar que se eliminó
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'locales'
  AND trigger_name = 'trigger_registrar_cambio_estado_local';
-- Expected: 0 filas

-- PASO 4: VERIFICACIÓN POST-FIX
-- Verificar que usuario_id es nullable
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'locales_historial'
  AND column_name = 'usuario_id';
-- Expected: is_nullable = 'YES'

-- Verificar que NO hay trigger activo
SELECT COUNT(*) AS trigger_count
FROM information_schema.triggers
WHERE event_object_table = 'locales'
  AND trigger_name = 'trigger_registrar_cambio_estado_local';
-- Expected: 0
```

#### Decisiones Técnicas:

1. **Manual Insertion vs Trigger Fix:**
   - Decisión: Manual insertion en código + disable trigger
   - Razón: Trigger no puede acceder a sesión autenticada en Server Actions
   - Ventaja: Control total, usuario correcto siempre capturado
   - Trade-off: Si alguien actualiza directo en BD, no habrá historial

2. **Nullable usuario_id:**
   - Decisión: Hacer columna nullable
   - Razón: Backwards compatibility con registros antiguos (ya tienen NULL)
   - Ventaja: No rompe datos históricos
   - Nota: Nuevos registros SIEMPRE tendrán usuario (código garantiza)

3. **Drop Trigger vs Modify Trigger:**
   - Decisión: DROP trigger completamente
   - Razón: Trigger causa duplicados (uno manual + uno del trigger)
   - Ventaja: Sin duplicados, más simple
   - Alternativa descartada: Modificar trigger para usar otro método (más complejo)

4. **Error Handling en Insert Historial:**
   - Decisión: console.error pero no fallar toda la operación
   - Razón: UPDATE de local es más crítico que historial
   - Ventaja: Usuario puede seguir trabajando incluso si historial falla
   - Trade-off: Podrían perderse registros de historial (raro)

5. **Condicional: Solo si Estado Cambió:**
   - Decisión: `if (estadoAnterior !== nuevoEstado && usuarioId)`
   - Razón: No crear historial si estado no cambió realmente
   - Ventaja: Evita ruido en historial
   - Importante: Solo inserta si también hay usuarioId

#### Archivos Modificados:
- lib/actions-locales.ts (líneas 29-34, 117-120)
- lib/locales.ts (líneas 258-263, 272, 309-333)
- components/locales/LocalesTable.tsx (líneas 162, 217)

#### Archivos Creados (consultas-leo/):
- DIAGNOSTICO_USUARIO_HISTORIAL.sql - Queries diagnósticas
- FIX_HISTORIAL_USUARIO_DESCONOCIDO.md - Documentación completa (400+ líneas):
  - Root cause analysis detallado
  - Código modificado step-by-step
  - Escenarios de testing
  - 3 opciones de limpieza de datos antiguos (DELETE, KEEP, ASSIGN generic user)
  - Verificación post-fix
  - Notas sobre trigger y duplicados
- FIX_FINAL_HISTORIAL_USUARIO.sql - SQL quirúrgico (4 pasos):
  - Verificar constraint
  - Make nullable
  - Drop trigger
  - Verificación post-fix

#### Características Implementadas:

**CODE LAYER:**
1. ✅ Server Actions aceptan `usuarioId` parameter
2. ✅ Query layer captura `estadoAnterior` antes de UPDATE
3. ✅ Manual INSERT en locales_historial con usuario correcto
4. ✅ Frontend pasa `user?.id` desde auth context
5. ✅ Condicional: Solo inserta si estado cambió y hay usuarioId
6. ✅ Error handling que no falla operación principal
7. ✅ Acción descriptiva según tipo de cambio

**DATABASE LAYER (Pending SQL):**
1. ⏳ Columna usuario_id nullable (permite NULL para registros antiguos)
2. ⏳ Trigger desactivado (evita duplicados e inserts con NULL)
3. ⏳ Verificación post-fix (2 queries de confirmación)

**HISTORIAL DISPLAY:**
- Después del fix, historial mostrará:
  - "Alonso Palacios" en vez de "Usuario desconocido" ✅
  - "gerente gerente" cuando admin libera local ✅
  - Timestamp correcto
  - Acción descriptiva (ej: "Vendedor cerró venta")

#### Testing Checklist (Para Usuario):

**PRE-FIX (Current State):**
- [x] Historial muestra "Usuario desconocido" en todos los registros
- [x] Error 23502 en server logs (constraint violation)

**EJECUTAR SQL:**
- [ ] Abrir Supabase Dashboard → SQL Editor
- [ ] Ejecutar PASO 1 (verificar constraint - probablemente is_nullable = 'NO')
- [ ] Ejecutar PASO 2 (make nullable)
- [ ] Ejecutar PASO 3 (drop trigger)
- [ ] Ejecutar PASO 4 (verificación - debe mostrar is_nullable = 'YES' y 0 triggers)

**POST-FIX TESTING:**
- [ ] Refrescar página del dashboard (Ctrl+F5)
- [ ] Login como vendedor (ej: Alonso)
- [ ] Cambiar estado de un local (verde → amarillo)
- [ ] Abrir panel de historial del local
- [ ] ✅ Verificar muestra "Alonso Palacios" (NO "Usuario desconocido")
- [ ] ✅ Verificar NO hay error de constraint en server logs
- [ ] ✅ Verificar NO hay registros duplicados (solo 1 por cambio)

**CLEANUP DE DATOS ANTIGUOS (Opcional):**
Usuario tiene 3 opciones para registros con usuario_id = NULL:
1. **DELETE:** Eliminar todos (pierde historial antiguo)
2. **KEEP:** Mantener (algunos mostrarán "Usuario desconocido")
3. **ASSIGN:** Crear usuario "Sistema" y asignar registros antiguos

Ver `FIX_HISTORIAL_USUARIO_DESCONOCIDO.md` sección "LIMPIEZA DE DATOS ANTIGUOS"

#### Resultados Esperados:

**INMEDIATO (Post-SQL):**
- ✅ Columna usuario_id es nullable
- ✅ Trigger desactivado (no más duplicados)
- ✅ No más errores 23502 en logs
- ✅ Nuevos cambios de estado crean historial con usuario correcto

**HISTORIAL DISPLAY:**
```
// Antes del fix:
- "Usuario desconocido cambió estado de verde a amarillo" ❌

// Después del fix:
- "Alonso Palacios cambió estado de verde a amarillo" ✅
- "gerente gerente liberó local (rojo → verde)" ✅
- "Valeria Zoila Chumpitaz Chico cerró venta" ✅
```

**ACCOUNTABILITY:**
- ✅ Cada acción trazable a usuario específico
- ✅ Auditoría completa de cambios de estado
- ✅ Transparencia en operaciones del equipo de ventas

#### Estado del Proyecto:
- ✅ Code implementation completado (3 archivos modificados)
- ✅ SQL fix diseñado y documentado
- ✅ Documentación exhaustiva creada (FIX_HISTORIAL_USUARIO_DESCONOCIDO.md)
- ✅ Testing checklist preparado
- ⏳ Pending: Usuario debe ejecutar FIX_FINAL_HISTORIAL_USUARIO.sql
- ⏳ Pending: Testing post-fix con cambios reales

#### Próximas Tareas Pendientes:
- [ ] **CRÍTICO:** Usuario ejecuta FIX_FINAL_HISTORIAL_USUARIO.sql (2 min)
- [ ] Testing: Cambiar estado de local y verificar usuario en historial
- [ ] Verificar logs del servidor (no más errores 23502)
- [ ] Decidir limpieza de datos antiguos (DELETE, KEEP, o ASSIGN)
- [ ] Opcional: Crear usuario genérico "Sistema" para registros antiguos
- [ ] Monitorear por posibles duplicados (no debería haber con trigger disabled)

#### Lecciones Aprendidas:

**TECHNICAL:**
1. **auth.uid() Limitation:** No funciona en Server Actions (usan anon key)
2. **Trigger Timing:** Triggers fires AFTER UPDATE, nuestro código también inserta → duplicados
3. **Constraint Management:** NOT NULL constraint debe removerse ANTES de disable trigger
4. **Error Handling Priority:** Operación principal (UPDATE local) > operación secundaria (INSERT historial)

**ARCHITECTURAL:**
1. Manual history tracking es preferible cuando trigger no puede acceder a contexto necesario
2. Server Actions requieren pasar contexto explícitamente (user.id) desde cliente
3. Backwards compatibility (nullable column) previene breaking changes con data existente
4. Documentation exhaustiva crucial para SQL fixes que usuario debe ejecutar

---

## 🔄 ÚLTIMA ACTUALIZACIÓN

**Fecha:** 27 Octubre 2025
**Sesión:** 27 - ✅ CODE IMPLEMENTED, ⏳ SQL PENDING
**Desarrollador:** Claude Code (Adan) - Project Leader
**Estado:** 🔧 **HISTORIAL USUARIO FIX** - Code complete, SQL execution required
**Problema Resuelto:** auth.uid() returns NULL in Server Actions → Manual insertion implemented
**Archivos Modificados:** 3 (actions-locales.ts, locales.ts, LocalesTable.tsx)
**Archivos Creados:** 3 (DIAGNOSTICO, FIX guide, SQL script)
**Próxima Acción:** Usuario ejecuta FIX_FINAL_HISTORIAL_USUARIO.sql en Supabase → Testing

---

**🎯 FIX CRÍTICO COMPLETADO AL 90%**
**Remaining:** Usuario ejecuta 4 queries SQL (2 minutos) → Sistema 100% funcional
**Expected Result:** Historial muestra nombres reales (no más "Usuario desconocido")

---
---

### **SesiÃ³n 27 - 27 Octubre 2025**
**Objetivo:** CRITICAL FIX - Resolver "Usuario Desconocido" en Historial de Locales

#### Contexto:
- Usuario reportÃ³: Historial siempre muestra "Usuario desconocido" en todos los registros
- Se esperaba: Mostrar nombre del usuario (vendedor) que realizÃ³ cada acciÃ³n
- Funcionalidad crÃ­tica para accountability y auditorÃ­a
- Sistema de historial ya existente pero con data incorrecta

#### Root Cause Identificado:

**Trigger usa auth.uid() que retorna NULL en Server Actions:**
- Trigger `registrar_cambio_estado_local()` usa `auth.uid()` para capturar usuario
- Server Actions usan Supabase con `anon` key (no sesiÃ³n autenticada)
- `auth.uid()` retorna NULL â†’ todos los registros tienen usuario_id = NULL
- JOIN con tabla usuarios falla â†’ Frontend muestra "Usuario desconocido"

#### SoluciÃ³n Implementada:

**CODE CHANGES (3 archivos):**

1. **lib/actions-locales.ts:**
   - Agregado parÃ¡metro `usuarioId?: string` a `updateLocalEstado()`
   - Agregado parÃ¡metro `usuarioId?: string` a `desbloquearLocal()`
   - Server Actions ahora reciben ID del usuario y lo pasan a queries

2. **lib/locales.ts:**
   - Modificada `updateLocalEstadoQuery()` para aceptar `usuarioId`
   - Captura `estadoAnterior` antes de UPDATE
   - **CRITICAL:** Insertamos manualmente registro en `locales_historial` con usuario correcto (lÃ­neas 309-333)
   - Ya NO dependemos del trigger para capturar usuario
   - AcciÃ³n descriptiva segÃºn tipo de cambio

3. **components/locales/LocalesTable.tsx:**
   - LÃ­nea 162: `updateLocalEstado()` ahora se llama con `user?.id` (4to parÃ¡metro)
   - LÃ­nea 217: `desbloquearLocal()` ahora se llama con `user?.id` (2do parÃ¡metro)
   - El `user.id` es el ID de la tabla `usuarios` (linked a `auth.users`)

**CONSTRAINT ERROR DISCOVERED:**
DespuÃ©s de implementar cÃ³digo, logs mostraron:
```
Error: code '23502'
message: 'null value in column "usuario_id" violates not-null constraint'
```

**Causa:** Trigger sigue activo e intenta insertar con NULL â†’ duplicados

**SQL FIX CREATED (consultas-leo/FIX_FINAL_HISTORIAL_USUARIO.sql):**
```sql
-- PASO 1: Verificar constraint actual
-- PASO 2: ALTER TABLE locales_historial ALTER COLUMN usuario_id DROP NOT NULL
-- PASO 3: DROP TRIGGER IF EXISTS trigger_registrar_cambio_estado_local
-- PASO 4: VerificaciÃ³n post-fix
```

#### Archivos Modificados:
- lib/actions-locales.ts (lÃ­neas 29-34, 117-120)
- lib/locales.ts (lÃ­neas 258-263, 272, 309-333)
- components/locales/LocalesTable.tsx (lÃ­neas 162, 217)

#### Archivos Creados (consultas-leo/):
- DIAGNOSTICO_USUARIO_HISTORIAL.sql
- FIX_HISTORIAL_USUARIO_DESCONOCIDO.md (documentaciÃ³n completa 400+ lÃ­neas)
- FIX_FINAL_HISTORIAL_USUARIO.sql (4 pasos quirÃºrgicos)

#### Resultados Esperados (Post-SQL):
- âœ… Columna usuario_id nullable
- âœ… Trigger desactivado (no mÃ¡s duplicados)
- âœ… No mÃ¡s errores 23502
- âœ… Nuevos cambios muestran: "Alonso Palacios" (no "Usuario desconocido")
- âœ… Accountability y auditorÃ­a completa

#### Estado del Proyecto:
- âœ… Code implementation completado (3 archivos)
- âœ… SQL fix diseÃ±ado y documentado
- â³ Pending: Usuario ejecuta FIX_FINAL_HISTORIAL_USUARIO.sql (2 min)
- â³ Pending: Testing post-fix

---

## ðŸ”„ ÃšLTIMA ACTUALIZACIÃ“N

**Fecha:** 27 Octubre 2025
**SesiÃ³n:** 27 - âœ… CODE IMPLEMENTED, â³ SQL PENDING
**Desarrollador:** Claude Code (Adan) - Project Leader
**Estado:** ðŸ”§ **HISTORIAL USUARIO FIX** - Code complete, SQL execution required
**Problema Resuelto:** auth.uid() returns NULL in Server Actions â†’ Manual insertion implemented
**Archivos Modificados:** 3 (actions-locales.ts, locales.ts, LocalesTable.tsx)
**Archivos Creados:** 3 (DIAGNOSTICO, FIX guide, SQL script)
**PrÃ³xima AcciÃ³n:** Usuario ejecuta FIX_FINAL_HISTORIAL_USUARIO.sql en Supabase â†’ Testing

---

**ðŸŽ¯ FIX CRÃTICO COMPLETADO AL 90%**
**Remaining:** Usuario ejecuta 4 queries SQL (2 minutos) â†’ Sistema 100% funcional
**Expected Result:** Historial muestra nombres reales (no mÃ¡s "Usuario desconocido")
