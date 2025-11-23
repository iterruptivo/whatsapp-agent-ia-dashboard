CREATE TABLE IF NOT EXISTS pagos_local (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  control_pago_id UUID NOT NULL REFERENCES control_pagos(id) ON DELETE CASCADE,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('inicial', 'cuota')),
  numero_cuota INTEGER,
  monto_esperado NUMERIC(12,2) NOT NULL,
  monto_abonado NUMERIC(12,2) DEFAULT 0 NOT NULL,
  fecha_esperada DATE NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'parcial', 'completado', 'vencido')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS abonos_pago (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pago_id UUID NOT NULL REFERENCES pagos_local(id) ON DELETE CASCADE,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  fecha_abono DATE NOT NULL,
  metodo_pago VARCHAR(50) NOT NULL,
  comprobante_url VARCHAR(500),
  notas TEXT,
  registrado_por UUID NOT NULL REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_local_control_pago_id ON pagos_local(control_pago_id);
CREATE INDEX IF NOT EXISTS idx_pagos_local_tipo ON pagos_local(tipo);
CREATE INDEX IF NOT EXISTS idx_pagos_local_estado ON pagos_local(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_local_fecha_esperada ON pagos_local(fecha_esperada);
CREATE INDEX IF NOT EXISTS idx_abonos_pago_pago_id ON abonos_pago(pago_id);
CREATE INDEX IF NOT EXISTS idx_abonos_pago_fecha_abono ON abonos_pago(fecha_abono DESC);

ALTER TABLE pagos_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonos_pago ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pagos_local_select_authenticated ON pagos_local;
CREATE POLICY pagos_local_select_authenticated
  ON pagos_local FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS pagos_local_insert_authenticated ON pagos_local;
CREATE POLICY pagos_local_insert_authenticated
  ON pagos_local FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS pagos_local_update_authenticated ON pagos_local;
CREATE POLICY pagos_local_update_authenticated
  ON pagos_local FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS abonos_pago_select_authenticated ON abonos_pago;
CREATE POLICY abonos_pago_select_authenticated
  ON abonos_pago FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS abonos_pago_insert_authenticated ON abonos_pago;
CREATE POLICY abonos_pago_insert_authenticated
  ON abonos_pago FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_pagos_local_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pagos_local_updated_at ON pagos_local;
CREATE TRIGGER trigger_update_pagos_local_updated_at
  BEFORE UPDATE ON pagos_local
  FOR EACH ROW
  EXECUTE FUNCTION update_pagos_local_updated_at();

CREATE OR REPLACE FUNCTION update_monto_abonado_and_estado()
RETURNS TRIGGER AS $$
DECLARE
  total_abonado NUMERIC(12,2);
  pago_record RECORD;
BEGIN
  SELECT SUM(monto) INTO total_abonado
  FROM abonos_pago
  WHERE pago_id = NEW.pago_id;

  SELECT * INTO pago_record
  FROM pagos_local
  WHERE id = NEW.pago_id;

  UPDATE pagos_local
  SET
    monto_abonado = COALESCE(total_abonado, 0),
    estado = CASE
      WHEN COALESCE(total_abonado, 0) = 0 THEN 'pendiente'
      WHEN COALESCE(total_abonado, 0) < pago_record.monto_esperado THEN 'parcial'
      ELSE 'completado'
    END
  WHERE id = NEW.pago_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_monto_abonado ON abonos_pago;
CREATE TRIGGER trigger_update_monto_abonado
  AFTER INSERT ON abonos_pago
  FOR EACH ROW
  EXECUTE FUNCTION update_monto_abonado_and_estado();

CREATE OR REPLACE FUNCTION crear_pagos_desde_control_pagos()
RETURNS TRIGGER AS $$
DECLARE
  cuota_record JSONB;
  contador INTEGER := 1;
BEGIN
  INSERT INTO pagos_local (
    control_pago_id,
    tipo,
    numero_cuota,
    monto_esperado,
    fecha_esperada,
    estado
  ) VALUES (
    NEW.id,
    'inicial',
    NULL,
    NEW.inicial_restante,
    NEW.fecha_primer_pago - INTERVAL '30 days',
    'pendiente'
  );

  FOR cuota_record IN SELECT * FROM jsonb_array_elements(NEW.calendario_cuotas)
  LOOP
    INSERT INTO pagos_local (
      control_pago_id,
      tipo,
      numero_cuota,
      monto_esperado,
      fecha_esperada,
      estado
    ) VALUES (
      NEW.id,
      'cuota',
      (cuota_record->>'numero')::INTEGER,
      (cuota_record->>'cuota')::NUMERIC,
      (cuota_record->>'fecha')::DATE,
      'pendiente'
    );
    contador := contador + 1;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_crear_pagos_auto ON control_pagos;
CREATE TRIGGER trigger_crear_pagos_auto
  AFTER INSERT ON control_pagos
  FOR EACH ROW
  EXECUTE FUNCTION crear_pagos_desde_control_pagos();
