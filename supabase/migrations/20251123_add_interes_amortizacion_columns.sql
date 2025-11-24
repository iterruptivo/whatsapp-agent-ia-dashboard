ALTER TABLE pagos_local
ADD COLUMN interes_esperado NUMERIC(12,2) DEFAULT 0,
ADD COLUMN amortizacion_esperada NUMERIC(12,2) DEFAULT 0;

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
    interes_esperado,
    amortizacion_esperada,
    fecha_esperada,
    estado
  ) VALUES (
    NEW.id,
    'separacion',
    NULL,
    NEW.monto_separacion,
    NEW.monto_separacion,
    0,
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
    interes_esperado,
    amortizacion_esperada,
    fecha_esperada,
    estado
  ) VALUES (
    NEW.id,
    'inicial',
    NULL,
    NEW.inicial_restante,
    0,
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
      interes_esperado,
      amortizacion_esperada,
      fecha_esperada,
      estado
    ) VALUES (
      NEW.id,
      'cuota',
      (cuota_record->>'numero')::INTEGER,
      CASE
        WHEN cuota_record->>'cuota' IS NOT NULL THEN (cuota_record->>'cuota')::NUMERIC
        ELSE (cuota_record->>'monto')::NUMERIC
      END,
      COALESCE((cuota_record->>'interes')::NUMERIC, 0),
      CASE
        WHEN cuota_record->>'amortizacion' IS NOT NULL THEN (cuota_record->>'amortizacion')::NUMERIC
        ELSE COALESCE((cuota_record->>'monto')::NUMERIC, (cuota_record->>'cuota')::NUMERIC)
      END,
      (cuota_record->>'fecha')::DATE,
      'pendiente'
    );
    contador := contador + 1;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
