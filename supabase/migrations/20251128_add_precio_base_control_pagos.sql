-- ============================================================================
-- MIGRATION: Agregar precio_base a control_pagos
-- ============================================================================
-- Fecha: 28 Noviembre 2025
-- Sesión: 57
-- Descripción: Agregar columna precio_base (snapshot del local)
-- ============================================================================

-- Agregar columna precio_base a control_pagos
ALTER TABLE control_pagos
ADD COLUMN IF NOT EXISTS precio_base NUMERIC(12,2);

-- Comentario de la columna
COMMENT ON COLUMN control_pagos.precio_base IS 'Snapshot del precio base del local al momento de procesar. Puede ser NULL si no fue configurado en el local.';
