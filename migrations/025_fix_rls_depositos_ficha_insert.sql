-- =============================================================================
-- Migración: Fix RLS Policy INSERT en depositos_ficha
-- Fecha: 2026-01-24
-- Descripción: Agregar roles faltantes a la política de INSERT
--              Roles que pueden subir vouchers pero estaban excluidos:
--              - finanzas (56 depósitos históricos)
--              - coordinador (23 depósitos históricos)
--              - vendedor_caseta (344 depósitos históricos)
--              - corredor (necesitan subir vouchers)
-- Problema: 74 fichas con vouchers no normalizados por falta de permisos RLS
-- =============================================================================

-- =============================================================================
-- PASO 1: Eliminar la política actual de INSERT
-- =============================================================================

DROP POLICY IF EXISTS "depositos_ficha_insert_ventas" ON depositos_ficha;

-- =============================================================================
-- PASO 2: Crear nueva política con TODOS los roles que pueden subir vouchers
-- =============================================================================

CREATE POLICY "depositos_ficha_insert_ventas" ON depositos_ficha
  FOR INSERT
  TO authenticated
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
        'corredor'
      )
    )
  );

-- =============================================================================
-- COMENTARIOS
-- =============================================================================

COMMENT ON POLICY "depositos_ficha_insert_ventas" ON depositos_ficha IS
'Permite INSERT a todos los roles que pueden subir vouchers en fichas de inscripción: admin, superadmin, jefe_ventas, vendedor, caseta, finanzas, coordinador, vendedor_caseta, corredor';

-- =============================================================================
-- VALIDACIÓN
-- =============================================================================

-- Verificar que la política fue creada correctamente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'depositos_ficha'
    AND policyname = 'depositos_ficha_insert_ventas'
  ) THEN
    RAISE EXCEPTION 'ERROR: Política depositos_ficha_insert_ventas no fue creada correctamente';
  END IF;

  RAISE NOTICE 'OK: Política depositos_ficha_insert_ventas actualizada exitosamente';
END $$;
