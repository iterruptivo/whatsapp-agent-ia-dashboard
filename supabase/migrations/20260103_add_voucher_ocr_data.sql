-- =============================================================================
-- Migración: Agregar campo para guardar datos OCR de vouchers en clientes_ficha
-- Fecha: 2026-01-03
-- Descripción: Permite persistir los datos extraídos por OCR de los comprobantes
--              de pago para que se muestren al reabrir la ficha de inscripción
-- =============================================================================

-- Agregar columna para guardar datos OCR de vouchers como JSONB
-- Estructura esperada: Array de objetos con monto, moneda, fecha, banco, etc.
ALTER TABLE clientes_ficha
ADD COLUMN IF NOT EXISTS comprobante_deposito_ocr JSONB DEFAULT NULL;

-- Comentario para documentación
COMMENT ON COLUMN clientes_ficha.comprobante_deposito_ocr IS
'Datos OCR extraídos de los comprobantes de pago. Array de objetos con estructura:
[{
  "monto": number | null,
  "moneda": "PEN" | "USD" | null,
  "fecha": string | null,
  "banco": string | null,
  "numero_operacion": string | null,
  "depositante": string | null,
  "confianza": number
}]';
