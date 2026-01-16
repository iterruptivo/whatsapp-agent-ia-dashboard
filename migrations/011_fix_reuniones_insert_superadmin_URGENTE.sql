-- ============================================================================
-- FIX URGENTE: Permitir a superadmin crear reuniones
-- ============================================================================
-- Fecha: 16 Enero 2026
-- Problema: Usuario superadmin (gerente.ti@ecoplaza.com.pe) no puede crear reuniones
--           Error: "new row violates row-level security policy"
-- Causa: La policy "Reuniones - Insert" actual NO incluye rol 'superadmin'
-- Solución: Actualizar policy INSERT para incluir superadmin
-- ============================================================================

-- ============================================================================
-- DIAGNÓSTICO DEL PROBLEMA
-- ============================================================================
-- La policy actual (de migración 20260106_create_reuniones_tables.sql) es:
--
-- CREATE POLICY "Reuniones - Insert"
-- ON reuniones FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   EXISTS (
--     SELECT 1 FROM usuarios
--     WHERE id = auth.uid()
--     AND rol IN ('admin', 'gerencia', 'jefe_ventas')  <-- NO INCLUYE 'superadmin'
--   )
-- );
--
-- La migración 010_reuniones_permisos_compartir.sql ya tiene el fix correcto
-- (líneas 101-110) pero aún no se ha ejecutado en Supabase.
-- ============================================================================

-- ============================================================================
-- PASO 1: VERIFICAR PROBLEMA (antes del fix)
-- ============================================================================
DO $$
DECLARE
  v_policy_definition TEXT;
  v_has_superadmin BOOLEAN;
BEGIN
  -- Obtener la definición actual de la policy
  SELECT definition INTO v_policy_definition
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'reuniones'
    AND policyname = 'Reuniones - Insert';

  -- Verificar si incluye 'superadmin'
  v_has_superadmin := v_policy_definition LIKE '%superadmin%';

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'DIAGNÓSTICO - Policy "Reuniones - Insert"';
  RAISE NOTICE '===========================================';

  IF v_has_superadmin THEN
    RAISE NOTICE 'Estado: Ya incluye superadmin (fix ya aplicado)';
  ELSE
    RAISE NOTICE 'Estado: NO incluye superadmin (necesita fix)';
  END IF;

  RAISE NOTICE 'Definición actual: %', SUBSTRING(v_policy_definition, 1, 200);
  RAISE NOTICE '===========================================';
END $$;

-- ============================================================================
-- PASO 2: APLICAR FIX - RECREAR POLICY INSERT
-- ============================================================================

-- DROP la policy existente
DROP POLICY IF EXISTS "Reuniones - Insert" ON reuniones;

-- Recrear policy con superadmin incluido
CREATE POLICY "Reuniones - Insert"
ON reuniones FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('superadmin', 'admin', 'gerencia', 'jefe_ventas')  -- AHORA INCLUYE superadmin
  )
);

COMMENT ON POLICY "Reuniones - Insert" ON reuniones IS
  'Permite INSERT a superadmin, admin, gerencia y jefe_ventas. Fixed 16-Ene-2026.';

-- ============================================================================
-- PASO 3: VERIFICAR FIX (después de aplicar)
-- ============================================================================
DO $$
DECLARE
  v_policy_definition TEXT;
  v_has_superadmin BOOLEAN;
BEGIN
  -- Obtener la nueva definición de la policy
  SELECT definition INTO v_policy_definition
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'reuniones'
    AND policyname = 'Reuniones - Insert';

  -- Verificar si incluye 'superadmin'
  v_has_superadmin := v_policy_definition LIKE '%superadmin%';

  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'VERIFICACIÓN POST-FIX';
  RAISE NOTICE '===========================================';

  IF v_has_superadmin THEN
    RAISE NOTICE 'Estado: OK ✓ - Policy ahora incluye superadmin';
  ELSE
    RAISE WARNING 'Estado: ERROR ✗ - Policy aún NO incluye superadmin';
  END IF;

  RAISE NOTICE 'Definición actualizada: %', SUBSTRING(v_policy_definition, 1, 200);
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASO 4: TEST SIMULADO - Verificar que superadmin puede insertar
-- ============================================================================

-- Verificar que existe al menos un usuario superadmin activo
DO $$
DECLARE
  v_superadmin_count INT;
  v_gerente_ti_exists BOOLEAN;
BEGIN
  -- Contar usuarios superadmin activos
  SELECT COUNT(*) INTO v_superadmin_count
  FROM usuarios
  WHERE rol = 'superadmin' AND activo = true;

  -- Verificar si gerente.ti existe
  SELECT EXISTS (
    SELECT 1 FROM usuarios
    WHERE email = 'gerente.ti@ecoplaza.com.pe'
      AND rol = 'superadmin'
      AND activo = true
  ) INTO v_gerente_ti_exists;

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'VERIFICACIÓN DE USUARIOS';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total usuarios superadmin activos: %', v_superadmin_count;
  RAISE NOTICE 'Usuario gerente.ti@ecoplaza.com.pe existe: %',
    CASE WHEN v_gerente_ti_exists THEN 'SI ✓' ELSE 'NO ✗' END;
  RAISE NOTICE '===========================================';

  IF NOT v_gerente_ti_exists THEN
    RAISE WARNING 'El usuario gerente.ti@ecoplaza.com.pe NO existe o NO es superadmin';
  END IF;
END $$;

-- ============================================================================
-- PASO 5: RESUMEN Y PRÓXIMOS PASOS
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  FIX COMPLETADO: Reuniones - Insert Policy                    ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Policy "Reuniones - Insert" actualizada';
  RAISE NOTICE '✓ Ahora incluye rol: superadmin';
  RAISE NOTICE '✓ Roles permitidos para INSERT: superadmin, admin, gerencia, jefe_ventas';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'PRÓXIMOS PASOS:';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '1. Usuario gerente.ti@ecoplaza.com.pe debe poder crear reuniones';
  RAISE NOTICE '2. Probar crear una reunión desde el dashboard';
  RAISE NOTICE '3. Si persiste error, verificar:';
  RAISE NOTICE '   - Que el usuario esté autenticado correctamente';
  RAISE NOTICE '   - Que auth.uid() coincida con usuarios.id';
  RAISE NOTICE '   - Que el usuario esté activo (activo = true)';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'COMANDO PARA VERIFICAR EN SUPABASE SQL EDITOR:';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '  SELECT * FROM pg_policies';
  RAISE NOTICE '  WHERE tablename = ''reuniones''';
  RAISE NOTICE '  AND policyname = ''Reuniones - Insert'';';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
