-- ============================================================================
-- FIX URGENTE: Agregar TODOS los permisos a superadmin
-- ============================================================================
-- Fecha: 14 Enero 2026
-- Problema: superadmin no tiene permiso leads:assign (y probablemente otros)
-- Solución: Asignar TODOS los permisos existentes a superadmin
-- ============================================================================

-- PASO 1: Verificar que superadmin existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM roles WHERE nombre = 'superadmin') THEN
    RAISE EXCEPTION 'El rol superadmin no existe. Ejecutar primero: INSERT INTO roles...';
  END IF;
END $$;

-- PASO 2: Agregar TODOS los permisos a superadmin
-- ON CONFLICT DO NOTHING previene errores si ya existen
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'superadmin'
  AND r.activo = true
  AND p.activo = true
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- PASO 3: VERIFICACIÓN - Contar permisos de superadmin
DO $$
DECLARE
  v_total_permisos INT;
  v_superadmin_permisos INT;
BEGIN
  -- Total de permisos en el sistema
  SELECT COUNT(*) INTO v_total_permisos FROM permisos WHERE activo = true;

  -- Permisos de superadmin
  SELECT COUNT(*) INTO v_superadmin_permisos
  FROM rol_permisos rp
  JOIN roles r ON rp.rol_id = r.id
  WHERE r.nombre = 'superadmin';

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total permisos en sistema: %', v_total_permisos;
  RAISE NOTICE 'Permisos de superadmin: %', v_superadmin_permisos;
  RAISE NOTICE '===========================================';

  IF v_superadmin_permisos < v_total_permisos THEN
    RAISE WARNING 'ATENCIÓN: Superadmin tiene % permisos de % totales',
      v_superadmin_permisos, v_total_permisos;
  ELSE
    RAISE NOTICE 'OK: Superadmin tiene TODOS los permisos';
  END IF;
END $$;

-- PASO 4: Verificar permiso específico leads:assign
SELECT
  'leads:assign' AS permiso_buscado,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM rol_permisos rp
      JOIN roles r ON rp.rol_id = r.id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE r.nombre = 'superadmin'
        AND p.modulo = 'leads'
        AND p.accion = 'assign'
    ) THEN 'SI ✓'
    ELSE 'NO ✗'
  END AS superadmin_tiene;

-- PASO 5: Listar todos los permisos de superadmin (para verificar)
SELECT
  p.modulo,
  p.accion,
  p.modulo || ':' || p.accion AS permiso_completo,
  p.descripcion
FROM rol_permisos rp
JOIN roles r ON rp.rol_id = r.id
JOIN permisos p ON rp.permiso_id = p.id
WHERE r.nombre = 'superadmin'
ORDER BY p.modulo, p.accion;
