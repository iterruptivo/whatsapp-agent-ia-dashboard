CREATE OR REPLACE FUNCTION actualizar_comisiones_inicial_verificado()
RETURNS TRIGGER AS $$
DECLARE
  pago_inicial RECORD;
  abono_verificado BOOLEAN;
BEGIN
  SELECT pl.* INTO pago_inicial
  FROM pagos_local pl
  WHERE pl.id = NEW.pago_id;

  IF pago_inicial.tipo = 'inicial' AND pago_inicial.estado = 'completado' THEN
    SELECT EXISTS(
      SELECT 1 FROM abonos_pago ap
      WHERE ap.pago_id = pago_inicial.id
        AND ap.verificado_finanzas = true
    ) INTO abono_verificado;

    IF abono_verificado THEN
      UPDATE comisiones
      SET estado = 'disponible', fecha_disponible = NOW()
      WHERE control_pago_id = pago_inicial.control_pago_id
        AND estado = 'pendiente_inicial';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_comisiones_inicial_pagado ON pagos_local;
DROP TRIGGER IF EXISTS trigger_comisiones_inicial_verificado ON abonos_pago;

CREATE TRIGGER trigger_comisiones_inicial_verificado
  AFTER UPDATE ON abonos_pago
  FOR EACH ROW
  WHEN (NEW.verificado_finanzas = true AND (OLD.verificado_finanzas IS NULL OR OLD.verificado_finanzas = false))
  EXECUTE FUNCTION actualizar_comisiones_inicial_verificado();
