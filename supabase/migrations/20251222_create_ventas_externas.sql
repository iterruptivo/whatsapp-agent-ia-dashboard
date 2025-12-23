-- ============================================================================
-- MIGRATION: Create ventas_externas table
-- Purpose: Store sales from call center for Victoria (AI) attribution
-- Session: 74 - Sistema de Atribución de Ventas IA
-- Date: 2025-12-22
-- ============================================================================

-- Drop table if exists (for development)
DROP TABLE IF EXISTS ventas_externas CASCADE;

-- ============================================================================
-- TABLE: ventas_externas
-- ============================================================================
CREATE TABLE ventas_externas (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sale data (from Excel)
  telefono VARCHAR(20) NOT NULL,              -- Cleaned format: 51 + 9 digits
  telefono_original VARCHAR(100),             -- Original from Excel (for debug)
  nombre_cliente VARCHAR(255),                -- Customer name (optional)
  mes_venta VARCHAR(20) NOT NULL,             -- Format: "2025-01"
  fecha_venta DATE,                           -- Exact date if available
  monto_venta DECIMAL(12, 2),                 -- Amount in USD (optional)
  proyecto_nombre VARCHAR(255),               -- Project name (free text from Excel)
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL, -- FK if mappable
  observaciones TEXT,                         -- Additional notes from Excel

  -- Matching with Victoria leads
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,  -- Linked lead (if match exists)
  lead_utm VARCHAR(100),                      -- UTM of linked lead (cached for reports)
  lead_nombre VARCHAR(255),                   -- Name of linked lead (cached)
  lead_fecha_creacion TIMESTAMPTZ,            -- When lead was created (cached)
  match_type VARCHAR(20) NOT NULL DEFAULT 'sin_lead',  -- 'victoria', 'otro_utm', 'sin_lead'
  match_timestamp TIMESTAMPTZ,                -- When match was made

  -- Import metadata
  importado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  importado_por_nombre VARCHAR(255),          -- Snapshot of user name
  archivo_origen VARCHAR(255),                -- Excel file name
  fila_origen INTEGER,                        -- Row in Excel (for traceability)

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- UNIQUE CONSTRAINT: One phone = one sale (prevents duplicates)
-- ============================================================================
CREATE UNIQUE INDEX idx_ventas_externas_telefono_unique ON ventas_externas(telefono);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX idx_ventas_externas_mes_venta ON ventas_externas(mes_venta);
CREATE INDEX idx_ventas_externas_match_type ON ventas_externas(match_type);
CREATE INDEX idx_ventas_externas_lead_id ON ventas_externas(lead_id);
CREATE INDEX idx_ventas_externas_proyecto_id ON ventas_externas(proyecto_id);
CREATE INDEX idx_ventas_externas_created_at ON ventas_externas(created_at DESC);
CREATE INDEX idx_ventas_externas_telefono ON ventas_externas(telefono);

-- Composite index for common query: filter by match_type and mes_venta
CREATE INDEX idx_ventas_externas_match_mes ON ventas_externas(match_type, mes_venta);

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_ventas_externas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ventas_externas_updated_at
  BEFORE UPDATE ON ventas_externas
  FOR EACH ROW
  EXECUTE FUNCTION update_ventas_externas_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE ventas_externas ENABLE ROW LEVEL SECURITY;

-- Policy: Admin and jefe_ventas can SELECT
CREATE POLICY "Admin y jefe_ventas pueden ver ventas_externas" ON ventas_externas
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol IN ('admin', 'jefe_ventas', 'marketing')
  )
);

-- Policy: Admin and jefe_ventas can INSERT
CREATE POLICY "Admin y jefe_ventas pueden insertar ventas_externas" ON ventas_externas
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol IN ('admin', 'jefe_ventas')
  )
);

-- Policy: Admin can UPDATE (for corrections)
CREATE POLICY "Admin puede actualizar ventas_externas" ON ventas_externas
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- Policy: Admin can DELETE (for cleanup)
CREATE POLICY "Admin puede eliminar ventas_externas" ON ventas_externas
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE ventas_externas IS 'Ventas importadas del call center para atribucion a Victoria (IA). Session 74.';
COMMENT ON COLUMN ventas_externas.telefono IS 'Telefono limpio: 51 + 9 digitos (ej: 51987654321)';
COMMENT ON COLUMN ventas_externas.match_type IS 'victoria = lead con UTM victoria, otro_utm = lead con otro UTM, sin_lead = no existe lead';
COMMENT ON COLUMN ventas_externas.mes_venta IS 'Formato estandar: YYYY-MM (ej: 2025-01)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'ventas_externas';
