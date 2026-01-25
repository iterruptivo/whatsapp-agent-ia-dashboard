-- =====================================================
-- MIGRACIÓN 024: Soporte de Pisos para Locales
-- =====================================================
-- Permite que códigos de locales se repitan entre pisos
-- Constraint UNIQUE cambia de (codigo) a (codigo, proyecto_id, piso)
-- =====================================================

-- PASO 1: Agregar columna piso (NULL = sin piso)
ALTER TABLE locales ADD COLUMN IF NOT EXISTS piso VARCHAR(10) DEFAULT NULL;

-- PASO 2: Índice para filtrado rápido por piso
CREATE INDEX IF NOT EXISTS idx_locales_piso ON locales(piso);

-- PASO 3: Eliminar constraints UNIQUE antiguos
ALTER TABLE locales DROP CONSTRAINT IF EXISTS locales_codigo_key;
ALTER TABLE locales DROP CONSTRAINT IF EXISTS locales_codigo_proyecto_unique;

-- PASO 4: Nuevo UNIQUE compuesto (maneja NULLs con COALESCE)
-- Esto permite: mismo codigo en diferentes pisos del mismo proyecto
-- Pero bloquea: mismo codigo + mismo piso + mismo proyecto
CREATE UNIQUE INDEX IF NOT EXISTS uq_locales_codigo_proyecto_piso
ON locales(codigo, proyecto_id, COALESCE(piso, ''));

-- PASO 5: Documentar columna
COMMENT ON COLUMN locales.piso IS 'Piso del local (S1, S2, SS, P1, P2, etc). NULL = proyecto sin pisos';
