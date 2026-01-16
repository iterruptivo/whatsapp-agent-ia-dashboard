# SESIÓN 98 - Fix Superadmin RLS Reuniones

**Fecha:** 16 Enero 2026
**Tipo:** FIX URGENTE - RLS Policy
**Módulo:** Reuniones
**Estado:** 🔴 URGENTE - Fix creado, pendiente aplicar en Supabase

---

## Resumen Ejecutivo

El usuario superadmin `gerente.ti@ecoplaza.com.pe` no puede crear reuniones debido a una política RLS (Row Level Security) que omite el rol `superadmin` en las operaciones de INSERT.

**Impacto:** ALTO - Usuario principal bloqueado
**Riesgo del fix:** BAJO - Script idempotente, solo actualiza policy existente
**Tiempo de ejecución:** 30 segundos

---

## Problema Reportado

### Error

```
HTTP 400: {
  "statusCode": "403",
  "error": "Unauthorized",
  "message": "new row violates row-level security policy"
}
```

### Contexto

- **Usuario afectado:** `gerente.ti@ecoplaza.com.pe`
- **Rol:** `superadmin`
- **Acción bloqueada:** Crear/subir reunión
- **Módulo:** Reuniones (subir audio/video para transcripción)

---

## Análisis del Problema

### 1. Investigación de Migraciones

Se revisaron las migraciones relacionadas con la tabla `reuniones`:

| Migración | Fecha | Estado | Incluye superadmin |
|-----------|-------|--------|-------------------|
| `20260106_create_reuniones_tables.sql` | 6 Ene 2026 | ✅ Ejecutada | ❌ NO |
| `010_reuniones_permisos_compartir.sql` | 15 Ene 2026 | ⏳ No ejecutada | ✅ SI (líneas 101-110) |

### 2. Causa Raíz

La policy `"Reuniones - Insert"` actual (de la migración ejecutada) es:

```sql
CREATE POLICY "Reuniones - Insert"
ON reuniones FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'gerencia', 'jefe_ventas')  -- NO incluye 'superadmin'
  )
);
```

**Roles permitidos:** `admin`, `gerencia`, `jefe_ventas`
**Rol bloqueado:** `superadmin`

### 3. Por qué no se usó la migración 010

La migración `010_reuniones_permisos_compartir.sql` ya contiene el fix correcto:

```sql
-- Líneas 101-110
CREATE POLICY "Reuniones - Insert"
ON reuniones FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('superadmin', 'admin', 'gerencia', 'jefe_ventas')  -- INCLUYE superadmin
  )
);
```

Sin embargo, esta migración:
- Es muy extensa (580 líneas)
- Incluye muchos cambios adicionales (campos, índices, funciones)
- Aún no se ha ejecutado en producción

**Decisión:** Crear un fix quirúrgico (solo la policy) para desbloquear al usuario inmediatamente.

---

## Solución Implementada

### Archivos Creados

#### 1. Script de Migración Principal

**Archivo:** `migrations/011_fix_reuniones_insert_superadmin_URGENTE.sql`

**Contenido:**
- Diagnóstico pre-ejecución (detecta si ya tiene el fix)
- DROP y recreación de policy incluyendo `superadmin`
- Verificación post-ejecución
- Validación de usuarios superadmin en sistema
- Resumen y próximos pasos

**Características:**
- Idempotente (seguro ejecutar múltiples veces)
- Incluye mensajes NOTICE para seguimiento
- 5 pasos de ejecución con validaciones

#### 2. README con Instrucciones

**Archivo:** `migrations/README_011_FIX_SUPERADMIN_INSERT_URGENTE.md`

**Secciones:**
1. Problema identificado
2. Causa raíz
3. Análisis de migraciones
4. Solución
5. Instrucciones paso a paso para ejecutar en Supabase
6. Verificación post-ejecución
7. Troubleshooting
8. Impacto del cambio
9. Próximos pasos

#### 3. Script de Diagnóstico

**Archivo:** `migrations/diagnose_rls_reuniones.sql`

**Propósito:** Diagnosticar el estado completo de las policies RLS de reuniones

**Contenido (12 secciones):**
1. Estado de la tabla reuniones
2. Políticas RLS actuales
3. Definición completa de policy INSERT
4. Verificar si incluye 'superadmin'
5. Usuarios superadmin en el sistema
6. Verificar usuario específico (gerente.ti)
7. Conteo de reuniones existentes
8. Reuniones por rol de creador
9. Verificar si superadmin ha creado reuniones antes
10. Comparación de roles permitidos
11. Diagnóstico final
12. Recomendaciones

**Uso:** Ejecutar antes y después del fix para comparar estados

#### 4. Resumen Ejecutivo

**Archivo:** `migrations/RESUMEN_FIX_SUPERADMIN.md`

**Propósito:** Guía rápida de 1 página para el usuario

**Contenido:**
- Problema en 2 líneas
- Causa en 3 líneas
- Pasos de ejecución (5 pasos)
- Tiempo estimado: 30 segundos
- Tabla de archivos creados

---

## Policy Actualizada

### Antes del Fix

```sql
CREATE POLICY "Reuniones - Insert"
ON reuniones FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'gerencia', 'jefe_ventas')
  )
);
```

**Roles permitidos:** 3 roles

### Después del Fix

```sql
CREATE POLICY "Reuniones - Insert"
ON reuniones FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('superadmin', 'admin', 'gerencia', 'jefe_ventas')
  )
);
```

**Roles permitidos:** 4 roles (agregado `superadmin`)

---

## Instrucciones de Ejecución

### 1. Acceder a Supabase

```
https://supabase.com/dashboard/project/YOUR_PROJECT
→ SQL Editor (sidebar)
→ New Query
```

### 2. Ejecutar el Script

```
1. Abrir: migrations/011_fix_reuniones_insert_superadmin_URGENTE.sql
2. Copiar TODO el contenido
3. Pegar en SQL Editor
4. Click en "Run" o Ctrl + Enter
```

### 3. Verificar Resultado

Buscar en el output:

```
NOTICE: Estado: OK ✓ - Policy ahora incluye superadmin
NOTICE: ✓ Policy "Reuniones - Insert" actualizada
NOTICE: ✓ Roles permitidos para INSERT: superadmin, admin, gerencia, jefe_ventas
```

### 4. Probar

```
1. Login como: gerente.ti@ecoplaza.com.pe
2. Ir a: Módulo Reuniones
3. Click: "Nueva Reunión" o "Subir Audio/Video"
4. Resultado esperado: Funciona sin errores
```

---

## Verificación Post-Ejecución

### Query de verificación rápida

```sql
SELECT
  policyname,
  definition
FROM pg_policies
WHERE tablename = 'reuniones'
  AND policyname = 'Reuniones - Insert';
```

**Resultado esperado:** La columna `definition` debe contener `'superadmin'`

### Diagnóstico completo

Ejecutar el script: `migrations/diagnose_rls_reuniones.sql`

---

## Impacto del Cambio

### Usuarios Afectados

| Usuario | Email | Rol | Antes | Después |
|---------|-------|-----|-------|---------|
| Gerente TI | gerente.ti@ecoplaza.com.pe | superadmin | ❌ Bloqueado | ✅ Permitido |
| Otros superadmin | (cualquier otro) | superadmin | ❌ Bloqueado | ✅ Permitido |
| Admin | (varios) | admin | ✅ Permitido | ✅ Permitido |
| Gerencia | (varios) | gerencia | ✅ Permitido | ✅ Permitido |
| Jefe Ventas | (varios) | jefe_ventas | ✅ Permitido | ✅ Permitido |

### Seguridad

**No hay degradación de seguridad:**
- `superadmin` es el rol con más privilegios del sistema
- Ya tiene acceso completo a todas las demás tablas y módulos
- Este fix solo corrige una omisión en la policy de reuniones

---

## Troubleshooting

### Si el error persiste

1. **Verificar que la migración se ejecutó:**
   ```sql
   SELECT definition FROM pg_policies
   WHERE tablename = 'reuniones' AND policyname = 'Reuniones - Insert';
   ```
   Debe contener `'superadmin'`

2. **Verificar que el usuario es superadmin:**
   ```sql
   SELECT rol, activo FROM usuarios
   WHERE email = 'gerente.ti@ecoplaza.com.pe';
   ```
   Debe mostrar: `rol = 'superadmin'`, `activo = true`

3. **Verificar auth.uid():**
   - Loguear como gerente.ti
   - Ejecutar: `SELECT auth.uid();`
   - El UUID debe coincidir con el `id` en tabla `usuarios`

4. **Ejecutar diagnóstico completo:**
   ```
   migrations/diagnose_rls_reuniones.sql
   ```

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| Policy no incluye 'superadmin' | Script no ejecutado | Ejecutar `011_fix...sql` |
| Usuario no es superadmin | Rol incorrecto | Actualizar rol en tabla usuarios |
| auth.uid() no coincide | Sesión inválida | Logout/login nuevamente |
| RLS deshabilitado | Configuración | `ALTER TABLE reuniones ENABLE ROW LEVEL SECURITY;` |

---

## Archivos del Proyecto

### Archivos Modificados

- `context/CURRENT_STATE.md` - Agregada sección Sesión 98
- `context/SESSION_LOG.md` - Entrada de sesión completa

### Archivos Creados

```
migrations/
├── 011_fix_reuniones_insert_superadmin_URGENTE.sql  (Script SQL principal)
├── README_011_FIX_SUPERADMIN_INSERT_URGENTE.md      (Instrucciones detalladas)
├── diagnose_rls_reuniones.sql                        (Script de diagnóstico)
└── RESUMEN_FIX_SUPERADMIN.md                         (Resumen ejecutivo)

docs/sesiones/
└── SESION_98_Fix_Superadmin_RLS_Reuniones.md        (Este documento)
```

---

## Próximos Pasos

### Inmediato (Post-Fix)

1. ✅ Ejecutar `011_fix_reuniones_insert_superadmin_URGENTE.sql` en Supabase
2. ✅ Ejecutar `diagnose_rls_reuniones.sql` para verificar
3. ✅ Probar crear reunión como gerente.ti@ecoplaza.com.pe
4. ✅ Actualizar CURRENT_STATE.md marcando como resuelto

### Corto Plazo

1. Considerar ejecutar `010_reuniones_permisos_compartir.sql` completa
   - Incluye este fix + permisos compartidos + funciones helper
   - Requiere testing más extenso

2. Crear test automatizado para verificar que superadmin siempre tenga acceso
   - Validar policies RLS en CI/CD
   - Prevenir regresiones futuras

### Mediano Plazo

1. Auditar TODAS las policies RLS del sistema
   - Verificar que superadmin siempre esté incluido
   - Documentar excepciones si las hay

2. Crear migración template para nuevas tablas
   - Incluir superadmin por defecto
   - Prevenir este error en futuras tablas

---

## Lecciones Aprendidas

### 1. SIEMPRE incluir superadmin en policies

**Problema:** Al crear la tabla `reuniones`, se omitió el rol `superadmin` en la policy INSERT.

**Prevención:**
- Template de policies debe incluir superadmin por defecto
- Code review debe verificar inclusión de superadmin
- Tests automatizados deben validar acceso de superadmin

### 2. Verificar ejecución de migraciones previas

**Problema:** La migración `010_reuniones_permisos_compartir.sql` ya contenía el fix pero no se ejecutó.

**Prevención:**
- Mantener log de migraciones ejecutadas en producción
- Verificar estado de migraciones antes de crear nuevas
- Considerar herramienta de gestión de migraciones (Flyway, Liquibase)

### 3. Crear scripts de diagnóstico junto con fixes

**Decisión acertada:** Se creó `diagnose_rls_reuniones.sql` junto con el fix.

**Beneficio:**
- Permite verificar el estado antes y después
- Útil para troubleshooting futuro
- Documentación ejecutable del problema

### 4. Documentación multi-nivel

**Documentos creados:**
1. Script SQL (técnico)
2. README detallado (operativo)
3. Resumen ejecutivo (gerencial)
4. Documento de sesión (histórico)

**Beneficio:** Diferentes stakeholders tienen la información que necesitan.

---

## Referencias

### Migraciones Relacionadas

- `migrations/20260106_create_reuniones_tables.sql` - Migración original (sin superadmin)
- `migrations/010_reuniones_permisos_compartir.sql` - Migración futura (con fix + features)
- `migrations/011_fix_reuniones_insert_superadmin_URGENTE.sql` - Este fix quirúrgico

### Documentación

- `docs/modulos/reuniones/` - Documentación del módulo Reuniones
- `docs/sesiones/SESION_96_Sistema_Permisos_Reuniones.md` - Permisos compartidos
- `context/CURRENT_STATE.md` - Estado actual del proyecto

### Políticas RLS Relacionadas

- `Reuniones - Select` - Lectura de reuniones
- `Reuniones - Insert` - Creación de reuniones (esta es la que se corrigió)
- `Reuniones - Update` - Actualización de reuniones
- `Reuniones - Delete` - Eliminación de reuniones

---

## Metadata

**Sesión:** 98
**Fecha:** 16 Enero 2026
**Duración:** ~1 hora
**Archivos creados:** 5
**Archivos modificados:** 2
**Líneas de código:** ~800 (SQL + Markdown)
**Prioridad:** 🔴 URGENTE
**Estado:** ⏳ Fix creado, pendiente aplicar
**Responsable:** DataDev (Database Architect)
**Revisor:** Pendiente
**Aprobador:** Pendiente

---

## Apéndice A: Query de Verificación Completa

```sql
-- Verificar estado completo de policies de reuniones
SELECT
  p.policyname AS policy,
  p.cmd AS operacion,
  CASE
    WHEN p.definition LIKE '%superadmin%' THEN '✓ SI'
    ELSE '✗ NO'
  END AS incluye_superadmin,
  p.definition AS definicion_completa
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.tablename = 'reuniones'
ORDER BY p.cmd, p.policyname;
```

## Apéndice B: Query para Auditar Todas las Policies

```sql
-- Auditar todas las policies RLS del sistema
-- Buscar cuáles NO incluyen 'superadmin'
SELECT
  tablename AS tabla,
  policyname AS policy,
  cmd AS operacion,
  CASE
    WHEN definition LIKE '%superadmin%' THEN '✓ Incluye'
    ELSE '⚠ NO incluye'
  END AS incluye_superadmin,
  SUBSTRING(definition, 1, 100) || '...' AS preview_definicion
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
ORDER BY
  CASE WHEN definition LIKE '%superadmin%' THEN 1 ELSE 0 END,
  tablename,
  cmd;
```

---

**Fin del documento**
