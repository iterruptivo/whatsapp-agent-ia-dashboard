-- ============================================================================
-- SCRIPT DE VALIDACIÓN: Módulo Purchase Requisitions
-- ============================================================================
-- Ejecutar DESPUÉS de correr 004_modulo_purchase_requisitions.sql
-- Verifica que todas las tablas, funciones, índices y seeds existen
-- ============================================================================

\echo '============================================================================'
\echo 'VALIDACIÓN: Módulo Purchase Requisitions'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- 1. VERIFICAR TABLAS
-- ============================================================================

\echo '1. Verificando que existen las 5 tablas...'

SELECT
  tablename,
  CASE
    WHEN tablename IN (
      'pr_categories',
      'pr_approval_rules',
      'purchase_requisitions',
      'pr_approval_history',
      'pr_comments'
    ) THEN '✓ Existe'
    ELSE '✗ Falta'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE 'pr_%' OR tablename = 'purchase_requisitions')
ORDER BY tablename;

\echo ''

-- ============================================================================
-- 2. VERIFICAR RLS HABILITADO
-- ============================================================================

\echo '2. Verificando que RLS está habilitado en todas las tablas...'

SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✓ RLS Habilitado' ELSE '✗ RLS NO habilitado' END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE 'pr_%' OR tablename = 'purchase_requisitions')
ORDER BY tablename;

\echo ''

-- ============================================================================
-- 3. VERIFICAR FUNCIONES
-- ============================================================================

\echo '3. Verificando que existen las 9 funciones...'

SELECT
  routine_name,
  '✓ Existe' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'generate_pr_number',
    'calculate_pr_total',
    'get_approval_rule_for_amount',
    'get_approver_role_for_pr',
    'cache_pr_names',
    'log_pr_status_change',
    'update_pr_comment_timestamp',
    'update_pr_category_timestamp',
    'update_pr_approval_rule_timestamp'
  )
ORDER BY routine_name;

\echo ''

-- Contar funciones encontradas
SELECT
  COUNT(*) as total_funciones,
  CASE
    WHEN COUNT(*) = 9 THEN '✓ Todas las funciones existen'
    ELSE '✗ Faltan funciones'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'generate_pr_number',
    'calculate_pr_total',
    'get_approval_rule_for_amount',
    'get_approver_role_for_pr',
    'cache_pr_names',
    'log_pr_status_change',
    'update_pr_comment_timestamp',
    'update_pr_category_timestamp',
    'update_pr_approval_rule_timestamp'
  );

\echo ''

-- ============================================================================
-- 4. VERIFICAR TRIGGERS
-- ============================================================================

\echo '4. Verificando que existen los triggers...'

SELECT
  trigger_name,
  event_object_table as tabla,
  '✓ Existe' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'tr_generate_pr_number',
    'tr_calculate_pr_total',
    'tr_cache_pr_names',
    'tr_log_pr_status_change',
    'tr_update_pr_comment_timestamp',
    'tr_update_pr_category_timestamp',
    'tr_update_pr_approval_rule_timestamp'
  )
ORDER BY trigger_name;

\echo ''

-- ============================================================================
-- 5. VERIFICAR ÍNDICES
-- ============================================================================

\echo '5. Verificando índices principales...'

SELECT
  indexname,
  tablename,
  '✓ Existe' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND (tablename LIKE 'pr_%' OR tablename = 'purchase_requisitions')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

\echo ''

-- Contar índices por tabla
SELECT
  tablename,
  COUNT(*) as total_indices
FROM pg_indexes
WHERE schemaname = 'public'
  AND (tablename LIKE 'pr_%' OR tablename = 'purchase_requisitions')
  AND indexname LIKE 'idx_%'
GROUP BY tablename
ORDER BY tablename;

\echo ''

-- ============================================================================
-- 6. VERIFICAR SEED DATA: Categorías
-- ============================================================================

\echo '6. Verificando seed de categorías (debe haber 10)...'

SELECT
  COUNT(*) as total_categorias,
  CASE
    WHEN COUNT(*) = 10 THEN '✓ 10 categorías cargadas correctamente'
    ELSE '✗ Faltan categorías'
  END as status
FROM pr_categories;

\echo ''

-- Listar categorías
SELECT
  code,
  name,
  icon,
  default_approver_role,
  display_order,
  CASE WHEN is_active THEN '✓ Activa' ELSE '✗ Inactiva' END as estado
FROM pr_categories
ORDER BY display_order;

\echo ''

-- ============================================================================
-- 7. VERIFICAR SEED DATA: Reglas de Aprobación
-- ============================================================================

\echo '7. Verificando seed de reglas de aprobación (debe haber 5)...'

SELECT
  COUNT(*) as total_reglas,
  CASE
    WHEN COUNT(*) >= 5 THEN '✓ Reglas cargadas correctamente'
    ELSE '✗ Faltan reglas'
  END as status
FROM pr_approval_rules;

\echo ''

-- Listar reglas
SELECT
  name,
  min_amount,
  COALESCE(max_amount::TEXT, 'Sin límite') as max_amount,
  approver_role,
  sla_hours,
  priority,
  CASE WHEN is_active THEN '✓ Activa' ELSE '✗ Inactiva' END as estado
FROM pr_approval_rules
ORDER BY priority;

\echo ''

-- ============================================================================
-- 8. VERIFICAR CONSTRAINTS
-- ============================================================================

\echo '8. Verificando constraints principales...'

SELECT
  tc.constraint_name,
  tc.table_name,
  tc.constraint_type,
  '✓ Existe' as status
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
    'pr_categories',
    'pr_approval_rules',
    'purchase_requisitions',
    'pr_approval_history',
    'pr_comments'
  )
  AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

\echo ''

-- ============================================================================
-- 9. VERIFICAR FOREIGN KEYS
-- ============================================================================

\echo '9. Verificando foreign keys...'

SELECT
  kcu.table_name as tabla_origen,
  kcu.column_name as columna_origen,
  ccu.table_name as tabla_destino,
  ccu.column_name as columna_destino,
  '✓ FK configurada' as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'pr_categories',
    'pr_approval_rules',
    'purchase_requisitions',
    'pr_approval_history',
    'pr_comments'
  )
ORDER BY kcu.table_name, kcu.column_name;

\echo ''

-- ============================================================================
-- 10. VERIFICAR POLÍTICAS RLS
-- ============================================================================

\echo '10. Verificando políticas RLS...'

SELECT
  schemaname,
  tablename,
  policyname,
  CASE
    WHEN cmd = 'r' THEN 'SELECT'
    WHEN cmd = 'a' THEN 'INSERT'
    WHEN cmd = 'w' THEN 'UPDATE'
    WHEN cmd = 'd' THEN 'DELETE'
    WHEN cmd = '*' THEN 'ALL'
    ELSE cmd
  END as comando,
  '✓ Policy existe' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'pr_categories',
    'pr_approval_rules',
    'purchase_requisitions',
    'pr_approval_history',
    'pr_comments'
  )
ORDER BY tablename, policyname;

\echo ''

-- Contar policies por tabla
SELECT
  tablename,
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'pr_categories',
    'pr_approval_rules',
    'purchase_requisitions',
    'pr_approval_history',
    'pr_comments'
  )
GROUP BY tablename
ORDER BY tablename;

\echo ''

-- ============================================================================
-- 11. TEST FUNCIONAL: Generar PR Number
-- ============================================================================

\echo '11. Testeando función get_approval_rule_for_amount()...'

-- Test 1: Monto S/ 300 → debe devolver regla de auto-aprobación
SELECT
  '✓ Test 1: S/ 300' as test,
  name as regla_aplicada,
  approver_role,
  CASE
    WHEN approver_role = 'auto' THEN '✓ Correcto (auto-aprobación)'
    ELSE '✗ Incorrecto'
  END as resultado
FROM pr_approval_rules
WHERE id = get_approval_rule_for_amount(300);

-- Test 2: Monto S/ 1,500 → debe devolver regla de Manager
SELECT
  '✓ Test 2: S/ 1,500' as test,
  name as regla_aplicada,
  approver_role,
  CASE
    WHEN approver_role = 'admin' THEN '✓ Correcto (Manager)'
    ELSE '✗ Incorrecto'
  END as resultado
FROM pr_approval_rules
WHERE id = get_approval_rule_for_amount(1500);

-- Test 3: Monto S/ 5,000 → debe devolver regla de Director
SELECT
  '✓ Test 3: S/ 5,000' as test,
  name as regla_aplicada,
  approver_role,
  CASE
    WHEN approver_role = 'gerencia' THEN '✓ Correcto (Director)'
    ELSE '✗ Incorrecto'
  END as resultado
FROM pr_approval_rules
WHERE id = get_approval_rule_for_amount(5000);

-- Test 4: Monto S/ 50,000 → debe devolver regla de Gerente General
SELECT
  '✓ Test 4: S/ 50,000' as test,
  name as regla_aplicada,
  approver_role,
  CASE
    WHEN approver_role = 'superadmin' THEN '✓ Correcto (Gerente General)'
    ELSE '✗ Incorrecto'
  END as resultado
FROM pr_approval_rules
WHERE id = get_approval_rule_for_amount(50000);

\echo ''

-- ============================================================================
-- 12. VERIFICAR TIPOS DE COLUMNAS CRÍTICAS
-- ============================================================================

\echo '12. Verificando tipos de columnas críticas...'

SELECT
  table_name,
  column_name,
  data_type,
  CASE
    WHEN is_nullable = 'YES' THEN 'NULL'
    ELSE 'NOT NULL'
  END as nullable,
  column_default,
  '✓ Definida' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'purchase_requisitions'
  AND column_name IN (
    'id',
    'pr_number',
    'requester_id',
    'status',
    'total_amount',
    'current_approver_id',
    'created_at'
  )
ORDER BY ordinal_position;

\echo ''

-- ============================================================================
-- 13. RESUMEN FINAL
-- ============================================================================

\echo '============================================================================'
\echo 'RESUMEN DE VALIDACIÓN'
\echo '============================================================================'

SELECT
  '✓ Tablas creadas' as item,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE 'pr_%' OR tablename = 'purchase_requisitions'))::TEXT || ' de 5' as resultado
UNION ALL
SELECT
  '✓ Funciones creadas',
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('generate_pr_number', 'calculate_pr_total', 'get_approval_rule_for_amount', 'get_approver_role_for_pr', 'cache_pr_names', 'log_pr_status_change', 'update_pr_comment_timestamp', 'update_pr_category_timestamp', 'update_pr_approval_rule_timestamp'))::TEXT || ' de 9'
UNION ALL
SELECT
  '✓ Triggers creados',
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public' AND trigger_name IN ('tr_generate_pr_number', 'tr_calculate_pr_total', 'tr_cache_pr_names', 'tr_log_pr_status_change', 'tr_update_pr_comment_timestamp', 'tr_update_pr_category_timestamp', 'tr_update_pr_approval_rule_timestamp'))::TEXT || ' de 7'
UNION ALL
SELECT
  '✓ RLS habilitado',
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE 'pr_%' OR tablename = 'purchase_requisitions') AND rowsecurity = TRUE)::TEXT || ' de 5'
UNION ALL
SELECT
  '✓ Categorías seed',
  (SELECT COUNT(*) FROM pr_categories)::TEXT || ' de 10'
UNION ALL
SELECT
  '✓ Reglas seed',
  (SELECT COUNT(*) FROM pr_approval_rules)::TEXT || ' de 5'
UNION ALL
SELECT
  '✓ Políticas RLS',
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('pr_categories', 'pr_approval_rules', 'purchase_requisitions', 'pr_approval_history', 'pr_comments'))::TEXT
UNION ALL
SELECT
  '✓ Índices creados',
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND (tablename LIKE 'pr_%' OR tablename = 'purchase_requisitions') AND indexname LIKE 'idx_%')::TEXT;

\echo ''
\echo '============================================================================'
\echo 'VALIDACIÓN COMPLETADA'
\echo '============================================================================'
\echo ''
\echo 'Si todos los items muestran los números esperados, la migración fue exitosa.'
\echo ''
\echo 'Próximos pasos:'
\echo '  1. Crear server actions en lib/actions-purchase-requisitions.ts'
\echo '  2. Crear tipos TypeScript en lib/types/purchase-requisitions.ts'
\echo '  3. Crear componentes UI en components/purchase-requisitions/'
\echo '  4. Crear páginas en app/solicitudes-compra/'
\echo '  5. Integrar con módulo de notificaciones'
\echo ''
\echo 'Documentación completa: migrations/README_004_PURCHASE_REQUISITIONS.md'
\echo '============================================================================'
