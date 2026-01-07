-- ============================================================================
-- MIGRATION: Módulo de Reuniones/Transcripciones
-- ============================================================================
-- Fecha: 6 Enero 2026
-- Descripción: Tablas para transcripciones, action items, storage bucket y RLS
-- ============================================================================

-- ============================================================================
-- PASO 1: CREAR TABLAS
-- ============================================================================

-- TABLA: reuniones
CREATE TABLE IF NOT EXISTS reuniones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,

  -- Metadata
  titulo VARCHAR(255) NOT NULL,
  fecha_reunion TIMESTAMPTZ,
  duracion_segundos INTEGER,
  participantes TEXT[], -- Array de nombres mencionados en la reunión

  -- Archivo multimedia (retenido 30 días)
  media_storage_path TEXT,
  media_tipo VARCHAR(20), -- 'audio' o 'video'
  media_size_bytes BIGINT,
  media_deleted_at TIMESTAMPTZ, -- Cuando se eliminó (después de 30 días)

  -- Contenido procesado por IA
  transcripcion_completa TEXT,
  resumen TEXT,
  puntos_clave JSONB, -- ["punto 1", "punto 2"]
  decisiones JSONB, -- ["decision 1", "decision 2"]
  preguntas_abiertas JSONB, -- ["pregunta 1"]

  -- Estado de procesamiento
  estado VARCHAR(20) DEFAULT 'procesando' CHECK (estado IN ('subiendo', 'procesando', 'completado', 'error')),
  error_mensaje TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- TABLA: reunion_action_items
CREATE TABLE IF NOT EXISTS reunion_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id UUID REFERENCES reuniones(id) ON DELETE CASCADE NOT NULL,

  -- Contenido del action item
  descripcion TEXT NOT NULL,
  asignado_nombre VARCHAR(255), -- Nombre inferido de la transcripción
  asignado_usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL, -- Vínculo opcional a usuario real
  deadline DATE,
  prioridad VARCHAR(20) DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
  contexto_quote TEXT, -- Cita textual de donde se mencionó

  -- Estado
  completado BOOLEAN DEFAULT FALSE,
  completado_at TIMESTAMPTZ,
  completado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PASO 2: CREAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índices para tabla reuniones
CREATE INDEX IF NOT EXISTS idx_reuniones_proyecto ON reuniones(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_reuniones_created_by ON reuniones(created_by);
CREATE INDEX IF NOT EXISTS idx_reuniones_estado ON reuniones(estado);
CREATE INDEX IF NOT EXISTS idx_reuniones_fecha ON reuniones(fecha_reunion DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_reuniones_created_at ON reuniones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reuniones_media_cleanup ON reuniones(media_storage_path, created_at) WHERE media_storage_path IS NOT NULL AND media_deleted_at IS NULL;

-- Índices para tabla reunion_action_items
CREATE INDEX IF NOT EXISTS idx_action_items_reunion ON reunion_action_items(reunion_id);
CREATE INDEX IF NOT EXISTS idx_action_items_asignado ON reunion_action_items(asignado_usuario_id);
CREATE INDEX IF NOT EXISTS idx_action_items_completado ON reunion_action_items(completado) WHERE completado = FALSE;
CREATE INDEX IF NOT EXISTS idx_action_items_deadline ON reunion_action_items(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_action_items_asignado_pendientes ON reunion_action_items(asignado_usuario_id, completado) WHERE asignado_usuario_id IS NOT NULL;

-- ============================================================================
-- PASO 3: TRIGGERS
-- ============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para reuniones.updated_at
DROP TRIGGER IF EXISTS update_reuniones_updated_at ON reuniones;
CREATE TRIGGER update_reuniones_updated_at
  BEFORE UPDATE ON reuniones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PASO 4: HABILITAR RLS
-- ============================================================================

ALTER TABLE reuniones ENABLE ROW LEVEL SECURITY;
ALTER TABLE reunion_action_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 5: RLS POLICIES - REUNIONES
-- ============================================================================

-- DROP políticas existentes si existen
DROP POLICY IF EXISTS "Reuniones - Select" ON reuniones;
DROP POLICY IF EXISTS "Reuniones - Insert" ON reuniones;
DROP POLICY IF EXISTS "Reuniones - Update" ON reuniones;
DROP POLICY IF EXISTS "Reuniones - Delete" ON reuniones;

-- Policy: SELECT - Solo roles admin, gerencia, jefe_ventas
-- Admin/Gerencia/Jefe Ventas ven todas las reuniones
CREATE POLICY "Reuniones - Select"
ON reuniones FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = auth.uid()
    AND u.rol IN ('admin', 'gerencia', 'jefe_ventas')
  )
);

-- Policy: INSERT - Solo roles admin, gerencia, jefe_ventas pueden crear
CREATE POLICY "Reuniones - Insert"
ON reuniones FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'gerencia', 'jefe_ventas')
  )
);

-- Policy: UPDATE - Admin/Gerencia pueden actualizar todas, creador puede actualizar las suyas
CREATE POLICY "Reuniones - Update"
ON reuniones FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'gerencia')
  )
  OR created_by = auth.uid()
);

-- Policy: DELETE - Solo admin puede eliminar
CREATE POLICY "Reuniones - Delete"
ON reuniones FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol = 'admin'
  )
);

-- ============================================================================
-- PASO 6: RLS POLICIES - ACTION ITEMS
-- ============================================================================

-- DROP políticas existentes si existen
DROP POLICY IF EXISTS "Action Items - Select" ON reunion_action_items;
DROP POLICY IF EXISTS "Action Items - Insert" ON reunion_action_items;
DROP POLICY IF EXISTS "Action Items - Update" ON reunion_action_items;

-- Policy: SELECT - TODOS los usuarios autenticados pueden ver action items
-- Esto permite que cada usuario vea sus pendientes en "Mis Pendientes"
CREATE POLICY "Action Items - Select"
ON reunion_action_items FOR SELECT
TO authenticated
USING (true);

-- Policy: INSERT - Solo se crea desde el backend al procesar reunión
CREATE POLICY "Action Items - Insert"
ON reunion_action_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'gerencia', 'jefe_ventas')
  )
);

-- Policy: UPDATE - Solo el usuario asignado puede marcar como completado
-- O admin/gerencia pueden modificar cualquiera
CREATE POLICY "Action Items - Update"
ON reunion_action_items FOR UPDATE
TO authenticated
USING (
  asignado_usuario_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'gerencia')
  )
);

-- ============================================================================
-- PASO 7: STORAGE BUCKET (NOTA: Ver instrucciones de configuración manual)
-- ============================================================================

-- IMPORTANTE: La creación del bucket debe hacerse desde el Dashboard de Supabase
-- o usando la función insert_storage_bucket() si está disponible.
--
-- Si la función insert_storage_bucket existe, descomentar:
/*
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'reuniones-media') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'reuniones-media',
      'reuniones-media',
      false, -- Privado
      2147483648, -- 2GB en bytes
      ARRAY[
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav',
        'audio/mp4',
        'audio/x-m4a',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo'
      ]
    );
  END IF;
END $$;
*/

-- ============================================================================
-- PASO 8: STORAGE RLS POLICIES
-- ============================================================================

-- DROP políticas existentes si existen
DROP POLICY IF EXISTS "Usuarios permitidos pueden subir" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios permitidos pueden leer" ON storage.objects;
DROP POLICY IF EXISTS "Admin puede eliminar archivos antiguos" ON storage.objects;

-- Policy: INSERT - Solo usuarios admin/gerencia/jefe_ventas pueden subir
CREATE POLICY "Usuarios permitidos pueden subir"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reuniones-media'
  AND EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'gerencia', 'jefe_ventas')
  )
);

-- Policy: SELECT - Solo roles permitidos pueden leer archivos
CREATE POLICY "Usuarios permitidos pueden leer"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reuniones-media'
  AND EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'gerencia', 'jefe_ventas')
  )
);

-- Policy: DELETE - Solo admin puede eliminar (o el cron job con service_role)
CREATE POLICY "Admin puede eliminar archivos antiguos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reuniones-media'
  AND EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol = 'admin'
  )
);

-- ============================================================================
-- PASO 9: FUNCIÓN DE CLEANUP (archivos >30 días)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_media_files()
RETURNS TABLE(cleaned_count INTEGER, error_count INTEGER, details JSONB) AS $$
DECLARE
  file_record RECORD;
  cleaned INTEGER := 0;
  errors INTEGER := 0;
  error_details JSONB := '[]'::JSONB;
  success_ids TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Buscar reuniones con archivo y >30 días que no han sido eliminados
  FOR file_record IN
    SELECT id, media_storage_path, titulo, created_at
    FROM reuniones
    WHERE media_storage_path IS NOT NULL
    AND media_deleted_at IS NULL
    AND created_at < NOW() - INTERVAL '30 days'
  LOOP
    BEGIN
      -- Marcar como eliminado en la tabla reuniones
      -- (La eliminación física del storage se hace desde el API Route)
      UPDATE reuniones
      SET media_storage_path = NULL,
          media_deleted_at = NOW()
      WHERE id = file_record.id;

      cleaned := cleaned + 1;
      success_ids := array_append(success_ids, file_record.id::TEXT);

      RAISE NOTICE 'Cleaned media for reunion: % (created: %)', file_record.titulo, file_record.created_at;

    EXCEPTION
      WHEN OTHERS THEN
        errors := errors + 1;
        error_details := error_details || jsonb_build_object(
          'reunion_id', file_record.id,
          'titulo', file_record.titulo,
          'error', SQLERRM
        );
        RAISE WARNING 'Error cleaning media for reunion %: %', file_record.id, SQLERRM;
    END;
  END LOOP;

  -- Retornar resumen
  RETURN QUERY SELECT
    cleaned,
    errors,
    jsonb_build_object(
      'success_ids', success_ids,
      'errors', error_details,
      'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PASO 10: FUNCIÓN HELPER PARA OBTENER REUNIONES DE UN USUARIO
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_reuniones(user_id UUID)
RETURNS TABLE(
  id UUID,
  proyecto_id UUID,
  titulo VARCHAR,
  fecha_reunion TIMESTAMPTZ,
  estado VARCHAR,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.proyecto_id,
    r.titulo,
    r.fecha_reunion,
    r.estado,
    r.created_at
  FROM reuniones r
  INNER JOIN usuarios u ON u.id = user_id
  WHERE
    -- Admin, gerencia y jefe ventas ven todas
    u.rol IN ('admin', 'gerencia', 'jefe_ventas')
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PASO 11: FUNCIÓN HELPER PARA OBTENER ACTION ITEMS DE UN USUARIO
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_action_items(user_id UUID, include_completed BOOLEAN DEFAULT FALSE)
RETURNS TABLE(
  id UUID,
  reunion_id UUID,
  reunion_titulo VARCHAR,
  descripcion TEXT,
  asignado_nombre VARCHAR,
  deadline DATE,
  prioridad VARCHAR,
  completado BOOLEAN,
  completado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai.id,
    ai.reunion_id,
    r.titulo as reunion_titulo,
    ai.descripcion,
    ai.asignado_nombre,
    ai.deadline,
    ai.prioridad,
    ai.completado,
    ai.completado_at,
    ai.created_at
  FROM reunion_action_items ai
  INNER JOIN reuniones r ON r.id = ai.reunion_id
  WHERE ai.asignado_usuario_id = user_id
  AND (include_completed OR ai.completado = FALSE)
  ORDER BY
    ai.completado ASC,
    ai.deadline ASC NULLS LAST,
    ai.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PASO 12: COMENTARIOS EN LAS TABLAS (Documentación)
-- ============================================================================

COMMENT ON TABLE reuniones IS 'Almacena reuniones transcritas con IA (Whisper + GPT-4)';
COMMENT ON COLUMN reuniones.estado IS 'Estados: subiendo, procesando, completado, error';
COMMENT ON COLUMN reuniones.media_storage_path IS 'Path en Supabase Storage. NULL después de 30 días (auto-cleanup)';
COMMENT ON COLUMN reuniones.transcripcion_completa IS 'Transcripción completa generada por Whisper API';
COMMENT ON COLUMN reuniones.resumen IS 'Resumen generado por GPT-4';
COMMENT ON COLUMN reuniones.puntos_clave IS 'JSONB array de puntos clave extraídos por GPT-4';
COMMENT ON COLUMN reuniones.decisiones IS 'JSONB array de decisiones tomadas en la reunión';
COMMENT ON COLUMN reuniones.preguntas_abiertas IS 'JSONB array de preguntas sin responder';

COMMENT ON TABLE reunion_action_items IS 'Action items extraídos automáticamente de reuniones';
COMMENT ON COLUMN reunion_action_items.asignado_nombre IS 'Nombre inferido de la transcripción por GPT-4';
COMMENT ON COLUMN reunion_action_items.asignado_usuario_id IS 'Vinculación opcional a usuario real del sistema';
COMMENT ON COLUMN reunion_action_items.contexto_quote IS 'Cita textual de donde se mencionó el action item';

COMMENT ON FUNCTION cleanup_old_media_files() IS 'Limpia archivos multimedia >30 días. Ejecutar diariamente con Vercel Cron';
COMMENT ON FUNCTION get_user_reuniones(UUID) IS 'Retorna reuniones visibles para un usuario según su rol';
COMMENT ON FUNCTION get_user_action_items(UUID, BOOLEAN) IS 'Retorna action items asignados a un usuario';

-- ============================================================================
-- PASO 13: GRANTS (Permisos)
-- ============================================================================

-- Asegurar que authenticated puede ejecutar las funciones helper
GRANT EXECUTE ON FUNCTION get_user_reuniones(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_action_items(UUID, BOOLEAN) TO authenticated;

-- La función cleanup debe ser ejecutada solo por service_role (desde cron)
GRANT EXECUTE ON FUNCTION cleanup_old_media_files() TO service_role;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

-- Verificar que todo se creó correctamente
DO $$
BEGIN
  RAISE NOTICE '✓ Migración completada exitosamente';
  RAISE NOTICE '✓ Tablas creadas: reuniones, reunion_action_items';
  RAISE NOTICE '✓ Índices creados para optimización de queries';
  RAISE NOTICE '✓ RLS habilitado y policies configuradas';
  RAISE NOTICE '✓ Funciones helper creadas';
  RAISE NOTICE '';
  RAISE NOTICE '⚠ IMPORTANTE: Crear bucket "reuniones-media" manualmente en Supabase Dashboard';
  RAISE NOTICE '   Dashboard → Storage → New Bucket';
  RAISE NOTICE '   - Name: reuniones-media';
  RAISE NOTICE '   - Public: NO (privado)';
  RAISE NOTICE '   - File Size Limit: 2GB (2147483648 bytes)';
  RAISE NOTICE '   - Allowed MIME types: audio/*, video/*';
  RAISE NOTICE '';
  RAISE NOTICE '⚠ Configurar Vercel Cron para cleanup diario:';
  RAISE NOTICE '   vercel.json → "crons": [{"path": "/api/reuniones/cron-cleanup", "schedule": "0 3 * * *"}]';
END $$;
