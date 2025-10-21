-- ============================================================================
-- MIGRACIÓN MULTI-PROYECTO - ECOPLAZA DASHBOARD
-- Fecha: 19 Octubre 2025
-- Descripción: Agregar soporte para múltiples proyectos (Trapiche + Callao)
-- Riesgo: BAJO (backward compatible, columnas nullable)
-- ============================================================================

-- PASO 1: Crear tabla proyectos
-- Impacto: NINGUNO (tabla nueva, no afecta queries existentes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS proyectos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(7),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASO 2: Insertar proyectos iniciales
-- ============================================================================
INSERT INTO proyectos (nombre, slug, color) VALUES
('Proyecto Trapiche', 'trapiche', '#1b967a'),
('Proyecto Callao', 'callao', '#3b82f6')
ON CONFLICT (slug) DO NOTHING;

-- PASO 3: Agregar columna proyecto_id a tabla leads (NULLABLE)
-- Impacto: NINGUNO (nullable, no rompe queries existentes)
-- ============================================================================
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS proyecto_id UUID REFERENCES proyectos(id);

-- PASO 4: Crear índice para performance
-- Impacto: Mejora queries, no rompe nada
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_leads_proyecto_id ON leads(proyecto_id);

-- PASO 5: Asignar proyecto Trapiche a TODOS los leads existentes
-- Esto garantiza que todos los leads históricos apunten a Trapiche
-- ============================================================================
UPDATE leads
SET proyecto_id = (SELECT id FROM proyectos WHERE slug = 'trapiche')
WHERE proyecto_id IS NULL;

-- ============================================================================
-- VERIFICACIÓN - Ejecutar DESPUÉS de la migración
-- ============================================================================

-- Query 1: Verificar que proyectos se crearon correctamente
SELECT id, nombre, slug, color, activo FROM proyectos ORDER BY nombre;

-- Query 2: Verificar que TODOS los leads tienen proyecto asignado
SELECT
  COUNT(*) AS total_leads,
  COUNT(proyecto_id) AS leads_con_proyecto,
  COUNT(*) - COUNT(proyecto_id) AS leads_sin_proyecto
FROM leads;
-- Resultado esperado: leads_sin_proyecto = 0

-- Query 3: Distribución de leads por proyecto
SELECT
  p.nombre AS proyecto,
  COUNT(l.id) AS total_leads
FROM proyectos p
LEFT JOIN leads l ON p.id = l.proyecto_id
GROUP BY p.id, p.nombre
ORDER BY p.nombre;

-- Query 4: Verificar últimos 10 leads tienen proyecto
SELECT
  l.telefono,
  l.nombre,
  l.fecha_captura,
  p.nombre AS proyecto
FROM leads l
LEFT JOIN proyectos p ON l.proyecto_id = p.id
ORDER BY l.fecha_captura DESC
LIMIT 10;

-- ============================================================================
-- ROLLBACK (Solo si algo sale mal)
-- ============================================================================
-- ADVERTENCIA: Solo ejecutar si necesitas revertir cambios

-- DROP INDEX IF EXISTS idx_leads_proyecto_id;
-- ALTER TABLE leads DROP COLUMN IF EXISTS proyecto_id;
-- DROP TABLE IF EXISTS proyectos;
