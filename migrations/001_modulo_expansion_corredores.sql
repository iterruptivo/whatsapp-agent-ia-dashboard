-- ============================================================================
-- MIGRACIÓN: Módulo Expansión - Sistema de Corredores
-- ============================================================================
-- Fecha: 12 Enero 2026
-- Descripción: Crea tablas para gestión de corredores externos
-- ============================================================================

-- ============================================================================
-- TABLA 1: corredores_registro
-- Almacena datos de registro de corredores (persona natural o jurídica)
-- ============================================================================

CREATE TABLE IF NOT EXISTS corredores_registro (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Tipo de persona
  tipo_persona VARCHAR(20) NOT NULL CHECK (tipo_persona IN ('natural', 'juridica')),

  -- Datos comunes
  email VARCHAR(255) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  direccion TEXT,

  -- Datos Persona Natural
  dni VARCHAR(8),
  nombres VARCHAR(100),
  apellido_paterno VARCHAR(50),
  apellido_materno VARCHAR(50),
  fecha_nacimiento DATE,

  -- Datos Persona Jurídica
  razon_social VARCHAR(200),
  ruc VARCHAR(11),
  representante_legal VARCHAR(200),
  dni_representante VARCHAR(8),

  -- Declaraciones
  direccion_declarada TEXT,
  es_pep BOOLEAN DEFAULT false,  -- Persona Expuesta Políticamente

  -- Estado del registro
  estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'pendiente', 'observado', 'aprobado', 'rechazado')),
  observaciones TEXT,  -- Motivo de observación/rechazo

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  enviado_at TIMESTAMPTZ,  -- Cuando pasó de borrador a pendiente
  aprobado_por UUID REFERENCES usuarios(id),
  aprobado_at TIMESTAMPTZ,

  -- Constraint: un usuario solo puede tener un registro
  CONSTRAINT unique_usuario_registro UNIQUE (usuario_id)
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_corredores_registro_estado ON corredores_registro(estado);
CREATE INDEX IF NOT EXISTS idx_corredores_registro_usuario ON corredores_registro(usuario_id);
CREATE INDEX IF NOT EXISTS idx_corredores_registro_tipo ON corredores_registro(tipo_persona);
CREATE INDEX IF NOT EXISTS idx_corredores_registro_created ON corredores_registro(created_at DESC);

-- ============================================================================
-- TABLA 2: corredores_documentos
-- Almacena documentos subidos por corredores (DNI, recibos, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS corredores_documentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID NOT NULL REFERENCES corredores_registro(id) ON DELETE CASCADE,

  tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN (
    'dni_frente',
    'dni_reverso',
    'recibo_luz',
    'declaracion_jurada_direccion',
    'ficha_ruc',
    'vigencia_poder',
    'declaracion_pep'
  )),

  -- Storage
  storage_path TEXT NOT NULL,
  public_url TEXT,

  -- OCR Data (JSON con datos extraídos)
  ocr_data JSONB,
  ocr_confianza INTEGER CHECK (ocr_confianza >= 0 AND ocr_confianza <= 100),

  -- Metadata
  nombre_original VARCHAR(255),
  content_type VARCHAR(100),
  size_bytes INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: un tipo de documento por registro
  CONSTRAINT unique_documento_tipo UNIQUE (registro_id, tipo_documento)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_corredores_documentos_registro ON corredores_documentos(registro_id);
CREATE INDEX IF NOT EXISTS idx_corredores_documentos_tipo ON corredores_documentos(tipo_documento);

-- ============================================================================
-- TABLA 3: corredores_historial
-- Timeline de cambios de estado (auditoría)
-- ============================================================================

CREATE TABLE IF NOT EXISTS corredores_historial (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id UUID NOT NULL REFERENCES corredores_registro(id) ON DELETE CASCADE,

  accion VARCHAR(30) NOT NULL CHECK (accion IN (
    'creado',
    'enviado',
    'observado',
    'corregido',
    'aprobado',
    'rechazado'
  )),
  comentario TEXT,
  realizado_por UUID REFERENCES usuarios(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_corredores_historial_registro ON corredores_historial(registro_id);
CREATE INDEX IF NOT EXISTS idx_corredores_historial_created ON corredores_historial(created_at DESC);

-- ============================================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION update_corredores_registro_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_corredores_registro ON corredores_registro;
CREATE TRIGGER trigger_update_corredores_registro
  BEFORE UPDATE ON corredores_registro
  FOR EACH ROW
  EXECUTE FUNCTION update_corredores_registro_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Habilitar RLS
ALTER TABLE corredores_registro ENABLE ROW LEVEL SECURITY;
ALTER TABLE corredores_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE corredores_historial ENABLE ROW LEVEL SECURITY;

-- Políticas para corredores_registro
-- Corredor: ver solo su propio registro
CREATE POLICY "Corredor ve su registro"
  ON corredores_registro
  FOR SELECT
  USING (usuario_id = auth.uid());

-- Corredor: puede crear/editar su registro (solo si está en borrador u observado)
CREATE POLICY "Corredor edita su registro"
  ON corredores_registro
  FOR UPDATE
  USING (usuario_id = auth.uid() AND estado IN ('borrador', 'observado'));

CREATE POLICY "Corredor crea su registro"
  ON corredores_registro
  FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- Admin/Legal: ver todos los registros
CREATE POLICY "Admin ve todos los registros"
  ON corredores_registro
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('superadmin', 'admin', 'legal')
    )
  );

-- Admin/Legal: puede actualizar cualquier registro (aprobar/observar/rechazar)
CREATE POLICY "Admin actualiza registros"
  ON corredores_registro
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('superadmin', 'admin', 'legal')
    )
  );

-- Políticas para corredores_documentos
CREATE POLICY "Corredor ve sus documentos"
  ON corredores_documentos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM corredores_registro
      WHERE id = registro_id AND usuario_id = auth.uid()
    )
  );

CREATE POLICY "Corredor sube documentos"
  ON corredores_documentos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM corredores_registro
      WHERE id = registro_id
      AND usuario_id = auth.uid()
      AND estado IN ('borrador', 'observado')
    )
  );

CREATE POLICY "Corredor elimina sus documentos"
  ON corredores_documentos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM corredores_registro
      WHERE id = registro_id
      AND usuario_id = auth.uid()
      AND estado IN ('borrador', 'observado')
    )
  );

CREATE POLICY "Admin ve todos los documentos"
  ON corredores_documentos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('superadmin', 'admin', 'legal')
    )
  );

-- Políticas para corredores_historial
CREATE POLICY "Corredor ve su historial"
  ON corredores_historial
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM corredores_registro
      WHERE id = registro_id AND usuario_id = auth.uid()
    )
  );

CREATE POLICY "Admin ve todo el historial"
  ON corredores_historial
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('superadmin', 'admin', 'legal')
    )
  );

CREATE POLICY "Sistema inserta historial"
  ON corredores_historial
  FOR INSERT
  WITH CHECK (true);  -- Server actions manejan esto

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON TABLE corredores_registro IS 'Registros de corredores externos para módulo Expansión';
COMMENT ON TABLE corredores_documentos IS 'Documentos subidos por corredores (DNI, recibos, etc.)';
COMMENT ON TABLE corredores_historial IS 'Historial de cambios de estado de registros';

COMMENT ON COLUMN corredores_registro.tipo_persona IS 'natural = persona natural, juridica = empresa';
COMMENT ON COLUMN corredores_registro.es_pep IS 'Persona Expuesta Políticamente';
COMMENT ON COLUMN corredores_registro.estado IS 'borrador, pendiente, observado, aprobado, rechazado';
COMMENT ON COLUMN corredores_documentos.ocr_data IS 'Datos extraídos por OCR en formato JSON';
