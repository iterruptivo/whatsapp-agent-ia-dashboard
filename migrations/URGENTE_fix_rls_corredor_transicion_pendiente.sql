-- ============================================================================
-- FIX URGENTE: Permitir a corredores enviar solicitud (borrador → pendiente)
-- ============================================================================
-- Problema: La política WITH CHECK bloqueaba la transición a 'pendiente'
-- Solución: Permitir estado 'pendiente' en WITH CHECK
-- Fecha: 2026-01-13
-- ============================================================================

-- 1. Eliminar política restrictiva actual
DROP POLICY IF EXISTS "Corredor edita su registro" ON corredores_registro;

-- 2. Crear política que permite transición a 'pendiente'
CREATE POLICY "Corredor edita su registro"
  ON corredores_registro
  FOR UPDATE
  USING (
    -- Solo puede editar su propio registro
    usuario_id = auth.uid()
    -- Solo puede editar si está en estado borrador u observado
    AND estado IN ('borrador', 'observado')
  )
  WITH CHECK (
    -- Validar que sigue siendo su registro
    usuario_id = auth.uid()
    -- IMPORTANTE: Permitir transición a 'pendiente' además de mantener borrador/observado
    AND estado IN ('borrador', 'observado', 'pendiente')
  );

-- 3. Verificar que la política se creó correctamente
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
WHERE tablename = 'corredores_registro'
  AND policyname = 'Corredor edita su registro';

-- ============================================================================
-- Resultado esperado:
-- - DROP POLICY: SUCCESS
-- - CREATE POLICY: SUCCESS
-- - SELECT: Debe mostrar la nueva política con estado IN ('borrador', 'observado', 'pendiente')
-- ============================================================================
