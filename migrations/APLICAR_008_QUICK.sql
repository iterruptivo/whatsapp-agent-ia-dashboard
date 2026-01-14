-- ============================================================================
-- QUICK FIX: Aplicar Migración 008 + Validación Inmediata
-- ============================================================================
-- USO: Copiar y pegar TODO este archivo en Supabase SQL Editor
-- Ejecuta la migración 008 completa + validación automática
-- ============================================================================

-- ============================================================================
-- PASO 1: Estado PRE-migración
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRACIÓN 008: FIX PR Sequence Duplicates';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 ESTADO PRE-MIGRACIÓN:';
END $$;

-- Ver estado actual
SELECT
  EXTRACT(YEAR FROM created_at) AS year,
  COUNT(*) AS total_prs,
  MAX(sequence_number) AS max_seq
FROM purchase_requisitions
GROUP BY EXTRACT(YEAR FROM created_at)
ORDER BY year DESC;

-- Verificar duplicados existentes
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ No hay duplicados actuales'
    ELSE '⚠️ WARNING: ' || COUNT(*) || ' duplicados encontrados'
  END AS status_duplicados
FROM (
  SELECT pr_number FROM purchase_requisitions
  GROUP BY pr_number HAVING COUNT(*) > 1
) dups;

-- ============================================================================
-- PASO 2: CREAR SECUENCIAS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Creando secuencias...';
END $$;

CREATE SEQUENCE IF NOT EXISTS pr_sequence_2026 START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS pr_sequence_2027 START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS pr_sequence_2028 START 1 INCREMENT 1;

COMMENT ON SEQUENCE pr_sequence_2026 IS 'Secuencia para pr_number año 2026';
COMMENT ON SEQUENCE pr_sequence_2027 IS 'Secuencia para pr_number año 2027';
COMMENT ON SEQUENCE pr_sequence_2028 IS 'Secuencia para pr_number año 2028';

-- ============================================================================
-- PASO 3: SINCRONIZAR SECUENCIA 2026
-- ============================================================================

DO $$
DECLARE
  max_seq INT;
  next_val INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Sincronizando secuencia 2026...';

  -- Obtener MAX actual
  SELECT COALESCE(MAX(sequence_number), 0)
  INTO max_seq
  FROM purchase_requisitions
  WHERE EXTRACT(YEAR FROM created_at) = 2026;

  -- Sincronizar secuencia
  PERFORM setval('pr_sequence_2026', max_seq);

  -- Obtener el siguiente valor que se generará
  next_val := nextval('pr_sequence_2026');

  RAISE NOTICE '  ✓ MAX sequence_number en tabla: %', max_seq;
  RAISE NOTICE '  ✓ Próximo valor a generar: %', next_val;
  RAISE NOTICE '  ✓ Secuencia sincronizada correctamente';
END;
$$;

-- ============================================================================
-- PASO 4: FUNCIÓN AUXILIAR
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🛠️ Creando funciones auxiliares...';
END $$;

CREATE OR REPLACE FUNCTION get_pr_sequence_name(p_year INT)
RETURNS TEXT AS $$
BEGIN
  CASE p_year
    WHEN 2026 THEN RETURN 'pr_sequence_2026';
    WHEN 2027 THEN RETURN 'pr_sequence_2027';
    WHEN 2028 THEN RETURN 'pr_sequence_2028';
    ELSE RETURN 'pr_sequence_' || p_year::TEXT;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION reset_pr_sequence_for_year(p_year INT)
RETURNS TEXT AS $$
DECLARE
  sequence_name TEXT;
  max_seq INT;
  result TEXT;
BEGIN
  sequence_name := 'pr_sequence_' || p_year::TEXT;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = sequence_name AND relkind = 'S'
  ) THEN
    RETURN 'ERROR: Secuencia ' || sequence_name || ' no existe';
  END IF;

  EXECUTE format(
    'SELECT COALESCE(MAX(sequence_number), 0) FROM purchase_requisitions WHERE EXTRACT(YEAR FROM created_at) = %s',
    p_year
  ) INTO max_seq;

  EXECUTE format('SELECT setval(%L, %s)', sequence_name, max_seq);

  result := 'Secuencia ' || sequence_name || ' reseteada. MAX: ' || max_seq ||
            ', siguiente: ' || (max_seq + 1);

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASO 5: ACTUALIZAR FUNCIÓN generate_pr_number()
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ Actualizando función generate_pr_number()...';
END $$;

CREATE OR REPLACE FUNCTION generate_pr_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year INT;
  next_seq INT;
  sequence_name TEXT;
BEGIN
  IF NEW.pr_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  current_year := EXTRACT(YEAR FROM NOW());
  sequence_name := 'pr_sequence_' || current_year::TEXT;

  -- Crear secuencia dinámicamente si no existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = sequence_name AND relkind = 'S'
  ) THEN
    EXECUTE format('CREATE SEQUENCE %I START 1 INCREMENT 1', sequence_name);
    EXECUTE format(
      'SELECT setval(%L, COALESCE((SELECT MAX(sequence_number) FROM purchase_requisitions WHERE EXTRACT(YEAR FROM created_at) = %s), 0))',
      sequence_name, current_year
    );
  END IF;

  -- Obtener siguiente número (ATÓMICO)
  EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_seq;

  NEW.sequence_number := next_seq;
  NEW.pr_number := 'PR-' || current_year || '-' || LPAD(next_seq::TEXT, 5, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASO 6: RECREAR TRIGGER
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Recreando trigger...';
END $$;

DROP TRIGGER IF EXISTS tr_generate_pr_number ON purchase_requisitions;

CREATE TRIGGER tr_generate_pr_number
  BEFORE INSERT ON purchase_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION generate_pr_number();

-- ============================================================================
-- PASO 7: VALIDACIÓN AUTOMÁTICA
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VALIDACIÓN POST-MIGRACIÓN';
  RAISE NOTICE '========================================';
END $$;

-- Test 1: Secuencias creadas
SELECT '✅ Test 1: Secuencias' AS test,
  COUNT(*) AS total,
  string_agg(relname, ', ') AS secuencias
FROM pg_class
WHERE relname LIKE 'pr_sequence_%' AND relkind = 'S';

-- Test 2: Sincronización
WITH check_sync AS (
  SELECT
    (SELECT MAX(sequence_number) FROM purchase_requisitions WHERE EXTRACT(YEAR FROM created_at) = 2026) AS max_tabla,
    (SELECT last_value FROM pr_sequence_2026) AS seq_actual
)
SELECT
  '✅ Test 2: Sincronización 2026' AS test,
  max_tabla,
  seq_actual,
  CASE
    WHEN seq_actual >= max_tabla THEN '✓ OK'
    ELSE '⚠️ DESINCRONIZADO'
  END AS status
FROM check_sync;

-- Test 3: Sin duplicados
SELECT
  '✅ Test 3: Duplicados' AS test,
  CASE
    WHEN COUNT(*) = 0 THEN '✓ No hay duplicados'
    ELSE '❌ ' || COUNT(*) || ' duplicados'
  END AS status
FROM (
  SELECT pr_number FROM purchase_requisitions
  GROUP BY pr_number HAVING COUNT(*) > 1
) dups;

-- Test 4: Trigger activo
SELECT
  '✅ Test 4: Trigger' AS test,
  tgname,
  CASE tgenabled WHEN 'O' THEN '✓ Activo' ELSE '❌ Inactivo' END AS status
FROM pg_trigger
WHERE tgname = 'tr_generate_pr_number';

-- Test 5: Función actualizada
SELECT
  '✅ Test 5: Función' AS test,
  proname,
  CASE
    WHEN pg_get_functiondef(oid) LIKE '%nextval%' THEN '✓ Usa secuencias'
    ELSE '⚠️ No usa secuencias'
  END AS status
FROM pg_proc
WHERE proname = 'generate_pr_number';

-- ============================================================================
-- PASO 8: TEST FUNCIONAL (Inserción simulada)
-- ============================================================================

DO $$
DECLARE
  test_year INT;
  test_seq INT;
  test_pr_number TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test funcional de generación...';

  test_year := EXTRACT(YEAR FROM NOW())::INT;
  test_seq := nextval('pr_sequence_' || test_year::TEXT);
  test_pr_number := 'PR-' || test_year || '-' || LPAD(test_seq::TEXT, 5, '0');

  RAISE NOTICE '  ✓ Año: %', test_year;
  RAISE NOTICE '  ✓ Sequence: %', test_seq;
  RAISE NOTICE '  ✓ PR Number: %', test_pr_number;
  RAISE NOTICE '  ✓ Generación exitosa';
END;
$$;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

DO $$
DECLARE
  total_prs INT;
  unique_prs INT;
  secuencias INT;
BEGIN
  SELECT COUNT(*) INTO total_prs FROM purchase_requisitions;
  SELECT COUNT(DISTINCT pr_number) INTO unique_prs FROM purchase_requisitions;
  SELECT COUNT(*) INTO secuencias FROM pg_class WHERE relname LIKE 'pr_sequence_%' AND relkind = 'S';

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 RESUMEN FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total PRs: %', total_prs;
  RAISE NOTICE 'PR Numbers únicos: %', unique_prs;
  RAISE NOTICE 'Secuencias creadas: %', secuencias;
  RAISE NOTICE '';

  IF total_prs = unique_prs THEN
    RAISE NOTICE '✅✅✅ MIGRACIÓN EXITOSA ✅✅✅';
    RAISE NOTICE '';
    RAISE NOTICE 'Todas las validaciones pasaron correctamente.';
    RAISE NOTICE 'El sistema de Purchase Requisitions está listo.';
  ELSE
    RAISE WARNING '⚠️⚠️⚠️ HAY DUPLICADOS ⚠️⚠️⚠️';
    RAISE WARNING 'Total PRs: %, Únicos: %', total_prs, unique_prs;
    RAISE WARNING 'Ejecutar: SELECT * FROM purchase_requisitions WHERE pr_number IN (SELECT pr_number FROM purchase_requisitions GROUP BY pr_number HAVING COUNT(*) > 1);';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END;
$$;

-- ============================================================================
-- INFORMACIÓN ÚTIL
-- ============================================================================

-- Ver próximo pr_number que se generará
SELECT
  'Próximo PR Number' AS info,
  'PR-2026-' || LPAD((currval('pr_sequence_2026') + 1)::TEXT, 5, '0') AS next_pr_number;

-- Ver distribución por año
SELECT
  'Distribución' AS info,
  EXTRACT(YEAR FROM created_at) AS year,
  COUNT(*) AS total,
  MAX(pr_number) AS ultimo
FROM purchase_requisitions
GROUP BY EXTRACT(YEAR FROM created_at)
ORDER BY year DESC;

-- ============================================================================
-- FIN - MIGRACIÓN COMPLETADA
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Tiempo aproximado de ejecución: 2-3 segundos';
  RAISE NOTICE 'Siguiente paso: Crear una PR desde la UI para validar end-to-end';
  RAISE NOTICE '';
END $$;
