-- ============================================================================
-- MIGRACIÓN: Agregar campo reemplaza_a a tabla usuarios
-- Fecha: 2026-01-08
-- Propósito: Trazabilidad de reemplazos de usuarios
--            Cuando un usuario es reemplazado por otro, el nuevo usuario
--            tiene este campo apuntando al usuario que reemplazó
-- ============================================================================

-- Agregar campo reemplaza_a
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS reemplaza_a UUID REFERENCES usuarios(id) ON DELETE SET NULL;

-- Agregar comentario para documentación
COMMENT ON COLUMN usuarios.reemplaza_a IS 'ID del usuario al que este usuario reemplazó. Usado para trazabilidad cuando se cambia la persona en un puesto.';

-- Crear índice para consultas de historial de reemplazos
CREATE INDEX IF NOT EXISTS idx_usuarios_reemplaza_a ON usuarios(reemplaza_a) WHERE reemplaza_a IS NOT NULL;

-- Verificación: Mostrar estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;
