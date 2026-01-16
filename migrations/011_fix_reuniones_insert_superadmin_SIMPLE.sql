-- ============================================================================
-- FIX URGENTE: Permitir a superadmin crear reuniones
-- ============================================================================
-- Fecha: 16 Enero 2026
-- Problema: Usuario superadmin (gerente.ti@ecoplaza.com.pe) no puede crear reuniones
--           Error: "new row violates row-level security policy"
-- Solución: Actualizar policy INSERT para incluir superadmin
-- ============================================================================

-- Versión simplificada sin diagnósticos (evita error con pg_policies.definition)

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
    AND activo = true
  )
);

COMMENT ON POLICY "Reuniones - Insert" ON reuniones IS
  'Permite INSERT a superadmin, admin, gerencia y jefe_ventas. Fixed 16-Ene-2026.';

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔═══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  FIX COMPLETADO: Reuniones - Insert Policy                    ║';
  RAISE NOTICE '╚═══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Policy "Reuniones - Insert" actualizada';
  RAISE NOTICE '✓ Ahora incluye rol: superadmin';
  RAISE NOTICE '✓ Roles permitidos: superadmin, admin, gerencia, jefe_ventas';
  RAISE NOTICE '';
END $$;
