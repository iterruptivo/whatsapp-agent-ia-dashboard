-- ============================================================================
-- MIGRACIÓN 029: Campos para contrato firmado en ficha
-- Sesión 108 - 26 Enero 2026
-- ============================================================================

ALTER TABLE clientes_ficha
ADD COLUMN IF NOT EXISTS contrato_firmado BOOLEAN DEFAULT false;

ALTER TABLE clientes_ficha
ADD COLUMN IF NOT EXISTS contrato_fecha_firma DATE;

ALTER TABLE clientes_ficha
ADD COLUMN IF NOT EXISTS contrato_url TEXT;

ALTER TABLE clientes_ficha
ADD COLUMN IF NOT EXISTS contrato_subido_por UUID REFERENCES usuarios(id);

ALTER TABLE clientes_ficha
ADD COLUMN IF NOT EXISTS contrato_subido_at TIMESTAMPTZ;

-- Comentarios
COMMENT ON COLUMN clientes_ficha.contrato_firmado IS 'Indica si el contrato ha sido firmado y legalizado';
COMMENT ON COLUMN clientes_ficha.contrato_fecha_firma IS 'Fecha en que se firmó el contrato';
COMMENT ON COLUMN clientes_ficha.contrato_url IS 'URL del contrato escaneado en Storage';
