-- ============================================================================
-- MIGRACIÓN: Asegurar que todos los jefe_ventas tengan vendedor_id
-- Fecha: 2026-01-20
-- Propósito: Los jefe_ventas también pueden vender y asignarse leads,
--            por lo tanto necesitan un registro en la tabla vendedores
-- ============================================================================

-- Verificar jefe_ventas sin vendedor_id ANTES
SELECT
  u.id,
  u.nombre,
  u.email,
  u.rol,
  u.vendedor_id,
  CASE WHEN u.vendedor_id IS NULL THEN 'SIN VENDEDOR_ID' ELSE 'OK' END as estado
FROM usuarios u
WHERE u.rol = 'jefe_ventas'
ORDER BY u.nombre;

-- Migración: Crear vendedor para jefe_ventas que no tengan
DO $$
DECLARE
  usuario_record RECORD;
  nuevo_vendedor_id UUID;
  telefono_encontrado TEXT;
  contador INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Iniciando migración: jefe_ventas a vendedores ===';

  -- Buscar jefe_ventas sin vendedor_id
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
      AND u.rol = 'jefe_ventas'
  LOOP
    -- Determinar teléfono (de usuarios_datos_no_vendedores o vacío)
    telefono_encontrado := COALESCE(usuario_record.telefono_no_vendedor, '');

    -- Crear registro en vendedores
    INSERT INTO vendedores (nombre, telefono, activo, created_at)
    VALUES (
      usuario_record.nombre,
      telefono_encontrado,
      usuario_record.usuario_activo,
      NOW()
    )
    RETURNING id INTO nuevo_vendedor_id;

    -- Actualizar usuario con el nuevo vendedor_id
    UPDATE usuarios
    SET vendedor_id = nuevo_vendedor_id
    WHERE id = usuario_record.usuario_id;

    contador := contador + 1;

    RAISE NOTICE 'Migrado jefe_ventas: % (%) → vendedor_id: %',
      usuario_record.nombre,
      usuario_record.email,
      nuevo_vendedor_id;
  END LOOP;

  RAISE NOTICE '=== Migración completada: % jefe_ventas migrados ===', contador;
END $$;

-- Verificación final: Mostrar todos los jefe_ventas con sus datos DESPUÉS
SELECT
  u.id,
  u.nombre,
  u.email,
  u.rol,
  u.vendedor_id,
  v.telefono as vendedor_telefono,
  v.activo as vendedor_activo,
  'OK - LISTO PARA ASIGNAR LEADS' as estado
FROM usuarios u
LEFT JOIN vendedores v ON v.id = u.vendedor_id
WHERE u.rol = 'jefe_ventas'
ORDER BY u.nombre;

-- Confirmar que no queden jefe_ventas sin vendedor_id
SELECT
  COUNT(*) as jefe_ventas_sin_vendedor,
  CASE
    WHEN COUNT(*) = 0 THEN '✓ TODOS LOS JEFE_VENTAS TIENEN VENDEDOR_ID'
    ELSE '✗ HAY JEFE_VENTAS SIN VENDEDOR_ID - REVISAR'
  END as resultado
FROM usuarios
WHERE rol = 'jefe_ventas' AND vendedor_id IS NULL;
