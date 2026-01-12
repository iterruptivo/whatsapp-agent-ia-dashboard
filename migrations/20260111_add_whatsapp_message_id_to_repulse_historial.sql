-- ============================================================================
-- MIGRACIÓN: Agregar whatsapp_message_id a repulse_historial
-- Fecha: 2026-01-11
-- Descripción: Guarda el ID del mensaje de WhatsApp devuelto por Meta API
--              para trazabilidad y debugging
-- ============================================================================

-- Agregar columna whatsapp_message_id
ALTER TABLE repulse_historial
ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

-- Comentario para documentar
COMMENT ON COLUMN repulse_historial.whatsapp_message_id IS 'ID del mensaje WhatsApp devuelto por Meta API (wamid.xxx) para trazabilidad';

-- Índice para búsquedas por whatsapp_message_id (útil para webhooks de status)
CREATE INDEX IF NOT EXISTS idx_repulse_historial_whatsapp_message_id
ON repulse_historial(whatsapp_message_id)
WHERE whatsapp_message_id IS NOT NULL;
