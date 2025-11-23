CREATE OR REPLACE FUNCTION update_monto_abonado_and_estado()
RETURNS TRIGGER AS $$
DECLARE
  pago_record RECORD;
  total_abonado NUMERIC;
BEGIN
  SELECT * INTO pago_record FROM pagos_local WHERE id = NEW.pago_id;

  SELECT COALESCE(SUM(monto), 0) INTO total_abonado
  FROM abonos_pago
  WHERE pago_id = NEW.pago_id;

  UPDATE pagos_local
  SET
    monto_abonado = total_abonado,
    estado = CASE
      WHEN total_abonado >= monto_esperado THEN 'completado'
      WHEN total_abonado > 0 AND total_abonado < monto_esperado THEN 'parcial'
      ELSE 'pendiente'
    END,
    updated_at = NOW()
  WHERE id = NEW.pago_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
