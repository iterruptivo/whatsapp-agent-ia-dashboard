-- Migración 022: Agregar campo observaciones_vendedor a leads
-- Propósito: Campo para que asesores de venta registren notas post-conversación
-- Similar a campos de "wrap-up" en marcadores predictivos

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS observaciones_vendedor TEXT;

-- Comentario descriptivo
COMMENT ON COLUMN leads.observaciones_vendedor IS 'Observaciones del vendedor después de contactar al lead';
