-- ============================================================================
-- MIGRACIÓN 008: FIX PR Sequence - Eliminar duplicados y usar SEQUENCE
-- ============================================================================
-- Fecha: 14 Enero 2026
-- Problema: generate_pr_number() genera duplicados con MAX(sequence_number) + 1
-- Error: "duplicate key value violates unique constraint purchase_requisitions_pr_number_key"
-- Causa: Race conditions cuando múltiples inserts concurrentes usan MAX() + 1
-- Solución: Usar secuencias PostgreSQL dedicadas por año
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear secuencias para cada año (2026, 2027, futuro)
-- ============================================================================

-- Secuencia para 2026
CREATE SEQUENCE IF NOT EXISTS pr_sequence_2026 START 1 INCREMENT 1;

-- Secuencia para 2027 (preparación anticipada)
CREATE SEQUENCE IF NOT EXISTS pr_sequence_2027 START 1 INCREMENT 1;

-- Secuencia para 2028 (preparación anticipada)
CREATE SEQUENCE IF NOT EXISTS pr_sequence_2028 START 1 INCREMENT 1;

COMMENT ON SEQUENCE pr_sequence_2026 IS 'Secuencia para pr_number año 2026';
COMMENT ON SEQUENCE pr_sequence_2027 IS 'Secuencia para pr_number año 2027';
COMMENT ON SEQUENCE pr_sequence_2028 IS 'Secuencia para pr_number año 2028';

-- ============================================================================
-- PASO 2: Sincronizar secuencia 2026 con el MAX actual
-- ============================================================================

-- Obtener el máximo sequence_number actual para 2026
DO $$
DECLARE
  max_seq INT;
BEGIN
  -- Obtener MAX de sequence_number para 2026
  SELECT COALESCE(MAX(sequence_number), 0)
  INTO max_seq
  FROM purchase_requisitions
  WHERE EXTRACT(YEAR FROM created_at) = 2026;

  -- Sincronizar la secuencia con el máximo + 1
  PERFORM setval('pr_sequence_2026', max_seq);

  RAISE NOTICE 'Secuencia pr_sequence_2026 sincronizada. MAX actual: %, siguiente valor: %',
    max_seq, nextval('pr_sequence_2026');
END;
$$;

-- ============================================================================
-- PASO 3: Función auxiliar para obtener la secuencia del año
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pr_sequence_name(p_year INT)
RETURNS TEXT AS $$
BEGIN
  -- Retornar el nombre de la secuencia según el año
  -- Si el año no tiene secuencia, usar la del año actual
  CASE p_year
    WHEN 2026 THEN RETURN 'pr_sequence_2026';
    WHEN 2027 THEN RETURN 'pr_sequence_2027';
    WHEN 2028 THEN RETURN 'pr_sequence_2028';
    ELSE
      -- Para años futuros no previstos, usar la secuencia del año actual
      -- Esto requiere crear la secuencia dinámicamente
      RETURN 'pr_sequence_' || p_year::TEXT;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_pr_sequence_name IS 'Retorna el nombre de la secuencia de PR para un año específico';

-- ============================================================================
-- PASO 4: Nueva función generate_pr_number() con SEQUENCE
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_pr_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year INT;
  next_seq INT;
  sequence_name TEXT;
BEGIN
  -- Solo generar si no existe pr_number (para permitir override manual si es necesario)
  IF NEW.pr_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Año actual
  current_year := EXTRACT(YEAR FROM NOW());

  -- Crear secuencia dinámicamente si no existe (para años futuros)
  sequence_name := 'pr_sequence_' || current_year::TEXT;

  -- Verificar si la secuencia existe, si no, crearla
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = sequence_name
    AND relkind = 'S'
  ) THEN
    -- Crear la secuencia dinámicamente
    EXECUTE format('CREATE SEQUENCE %I START 1 INCREMENT 1', sequence_name);

    -- Sincronizar con el MAX actual de ese año
    EXECUTE format(
      'SELECT setval(%L, COALESCE((SELECT MAX(sequence_number) FROM purchase_requisitions WHERE EXTRACT(YEAR FROM created_at) = %s), 0))',
      sequence_name,
      current_year
    );
  END IF;

  -- Obtener el siguiente número de la secuencia (ATÓMICO, sin race conditions)
  EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_seq;

  -- Asignar valores
  NEW.sequence_number := next_seq;
  NEW.pr_number := 'PR-' || current_year || '-' || LPAD(next_seq::TEXT, 5, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_pr_number IS
'Genera pr_number usando secuencias PostgreSQL (garantiza unicidad, sin race conditions)';

-- ============================================================================
-- PASO 5: Recrear el trigger (para asegurar que usa la función actualizada)
-- ============================================================================

DROP TRIGGER IF EXISTS tr_generate_pr_number ON purchase_requisitions;

CREATE TRIGGER tr_generate_pr_number
  BEFORE INSERT ON purchase_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION generate_pr_number();

COMMENT ON TRIGGER tr_generate_pr_number ON purchase_requisitions IS
'Genera automáticamente pr_number usando secuencia dedicada por año';

-- ============================================================================
-- PASO 6: Función de mantenimiento - Resetear secuencia de un año
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_pr_sequence_for_year(p_year INT)
RETURNS TEXT AS $$
DECLARE
  sequence_name TEXT;
  max_seq INT;
  result TEXT;
BEGIN
  sequence_name := 'pr_sequence_' || p_year::TEXT;

  -- Verificar que la secuencia existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = sequence_name
    AND relkind = 'S'
  ) THEN
    RETURN 'ERROR: La secuencia ' || sequence_name || ' no existe';
  END IF;

  -- Obtener el MAX actual de sequence_number para ese año
  EXECUTE format(
    'SELECT COALESCE(MAX(sequence_number), 0) FROM purchase_requisitions WHERE EXTRACT(YEAR FROM created_at) = %s',
    p_year
  ) INTO max_seq;

  -- Resetear la secuencia al MAX actual
  EXECUTE format('SELECT setval(%L, %s)', sequence_name, max_seq);

  result := 'Secuencia ' || sequence_name || ' reseteada. MAX actual: ' || max_seq ||
            ', siguiente valor será: ' || (max_seq + 1);

  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_pr_sequence_for_year IS
'Función de mantenimiento: resetea la secuencia de PR de un año al MAX actual de la base de datos';

-- ============================================================================
-- PASO 7: VERIFICACIÓN - Consultas de validación
-- ============================================================================

-- Verificar secuencias creadas
SELECT
  c.relname AS sequence_name,
  pg_sequence_last_value(c.oid) AS last_value
FROM pg_class c
WHERE c.relname LIKE 'pr_sequence_%'
  AND c.relkind = 'S'
ORDER BY c.relname;

-- Verificar distribución de PRs por año
SELECT
  EXTRACT(YEAR FROM created_at) AS year,
  COUNT(*) AS total_prs,
  MAX(sequence_number) AS max_sequence,
  MAX(pr_number) AS last_pr_number
FROM purchase_requisitions
GROUP BY EXTRACT(YEAR FROM created_at)
ORDER BY year DESC;

-- Verificar si hay duplicados en pr_number (debe retornar 0 filas)
SELECT
  pr_number,
  COUNT(*) AS duplicates
FROM purchase_requisitions
GROUP BY pr_number
HAVING COUNT(*) > 1;

-- Verificar que el trigger está activo
SELECT
  tgname AS trigger_name,
  tgenabled AS enabled,
  pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgname = 'tr_generate_pr_number';

-- ============================================================================
-- PASO 8: Test rápido (comentado, ejecutar manualmente si se desea)
-- ============================================================================

/*
-- Test: Crear una PR de prueba para verificar que funciona
INSERT INTO purchase_requisitions (
  requester_id,
  requester_name,
  requester_department,
  title,
  category_id,
  priority,
  required_by_date,
  item_description,
  quantity,
  unit_price,
  currency,
  total_amount,
  justification,
  status
)
VALUES (
  (SELECT id FROM usuarios WHERE email = 'gerente.ti@ecoplaza.com.pe' LIMIT 1),
  'Test User',
  'IT',
  'Test PR - Verificar secuencia',
  (SELECT id FROM pr_categories WHERE code = 'IT' LIMIT 1),
  'normal',
  NOW() + INTERVAL '7 days',
  'Item de prueba para verificar la secuencia',
  1,
  100,
  'PEN',
  100,
  'Verificar que la secuencia funciona correctamente',
  'draft'
)
RETURNING id, pr_number, sequence_number;

-- Eliminar la PR de prueba después de verificar
-- DELETE FROM purchase_requisitions WHERE title = 'Test PR - Verificar secuencia';
*/

-- ============================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================================================

-- 1. SECUENCIAS POSTGRESQL:
--    - Son objetos atómicos: nextval() es thread-safe
--    - Garantizan unicidad incluso con inserts concurrentes
--    - No tienen overhead de locks como FOR UPDATE
--    - Son la solución estándar para números secuenciales

-- 2. RACE CONDITIONS ELIMINADAS:
--    - ANTES: MAX(sequence_number) + 1 podía generar duplicados si:
--      * Usuario A lee MAX = 5
--      * Usuario B lee MAX = 5
--      * Usuario A inserta con seq 6
--      * Usuario B inserta con seq 6 → DUPLICATE KEY ERROR
--    - AHORA: nextval() es atómico, no puede generar duplicados

-- 3. SECUENCIAS POR AÑO:
--    - Cada año tiene su propia secuencia: pr_sequence_2026, pr_sequence_2027, etc.
--    - Si llega un año no previsto, se crea dinámicamente
--    - Sincronización automática con MAX actual al crear

-- 4. MANTENIMIENTO:
--    - reset_pr_sequence_for_year(2026): resetear secuencia si hay inconsistencias
--    - Ejemplo: SELECT reset_pr_sequence_for_year(2026);

-- 5. PERFORMANCE:
--    - nextval() es extremadamente rápido (microsegundos)
--    - No requiere locks de tabla ni escaneo completo
--    - Mucho más eficiente que MAX() + 1

-- 6. COMPATIBILIDAD CON RLS:
--    - Las secuencias no están sujetas a RLS
--    - nextval() funciona independientemente de las políticas
--    - No requiere FOR UPDATE (que causa conflictos con RLS)

-- 7. ROLLBACK:
--    - Si se necesita revertir, ejecutar la migración 006 nuevamente
--    - Las secuencias existentes no se eliminan automáticamente
--    - Para limpiar: DROP SEQUENCE pr_sequence_2026 CASCADE;

-- ============================================================================
-- COMANDOS DE EMERGENCIA
-- ============================================================================

-- Si hay inconsistencias, resetear todas las secuencias:
/*
SELECT reset_pr_sequence_for_year(2026);
SELECT reset_pr_sequence_for_year(2027);
SELECT reset_pr_sequence_for_year(2028);
*/

-- Ver el siguiente valor que se generará (sin consumirlo):
/*
SELECT
  'pr_sequence_2026' AS sequence,
  last_value,
  last_value + 1 AS next_value
FROM pr_sequence_2026;
*/

-- Forzar sincronización manual si es necesario:
/*
SELECT setval('pr_sequence_2026',
  (SELECT COALESCE(MAX(sequence_number), 0) FROM purchase_requisitions
   WHERE EXTRACT(YEAR FROM created_at) = 2026)
);
*/

-- ============================================================================
-- FIN DE LA MIGRACIÓN 008
-- ============================================================================
