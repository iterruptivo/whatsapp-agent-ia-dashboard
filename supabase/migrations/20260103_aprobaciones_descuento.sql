-- ============================================================================
-- MIGRACION: Sistema de Aprobacion de Descuentos
-- Fase: 5 - PLAN_PROCESOS_FINANZAS_VENTAS_2025.md
-- Fecha: 03 Enero 2025
-- Descripcion: Tablas para configurar y gestionar aprobaciones de descuentos
-- ============================================================================

-- 1. Tabla de configuracion de rangos de aprobacion por proyecto
CREATE TABLE IF NOT EXISTS config_aprobaciones_descuento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  -- Rangos de descuento en formato JSON
  -- Ejemplo: [{"min": 0, "max": 5, "aprobadores": []}, {"min": 5, "max": 10, "aprobadores": ["jefe_ventas"]}]
  rangos JSONB NOT NULL DEFAULT '[
    {"min": 0, "max": 5, "aprobadores": [], "descripcion": "Sin aprobacion requerida"},
    {"min": 5, "max": 10, "aprobadores": ["jefe_ventas"], "descripcion": "Requiere Jefe de Ventas"},
    {"min": 10, "max": 15, "aprobadores": ["jefe_ventas", "admin"], "descripcion": "Requiere Jefe Ventas + Gerencia"},
    {"min": 15, "max": 100, "aprobadores": ["admin"], "descripcion": "Solo Gerencia"}
  ]',
  -- Opciones de comportamiento
  notificar_whatsapp BOOLEAN DEFAULT true,
  bloquear_hasta_aprobacion BOOLEAN DEFAULT true,
  permitir_venta_provisional BOOLEAN DEFAULT false,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id),
  updated_by UUID REFERENCES usuarios(id),
  -- Constraint: un proyecto solo puede tener una configuracion
  CONSTRAINT config_aprobaciones_proyecto_unique UNIQUE (proyecto_id)
);

-- 2. Tabla de solicitudes de aprobacion
CREATE TABLE IF NOT EXISTS aprobaciones_descuento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  control_pago_id UUID REFERENCES control_pagos(id) ON DELETE CASCADE,
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  -- Datos del descuento
  precio_lista DECIMAL(12,2) NOT NULL,
  precio_negociado DECIMAL(12,2) NOT NULL,
  descuento_porcentaje DECIMAL(5,2) NOT NULL,
  descuento_monto DECIMAL(12,2) GENERATED ALWAYS AS (precio_lista - precio_negociado) STORED,
  -- Solicitante
  vendedor_id UUID NOT NULL REFERENCES usuarios(id),
  vendedor_nombre VARCHAR(255),
  vendedor_comentario TEXT,
  -- Estado del proceso
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'cancelado')),
  -- Aprobadores requeridos (roles)
  aprobadores_requeridos TEXT[] NOT NULL DEFAULT '{}',
  -- Historial de aprobaciones (JSON array)
  -- Formato: [{"rol": "jefe_ventas", "usuario_id": "uuid", "usuario_nombre": "John", "fecha": "2025-01-03T...", "decision": "aprobado", "comentario": "Ok"}]
  aprobaciones JSONB DEFAULT '[]',
  -- Fechas
  fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  -- Resolucion final
  resuelto_por UUID REFERENCES usuarios(id),
  comentario_resolucion TEXT,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indices para mejor performance
CREATE INDEX IF NOT EXISTS idx_aprobaciones_proyecto ON aprobaciones_descuento(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_aprobaciones_estado ON aprobaciones_descuento(estado);
CREATE INDEX IF NOT EXISTS idx_aprobaciones_vendedor ON aprobaciones_descuento(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_aprobaciones_local ON aprobaciones_descuento(local_id);
CREATE INDEX IF NOT EXISTS idx_aprobaciones_control_pago ON aprobaciones_descuento(control_pago_id);
CREATE INDEX IF NOT EXISTS idx_aprobaciones_fecha ON aprobaciones_descuento(fecha_solicitud DESC);
CREATE INDEX IF NOT EXISTS idx_config_aprobaciones_proyecto ON config_aprobaciones_descuento(proyecto_id);

-- 4. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_config_aprobaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_aprobaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_config_aprobaciones_updated_at ON config_aprobaciones_descuento;
CREATE TRIGGER trigger_config_aprobaciones_updated_at
  BEFORE UPDATE ON config_aprobaciones_descuento
  FOR EACH ROW
  EXECUTE FUNCTION update_config_aprobaciones_updated_at();

DROP TRIGGER IF EXISTS trigger_aprobaciones_updated_at ON aprobaciones_descuento;
CREATE TRIGGER trigger_aprobaciones_updated_at
  BEFORE UPDATE ON aprobaciones_descuento
  FOR EACH ROW
  EXECUTE FUNCTION update_aprobaciones_updated_at();

-- 5. RLS Policies
ALTER TABLE config_aprobaciones_descuento ENABLE ROW LEVEL SECURITY;
ALTER TABLE aprobaciones_descuento ENABLE ROW LEVEL SECURITY;

-- Policy: Solo admin puede modificar config de aprobaciones
CREATE POLICY config_aprobaciones_admin_all ON config_aprobaciones_descuento
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.rol = 'admin'
    )
  );

-- Policy: Usuarios autenticados pueden leer config
CREATE POLICY config_aprobaciones_read ON config_aprobaciones_descuento
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Usuarios autenticados pueden crear solicitudes
CREATE POLICY aprobaciones_insert ON aprobaciones_descuento
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy: Usuarios autenticados pueden ver aprobaciones
CREATE POLICY aprobaciones_select ON aprobaciones_descuento
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Admin y jefe_ventas pueden actualizar (aprobar/rechazar)
CREATE POLICY aprobaciones_update ON aprobaciones_descuento
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.rol IN ('admin', 'jefe_ventas')
    )
  );

-- 6. Comentarios de documentacion
COMMENT ON TABLE config_aprobaciones_descuento IS 'Configuracion de rangos de descuento y aprobadores por proyecto';
COMMENT ON TABLE aprobaciones_descuento IS 'Solicitudes de aprobacion de descuentos pendientes, aprobadas o rechazadas';
COMMENT ON COLUMN config_aprobaciones_descuento.rangos IS 'Array JSON de rangos: [{min, max, aprobadores[], descripcion}]';
COMMENT ON COLUMN aprobaciones_descuento.aprobaciones IS 'Historial de decisiones: [{rol, usuario_id, usuario_nombre, fecha, decision, comentario}]';
COMMENT ON COLUMN aprobaciones_descuento.estado IS 'pendiente | aprobado | rechazado | cancelado';

-- 7. Datos iniciales para config_bancos existente (insertar config default para proyectos existentes)
-- Esto se puede ejecutar manualmente o adaptar segun necesidades
-- INSERT INTO config_aprobaciones_descuento (proyecto_id)
-- SELECT id FROM proyectos WHERE id NOT IN (SELECT proyecto_id FROM config_aprobaciones_descuento);

-- ============================================================================
-- FIN DE MIGRACION
-- ============================================================================
