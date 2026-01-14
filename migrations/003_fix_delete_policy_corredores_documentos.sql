-- ============================================================================
-- MIGRACIÓN: Fix DELETE policy para corredores_documentos
-- ============================================================================
-- Fecha: 13 Enero 2026
-- Problema: Los corredores no pueden eliminar documentos porque falta
--           la política RLS para DELETE
-- Solución: Agregar política que permite DELETE solo cuando el registro
--           está en estado 'borrador' u 'observado'
-- ============================================================================

-- ============================================================================
-- CREAR POLÍTICA DELETE PARA CORREDORES
-- ============================================================================

CREATE POLICY "Corredor elimina sus documentos"
  ON corredores_documentos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM corredores_registro
      WHERE id = registro_id
      AND usuario_id = auth.uid()
      AND estado IN ('borrador', 'observado')
    )
  );

-- ============================================================================
-- COMENTARIO
-- ============================================================================

COMMENT ON POLICY "Corredor elimina sus documentos" ON corredores_documentos IS
'Permite a corredores eliminar documentos solo cuando su registro está en borrador u observado';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Para verificar que la política se creó correctamente:
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   cmd
-- FROM pg_policies
-- WHERE tablename = 'corredores_documentos'
-- ORDER BY cmd;
