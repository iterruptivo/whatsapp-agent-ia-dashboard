-- ============================================================================
-- Migration: Add verificacion_finanzas fields to abonos_pago
-- Date: 9 Diciembre 2025
-- Session: 67 - Sistema de Verificación por Finanzas
-- ============================================================================
--
-- Agrega campos para que el rol 'finanzas' pueda dar visto bueno a cada abono
-- registrado (separación, inicial, cuotas).
--
-- Campos:
-- - verificado_finanzas: boolean (si finanzas dio el visto bueno)
-- - verificado_finanzas_por: UUID del usuario que verificó
-- - verificado_finanzas_at: timestamp de cuándo se verificó
-- - verificado_finanzas_nombre: nombre del usuario (snapshot para mostrar en UI)
-- ============================================================================

-- Agregar campos de verificación a la tabla abonos_pago
ALTER TABLE abonos_pago
ADD COLUMN IF NOT EXISTS verificado_finanzas BOOLEAN DEFAULT false;

ALTER TABLE abonos_pago
ADD COLUMN IF NOT EXISTS verificado_finanzas_por UUID REFERENCES usuarios(id);

ALTER TABLE abonos_pago
ADD COLUMN IF NOT EXISTS verificado_finanzas_at TIMESTAMPTZ;

ALTER TABLE abonos_pago
ADD COLUMN IF NOT EXISTS verificado_finanzas_nombre VARCHAR(200);

-- Crear índice para búsquedas de verificación pendiente
CREATE INDEX IF NOT EXISTS idx_abonos_verificacion_pendiente
ON abonos_pago (verificado_finanzas)
WHERE verificado_finanzas = false;

-- Comentarios descriptivos
COMMENT ON COLUMN abonos_pago.verificado_finanzas IS 'Indica si Finanzas dio visto bueno a este abono';
COMMENT ON COLUMN abonos_pago.verificado_finanzas_por IS 'UUID del usuario de Finanzas que verificó';
COMMENT ON COLUMN abonos_pago.verificado_finanzas_at IS 'Fecha y hora de la verificación (timezone Lima)';
COMMENT ON COLUMN abonos_pago.verificado_finanzas_nombre IS 'Nombre del verificador (snapshot para UI)';
