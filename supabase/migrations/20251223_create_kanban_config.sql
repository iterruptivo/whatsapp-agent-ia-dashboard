-- =============================================
-- MIGRACIÓN: Configuración de Kanban para Leads
-- Fecha: 23 Diciembre 2025
-- Descripción: Tablas para configurar columnas y mapeo de tipificaciones del Kanban
-- =============================================

-- =============================================
-- TABLA: kanban_config
-- Almacena las columnas del Kanban
-- =============================================
CREATE TABLE IF NOT EXISTS kanban_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  columna_codigo VARCHAR(50) NOT NULL UNIQUE,
  columna_nombre VARCHAR(100) NOT NULL,
  columna_color VARCHAR(20) NOT NULL DEFAULT '#6B7280',
  columna_orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para ordenar columnas
CREATE INDEX IF NOT EXISTS idx_kanban_config_orden ON kanban_config(columna_orden);

-- =============================================
-- TABLA: kanban_tipificacion_mapping
-- Mapea tipificaciones a columnas del Kanban
-- =============================================
CREATE TABLE IF NOT EXISTS kanban_tipificacion_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipificacion_nivel_1 VARCHAR(50),
  tipificacion_nivel_2 VARCHAR(50),
  columna_codigo VARCHAR(50) NOT NULL REFERENCES kanban_config(columna_codigo) ON DELETE CASCADE,
  prioridad INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: combinación única de nivel_1 y nivel_2
  CONSTRAINT unique_tipificacion_mapping UNIQUE (tipificacion_nivel_1, tipificacion_nivel_2)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_kanban_mapping_columna ON kanban_tipificacion_mapping(columna_codigo);
CREATE INDEX IF NOT EXISTS idx_kanban_mapping_tipificacion ON kanban_tipificacion_mapping(tipificacion_nivel_1, tipificacion_nivel_2);

-- =============================================
-- DATOS INICIALES: Columnas del Kanban
-- =============================================
INSERT INTO kanban_config (columna_codigo, columna_nombre, columna_color, columna_orden) VALUES
  ('nuevo', 'Nuevo', '#3B82F6', 1),
  ('contactando', 'Contactando', '#F59E0B', 2),
  ('en_conversacion', 'En Conversación', '#F97316', 3),
  ('calificado', 'Calificado', '#10B981', 4),
  ('descartado', 'Descartado', '#6B7280', 5)
ON CONFLICT (columna_codigo) DO NOTHING;

-- =============================================
-- DATOS INICIALES: Mapeo de Tipificaciones
-- =============================================

-- NUEVO: Lead sin tipificar
INSERT INTO kanban_tipificacion_mapping (tipificacion_nivel_1, tipificacion_nivel_2, columna_codigo, prioridad) VALUES
  (NULL, NULL, 'nuevo', 100)
ON CONFLICT ON CONSTRAINT unique_tipificacion_mapping DO NOTHING;

-- CONTACTANDO: Intentos de contacto fallidos
INSERT INTO kanban_tipificacion_mapping (tipificacion_nivel_1, tipificacion_nivel_2, columna_codigo, prioridad) VALUES
  ('no_contactado', 'no_contesta', 'contactando', 90),
  ('no_contactado', 'buzon_mensaje', 'contactando', 90),
  ('no_contactado', 'telefono_apagado', 'contactando', 90),
  ('no_contactado', 'telefono_fuera_servicio', 'contactando', 90),
  ('no_contactado', 'numero_incorrecto', 'contactando', 90),
  ('no_contactado', NULL, 'contactando', 85)
ON CONFLICT ON CONSTRAINT unique_tipificacion_mapping DO NOTHING;

-- EN CONVERSACIÓN: Lead respondió, evaluando interés
INSERT INTO kanban_tipificacion_mapping (tipificacion_nivel_1, tipificacion_nivel_2, columna_codigo, prioridad) VALUES
  ('contactado', 'interesado', 'en_conversacion', 80),
  ('seguimiento', 'pendiente_visita', 'en_conversacion', 75),
  ('seguimiento', 'pendiente_decision', 'en_conversacion', 75),
  ('seguimiento', NULL, 'en_conversacion', 70),
  ('otros', 'contacto_otra_area', 'en_conversacion', 65),
  ('otros', NULL, 'en_conversacion', 60),
  ('contactado', NULL, 'en_conversacion', 50)
ON CONFLICT ON CONSTRAINT unique_tipificacion_mapping DO NOTHING;

-- CALIFICADO: Listo para pasar a Locales
INSERT INTO kanban_tipificacion_mapping (tipificacion_nivel_1, tipificacion_nivel_2, columna_codigo, prioridad) VALUES
  ('contactado', 'cliente_evaluacion', 'calificado', 95),
  ('contactado', 'cliente_negociacion', 'calificado', 95),
  ('contactado', 'cliente_cierre', 'calificado', 95)
ON CONFLICT ON CONSTRAINT unique_tipificacion_mapping DO NOTHING;

-- DESCARTADO: Sin interés o no califica
INSERT INTO kanban_tipificacion_mapping (tipificacion_nivel_1, tipificacion_nivel_2, columna_codigo, prioridad) VALUES
  ('contactado', 'no_interesado', 'descartado', 95)
ON CONFLICT ON CONSTRAINT unique_tipificacion_mapping DO NOTHING;

-- =============================================
-- FUNCIÓN: Obtener columna Kanban de un lead
-- =============================================
CREATE OR REPLACE FUNCTION get_kanban_columna(
  p_nivel_1 VARCHAR(50),
  p_nivel_2 VARCHAR(50)
) RETURNS VARCHAR(50) AS $$
DECLARE
  v_columna VARCHAR(50);
BEGIN
  -- Buscar mapeo exacto (nivel_1 + nivel_2)
  SELECT columna_codigo INTO v_columna
  FROM kanban_tipificacion_mapping
  WHERE tipificacion_nivel_1 IS NOT DISTINCT FROM p_nivel_1
    AND tipificacion_nivel_2 IS NOT DISTINCT FROM p_nivel_2
  ORDER BY prioridad DESC
  LIMIT 1;

  -- Si no hay mapeo exacto, buscar por nivel_1 solamente
  IF v_columna IS NULL THEN
    SELECT columna_codigo INTO v_columna
    FROM kanban_tipificacion_mapping
    WHERE tipificacion_nivel_1 IS NOT DISTINCT FROM p_nivel_1
      AND tipificacion_nivel_2 IS NULL
    ORDER BY prioridad DESC
    LIMIT 1;
  END IF;

  -- Si aún no hay mapeo, retornar 'nuevo' por defecto
  IF v_columna IS NULL THEN
    v_columna := 'nuevo';
  END IF;

  RETURN v_columna;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- RLS: Políticas de seguridad
-- =============================================

-- Habilitar RLS
ALTER TABLE kanban_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tipificacion_mapping ENABLE ROW LEVEL SECURITY;

-- Política: Lectura para usuarios autenticados
CREATE POLICY "kanban_config_select_authenticated" ON kanban_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "kanban_mapping_select_authenticated" ON kanban_tipificacion_mapping
  FOR SELECT TO authenticated USING (true);

-- Política: Escritura solo para admin y gerencia
CREATE POLICY "kanban_config_insert_admin" ON kanban_config
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.rol IN ('admin', 'gerencia')
    )
  );

CREATE POLICY "kanban_config_update_admin" ON kanban_config
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.rol IN ('admin', 'gerencia')
    )
  );

CREATE POLICY "kanban_config_delete_admin" ON kanban_config
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.rol IN ('admin', 'gerencia')
    )
  );

CREATE POLICY "kanban_mapping_insert_admin" ON kanban_tipificacion_mapping
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.rol IN ('admin', 'gerencia')
    )
  );

CREATE POLICY "kanban_mapping_update_admin" ON kanban_tipificacion_mapping
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.rol IN ('admin', 'gerencia')
    )
  );

CREATE POLICY "kanban_mapping_delete_admin" ON kanban_tipificacion_mapping
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.rol IN ('admin', 'gerencia')
    )
  );

-- =============================================
-- TRIGGER: Actualizar updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_kanban_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_kanban_config_updated_at
  BEFORE UPDATE ON kanban_config
  FOR EACH ROW
  EXECUTE FUNCTION update_kanban_updated_at();

CREATE TRIGGER trigger_kanban_mapping_updated_at
  BEFORE UPDATE ON kanban_tipificacion_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_kanban_updated_at();

-- =============================================
-- COMENTARIOS
-- =============================================
COMMENT ON TABLE kanban_config IS 'Configuración de columnas del Kanban de leads';
COMMENT ON TABLE kanban_tipificacion_mapping IS 'Mapeo de tipificaciones a columnas del Kanban';
COMMENT ON FUNCTION get_kanban_columna IS 'Obtiene la columna Kanban correspondiente a una tipificación';
