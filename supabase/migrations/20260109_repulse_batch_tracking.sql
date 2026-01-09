-- ============================================================================
-- MIGRATION: Agregar tracking de batch para envios masivos de repulse
-- Fecha: 2026-01-09
-- Descripcion: Agrega campos batch_id y envio_estado a repulse_historial
--              para permitir tracking de progreso en tiempo real
-- ============================================================================

-- 1. Agregar columnas para batch tracking
ALTER TABLE repulse_historial
ADD COLUMN IF NOT EXISTS batch_id UUID,
ADD COLUMN IF NOT EXISTS envio_estado VARCHAR(20) DEFAULT 'enviado',
ADD COLUMN IF NOT EXISTS envio_error TEXT;

-- 2. Crear constraint para estados validos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'repulse_historial_envio_estado_check'
  ) THEN
    ALTER TABLE repulse_historial
    ADD CONSTRAINT repulse_historial_envio_estado_check
    CHECK (envio_estado IN ('pendiente', 'enviando', 'enviado', 'error'));
  END IF;
END $$;

-- 3. Crear indices para performance
CREATE INDEX IF NOT EXISTS idx_repulse_historial_batch_id
ON repulse_historial(batch_id);

CREATE INDEX IF NOT EXISTS idx_repulse_historial_batch_estado
ON repulse_historial(batch_id, envio_estado);

-- 4. Habilitar Realtime para la tabla (si no esta habilitado)
-- NOTA: Ejecutar manualmente en Supabase Dashboard si es necesario:
-- ALTER PUBLICATION supabase_realtime ADD TABLE repulse_historial;

-- 5. Comentarios
COMMENT ON COLUMN repulse_historial.batch_id IS 'UUID del batch de envio masivo para tracking de progreso';
COMMENT ON COLUMN repulse_historial.envio_estado IS 'Estado del envio: pendiente, enviando, enviado, error';
COMMENT ON COLUMN repulse_historial.envio_error IS 'Mensaje de error si el envio fallo';
