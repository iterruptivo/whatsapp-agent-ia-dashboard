-- ============================================================================
-- MIGRACIÓN 005: Fix RLS - Corredores pueden enviar solicitud
-- ============================================================================
-- Fecha: 13 Enero 2026
-- Problema: Error 42501 al intentar cambiar estado de 'borrador' a 'pendiente'
-- Causa: Política RLS solo evalúa estado actual, bloquea transición a 'pendiente'
-- Solución: Permitir UPDATE cuando el corredor cambia su solicitud a 'pendiente'
-- ============================================================================

-- Eliminar política restrictiva actual
DROP POLICY IF EXISTS "Corredor edita su registro" ON corredores_registro;

-- Crear nueva política que permite:
-- 1. Editar mientras está en 'borrador' o 'observado' (cualquier cambio)
-- 2. Cambiar estado a 'pendiente' desde 'borrador' o 'observado'
CREATE POLICY "Corredor edita su registro"
  ON corredores_registro
  FOR UPDATE
  USING (
    usuario_id = auth.uid()
    AND (
      -- Permite editar si el estado actual es borrador u observado
      estado IN ('borrador', 'observado')
      -- O si está cambiando a pendiente desde borrador/observado
      -- (esto cubre el caso de envío de solicitud)
    )
  )
  WITH CHECK (
    usuario_id = auth.uid()
    AND (
      -- Permite mantener estado borrador u observado
      estado IN ('borrador', 'observado')
      -- O cambiar a pendiente (envío de solicitud)
      OR estado = 'pendiente'
    )
  );

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON POLICY "Corredor edita su registro" ON corredores_registro IS
'Permite a corredores editar su registro en estado borrador/observado y enviar solicitud cambiando a pendiente';

-- ============================================================================
-- VALIDACIÓN
-- ============================================================================

-- Para verificar que la política fue creada correctamente:
-- SELECT * FROM pg_policies WHERE tablename = 'corredores_registro' AND policyname = 'Corredor edita su registro';
