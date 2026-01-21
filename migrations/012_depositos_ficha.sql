-- =============================================================================
-- Migración: Crear tabla depositos_ficha
-- Fecha: 2026-01-21
-- Descripción: Tabla normalizada para depósitos/vouchers de fichas de inscripción
--              Reemplaza el campo JSONB comprobante_deposito_ocr
--              Permite verificación por Finanzas y vinculación con Control de Pagos
-- =============================================================================

-- Crear tabla depositos_ficha
CREATE TABLE IF NOT EXISTS depositos_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vinculación principal
  ficha_id UUID REFERENCES clientes_ficha(id) ON DELETE CASCADE,
  local_id UUID NOT NULL,
  proyecto_id UUID NOT NULL,

  -- Índice dentro del array JSONB original (para migración)
  indice_original INTEGER,

  -- Datos del depósito (extraídos por OCR)
  monto NUMERIC(15,2),
  moneda VARCHAR(3) DEFAULT 'USD',
  fecha_comprobante DATE,
  hora_comprobante TIME,
  banco VARCHAR(100),
  numero_operacion VARCHAR(100),
  depositante VARCHAR(200),
  tipo_operacion VARCHAR(100),
  confianza INTEGER DEFAULT 0,

  -- Imagen del comprobante
  imagen_url TEXT,

  -- Tracking de subida
  uploaded_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES usuarios(id),

  -- Datos adicionales OCR (raw para referencia)
  ocr_raw JSONB,

  -- ============================================
  -- VERIFICACIÓN POR FINANZAS
  -- ============================================
  verificado_finanzas BOOLEAN DEFAULT false,
  verificado_finanzas_por UUID REFERENCES usuarios(id),
  verificado_finanzas_at TIMESTAMPTZ,
  verificado_finanzas_nombre VARCHAR(200), -- Snapshot del nombre

  -- Notas de verificación (opcional)
  notas_verificacion TEXT,

  -- ============================================
  -- VINCULO CON CONTROL DE PAGOS
  -- ============================================
  -- Cuando el local entra a control de pagos, este depósito
  -- se puede vincular con un abono específico
  abono_pago_id UUID REFERENCES abonos_pago(id),
  vinculado_at TIMESTAMPTZ,
  vinculado_por UUID REFERENCES usuarios(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================================================

-- Índice principal por ficha (para cargar depósitos de una ficha)
CREATE INDEX IF NOT EXISTS idx_depositos_ficha_ficha_id
  ON depositos_ficha(ficha_id);

-- Índice por local (para reportes)
CREATE INDEX IF NOT EXISTS idx_depositos_ficha_local_id
  ON depositos_ficha(local_id);

-- Índice por proyecto (para filtrado en Reporte Diario)
CREATE INDEX IF NOT EXISTS idx_depositos_ficha_proyecto_id
  ON depositos_ficha(proyecto_id);

-- Índice por fecha de comprobante (para ordenamiento)
CREATE INDEX IF NOT EXISTS idx_depositos_ficha_fecha
  ON depositos_ficha(fecha_comprobante DESC, hora_comprobante DESC);

-- Índice por verificación pendiente (para Finanzas)
CREATE INDEX IF NOT EXISTS idx_depositos_ficha_pendientes
  ON depositos_ficha(verificado_finanzas)
  WHERE verificado_finanzas = false;

-- Índice por uploaded_at (para Reporte Diario)
CREATE INDEX IF NOT EXISTS idx_depositos_ficha_uploaded
  ON depositos_ficha(uploaded_at DESC);

-- Índice compuesto para Reporte Diario (proyecto + rango de fechas)
CREATE INDEX IF NOT EXISTS idx_depositos_ficha_reporte
  ON depositos_ficha(proyecto_id, fecha_comprobante DESC, uploaded_at DESC);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Habilitar RLS
ALTER TABLE depositos_ficha ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios autenticados pueden ver todos (filtrado por proyecto en app)
CREATE POLICY "depositos_ficha_select_auth" ON depositos_ficha
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Admin, jefe_ventas, vendedor, caseta pueden insertar
CREATE POLICY "depositos_ficha_insert_ventas" ON depositos_ficha
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.rol IN ('admin', 'superadmin', 'jefe_ventas', 'vendedor', 'caseta')
    )
  );

-- Policy: Admin, jefe_ventas, finanzas pueden actualizar
CREATE POLICY "depositos_ficha_update" ON depositos_ficha
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.rol IN ('admin', 'superadmin', 'jefe_ventas', 'finanzas')
    )
  );

-- Policy: Solo admin puede eliminar
CREATE POLICY "depositos_ficha_delete_admin" ON depositos_ficha
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.rol IN ('admin', 'superadmin')
    )
  );

-- =============================================================================
-- TRIGGER: Actualizar updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_depositos_ficha_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_depositos_ficha_updated_at
  BEFORE UPDATE ON depositos_ficha
  FOR EACH ROW
  EXECUTE FUNCTION update_depositos_ficha_updated_at();

-- =============================================================================
-- COMENTARIOS
-- =============================================================================

COMMENT ON TABLE depositos_ficha IS
'Depósitos/vouchers subidos en fichas de inscripción. Tabla normalizada que reemplaza comprobante_deposito_ocr JSONB.';

COMMENT ON COLUMN depositos_ficha.indice_original IS
'Índice dentro del array JSONB original (para migración y compatibilidad)';

COMMENT ON COLUMN depositos_ficha.verificado_finanzas IS
'Si Finanzas ha verificado este depósito. Proceso irreversible.';

COMMENT ON COLUMN depositos_ficha.abono_pago_id IS
'Cuando el local entra a Control de Pagos, este depósito se vincula con un abono específico.';
