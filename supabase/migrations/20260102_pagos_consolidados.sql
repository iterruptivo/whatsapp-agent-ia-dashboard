-- ============================================================================
-- MIGRACIÓN: Pagos Consolidados (1 voucher = N locales)
-- FASE 4 - Plan Procesos Finanzas-Ventas 2025
-- ============================================================================
-- Permite registrar un pago único que se distribuye entre múltiples locales
-- Ejemplo: Cliente paga $5,000 USD con un voucher para 3 locales diferentes
-- ============================================================================

-- Tabla principal de pagos consolidados
CREATE TABLE IF NOT EXISTS pagos_consolidados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id),
  -- Identificador del cliente (puede ser lead_id o referencia manual)
  cliente_nombre VARCHAR(255),
  cliente_dni VARCHAR(20),
  cliente_telefono VARCHAR(20),
  -- Datos del pago
  monto_total DECIMAL(12,2) NOT NULL,
  moneda VARCHAR(3) DEFAULT 'USD' CHECK (moneda IN ('USD', 'PEN')),
  fecha_pago DATE NOT NULL,
  -- Comprobante
  comprobante_url TEXT,
  comprobante_ocr_data JSONB, -- Datos extraídos por OCR
  numero_operacion VARCHAR(50),
  banco_origen VARCHAR(100),
  metodo_pago VARCHAR(50) DEFAULT 'transferencia',
  -- Estado y verificación
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'verificado', 'rechazado')),
  verificado_por UUID REFERENCES usuarios(id),
  fecha_verificacion TIMESTAMP,
  notas TEXT,
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES usuarios(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de distribución (cómo se reparte el pago consolidado)
CREATE TABLE IF NOT EXISTS pagos_consolidados_distribucion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_consolidado_id UUID NOT NULL REFERENCES pagos_consolidados(id) ON DELETE CASCADE,
  -- A qué local/pago va asignado
  control_pago_id UUID NOT NULL REFERENCES control_pagos(id),
  pago_id UUID REFERENCES pagos_local(id), -- NULL si es separación
  -- Monto asignado a este local
  monto_asignado DECIMAL(12,2) NOT NULL CHECK (monto_asignado > 0),
  -- Concepto del pago
  concepto VARCHAR(50) NOT NULL CHECK (concepto IN ('separacion', 'inicial', 'cuota', 'abono_general')),
  numero_cuota INTEGER, -- Solo si concepto = 'cuota'
  -- Referencia al abono creado (se llena después de procesar)
  abono_id UUID REFERENCES abonos_pago(id),
  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_pagos_consolidados_proyecto_id ON pagos_consolidados(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_pagos_consolidados_estado ON pagos_consolidados(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_consolidados_fecha_pago ON pagos_consolidados(fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_pagos_consolidados_cliente_dni ON pagos_consolidados(cliente_dni);
CREATE INDEX IF NOT EXISTS idx_pagos_consolidados_numero_operacion ON pagos_consolidados(numero_operacion);

CREATE INDEX IF NOT EXISTS idx_pcd_pago_consolidado_id ON pagos_consolidados_distribucion(pago_consolidado_id);
CREATE INDEX IF NOT EXISTS idx_pcd_control_pago_id ON pagos_consolidados_distribucion(control_pago_id);
CREATE INDEX IF NOT EXISTS idx_pcd_pago_id ON pagos_consolidados_distribucion(pago_id);

-- Habilitar RLS
ALTER TABLE pagos_consolidados ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_consolidados_distribucion ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pagos_consolidados
DROP POLICY IF EXISTS pagos_consolidados_select_auth ON pagos_consolidados;
CREATE POLICY pagos_consolidados_select_auth
  ON pagos_consolidados FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS pagos_consolidados_insert_auth ON pagos_consolidados;
CREATE POLICY pagos_consolidados_insert_auth
  ON pagos_consolidados FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS pagos_consolidados_update_auth ON pagos_consolidados;
CREATE POLICY pagos_consolidados_update_auth
  ON pagos_consolidados FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS pagos_consolidados_delete_auth ON pagos_consolidados;
CREATE POLICY pagos_consolidados_delete_auth
  ON pagos_consolidados FOR DELETE
  TO authenticated
  USING (estado = 'pendiente'); -- Solo se puede eliminar si está pendiente

-- Políticas RLS para pagos_consolidados_distribucion
DROP POLICY IF EXISTS pcd_select_auth ON pagos_consolidados_distribucion;
CREATE POLICY pcd_select_auth
  ON pagos_consolidados_distribucion FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS pcd_insert_auth ON pagos_consolidados_distribucion;
CREATE POLICY pcd_insert_auth
  ON pagos_consolidados_distribucion FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS pcd_update_auth ON pagos_consolidados_distribucion;
CREATE POLICY pcd_update_auth
  ON pagos_consolidados_distribucion FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS pcd_delete_auth ON pagos_consolidados_distribucion;
CREATE POLICY pcd_delete_auth
  ON pagos_consolidados_distribucion FOR DELETE
  TO authenticated
  USING (true);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_pagos_consolidados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pagos_consolidados_updated_at ON pagos_consolidados;
CREATE TRIGGER trigger_update_pagos_consolidados_updated_at
  BEFORE UPDATE ON pagos_consolidados
  FOR EACH ROW
  EXECUTE FUNCTION update_pagos_consolidados_updated_at();

-- Función para validar que la distribución suma el monto total
CREATE OR REPLACE FUNCTION validar_distribucion_pago_consolidado()
RETURNS TRIGGER AS $$
DECLARE
  total_distribuido DECIMAL(12,2);
  monto_total_pago DECIMAL(12,2);
BEGIN
  -- Obtener el monto total del pago consolidado
  SELECT monto_total INTO monto_total_pago
  FROM pagos_consolidados
  WHERE id = NEW.pago_consolidado_id;

  -- Calcular el total distribuido
  SELECT COALESCE(SUM(monto_asignado), 0) INTO total_distribuido
  FROM pagos_consolidados_distribucion
  WHERE pago_consolidado_id = NEW.pago_consolidado_id;

  -- Agregar el nuevo monto
  total_distribuido := total_distribuido + NEW.monto_asignado;

  -- Validar que no exceda el monto total
  IF total_distribuido > monto_total_pago THEN
    RAISE EXCEPTION 'El total distribuido ($%) excede el monto del pago ($%)',
      total_distribuido, monto_total_pago;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validar_distribucion ON pagos_consolidados_distribucion;
CREATE TRIGGER trigger_validar_distribucion
  BEFORE INSERT ON pagos_consolidados_distribucion
  FOR EACH ROW
  EXECUTE FUNCTION validar_distribucion_pago_consolidado();

-- Comentarios para documentación
COMMENT ON TABLE pagos_consolidados IS 'Pagos consolidados: 1 voucher puede distribuirse entre N locales';
COMMENT ON TABLE pagos_consolidados_distribucion IS 'Distribución de un pago consolidado entre diferentes locales';
COMMENT ON COLUMN pagos_consolidados.comprobante_ocr_data IS 'Datos extraídos por OCR del comprobante (monto, banco, fecha, etc)';
COMMENT ON COLUMN pagos_consolidados_distribucion.concepto IS 'Tipo de pago: separacion, inicial, cuota, abono_general';
