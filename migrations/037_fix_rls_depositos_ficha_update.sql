-- =============================================================================
-- Migración: Fix RLS Policy UPDATE en depositos_ficha
-- Fecha: 2026-01-28
-- Descripción: Agregar roles faltantes a la política de UPDATE
--              Roles que pueden editar vouchers pero estaban excluidos:
--              - vendedor, vendedor_caseta, coordinador, caseta, corredor
-- Problema: Vendedores podían crear depósitos pero no editarlos
--           Supabase silenciosamente actualizaba 0 filas sin error
-- =============================================================================

-- =============================================================================
-- PASO 1: Eliminar la política actual de UPDATE
-- =============================================================================

DROP POLICY IF EXISTS "depositos_ficha_update" ON depositos_ficha;

-- =============================================================================
-- PASO 2: Crear nueva política con TODOS los roles que pueden editar vouchers
-- =============================================================================

CREATE POLICY "depositos_ficha_update" ON depositos_ficha
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.rol IN (
        'admin',
        'superadmin',
        'jefe_ventas',
        'vendedor',
        'caseta',
        'finanzas',
        'coordinador',
        'vendedor_caseta',
        'corredor',
        'gerencia'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.rol IN (
        'admin',
        'superadmin',
        'jefe_ventas',
        'vendedor',
        'caseta',
        'finanzas',
        'coordinador',
        'vendedor_caseta',
        'corredor',
        'gerencia'
      )
    )
  );

-- =============================================================================
-- COMENTARIOS
-- =============================================================================

COMMENT ON POLICY "depositos_ficha_update" ON depositos_ficha IS
'Permite UPDATE a todos los roles que pueden editar vouchers en fichas de inscripción: admin, superadmin, jefe_ventas, vendedor, caseta, finanzas, coordinador, vendedor_caseta, corredor, gerencia';

-- =============================================================================
-- VALIDACIÓN
-- =============================================================================

-- Verificar que la política fue creada correctamente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'depositos_ficha'
    AND policyname = 'depositos_ficha_update'
  ) THEN
    RAISE EXCEPTION 'ERROR: Política depositos_ficha_update no fue creada correctamente';
  END IF;

  RAISE NOTICE 'OK: Política depositos_ficha_update actualizada exitosamente';
END $$;
