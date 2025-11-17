-- ============================================================================
-- SQL MIGRATION: Timer 120 horas para estado NARANJA + Exclusividad
-- ============================================================================
-- Fecha: 17 Noviembre 2025
-- Sesión: 48
-- Objetivo: Implementar timer de auto-liberación y exclusividad para locales en NARANJA
-- ============================================================================

-- ============================================================================
-- PASO 1: Agregar campos para tracking de NARANJA
-- ============================================================================

ALTER TABLE locales
ADD COLUMN IF NOT EXISTS naranja_timestamp timestamptz,
ADD COLUMN IF NOT EXISTS naranja_vendedor_id uuid REFERENCES vendedores(id) ON DELETE SET NULL;

-- Comentarios para documentación
COMMENT ON COLUMN locales.naranja_timestamp IS 'Timestamp cuando el local pasó a estado NARANJA (para timer de 120 horas)';
COMMENT ON COLUMN locales.naranja_vendedor_id IS 'ID del vendedor que puso el local en NARANJA (para exclusividad)';

-- ============================================================================
-- PASO 2: Crear índice para auto-liberación eficiente
-- ============================================================================

-- Índice para consultas de auto-liberación (WHERE estado = 'naranja' AND naranja_timestamp < hace_120h)
CREATE INDEX IF NOT EXISTS idx_locales_naranja_expired
ON locales(naranja_timestamp)
WHERE estado = 'naranja' AND naranja_timestamp IS NOT NULL;

COMMENT ON INDEX idx_locales_naranja_expired IS 'Índice para queries de auto-liberación de locales en NARANJA expirados';

-- ============================================================================
-- PASO 3: TRIGGER para setear/limpiar campos automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION manage_naranja_timer()
RETURNS TRIGGER AS $$
BEGIN
  -- Si local está cambiando A naranja → setear timestamp y vendedor_id
  IF NEW.estado = 'naranja' AND (OLD.estado IS NULL OR OLD.estado != 'naranja') THEN
    NEW.naranja_timestamp = NOW();
    -- naranja_vendedor_id se setea manualmente en el código (validación de exclusividad)
  END IF;

  -- Si local está saliendo DE naranja → limpiar campos
  IF OLD.estado = 'naranja' AND NEW.estado != 'naranja' THEN
    NEW.naranja_timestamp = NULL;
    NEW.naranja_vendedor_id = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_manage_naranja_timer ON locales;
CREATE TRIGGER trigger_manage_naranja_timer
  BEFORE UPDATE ON locales
  FOR EACH ROW
  EXECUTE FUNCTION manage_naranja_timer();

COMMENT ON FUNCTION manage_naranja_timer() IS 'Trigger para setear/limpiar campos de timer NARANJA automáticamente';

-- ============================================================================
-- PASO 4: VERIFICACIÓN
-- ============================================================================

-- Query 1: Verificar que columnas se agregaron correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'locales'
  AND column_name IN ('naranja_timestamp', 'naranja_vendedor_id')
ORDER BY column_name;
-- Expected: 2 rows (naranja_timestamp: timestamp with time zone, naranja_vendedor_id: uuid)

-- Query 2: Verificar índice creado
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'locales'
  AND indexname = 'idx_locales_naranja_expired';
-- Expected: 1 row (partial index con WHERE estado = 'naranja')

-- Query 3: Verificar trigger creado
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'locales'
  AND trigger_name = 'trigger_manage_naranja_timer';
-- Expected: 1 row (BEFORE UPDATE trigger)

-- ============================================================================
-- PASO 5: QUERIES DE TESTING
-- ============================================================================

/*
-- Test 1: Simular local en NARANJA desde hace 121 horas (debería auto-liberarse)
UPDATE locales
SET naranja_timestamp = NOW() - INTERVAL '121 hours'
WHERE codigo = 'LC-TEST-001' AND estado = 'naranja';

-- Test 2: Consulta para encontrar locales expirados (>120 horas)
SELECT
  codigo,
  estado,
  naranja_timestamp,
  EXTRACT(EPOCH FROM (NOW() - naranja_timestamp)) / 3600 AS horas_transcurridas
FROM locales
WHERE estado = 'naranja'
  AND naranja_timestamp IS NOT NULL
  AND naranja_timestamp < (NOW() - INTERVAL '120 hours')
ORDER BY naranja_timestamp;
-- Expected: Locales con horas_transcurridas > 120

-- Test 3: Consulta para calcular tiempo restante de timer
SELECT
  codigo,
  estado,
  naranja_timestamp,
  CASE
    WHEN naranja_timestamp IS NULL THEN NULL
    WHEN (NOW() - naranja_timestamp) >= INTERVAL '120 hours' THEN 0
    ELSE EXTRACT(EPOCH FROM (INTERVAL '120 hours' - (NOW() - naranja_timestamp))) / 3600
  END AS horas_restantes
FROM locales
WHERE estado = 'naranja'
  AND naranja_timestamp IS NOT NULL
ORDER BY horas_restantes NULLS LAST;
-- Expected: Locales con horas_restantes calculadas correctamente
*/

-- ============================================================================
-- ROLLBACK (Solo ejecutar si necesitas revertir cambios)
-- ============================================================================

/*
-- ADVERTENCIA: Esto eliminará los campos y el trigger

-- Eliminar trigger
DROP TRIGGER IF EXISTS trigger_manage_naranja_timer ON locales;
DROP FUNCTION IF EXISTS manage_naranja_timer();

-- Eliminar índice
DROP INDEX IF EXISTS idx_locales_naranja_expired;

-- Eliminar columnas
ALTER TABLE locales DROP COLUMN IF EXISTS naranja_timestamp;
ALTER TABLE locales DROP COLUMN IF EXISTS naranja_vendedor_id;
*/

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

/*
1. TIMER DE 120 HORAS:
   - Inicia cuando local cambia a NARANJA (naranja_timestamp se setea automáticamente)
   - Después de 120 horas, backend auto-libera a VERDE (via función autoLiberarLocalesExpirados())
   - Trigger limpia campos cuando local sale de NARANJA

2. EXCLUSIVIDAD:
   - Solo UN vendedor puede tener local en NARANJA
   - naranja_vendedor_id registra quién puso en NARANJA
   - Backend valida que otro vendedor no pueda cambiar a NARANJA si ya está tomado

3. PERFORMANCE:
   - Índice parcial idx_locales_naranja_expired optimiza queries de auto-liberación
   - WHERE clause filtra solo locales en NARANJA con timestamp != NULL

4. VALIDACIONES BACKEND:
   - Vendedor NO puede cambiar desde NARANJA (solo jefe_ventas/admin)
   - Timer se reinicia si otro vendedor pone en NARANJA después de auto-liberación
   - Campos se limpian automáticamente al salir de NARANJA

5. FRONTEND:
   - Progress bar azul muestra tiempo restante visualmente (100% → 0%)
   - Badge "Quedan Xd Yh" actualizado cada minuto via polling
   - Auto-liberación se ejecuta cada 60s en polling

6. ESCALABILIDAD:
   - Índice parcial asegura queries O(log n) incluso con 10,000+ locales
   - Trigger no impacta performance (solo 2 campos simples)
*/

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
