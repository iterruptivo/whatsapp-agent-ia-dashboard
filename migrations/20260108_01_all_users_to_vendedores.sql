-- ============================================================================
-- MIGRACIÓN: Crear registros en vendedores para usuarios que no tienen
-- Fecha: 2026-01-08
-- Propósito: Todos los usuarios deben poder vender, por lo tanto todos
--            necesitan un registro en la tabla vendedores
-- Copia teléfono desde usuarios_datos_no_vendedores si existe
-- ============================================================================

-- Primero verificar cuántos usuarios no tienen vendedor_id
SELECT COUNT(*) as usuarios_sin_vendedor
FROM usuarios
WHERE vendedor_id IS NULL;

-- Migración principal
DO $$
DECLARE
  usuario_record RECORD;
  nuevo_vendedor_id UUID;
  telefono_encontrado TEXT;
  contador INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Iniciando migración: usuarios a vendedores ===';

  -- Buscar usuarios sin vendedor_id
  FOR usuario_record IN
    SELECT
      u.id as usuario_id,
      u.nombre,
      u.email,
      u.rol,
      u.activo as usuario_activo,
      udnv.telefono as telefono_no_vendedor
    FROM usuarios u
    LEFT JOIN usuarios_datos_no_vendedores udnv ON udnv.usuario_id = u.id
    WHERE u.vendedor_id IS NULL
  LOOP
    -- Determinar teléfono (de usuarios_datos_no_vendedores o vacío)
    telefono_encontrado := COALESCE(usuario_record.telefono_no_vendedor, '');

    -- Crear registro en vendedores
    INSERT INTO vendedores (nombre, telefono, activo, created_at)
    VALUES (
      usuario_record.nombre,
      telefono_encontrado,
      usuario_record.usuario_activo,  -- mismo estado activo
      NOW()
    )
    RETURNING id INTO nuevo_vendedor_id;

    -- Actualizar usuario con el nuevo vendedor_id
    UPDATE usuarios
    SET vendedor_id = nuevo_vendedor_id
    WHERE id = usuario_record.usuario_id;

    contador := contador + 1;

    -- Log para verificación
    RAISE NOTICE 'Migrado: % (%) [%] → vendedor_id: %, telefono: "%"',
      usuario_record.nombre,
      usuario_record.email,
      usuario_record.rol,
      nuevo_vendedor_id,
      telefono_encontrado;
  END LOOP;

  RAISE NOTICE '=== Migración completada: % usuarios migrados ===', contador;
END $$;

-- Verificación final: Mostrar todos los usuarios con sus datos de vendedor
SELECT
  u.nombre,
  u.email,
  u.rol,
  u.activo as usuario_activo,
  v.id as vendedor_id,
  v.telefono,
  v.activo as vendedor_activo
FROM usuarios u
LEFT JOIN vendedores v ON v.id = u.vendedor_id
ORDER BY u.created_at DESC;

-- Verificar que no queden usuarios sin vendedor_id
SELECT COUNT(*) as usuarios_sin_vendedor_despues
FROM usuarios
WHERE vendedor_id IS NULL;

-- IMPORTANTE: Si este número es > 0, hay un problema
