-- ============================================================================
-- MIGRATION: Control de Pagos - Sistema Post-Venta
-- ============================================================================
-- Fecha: 22 Noviembre 2025
-- Sesión: 54
-- Descripción: Crear tabla control_pagos y modificar tabla locales
-- ============================================================================

-- 1. CREAR TABLA control_pagos
-- ============================================================================

CREATE TABLE IF NOT EXISTS control_pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relación con local
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,

  -- Snapshot de datos del local (al momento de procesar)
  codigo_local VARCHAR(50) NOT NULL,
  proyecto_id UUID NOT NULL REFERENCES proyectos(id),
  proyecto_nombre VARCHAR(255),
  metraje NUMERIC(10,2),

  -- Datos del cliente
  lead_id UUID REFERENCES leads(id),
  lead_nombre VARCHAR(255),
  lead_telefono VARCHAR(50),

  -- Montos
  monto_venta NUMERIC(12,2) NOT NULL,
  monto_separacion NUMERIC(12,2) NOT NULL,
  monto_inicial NUMERIC(12,2) NOT NULL,
  inicial_restante NUMERIC(12,2) NOT NULL,
  monto_restante NUMERIC(12,2) NOT NULL,

  -- Configuración financiamiento
  con_financiamiento BOOLEAN NOT NULL DEFAULT true,
  porcentaje_inicial NUMERIC(5,2),
  numero_cuotas INTEGER NOT NULL,
  tea NUMERIC(5,2), -- Solo si con_financiamiento = true
  fecha_primer_pago DATE NOT NULL,

  -- Calendario de cuotas (JSON completo)
  calendario_cuotas JSONB NOT NULL,

  -- Estado y metadata
  estado VARCHAR(20) NOT NULL DEFAULT 'activo', -- 'activo', 'completado', 'cancelado'
  procesado_por UUID NOT NULL REFERENCES usuarios(id),
  vendedor_id UUID REFERENCES usuarios(id),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_control_pagos_local_id ON control_pagos(local_id);
CREATE INDEX IF NOT EXISTS idx_control_pagos_proyecto_id ON control_pagos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_control_pagos_estado ON control_pagos(estado);
CREATE INDEX IF NOT EXISTS idx_control_pagos_vendedor_id ON control_pagos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_control_pagos_created_at ON control_pagos(created_at DESC);

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

ALTER TABLE control_pagos ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios autenticados pueden ver control_pagos
CREATE POLICY "Usuarios autenticados pueden ver control_pagos"
  ON control_pagos FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Solo admin y jefe_ventas pueden INSERT
CREATE POLICY "Admin y jefe_ventas pueden crear control_pagos"
  ON control_pagos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('admin', 'jefe_ventas')
    )
  );

-- Policy: Solo admin y jefe_ventas pueden UPDATE
CREATE POLICY "Admin y jefe_ventas pueden actualizar control_pagos"
  ON control_pagos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('admin', 'jefe_ventas')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('admin', 'jefe_ventas')
    )
  );

-- ============================================================================
-- 4. TRIGGER PARA updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_control_pagos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_control_pagos_updated_at
  BEFORE UPDATE ON control_pagos
  FOR EACH ROW
  EXECUTE FUNCTION update_control_pagos_updated_at();

-- ============================================================================
-- 5. MODIFICAR TABLA locales - Agregar campo en_control_pagos
-- ============================================================================

ALTER TABLE locales
ADD COLUMN IF NOT EXISTS en_control_pagos BOOLEAN DEFAULT false;

-- Índice para queries por en_control_pagos
CREATE INDEX IF NOT EXISTS idx_locales_en_control_pagos
ON locales(en_control_pagos);

-- ============================================================================
-- 6. COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE control_pagos IS 'Sistema de control y seguimiento de pagos de locales vendidos (post-venta)';
COMMENT ON COLUMN control_pagos.calendario_cuotas IS 'Array JSON con calendario completo de cuotas (fechas, montos, intereses, amortizaciones)';
COMMENT ON COLUMN control_pagos.estado IS 'Estado del control de pagos: activo, completado, cancelado';
COMMENT ON COLUMN locales.en_control_pagos IS 'Flag que indica si el local ya fue procesado para control de pagos (bloquea acciones en /locales)';

-- ============================================================================
-- MIGRATION COMPLETADA
-- ============================================================================
-- Próximos pasos:
-- 1. Ejecutar esta migration en Supabase Dashboard
-- 2. Crear server actions en lib/actions-control-pagos.ts
-- 3. Modificar frontend para integrar con nueva tabla
-- ============================================================================
