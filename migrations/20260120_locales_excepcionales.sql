-- ============================================================================
-- MIGRACIÓN: Locales Excepcionales
-- Fecha: 2026-01-20
-- Propósito: Permitir crear locales "excepcionales" para regularizar ventas
--            duplicadas históricas (ej: A-107-1, A-107-2)
-- ============================================================================

-- Agregar campo es_excepcional a tabla locales
ALTER TABLE locales
ADD COLUMN IF NOT EXISTS es_excepcional BOOLEAN DEFAULT false;

-- Índice parcial para filtrar rápidamente locales excepcionales
CREATE INDEX IF NOT EXISTS idx_locales_es_excepcional
ON locales(es_excepcional)
WHERE es_excepcional = true;

-- Comentario descriptivo
COMMENT ON COLUMN locales.es_excepcional IS 'Local creado manualmente para regularizar ventas duplicadas (ej: A-107-1, A-107-2)';

-- Verificación
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'locales'
  AND column_name = 'es_excepcional';
