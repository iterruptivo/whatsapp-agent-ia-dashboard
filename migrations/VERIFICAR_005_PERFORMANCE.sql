-- ============================================================================
-- VERIFICACIÓN: Optimización de Performance Purchase Requisitions
-- ============================================================================
-- Fecha: 13 Enero 2026
-- Propósito: Validar que la migración 005 se ejecutó correctamente
-- ============================================================================

-- ============================================================================
-- 1. VERIFICAR ÍNDICE CREADO
-- ============================================================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'purchase_requisitions'
  AND indexname = 'idx_pr_requester_status_stats';

-- ESPERADO: 1 fila con el índice creado
-- Si devuelve 0 filas → ERROR: Índice no se creó

-- ============================================================================
-- 2. VERIFICAR TODOS LOS ÍNDICES DE PURCHASE_REQUISITIONS
-- ============================================================================

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'purchase_requisitions'
ORDER BY indexname;

-- ESPERADO: 10 índices totales
-- 1. idx_pr_category
-- 2. idx_pr_financial_reports
-- 3. idx_pr_number
-- 4. idx_pr_pending_approver
-- 5. idx_pr_priority
-- 6. idx_pr_proyecto
-- 7. idx_pr_required_by_date
-- 8. idx_pr_requester
-- 9. idx_pr_requester_status_stats (NUEVO)
-- 10. idx_pr_status

-- ============================================================================
-- 3. VERIFICAR PERFORMANCE DEL ÍNDICE NUEVO
-- ============================================================================

-- Query típica de stats (contar PRs por estado)
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*)
FROM purchase_requisitions
WHERE requester_id = (SELECT id FROM usuarios LIMIT 1)
  AND status = 'draft';

-- ESPERADO: "Index Scan using idx_pr_requester_status_stats"
-- TIEMPO: < 10ms
-- Si usa Seq Scan → ERROR: Índice no se está usando

-- ============================================================================
-- 4. BENCHMARK: Query de Stats (getMyPRsStats)
-- ============================================================================

-- Simular la query de getMyPRsStats() para un usuario
DO $$
DECLARE
  user_id_test UUID;
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  duration_ms NUMERIC;
  total_count INT;
  draft_count INT;
  pending_count INT;
  approved_count INT;
BEGIN
  -- Obtener un usuario real de prueba
  SELECT id INTO user_id_test FROM usuarios WHERE rol = 'admin' LIMIT 1;

  -- Si no hay usuarios, crear uno temporal
  IF user_id_test IS NULL THEN
    RAISE NOTICE 'No se encontró usuario de prueba. Usando UUID dummy.';
    user_id_test := '00000000-0000-0000-0000-000000000000';
  END IF;

  RAISE NOTICE 'Testing con usuario: %', user_id_test;

  -- Iniciar timer
  start_time := clock_timestamp();

  -- Ejecutar las 4 queries de stats en secuencia (en JS serían paralelas)
  SELECT COUNT(*) INTO total_count
  FROM purchase_requisitions
  WHERE requester_id = user_id_test;

  SELECT COUNT(*) INTO draft_count
  FROM purchase_requisitions
  WHERE requester_id = user_id_test AND status = 'draft';

  SELECT COUNT(*) INTO pending_count
  FROM purchase_requisitions
  WHERE requester_id = user_id_test AND status = 'pending_approval';

  SELECT COUNT(*) INTO approved_count
  FROM purchase_requisitions
  WHERE requester_id = user_id_test AND status = 'approved';

  -- Finalizar timer
  end_time := clock_timestamp();
  duration_ms := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

  -- Mostrar resultados
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'BENCHMARK: getMyPRsStats()';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Duración total: % ms', ROUND(duration_ms, 2);
  RAISE NOTICE 'Total: %', total_count;
  RAISE NOTICE 'Draft: %', draft_count;
  RAISE NOTICE 'Pending: %', pending_count;
  RAISE NOTICE 'Approved: %', approved_count;
  RAISE NOTICE '===========================================';

  -- Validar performance
  IF duration_ms > 50 THEN
    RAISE WARNING 'Performance degradada: % ms (esperado < 50ms)', ROUND(duration_ms, 2);
  ELSE
    RAISE NOTICE 'Performance OK: % ms', ROUND(duration_ms, 2);
  END IF;
END $$;

-- ESPERADO: < 50ms total para las 4 queries

-- ============================================================================
-- 5. VERIFICAR QUERY PLAN DE getMyPRs()
-- ============================================================================

-- Query típica de getMyPRs() (lista con paginación)
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  id, pr_number, title, status, priority, category_id,
  total_amount, currency, requester_name, created_at, required_by_date
FROM purchase_requisitions
WHERE requester_id = (SELECT id FROM usuarios LIMIT 1)
ORDER BY created_at DESC
LIMIT 20;

-- ESPERADO: "Index Scan using idx_pr_requester"
-- TIEMPO: < 20ms

-- ============================================================================
-- 6. VERIFICAR QUERY PLAN DE getPendingApprovals()
-- ============================================================================

-- Query típica de getPendingApprovals()
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  id, pr_number, title, status, priority, category_id,
  total_amount, currency, requester_name, requester_id,
  created_at, required_by_date, current_approver_id, current_approver_name
FROM purchase_requisitions
WHERE current_approver_id = (SELECT id FROM usuarios LIMIT 1)
  AND status = 'pending_approval'
ORDER BY priority DESC, created_at ASC;

-- ESPERADO: "Index Scan using idx_pr_pending_approver"
-- TIEMPO: < 20ms

-- ============================================================================
-- 7. STATS DE TABLA
-- ============================================================================

SELECT
  schemaname,
  tablename,
  n_live_tup AS "Filas Actuales",
  n_dead_tup AS "Filas Muertas",
  last_vacuum AS "Último VACUUM",
  last_autovacuum AS "Último AUTOVACUUM",
  last_analyze AS "Último ANALYZE"
FROM pg_stat_user_tables
WHERE tablename = 'purchase_requisitions';

-- Verificar que la tabla tiene estadísticas recientes
-- Si last_analyze es NULL o muy antigua → ejecutar ANALYZE

-- ============================================================================
-- 8. TAMAÑO DE ÍNDICES
-- ============================================================================

SELECT
  indexrelname AS "Índice",
  pg_size_pretty(pg_relation_size(indexrelid)) AS "Tamaño"
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND relname = 'purchase_requisitions'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Verificar que idx_pr_requester_status_stats tiene un tamaño razonable
-- Típicamente < 1MB para pocas filas

-- ============================================================================
-- 9. ACTUALIZAR ESTADÍSTICAS (OPCIONAL)
-- ============================================================================

-- Si las queries son lentas, actualizar estadísticas de PostgreSQL
-- ANALYZE purchase_requisitions;

-- ============================================================================
-- 10. RESUMEN
-- ============================================================================

-- Si todos los pasos anteriores pasaron:
-- ✅ Índice creado correctamente
-- ✅ Queries usan el índice (no Seq Scan)
-- ✅ Performance < 50ms para stats
-- ✅ Performance < 20ms para listas

-- Si alguno falló:
-- ❌ Revisar que la migración 005 se ejecutó completamente
-- ❌ Ejecutar ANALYZE purchase_requisitions;
-- ❌ Verificar que hay datos en la tabla para testing

SELECT
  '✅ VERIFICACIÓN COMPLETA' AS "Estado",
  'Ejecuta los pasos anteriores para validar la optimización' AS "Instrucciones";
