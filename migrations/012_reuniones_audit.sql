-- ============================================================================
-- MIGRACIÓN 012: Tabla de Auditoría para Eliminación de Reuniones
-- ============================================================================
-- Fecha: 16 Enero 2026
-- Descripción: Crea tabla reuniones_audit para registrar eliminaciones
-- ============================================================================

-- 1. Crear tabla de auditoría
-- ============================================================================

CREATE TABLE IF NOT EXISTS reuniones_audit (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Datos de la reunión eliminada
  reunion_id UUID NOT NULL,
  titulo TEXT NOT NULL,

  -- Usuarios involucrados
  created_by UUID NOT NULL, -- Quien creó la reunión
  deleted_by UUID NOT NULL, -- Quien eliminó la reunión

  -- Motivo de eliminación (obligatorio)
  motivo TEXT NOT NULL,

  -- Proyecto
  proyecto_id UUID NOT NULL,

  -- Timestamp
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para búsquedas
-- ============================================================================

-- Buscar por reunión eliminada
CREATE INDEX IF NOT EXISTS idx_reuniones_audit_reunion_id
  ON reuniones_audit(reunion_id);

-- Buscar por quien eliminó
CREATE INDEX IF NOT EXISTS idx_reuniones_audit_deleted_by
  ON reuniones_audit(deleted_by);

-- Buscar por proyecto
CREATE INDEX IF NOT EXISTS idx_reuniones_audit_proyecto_id
  ON reuniones_audit(proyecto_id);

-- Buscar por fecha de eliminación
CREATE INDEX IF NOT EXISTS idx_reuniones_audit_deleted_at
  ON reuniones_audit(deleted_at DESC);

-- 3. RLS Policies
-- ============================================================================

-- Habilitar RLS
ALTER TABLE reuniones_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Administradores pueden ver toda la auditoría
CREATE POLICY "Administradores ven auditoría"
  ON reuniones_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('superadmin', 'admin', 'gerencia')
    )
  );

-- Policy: Sistema puede insertar registros de auditoría
CREATE POLICY "Sistema inserta auditoría"
  ON reuniones_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Solo permite insertar si el usuario está autenticado
    -- (la validación de permisos se hace en el server action)
    auth.uid() IS NOT NULL
  );

-- 4. Comentarios
-- ============================================================================

COMMENT ON TABLE reuniones_audit IS 'Registro de auditoría para reuniones eliminadas (hard delete con log mínimo)';
COMMENT ON COLUMN reuniones_audit.reunion_id IS 'ID de la reunión eliminada (no es FK porque ya no existe)';
COMMENT ON COLUMN reuniones_audit.titulo IS 'Título de la reunión eliminada (para identificación)';
COMMENT ON COLUMN reuniones_audit.created_by IS 'Usuario que creó la reunión originalmente';
COMMENT ON COLUMN reuniones_audit.deleted_by IS 'Usuario que eliminó la reunión';
COMMENT ON COLUMN reuniones_audit.motivo IS 'Motivo de eliminación (obligatorio)';
COMMENT ON COLUMN reuniones_audit.proyecto_id IS 'Proyecto al que pertenecía la reunión';
COMMENT ON COLUMN reuniones_audit.deleted_at IS 'Fecha y hora de eliminación';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
