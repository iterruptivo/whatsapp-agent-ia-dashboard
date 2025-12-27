-- =====================================================
-- MIGRACIÓN: TABLAS DE CONFIGURACIÓN DE TIPIFICACIONES
-- Fecha: 2025-12-24
-- Descripción: Crear tablas para tipificaciones N1, N2, N3 con datos iniciales
-- Objetivo: Mover tipificaciones de código hardcodeado a BD configurable
-- =====================================================

-- =====================================================
-- TABLA 1: TIPIFICACIONES NIVEL 1 (Categorías principales)
-- =====================================================
CREATE TABLE tipificaciones_nivel_1 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tipificaciones_nivel_1 IS 'Tipificaciones de primer nivel (categorías principales)';
COMMENT ON COLUMN tipificaciones_nivel_1.codigo IS 'Código único de la tipificación (se guarda en leads.tipificacion_nivel_1)';
COMMENT ON COLUMN tipificaciones_nivel_1.label IS 'Etiqueta visible para el usuario';
COMMENT ON COLUMN tipificaciones_nivel_1.orden IS 'Orden de visualización en UI';
COMMENT ON COLUMN tipificaciones_nivel_1.activo IS 'Si está activo para ser usado en nuevos leads';

-- =====================================================
-- TABLA 2: TIPIFICACIONES NIVEL 2 (Subestados, depende de N1)
-- =====================================================
CREATE TABLE tipificaciones_nivel_2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel_1_codigo VARCHAR(50) NOT NULL,
  codigo VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- FK a nivel 1 por codigo (no por id UUID)
  CONSTRAINT fk_tipif_n2_n1 FOREIGN KEY (nivel_1_codigo)
    REFERENCES tipificaciones_nivel_1(codigo)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  -- Combinación N1+N2 debe ser única
  CONSTRAINT uq_tipif_n2_codigo UNIQUE(nivel_1_codigo, codigo)
);

COMMENT ON TABLE tipificaciones_nivel_2 IS 'Tipificaciones de segundo nivel (subestados por categoría N1)';
COMMENT ON COLUMN tipificaciones_nivel_2.nivel_1_codigo IS 'Código del nivel 1 padre (FK)';
COMMENT ON COLUMN tipificaciones_nivel_2.codigo IS 'Código de la tipificación N2 (se guarda en leads.tipificacion_nivel_2)';
COMMENT ON COLUMN tipificaciones_nivel_2.label IS 'Etiqueta visible para el usuario';
COMMENT ON COLUMN tipificaciones_nivel_2.orden IS 'Orden de visualización dentro de su grupo N1';
COMMENT ON COLUMN tipificaciones_nivel_2.activo IS 'Si está activo para ser usado en nuevos leads';

-- =====================================================
-- TABLA 3: TIPIFICACIONES NIVEL 3 (Detalles, independiente)
-- =====================================================
CREATE TABLE tipificaciones_nivel_3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tipificaciones_nivel_3 IS 'Tipificaciones de tercer nivel (detalles, independiente de N1 y N2)';
COMMENT ON COLUMN tipificaciones_nivel_3.codigo IS 'Código único de la tipificación (se guarda en leads.tipificacion_nivel_3)';
COMMENT ON COLUMN tipificaciones_nivel_3.label IS 'Etiqueta visible para el usuario';
COMMENT ON COLUMN tipificaciones_nivel_3.orden IS 'Orden de visualización en UI';
COMMENT ON COLUMN tipificaciones_nivel_3.activo IS 'Si está activo para ser usado en nuevos leads';

-- =====================================================
-- DATOS INICIALES: NIVEL 1 (4 registros)
-- =====================================================
-- Valores exactos de LeadDetailPanel.tsx líneas 12-17
INSERT INTO tipificaciones_nivel_1 (codigo, label, orden) VALUES
  ('contactado', 'Contactado', 1),
  ('no_contactado', 'No Contactado', 2),
  ('seguimiento', 'Seguimiento', 3),
  ('otros', 'Otros', 4);

-- =====================================================
-- DATOS INICIALES: NIVEL 2 (13 registros)
-- =====================================================
-- Valores exactos de LeadDetailPanel.tsx líneas 19-41
INSERT INTO tipificaciones_nivel_2 (nivel_1_codigo, codigo, label, orden) VALUES
  -- Contactado (5)
  ('contactado', 'interesado', 'Interesado', 1),
  ('contactado', 'no_interesado', 'No Interesado', 2),
  ('contactado', 'cliente_evaluacion', 'Cliente en Evaluación', 3),
  ('contactado', 'cliente_negociacion', 'Cliente en Negociación', 4),
  ('contactado', 'cliente_cierre', 'Cliente en Cierre', 5),

  -- No Contactado (5)
  ('no_contactado', 'no_contesta', 'No contesta', 1),
  ('no_contactado', 'buzon_mensaje', 'Buzón / mensaje de voz', 2),
  ('no_contactado', 'telefono_apagado', 'Teléfono apagado', 3),
  ('no_contactado', 'telefono_fuera_servicio', 'Teléfono fuera de servicio', 4),
  ('no_contactado', 'numero_incorrecto', 'Número incorrecto', 5),

  -- Seguimiento (2)
  ('seguimiento', 'pendiente_visita', 'Pendiente de visita', 1),
  ('seguimiento', 'pendiente_decision', 'Pendiente de decisión', 2),

  -- Otros (1)
  ('otros', 'contacto_otra_area', 'Solicita contacto con otra área', 1);

-- =====================================================
-- DATOS INICIALES: NIVEL 3 (30 registros)
-- =====================================================
-- Valores exactos de LeadDetailPanel.tsx líneas 43-76
INSERT INTO tipificaciones_nivel_3 (codigo, label, orden) VALUES
  ('solicita_info_proyecto', 'Solicita información del proyecto', 1),
  ('requiere_cotizacion', 'Requiere cotización', 2),
  ('agenda_visita', 'Agenda visita / cita presencial', 3),
  ('contactar_despues', 'Quiere ser contactado más adelante', 4),
  ('interesado_otro_proyecto', 'Interesado en otro proyecto', 5),
  ('no_califica', 'No califica', 6),
  ('no_desea_comprar', 'No desea comprar', 7),
  ('adquirio_otra_propiedad', 'Ya adquirió otra propiedad', 8),
  ('precio_fuera_presupuesto', 'Precio fuera de presupuesto', 9),
  ('ubicacion_no_conveniente', 'Ubicación no conveniente', 10),
  ('condiciones_no_convencen', 'Condiciones/beneficios no le convencen', 11),
  ('evaluacion_crediticia', 'En evaluación crediticia', 12),
  ('falta_sustento_docs', 'Falta sustento / documentos', 13),
  ('observado_banco', 'Observado por banco', 14),
  ('aprobado_banco', 'Aprobado por banco', 15),
  ('requiere_asesoria_financiera', 'Requiere asesoría financiera', 16),
  ('revision_contrato', 'Revisión de contrato', 17),
  ('aprobacion_familiar_pendiente', 'Aprobación familiar pendiente', 18),
  ('negociacion_precio', 'Negociación de precio/descuento', 19),
  ('separacion_pagada', 'Separación pagada', 20),
  ('agendado_firma', 'Agendado para firma de contrato', 21),
  ('firma_contrato', 'Firma de contrato', 22),
  ('visita_confirmada', 'Visita confirmada', 23),
  ('visita_reprogramada', 'Visita reprogramada', 24),
  ('visita_no_asistida', 'Visita no asistida', 25),
  ('cotizacion_enviada', 'Cotización enviada', 26),
  ('evaluacion_familiar', 'En evaluación familiar', 27),
  ('comparando_proyectos', 'Comparando con otros proyectos', 28),
  ('postventa', 'Postventa', 29),
  ('reclamos', 'Reclamos', 30),
  ('administracion_pagos', 'Administración / pagos', 31),
  ('area_comercial_presencial', 'Área comercial presencial', 32);

-- =====================================================
-- FUNCIÓN: CONTAR USO DE TIPIFICACIONES
-- =====================================================
-- Retorna cuántos leads usan una tipificación específica
CREATE OR REPLACE FUNCTION get_tipificacion_uso_count(
  nivel INT,
  codigo_tipif VARCHAR
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uso_count INT;
BEGIN
  -- Validar nivel
  IF nivel NOT IN (1, 2, 3) THEN
    RAISE EXCEPTION 'Nivel debe ser 1, 2 o 3';
  END IF;

  -- Contar leads que usan esta tipificación
  CASE nivel
    WHEN 1 THEN
      SELECT COUNT(*) INTO uso_count
      FROM leads
      WHERE tipificacion_nivel_1 = codigo_tipif;

    WHEN 2 THEN
      SELECT COUNT(*) INTO uso_count
      FROM leads
      WHERE tipificacion_nivel_2 = codigo_tipif;

    WHEN 3 THEN
      SELECT COUNT(*) INTO uso_count
      FROM leads
      WHERE tipificacion_nivel_3 = codigo_tipif;
  END CASE;

  RETURN COALESCE(uso_count, 0);
END;
$$;

COMMENT ON FUNCTION get_tipificacion_uso_count IS
  'Cuenta cuántos leads usan una tipificación específica. Útil para validar antes de eliminar.';

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice para N1 activos (filtro común en SELECT)
CREATE INDEX idx_tipif_n1_activo
  ON tipificaciones_nivel_1(activo)
  WHERE activo = true;

-- Índice para N2 por nivel 1 (JOIN común)
CREATE INDEX idx_tipif_n2_nivel1_codigo
  ON tipificaciones_nivel_2(nivel_1_codigo)
  WHERE activo = true;

-- Índice para N2 activos
CREATE INDEX idx_tipif_n2_activo
  ON tipificaciones_nivel_2(activo)
  WHERE activo = true;

-- Índice para N3 activos
CREATE INDEX idx_tipif_n3_activo
  ON tipificaciones_nivel_3(activo)
  WHERE activo = true;

-- Índices en leads para conteo rápido (si no existen ya)
-- Optimiza la función get_tipificacion_uso_count
DO $$
BEGIN
  -- Índice para tipificacion_nivel_1
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'leads'
    AND indexname = 'idx_leads_tipif_n1'
  ) THEN
    CREATE INDEX idx_leads_tipif_n1 ON leads(tipificacion_nivel_1);
  END IF;

  -- Índice para tipificacion_nivel_2
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'leads'
    AND indexname = 'idx_leads_tipif_n2'
  ) THEN
    CREATE INDEX idx_leads_tipif_n2 ON leads(tipificacion_nivel_2);
  END IF;

  -- Índice para tipificacion_nivel_3
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'leads'
    AND indexname = 'idx_leads_tipif_n3'
  ) THEN
    CREATE INDEX idx_leads_tipif_n3 ON leads(tipificacion_nivel_3);
  END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en las 3 tablas
ALTER TABLE tipificaciones_nivel_1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipificaciones_nivel_2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipificaciones_nivel_3 ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS: NIVEL 1
-- =====================================================

-- SELECT: Todos los usuarios autenticados pueden leer tipificaciones activas
CREATE POLICY "Usuarios autenticados pueden leer N1"
  ON tipificaciones_nivel_1
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: Solo admins (rol = 'admin')
CREATE POLICY "Solo admins pueden insertar N1"
  ON tipificaciones_nivel_1
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden actualizar N1"
  ON tipificaciones_nivel_1
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden eliminar N1"
  ON tipificaciones_nivel_1
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS: NIVEL 2
-- =====================================================

-- SELECT: Todos los usuarios autenticados pueden leer tipificaciones activas
CREATE POLICY "Usuarios autenticados pueden leer N2"
  ON tipificaciones_nivel_2
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: Solo admins (rol = 'admin')
CREATE POLICY "Solo admins pueden insertar N2"
  ON tipificaciones_nivel_2
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden actualizar N2"
  ON tipificaciones_nivel_2
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden eliminar N2"
  ON tipificaciones_nivel_2
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

-- =====================================================
-- POLÍTICAS RLS: NIVEL 3
-- =====================================================

-- SELECT: Todos los usuarios autenticados pueden leer tipificaciones activas
CREATE POLICY "Usuarios autenticados pueden leer N3"
  ON tipificaciones_nivel_3
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: Solo admins (rol = 'admin')
CREATE POLICY "Solo admins pueden insertar N3"
  ON tipificaciones_nivel_3
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden actualizar N3"
  ON tipificaciones_nivel_3
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

CREATE POLICY "Solo admins pueden eliminar N3"
  ON tipificaciones_nivel_3
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

-- =====================================================
-- TRIGGERS: AUTO-UPDATE DE updated_at
-- =====================================================

-- Función genérica para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para N1
CREATE TRIGGER update_tipif_n1_updated_at
  BEFORE UPDATE ON tipificaciones_nivel_1
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para N2
CREATE TRIGGER update_tipif_n2_updated_at
  BEFORE UPDATE ON tipificaciones_nivel_2
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para N3
CREATE TRIGGER update_tipif_n3_updated_at
  BEFORE UPDATE ON tipificaciones_nivel_3
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Mostrar resumen de datos insertados
DO $$
DECLARE
  count_n1 INT;
  count_n2 INT;
  count_n3 INT;
BEGIN
  SELECT COUNT(*) INTO count_n1 FROM tipificaciones_nivel_1;
  SELECT COUNT(*) INTO count_n2 FROM tipificaciones_nivel_2;
  SELECT COUNT(*) INTO count_n3 FROM tipificaciones_nivel_3;

  RAISE NOTICE '===============================================';
  RAISE NOTICE 'MIGRACIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Tipificaciones Nivel 1: % registros', count_n1;
  RAISE NOTICE 'Tipificaciones Nivel 2: % registros', count_n2;
  RAISE NOTICE 'Tipificaciones Nivel 3: % registros', count_n3;
  RAISE NOTICE '===============================================';
END $$;
