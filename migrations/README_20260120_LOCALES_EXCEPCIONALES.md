# Migración: Locales Excepcionales

**Fecha:** 20 de Enero 2026
**Versión:** 20260120_locales_excepcionales
**Estado:** ✅ Ejecutada Exitosamente

---

## Propósito

Agregar la capacidad de marcar locales como "excepcionales" para regularizar ventas duplicadas históricas.

### Problema que Resuelve

En el pasado, algunos locales fueron vendidos múltiples veces sin que el sistema pudiera manejar esta situación. Por ejemplo:
- Local A-107 vendido a dos clientes diferentes
- Solución: crear A-107-1 y A-107-2 como locales separados

Sin un marcador, estos locales excepcionales aparecen como normales en el sistema y pueden causar confusión.

---

## Cambios en la Base de Datos

### 1. Nueva Columna

```sql
ALTER TABLE locales
ADD COLUMN IF NOT EXISTS es_excepcional BOOLEAN DEFAULT false;
```

**Características:**
- Nombre: `es_excepcional`
- Tipo: `BOOLEAN`
- Default: `false` (todos los locales existentes son normales)
- Nullable: `YES`

### 2. Índice Parcial

```sql
CREATE INDEX IF NOT EXISTS idx_locales_es_excepcional
ON locales(es_excepcional)
WHERE es_excepcional = true;
```

**Ventajas:**
- Solo indexa locales excepcionales (esperamos pocos)
- Filtrado ultra-rápido: `WHERE es_excepcional = true`
- Mínimo overhead en espacio (solo indexa TRUE)

### 3. Comentario Descriptivo

```sql
COMMENT ON COLUMN locales.es_excepcional IS
  'Local creado manualmente para regularizar ventas duplicadas (ej: A-107-1, A-107-2)';
```

---

## Ejecución

### Script de Migración

```bash
node scripts/migrate-locales-excepcionales.js
```

### Resultado de Ejecución

```
================================================================================
MIGRACION: Locales Excepcionales
================================================================================

[1/4] Agregando columna es_excepcional...
      OK - Columna agregada

[2/4] Creando índice parcial...
      OK - Índice creado

[3/4] Agregando comentario descriptivo...
      OK - Comentario agregado

[4/4] Verificando columna en schema...
      OK - Columna verificada:
         Tipo: boolean
         Default: false
         Nullable: YES

      OK - Índice verificado:
         idx_locales_es_excepcional

================================================================================
MIGRACION COMPLETADA EXITOSAMENTE
================================================================================
```

### Estado Post-Migración

- **Total locales:** 4,904
- **Locales normales:** 4,904 (100%)
- **Locales excepcionales:** 0

---

## Uso de la Columna

### Casos de Uso

**1. Crear Local Excepcional**

Cuando necesites regularizar una venta duplicada:

```sql
INSERT INTO locales (
  proyecto_id,
  codigo,
  area,
  precio,
  estado,
  es_excepcional  -- ← Marcar como excepcional
)
VALUES (
  1,
  'A-107-1',      -- Nombre especial para diferenciar
  50.0,
  85000,
  'disponible',
  true            -- ← TRUE para excepcionales
);
```

**2. Filtrar Locales Excepcionales**

```sql
-- Obtener todos los locales excepcionales
SELECT * FROM locales
WHERE es_excepcional = true;

-- Excluir locales excepcionales de reportes normales
SELECT * FROM locales
WHERE es_excepcional = false OR es_excepcional IS NULL;
```

**3. Contar Locales por Tipo**

```sql
SELECT
  es_excepcional,
  COUNT(*) as total
FROM locales
GROUP BY es_excepcional;
```

### Naming Convention para Locales Excepcionales

**Formato recomendado:** `{CODIGO_ORIGINAL}-{NUMERO}`

Ejemplos:
- `A-107` → `A-107-1`, `A-107-2`
- `B-205` → `B-205-1`, `B-205-2`, `B-205-3`

**Beneficios:**
- Claridad visual
- Fácil identificación del local original
- Consistencia en reportes

---

## Consideraciones de Performance

### Índice Parcial

El índice solo almacena locales con `es_excepcional = true`, lo que significa:

- **Espacio mínimo:** Solo locales excepcionales (esperamos <1% del total)
- **Consultas rápidas:** Filtrado instantáneo sin escaneo completo
- **Zero overhead:** No afecta consultas de locales normales

### Query Performance

```sql
-- Esto usará el índice parcial (FAST)
SELECT * FROM locales WHERE es_excepcional = true;

-- Esto usa índice normal (FAST)
SELECT * FROM locales WHERE proyecto_id = 1 AND es_excepcional = false;
```

---

## Rollback

Si necesitas revertir esta migración:

```sql
-- 1. Eliminar índice
DROP INDEX IF EXISTS idx_locales_es_excepcional;

-- 2. Eliminar columna
ALTER TABLE locales
DROP COLUMN IF EXISTS es_excepcional;
```

**ADVERTENCIA:** Si ya tienes locales marcados como excepcionales, perderás esa información.

---

## Testing

### Verificar Schema

```sql
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'locales'
  AND column_name = 'es_excepcional';
```

### Verificar Índice

```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'locales'
  AND indexname = 'idx_locales_es_excepcional';
```

### Verificar Comentario

```sql
SELECT col_description('locales'::regclass, (
  SELECT ordinal_position
  FROM information_schema.columns
  WHERE table_name = 'locales'
    AND column_name = 'es_excepcional'
)) as comment;
```

---

## Archivos Relacionados

| Archivo | Propósito |
|---------|-----------|
| `migrations/20260120_locales_excepcionales.sql` | Comandos SQL de la migración |
| `scripts/migrate-locales-excepcionales.js` | Script Node.js para ejecutar migración |
| `context/CURRENT_STATE.md` | Documentación de estado actualizada |
| `migrations/README_20260120_LOCALES_EXCEPCIONALES.md` | Este documento |

---

## Próximos Pasos

1. ✅ Migración ejecutada
2. ⏳ Actualizar UI para mostrar badge "Excepcional" en listado de locales
3. ⏳ Agregar validación en formulario de creación de locales
4. ⏳ Actualizar reportes para diferenciar locales normales vs excepcionales
5. ⏳ Agregar filtro en módulo de locales

---

## Notas Adicionales

- La columna es nullable por seguridad (compatible con locales antiguos)
- El default `false` asegura que locales nuevos sean normales por defecto
- El índice parcial es una optimización PostgreSQL (solo TRUE, no FALSE/NULL)
- No afecta ninguna funcionalidad existente (backward compatible)

---

**Migración creada por:** DataDev (Database Architect)
**Ejecutada en:** Producción - 20 Enero 2026
**Tiempo de ejecución:** <1 segundo
**Downtime:** 0 minutos
