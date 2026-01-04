-- ============================================================================
-- MIGRACION: Contratos Flexibles (FASE 7)
-- ============================================================================
-- Descripcion: Agrega campos para soportar templates personalizados por contrato
-- Fecha: 01 Enero 2026
-- ============================================================================

-- Agregar campos a control_pagos para registrar template usado
ALTER TABLE control_pagos
ADD COLUMN IF NOT EXISTS contrato_template_personalizado_url TEXT,
ADD COLUMN IF NOT EXISTS contrato_template_usado VARCHAR(255),
ADD COLUMN IF NOT EXISTS contrato_generado_url TEXT,
ADD COLUMN IF NOT EXISTS contrato_generado_at TIMESTAMP WITH TIME ZONE;

-- Comentarios para documentacion
COMMENT ON COLUMN control_pagos.contrato_template_personalizado_url IS 'URL del template personalizado si se uso uno diferente al del proyecto';
COMMENT ON COLUMN control_pagos.contrato_template_usado IS 'Nombre del template que se uso para generar el contrato';
COMMENT ON COLUMN control_pagos.contrato_generado_url IS 'URL del contrato generado guardado en Storage';
COMMENT ON COLUMN control_pagos.contrato_generado_at IS 'Fecha y hora de generacion del contrato';

-- ============================================================================
-- FIN MIGRACION
-- ============================================================================
