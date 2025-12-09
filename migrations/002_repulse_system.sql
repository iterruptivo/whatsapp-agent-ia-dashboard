-- ============================================================================
-- MIGRATION 002: Sistema Repulse
-- ============================================================================
-- Fecha: 04 Diciembre 2025
-- Descripción: Crear estructura completa para el sistema de Repulse
--              - Campo excluido_repulse en leads
--              - Tabla repulse_templates (mensajes por proyecto)
--              - Tabla repulse_leads (leads candidatos a repulse)
--              - Tabla repulse_historial (auditoría de envíos)
-- Autor: Claude Code + Leo
-- ============================================================================

-- ============================================================================
-- PASO 1: Agregar campo excluido_repulse a tabla leads
-- ============================================================================
-- Este campo indica si el lead pidió no recibir más mensajes de repulse

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS excluido_repulse BOOLEAN DEFAULT FALSE;

-- Crear índice para queries de repulse (filtrar excluidos)
CREATE INDEX IF NOT EXISTS idx_leads_excluido_repulse
ON leads(excluido_repulse)
WHERE excluido_repulse = FALSE;

-- Verify
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name = 'excluido_repulse';
-- Expected: 1 row with data_type = 'boolean', column_default = 'false'

-- ============================================================================
-- PASO 2: Crear tabla repulse_templates
-- ============================================================================
-- Templates de mensajes para repulse, por proyecto

CREATE TABLE IF NOT EXISTS repulse_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  mensaje TEXT NOT NULL,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_repulse_templates_proyecto
ON repulse_templates(proyecto_id);

CREATE INDEX IF NOT EXISTS idx_repulse_templates_activo
ON repulse_templates(proyecto_id, activo)
WHERE activo = TRUE;

-- Comentarios
COMMENT ON TABLE repulse_templates IS 'Templates de mensajes para campañas de repulse por proyecto';
COMMENT ON COLUMN repulse_templates.nombre IS 'Nombre descriptivo del template (ej: "Mensaje inicial", "Recordatorio suave")';
COMMENT ON COLUMN repulse_templates.mensaje IS 'Contenido del mensaje, puede incluir variables como {{nombre}}';
COMMENT ON COLUMN repulse_templates.activo IS 'Si el template está disponible para usar';

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_name = 'repulse_templates';
-- Expected: 1 row

-- ============================================================================
-- PASO 3: Crear tabla repulse_leads
-- ============================================================================
-- Leads que son candidatos a repulse (detectados por cron o agregados manualmente)

CREATE TABLE IF NOT EXISTS repulse_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  origen VARCHAR(50) NOT NULL CHECK (origen IN ('cron_automatico', 'manual')),
  fecha_agregado TIMESTAMPTZ DEFAULT NOW(),
  agregado_por UUID REFERENCES usuarios(id),
  estado VARCHAR(30) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado', 'respondio', 'sin_respuesta', 'excluido')),
  conteo_repulses INTEGER DEFAULT 0,
  ultimo_repulse_at TIMESTAMPTZ,
  template_usado_id UUID REFERENCES repulse_templates(id),
  mensaje_personalizado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un lead solo puede estar una vez por proyecto en repulse
  UNIQUE(lead_id, proyecto_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_repulse_leads_proyecto
ON repulse_leads(proyecto_id);

CREATE INDEX IF NOT EXISTS idx_repulse_leads_estado
ON repulse_leads(proyecto_id, estado);

CREATE INDEX IF NOT EXISTS idx_repulse_leads_lead
ON repulse_leads(lead_id);

CREATE INDEX IF NOT EXISTS idx_repulse_leads_pendientes
ON repulse_leads(proyecto_id, estado)
WHERE estado = 'pendiente';

-- Comentarios
COMMENT ON TABLE repulse_leads IS 'Leads candidatos a recibir mensajes de repulse';
COMMENT ON COLUMN repulse_leads.origen IS 'Cómo llegó el lead a repulse: cron_automatico (cada 10 días) o manual';
COMMENT ON COLUMN repulse_leads.estado IS 'Estado del repulse: pendiente, enviado, respondio, sin_respuesta, excluido';
COMMENT ON COLUMN repulse_leads.conteo_repulses IS 'Cuántas veces se le ha enviado mensaje de repulse';
COMMENT ON COLUMN repulse_leads.mensaje_personalizado IS 'Mensaje editado por el usuario (si no usa template directo)';

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_name = 'repulse_leads';
-- Expected: 1 row

-- ============================================================================
-- PASO 4: Crear tabla repulse_historial
-- ============================================================================
-- Historial de cada envío de repulse (auditoría)

CREATE TABLE IF NOT EXISTS repulse_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repulse_lead_id UUID NOT NULL REFERENCES repulse_leads(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  template_id UUID REFERENCES repulse_templates(id),
  mensaje_enviado TEXT NOT NULL,
  enviado_at TIMESTAMPTZ DEFAULT NOW(),
  enviado_por UUID REFERENCES usuarios(id),
  respuesta_recibida BOOLEAN DEFAULT FALSE,
  respuesta_at TIMESTAMPTZ,
  notas TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_repulse_historial_lead
ON repulse_historial(lead_id);

CREATE INDEX IF NOT EXISTS idx_repulse_historial_proyecto
ON repulse_historial(proyecto_id);

CREATE INDEX IF NOT EXISTS idx_repulse_historial_fecha
ON repulse_historial(enviado_at DESC);

-- Comentarios
COMMENT ON TABLE repulse_historial IS 'Registro de cada mensaje de repulse enviado';
COMMENT ON COLUMN repulse_historial.mensaje_enviado IS 'Copia del mensaje exacto que se envió';
COMMENT ON COLUMN repulse_historial.respuesta_recibida IS 'Si el lead respondió al mensaje';

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_name = 'repulse_historial';
-- Expected: 1 row

-- ============================================================================
-- PASO 5: Crear función para detectar leads candidatos a repulse
-- ============================================================================
-- Esta función se ejecuta cada 10 días por un cron job

CREATE OR REPLACE FUNCTION detectar_leads_repulse(p_proyecto_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Insertar leads candidatos a repulse:
  -- 1. No excluidos
  -- 2. Creados hace más de 30 días
  -- 3. No tienen compra (no existen en locales_leads)
  -- 4. No están ya en repulse_leads

  INSERT INTO repulse_leads (lead_id, proyecto_id, origen, estado)
  SELECT
    l.id,
    l.proyecto_id,
    'cron_automatico',
    'pendiente'
  FROM leads l
  WHERE l.proyecto_id = p_proyecto_id
    AND l.excluido_repulse = FALSE
    AND l.created_at <= NOW() - INTERVAL '30 days'
    -- No tiene compra en locales_leads
    AND NOT EXISTS (
      SELECT 1 FROM locales_leads ll
      WHERE ll.lead_id = l.id
    )
    -- No está ya en repulse_leads
    AND NOT EXISTS (
      SELECT 1 FROM repulse_leads rl
      WHERE rl.lead_id = l.id
      AND rl.proyecto_id = l.proyecto_id
    )
  ON CONFLICT (lead_id, proyecto_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detectar_leads_repulse IS 'Detecta y agrega leads candidatos a repulse. Ejecutar cada 10 días por cron.';

-- ============================================================================
-- PASO 6: Insertar template por defecto para proyectos existentes
-- ============================================================================
-- Crear un template inicial para cada proyecto

INSERT INTO repulse_templates (proyecto_id, nombre, mensaje, activo)
SELECT
  p.id,
  'Mensaje inicial',
  'Hola {{nombre}}, ¿sigues interesado en conocer más sobre nuestros locales comerciales? Estamos para ayudarte.',
  TRUE
FROM proyectos p
WHERE NOT EXISTS (
  SELECT 1 FROM repulse_templates rt
  WHERE rt.proyecto_id = p.id
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar todas las tablas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('repulse_templates', 'repulse_leads', 'repulse_historial')
ORDER BY table_name;
-- Expected: 3 rows

-- Verificar columna en leads
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'leads'
  AND column_name = 'excluido_repulse';
-- Expected: 1 row

-- Verificar función
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'detectar_leads_repulse';
-- Expected: 1 row

-- ============================================================================
-- ROLLBACK (ejecutar solo si necesitas revertir)
-- ============================================================================
/*
-- Eliminar en orden inverso por dependencias

DROP FUNCTION IF EXISTS detectar_leads_repulse(UUID);
DROP TABLE IF EXISTS repulse_historial;
DROP TABLE IF EXISTS repulse_leads;
DROP TABLE IF EXISTS repulse_templates;
DROP INDEX IF EXISTS idx_leads_excluido_repulse;
ALTER TABLE leads DROP COLUMN IF EXISTS excluido_repulse;

-- Verify rollback
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'repulse%';
-- Expected: 0 rows
*/

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
/*
1. CRON JOB:
   - Ejecutar detectar_leads_repulse(proyecto_id) cada 10 días
   - Puede ejecutarse desde n8n, Supabase Edge Functions, o pg_cron
   - Ejemplo: SELECT detectar_leads_repulse('uuid-del-proyecto');

2. LÓGICA DE DETECCIÓN:
   - Lead sin compra = NO existe en locales_leads
   - Antigüedad = created_at > 30 días
   - No excluido = excluido_repulse = FALSE
   - No duplicado = no existe en repulse_leads

3. ESTADOS DE REPULSE:
   - pendiente: Listo para enviar mensaje
   - enviado: Mensaje enviado, esperando respuesta
   - respondio: Lead respondió al mensaje
   - sin_respuesta: No respondió después de X días
   - excluido: Pidió no recibir más mensajes

4. TEMPLATES:
   - Variables soportadas: {{nombre}}, {{telefono}}, {{proyecto}}
   - Se procesan en el backend antes de enviar a n8n

5. RLS:
   - Agregar políticas RLS según necesidades de seguridad
   - Por ahora las tablas son accesibles para usuarios autenticados

6. INTEGRACIÓN N8N:
   - Webhook recibe: lead_id, telefono, mensaje
   - n8n envía mensaje via WhatsApp
   - Callback actualiza estado en repulse_leads
*/

-- ============================================================================
-- FIN DE MIGRATION 002
-- ============================================================================
