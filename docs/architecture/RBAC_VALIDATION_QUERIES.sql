-- ============================================================================
-- RBAC SYSTEM - VALIDATION QUERIES
-- ============================================================================
-- Fecha: 12 Enero 2026
-- Propósito: Validar estado del sistema RBAC en Supabase
-- Uso: Ejecutar en Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- QUERY 1: Verificar que las 5 tablas RBAC existen
-- ============================================================================
-- Resultado esperado: 5 filas

SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = t.table_name) as total_columnas,
  (SELECT COUNT(*) FROM pg_indexes
   WHERE tablename = t.table_name) as total_indices,
  (SELECT rowsecurity FROM pg_tables
   WHERE tablename = t.table_name) as rls_activo
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('roles', 'permisos', 'rol_permisos',
                     'usuario_permisos_extra', 'permisos_audit')
ORDER BY table_name;

-- Validar resultado:
-- ✅ 5 tablas
-- ✅ rls_activo = true para todas
-- ✅ roles: 8 columnas, 4+ índices
-- ✅ permisos: 6 columnas, 4+ índices

-- ============================================================================
-- QUERY 2: Verificar que los 8 roles están configurados
-- ============================================================================
-- Resultado esperado: 8 roles con permisos asignados

SELECT
  r.nombre,
  r.jerarquia,
  r.es_sistema,
  r.activo,
  COUNT(rp.permiso_id) as total_permisos,
  ROUND(COUNT(rp.permiso_id) * 100.0 / 62, 1) as porcentaje_permisos
FROM roles r
LEFT JOIN rol_permisos rp ON r.id = rp.rol_id
GROUP BY r.id, r.nombre, r.jerarquia, r.es_sistema, r.activo
ORDER BY r.jerarquia;

-- Validar resultado:
-- ✅ 8 roles: admin, gerencia, jefe_ventas, marketing, finanzas, coordinador, vendedor, vendedor_caseta
-- ✅ admin: 62 permisos (100%)
-- ✅ gerencia: ~51 permisos (82%)
-- ✅ jefe_ventas: ~44 permisos (71%)
-- ✅ vendedor: ~13 permisos (21%)

-- ============================================================================
-- QUERY 3: Verificar que hay 62 permisos distribuidos en 13 módulos
-- ============================================================================
-- Resultado esperado: 13 módulos, 62 permisos totales

SELECT
  modulo,
  COUNT(*) as total_permisos,
  COUNT(*) FILTER (WHERE activo = true) as permisos_activos,
  STRING_AGG(accion, ', ' ORDER BY accion) as acciones
FROM permisos
GROUP BY modulo
ORDER BY modulo;

-- Validar resultado:
-- ✅ 13 módulos: leads, locales, ventas, control_pagos, comisiones, repulse,
--    aprobaciones, usuarios, proyectos, insights, reuniones, configuracion, cross
-- ✅ Total: 62 permisos
-- ✅ Todos activos

-- ============================================================================
-- QUERY 4: Verificar migración de usuarios (columna rol_id)
-- ============================================================================
-- Resultado esperado: usuarios_sin_rol_id = 0

SELECT
  COUNT(*) as total_usuarios,
  COUNT(rol_id) as usuarios_con_rol_id,
  COUNT(*) - COUNT(rol_id) as usuarios_sin_rol_id,
  COUNT(*) FILTER (WHERE rol = 'admin') as total_admins,
  COUNT(*) FILTER (WHERE rol = 'vendedor') as total_vendedores
FROM usuarios
WHERE activo = true;

-- Validar resultado:
-- ✅ usuarios_sin_rol_id = 0
-- ✅ Si hay usuarios sin rol_id, ejecutar:
/*
UPDATE usuarios
SET rol_id = (SELECT id FROM roles WHERE roles.nombre = usuarios.rol)
WHERE rol_id IS NULL
  AND rol IN ('admin', 'gerencia', 'jefe_ventas', 'marketing',
              'finanzas', 'coordinador', 'vendedor', 'vendedor_caseta');
*/

-- ============================================================================
-- QUERY 5: Probar función check_permiso (3 casos de prueba)
-- ============================================================================

-- Caso 1: Admin DEBE tener leads:delete
SELECT
  'Admin puede delete leads' as test,
  check_permiso(
    (SELECT id FROM usuarios WHERE rol = 'admin' AND activo = true LIMIT 1),
    'leads',
    'delete'
  ) as resultado_esperado_true;
-- Resultado esperado: true

-- Caso 2: Vendedor NO debe tener leads:delete
SELECT
  'Vendedor NO puede delete leads' as test,
  check_permiso(
    (SELECT id FROM usuarios WHERE rol = 'vendedor' AND activo = true LIMIT 1),
    'leads',
    'delete'
  ) as resultado_esperado_false;
-- Resultado esperado: false

-- Caso 3: Jefe Ventas DEBE tener aprobaciones:approve
SELECT
  'Jefe Ventas puede aprobar' as test,
  check_permiso(
    (SELECT id FROM usuarios WHERE rol = 'jefe_ventas' AND activo = true LIMIT 1),
    'aprobaciones',
    'approve'
  ) as resultado_esperado_true;
-- Resultado esperado: true

-- ============================================================================
-- QUERY 6: Probar función get_permisos_usuario
-- ============================================================================
-- Resultado esperado: 44 permisos para jefe_ventas

SELECT
  modulo,
  accion,
  origen
FROM get_permisos_usuario(
  (SELECT id FROM usuarios WHERE rol = 'jefe_ventas' AND activo = true LIMIT 1)
)
ORDER BY modulo, accion;

-- Validar resultado:
-- ✅ 44 filas (permisos de jefe_ventas)
-- ✅ origen = 'rol' para todos (a menos que tenga Permission Sets)
-- ✅ Debe incluir: leads:read, leads:write, ventas:approve, locales:read, etc.

-- ============================================================================
-- QUERY 7: Verificar políticas RLS
-- ============================================================================
-- Resultado esperado: 10+ políticas (2 por tabla mínimo)

SELECT
  tablename,
  policyname,
  permissive,
  cmd as operacion,
  CASE
    WHEN qual IS NOT NULL THEN 'USING: ' || pg_get_expr(qual, c.oid)
    ELSE ''
  END as condicion_using,
  CASE
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || pg_get_expr(with_check, c.oid)
    ELSE ''
  END as condicion_with_check
FROM pg_policies pp
JOIN pg_class c ON pp.tablename = c.relname
WHERE schemaname = 'public'
  AND tablename IN ('roles', 'permisos', 'rol_permisos',
                    'usuario_permisos_extra', 'permisos_audit')
ORDER BY tablename, policyname;

-- Validar resultado:
-- ✅ 10+ políticas
-- ✅ roles: usuarios_ven_roles_activos (SELECT), solo_admin_crea_roles (INSERT)
-- ✅ permisos: usuarios_ven_permisos_activos (SELECT), solo_admin_crea_permisos (INSERT)
-- ✅ rol_permisos: usuarios_ven_rol_permisos (SELECT), solo_admin_asigna_permisos_a_roles (INSERT)

-- ============================================================================
-- QUERY 8: Performance test - check_permiso
-- ============================================================================
-- Resultado esperado: Execution time < 5ms

EXPLAIN ANALYZE
SELECT check_permiso(
  (SELECT id FROM usuarios WHERE rol = 'vendedor' AND activo = true LIMIT 1),
  'leads',
  'read'
);

-- Validar resultado:
-- ✅ Execution Time < 5ms
-- ✅ Debe usar índices (ver "Index Scan" en plan)
-- ✅ Si es > 10ms, revisar índices faltantes

-- ============================================================================
-- QUERY 9: Verificar índices críticos
-- ============================================================================
-- Resultado esperado: 25+ índices en tablas RBAC

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('roles', 'permisos', 'rol_permisos',
                    'usuario_permisos_extra', 'permisos_audit', 'usuarios')
  AND indexname LIKE '%rol%' OR indexname LIKE '%permiso%'
ORDER BY tablename, indexname;

-- Validar resultado:
-- ✅ roles: idx_roles_nombre, idx_roles_jerarquia, idx_roles_activo
-- ✅ permisos: idx_permisos_modulo, idx_permisos_accion, idx_permisos_modulo_accion
-- ✅ usuarios: idx_usuarios_rol_id (NUEVO)

-- ============================================================================
-- QUERY 10: Matriz completa de permisos (exportable a Excel)
-- ============================================================================
-- Resultado esperado: Matriz rol × permiso

WITH permisos_list AS (
  SELECT
    id,
    modulo || ':' || accion as permiso_str
  FROM permisos
  WHERE activo = true
  ORDER BY modulo, accion
),
roles_list AS (
  SELECT id, nombre, jerarquia
  FROM roles
  WHERE activo = true
  ORDER BY jerarquia
)
SELECT
  r.nombre as rol,
  r.jerarquia,
  p.permiso_str as permiso,
  CASE WHEN rp.rol_id IS NOT NULL THEN '✓' ELSE '' END as tiene_permiso
FROM roles_list r
CROSS JOIN permisos_list p
LEFT JOIN rol_permisos rp ON rp.rol_id = r.id AND rp.permiso_id = p.id
ORDER BY r.jerarquia, p.permiso_str;

-- Validar resultado:
-- ✅ 496 filas (8 roles × 62 permisos)
-- ✅ Admin tiene ✓ en todos los permisos
-- ✅ Vendedor tiene ✓ solo en ~13 permisos

-- ============================================================================
-- QUERY 11: Auditoría - Últimos cambios en permisos
-- ============================================================================
-- Resultado esperado: Historial de cambios (si hay)

SELECT
  pa.created_at,
  pa.accion,
  pa.tabla_afectada,
  u.nombre as realizado_por,
  pa.valores_antes,
  pa.valores_despues
FROM permisos_audit pa
LEFT JOIN usuarios u ON pa.realizado_por = u.id
ORDER BY pa.created_at DESC
LIMIT 20;

-- Validar resultado:
-- ✅ Si no hay registros, es normal (aún no se han hecho cambios)
-- ✅ Si hay registros, deben tener accion, tabla_afectada, realizado_por

-- ============================================================================
-- QUERY 12: Usuarios con Permission Sets (permisos extra)
-- ============================================================================
-- Resultado esperado: Lista de usuarios con permisos temporales

SELECT
  u.nombre as usuario,
  p.modulo || ':' || p.accion as permiso_extra,
  upe.motivo,
  upe.fecha_otorgado,
  upe.fecha_expiracion,
  CASE
    WHEN upe.fecha_expiracion IS NULL THEN 'Permanente'
    WHEN upe.fecha_expiracion > NOW() THEN 'Activo'
    ELSE 'Expirado'
  END as estado
FROM usuario_permisos_extra upe
JOIN usuarios u ON upe.usuario_id = u.id
JOIN permisos p ON upe.permiso_id = p.id
WHERE upe.activo = true
ORDER BY u.nombre, p.modulo, p.accion;

-- Validar resultado:
-- ✅ Si no hay registros, es normal (aún no se han otorgado Permission Sets)
-- ✅ Los registros expirados no deberían aparecer (WHERE activo = true)

-- ============================================================================
-- QUERY 13: Health check completo
-- ============================================================================
-- Resultado esperado: Todos los checks PASS

SELECT
  'Tablas RBAC' as componente,
  CASE WHEN COUNT(*) = 5 THEN 'PASS' ELSE 'FAIL' END as estado,
  COUNT(*) || ' / 5' as resultado
FROM information_schema.tables
WHERE table_name IN ('roles', 'permisos', 'rol_permisos',
                     'usuario_permisos_extra', 'permisos_audit')

UNION ALL

SELECT
  'Roles configurados',
  CASE WHEN COUNT(*) = 8 THEN 'PASS' ELSE 'FAIL' END,
  COUNT(*) || ' / 8'
FROM roles
WHERE activo = true

UNION ALL

SELECT
  'Permisos configurados',
  CASE WHEN COUNT(*) = 62 THEN 'PASS' ELSE 'FAIL' END,
  COUNT(*) || ' / 62'
FROM permisos
WHERE activo = true

UNION ALL

SELECT
  'Usuarios migrados',
  CASE WHEN COUNT(*) - COUNT(rol_id) = 0 THEN 'PASS' ELSE 'FAIL' END,
  (COUNT(*) - COUNT(rol_id)) || ' sin rol_id'
FROM usuarios
WHERE activo = true

UNION ALL

SELECT
  'Políticas RLS',
  CASE WHEN COUNT(*) >= 10 THEN 'PASS' ELSE 'FAIL' END,
  COUNT(*) || ' / 10+'
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('roles', 'permisos', 'rol_permisos',
                    'usuario_permisos_extra', 'permisos_audit')

UNION ALL

SELECT
  'Funciones SQL',
  CASE WHEN COUNT(*) >= 3 THEN 'PASS' ELSE 'FAIL' END,
  COUNT(*) || ' / 3'
FROM pg_proc
WHERE proname IN ('check_permiso', 'get_permisos_usuario', 'audit_log');

-- Validar resultado:
-- ✅ Todos los componentes deben tener estado = 'PASS'
-- ✅ Si alguno es 'FAIL', revisar el componente específico con queries anteriores

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

/*
1. ESTAS QUERIES SON SOLO LECTURA (SELECT)
   - Seguras para ejecutar en producción
   - No modifican datos

2. SI ALGO FALLA:
   - Verificar que las migraciones 20260111_rbac_*.sql fueron ejecutadas
   - Revisar logs de Supabase por errores
   - Consultar RBAC_AUDIT_REPORT_2026.md para troubleshooting

3. PARA CAMBIOS EN BD:
   - ❌ NO ejecutar desde localhost (comparte BD de producción)
   - ✅ Solo cambios vía Supabase Dashboard con aprobación
   - ✅ Crear backup antes de cambios estructurales

4. PERFORMANCE:
   - Queries 1-12 deben ejecutar en < 100ms
   - Query 8 (EXPLAIN ANALYZE) debe ser < 5ms
   - Si es más lento, revisar índices

5. PRÓXIMOS PASOS:
   - Ver RBAC_AUDIT_SUMMARY.md para plan de acción
   - Completar Fase 1-2 antes de activar RBAC en producción
*/

-- ============================================================================
-- FIN DE QUERIES DE VALIDACIÓN
-- ============================================================================
