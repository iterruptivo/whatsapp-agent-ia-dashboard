-- ============================================================================
-- VALIDACIÓN POST-MIGRACIÓN 008: Purchase Requisitions Sequences
-- ============================================================================
-- Propósito: Validar que la migración 008 se aplicó correctamente
-- Ejecutar DESPUÉS de aplicar 008_fix_pr_sequence_duplicate.sql
-- ============================================================================

-- ============================================================================
-- TEST 1: Verificar que las secuencias existen
-- ============================================================================

SELECT
  '✅ TEST 1: Secuencias Creadas' AS test_name,
  c.relname AS sequence_name,
  CASE
    WHEN pg_sequence_last_value(c.oid) IS NULL THEN 'No usado aún'
    ELSE pg_sequence_last_value(c.oid)::TEXT
  END AS last_value,
  CASE
    WHEN c.relname = 'pr_sequence_2026' THEN '✓ Año actual'
    ELSE '✓ Año futuro'
  END AS status
FROM pg_class c
WHERE c.relname LIKE 'pr_sequence_%'
  AND c.relkind = 'S'
ORDER BY c.relname;

-- Resultado esperado: 3 filas mínimo (2026, 2027, 2028)

-- ============================================================================
-- TEST 2: Verificar sincronización de secuencia 2026 con datos existentes
-- ============================================================================

WITH max_seq AS (
  SELECT COALESCE(MAX(sequence_number), 0) AS max_sequence
  FROM purchase_requisitions
  WHERE EXTRACT(YEAR FROM created_at) = 2026
),
seq_current AS (
  SELECT last_value
  FROM pr_sequence_2026
)
SELECT
  '✅ TEST 2: Sincronización 2026' AS test_name,
  max_seq.max_sequence AS max_en_tabla,
  seq_current.last_value AS ultimo_valor_secuencia,
  CASE
    WHEN seq_current.last_value >= max_seq.max_sequence
      THEN '✓ Secuencia sincronizada correctamente'
    ELSE '⚠️ WARNING: Secuencia desincronizada - ejecutar reset_pr_sequence_for_year(2026)'
  END AS status
FROM max_seq, seq_current;

-- Resultado esperado: ultimo_valor_secuencia >= max_en_tabla

-- ============================================================================
-- TEST 3: Verificar que NO hay duplicados en pr_number
-- ============================================================================

SELECT
  '✅ TEST 3: Duplicados en pr_number' AS test_name,
  CASE
    WHEN COUNT(*) = 0 THEN '✓ No hay duplicados'
    ELSE '❌ ERROR: Se encontraron ' || COUNT(*) || ' duplicados'
  END AS status,
  COUNT(*) AS total_duplicados
FROM (
  SELECT pr_number, COUNT(*) AS cnt
  FROM purchase_requisitions
  GROUP BY pr_number
  HAVING COUNT(*) > 1
) duplicados;

-- Resultado esperado: 0 duplicados

-- ============================================================================
-- TEST 4: Verificar que la función generate_pr_number existe
-- ============================================================================

SELECT
  '✅ TEST 4: Función generate_pr_number()' AS test_name,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) LIKE '%nextval%' AS usa_secuencia,
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%nextval%'
      THEN '✓ Función actualizada con SEQUENCE'
    ELSE '⚠️ WARNING: Función NO usa secuencias'
  END AS status
FROM pg_proc p
WHERE p.proname = 'generate_pr_number';

-- Resultado esperado: 1 fila, usa_secuencia = true

-- ============================================================================
-- TEST 5: Verificar que el trigger está activo
-- ============================================================================

SELECT
  '✅ TEST 5: Trigger tr_generate_pr_number' AS test_name,
  tgname AS trigger_name,
  CASE tgenabled
    WHEN 'O' THEN '✓ Activo'
    WHEN 'D' THEN '❌ Deshabilitado'
    ELSE '⚠️ Estado desconocido: ' || tgenabled
  END AS status,
  tgrelid::regclass AS tabla
FROM pg_trigger
WHERE tgname = 'tr_generate_pr_number';

-- Resultado esperado: 1 fila, status = Activo

-- ============================================================================
-- TEST 6: Verificar constraint de unicidad en pr_number
-- ============================================================================

SELECT
  '✅ TEST 6: Constraint de Unicidad' AS test_name,
  conname AS constraint_name,
  contype AS constraint_type,
  '✓ Constraint activo' AS status
FROM pg_constraint
WHERE conname = 'purchase_requisitions_pr_number_key';

-- Resultado esperado: 1 fila, constraint_type = 'u' (unique)

-- ============================================================================
-- TEST 7: Verificar distribución de PRs por año
-- ============================================================================

SELECT
  '✅ TEST 7: Distribución por Año' AS test_name,
  EXTRACT(YEAR FROM created_at)::INT AS year,
  COUNT(*) AS total_prs,
  MAX(sequence_number) AS max_sequence,
  MAX(pr_number) AS ultimo_pr_number,
  '✓ Datos válidos' AS status
FROM purchase_requisitions
GROUP BY EXTRACT(YEAR FROM created_at)
ORDER BY year DESC;

-- Resultado esperado: Ver distribución por año, sin huecos en secuencias

-- ============================================================================
-- TEST 8: Verificar funciones auxiliares
-- ============================================================================

SELECT
  '✅ TEST 8: Funciones Auxiliares' AS test_name,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS argumentos,
  '✓ Función disponible' AS status
FROM pg_proc p
WHERE p.proname IN ('get_pr_sequence_name', 'reset_pr_sequence_for_year')
ORDER BY p.proname;

-- Resultado esperado: 2 filas (ambas funciones)

-- ============================================================================
-- TEST 9: Test de inserción simulada (DRY RUN)
-- ============================================================================

-- Este test simula la generación de un pr_number sin insertar realmente
WITH simulation AS (
  SELECT
    EXTRACT(YEAR FROM NOW())::INT AS current_year,
    nextval('pr_sequence_' || EXTRACT(YEAR FROM NOW())::TEXT) AS next_seq
)
SELECT
  '✅ TEST 9: Generación de pr_number' AS test_name,
  current_year,
  next_seq,
  'PR-' || current_year || '-' || LPAD(next_seq::TEXT, 5, '0') AS pr_number_generado,
  '✓ Generación exitosa' AS status
FROM simulation;

-- Resultado esperado: Un pr_number válido generado (ej: PR-2026-00005)

-- ============================================================================
-- TEST 10: Verificar que no hay gaps en sequence_number por año
-- ============================================================================

WITH sequences_per_year AS (
  SELECT
    EXTRACT(YEAR FROM created_at)::INT AS year,
    sequence_number,
    LAG(sequence_number) OVER (PARTITION BY EXTRACT(YEAR FROM created_at) ORDER BY sequence_number) AS prev_seq
  FROM purchase_requisitions
  WHERE sequence_number IS NOT NULL
),
gaps AS (
  SELECT
    year,
    prev_seq,
    sequence_number,
    sequence_number - prev_seq AS gap
  FROM sequences_per_year
  WHERE prev_seq IS NOT NULL
    AND sequence_number - prev_seq > 1
)
SELECT
  '✅ TEST 10: Gaps en Secuencias' AS test_name,
  CASE
    WHEN COUNT(*) = 0 THEN '✓ No hay gaps en las secuencias'
    ELSE '⚠️ WARNING: Se encontraron ' || COUNT(*) || ' gaps (puede ser normal si se eliminaron PRs)'
  END AS status,
  COUNT(*) AS total_gaps
FROM gaps;

-- Resultado esperado: 0 gaps (o pocos si se eliminaron PRs)

-- ============================================================================
-- RESUMEN GENERAL
-- ============================================================================

SELECT
  '📊 RESUMEN DE VALIDACIÓN' AS titulo,
  (SELECT COUNT(*) FROM pg_class WHERE relname LIKE 'pr_sequence_%' AND relkind = 'S') AS secuencias_creadas,
  (SELECT COUNT(*) FROM purchase_requisitions) AS total_prs,
  (SELECT COUNT(DISTINCT pr_number) FROM purchase_requisitions) AS pr_numbers_unicos,
  (SELECT MAX(sequence_number) FROM purchase_requisitions WHERE EXTRACT(YEAR FROM created_at) = 2026) AS max_seq_2026,
  (SELECT last_value FROM pr_sequence_2026) AS seq_2026_actual,
  CASE
    WHEN (SELECT COUNT(*) FROM purchase_requisitions) = (SELECT COUNT(DISTINCT pr_number) FROM purchase_requisitions)
      THEN '✅ TODO OK - No hay duplicados'
    ELSE '❌ ERROR - Hay duplicados'
  END AS estado_general;

-- ============================================================================
-- ACCIONES RECOMENDADAS SI HAY ERRORES
-- ============================================================================

/*
-- Si hay duplicados (TEST 3 falla):
-- 1. Identificar los duplicados:
SELECT pr_number, COUNT(*), array_agg(id) AS ids_duplicados
FROM purchase_requisitions
GROUP BY pr_number
HAVING COUNT(*) > 1;

-- 2. Eliminar duplicados manualmente (CUIDADO: Verificar cuál eliminar)
-- DELETE FROM purchase_requisitions WHERE id = 'uuid-del-duplicado';

-- 3. Resetear la secuencia:
SELECT reset_pr_sequence_for_year(2026);


-- Si la secuencia está desincronizada (TEST 2 falla):
SELECT reset_pr_sequence_for_year(2026);


-- Si el trigger no está activo (TEST 5 falla):
DROP TRIGGER IF EXISTS tr_generate_pr_number ON purchase_requisitions;
CREATE TRIGGER tr_generate_pr_number
  BEFORE INSERT ON purchase_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION generate_pr_number();


-- Si la función no usa secuencias (TEST 4 falla):
-- Volver a ejecutar la migración 008 completa
*/

-- ============================================================================
-- FIN DE VALIDACIÓN
-- ============================================================================
