-- ============================================================================
-- SCRIPT: Asignar vendedor_id a Coordinadores Existentes
-- Fecha: 21 Diciembre 2025
-- Propósito: Los coordinadores que también venden necesitan vendedor_id para
--            poder ser asignados a leads en los dropdowns.
-- ============================================================================

-- ============================================================================
-- PASO 1: Ver coordinadores actuales SIN vendedor_id
-- ============================================================================
-- Ejecuta esto primero para ver qué coordinadores necesitan vendedor_id

SELECT
  u.id as usuario_id,
  u.nombre,
  u.email,
  u.rol,
  u.vendedor_id,
  u.activo,
  CASE WHEN u.vendedor_id IS NULL THEN '❌ SIN vendedor_id' ELSE '✅ YA TIENE' END as estado
FROM usuarios u
WHERE u.rol = 'coordinador'
ORDER BY u.nombre;

-- ============================================================================
-- PASO 2: Para CADA coordinador sin vendedor_id, ejecutar este bloque
-- ============================================================================
-- IMPORTANTE: Reemplaza los valores en <...> con los datos del coordinador

-- Ejemplo para UN coordinador:
-- (Descomenta y modifica con los datos reales)

/*
-- 2.1 Crear registro en tabla vendedores
INSERT INTO vendedores (nombre, telefono, activo)
VALUES ('<NOMBRE_COORDINADOR>', '<TELEFONO>', true)
RETURNING id;

-- 2.2 Actualizar usuario con el vendedor_id generado
-- (Usa el ID que retornó el INSERT anterior)
UPDATE usuarios
SET vendedor_id = '<UUID_GENERADO_ARRIBA>'
WHERE email = '<EMAIL_COORDINADOR>' AND rol = 'coordinador';
*/

-- ============================================================================
-- ALTERNATIVA: Script automático para TODOS los coordinadores sin vendedor_id
-- ============================================================================
-- Este script crea vendedores y asigna IDs automáticamente

DO $$
DECLARE
  coord RECORD;
  nuevo_vendedor_id UUID;
BEGIN
  -- Iterar sobre coordinadores sin vendedor_id
  FOR coord IN
    SELECT u.id, u.nombre, u.email,
           COALESCE(d.telefono, '') as telefono
    FROM usuarios u
    LEFT JOIN usuarios_datos_no_vendedores d ON d.usuario_id = u.id
    WHERE u.rol = 'coordinador'
      AND u.vendedor_id IS NULL
      AND u.activo = true
  LOOP
    -- Crear registro en vendedores
    INSERT INTO vendedores (nombre, telefono, activo)
    VALUES (coord.nombre, coord.telefono, true)
    RETURNING id INTO nuevo_vendedor_id;

    -- Actualizar usuario con vendedor_id
    UPDATE usuarios
    SET vendedor_id = nuevo_vendedor_id
    WHERE id = coord.id;

    RAISE NOTICE 'Coordinador % (%) asignado vendedor_id: %',
                 coord.nombre, coord.email, nuevo_vendedor_id;
  END LOOP;
END $$;

-- ============================================================================
-- PASO 3: Verificar que se asignaron correctamente
-- ============================================================================

SELECT
  u.id as usuario_id,
  u.nombre,
  u.email,
  u.rol,
  u.vendedor_id,
  v.nombre as nombre_en_vendedores,
  v.activo as vendedor_activo,
  CASE WHEN u.vendedor_id IS NOT NULL THEN '✅ CORRECTO' ELSE '❌ FALTA' END as estado
FROM usuarios u
LEFT JOIN vendedores v ON v.id = u.vendedor_id
WHERE u.rol = 'coordinador'
ORDER BY u.nombre;

-- ============================================================================
-- NOTAS:
-- - El script automático (DO $$ ... $$) crea vendedores para TODOS los
--   coordinadores activos que no tienen vendedor_id
-- - Si un coordinador ya tiene vendedor_id, se ignora
-- - El teléfono se obtiene de usuarios_datos_no_vendedores si existe
-- - Si no tiene teléfono registrado, se deja vacío ''
-- ============================================================================
