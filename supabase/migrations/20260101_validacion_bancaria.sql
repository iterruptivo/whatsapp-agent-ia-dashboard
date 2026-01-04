-- ============================================================================
-- MIGRACION: Validacion Bancaria
-- ============================================================================
-- Tablas para importar estados de cuenta bancarios y hacer matching
-- con los abonos registrados en el sistema
-- ============================================================================

-- 1. Configuracion de mapeo por banco
-- Cada banco tiene diferentes formatos de Excel, aqui se configura el mapeo
CREATE TABLE IF NOT EXISTS config_bancos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) UNIQUE NOT NULL, -- 'INTERBANK', 'BCP', 'BBVA', etc.
  nombre_display VARCHAR(100) NOT NULL, -- 'Interbank', 'Banco de Crédito del Perú', etc.
  mapeo_columnas JSONB NOT NULL,
  -- Ejemplo para Interbank:
  -- {
  --   "fecha_operacion": "Fecha de operacion",
  --   "fecha_proceso": "Fecha de proceso",
  --   "numero_operacion": "Nro. de operacion",
  --   "tipo_movimiento": "Movimiento",
  --   "descripcion": "Descripcion",
  --   "canal": "Canal",
  --   "cargo": "Cargo",
  --   "abono": "Abono"
  -- }
  filas_encabezado INT DEFAULT 0, -- filas a saltar antes del header
  formato_fecha VARCHAR(50) DEFAULT 'DD/MM/YYYY', -- formato de fecha en Excel
  separador_decimal VARCHAR(5) DEFAULT '.', -- separador decimal (. o ,)
  monedas_soportadas TEXT[] DEFAULT ARRAY['USD', 'PEN'],
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Importaciones bancarias (historial de archivos importados)
CREATE TABLE IF NOT EXISTS importaciones_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  banco_id UUID NOT NULL REFERENCES config_bancos(id),
  archivo_nombre VARCHAR(255) NOT NULL,
  archivo_url TEXT, -- URL en Supabase Storage si se guarda
  cuenta VARCHAR(50), -- numero de cuenta bancaria
  moneda VARCHAR(3) NOT NULL, -- USD, PEN
  fecha_desde DATE NOT NULL,
  fecha_hasta DATE NOT NULL,
  total_transacciones INT DEFAULT 0,
  transacciones_matched INT DEFAULT 0,
  transacciones_pendientes INT DEFAULT 0,
  transacciones_ignoradas INT DEFAULT 0,
  monto_total_abonos DECIMAL(12,2) DEFAULT 0,
  monto_total_cargos DECIMAL(12,2) DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'procesando', -- procesando, completado, error
  error_mensaje TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Transacciones bancarias importadas
CREATE TABLE IF NOT EXISTS transacciones_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  importacion_id UUID NOT NULL REFERENCES importaciones_bancarias(id) ON DELETE CASCADE,
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  banco_id UUID NOT NULL REFERENCES config_bancos(id),

  -- Datos del banco
  cuenta VARCHAR(50),
  moneda VARCHAR(3) NOT NULL,
  fecha_operacion DATE NOT NULL,
  fecha_proceso DATE,
  numero_operacion VARCHAR(100), -- puede ser largo en algunos bancos
  tipo_movimiento VARCHAR(100), -- DEP, TRANSF, etc.
  descripcion TEXT,
  canal VARCHAR(100),

  -- Montos
  monto DECIMAL(12,2) NOT NULL,
  es_cargo BOOLEAN NOT NULL, -- true = salida, false = entrada (abono)

  -- Datos de origen
  archivo_origen VARCHAR(255),
  fila_origen INT,
  datos_raw JSONB, -- datos originales del Excel sin procesar

  -- Estado de matching
  estado_matching VARCHAR(20) DEFAULT 'pendiente', -- pendiente, matched, manual, ignorado
  match_confianza INT, -- 0-100, NULL si no hay match
  match_regla VARCHAR(50), -- que regla hizo el match

  -- Vinculo con abono
  abono_id UUID REFERENCES abonos_pago(id),
  control_pago_id UUID REFERENCES control_pagos(id), -- para facilitar queries

  -- Datos extraidos de descripcion (opcional)
  nombre_extraido VARCHAR(255), -- nombre extraido de la descripcion
  dni_extraido VARCHAR(20), -- DNI extraido si aparece

  -- Metadata
  notas TEXT,
  matched_at TIMESTAMP WITH TIME ZONE,
  matched_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT estado_matching_check CHECK (estado_matching IN ('pendiente', 'matched', 'manual', 'ignorado'))
);

-- ============================================================================
-- INDICES
-- ============================================================================

-- Indices para busquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_transacciones_proyecto ON transacciones_bancarias(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_importacion ON transacciones_bancarias(importacion_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_estado ON transacciones_bancarias(estado_matching);
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON transacciones_bancarias(fecha_operacion);
CREATE INDEX IF NOT EXISTS idx_transacciones_monto ON transacciones_bancarias(monto);
CREATE INDEX IF NOT EXISTS idx_transacciones_numero_op ON transacciones_bancarias(numero_operacion);
CREATE INDEX IF NOT EXISTS idx_transacciones_abono ON transacciones_bancarias(abono_id);

CREATE INDEX IF NOT EXISTS idx_importaciones_proyecto ON importaciones_bancarias(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_importaciones_banco ON importaciones_bancarias(banco_id);
CREATE INDEX IF NOT EXISTS idx_importaciones_estado ON importaciones_bancarias(estado);

-- ============================================================================
-- DATOS INICIALES: Configuracion de bancos peruanos
-- ============================================================================

INSERT INTO config_bancos (nombre, nombre_display, mapeo_columnas, filas_encabezado, formato_fecha)
VALUES
  (
    'INTERBANK',
    'Interbank',
    '{
      "fecha_operacion": "Fecha de operacion",
      "fecha_proceso": "Fecha de proceso",
      "numero_operacion": "Nro. de operacion",
      "tipo_movimiento": "Movimiento",
      "descripcion": "Descripcion",
      "canal": "Canal",
      "cargo": "Cargo",
      "abono": "Abono"
    }',
    8,
    'DD/MM/YYYY'
  ),
  (
    'BCP',
    'Banco de Crédito del Perú',
    '{
      "fecha_operacion": "Fecha",
      "descripcion": "Descripcion",
      "cargo": "Cargo",
      "abono": "Abono",
      "numero_operacion": "Numero Operacion"
    }',
    0,
    'DD/MM/YYYY'
  ),
  (
    'BBVA',
    'BBVA Continental',
    '{
      "fecha_operacion": "Fecha Operacion",
      "fecha_proceso": "Fecha Valor",
      "descripcion": "Concepto",
      "cargo": "Importe Debe",
      "abono": "Importe Haber",
      "numero_operacion": "Referencia"
    }',
    0,
    'DD/MM/YYYY'
  ),
  (
    'SCOTIABANK',
    'Scotiabank Perú',
    '{
      "fecha_operacion": "Fecha",
      "descripcion": "Descripcion",
      "cargo": "Debito",
      "abono": "Credito",
      "numero_operacion": "Numero Referencia"
    }',
    0,
    'DD/MM/YYYY'
  )
ON CONFLICT (nombre) DO UPDATE SET
  nombre_display = EXCLUDED.nombre_display,
  mapeo_columnas = EXCLUDED.mapeo_columnas,
  filas_encabezado = EXCLUDED.filas_encabezado,
  formato_fecha = EXCLUDED.formato_fecha,
  updated_at = NOW();

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE config_bancos ENABLE ROW LEVEL SECURITY;
ALTER TABLE importaciones_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones_bancarias ENABLE ROW LEVEL SECURITY;

-- Politicas para config_bancos (todos pueden leer, solo admins modifican)
CREATE POLICY "config_bancos_select" ON config_bancos
  FOR SELECT USING (true);

-- Politicas para importaciones_bancarias
-- Usuarios autenticados pueden ver/modificar importaciones de sus proyectos
CREATE POLICY "importaciones_select" ON importaciones_bancarias
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "importaciones_insert" ON importaciones_bancarias
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "importaciones_update" ON importaciones_bancarias
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Politicas para transacciones_bancarias
-- Usuarios autenticados pueden ver/modificar transacciones de sus proyectos
CREATE POLICY "transacciones_select" ON transacciones_bancarias
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "transacciones_insert" ON transacciones_bancarias
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "transacciones_update" ON transacciones_bancarias
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- FUNCIONES UTILES
-- ============================================================================

-- Funcion para obtener estadisticas de una importacion
CREATE OR REPLACE FUNCTION get_importacion_stats(p_importacion_id UUID)
RETURNS TABLE (
  total INT,
  matched INT,
  pendientes INT,
  ignorados INT,
  monto_matched DECIMAL(12,2),
  monto_pendiente DECIMAL(12,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT as total,
    COUNT(*) FILTER (WHERE estado_matching = 'matched' OR estado_matching = 'manual')::INT as matched,
    COUNT(*) FILTER (WHERE estado_matching = 'pendiente')::INT as pendientes,
    COUNT(*) FILTER (WHERE estado_matching = 'ignorado')::INT as ignorados,
    COALESCE(SUM(monto) FILTER (WHERE (estado_matching = 'matched' OR estado_matching = 'manual') AND NOT es_cargo), 0)::DECIMAL(12,2) as monto_matched,
    COALESCE(SUM(monto) FILTER (WHERE estado_matching = 'pendiente' AND NOT es_cargo), 0)::DECIMAL(12,2) as monto_pendiente
  FROM transacciones_bancarias
  WHERE importacion_id = p_importacion_id;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE config_bancos IS 'Configuracion de mapeo de columnas por banco para importar Excel';
COMMENT ON TABLE importaciones_bancarias IS 'Historial de archivos de estado de cuenta importados';
COMMENT ON TABLE transacciones_bancarias IS 'Transacciones bancarias importadas para hacer matching con abonos';
