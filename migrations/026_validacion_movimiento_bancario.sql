-- ============================================================================
-- MIGRACIÓN 026: Campos para validación con movimiento bancario OCR
-- Sesión 108 - 26 Enero 2026
-- ============================================================================

-- Imagen del movimiento bancario (captura del reporte del banco)
ALTER TABLE depositos_ficha
ADD COLUMN IF NOT EXISTS imagen_movimiento_bancario_url TEXT;

-- Número de operación extraído del movimiento bancario (OCR)
ALTER TABLE depositos_ficha
ADD COLUMN IF NOT EXISTS numero_operacion_banco VARCHAR(100);

-- Flag si fue editado manualmente
ALTER TABLE depositos_ficha
ADD COLUMN IF NOT EXISTS numero_operacion_banco_editado BOOLEAN DEFAULT false;

-- Confianza del OCR (0-100)
ALTER TABLE depositos_ficha
ADD COLUMN IF NOT EXISTS numero_operacion_banco_confianza INTEGER;

-- Comentario
COMMENT ON COLUMN depositos_ficha.imagen_movimiento_bancario_url IS 'URL de imagen del movimiento bancario (captura del reporte del banco)';
COMMENT ON COLUMN depositos_ficha.numero_operacion_banco IS 'Número de operación extraído por OCR del movimiento bancario';
