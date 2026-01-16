-- ============================================================================
-- MIGRATION: Sistema de Permisos Compartidos para Reuniones
-- ============================================================================
-- Fecha: 15 Enero 2026
-- Descripción: Agrega campos de permisos (es_publico, link_token, usuarios_permitidos, roles_permitidos)
--              y actualiza RLS policies para permitir compartir reuniones
-- ============================================================================

-- ============================================================================
-- PASO 1: AGREGAR NUEVOS CAMPOS A LA TABLA reuniones
-- ============================================================================

-- Campo: es_publico - Indica si la reunión tiene un link compartido activo
ALTER TABLE reuniones
ADD COLUMN IF NOT EXISTS es_publico BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN reuniones.es_publico IS 'Indica si la reunión tiene un link compartido activo para acceso público';

-- Campo: link_token - Token único para compartir (64 caracteres hex, más seguro que UUID)
ALTER TABLE reuniones
ADD COLUMN IF NOT EXISTS link_token TEXT UNIQUE;

COMMENT ON COLUMN reuniones.link_token IS 'Token único de 64 caracteres hex para compartir reunión vía link público';

-- Campo: usuarios_permitidos - Array de UUIDs de usuarios específicos que pueden ver la reunión
ALTER TABLE reuniones
ADD COLUMN IF NOT EXISTS usuarios_permitidos UUID[] DEFAULT '{}';

COMMENT ON COLUMN reuniones.usuarios_permitidos IS 'Array de UUIDs de usuarios específicos autorizados a ver esta reunión';

-- Campo: roles_permitidos - Array de roles que pueden ver la reunión
ALTER TABLE reuniones
ADD COLUMN IF NOT EXISTS roles_permitidos TEXT[] DEFAULT '{}';

COMMENT ON COLUMN reuniones.roles_permitidos IS 'Array de roles autorizados (ej: [''vendedor'', ''coordinador''])';

-- ============================================================================
-- PASO 2: CREAR ÍNDICES PARA OPTIMIZAR QUERIES DE PERMISOS
-- ============================================================================

-- Índice para búsquedas por link_token (usado frecuentemente en accesos públicos)
CREATE INDEX IF NOT EXISTS idx_reuniones_link_token
ON reuniones(link_token)
WHERE link_token IS NOT NULL;

-- Índice para filtrar reuniones públicas
CREATE INDEX IF NOT EXISTS idx_reuniones_es_publico
ON reuniones(es_publico)
WHERE es_publico = TRUE;

-- Índice GIN para búsquedas eficientes en el array usuarios_permitidos
CREATE INDEX IF NOT EXISTS idx_reuniones_usuarios_permitidos
ON reuniones USING GIN(usuarios_permitidos);

-- Índice GIN para búsquedas eficientes en el array roles_permitidos
CREATE INDEX IF NOT EXISTS idx_reuniones_roles_permitidos
ON reuniones USING GIN(roles_permitidos);

-- ============================================================================
-- PASO 3: ACTUALIZAR RLS POLICIES - REUNIONES
-- ============================================================================

-- DROP la policy de SELECT existente
DROP POLICY IF EXISTS "Reuniones - Select" ON reuniones;

-- Policy: SELECT - Lógica ampliada con permisos compartidos
-- PUEDE VER SI:
--   - Es superadmin/admin/gerencia (ven TODO)
--   - O es el creador (created_by = auth.uid())
--   - O auth.uid() está en usuarios_permitidos
--   - O su rol está en roles_permitidos
--   - O (es_publico = true) -- acceso con link público
CREATE POLICY "Reuniones - Select"
ON reuniones FOR SELECT
TO authenticated
USING (
  -- Superadmin, admin, gerencia ven TODO
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = auth.uid()
    AND u.rol IN ('superadmin', 'admin', 'gerencia')
  )
  -- O es el creador
  OR created_by = auth.uid()
  -- O está en la lista de usuarios permitidos
  OR auth.uid() = ANY(usuarios_permitidos)
  -- O su rol está en la lista de roles permitidos
  OR EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = auth.uid()
    AND u.rol = ANY(roles_permitidos)
  )
  -- O tiene acceso público activo (link compartido)
  OR es_publico = TRUE
);

-- DROP la policy de INSERT existente
DROP POLICY IF EXISTS "Reuniones - Insert" ON reuniones;

-- Policy: INSERT - SOLO superadmin, admin, gerencia pueden crear
CREATE POLICY "Reuniones - Insert"
ON reuniones FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('superadmin', 'admin', 'gerencia')
  )
);

-- MANTENER las policies UPDATE y DELETE existentes (no modificar)
-- Ya están definidas en la migración anterior 20260106_create_reuniones_tables.sql

-- ============================================================================
-- PASO 4: FUNCIÓN PARA REGENERAR LINK TOKEN
-- ============================================================================

-- Función para regenerar el link_token de una reunión (útil si se compromete el link)
-- NOTA: Esta función existe como helper pero el backend usa su propia lógica.
-- La validación de permisos se hace en el server action ANTES de llamar.
CREATE OR REPLACE FUNCTION regenerar_link_token_reunion(reunion_id UUID)
RETURNS TEXT AS $$
DECLARE
  nuevo_token TEXT;
  user_rol TEXT;
BEGIN
  -- Validar permisos: solo creador o admin puede regenerar
  SELECT rol INTO user_rol FROM usuarios WHERE id = auth.uid();

  IF user_rol NOT IN ('superadmin', 'admin', 'gerencia') AND NOT EXISTS (
    SELECT 1 FROM reuniones WHERE id = reunion_id AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para regenerar el token de esta reunión';
  END IF;

  -- Generar nuevo token (64 caracteres hex = 256 bits de entropía)
  nuevo_token := encode(gen_random_bytes(32), 'hex');

  -- Actualizar la reunión
  UPDATE reuniones
  SET
    link_token = nuevo_token,
    updated_at = NOW()
  WHERE id = reunion_id;

  -- Retornar el nuevo token
  RETURN nuevo_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION regenerar_link_token_reunion(UUID) IS 'Regenera el link_token de una reunión (útil si el link fue comprometido)';

-- Grant para usuarios autenticados con permisos
GRANT EXECUTE ON FUNCTION regenerar_link_token_reunion(UUID) TO authenticated;

-- ============================================================================
-- PASO 5: FUNCIÓN PARA AGREGAR USUARIO A PERMISOS
-- ============================================================================

-- Función helper para agregar un usuario a usuarios_permitidos
CREATE OR REPLACE FUNCTION agregar_usuario_permitido(reunion_id UUID, usuario_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = usuario_id) THEN
    RAISE EXCEPTION 'Usuario con id % no existe', usuario_id;
  END IF;

  -- Agregar el usuario al array si no existe ya
  UPDATE reuniones
  SET
    usuarios_permitidos = array_append(usuarios_permitidos, usuario_id),
    updated_at = NOW()
  WHERE id = reunion_id
  AND NOT (usuario_id = ANY(usuarios_permitidos)); -- Evitar duplicados

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION agregar_usuario_permitido(UUID, UUID) IS 'Agrega un usuario específico a la lista de usuarios_permitidos de una reunión';

GRANT EXECUTE ON FUNCTION agregar_usuario_permitido(UUID, UUID) TO authenticated;

-- ============================================================================
-- PASO 6: FUNCIÓN PARA REMOVER USUARIO DE PERMISOS
-- ============================================================================

-- Función helper para remover un usuario de usuarios_permitidos
CREATE OR REPLACE FUNCTION remover_usuario_permitido(reunion_id UUID, usuario_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remover el usuario del array
  UPDATE reuniones
  SET
    usuarios_permitidos = array_remove(usuarios_permitidos, usuario_id),
    updated_at = NOW()
  WHERE id = reunion_id
  AND usuario_id = ANY(usuarios_permitidos); -- Solo si existe en el array

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION remover_usuario_permitido(UUID, UUID) IS 'Remueve un usuario específico de la lista de usuarios_permitidos de una reunión';

GRANT EXECUTE ON FUNCTION remover_usuario_permitido(UUID, UUID) TO authenticated;

-- ============================================================================
-- PASO 7: FUNCIÓN PARA AGREGAR ROL A PERMISOS
-- ============================================================================

-- Función helper para agregar un rol a roles_permitidos
CREATE OR REPLACE FUNCTION agregar_rol_permitido(reunion_id UUID, rol_nombre TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validar que el rol es válido (según los roles definidos en usuarios)
  IF rol_nombre NOT IN ('admin', 'gerencia', 'vendedor', 'jefe_ventas', 'vendedor_caseta', 'coordinador', 'finanzas', 'marketing', 'superadmin', 'corredor', 'legal') THEN
    RAISE EXCEPTION 'Rol % no es válido', rol_nombre;
  END IF;

  -- Agregar el rol al array si no existe ya
  UPDATE reuniones
  SET
    roles_permitidos = array_append(roles_permitidos, rol_nombre),
    updated_at = NOW()
  WHERE id = reunion_id
  AND NOT (rol_nombre = ANY(roles_permitidos)); -- Evitar duplicados

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION agregar_rol_permitido(UUID, TEXT) IS 'Agrega un rol a la lista de roles_permitidos de una reunión';

GRANT EXECUTE ON FUNCTION agregar_rol_permitido(UUID, TEXT) TO authenticated;

-- ============================================================================
-- PASO 8: FUNCIÓN PARA REMOVER ROL DE PERMISOS
-- ============================================================================

-- Función helper para remover un rol de roles_permitidos
CREATE OR REPLACE FUNCTION remover_rol_permitido(reunion_id UUID, rol_nombre TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remover el rol del array
  UPDATE reuniones
  SET
    roles_permitidos = array_remove(roles_permitidos, rol_nombre),
    updated_at = NOW()
  WHERE id = reunion_id
  AND rol_nombre = ANY(roles_permitidos); -- Solo si existe en el array

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION remover_rol_permitido(UUID, TEXT) IS 'Remueve un rol de la lista de roles_permitidos de una reunión';

GRANT EXECUTE ON FUNCTION remover_rol_permitido(UUID, TEXT) TO authenticated;

-- ============================================================================
-- PASO 9: FUNCIÓN PARA ACTIVAR/DESACTIVAR ACCESO PÚBLICO
-- ============================================================================

-- Función para activar o desactivar el acceso público (link compartido)
CREATE OR REPLACE FUNCTION toggle_acceso_publico_reunion(reunion_id UUID, activar BOOLEAN)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE reuniones
  SET
    es_publico = activar,
    updated_at = NOW()
  WHERE id = reunion_id;

  RETURN activar;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION toggle_acceso_publico_reunion(UUID, BOOLEAN) IS 'Activa o desactiva el acceso público (link compartido) de una reunión';

GRANT EXECUTE ON FUNCTION toggle_acceso_publico_reunion(UUID, BOOLEAN) TO authenticated;

-- ============================================================================
-- PASO 10: FUNCIÓN HELPER PARA VERIFICAR PERMISOS DE USUARIO
-- ============================================================================

-- Función para verificar si un usuario tiene permiso de ver una reunión
CREATE OR REPLACE FUNCTION usuario_puede_ver_reunion(reunion_id UUID, usuario_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_rol TEXT;
  reunion_record RECORD;
BEGIN
  -- Obtener rol del usuario
  SELECT rol INTO user_rol
  FROM usuarios
  WHERE id = usuario_id;

  -- Si no existe el usuario, no tiene permiso
  IF user_rol IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Obtener datos de la reunión
  SELECT
    created_by,
    es_publico,
    usuarios_permitidos,
    roles_permitidos
  INTO reunion_record
  FROM reuniones
  WHERE id = reunion_id;

  -- Si no existe la reunión, no tiene permiso
  IF reunion_record IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verificar permisos según la lógica
  RETURN (
    -- Es superadmin/admin/gerencia (ven todo)
    user_rol IN ('superadmin', 'admin', 'gerencia')
    -- O es el creador
    OR reunion_record.created_by = usuario_id
    -- O está en usuarios permitidos
    OR usuario_id = ANY(reunion_record.usuarios_permitidos)
    -- O su rol está en roles permitidos
    OR user_rol = ANY(reunion_record.roles_permitidos)
    -- O tiene acceso público
    OR reunion_record.es_publico = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION usuario_puede_ver_reunion(UUID, UUID) IS 'Verifica si un usuario tiene permiso para ver una reunión específica';

GRANT EXECUTE ON FUNCTION usuario_puede_ver_reunion(UUID, UUID) TO authenticated;

-- ============================================================================
-- PASO 11: ACTUALIZAR FUNCIÓN get_user_reuniones CON NUEVA LÓGICA
-- ============================================================================

-- DROP la función existente primero (para cambiar el tipo de retorno)
DROP FUNCTION IF EXISTS get_user_reuniones(UUID);

-- Recrear la función con la nueva lógica de permisos
CREATE OR REPLACE FUNCTION get_user_reuniones(user_id UUID)
RETURNS TABLE(
  id UUID,
  proyecto_id UUID,
  titulo VARCHAR,
  fecha_reunion TIMESTAMPTZ,
  estado VARCHAR,
  created_at TIMESTAMPTZ,
  es_publico BOOLEAN,
  link_token UUID
) AS $$
DECLARE
  user_rol TEXT;
BEGIN
  -- Obtener rol del usuario
  SELECT rol INTO user_rol
  FROM usuarios
  WHERE id = user_id;

  RETURN QUERY
  SELECT
    r.id,
    r.proyecto_id,
    r.titulo,
    r.fecha_reunion,
    r.estado,
    r.created_at,
    r.es_publico,
    r.link_token
  FROM reuniones r
  WHERE
    -- Superadmin, admin, gerencia ven TODO
    user_rol IN ('superadmin', 'admin', 'gerencia')
    -- O es el creador
    OR r.created_by = user_id
    -- O está en usuarios permitidos
    OR user_id = ANY(r.usuarios_permitidos)
    -- O su rol está en roles permitidos
    OR user_rol = ANY(r.roles_permitidos)
    -- O tiene acceso público
    OR r.es_publico = TRUE
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_reuniones(UUID) IS 'Retorna reuniones visibles para un usuario según permisos (incluye compartidas)';

GRANT EXECUTE ON FUNCTION get_user_reuniones(UUID) TO authenticated;

-- ============================================================================
-- PASO 12: FUNCIÓN PARA OBTENER REUNIÓN POR LINK TOKEN (ACCESO PÚBLICO)
-- ============================================================================

-- Función para obtener una reunión mediante su link_token (para acceso público)
CREATE OR REPLACE FUNCTION get_reunion_por_link_token(token TEXT)
RETURNS TABLE(
  id UUID,
  proyecto_id UUID,
  created_by UUID,
  titulo VARCHAR,
  fecha_reunion TIMESTAMPTZ,
  duracion_segundos INTEGER,
  participantes TEXT[],
  transcripcion_completa TEXT,
  resumen TEXT,
  puntos_clave JSONB,
  decisiones JSONB,
  preguntas_abiertas JSONB,
  estado VARCHAR,
  created_at TIMESTAMPTZ,
  es_publico BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.proyecto_id,
    r.created_by,
    r.titulo,
    r.fecha_reunion,
    r.duracion_segundos,
    r.participantes,
    r.transcripcion_completa,
    r.resumen,
    r.puntos_clave,
    r.decisiones,
    r.preguntas_abiertas,
    r.estado,
    r.created_at,
    r.es_publico
  FROM reuniones r
  WHERE r.link_token = token
  AND r.es_publico = TRUE; -- Solo si está activo el acceso público
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_reunion_por_link_token(TEXT) IS 'Obtiene una reunión mediante su link_token (solo si es_publico = true)';

-- Permitir acceso anónimo para links públicos
GRANT EXECUTE ON FUNCTION get_reunion_por_link_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_reunion_por_link_token(TEXT) TO authenticated;

-- ============================================================================
-- PASO 13: MIGRACIÓN DE DATOS EXISTENTES
-- ============================================================================

-- Generar link_token para reuniones existentes que no lo tienen
UPDATE reuniones
SET link_token = gen_random_uuid()
WHERE link_token IS NULL;

-- Asegurar que todos los arrays están inicializados
UPDATE reuniones
SET usuarios_permitidos = '{}'
WHERE usuarios_permitidos IS NULL;

UPDATE reuniones
SET roles_permitidos = '{}'
WHERE roles_permitidos IS NULL;

-- Asegurar que es_publico está definido
UPDATE reuniones
SET es_publico = FALSE
WHERE es_publico IS NULL;

-- ============================================================================
-- PASO 14: VALIDACIONES Y VERIFICACIÓN
-- ============================================================================

-- Verificar que todos los campos fueron agregados correctamente
DO $$
DECLARE
  campo_existe BOOLEAN;
BEGIN
  -- Verificar es_publico
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reuniones' AND column_name = 'es_publico'
  ) INTO campo_existe;

  IF NOT campo_existe THEN
    RAISE EXCEPTION 'Campo es_publico no fue creado correctamente';
  END IF;

  -- Verificar link_token
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reuniones' AND column_name = 'link_token'
  ) INTO campo_existe;

  IF NOT campo_existe THEN
    RAISE EXCEPTION 'Campo link_token no fue creado correctamente';
  END IF;

  -- Verificar usuarios_permitidos
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reuniones' AND column_name = 'usuarios_permitidos'
  ) INTO campo_existe;

  IF NOT campo_existe THEN
    RAISE EXCEPTION 'Campo usuarios_permitidos no fue creado correctamente';
  END IF;

  -- Verificar roles_permitidos
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reuniones' AND column_name = 'roles_permitidos'
  ) INTO campo_existe;

  IF NOT campo_existe THEN
    RAISE EXCEPTION 'Campo roles_permitidos no fue creado correctamente';
  END IF;

  RAISE NOTICE '✓ Todos los campos fueron creados correctamente';
END $$;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '==================================================================================';
  RAISE NOTICE '✓ Migración 010_reuniones_permisos_compartir.sql completada exitosamente';
  RAISE NOTICE '==================================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Campos agregados a tabla reuniones:';
  RAISE NOTICE '  - es_publico (BOOLEAN)';
  RAISE NOTICE '  - link_token (UUID)';
  RAISE NOTICE '  - usuarios_permitidos (UUID[])';
  RAISE NOTICE '  - roles_permitidos (TEXT[])';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Índices creados para optimización:';
  RAISE NOTICE '  - idx_reuniones_link_token (búsqueda por token)';
  RAISE NOTICE '  - idx_reuniones_es_publico (filtro público)';
  RAISE NOTICE '  - idx_reuniones_usuarios_permitidos (GIN array)';
  RAISE NOTICE '  - idx_reuniones_roles_permitidos (GIN array)';
  RAISE NOTICE '';
  RAISE NOTICE '✓ RLS Policies actualizadas:';
  RAISE NOTICE '  - SELECT: Incluye lógica de permisos compartidos';
  RAISE NOTICE '  - INSERT: Solo superadmin/admin/gerencia';
  RAISE NOTICE '  - UPDATE/DELETE: Sin cambios (mantienen lógica anterior)';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Funciones helper creadas:';
  RAISE NOTICE '  - regenerar_link_token_reunion(reunion_id)';
  RAISE NOTICE '  - agregar_usuario_permitido(reunion_id, usuario_id)';
  RAISE NOTICE '  - remover_usuario_permitido(reunion_id, usuario_id)';
  RAISE NOTICE '  - agregar_rol_permitido(reunion_id, rol_nombre)';
  RAISE NOTICE '  - remover_rol_permitido(reunion_id, rol_nombre)';
  RAISE NOTICE '  - toggle_acceso_publico_reunion(reunion_id, activar)';
  RAISE NOTICE '  - usuario_puede_ver_reunion(reunion_id, usuario_id)';
  RAISE NOTICE '  - get_reunion_por_link_token(token) [disponible para anon]';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Función get_user_reuniones actualizada con nueva lógica';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Datos migrados: link_token generado para reuniones existentes';
  RAISE NOTICE '';
  RAISE NOTICE '==================================================================================';
  RAISE NOTICE 'PRÓXIMOS PASOS:';
  RAISE NOTICE '==================================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Ejecutar esta migración en Supabase SQL Editor';
  RAISE NOTICE '2. Actualizar interfaces TypeScript en lib/db.ts';
  RAISE NOTICE '3. Crear UI para gestionar permisos compartidos';
  RAISE NOTICE '4. Implementar página pública para links compartidos (/reuniones/compartido/[token])';
  RAISE NOTICE '5. Testing con diferentes roles y permisos';
  RAISE NOTICE '';
  RAISE NOTICE '==================================================================================';
END $$;
