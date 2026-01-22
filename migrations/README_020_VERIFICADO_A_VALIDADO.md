# Migración 020: Estandarización de Terminología "Verificado" → "Validado"

**Fecha:** 2026-01-21
**Archivo:** `migrations/020_verificado_a_validado.sql`
**Estado:** Pendiente de ejecución

---

## Objetivo

Estandarizar la terminología de "verificado" a "validado" en el módulo de pagos, específicamente en la tabla `depositos_ficha`, para alinearse con el término usado en `abonos_pago` y el flujo de negocio de Finanzas.

---

## Contexto de Negocio

El flujo de trabajo de Finanzas incluye:

1. **Subida de depósito:** Vendedor/Caseta sube voucher en Ficha de Inscripción
2. **Revisión:** Finanzas revisa el voucher y los datos OCR
3. **Validación:** Finanzas valida que el depósito es correcto y corresponde al local
4. **Vinculación:** El depósito validado se vincula con un abono en Control de Pagos

El término correcto es **"validar"** (validación de información) y no "verificar" (verificación técnica).

---

## Cambios Realizados

### Tabla: `depositos_ficha`

#### Columnas Renombradas

| Nombre Anterior | Nombre Nuevo | Tipo | Descripción |
|-----------------|--------------|------|-------------|
| `verificado_finanzas` | `validado_finanzas` | `BOOLEAN` | Si Finanzas validó el depósito |
| `verificado_finanzas_por` | `validado_finanzas_por` | `UUID` | Usuario que validó |
| `verificado_finanzas_at` | `validado_finanzas_at` | `TIMESTAMPTZ` | Timestamp de validación |
| `verificado_finanzas_nombre` | `validado_finanzas_nombre` | `VARCHAR(200)` | Snapshot del nombre del validador |

#### Índices Renombrados

| Nombre Anterior | Nombre Nuevo |
|-----------------|--------------|
| `idx_depositos_ficha_pendientes` | `idx_depositos_ficha_no_validados` |
| `idx_abonos_verificacion_pendiente` | `idx_abonos_validacion_pendiente` |

**Nota:** El índice `idx_abonos_validacion_pendiente` solo se renombra si existe. Según el análisis del código, `abonos_pago` ya usa la terminología correcta.

#### Triggers Renombrados

| Nombre Anterior | Nombre Nuevo |
|-----------------|--------------|
| `trigger_comisiones_inicial_verificado` | `trigger_comisiones_inicial_validado` |

**Nota:** Si este trigger existe, debe recrearse manualmente. Ver sección de Post-Migración.

---

## Tabla: `abonos_pago`

**NO se modifica** en esta migración porque ya usa las columnas correctas:
- `validado_finanzas`
- `validado_finanzas_por`
- `validado_finanzas_at`
- `validado_finanzas_nombre`

Esto se confirmó en `lib/actions-pagos.ts` líneas 31-34.

---

## Características de la Migración

### Idempotencia

La migración usa bloques `DO $$ ... END $$` con verificación `IF EXISTS` para:
- Verificar existencia de columnas antes de renombrar
- Verificar existencia de índices antes de renombrar
- Permitir ejecución múltiple sin errores

### Seguridad de Datos

- **ALTER TABLE ... RENAME COLUMN** es seguro y NO pierde datos
- **ALTER INDEX ... RENAME TO** solo cambia el nombre del índice
- Los índices se recrean para referenciar las nuevas columnas
- No hay transformación de datos ni locking prolongado

### Sin Downtime

Esta migración se puede ejecutar en producción sin downtime porque:
1. Los cambios son solo de metadatos (nombres)
2. No hay locks prolongados en las tablas
3. Los índices se recrean rápidamente
4. Las queries existentes fallarán con error claro si usan nombres viejos

---

## Impacto en el Código

### Archivos que Deben Actualizarse

Después de ejecutar la migración, se deben actualizar las referencias a las columnas antiguas:

#### 1. `lib/actions-depositos-ficha.ts`

Buscar y reemplazar:
- `verificado_finanzas` → `validado_finanzas`
- `verificado_finanzas_por` → `validado_finanzas_por`
- `verificado_finanzas_at` → `validado_finanzas_at`
- `verificado_finanzas_nombre` → `validado_finanzas_nombre`

**Líneas afectadas:** 292-295, 356, 450, 458, 472-475, 531-534, 537, 569, 692, 708

#### 2. Componentes UI (si existen)

Buscar en:
- `components/depositos/**/*.tsx`
- `app/**/depositos/**/*.tsx`

#### 3. Types/Interfaces

Verificar interfaces TypeScript que definan el tipo `DepositoFicha`.

---

## Ejecución

### Pre-Requisitos

1. Backup de la base de datos (recomendado)
2. Verificar que no hay operaciones de Finanzas en curso
3. Notificar al equipo de desarrollo del cambio

### Comando de Ejecución

```bash
# Ejecutar en Supabase SQL Editor o via CLI
psql -h <host> -U <user> -d <database> -f migrations/020_verificado_a_validado.sql
```

### Verificación Post-Migración

```sql
-- 1. Verificar columnas renombradas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'depositos_ficha'
AND column_name LIKE '%validado%'
ORDER BY column_name;

-- Resultado esperado:
-- validado_finanzas          | boolean
-- validado_finanzas_at       | timestamp with time zone
-- validado_finanzas_nombre   | character varying
-- validado_finanzas_por      | uuid

-- 2. Verificar índices renombrados
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'depositos_ficha'
AND indexname LIKE '%validado%';

-- Resultado esperado:
-- idx_depositos_ficha_no_validados

-- 3. Verificar que el índice parcial funciona correctamente
EXPLAIN ANALYZE
SELECT id, monto, fecha_comprobante
FROM depositos_ficha
WHERE validado_finanzas = false
LIMIT 10;

-- Debe usar: Index Scan using idx_depositos_ficha_no_validados
```

### Acciones Manuales Post-Migración

Si existe el trigger `trigger_comisiones_inicial_verificado`, debe recrearse:

```sql
-- 1. Obtener definición del trigger viejo
SELECT pg_get_triggerdef(oid)
FROM pg_trigger
WHERE tgname = 'trigger_comisiones_inicial_verificado';

-- 2. Dropear trigger viejo
DROP TRIGGER IF EXISTS trigger_comisiones_inicial_verificado ON <tabla>;

-- 3. Recrear con nuevo nombre
-- (Usar la definición del paso 1 pero con nuevo nombre)
```

---

## Rollback

Si necesitas revertir la migración:

```sql
-- 1. Renombrar columnas de vuelta
ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas TO verificado_finanzas;
ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas_por TO verificado_finanzas_por;
ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas_at TO verificado_finanzas_at;
ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas_nombre TO verificado_finanzas_nombre;

-- 2. Renombrar índice de vuelta
ALTER INDEX idx_depositos_ficha_no_validados RENAME TO idx_depositos_ficha_pendientes;

-- 3. Recrear índice parcial con columna vieja
DROP INDEX IF EXISTS idx_depositos_ficha_no_validados;
CREATE INDEX idx_depositos_ficha_pendientes
  ON depositos_ficha(verificado_finanzas)
  WHERE verificado_finanzas = false;

-- 4. Restaurar comentarios
COMMENT ON COLUMN depositos_ficha.verificado_finanzas IS
'Si Finanzas ha verificado este depósito. Proceso irreversible.';
```

---

## Testing

### Test Cases

1. **Depósito sin validar**
   - Crear nuevo depósito
   - Verificar que `validado_finanzas = false`
   - Verificar que aparece en query de pendientes

2. **Validación por Finanzas**
   - Marcar depósito como validado
   - Verificar que se llenen los 4 campos `validado_*`
   - Verificar que desaparece de pendientes

3. **Queries existentes**
   - Probar todas las queries en `lib/actions-depositos-ficha.ts`
   - Verificar que los índices se usan correctamente

4. **Performance**
   - Query de depósitos no validados debe usar índice parcial
   - No debe haber degradación de performance

---

## Notas Importantes

### Por Qué No Tocar `abonos_pago`

La tabla `abonos_pago` fue creada después de `depositos_ficha` y ya usa la terminología correcta desde el inicio. Esto se confirma en:

**Archivo:** `lib/actions-pagos.ts`
```typescript
export interface AbonoPago {
  // ...
  validado_finanzas: boolean;
  validado_finanzas_por: string | null;
  validado_finanzas_at: string | null;
  validado_finanzas_nombre: string | null;
}
```

### Alineación con Flujo de Negocio

El término "validado" es más preciso porque:
- Finanzas **valida** que el depósito es legítimo
- Finanzas **valida** que los montos coinciden
- Finanzas **valida** que el voucher corresponde al local

"Verificado" sugiere un proceso técnico/automático, mientras que "validado" refleja el proceso manual y crítico que realiza Finanzas.

---

## Checklist de Ejecución

- [ ] Backup de base de datos realizado
- [ ] Migración ejecutada en Staging
- [ ] Verificación post-migración en Staging exitosa
- [ ] Código actualizado en feature branch
- [ ] Tests ejecutados y pasando
- [ ] Migración ejecutada en Producción
- [ ] Verificación post-migración en Producción exitosa
- [ ] Código desplegado a Producción
- [ ] Monitoreo de errores por 24h
- [ ] Documentación actualizada

---

## Referencias

- **Migración original:** `migrations/012_depositos_ficha.sql`
- **Código afectado:** `lib/actions-depositos-ficha.ts`, `lib/actions-pagos.ts`
- **Tabla relacionada:** `abonos_pago` (ya usa terminología correcta)
- **Sesión:** Sesión 97 - Estandarización de terminología

---

**Preparado por:** DataDev (Database Architect)
**Aprobado por:** _Pendiente_
**Ejecutado por:** _Pendiente_
**Fecha de ejecución:** _Pendiente_
