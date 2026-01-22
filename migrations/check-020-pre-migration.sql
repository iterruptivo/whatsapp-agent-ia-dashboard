-- =============================================================================
-- Pre-Migration Check: Migración 020 - Verificado → Validado
-- Propósito: Verificar estado actual ANTES de ejecutar la migración
-- Uso: Ejecutar ANTES de migrations/020_verificado_a_validado.sql
-- =============================================================================

\echo '======================================================================='
\echo 'PRE-MIGRATION CHECK: Estado actual de columnas en depositos_ficha'
\echo '======================================================================='
\echo ''

-- =============================================================================
-- CHECK 1: Mostrar todas las columnas relacionadas con validación/verificación
-- =============================================================================

\echo '--- Columnas existentes en depositos_ficha (validación/verificación) ---'
\echo ''

SELECT
  column_name AS columna,
  data_type AS tipo,
  is_nullable AS nullable,
  column_default AS valor_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'depositos_ficha'
AND (
  column_name LIKE '%verificado%'
  OR column_name LIKE '%validado%'
)
ORDER BY column_name;

\echo ''

-- =============================================================================
-- CHECK 2: Contar registros por estado
-- =============================================================================

\echo '--- Estadísticas de depósitos (si existen) ---'
\echo ''

DO $$
DECLARE
  v_total INTEGER;
  v_verificados INTEGER := 0;
  v_validados INTEGER := 0;
  v_col_verificado BOOLEAN;
  v_col_validado BOOLEAN;
BEGIN
  -- Verificar si existe la columna verificado_finanzas
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'depositos_ficha'
    AND column_name = 'verificado_finanzas'
  ) INTO v_col_verificado;

  -- Verificar si existe la columna validado_finanzas
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'depositos_ficha'
    AND column_name = 'validado_finanzas'
  ) INTO v_col_validado;

  -- Obtener total de depósitos
  SELECT COUNT(*) INTO v_total FROM depositos_ficha;

  RAISE NOTICE '';
  RAISE NOTICE 'Total de depósitos en tabla: %', v_total;
  RAISE NOTICE '';

  -- Si existe columna verificado_finanzas
  IF v_col_verificado THEN
    EXECUTE 'SELECT COUNT(*) FROM depositos_ficha WHERE verificado_finanzas = true'
    INTO v_verificados;
    RAISE NOTICE 'Columna "verificado_finanzas" existe: SÍ';
    RAISE NOTICE '  - Depósitos con verificado_finanzas = true: %', v_verificados;
    RAISE NOTICE '  - Depósitos con verificado_finanzas = false: %', v_total - v_verificados;
  ELSE
    RAISE NOTICE 'Columna "verificado_finanzas" existe: NO';
  END IF;

  RAISE NOTICE '';

  -- Si existe columna validado_finanzas
  IF v_col_validado THEN
    EXECUTE 'SELECT COUNT(*) FROM depositos_ficha WHERE validado_finanzas = true'
    INTO v_validados;
    RAISE NOTICE 'Columna "validado_finanzas" existe: SÍ';
    RAISE NOTICE '  - Depósitos con validado_finanzas = true: %', v_validados;
    RAISE NOTICE '  - Depósitos con validado_finanzas = false: %', v_total - v_validados;
  ELSE
    RAISE NOTICE 'Columna "validado_finanzas" existe: NO';
  END IF;

  RAISE NOTICE '';
END $$;

\echo ''

-- =============================================================================
-- CHECK 3: Índices existentes
-- =============================================================================

\echo '--- Índices relacionados con validación/verificación ---'
\echo ''

SELECT
  indexname AS nombre_indice,
  tablename AS tabla,
  indexdef AS definicion
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'depositos_ficha'
AND (
  indexname LIKE '%verificado%'
  OR indexname LIKE '%validado%'
  OR indexname LIKE '%pendiente%'
)
ORDER BY indexname;

\echo ''

-- =============================================================================
-- CHECK 4: Foreign Keys
-- =============================================================================

\echo '--- Foreign Keys en columnas de validación/verificación ---'
\echo ''

SELECT
  tc.constraint_name AS fk_name,
  kcu.column_name AS columna_local,
  ccu.table_name AS tabla_referenciada,
  ccu.column_name AS columna_referenciada
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
AND (
  kcu.column_name LIKE '%verificado%'
  OR kcu.column_name LIKE '%validado%'
);

\echo ''

-- =============================================================================
-- CHECK 5: Triggers relacionados
-- =============================================================================

\echo '--- Triggers relacionados con verificación/validación ---'
\echo ''

SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'depositos_ficha'
AND (
  trigger_name LIKE '%verificado%'
  OR trigger_name LIKE '%validado%'
);

\echo ''

-- =============================================================================
-- CHECK 6: Comparación con abonos_pago (si existe)
-- =============================================================================

\echo '--- Comparación con tabla abonos_pago (para alineación) ---'
\echo ''

DO $$
DECLARE
  v_table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'abonos_pago'
  ) INTO v_table_exists;

  IF v_table_exists THEN
    RAISE NOTICE 'Tabla abonos_pago existe: SÍ';
    RAISE NOTICE '';
    RAISE NOTICE 'Columnas de validación en abonos_pago:';

    -- Mostrar columnas de abonos_pago
    PERFORM column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'abonos_pago'
    AND (
      column_name LIKE '%verificado%'
      OR column_name LIKE '%validado%'
    );

    -- Listar columnas
    FOR r IN
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'abonos_pago'
      AND (
        column_name LIKE '%verificado%'
        OR column_name LIKE '%validado%'
      )
      ORDER BY column_name
    LOOP
      RAISE NOTICE '  - %: %', r.column_name, r.data_type;
    END LOOP;
  ELSE
    RAISE NOTICE 'Tabla abonos_pago existe: NO';
  END IF;
END $$;

\echo ''

-- =============================================================================
-- RECOMENDACIÓN
-- =============================================================================

\echo '======================================================================='
\echo 'RECOMENDACIÓN PARA EJECUTAR MIGRACIÓN'
\echo '======================================================================='
\echo ''

DO $$
DECLARE
  v_tiene_verificado BOOLEAN;
  v_tiene_validado BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'depositos_ficha'
    AND column_name = 'verificado_finanzas'
  ) INTO v_tiene_verificado;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'depositos_ficha'
    AND column_name = 'validado_finanzas'
  ) INTO v_tiene_validado;

  IF v_tiene_verificado AND NOT v_tiene_validado THEN
    RAISE NOTICE 'ESTADO: La tabla depositos_ficha tiene columnas "verificado_*"';
    RAISE NOTICE 'ACCIÓN: EJECUTAR migración 020_verificado_a_validado.sql';
    RAISE NOTICE '';
    RAISE NOTICE 'Pasos siguientes:';
    RAISE NOTICE '  1. Ejecutar: migrations/020_verificado_a_validado.sql';
    RAISE NOTICE '  2. Verificar: migrations/verify-020-validado.sql';
    RAISE NOTICE '  3. Actualizar código TypeScript';
  ELSIF NOT v_tiene_verificado AND v_tiene_validado THEN
    RAISE NOTICE 'ESTADO: La migración ya fue ejecutada';
    RAISE NOTICE 'ACCIÓN: NO es necesario ejecutar la migración';
    RAISE NOTICE '';
    RAISE NOTICE 'La tabla ya usa las columnas correctas:';
    RAISE NOTICE '  - validado_finanzas';
    RAISE NOTICE '  - validado_finanzas_por';
    RAISE NOTICE '  - validado_finanzas_at';
    RAISE NOTICE '  - validado_finanzas_nombre';
  ELSIF v_tiene_verificado AND v_tiene_validado THEN
    RAISE WARNING 'ESTADO: INCONSISTENTE - Existen ambas columnas';
    RAISE WARNING 'ACCIÓN: Revisar manualmente. Posible ejecución parcial.';
  ELSE
    RAISE WARNING 'ESTADO: Ninguna columna de validación/verificación encontrada';
    RAISE WARNING 'ACCIÓN: Revisar estructura de tabla depositos_ficha';
  END IF;
END $$;

\echo ''
\echo '======================================================================='
