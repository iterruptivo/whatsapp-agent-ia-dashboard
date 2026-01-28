-- =============================================================================
-- MIGRATION 038: Arreglar indice_original NULL en depositos_ficha
-- =============================================================================
-- Descripción: Asigna indice_original secuencial a los 66 registros que tienen NULL
-- Flujo:
--   1. Para cada ficha_id, obtiene el max(indice_original) existente
--   2. Para los registros con NULL, asigna índices secuenciales continuando
--      desde max_idx + 1, ordenados por created_at ASC
-- =============================================================================

BEGIN;

-- CTE 1: Identificar todos los depósitos sin índice, ordenados por ficha y fecha
WITH depositos_sin_indice AS (
  SELECT
    d.id,
    d.ficha_id,
    d.created_at,
    ROW_NUMBER() OVER (PARTITION BY d.ficha_id ORDER BY d.created_at) as rn
  FROM depositos_ficha d
  WHERE d.indice_original IS NULL
),
-- CTE 2: Obtener el máximo índice actual por ficha (para los que SÍ tienen índice)
max_indices AS (
  SELECT
    ficha_id,
    COALESCE(MAX(indice_original), -1) as max_idx
  FROM depositos_ficha
  WHERE indice_original IS NOT NULL
  GROUP BY ficha_id
)
-- UPDATE: Asignar índices secuenciales continuando desde max_idx + 1
UPDATE depositos_ficha d
SET indice_original = COALESCE(m.max_idx, -1) + dsi.rn
FROM depositos_sin_indice dsi
LEFT JOIN max_indices m ON m.ficha_id = dsi.ficha_id
WHERE d.id = dsi.id;

-- Verificación: Contar cuántos se actualizaron
DO $$
DECLARE
  registros_actualizados INTEGER;
BEGIN
  SELECT COUNT(*) INTO registros_actualizados
  FROM depositos_ficha
  WHERE indice_original IS NOT NULL;

  RAISE NOTICE 'MIGRATION 038: % depósitos ahora tienen indice_original asignado', registros_actualizados;
END $$;

COMMIT;

-- =============================================================================
-- VALIDACIÓN POST-MIGRACIÓN
-- =============================================================================
-- Verificar que no queden NULLs
SELECT
  COUNT(*) as total_nulos,
  COUNT(DISTINCT ficha_id) as fichas_afectadas
FROM depositos_ficha
WHERE indice_original IS NULL;

-- Verificar que los índices sean secuenciales por ficha
SELECT
  ficha_id,
  COUNT(*) as total_depositos,
  MIN(indice_original) as min_idx,
  MAX(indice_original) as max_idx,
  CASE
    WHEN MAX(indice_original) - MIN(indice_original) + 1 = COUNT(*) THEN 'OK'
    ELSE 'GAP DETECTADO'
  END as validacion
FROM depositos_ficha
GROUP BY ficha_id
HAVING COUNT(*) > 1
ORDER BY ficha_id;
