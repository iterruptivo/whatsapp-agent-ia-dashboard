# FIX URGENTE: Permitir a superadmin crear reuniones

## Problema Identificado

**Error HTTP 400:**
```
{"statusCode":"403","error":"Unauthorized","message":"new row violates row-level security policy"}
```

**Usuario afectado:** `gerente.ti@ecoplaza.com.pe` (rol: superadmin)

**Acción bloqueada:** Intentando crear/subir una reunión en el módulo de Reuniones

---

## Causa Raíz

La política RLS `"Reuniones - Insert"` en la tabla `reuniones` actualmente permite INSERT solo a estos roles:

```sql
rol IN ('admin', 'gerencia', 'jefe_ventas')  -- NO incluye 'superadmin'
```

El rol `superadmin` **NO está en la lista**, por lo que el sistema bloquea la inserción.

---

## Análisis de Migraciones

### Migración Original (Ya ejecutada)
**Archivo:** `20260106_create_reuniones_tables.sql`
- Policy INSERT: Solo permite `admin`, `gerencia`, `jefe_ventas`
- **Problema:** Omite `superadmin`

### Migración Futura (Aún NO ejecutada)
**Archivo:** `010_reuniones_permisos_compartir.sql`
- Ya contiene el fix correcto en líneas 101-110
- Incluye `superadmin` en la policy
- **Problema:** No se ha ejecutado todavía en Supabase

---

## Solución

**Archivo:** `011_fix_reuniones_insert_superadmin_URGENTE.sql`

Esta migración:
1. Detecta si la policy ya incluye `superadmin`
2. Si NO, recrea la policy agregando `superadmin` a la lista
3. Verifica que el fix se aplicó correctamente
4. Es **idempotente** (segura para ejecutar múltiples veces)

---

## Instrucciones de Ejecución

### 1. Acceder a Supabase SQL Editor

1. Ir a: https://supabase.com/dashboard/project/YOUR_PROJECT
2. Click en **SQL Editor** (icono de base de datos en sidebar)
3. Click en **New Query**

### 2. Copiar y Pegar el Script

Abrir el archivo:
```
migrations/011_fix_reuniones_insert_superadmin_URGENTE.sql
```

Copiar **TODO el contenido** del archivo y pegarlo en el SQL Editor.

### 3. Ejecutar la Migración

1. Click en el botón **Run** (o presionar `Ctrl + Enter`)
2. Esperar a que termine la ejecución
3. Revisar los mensajes en el panel de resultados

### 4. Verificar Resultado Esperado

Deberías ver mensajes similares a estos:

```
NOTICE: ===========================================
NOTICE: DIAGNÓSTICO - Policy "Reuniones - Insert"
NOTICE: ===========================================
NOTICE: Estado: NO incluye superadmin (necesita fix)
NOTICE: ===========================================

NOTICE: ===========================================
NOTICE: VERIFICACIÓN POST-FIX
NOTICE: ===========================================
NOTICE: Estado: OK ✓ - Policy ahora incluye superadmin
NOTICE: ===========================================

NOTICE: ╔═══════════════════════════════════════════════════════════════╗
NOTICE: ║  FIX COMPLETADO: Reuniones - Insert Policy                    ║
NOTICE: ╚═══════════════════════════════════════════════════════════════╝
NOTICE: ✓ Policy "Reuniones - Insert" actualizada
NOTICE: ✓ Ahora incluye rol: superadmin
NOTICE: ✓ Roles permitidos para INSERT: superadmin, admin, gerencia, jefe_ventas
```

---

## Verificación Post-Ejecución

### Opción 1: Verificar en SQL Editor

Ejecutar esta query en Supabase SQL Editor:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  definition
FROM pg_policies
WHERE tablename = 'reuniones'
  AND policyname = 'Reuniones - Insert';
```

**Resultado esperado:**

La columna `definition` debe contener algo como:

```sql
...rol IN ('superadmin', 'admin', 'gerencia', 'jefe_ventas')...
```

### Opción 2: Probar en el Dashboard

1. Login como `gerente.ti@ecoplaza.com.pe`
2. Ir al módulo **Reuniones**
3. Click en **Nueva Reunión** o **Subir Audio/Video**
4. Intentar crear una reunión
5. **Debe funcionar sin errores**

---

## Troubleshooting

### Si el error persiste después de aplicar el fix

#### 1. Verificar que el usuario es superadmin

Ejecutar en SQL Editor:

```sql
SELECT
  id,
  email,
  nombre,
  rol,
  activo
FROM usuarios
WHERE email = 'gerente.ti@ecoplaza.com.pe';
```

**Debe mostrar:**
- `rol = 'superadmin'`
- `activo = true`

#### 2. Verificar auth.uid()

Cuando el usuario esté logueado, ejecutar:

```sql
SELECT auth.uid();
```

Este UUID debe coincidir con el `id` de la tabla `usuarios`.

#### 3. Verificar que RLS está habilitado

```sql
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'reuniones';
```

**Debe mostrar:** `rowsecurity = true`

#### 4. Verificar todas las policies de reuniones

```sql
SELECT
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'reuniones'
ORDER BY policyname;
```

Debe haber 4 policies:
- `Reuniones - Select`
- `Reuniones - Insert` (esta es la que fijamos)
- `Reuniones - Update`
- `Reuniones - Delete`

---

## Impacto del Cambio

### Roles afectados

**ANTES del fix:**
- Solo `admin`, `gerencia`, `jefe_ventas` podían crear reuniones
- `superadmin` estaba **BLOQUEADO** (error 403)

**DESPUÉS del fix:**
- `superadmin`, `admin`, `gerencia`, `jefe_ventas` pueden crear reuniones
- `superadmin` ahora **FUNCIONA** correctamente

### Usuarios afectados

- `gerente.ti@ecoplaza.com.pe` (superadmin) - **Ahora puede crear reuniones**
- Todos los demás usuarios mantienen los mismos permisos

---

## Próximos Pasos

Una vez verificado que el fix funciona:

1. **Actualizar contexto:**
   - Agregar entrada en `context/SESSION_LOG.md`
   - Marcar como resuelto en `context/BLOCKERS.md` (si existe)

2. **Ejecutar migración 010 completa:**
   - La migración `010_reuniones_permisos_compartir.sql` incluye este fix y más features
   - Considerar ejecutarla completa cuando se necesiten los permisos compartidos

3. **Documentar en sesión:**
   - Crear `docs/sesiones/SESION_XX_Fix_Superadmin_RLS_Reuniones.md`
   - Documentar el problema, causa y solución

---

## Información Técnica

### Archivo de migración
`migrations/011_fix_reuniones_insert_superadmin_URGENTE.sql`

### Policy actualizada
- **Nombre:** `Reuniones - Insert`
- **Tabla:** `reuniones`
- **Operación:** `INSERT`
- **Roles permitidos:** `superadmin`, `admin`, `gerencia`, `jefe_ventas`

### Fecha de creación
16 Enero 2026

### Ejecutado en Supabase
- [ ] Production
- [ ] Testing
- [ ] Development

---

## Contacto

Si el problema persiste después de seguir estos pasos, contactar al equipo técnico con:

1. Capturas de pantalla del error
2. Output completo de la migración
3. Resultados de las queries de verificación
4. Logs del navegador (F12 → Console)

---

**Prioridad:** URGENTE
**Impacto:** ALTO - Usuario superadmin bloqueado
**Tiempo estimado de ejecución:** 30 segundos
**Riesgo:** BAJO - Script idempotente, solo actualiza policy existente
