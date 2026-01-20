-- ============================================================================
-- MIGRACIÓN 011: Boletas Vinculadas a Comprobantes de Pago
-- ============================================================================
-- Permite a Finanzas vincular boletas/facturas a cada comprobante de pago
-- ============================================================================

-- Agregar campo boletas_vinculadas a clientes_ficha
ALTER TABLE clientes_ficha
ADD COLUMN IF NOT EXISTS boletas_vinculadas JSONB DEFAULT '[]';

-- Estructura del JSONB:
-- [
--   {
--     "voucher_index": 0,           -- Índice del voucher en comprobante_deposito_fotos
--     "boleta_url": "https://...",  -- URL del archivo de boleta
--     "numero_boleta": "B001-00123",-- Número de boleta/factura
--     "tipo": "boleta",             -- "boleta" | "factura"
--     "uploaded_at": "2026-01-20T...",
--     "uploaded_by_id": "uuid...",
--     "uploaded_by_nombre": "Rosa Quispe"
--   }
-- ]

-- Comentario descriptivo
COMMENT ON COLUMN clientes_ficha.boletas_vinculadas IS 'Array JSON de boletas/facturas vinculadas a cada comprobante de pago (voucher)';

-- Índice para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_clientes_ficha_boletas_vinculadas
ON clientes_ficha USING GIN (boletas_vinculadas);
