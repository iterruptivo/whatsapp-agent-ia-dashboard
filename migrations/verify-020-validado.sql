-- =============================================================================
-- Script de Verificación: Migración 020 - Verificado → Validado
-- Propósito: Validar que la migración se ejecutó correctamente
-- Uso: Ejecutar después de aplicar migrations/020_verificado_a_validado.sql
-- =============================================================================

\echo '======================================================================='
\echo 'VERIFICACIÓN DE MIGRACIÓN 020: VERIFICADO → VALIDADO'
\echo '======================================================================='
\echo ''

-- =============================================================================
-- TEST 1: Verificar que las columnas viejas NO existen
-- =============================================================================

\echo '--- TEST 1: Columnas viejas removidas ---'

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'depositos_ficha'
  AND column_name IN (
    'verificado_finanzas',
    'verificado_finanzas_por',
    'verificado_finanzas_at',
    'verificado_finanzas_nombre'
  );

  IF v_count = 0 THEN
    RAISE NOTICE 'OK - Las columnas viejas "verificado_*" fueron removidas correctamente';
  ELSE
    RAISE WARNING 'FAIL - Aún existen % columnas con nombre "verificado_*"', v_count;
  END IF;
END $$;

\echo ''

-- =============================================================================
-- TEST 2: Verificar que las columnas nuevas existen
-- =============================================================================

\echo '--- TEST 2: Columnas nuevas creadas ---'

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'depositos_ficha'
  AND column_name IN (
    'validado_finanzas',
    'validado_finanzas_por',
    'validado_finanzas_at',
    'validado_finanzas_nombre'
  );

  IF v_count = 4 THEN
    RAISE NOTICE 'OK - Las 4 columnas "validado_*" existen correctamente';
  ELSE
    RAISE WARNING 'FAIL - Solo existen % de 4 columnas esperadas', v_count;
  END IF;
END $$;

\echo ''

-- =============================================================================
-- TEST 3: Verificar tipos de datos correctos
-- =============================================================================

\echo '--- TEST 3: Tipos de datos correctos ---'

WITH expected_types AS (
  SELECT 'validado_finanzas' AS col, 'boolean' AS expected_type
  UNION ALL
  SELECT 'validado_finanzas_por', 'uuid'
  UNION ALL
  SELECT 'validado_finanzas_at', 'timestamp with time zone'
  UNION ALL
  SELECT 'validado_finanzas_nombre', 'character varying'
),
actual_types AS (
  SELECT
    column_name AS col,
    CASE
      WHEN data_type = 'character varying' THEN 'character varying'
      WHEN data_type = 'timestamp with time zone' THEN 'timestamp with time zone'
      WHEN data_type = 'boolean' THEN 'boolean'
      WHEN data_type = 'uuid' THEN 'uuid'
      ELSE data_type
    END AS actual_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = 'depositos_ficha'
  AND column_name LIKE 'validado_finanzas%'
)
SELECT
  e.col AS columna,
  e.expected_type AS tipo_esperado,
  COALESCE(a.actual_type, 'NO EXISTE') AS tipo_actual,
  CASE
    WHEN a.actual_type = e.expected_type THEN 'OK'
    WHEN a.actual_type IS NULL THEN 'FAIL - NO EXISTE'
    ELSE 'FAIL - TIPO INCORRECTO'
  END AS status
FROM expected_types e
LEFT JOIN actual_types a ON e.col = a.col
ORDER BY e.col;

\echo ''

-- =============================================================================
-- TEST 4: Verificar índices renombrados
-- =============================================================================

\echo '--- TEST 4: Índices renombrados ---'

DO $$
DECLARE
  v_old_exists BOOLEAN;
  v_new_exists BOOLEAN;
BEGIN
  -- Verificar índice viejo NO existe
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'depositos_ficha'
    AND indexname = 'idx_depositos_ficha_pendientes'
  ) INTO v_old_exists;

  -- Verificar índice nuevo SÍ existe
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'depositos_ficha'
    AND indexname = 'idx_depositos_ficha_no_validados'
  ) INTO v_new_exists;

  IF NOT v_old_exists AND v_new_exists THEN
    RAISE NOTICE 'OK - Índice renombrado correctamente: idx_depositos_ficha_pendientes → idx_depositos_ficha_no_validados';
  ELSIF v_old_exists THEN
    RAISE WARNING 'FAIL - El índice viejo "idx_depositos_ficha_pendientes" aún existe';
  ELSIF NOT v_new_exists THEN
    RAISE WARNING 'FAIL - El índice nuevo "idx_depositos_ficha_no_validados" no existe';
  END IF;
END $$;

\echo ''

-- =============================================================================
-- TEST 5: Verificar índice parcial funciona
-- =============================================================================

\echo '--- TEST 5: Índice parcial funciona ---'

DO $$
DECLARE
  v_indexdef TEXT;
BEGIN
  SELECT indexdef
  INTO v_indexdef
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename = 'depositos_ficha'
  AND indexname = 'idx_depositos_ficha_no_validados';

  IF v_indexdef LIKE '%WHERE%validado_finanzas = false%' THEN
    RAISE NOTICE 'OK - Índice parcial con condición correcta';
    RAISE NOTICE '     Definición: %', v_indexdef;
  ELSE
    RAISE WARNING 'FAIL - Índice parcial no tiene la condición correcta';
    RAISE WARNING '       Definición actual: %', COALESCE(v_indexdef, 'NO EXISTE');
  END IF;
END $$;

\echo ''

-- =============================================================================
-- TEST 6: Verificar plan de ejecución usa índice
-- =============================================================================

\echo '--- TEST 6: Plan de ejecución usa índice ---'
\echo 'Ejecutando EXPLAIN para query de depósitos no validados...'
\echo ''

EXPLAIN (COSTS OFF, VERBOSE OFF)
SELECT id, monto, fecha_comprobante
FROM depositos_ficha
WHERE validado_finanzas = false
LIMIT 10;

\echo ''
\echo 'NOTA: Debe aparecer "idx_depositos_ficha_no_validados" en el plan'
\echo ''

-- =============================================================================
-- TEST 7: Verificar comentarios actualizados
-- =============================================================================

\echo '--- TEST 7: Comentarios actualizados ---'

DO $$
DECLARE
  v_comment TEXT;
BEGIN
  SELECT obj_description(oid)
  INTO v_comment
  FROM pg_class
  WHERE relname = 'depositos_ficha'
  AND relnamespace = 'public'::regnamespace;

  IF v_comment LIKE '%Validación%' OR v_comment LIKE '%validación%' THEN
    RAISE NOTICE 'OK - Comentario de tabla actualizado con término "validación"';
  ELSE
    RAISE NOTICE 'INFO - Comentario de tabla: %', COALESCE(v_comment, 'SIN COMENTARIO');
  END IF;
END $$;

\echo ''

-- =============================================================================
-- TEST 8: Verificar datos preservados (si hay datos)
-- =============================================================================

\echo '--- TEST 8: Datos preservados ---'

DO $$
DECLARE
  v_total_depositos INTEGER;
  v_validados INTEGER;
  v_no_validados INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_depositos FROM depositos_ficha;
  SELECT COUNT(*) INTO v_validados FROM depositos_ficha WHERE validado_finanzas = true;
  SELECT COUNT(*) INTO v_no_validados FROM depositos_ficha WHERE validado_finanzas = false;

  RAISE NOTICE 'Total de depósitos: %', v_total_depositos;
  RAISE NOTICE 'Depósitos validados: %', v_validados;
  RAISE NOTICE 'Depósitos no validados: %', v_no_validados;

  IF (v_validados + v_no_validados) = v_total_depositos THEN
    RAISE NOTICE 'OK - Todos los depósitos tienen valor válido en validado_finanzas';
  ELSE
    RAISE WARNING 'FAIL - Hay depósitos con validado_finanzas NULL';
  END IF;
END $$;

\echo ''

-- =============================================================================
-- TEST 9: Verificar foreign keys intactas
-- =============================================================================

\echo '--- TEST 9: Foreign keys intactas ---'

SELECT
  tc.constraint_name AS fk_name,
  kcu.column_name AS columna,
  ccu.table_name AS tabla_referenciada,
  ccu.column_name AS columna_referenciada,
  'OK' AS status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name = 'depositos_ficha'
AND kcu.column_name = 'validado_finanzas_por';

\echo ''

-- =============================================================================
-- TEST 10: Query funcional end-to-end
-- =============================================================================

\echo '--- TEST 10: Query funcional end-to-end ---'

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Query típica de Finanzas: depósitos pendientes de validación
  SELECT COUNT(*)
  INTO v_count
  FROM depositos_ficha
  WHERE validado_finanzas = false
  AND proyecto_id IS NOT NULL;

  RAISE NOTICE 'OK - Query funcional ejecutada: % depósitos pendientes de validación', v_count;
END $$;

\echo ''

-- =============================================================================
-- RESUMEN FINAL
-- =============================================================================

\echo '======================================================================='
\echo 'RESUMEN DE VERIFICACIÓN'
\echo '======================================================================='
\echo ''
\echo 'Si todos los tests muestran "OK", la migración fue exitosa.'
\echo ''
\echo 'PRÓXIMOS PASOS:'
\echo '  1. Actualizar código TypeScript en lib/actions-depositos-ficha.ts'
\echo '  2. Buscar y reemplazar "verificado_finanzas" → "validado_finanzas"'
\echo '  3. Ejecutar tests de integración'
\echo '  4. Desplegar a producción'
\echo ''
\echo '======================================================================='
