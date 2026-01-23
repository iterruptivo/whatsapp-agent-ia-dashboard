-- Migration: Crear rol vendedor_externo y postventa en sistema RBAC
-- Fecha: 23 Enero 2026
-- Descripción: Agrega los roles vendedor_externo y postventa al sistema RBAC
-- con los permisos necesarios para acceder a sus módulos respectivos

-- ============================================================================
-- PASO 1: Insertar rol vendedor_externo en roles
-- ============================================================================
INSERT INTO roles (nombre, descripcion, es_sistema, jerarquia, activo, created_at, updated_at)
VALUES (
  'vendedor_externo',
  'Vendedor externo - Solo acceso a Gestión de Locales y Comisiones',
  true,
  70,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (nombre) DO UPDATE SET
  descripcion = EXCLUDED.descripcion,
  activo = true,
  updated_at = NOW();

-- ============================================================================
-- PASO 2: Insertar rol postventa en roles (si no existe)
-- ============================================================================
INSERT INTO roles (nombre, descripcion, es_sistema, jerarquia, activo, created_at, updated_at)
VALUES (
  'postventa',
  'Postventa / Atención al cliente - Acceso a Control de Pagos',
  true,
  45,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (nombre) DO UPDATE SET
  descripcion = EXCLUDED.descripcion,
  activo = true,
  updated_at = NOW();

-- ============================================================================
-- PASO 3: Insertar rol vendedor_caseta si no existe
-- ============================================================================
INSERT INTO roles (nombre, descripcion, es_sistema, jerarquia, activo, created_at, updated_at)
VALUES (
  'vendedor_caseta',
  'Vendedor de caseta - Opera en punto de venta físico',
  true,
  65,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (nombre) DO UPDATE SET
  descripcion = EXCLUDED.descripcion,
  activo = true,
  updated_at = NOW();

-- ============================================================================
-- PASO 4: Obtener IDs de los nuevos roles y asignar permisos
-- ============================================================================
DO $$
DECLARE
  v_vendedor_externo_role_id UUID;
  v_postventa_role_id UUID;
  v_vendedor_caseta_role_id UUID;
  v_permiso_id UUID;
BEGIN
  -- Obtener IDs de roles
  SELECT id INTO v_vendedor_externo_role_id FROM roles WHERE nombre = 'vendedor_externo';
  SELECT id INTO v_postventa_role_id FROM roles WHERE nombre = 'postventa';
  SELECT id INTO v_vendedor_caseta_role_id FROM roles WHERE nombre = 'vendedor_caseta';

  RAISE NOTICE 'Rol vendedor_externo ID: %', v_vendedor_externo_role_id;
  RAISE NOTICE 'Rol postventa ID: %', v_postventa_role_id;
  RAISE NOTICE 'Rol vendedor_caseta ID: %', v_vendedor_caseta_role_id;

  -- ============================================================================
  -- PERMISOS PARA vendedor_externo: locales:read, locales:cambiar_estado, comisiones:read
  -- ============================================================================

  -- Permiso: locales:read
  SELECT id INTO v_permiso_id FROM permisos WHERE modulo = 'locales' AND accion = 'read';
  IF v_permiso_id IS NOT NULL THEN
    INSERT INTO rol_permisos (rol_id, permiso_id, created_at)
    VALUES (v_vendedor_externo_role_id, v_permiso_id, NOW())
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;
    RAISE NOTICE 'Asignado permiso locales:read a vendedor_externo';
  END IF;

  -- Permiso: locales:cambiar_estado
  SELECT id INTO v_permiso_id FROM permisos WHERE modulo = 'locales' AND accion = 'cambiar_estado';
  IF v_permiso_id IS NOT NULL THEN
    INSERT INTO rol_permisos (rol_id, permiso_id, created_at)
    VALUES (v_vendedor_externo_role_id, v_permiso_id, NOW())
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;
    RAISE NOTICE 'Asignado permiso locales:cambiar_estado a vendedor_externo';
  END IF;

  -- Permiso: comisiones:read
  SELECT id INTO v_permiso_id FROM permisos WHERE modulo = 'comisiones' AND accion = 'read';
  IF v_permiso_id IS NOT NULL THEN
    INSERT INTO rol_permisos (rol_id, permiso_id, created_at)
    VALUES (v_vendedor_externo_role_id, v_permiso_id, NOW())
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;
    RAISE NOTICE 'Asignado permiso comisiones:read a vendedor_externo';
  END IF;

  -- ============================================================================
  -- PERMISOS PARA postventa: control_pagos:*, locales:read
  -- ============================================================================

  -- Permiso: control_pagos:read
  SELECT id INTO v_permiso_id FROM permisos WHERE modulo = 'control_pagos' AND accion = 'read';
  IF v_permiso_id IS NOT NULL THEN
    INSERT INTO rol_permisos (rol_id, permiso_id, created_at)
    VALUES (v_postventa_role_id, v_permiso_id, NOW())
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;
    RAISE NOTICE 'Asignado permiso control_pagos:read a postventa';
  END IF;

  -- Permiso: control_pagos:write
  SELECT id INTO v_permiso_id FROM permisos WHERE modulo = 'control_pagos' AND accion = 'write';
  IF v_permiso_id IS NOT NULL THEN
    INSERT INTO rol_permisos (rol_id, permiso_id, created_at)
    VALUES (v_postventa_role_id, v_permiso_id, NOW())
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;
    RAISE NOTICE 'Asignado permiso control_pagos:write a postventa';
  END IF;

  -- Permiso: locales:read para postventa
  SELECT id INTO v_permiso_id FROM permisos WHERE modulo = 'locales' AND accion = 'read';
  IF v_permiso_id IS NOT NULL THEN
    INSERT INTO rol_permisos (rol_id, permiso_id, created_at)
    VALUES (v_postventa_role_id, v_permiso_id, NOW())
    ON CONFLICT (rol_id, permiso_id) DO NOTHING;
    RAISE NOTICE 'Asignado permiso locales:read a postventa';
  END IF;

  -- ============================================================================
  -- ACTUALIZAR rol_id EN USUARIOS
  -- ============================================================================

  -- Actualizar usuarios vendedor_externo
  UPDATE usuarios
  SET rol_id = v_vendedor_externo_role_id, updated_at = NOW()
  WHERE rol = 'vendedor_externo' AND (rol_id IS NULL OR rol_id != v_vendedor_externo_role_id);

  RAISE NOTICE 'Usuarios vendedor_externo actualizados: %', (SELECT COUNT(*) FROM usuarios WHERE rol = 'vendedor_externo');

  -- Actualizar usuarios postventa
  UPDATE usuarios
  SET rol_id = v_postventa_role_id, updated_at = NOW()
  WHERE rol = 'postventa' AND (rol_id IS NULL OR rol_id != v_postventa_role_id);

  RAISE NOTICE 'Usuarios postventa actualizados: %', (SELECT COUNT(*) FROM usuarios WHERE rol = 'postventa');

  -- Actualizar usuarios vendedor_caseta
  UPDATE usuarios
  SET rol_id = v_vendedor_caseta_role_id, updated_at = NOW()
  WHERE rol = 'vendedor_caseta' AND (rol_id IS NULL OR rol_id != v_vendedor_caseta_role_id);

  RAISE NOTICE 'Usuarios vendedor_caseta actualizados: %', (SELECT COUNT(*) FROM usuarios WHERE rol = 'vendedor_caseta');

END $$;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT
  r.nombre as rol,
  r.id as rol_id,
  COUNT(rp.permiso_id) as total_permisos
FROM roles r
LEFT JOIN rol_permisos rp ON r.id = rp.rol_id
WHERE r.nombre IN ('vendedor_externo', 'postventa', 'vendedor_caseta')
GROUP BY r.id, r.nombre
ORDER BY r.nombre;
