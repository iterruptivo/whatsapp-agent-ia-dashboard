-- ============================================================================
-- SCRIPT DE DIAGNÓSTICO: RLS Policy "Reuniones - Insert"
-- ============================================================================
-- Propósito: Diagnosticar por qué superadmin no puede crear reuniones
-- Uso: Ejecutar ANTES y DESPUÉS del fix para comparar
-- ============================================================================

-- ============================================================================
-- 1. ESTADO DE LA TABLA REUNIONES
-- ============================================================================

SELECT
  '=== ESTADO DE LA TABLA ===' AS seccion;

SELECT
  tablename AS tabla,
  rowsecurity AS rls_habilitado,
  schemaname AS schema
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'reuniones';

-- ============================================================================
-- 2. POLÍTICAS RLS ACTUALES
-- ============================================================================

SELECT
  '=== POLÍTICAS RLS ACTUALES ===' AS seccion;

SELECT
  policyname AS nombre_policy,
  cmd AS operacion,
  qual AS condicion_using,
  with_check AS condicion_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'reuniones'
ORDER BY cmd, policyname;

-- ============================================================================
-- 3. DEFINICIÓN COMPLETA DE LA POLICY INSERT
-- ============================================================================

SELECT
  '=== POLICY INSERT - DEFINICIÓN COMPLETA ===' AS seccion;

SELECT
  policyname AS nombre,
  cmd AS operacion,
  definition AS definicion_completa
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'reuniones'
  AND policyname = 'Reuniones - Insert';

-- ============================================================================
-- 4. VERIFICAR SI INCLUYE 'superadmin'
-- ============================================================================

SELECT
  '=== VERIFICACIÓN: ¿Incluye superadmin? ===' AS seccion;

SELECT
  policyname AS policy,
  CASE
    WHEN definition LIKE '%superadmin%' THEN 'SI ✓ - Incluye superadmin'
    ELSE 'NO ✗ - NO incluye superadmin (PROBLEMA)'
  END AS incluye_superadmin,
  definition AS definicion
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'reuniones'
  AND policyname = 'Reuniones - Insert';

-- ============================================================================
-- 5. USUARIOS SUPERADMIN EN EL SISTEMA
-- ============================================================================

SELECT
  '=== USUARIOS SUPERADMIN ===' AS seccion;

SELECT
  id,
  email,
  nombre,
  rol,
  activo,
  created_at
FROM usuarios
WHERE rol = 'superadmin'
ORDER BY created_at DESC;

-- ============================================================================
-- 6. VERIFICAR USUARIO ESPECÍFICO: gerente.ti@ecoplaza.com.pe
-- ============================================================================

SELECT
  '=== USUARIO AFECTADO ===' AS seccion;

SELECT
  id,
  email,
  nombre,
  rol,
  activo,
  CASE
    WHEN activo THEN 'ACTIVO ✓'
    ELSE 'INACTIVO ✗'
  END AS estado,
  CASE
    WHEN rol = 'superadmin' THEN 'SUPERADMIN ✓'
    ELSE 'Rol: ' || rol || ' ✗'
  END AS verificacion_rol
FROM usuarios
WHERE email = 'gerente.ti@ecoplaza.com.pe';

-- ============================================================================
-- 7. CONTEO DE REUNIONES EXISTENTES
-- ============================================================================

SELECT
  '=== ESTADÍSTICAS DE REUNIONES ===' AS seccion;

SELECT
  COUNT(*) AS total_reuniones,
  COUNT(DISTINCT created_by) AS usuarios_unicos_creadores,
  COUNT(*) FILTER (WHERE estado = 'completado') AS completadas,
  COUNT(*) FILTER (WHERE estado = 'procesando') AS procesando,
  COUNT(*) FILTER (WHERE estado = 'error') AS con_error
FROM reuniones;

-- ============================================================================
-- 8. REUNIONES POR ROL DE CREADOR
-- ============================================================================

SELECT
  '=== REUNIONES CREADAS POR ROL ===' AS seccion;

SELECT
  u.rol AS rol_creador,
  COUNT(r.id) AS total_reuniones,
  ARRAY_AGG(DISTINCT u.email) AS usuarios_emails
FROM reuniones r
LEFT JOIN usuarios u ON r.created_by = u.id
GROUP BY u.rol
ORDER BY total_reuniones DESC;

-- ============================================================================
-- 9. VERIFICAR SI SUPERADMIN HA CREADO REUNIONES
-- ============================================================================

SELECT
  '=== ¿SUPERADMIN HA CREADO REUNIONES ANTES? ===' AS seccion;

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM reuniones r
      JOIN usuarios u ON r.created_by = u.id
      WHERE u.rol = 'superadmin'
    ) THEN 'SI - Superadmin ha creado reuniones (policy permitía antes)'
    ELSE 'NO - Superadmin nunca ha creado reuniones (policy nunca lo permitió)'
  END AS resultado;

-- ============================================================================
-- 10. COMPARACIÓN DE ROLES PERMITIDOS
-- ============================================================================

SELECT
  '=== ROLES QUE PUEDEN CREAR REUNIONES ===' AS seccion;

SELECT
  'admin' AS rol,
  CASE
    WHEN definition LIKE '%admin%' THEN 'PERMITIDO ✓'
    ELSE 'BLOQUEADO ✗'
  END AS estado
FROM pg_policies
WHERE tablename = 'reuniones' AND policyname = 'Reuniones - Insert'

UNION ALL

SELECT
  'gerencia' AS rol,
  CASE
    WHEN definition LIKE '%gerencia%' THEN 'PERMITIDO ✓'
    ELSE 'BLOQUEADO ✗'
  END AS estado
FROM pg_policies
WHERE tablename = 'reuniones' AND policyname = 'Reuniones - Insert'

UNION ALL

SELECT
  'jefe_ventas' AS rol,
  CASE
    WHEN definition LIKE '%jefe_ventas%' THEN 'PERMITIDO ✓'
    ELSE 'BLOQUEADO ✗'
  END AS estado
FROM pg_policies
WHERE tablename = 'reuniones' AND policyname = 'Reuniones - Insert'

UNION ALL

SELECT
  'superadmin' AS rol,
  CASE
    WHEN definition LIKE '%superadmin%' THEN 'PERMITIDO ✓'
    ELSE 'BLOQUEADO ✗ (ESTE ES EL PROBLEMA)'
  END AS estado
FROM pg_policies
WHERE tablename = 'reuniones' AND policyname = 'Reuniones - Insert';

-- ============================================================================
-- 11. DIAGNÓSTICO FINAL
-- ============================================================================

SELECT
  '=== DIAGNÓSTICO FINAL ===' AS seccion;

WITH diagnostico AS (
  SELECT
    CASE
      WHEN definition LIKE '%superadmin%' THEN 'OK'
      ELSE 'PROBLEMA'
    END AS estado_policy,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM usuarios
        WHERE email = 'gerente.ti@ecoplaza.com.pe'
          AND rol = 'superadmin'
          AND activo = true
      ) THEN 'OK'
      ELSE 'PROBLEMA'
    END AS estado_usuario
  FROM pg_policies
  WHERE tablename = 'reuniones' AND policyname = 'Reuniones - Insert'
)
SELECT
  CASE
    WHEN estado_policy = 'PROBLEMA' AND estado_usuario = 'OK' THEN
      'DIAGNÓSTICO: La policy NO permite superadmin. Usuario existe y está activo. EJECUTAR FIX URGENTE.'
    WHEN estado_policy = 'OK' AND estado_usuario = 'PROBLEMA' THEN
      'DIAGNÓSTICO: La policy permite superadmin, pero el usuario gerente.ti no existe o no es superadmin.'
    WHEN estado_policy = 'PROBLEMA' AND estado_usuario = 'PROBLEMA' THEN
      'DIAGNÓSTICO: Múltiples problemas. Policy incorrecta Y usuario incorrecto.'
    ELSE
      'DIAGNÓSTICO: TODO OK. Policy permite superadmin y usuario está configurado correctamente.'
  END AS resultado,
  estado_policy,
  estado_usuario
FROM diagnostico;

-- ============================================================================
-- 12. RECOMENDACIONES
-- ============================================================================

SELECT
  '=== RECOMENDACIONES ===' AS seccion;

WITH estado AS (
  SELECT
    definition LIKE '%superadmin%' AS policy_ok,
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE email = 'gerente.ti@ecoplaza.com.pe'
        AND rol = 'superadmin'
        AND activo = true
    ) AS usuario_ok
  FROM pg_policies
  WHERE tablename = 'reuniones' AND policyname = 'Reuniones - Insert'
)
SELECT
  CASE
    WHEN NOT policy_ok THEN
      'ACCIÓN 1: Ejecutar migración 011_fix_reuniones_insert_superadmin_URGENTE.sql'
    ELSE
      'ACCIÓN 1: Policy OK - No se necesita ejecutar migración'
  END AS accion_1,
  CASE
    WHEN NOT usuario_ok THEN
      'ACCIÓN 2: Verificar que gerente.ti@ecoplaza.com.pe sea superadmin y esté activo'
    ELSE
      'ACCIÓN 2: Usuario OK - No se necesita acción'
  END AS accion_2,
  CASE
    WHEN policy_ok AND usuario_ok THEN
      'ACCIÓN 3: Probar crear reunión desde el dashboard. Si falla, revisar auth.uid()'
    ELSE
      'ACCIÓN 3: Esperar a resolver problemas anteriores'
  END AS accion_3
FROM estado;

-- ============================================================================
-- FIN DEL DIAGNÓSTICO
-- ============================================================================

SELECT
  '╔═══════════════════════════════════════════════════════════════╗' AS mensaje
UNION ALL
SELECT
  '║  DIAGNÓSTICO COMPLETADO                                       ║'
UNION ALL
SELECT
  '╚═══════════════════════════════════════════════════════════════╝'
UNION ALL
SELECT
  ''
UNION ALL
SELECT
  'Revisar los resultados arriba para identificar el problema.'
UNION ALL
SELECT
  ''
UNION ALL
SELECT
  'Si "superadmin" NO aparece en la policy, ejecutar:'
UNION ALL
SELECT
  '  → migrations/011_fix_reuniones_insert_superadmin_URGENTE.sql'
UNION ALL
SELECT
  '';
