-- ============================================================================
-- MIGRATION 008: Sistema de Permisos y Compartir - Módulo Reuniones
-- ============================================================================
-- Fecha: 15 Enero 2026
-- Descripción: Agregar campos para sistema de permisos y compartir público
-- Autor: Backend Developer (Claude Code)
-- ============================================================================

-- ============================================================================
-- PASO 1: AGREGAR COLUMNAS A LA TABLA reuniones
-- ============================================================================

-- Agregar campos de permisos y compartir
ALTER TABLE reuniones
ADD COLUMN IF NOT EXISTS es_publico BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS link_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS usuarios_permitidos UUID[],
ADD COLUMN IF NOT EXISTS roles_permitidos TEXT[];

-- Agregar comentarios descriptivos
COMMENT ON COLUMN reuniones.es_publico IS 'Indica si la reunión puede ser accedida mediante link público';
COMMENT ON COLUMN reuniones.link_token IS 'Token único de 64 caracteres para acceso público mediante URL';
COMMENT ON COLUMN reuniones.usuarios_permitidos IS 'Array de UUIDs de usuarios que tienen permiso para ver la reunión';
COMMENT ON COLUMN reuniones.roles_permitidos IS 'Array de roles (admin, vendedor, etc.) que tienen permiso para ver la reunión';

-- ============================================================================
-- PASO 2: CREAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice para búsqueda por token (acceso público)
CREATE INDEX IF NOT EXISTS idx_reuniones_link_token
ON reuniones(link_token)
WHERE link_token IS NOT NULL;

-- Índice GIN para búsqueda eficiente en array de usuarios permitidos
CREATE INDEX IF NOT EXISTS idx_reuniones_usuarios_permitidos
ON reuniones USING GIN(usuarios_permitidos);

-- Índice GIN para búsqueda eficiente en array de roles permitidos
CREATE INDEX IF NOT EXISTS idx_reuniones_roles_permitidos
ON reuniones USING GIN(roles_permitidos);

-- Índice para reuniones públicas
CREATE INDEX IF NOT EXISTS idx_reuniones_es_publico
ON reuniones(es_publico)
WHERE es_publico = TRUE;

-- ============================================================================
-- PASO 3: ACTUALIZAR RLS POLICIES
-- ============================================================================

-- Eliminar policy SELECT existente
DROP POLICY IF EXISTS "Reuniones - Select" ON reuniones;

-- Nueva policy SELECT con lógica de permisos completa
CREATE POLICY "Reuniones - Select"
ON reuniones FOR SELECT
TO authenticated
USING (
  -- Superadmin/Admin/Gerencia ven TODO
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = auth.uid()
    AND u.rol IN ('superadmin', 'admin', 'gerencia')
  )
  -- O es el creador de la reunión
  OR created_by = auth.uid()
  -- O está en la lista de usuarios permitidos
  OR auth.uid() = ANY(usuarios_permitidos)
  -- O su rol está en la lista de roles permitidos
  OR EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = auth.uid()
    AND u.rol = ANY(roles_permitidos)
  )
);

-- ============================================================================
-- PASO 4: FUNCIÓN HELPER PARA VALIDAR PERMISOS
-- ============================================================================

-- Función para verificar si un usuario tiene permiso para ver una reunión
CREATE OR REPLACE FUNCTION usuario_puede_ver_reunion(
  p_reunion_id UUID,
  p_usuario_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_reunion RECORD;
  v_usuario RECORD;
BEGIN
  -- Obtener datos de la reunión
  SELECT * INTO v_reunion
  FROM reuniones
  WHERE id = p_reunion_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Obtener datos del usuario
  SELECT * INTO v_usuario
  FROM usuarios
  WHERE id = p_usuario_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Verificar permisos
  RETURN (
    -- Es admin/superadmin/gerencia
    v_usuario.rol IN ('superadmin', 'admin', 'gerencia')
    -- O es el creador
    OR v_reunion.created_by = p_usuario_id
    -- O está en usuarios permitidos
    OR p_usuario_id = ANY(v_reunion.usuarios_permitidos)
    -- O su rol está en roles permitidos
    OR v_usuario.rol = ANY(v_reunion.roles_permitidos)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PASO 5: FUNCIÓN HELPER PARA VALIDAR ACCESO POR TOKEN
-- ============================================================================

-- Función para validar acceso público por token
CREATE OR REPLACE FUNCTION validar_token_publico(
  p_token TEXT
) RETURNS TABLE(
  reunion_id UUID,
  valido BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id as reunion_id,
    (r.es_publico AND r.link_token = p_token) as valido
  FROM reuniones r
  WHERE r.link_token = p_token
  AND r.es_publico = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PASO 6: TRIGGER PARA LIMPIAR TOKEN AL DESACTIVAR PÚBLICO
-- ============================================================================

-- Función del trigger
CREATE OR REPLACE FUNCTION limpiar_token_desactivado()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se desactiva es_publico, opcionalmente limpiar el token
  -- (comentado porque el token se mantiene por si se reactiva)
  /*
  IF NEW.es_publico = FALSE AND OLD.es_publico = TRUE THEN
    NEW.link_token := NULL;
  END IF;
  */
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger (opcional)
-- DROP TRIGGER IF EXISTS tr_limpiar_token ON reuniones;
-- CREATE TRIGGER tr_limpiar_token
--   BEFORE UPDATE ON reuniones
--   FOR EACH ROW
--   WHEN (NEW.es_publico = FALSE AND OLD.es_publico = TRUE)
--   EXECUTE FUNCTION limpiar_token_desactivado();

-- ============================================================================
-- PASO 7: GRANTS (Permisos de ejecución)
-- ============================================================================

-- Permitir a usuarios autenticados ejecutar funciones helper
GRANT EXECUTE ON FUNCTION usuario_puede_ver_reunion(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validar_token_publico(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validar_token_publico(TEXT) TO anon; -- Para acceso público

-- ============================================================================
-- PASO 8: DATOS DE PRUEBA (OPCIONAL - comentado)
-- ============================================================================

/*
-- Ejemplo: Activar compartir en una reunión de prueba
UPDATE reuniones
SET
  es_publico = TRUE,
  link_token = encode(gen_random_bytes(32), 'hex')
WHERE titulo ILIKE '%prueba%'
LIMIT 1;

-- Ejemplo: Agregar permisos a usuarios específicos
UPDATE reuniones
SET usuarios_permitidos = ARRAY[
  '00000000-0000-0000-0000-000000000001'::UUID,
  '00000000-0000-0000-0000-000000000002'::UUID
]
WHERE id = 'uuid-reunion-prueba';

-- Ejemplo: Agregar permisos por rol
UPDATE reuniones
SET roles_permitidos = ARRAY['vendedor', 'jefe_ventas']
WHERE id = 'uuid-reunion-prueba';
*/

-- ============================================================================
-- VERIFICACIÓN DE LA MIGRACIÓN
-- ============================================================================

DO $$
DECLARE
  col_exists INT;
  idx_exists INT;
  func_exists INT;
BEGIN
  -- Verificar columnas
  SELECT COUNT(*) INTO col_exists
  FROM information_schema.columns
  WHERE table_name = 'reuniones'
  AND column_name IN ('es_publico', 'link_token', 'usuarios_permitidos', 'roles_permitidos');

  IF col_exists = 4 THEN
    RAISE NOTICE '✓ Columnas creadas correctamente (4/4)';
  ELSE
    RAISE WARNING '⚠ Solo % de 4 columnas fueron creadas', col_exists;
  END IF;

  -- Verificar índices
  SELECT COUNT(*) INTO idx_exists
  FROM pg_indexes
  WHERE tablename = 'reuniones'
  AND indexname IN (
    'idx_reuniones_link_token',
    'idx_reuniones_usuarios_permitidos',
    'idx_reuniones_roles_permitidos',
    'idx_reuniones_es_publico'
  );

  IF idx_exists = 4 THEN
    RAISE NOTICE '✓ Índices creados correctamente (4/4)';
  ELSE
    RAISE WARNING '⚠ Solo % de 4 índices fueron creados', idx_exists;
  END IF;

  -- Verificar funciones
  SELECT COUNT(*) INTO func_exists
  FROM pg_proc
  WHERE proname IN ('usuario_puede_ver_reunion', 'validar_token_publico');

  IF func_exists = 2 THEN
    RAISE NOTICE '✓ Funciones helper creadas correctamente (2/2)';
  ELSE
    RAISE WARNING '⚠ Solo % de 2 funciones fueron creadas', func_exists;
  END IF;

  -- Verificar policy
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'reuniones'
    AND policyname = 'Reuniones - Select'
  ) THEN
    RAISE NOTICE '✓ RLS Policy actualizada correctamente';
  ELSE
    RAISE WARNING '⚠ RLS Policy no encontrada';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'MIGRACIÓN 008 COMPLETADA';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Próximos pasos:';
  RAISE NOTICE '1. Verificar que las Server Actions funcionen correctamente';
  RAISE NOTICE '2. Crear componentes UI para compartir y gestionar permisos';
  RAISE NOTICE '3. Implementar página pública /reuniones/compartida/[token]';
  RAISE NOTICE '4. Testing con diferentes roles y permisos';
END $$;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
