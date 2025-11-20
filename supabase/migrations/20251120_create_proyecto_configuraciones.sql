CREATE TABLE proyecto_configuraciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  tea DECIMAL(5,2) CHECK (tea > 0 AND tea <= 100),
  configuraciones_extra JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES usuarios(id),
  UNIQUE(proyecto_id)
);

CREATE INDEX idx_proyecto_config_proyecto ON proyecto_configuraciones(proyecto_id);

ALTER TABLE proyecto_configuraciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins pueden ver todas las configuraciones"
  ON proyecto_configuraciones FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM usuarios WHERE rol = 'admin' AND activo = true
  ));

CREATE POLICY "Admins pueden insertar configuraciones"
  ON proyecto_configuraciones FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM usuarios WHERE rol = 'admin' AND activo = true
  ));

CREATE POLICY "Admins pueden actualizar configuraciones"
  ON proyecto_configuraciones FOR UPDATE
  USING (auth.uid() IN (
    SELECT id FROM usuarios WHERE rol = 'admin' AND activo = true
  ));

CREATE POLICY "Admins pueden eliminar configuraciones"
  ON proyecto_configuraciones FOR DELETE
  USING (auth.uid() IN (
    SELECT id FROM usuarios WHERE rol = 'admin' AND activo = true
  ));
