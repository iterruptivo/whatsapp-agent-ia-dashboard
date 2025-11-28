-- ============================================================================
-- MIGRATION: Trigger para actualizar comisiones a 'disponible'
-- ============================================================================
-- Fecha: 28 Noviembre 2025
-- Sesión: 58
-- Descripción: Cuando pago inicial se completa, cambiar comisiones a disponible
-- ============================================================================

CREATE OR REPLACE FUNCTION actualizar_comisiones_inicial_pagado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'inicial' AND NEW.estado = 'completado' AND (OLD.estado IS NULL OR OLD.estado != 'completado') THEN
    UPDATE comisiones
    SET estado = 'disponible'
    WHERE control_pago_id = NEW.control_pago_id
      AND estado = 'pendiente_inicial';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_comisiones_inicial_pagado ON pagos_local;

CREATE TRIGGER trigger_comisiones_inicial_pagado
  AFTER UPDATE ON pagos_local
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_comisiones_inicial_pagado();
