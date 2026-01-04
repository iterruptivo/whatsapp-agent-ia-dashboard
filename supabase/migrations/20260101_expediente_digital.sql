-- ============================================================================
-- MIGRACION: Sistema de Expediente Digital
-- Fase: 6 - PLAN_PROCESOS_FINANZAS_VENTAS_2025.md
-- Fecha: 01 Enero 2026
-- Descripcion: Timeline de documentos y eventos del expediente por local
-- ============================================================================

-- 1. Tabla de eventos del expediente (timeline)
CREATE TABLE IF NOT EXISTS expediente_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_pago_id UUID NOT NULL REFERENCES control_pagos(id) ON DELETE CASCADE,
  -- Tipo de evento
  tipo_evento VARCHAR(50) NOT NULL,
  -- 'ficha_creada', 'documento_subido', 'pago_registrado', 'pago_verificado',
  -- 'constancia_generada', 'contrato_generado', 'expediente_completo'
  descripcion TEXT,
  -- Documento asociado
  documento_tipo VARCHAR(50),
  -- 'dni_titular', 'dni_conyuge', 'voucher', 'boleta', 'constancia', 'contrato', 'ficha'
  documento_url TEXT,
  documento_nombre VARCHAR(255),
  -- Metadata adicional (JSON)
  metadata JSONB DEFAULT '{}',
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

-- 2. Indices para mejor performance
CREATE INDEX IF NOT EXISTS idx_expediente_control_pago ON expediente_eventos(control_pago_id);
CREATE INDEX IF NOT EXISTS idx_expediente_tipo ON expediente_eventos(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_expediente_fecha ON expediente_eventos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expediente_documento_tipo ON expediente_eventos(documento_tipo);

-- 3. Agregar columnas a control_pagos si no existen
DO $$
BEGIN
  -- expediente_completo
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'control_pagos' AND column_name = 'expediente_completo'
  ) THEN
    ALTER TABLE control_pagos ADD COLUMN expediente_completo BOOLEAN DEFAULT false;
  END IF;

  -- checklist_documentos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'control_pagos' AND column_name = 'checklist_documentos'
  ) THEN
    ALTER TABLE control_pagos ADD COLUMN checklist_documentos JSONB DEFAULT '{
      "dni_titular": false,
      "dni_conyuge": false,
      "voucher_separacion": false,
      "constancia_separacion": false,
      "voucher_inicial": false,
      "contrato": false,
      "constancia_cancelacion": false
    }';
  END IF;
END $$;

-- 4. RLS Policies
ALTER TABLE expediente_eventos ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios autenticados pueden ver eventos
CREATE POLICY expediente_eventos_select ON expediente_eventos
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Policy: Usuarios autenticados pueden insertar eventos
CREATE POLICY expediente_eventos_insert ON expediente_eventos
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Policy: Solo admin puede eliminar eventos
CREATE POLICY expediente_eventos_delete ON expediente_eventos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      WHERE u.id = auth.uid()
      AND u.rol = 'admin'
    )
  );

-- 5. Funcion para registrar evento automaticamente
CREATE OR REPLACE FUNCTION registrar_evento_expediente(
  p_control_pago_id UUID,
  p_tipo_evento VARCHAR(50),
  p_descripcion TEXT DEFAULT NULL,
  p_documento_tipo VARCHAR(50) DEFAULT NULL,
  p_documento_url TEXT DEFAULT NULL,
  p_documento_nombre VARCHAR(255) DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_usuario_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_evento_id UUID;
BEGIN
  INSERT INTO expediente_eventos (
    control_pago_id,
    tipo_evento,
    descripcion,
    documento_tipo,
    documento_url,
    documento_nombre,
    metadata,
    created_by
  ) VALUES (
    p_control_pago_id,
    p_tipo_evento,
    p_descripcion,
    p_documento_tipo,
    p_documento_url,
    p_documento_nombre,
    p_metadata,
    p_usuario_id
  ) RETURNING id INTO v_evento_id;

  RETURN v_evento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Funcion para verificar si expediente esta completo
CREATE OR REPLACE FUNCTION verificar_expediente_completo(p_control_pago_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_checklist JSONB;
  v_completo BOOLEAN;
BEGIN
  SELECT checklist_documentos INTO v_checklist
  FROM control_pagos
  WHERE id = p_control_pago_id;

  -- Verificar documentos minimos requeridos
  v_completo := (
    COALESCE((v_checklist->>'dni_titular')::boolean, false) AND
    COALESCE((v_checklist->>'voucher_separacion')::boolean, false) AND
    COALESCE((v_checklist->>'constancia_separacion')::boolean, false)
  );

  -- Actualizar estado
  UPDATE control_pagos
  SET expediente_completo = v_completo
  WHERE id = p_control_pago_id;

  RETURN v_completo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Comentarios de documentacion
COMMENT ON TABLE expediente_eventos IS 'Timeline de eventos y documentos del expediente por local/control_pago';
COMMENT ON COLUMN expediente_eventos.tipo_evento IS 'ficha_creada, documento_subido, pago_registrado, pago_verificado, constancia_generada, contrato_generado, expediente_completo';
COMMENT ON COLUMN expediente_eventos.documento_tipo IS 'dni_titular, dni_conyuge, voucher, boleta, constancia, contrato, ficha';
COMMENT ON COLUMN control_pagos.expediente_completo IS 'Indica si el expediente tiene todos los documentos requeridos';
COMMENT ON COLUMN control_pagos.checklist_documentos IS 'JSON con estado de cada documento requerido';

-- ============================================================================
-- FIN DE MIGRACION
-- ============================================================================
