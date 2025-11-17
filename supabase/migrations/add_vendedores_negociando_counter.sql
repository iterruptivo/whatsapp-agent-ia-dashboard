-- ============================================================================
-- SQL MIGRATION: Contador de vendedores negociando (estado AMARILLO)
-- ============================================================================
-- Fecha: 17 Noviembre 2025
-- Sesión: 48D
-- Objetivo: Tracking de vendedores negociando un local en tiempo real
-- ============================================================================

-- Agregar columna para tracking de vendedores negociando
ALTER TABLE locales
ADD COLUMN IF NOT EXISTS vendedores_negociando_ids uuid[] DEFAULT '{}';

COMMENT ON COLUMN locales.vendedores_negociando_ids IS
'Array de IDs de vendedores que están negociando este local (estado AMARILLO). Se resetea cuando local sale de AMARILLO.';

-- Índice GIN para queries eficientes en arrays
CREATE INDEX IF NOT EXISTS idx_locales_vendedores_negociando
ON locales USING GIN (vendedores_negociando_ids);

COMMENT ON INDEX idx_locales_vendedores_negociando IS
'Índice para queries eficientes sobre vendedores negociando (array contains, etc.)';

-- ============================================================================
-- TRIGGER para limpiar array automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION manage_vendedores_negociando()
RETURNS TRIGGER AS $$
BEGIN
  -- Si local SALE de AMARILLO → resetear array a vacío
  IF OLD.estado = 'amarillo' AND NEW.estado != 'amarillo' THEN
    NEW.vendedores_negociando_ids = '{}';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_manage_vendedores_negociando ON locales;
CREATE TRIGGER trigger_manage_vendedores_negociando
  BEFORE UPDATE ON locales
  FOR EACH ROW
  EXECUTE FUNCTION manage_vendedores_negociando();

COMMENT ON FUNCTION manage_vendedores_negociando() IS
'Trigger que limpia automáticamente el array vendedores_negociando_ids cuando local sale de estado AMARILLO';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar columna creada
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'locales'
  AND column_name = 'vendedores_negociando_ids';
-- Expected: 1 row (uuid[], default '{}')

-- Verificar índice creado
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'locales'
  AND indexname = 'idx_locales_vendedores_negociando';
-- Expected: 1 row (GIN index)

-- Verificar trigger creado
SELECT trigger_name, event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'locales'
  AND trigger_name = 'trigger_manage_vendedores_negociando';
-- Expected: 1 row (BEFORE UPDATE)
