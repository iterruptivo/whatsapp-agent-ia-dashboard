CREATE TABLE comisiones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  control_pago_id UUID REFERENCES control_pagos(id) ON DELETE CASCADE,
  local_id UUID REFERENCES locales(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  rol_usuario TEXT NOT NULL,
  fase TEXT NOT NULL CHECK (fase IN ('vendedor', 'gestion')),
  porcentaje_comision NUMERIC(5,2) NOT NULL,
  monto_venta NUMERIC(12,2) NOT NULL,
  monto_comision NUMERIC(12,2) NOT NULL,
  estado TEXT DEFAULT 'pendiente_inicial' CHECK (estado IN ('pendiente_inicial', 'disponible', 'pagada')),
  fecha_procesado TIMESTAMP NOT NULL,
  fecha_inicial_completa TIMESTAMP,
  fecha_pago_comision TIMESTAMP,
  pagado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comisiones_usuario ON comisiones(usuario_id);
CREATE INDEX idx_comisiones_control_pago ON comisiones(control_pago_id);
CREATE INDEX idx_comisiones_estado ON comisiones(estado);

CREATE OR REPLACE FUNCTION crear_comisiones_desde_control_pagos()
RETURNS TRIGGER AS $$
DECLARE
  local_record RECORD;
  vendedor_asignado_record RECORD;
  usuario_naranja_record RECORD;
  usuario_rojo_record RECORD;
  usuario_procesado_record RECORD;
  config_proyecto RECORD;
  vendedor_count INTEGER := 0;
  gestion_count INTEGER := 0;
  porcentaje_vendedor NUMERIC;
  porcentaje_gestion NUMERIC;
BEGIN
  SELECT * INTO local_record FROM locales WHERE id = NEW.local_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT * INTO config_proyecto FROM proyectos WHERE id = local_record.proyecto_id;

  IF local_record.vendedor_actual_id IS NOT NULL THEN
    SELECT u.*, u.rol INTO vendedor_asignado_record
    FROM usuarios u WHERE u.id = local_record.vendedor_actual_id;
    IF FOUND THEN vendedor_count := vendedor_count + 1; END IF;
  END IF;

  IF local_record.usuario_paso_naranja_id IS NOT NULL AND
     local_record.usuario_paso_naranja_id IS DISTINCT FROM local_record.vendedor_actual_id THEN
    SELECT u.*, u.rol INTO usuario_naranja_record
    FROM usuarios u WHERE u.id = local_record.usuario_paso_naranja_id;
    IF FOUND THEN vendedor_count := vendedor_count + 1; END IF;
  END IF;

  IF local_record.usuario_paso_rojo_id IS NOT NULL THEN
    SELECT u.*, u.rol INTO usuario_rojo_record
    FROM usuarios u WHERE u.id = local_record.usuario_paso_rojo_id;
    IF FOUND THEN gestion_count := gestion_count + 1; END IF;
  END IF;

  IF NEW.procesado_por IS NOT NULL AND
     NEW.procesado_por IS DISTINCT FROM local_record.usuario_paso_rojo_id THEN
    SELECT u.*, u.rol INTO usuario_procesado_record
    FROM usuarios u WHERE u.id = NEW.procesado_por;
    IF FOUND THEN gestion_count := gestion_count + 1; END IF;
  END IF;

  IF vendedor_asignado_record.id IS NOT NULL THEN
    IF vendedor_asignado_record.rol IN ('vendedor', 'vendedor_caseta') THEN
      porcentaje_vendedor := config_proyecto.comision_vendedor;
    ELSIF vendedor_asignado_record.rol = 'jefe_ventas' THEN
      porcentaje_vendedor := config_proyecto.comision_jefe_ventas;
    ELSIF vendedor_asignado_record.rol = 'admin' THEN
      porcentaje_vendedor := config_proyecto.comision_admin;
    END IF;

    INSERT INTO comisiones (
      control_pago_id, local_id, usuario_id, rol_usuario, fase,
      porcentaje_comision, monto_venta, monto_comision,
      estado, fecha_procesado
    ) VALUES (
      NEW.id, local_record.id, vendedor_asignado_record.id, vendedor_asignado_record.rol, 'vendedor',
      CASE WHEN vendedor_count > 1 THEN porcentaje_vendedor / 2 ELSE porcentaje_vendedor END,
      NEW.monto_venta,
      (NEW.monto_venta * (CASE WHEN vendedor_count > 1 THEN porcentaje_vendedor / 2 ELSE porcentaje_vendedor END)) / 100,
      'pendiente_inicial', NEW.created_at
    );
  END IF;

  IF usuario_naranja_record.id IS NOT NULL THEN
    IF usuario_naranja_record.rol IN ('vendedor', 'vendedor_caseta') THEN
      porcentaje_vendedor := config_proyecto.comision_vendedor;
    ELSIF usuario_naranja_record.rol = 'jefe_ventas' THEN
      porcentaje_vendedor := config_proyecto.comision_jefe_ventas;
    ELSIF usuario_naranja_record.rol = 'admin' THEN
      porcentaje_vendedor := config_proyecto.comision_admin;
    END IF;

    INSERT INTO comisiones (
      control_pago_id, local_id, usuario_id, rol_usuario, fase,
      porcentaje_comision, monto_venta, monto_comision,
      estado, fecha_procesado
    ) VALUES (
      NEW.id, local_record.id, usuario_naranja_record.id, usuario_naranja_record.rol, 'vendedor',
      CASE WHEN vendedor_count > 1 THEN porcentaje_vendedor / 2 ELSE porcentaje_vendedor END,
      NEW.monto_venta,
      (NEW.monto_venta * (CASE WHEN vendedor_count > 1 THEN porcentaje_vendedor / 2 ELSE porcentaje_vendedor END)) / 100,
      'pendiente_inicial', NEW.created_at
    );
  END IF;

  IF usuario_rojo_record.id IS NOT NULL THEN
    IF usuario_rojo_record.rol = 'jefe_ventas' THEN
      porcentaje_gestion := config_proyecto.comision_jefe_ventas;
    ELSIF usuario_rojo_record.rol = 'admin' THEN
      porcentaje_gestion := config_proyecto.comision_admin;
    END IF;

    INSERT INTO comisiones (
      control_pago_id, local_id, usuario_id, rol_usuario, fase,
      porcentaje_comision, monto_venta, monto_comision,
      estado, fecha_procesado
    ) VALUES (
      NEW.id, local_record.id, usuario_rojo_record.id, usuario_rojo_record.rol, 'gestion',
      CASE WHEN gestion_count > 1 THEN porcentaje_gestion / 2 ELSE porcentaje_gestion END,
      NEW.monto_venta,
      (NEW.monto_venta * (CASE WHEN gestion_count > 1 THEN porcentaje_gestion / 2 ELSE porcentaje_gestion END)) / 100,
      'pendiente_inicial', NEW.created_at
    );
  END IF;

  IF usuario_procesado_record.id IS NOT NULL THEN
    IF usuario_procesado_record.rol = 'jefe_ventas' THEN
      porcentaje_gestion := config_proyecto.comision_jefe_ventas;
    ELSIF usuario_procesado_record.rol = 'admin' THEN
      porcentaje_gestion := config_proyecto.comision_admin;
    END IF;

    INSERT INTO comisiones (
      control_pago_id, local_id, usuario_id, rol_usuario, fase,
      porcentaje_comision, monto_venta, monto_comision,
      estado, fecha_procesado
    ) VALUES (
      NEW.id, local_record.id, usuario_procesado_record.id, usuario_procesado_record.rol, 'gestion',
      CASE WHEN gestion_count > 1 THEN porcentaje_gestion / 2 ELSE porcentaje_gestion END,
      NEW.monto_venta,
      (NEW.monto_venta * (CASE WHEN gestion_count > 1 THEN porcentaje_gestion / 2 ELSE porcentaje_gestion END)) / 100,
      'pendiente_inicial', NEW.created_at
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_crear_comisiones
AFTER INSERT ON control_pagos
FOR EACH ROW
EXECUTE FUNCTION crear_comisiones_desde_control_pagos();
