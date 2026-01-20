# MIGRACIÓN - Vincular jefe_ventas con tabla vendedores

> Asegurar que todos los usuarios con rol jefe_ventas tengan un vendedor_id asociado

---

## Resumen

**Fecha:** 20 Enero 2026
**Archivo:** `20260120_jefe_ventas_vendedor_id.sql`
**Impacto:** Bajo - Crea registros en tabla `vendedores` y actualiza `usuarios`
**Downtime:** NO - Migración compatible con tráfico activo
**Reversible:** PARCIAL (ver sección Rollback)
**Estado:** ✅ EJECUTADA Y VERIFICADA

---

## Problema que Resuelve

### Contexto

Los usuarios con rol `jefe_ventas` necesitan poder:
1. Asignarse leads a sí mismos
2. Aparecer en dropdowns de asignación de leads
3. Ser seleccionados como vendedores en operaciones de venta

### Situación Anterior

Algunos `jefe_ventas` NO tenían `vendedor_id`, lo que causaba:
- ❌ No aparecían en dropdowns de vendedores
- ❌ No podían asignarse leads directamente
- ❌ Inconsistencias en reportes de ventas

### Solución

Crear automáticamente un registro en la tabla `vendedores` para cada `jefe_ventas` que no tenga `vendedor_id`, y vincular ese ID en la tabla `usuarios`.

---

## Cambios Incluidos

### 1. Lógica de Migración

```sql
DO $$
DECLARE
  usuario_record RECORD;
  nuevo_vendedor_id UUID;
  telefono_encontrado TEXT;
  contador INTEGER := 0;
BEGIN
  -- Para cada jefe_ventas sin vendedor_id:
  FOR usuario_record IN
    SELECT u.id, u.nombre, u.email, u.activo, udnv.telefono
    FROM usuarios u
    LEFT JOIN usuarios_datos_no_vendedores udnv ON udnv.usuario_id = u.id
    WHERE u.vendedor_id IS NULL
      AND u.rol = 'jefe_ventas'
  LOOP
    -- 1. Crear vendedor
    INSERT INTO vendedores (nombre, telefono, activo)
    VALUES (usuario_record.nombre, usuario_record.telefono, usuario_record.activo)
    RETURNING id INTO nuevo_vendedor_id;

    -- 2. Vincular usuario con vendedor
    UPDATE usuarios
    SET vendedor_id = nuevo_vendedor_id
    WHERE id = usuario_record.usuario_id;

    contador := contador + 1;
  END LOOP;

  RAISE NOTICE 'Migrados % jefe_ventas', contador;
END $$;
```

### 2. Queries de Verificación

El script incluye 3 queries de verificación:

1. **Antes de migración:** Lista jefe_ventas sin vendedor_id
2. **Durante migración:** Logs de cada operación
3. **Después de migración:** Verifica que todos tengan vendedor_id

---

## Prerequisitos

- [x] Acceso a Supabase (service_role_key)
- [x] Node.js instalado (para script de ejecución)
- [x] Tabla `vendedores` existente
- [x] Tabla `usuarios_datos_no_vendedores` existente (opcional)

---

## Instrucciones de Ejecución

### Opción A: Script Node.js Automático (Recomendado)

```bash
# Desde raíz del proyecto
node scripts/run-migration-jefe-ventas.js
```

**Ventajas:**
- ✓ Validación automática antes/después
- ✓ Logs detallados en consola
- ✓ Manejo de errores robusto
- ✓ No requiere acceso directo a SQL Editor

**Salida esperada:**
```
╔════════════════════════════════════════════════════════════════════╗
║  MIGRACIÓN: Asegurar vendedor_id para todos los jefe_ventas       ║
╚════════════════════════════════════════════════════════════════════╝

📊 PASO 1: Verificando jefe_ventas sin vendedor_id...

Jefe de Ventas encontrados:
─────────────────────────────────────────────────────────────────────
  ✓ OK | Juan Pérez (juan@ecoplaza.com)
  ✗ SIN VENDEDOR_ID | María García (maria@ecoplaza.com)
─────────────────────────────────────────────────────────────────────

🔧 PASO 2: Ejecutando migración...
  Procesando: María García (maria@ecoplaza.com)
    → Vendedor creado con ID: abc123...
    ✓ Usuario vinculado con vendedor_id

✓ Migración completada: 1 jefe_ventas migrados

📊 PASO 3: Verificación final...
✓✓✓ ÉXITO: Todos los jefe_ventas tienen vendedor_id
```

---

### Opción B: Supabase SQL Editor (Manual)

1. Abrir Supabase Dashboard
2. Ir a **SQL Editor**
3. Click en **New Query**
4. Copiar contenido completo de `20260120_jefe_ventas_vendedor_id.sql`
5. Click en **Run**
6. Verificar output en console logs

**Tiempo estimado:** 5-10 segundos

---

## Verificación Post-Migración

### 1. Script de Verificación Completo

```bash
node scripts/verify-jefe-ventas-vendedores.js
```

**Salida esperada:**

```
╔════════════════════════════════════════════════════════════════════╗
║  VERIFICACIÓN: Jefe_ventas como vendedores                        ║
╚════════════════════════════════════════════════════════════════════╝

📊 Total de Jefe de Ventas: 8

1. Juan Pérez
   Email: juan@ecoplaza.com
   ✓ Tiene vendedor_id: abc123-...
   ✓ Vendedor Nombre: Juan Pérez
   ✓ Vendedor Teléfono: 51999999999
   ✓ Vendedor Estado: Activo
   ✓ Puede aparecer en dropdowns: SÍ

─────────────────────────────────────────────────────────────────────
RESUMEN:
  Total jefe_ventas: 8
  Con vendedor_id: 8 (100.0%)
  Sin vendedor_id: 0 (0.0%)
  Activos en dropdowns: 8
─────────────────────────────────────────────────────────────────────

╔════════════════════════════════════════════════════════════════════╗
║  ✓✓✓ ÉXITO TOTAL                                                  ║
║  Todos los jefe_ventas tienen vendedor_id                         ║
║  Pueden aparecer en dropdowns de asignación                       ║
╚════════════════════════════════════════════════════════════════════╝
```

---

### 2. Query SQL Manual

```sql
-- Verificar que todos los jefe_ventas tengan vendedor_id
SELECT
  u.id,
  u.nombre,
  u.email,
  u.rol,
  u.vendedor_id,
  v.telefono as vendedor_telefono,
  v.activo as vendedor_activo,
  CASE
    WHEN u.vendedor_id IS NULL THEN '✗ SIN VENDEDOR_ID'
    ELSE '✓ OK'
  END as estado
FROM usuarios u
LEFT JOIN vendedores v ON v.id = u.vendedor_id
WHERE u.rol = 'jefe_ventas'
ORDER BY u.nombre;
```

**Resultado esperado:** Todas las filas deben tener `estado = '✓ OK'`

---

### 3. Testing en Aplicación

**Paso 1: Verificar dropdown de vendedores**

1. Login como `admin` o `jefe_ventas`
2. Ir a página de Leads
3. Seleccionar un lead sin asignar
4. Abrir dropdown de "Asignar Vendedor"
5. **Verificar:** Todos los jefe_ventas aparecen en la lista

**Paso 2: Asignar lead a jefe_ventas**

1. Seleccionar un jefe_ventas del dropdown
2. Guardar asignación
3. **Verificar:** Lead queda asignado correctamente
4. **Verificar:** Aparece nombre del jefe_ventas en columna "Vendedor"

---

## Resultados de Ejecución (2026-01-20)

### Estado Inicial

```
Total jefe_ventas: 8
- Álvaro Espinoza Escalante ✓ (ya tenía vendedor_id)
- Andrea Rocha Quineche ✓ (ya tenía vendedor_id)
- Brayan Jersy Meza Limaymanta ✓ (ya tenía vendedor_id)
- Juan Aquije ✓ (ya tenía vendedor_id)
- Kevin Espinoza ✓ (ya tenía vendedor_id)
- Leo Jefe Ventas ✓ (ya tenía vendedor_id)
- Pedro Ascencio Revilla ✓ (ya tenía vendedor_id)
- Pilar Robles Saavedra ✓ (ya tenía vendedor_id)
```

### Resultado

**✓ Todos los jefe_ventas ya tenían vendedor_id configurado**

- No fue necesario crear nuevos vendedores
- La integridad referencial está correcta
- Todos pueden aparecer en dropdowns de asignación

### Verificación de Integridad

```
✓ Vendedores encontrados en tabla: 8/8
✓ INTEGRIDAD OK: Todos los vendedor_id existen en tabla vendedores
✓ Activos en dropdowns: 8
```

---

## Rollback (Si es necesario)

### Consideraciones

⚠️ **ATENCIÓN:** El rollback NO es completamente reversible porque:
- Los IDs de vendedores creados son UUIDs únicos
- Puede haber leads ya asignados a estos nuevos vendedores
- Las referencias en otras tablas se verían afectadas

### Opción 1: Desvincular sin Eliminar (Seguro)

```sql
-- Solo quitar vendedor_id de jefe_ventas (mantener vendedores)
UPDATE usuarios
SET vendedor_id = NULL
WHERE rol = 'jefe_ventas'
  AND vendedor_id IN (
    SELECT id FROM vendedores
    WHERE created_at >= '2026-01-20' -- Fecha de migración
  );
```

**Resultado:** jefe_ventas pierden vendedor_id pero los vendedores quedan en BD

---

### Opción 2: Eliminar Vendedores Creados (PELIGROSO)

```sql
-- ⚠️ SOLO si NO hay leads asignados a estos vendedores

-- 1. Verificar que no hay leads asignados
SELECT COUNT(*) as leads_asignados
FROM leads
WHERE vendedor_asignado_id IN (
  SELECT vendedor_id FROM usuarios WHERE rol = 'jefe_ventas'
);
-- Si result = 0, proceder

-- 2. Desvincular usuarios
UPDATE usuarios
SET vendedor_id = NULL
WHERE rol = 'jefe_ventas';

-- 3. Eliminar vendedores (solo los de jefe_ventas)
DELETE FROM vendedores
WHERE id IN (
  SELECT vendedor_id FROM usuarios WHERE rol = 'jefe_ventas'
);
```

**⚠️ NO EJECUTAR** si hay leads asignados

---

## Troubleshooting

### Error: "duplicate key value violates unique constraint"

**Causa:** Un jefe_ventas ya tiene vendedor_id

**Solución:** El script detecta esto automáticamente y lo omite

---

### Error: "foreign key violation"

**Causa:** Intentar eliminar vendedor con leads asignados

**Solución:**
```sql
-- Reasignar leads a otro vendedor antes de eliminar
UPDATE leads
SET vendedor_asignado_id = '[UUID_OTRO_VENDEDOR]'
WHERE vendedor_asignado_id = '[UUID_VENDEDOR_A_ELIMINAR]';
```

---

### Error: "permission denied for table vendedores"

**Causa:** Usuario sin permisos para INSERT en vendedores

**Solución:** Usar `service_role_key` en el script Node.js

---

## Impacto en Performance

**NINGUNO** - La migración:
- NO afecta queries existentes
- NO modifica RLS policies
- Solo crea registros nuevos (operación rápida)

---

## Monitoreo Post-Despliegue

### Queries Recomendadas (24 horas)

```sql
-- 1. Verificar que no se crearon jefe_ventas sin vendedor_id
SELECT COUNT(*) FROM usuarios
WHERE rol = 'jefe_ventas' AND vendedor_id IS NULL;
-- Esperado: 0

-- 2. Contar leads asignados a jefe_ventas
SELECT v.nombre, COUNT(l.id) as leads_asignados
FROM vendedores v
INNER JOIN usuarios u ON u.vendedor_id = v.id
LEFT JOIN leads l ON l.vendedor_asignado_id = v.id
WHERE u.rol = 'jefe_ventas'
GROUP BY v.nombre
ORDER BY leads_asignados DESC;

-- 3. Verificar integridad referencial
SELECT u.nombre as jefe_ventas, v.nombre as vendedor
FROM usuarios u
LEFT JOIN vendedores v ON v.id = u.vendedor_id
WHERE u.rol = 'jefe_ventas';
-- Todas las filas deben tener valor en ambas columnas
```

---

## Checklist de Ejecución

- [x] Script de migración creado (`run-migration-jefe-ventas.js`)
- [x] Script de verificación creado (`verify-jefe-ventas-vendedores.js`)
- [x] Dependencias instaladas (dotenv)
- [x] Migración ejecutada exitosamente
- [x] Verificación post-migración ejecutada
- [x] 8/8 jefe_ventas con vendedor_id ✓
- [x] Integridad referencial verificada ✓
- [x] Todos activos en dropdowns ✓
- [ ] Testing en aplicación (UI)
- [ ] Monitoreo de logs (24h)
- [ ] Documentación actualizada en CURRENT_STATE.md

---

## Próximos Pasos

1. **Testing UI:** Verificar dropdowns de asignación en página Leads
2. **Testing funcional:** Asignar un lead a un jefe_ventas
3. **Monitoreo:** Revisar logs de Supabase (24h)
4. **Documentación:** Actualizar `context/CURRENT_STATE.md`
5. **Cleanup:** Eliminar scripts temporales si no se necesitan más

---

## Scripts Relacionados

| Script | Propósito | Ubicación |
|--------|-----------|-----------|
| `run-migration-jefe-ventas.js` | Ejecutar migración | `scripts/` |
| `verify-jefe-ventas-vendedores.js` | Verificar resultado | `scripts/` |
| `20260120_jefe_ventas_vendedor_id.sql` | SQL de migración | `migrations/` |

---

## Contacto

**Dudas o problemas:**

- Ejecutar script de verificación: `node scripts/verify-jefe-ventas-vendedores.js`
- Revisar logs en Supabase Dashboard → Logs
- Consultar documentación: `docs/modulos/leads/ASIGNACION_VENDEDORES.md`

---

**Última actualización:** 20 Enero 2026
**Ejecutada por:** Database Architect (Claude Code)
**Estado:** ✅ Completada y Verificada
**Resultado:** 8/8 jefe_ventas con vendedor_id (100%)
