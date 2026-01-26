-- ============================================================================
-- MIGRACIÓN 027: Campos para boleta con OCR
-- Sesión 108 - 26 Enero 2026
-- ============================================================================

-- Imagen de la boleta
ALTER TABLE depositos_ficha
ADD COLUMN IF NOT EXISTS boleta_imagen_url TEXT;

-- Flag si número boleta fue editado manualmente
ALTER TABLE depositos_ficha
ADD COLUMN IF NOT EXISTS numero_boleta_editado BOOLEAN DEFAULT false;

-- Confianza OCR de la boleta (0-100)
ALTER TABLE depositos_ficha
ADD COLUMN IF NOT EXISTS numero_boleta_confianza INTEGER;

-- Comentarios
COMMENT ON COLUMN depositos_ficha.boleta_imagen_url IS 'URL de imagen de la boleta/factura';
COMMENT ON COLUMN depositos_ficha.numero_boleta_confianza IS 'Confianza del OCR al extraer número de boleta (0-100)';
