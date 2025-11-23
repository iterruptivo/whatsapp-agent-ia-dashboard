-- ============================================================================
-- FIX: Policy INSERT para locales_historial con role authenticated
-- ============================================================================
-- Fecha: 23 Noviembre 2025
-- Sesión: 54
-- Problema: Server Actions con usuario autenticado fallan al insertar en locales_historial
-- Error: "new row violates row-level security policy for table locales_historial"
-- Root Cause: No existe policy de INSERT para role 'authenticated'
-- ============================================================================

-- Crear policy de INSERT para usuarios autenticados
CREATE POLICY IF NOT EXISTS locales_historial_insert_authenticated
  ON locales_historial
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Ver todas las policies de locales_historial
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'locales_historial'
ORDER BY cmd, policyname;

-- Expected:
-- locales_historial_select_authenticated   | SELECT | authenticated
-- locales_historial_select_anon           | SELECT | anon
-- locales_historial_insert_anon           | INSERT | anon
-- locales_historial_insert_authenticated  | INSERT | authenticated (NUEVA)

-- ============================================================================
-- TESTING
-- ============================================================================
-- Después de ejecutar esta migration:
-- 1. Ir a /locales en staging
-- 2. Procesar una venta (Financiamiento → Procesar → Continuar)
-- 3. Verificar que NO hay error en Vercel logs
-- 4. Verificar que se insertó registro en locales_historial:
--    SELECT * FROM locales_historial ORDER BY created_at DESC LIMIT 5;
-- ============================================================================
