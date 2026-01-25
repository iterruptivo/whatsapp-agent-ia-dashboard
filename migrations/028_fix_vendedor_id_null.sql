-- ============================================================================
-- MIGRACIÓN 028: FIX vendedor_id NULL para usuarios vendedor_caseta
-- ============================================================================
-- Fecha: 25 Enero 2026
-- Problema: 3 usuarios con rol vendedor_caseta tienen vendedor_id = NULL,
--           lo que impide la asignación correcta de leads en el dashboard.
--
-- Usuarios afectados:
--   - Alexander Mendoza Flores (alezandermf.15@hotmail.com)
--   - Renzo Sosa Soria (renzososasoria@gmail.com)
--   - Rocio Chaman Chang (rociochamanch@hotmail.com)
--
-- Solución:
--   1. Crear registros en la tabla vendedores usando el ID del usuario
--   2. Actualizar vendedor_id del usuario para apuntar al nuevo registro
-- ============================================================================

-- ==================================================
-- PASO 1: Crear registros en vendedores
-- ==================================================
-- Insertamos en la tabla vendedores usando el mismo ID del usuario
-- para mantener consistencia y evitar referencias huérfanas

INSERT INTO public.vendedores (id, nombre, telefono, activo, created_at)
SELECT
    u.id AS id,                              -- Usamos el mismo ID del usuario
    u.nombre AS nombre,                       -- Copiamos el nombre del usuario
    SUBSTRING(REPLACE(u.id::TEXT, '-', ''), 1, 15) AS telefono,  -- Teléfono único (UUID sin guiones, max 15 chars)
    u.activo AS activo,                       -- Mantenemos el mismo estado activo
    NOW() AS created_at                       -- Timestamp de creación
FROM public.usuarios u
WHERE u.vendedor_id IS NULL
  AND u.rol IN ('vendedor', 'vendedor_caseta')
  AND NOT EXISTS (
    -- Verificar que no exista ya un vendedor con ese ID
    SELECT 1 FROM public.vendedores v WHERE v.id = u.id
  );

-- ==================================================
-- PASO 2: Actualizar vendedor_id en usuarios
-- ==================================================
-- Ahora que existen los registros en vendedores,
-- vinculamos los usuarios a sus registros de vendedor

UPDATE public.usuarios
SET
    vendedor_id = id,               -- El vendedor_id es igual al ID del usuario
    updated_at = NOW()              -- Actualizamos timestamp de modificación
WHERE vendedor_id IS NULL
  AND rol IN ('vendedor', 'vendedor_caseta')
  AND EXISTS (
    -- Verificar que el registro en vendedores existe
    SELECT 1 FROM public.vendedores v WHERE v.id = usuarios.id
  );

-- ==================================================
-- VERIFICACIÓN: Mostrar usuarios afectados
-- ==================================================
-- Este SELECT no modifica datos, solo muestra el resultado de la migración

DO $$
DECLARE
    usuarios_actualizados INTEGER;
    vendedores_creados INTEGER;
BEGIN
    -- Contar vendedores creados
    SELECT COUNT(*) INTO vendedores_creados
    FROM public.vendedores v
    WHERE EXISTS (
        SELECT 1 FROM public.usuarios u
        WHERE u.id = v.id
        AND u.rol IN ('vendedor', 'vendedor_caseta')
        AND u.vendedor_id = v.id
    );

    -- Contar usuarios actualizados
    SELECT COUNT(*) INTO usuarios_actualizados
    FROM public.usuarios
    WHERE rol IN ('vendedor', 'vendedor_caseta')
    AND vendedor_id IS NOT NULL
    AND vendedor_id = id;

    -- Mostrar resultado
    RAISE NOTICE '✓ Migración 028 completada:';
    RAISE NOTICE '  - Vendedores creados: %', vendedores_creados;
    RAISE NOTICE '  - Usuarios actualizados: %', usuarios_actualizados;
END $$;

-- ==================================================
-- VALIDACIÓN: Verificar que no queden NULL
-- ==================================================
-- Este query debería retornar 0 filas después de la migración

DO $$
DECLARE
    usuarios_con_null INTEGER;
BEGIN
    SELECT COUNT(*) INTO usuarios_con_null
    FROM public.usuarios
    WHERE vendedor_id IS NULL
    AND rol IN ('vendedor', 'vendedor_caseta');

    IF usuarios_con_null > 0 THEN
        RAISE WARNING '⚠ Aún hay % usuarios con vendedor_id NULL y rol vendedor/vendedor_caseta', usuarios_con_null;
    ELSE
        RAISE NOTICE '✓ Todos los usuarios vendedor/vendedor_caseta tienen vendedor_id asignado';
    END IF;
END $$;

-- ============================================================================
-- FIN MIGRACIÓN 028
-- ============================================================================
