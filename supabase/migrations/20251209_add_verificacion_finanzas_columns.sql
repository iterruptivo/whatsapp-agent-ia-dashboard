-- ============================================================================
-- MIGRATION: Agregar columnas de verificación por Finanzas a abonos_pago
-- ============================================================================
-- Fecha: 9 Diciembre 2025
-- Sesión: 67
-- Descripción: Columnas para tracking de verificación de abonos por rol Finanzas
-- ============================================================================

-- Agregar columnas de verificación por Finanzas
ALTER TABLE abonos_pago
ADD COLUMN IF NOT EXISTS verificado_finanzas BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verificado_finanzas_por UUID REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS verificado_finanzas_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verificado_finanzas_nombre TEXT;

-- Índice para búsquedas por estado de verificación
CREATE INDEX IF NOT EXISTS idx_abonos_pago_verificado_finanzas ON abonos_pago(verificado_finanzas);

-- Comentarios
COMMENT ON COLUMN abonos_pago.verificado_finanzas IS 'Indica si el abono fue verificado por rol Finanzas (IRREVERSIBLE)';
COMMENT ON COLUMN abonos_pago.verificado_finanzas_por IS 'UUID del usuario Finanzas que verificó el abono';
COMMENT ON COLUMN abonos_pago.verificado_finanzas_at IS 'Fecha y hora de la verificación';
COMMENT ON COLUMN abonos_pago.verificado_finanzas_nombre IS 'Nombre del usuario que verificó (snapshot)';
