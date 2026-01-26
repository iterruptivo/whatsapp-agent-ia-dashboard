-- ============================================================================
-- MIGRACIÓN 028: Tabla para múltiples asesores por ficha
-- Sesión 108 - 26 Enero 2026
-- ============================================================================

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS asesores_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID NOT NULL REFERENCES clientes_ficha(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('asesor_1', 'asesor_2', 'asesor_3', 'jefatura')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(ficha_id, rol)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_asesores_ficha_ficha ON asesores_ficha(ficha_id);
CREATE INDEX IF NOT EXISTS idx_asesores_ficha_usuario ON asesores_ficha(usuario_id);

-- RLS
ALTER TABLE asesores_ficha ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "asesores_ficha_select" ON asesores_ficha;
CREATE POLICY "asesores_ficha_select" ON asesores_ficha
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "asesores_ficha_insert" ON asesores_ficha;
CREATE POLICY "asesores_ficha_insert" ON asesores_ficha
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "asesores_ficha_update" ON asesores_ficha;
CREATE POLICY "asesores_ficha_update" ON asesores_ficha
FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "asesores_ficha_delete" ON asesores_ficha;
CREATE POLICY "asesores_ficha_delete" ON asesores_ficha
FOR DELETE TO authenticated USING (true);

-- Migrar vendedor_id existente a asesor_1
INSERT INTO asesores_ficha (ficha_id, usuario_id, rol)
SELECT id, vendedor_id, 'asesor_1'
FROM clientes_ficha
WHERE vendedor_id IS NOT NULL
ON CONFLICT (ficha_id, rol) DO NOTHING;

-- Comentario
COMMENT ON TABLE asesores_ficha IS 'Asesores que participaron en una venta (máx 3 asesores + 1 jefatura)';
