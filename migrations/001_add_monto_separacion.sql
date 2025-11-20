-- ============================================================================
-- MIGRATION 001: Add monto_separacion column
-- ============================================================================
-- Fecha: 19 Noviembre 2025
-- Descripción: Agregar columna monto_separacion a tablas locales y locales_leads
--              para registrar el monto de separación al confirmar local (NARANJA)
-- Autor: Claude Code + Leo
-- Sesión: SESION_48D (ver CLAUDE.md)
-- ============================================================================
-- NOTA: Este es un EJEMPLO de migration (ya ejecutada en producción)
--       NO ejecutar si la columna ya existe
-- ============================================================================

-- ============================================================================
-- PASO 1: Agregar monto_separacion a tabla locales
-- ============================================================================

ALTER TABLE locales
ADD COLUMN monto_separacion DECIMAL(12, 2);

-- Verify
SELECT column_name, data_type, is_nullable, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'locales'
  AND column_name = 'monto_separacion';
-- Expected: 1 row with data_type = 'numeric', is_nullable = 'YES'

-- ============================================================================
-- PASO 2: Agregar monto_separacion a tabla locales_leads
-- ============================================================================

ALTER TABLE locales_leads
ADD COLUMN monto_separacion DECIMAL(12, 2);

-- Verify
SELECT column_name, data_type, is_nullable, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'locales_leads'
  AND column_name = 'monto_separacion';
-- Expected: 1 row with data_type = 'numeric', is_nullable = 'YES'

-- ============================================================================
-- PASO 3: Verificación completa
-- ============================================================================

-- Verificar que ambas tablas tienen la columna
SELECT
  table_name,
  column_name,
  data_type,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_name IN ('locales', 'locales_leads')
  AND column_name = 'monto_separacion'
ORDER BY table_name;
-- Expected: 2 rows (locales + locales_leads)

-- ============================================================================
-- ROLLBACK (ejecutar solo si necesitas revertir)
-- ============================================================================
/*
-- Eliminar columnas en orden inverso
ALTER TABLE locales_leads DROP COLUMN IF EXISTS monto_separacion;
ALTER TABLE locales DROP COLUMN IF EXISTS monto_separacion;

-- Verify rollback
SELECT COUNT(*) as columnas_existentes
FROM information_schema.columns
WHERE table_name IN ('locales', 'locales_leads')
  AND column_name = 'monto_separacion';
-- Expected: 0 (ninguna columna encontrada)
*/

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
/*
1. IMPACTO EN APLICACIÓN:
   - Component: ComentarioNaranjaModal.tsx requiere este campo
   - Backend: lib/actions-locales.ts y lib/locales.ts usan esta columna
   - Si no existe la columna, la app fallará al cambiar local a NARANJA

2. TIPO DE DATO:
   - DECIMAL(12, 2) permite hasta 9,999,999,999.99
   - Suficiente para montos inmobiliarios en cualquier moneda
   - 2 decimales para centavos/céntimos

3. NULLABLE:
   - Columna es nullable (puede ser NULL)
   - Se llena solo cuando vendedor confirma local a NARANJA
   - Validación de required se hace en frontend/backend, no en BD

4. ÍNDICES:
   - No se agregan índices porque no se usa en queries de búsqueda
   - Solo se usa para display y auditoría

5. HISTORIAL:
   - Los valores se registran también en locales_historial.accion
   - Formato: "Comentario | Vinculó lead: Nombre (Tel: phone) | Monto de Separación: $X | Monto de Venta: $Y"

6. PERFORMANCE:
   - Cambio no afecta queries existentes (columna no indexed)
   - Agregar columna a tabla con pocos registros (<1000 locales) es instantáneo
   - No requiere VACUUM o REINDEX
*/

-- ============================================================================
-- FIN DE MIGRATION 001
-- ============================================================================
