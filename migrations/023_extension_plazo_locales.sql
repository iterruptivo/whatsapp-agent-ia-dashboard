-- =====================================================================
-- Migración 023: Extensión de Plazo de Reserva de Locales
-- =====================================================================
-- Descripción: Agrega columnas para gestionar la extensión única de
--              plazo de reserva de locales (máximo 1 extensión por local)
-- Fecha: 2026-01-23
-- =====================================================================

-- Contador de extensiones usadas (0 = sin usar, 1 = extensión usada)
ALTER TABLE locales
ADD COLUMN IF NOT EXISTS extension_dias INTEGER DEFAULT 0;

COMMENT ON COLUMN locales.extension_dias IS 'Número de extensiones de plazo utilizadas (0 o 1 máximo)';

-- Usuario que realizó la extensión (FK a usuarios)
ALTER TABLE locales
ADD COLUMN IF NOT EXISTS extension_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN locales.extension_usuario_id IS 'ID del usuario (jefe_ventas) que autorizó la extensión';

-- Motivo de la extensión
ALTER TABLE locales
ADD COLUMN IF NOT EXISTS extension_motivo TEXT;

COMMENT ON COLUMN locales.extension_motivo IS 'Justificación para la extensión de plazo';

-- Timestamp de cuándo se hizo la extensión
ALTER TABLE locales
ADD COLUMN IF NOT EXISTS extension_at TIMESTAMPTZ;

COMMENT ON COLUMN locales.extension_at IS 'Fecha y hora en que se realizó la extensión';

-- Índice para locales con extensión activa
CREATE INDEX IF NOT EXISTS idx_locales_extension_dias
ON locales(extension_dias)
WHERE extension_dias > 0;

-- Constraint para validar que extension_dias solo sea 0 o 1
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_locales_extension_dias_valido'
  ) THEN
    ALTER TABLE locales
    ADD CONSTRAINT chk_locales_extension_dias_valido
    CHECK (extension_dias >= 0 AND extension_dias <= 1);
  END IF;
END $$;
