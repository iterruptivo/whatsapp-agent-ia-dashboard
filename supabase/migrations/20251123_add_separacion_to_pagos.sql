ALTER TABLE pagos_local
  DROP CONSTRAINT IF EXISTS pagos_local_tipo_check;

ALTER TABLE pagos_local
  ADD CONSTRAINT pagos_local_tipo_check
  CHECK (tipo IN ('separacion', 'inicial', 'cuota'));

CREATE OR REPLACE FUNCTION crear_pagos_desde_control_pagos()
RETURNS TRIGGER AS $$
DECLARE
  cuota_record JSONB;
  contador INTEGER := 1;
  separacion_pago_id UUID;
BEGIN
  INSERT INTO pagos_local (
    control_pago_id,
    tipo,
    numero_cuota,
    monto_esperado,
    monto_abonado,
    fecha_esperada,
    estado
  ) VALUES (
    NEW.id,
    'separacion',
    NULL,
    NEW.monto_separacion,
    NEW.monto_separacion,
    NEW.created_at::DATE,
    'completado'
  ) RETURNING id INTO separacion_pago_id;

  INSERT INTO abonos_pago (
    pago_id,
    monto,
    fecha_abono,
    metodo_pago,
    notas,
    registrado_por
  ) VALUES (
    separacion_pago_id,
    NEW.monto_separacion,
    NEW.created_at::DATE,
    'Efectivo',
    'Separación pagada al momento de la venta',
    NEW.procesado_por
  );

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
