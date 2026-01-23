-- =============================================================================
-- Migración: Agregar columna notas_validacion a depositos_ficha
-- Fecha: 2026-01-23
-- Descripción: La migración original (012) creó 'notas_verificacion' pero el
--              código usa 'notas_validacion'. Esta migración agrega la columna
--              correcta que espera el código.
-- =============================================================================

-- Agregar columna notas_validacion si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'depositos_ficha'
    AND column_name = 'notas_validacion'
  ) THEN
    ALTER TABLE depositos_ficha ADD COLUMN notas_validacion TEXT;
    RAISE NOTICE 'Columna notas_validacion agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna notas_validacion ya existe';
  END IF;
END
$$;

-- Comentario para la columna
COMMENT ON COLUMN depositos_ficha.notas_validacion IS
'Notas adicionales ingresadas durante la validación del depósito por Finanzas';
