-- ============================================================================
-- MIGRACIÓN: Fix - Agregar política DELETE para corredores_documentos
-- ============================================================================
-- Fecha: 13 Enero 2026
-- Descripción: Permite a corredores eliminar sus propios documentos cuando el
--              registro está en estado 'borrador' u 'observado'
-- ============================================================================

-- Política para que corredor pueda eliminar sus documentos
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
-- COMENTARIOS
-- ============================================================================

COMMENT ON POLICY "Corredor elimina sus documentos" ON corredores_documentos IS
  'Permite a corredor eliminar documentos solo si el registro está en borrador u observado';
