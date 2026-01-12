-- ============================================================================
-- MIGRATION: Agregar políticas RLS para tablas Repulse (incluir superadmin)
-- Fecha: 11 Enero 2026
-- ============================================================================
-- Problema: El rol superadmin no puede insertar en repulse_historial
-- Solución: Agregar políticas RLS que incluyan superadmin junto con admin y jefe_ventas
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Habilitar RLS en tablas repulse (si no está habilitado)
-- ============================================================================

ALTER TABLE repulse_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE repulse_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE repulse_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 2: Políticas para repulse_historial
-- ============================================================================

-- SELECT: Admins, superadmin y jefe_ventas pueden ver todo
DROP POLICY IF EXISTS "repulse_historial_select_policy" ON repulse_historial;
CREATE POLICY "repulse_historial_select_policy"
  ON repulse_historial FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND activo = true
        AND rol IN ('superadmin', 'admin', 'jefe_ventas')
    )
  );

-- INSERT: Admins, superadmin y jefe_ventas pueden insertar
DROP POLICY IF EXISTS "repulse_historial_insert_policy" ON repulse_historial;
CREATE POLICY "repulse_historial_insert_policy"
  ON repulse_historial FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND activo = true
        AND rol IN ('superadmin', 'admin', 'jefe_ventas')
    )
  );

-- UPDATE: Admins, superadmin y jefe_ventas pueden actualizar
DROP POLICY IF EXISTS "repulse_historial_update_policy" ON repulse_historial;
CREATE POLICY "repulse_historial_update_policy"
  ON repulse_historial FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND activo = true
        AND rol IN ('superadmin', 'admin', 'jefe_ventas')
    )
  );

-- ============================================================================
-- PASO 3: Políticas para repulse_leads
-- ============================================================================

-- SELECT: Admins, superadmin y jefe_ventas pueden ver todo
DROP POLICY IF EXISTS "repulse_leads_select_policy" ON repulse_leads;
CREATE POLICY "repulse_leads_select_policy"
  ON repulse_leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND activo = true
        AND rol IN ('superadmin', 'admin', 'jefe_ventas')
    )
  );

-- INSERT: Admins, superadmin y jefe_ventas pueden insertar
DROP POLICY IF EXISTS "repulse_leads_insert_policy" ON repulse_leads;
CREATE POLICY "repulse_leads_insert_policy"
  ON repulse_leads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND activo = true
        AND rol IN ('superadmin', 'admin', 'jefe_ventas')
    )
  );

-- UPDATE: Admins, superadmin y jefe_ventas pueden actualizar
DROP POLICY IF EXISTS "repulse_leads_update_policy" ON repulse_leads;
CREATE POLICY "repulse_leads_update_policy"
  ON repulse_leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND activo = true
        AND rol IN ('superadmin', 'admin', 'jefe_ventas')
    )
  );

-- DELETE: Solo admins y superadmin pueden eliminar
DROP POLICY IF EXISTS "repulse_leads_delete_policy" ON repulse_leads;
CREATE POLICY "repulse_leads_delete_policy"
  ON repulse_leads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND activo = true
        AND rol IN ('superadmin', 'admin')
    )
  );

-- ============================================================================
-- PASO 4: Políticas para repulse_templates
-- ============================================================================

-- SELECT: Admins, superadmin y jefe_ventas pueden ver todo
DROP POLICY IF EXISTS "repulse_templates_select_policy" ON repulse_templates;
CREATE POLICY "repulse_templates_select_policy"
  ON repulse_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND activo = true
        AND rol IN ('superadmin', 'admin', 'jefe_ventas')
    )
  );

-- INSERT: Admins y superadmin pueden insertar
DROP POLICY IF EXISTS "repulse_templates_insert_policy" ON repulse_templates;
CREATE POLICY "repulse_templates_insert_policy"
  ON repulse_templates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND activo = true
        AND rol IN ('superadmin', 'admin')
    )
  );

-- UPDATE: Admins y superadmin pueden actualizar
DROP POLICY IF EXISTS "repulse_templates_update_policy" ON repulse_templates;
CREATE POLICY "repulse_templates_update_policy"
  ON repulse_templates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND activo = true
        AND rol IN ('superadmin', 'admin')
    )
  );

-- DELETE: Solo admins y superadmin pueden eliminar
DROP POLICY IF EXISTS "repulse_templates_delete_policy" ON repulse_templates;
CREATE POLICY "repulse_templates_delete_policy"
  ON repulse_templates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND activo = true
        AND rol IN ('superadmin', 'admin')
    )
  );

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename IN ('repulse_historial', 'repulse_leads', 'repulse_templates');

  RAISE NOTICE '========================================';
  RAISE NOTICE 'POLÍTICAS RLS REPULSE CREADAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total políticas creadas: %', v_policy_count;
  RAISE NOTICE 'Roles con acceso: superadmin, admin, jefe_ventas';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
