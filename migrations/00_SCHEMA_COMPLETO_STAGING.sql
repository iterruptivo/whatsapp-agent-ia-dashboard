-- ============================================================================
-- SCHEMA COMPLETO - ECOPLAZA DASHBOARD
-- ============================================================================
-- Fecha generación: 19 Noviembre 2025
-- Propósito: Crear entorno staging completo (estructura + datos)
-- Uso: Ejecutar en proyecto Supabase staging para replicar producción
-- ============================================================================

-- ============================================================================
-- PASO 1: TABLA proyectos
-- ============================================================================

CREATE TABLE IF NOT EXISTS proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  color VARCHAR(7),  -- Hex color code
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proyectos_slug ON proyectos(slug);
CREATE INDEX idx_proyectos_activo ON proyectos(activo);

COMMENT ON TABLE proyectos IS 'Proyectos inmobiliarios (Trapiche, Callao, San Gabriel, etc.)';

-- ============================================================================
-- PASO 2: TABLA vendedores
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(50) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendedores_activo ON vendedores(activo);

COMMENT ON TABLE vendedores IS 'Vendedores del equipo de ventas';

-- ============================================================================
-- PASO 3: TABLA usuarios
-- ============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'vendedor', 'jefe_ventas', 'vendedor_caseta')),
  vendedor_id UUID REFERENCES vendedores(id) ON DELETE SET NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_activo ON usuarios(activo);
CREATE INDEX idx_usuarios_vendedor_id ON usuarios(vendedor_id);

COMMENT ON TABLE usuarios IS 'Usuarios del dashboard con roles y permisos';
COMMENT ON COLUMN usuarios.rol IS 'Roles: admin, vendedor, jefe_ventas, vendedor_caseta';

-- ============================================================================
-- PASO 4: TABLA leads
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefono VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  nombre VARCHAR(255),
  rubro VARCHAR(100),
  horario_visita TEXT,
  horario_visita_timestamp TIMESTAMPTZ,
  estado VARCHAR(50),
  estado_al_notificar VARCHAR(50),
  historial_conversacion TEXT,
  historial_reciente TEXT,
  resumen_historial TEXT,
  ultimo_mensaje TEXT,
  intentos_bot INTEGER NOT NULL DEFAULT 0,
  fecha_captura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notificacion_enviada BOOLEAN NOT NULL DEFAULT false,
  vendedor_asignado_id UUID REFERENCES vendedores(id) ON DELETE SET NULL,
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  asistio BOOLEAN NOT NULL DEFAULT false,
  utm VARCHAR(100) NOT NULL DEFAULT 'victoria'
);

CREATE INDEX idx_leads_telefono ON leads(telefono);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_estado ON leads(estado);
CREATE INDEX idx_leads_vendedor_asignado_id ON leads(vendedor_asignado_id);
CREATE INDEX idx_leads_proyecto_id ON leads(proyecto_id);
CREATE INDEX idx_leads_fecha_captura ON leads(fecha_captura DESC);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_asistio ON leads(asistio);
CREATE INDEX idx_leads_utm ON leads(utm);

COMMENT ON TABLE leads IS 'Leads capturados por el chatbot Victoria vía WhatsApp';
COMMENT ON COLUMN leads.asistio IS 'Indica si el lead visitó físicamente el proyecto (true/false)';
COMMENT ON COLUMN leads.utm IS 'Origen del lead (victoria, facebook, google, referido, etc.)';

-- ============================================================================
-- PASO 5: TABLA locales
-- ============================================================================

CREATE TABLE IF NOT EXISTS locales (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,

  -- Relaciones
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,

  -- Características del local
  metraje DECIMAL(10,2) NOT NULL,

  -- Estado del local (semáforo)
  estado VARCHAR(20) NOT NULL DEFAULT 'verde'
    CHECK (estado IN ('verde', 'amarillo', 'naranja', 'rojo')),

  -- Control de bloqueo
  bloqueado BOOLEAN NOT NULL DEFAULT false,

  -- Montos de venta
  monto_separacion DECIMAL(12, 2),  -- Monto de separación (requerido en NARANJA)
  monto_venta DECIMAL(12, 2),       -- Monto de venta (requerido en NARANJA)

  -- Auditoría - Quién cerró la venta
  vendedor_actual_id UUID REFERENCES vendedores(id) ON DELETE SET NULL,
  vendedor_cerro_venta_id UUID REFERENCES vendedores(id) ON DELETE SET NULL,
  fecha_cierre_venta TIMESTAMPTZ,

  -- SESIÓN 48: Timer 120 horas para NARANJA + Exclusividad
  naranja_timestamp TIMESTAMPTZ,
  naranja_vendedor_id UUID REFERENCES vendedores(id) ON DELETE SET NULL,

  -- SESIÓN 48D: Array de vendedores negociando (estado AMARILLO)
  vendedores_negociando_ids UUID[] NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locales_proyecto_id ON locales(proyecto_id);
CREATE INDEX idx_locales_estado ON locales(estado);
CREATE INDEX idx_locales_codigo ON locales(codigo);
CREATE INDEX idx_locales_metraje ON locales(metraje);
CREATE INDEX idx_locales_bloqueado ON locales(bloqueado);
CREATE INDEX idx_locales_naranja_vendedor_id ON locales(naranja_vendedor_id);

COMMENT ON TABLE locales IS 'Locales en venta con sistema de estados en tiempo real';
COMMENT ON COLUMN locales.estado IS 'verde=libre, amarillo=negociando, naranja=confirmado, rojo=vendido';
COMMENT ON COLUMN locales.naranja_timestamp IS 'Timestamp cuando local pasó a NARANJA (timer 120 horas)';
COMMENT ON COLUMN locales.naranja_vendedor_id IS 'Vendedor que puso en NARANJA (exclusividad)';

-- ============================================================================
-- PASO 6: TABLA locales_historial
-- ============================================================================

CREATE TABLE IF NOT EXISTS locales_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  estado_anterior VARCHAR(20) NOT NULL
    CHECK (estado_anterior IN ('verde', 'amarillo', 'naranja', 'rojo')),
  estado_nuevo VARCHAR(20) NOT NULL
    CHECK (estado_nuevo IN ('verde', 'amarillo', 'naranja', 'rojo')),
  accion VARCHAR(2000),  -- Ampliado para incluir comentarios largos
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locales_historial_local_id ON locales_historial(local_id);
CREATE INDEX idx_locales_historial_usuario_id ON locales_historial(usuario_id);
CREATE INDEX idx_locales_historial_created_at ON locales_historial(created_at DESC);

COMMENT ON TABLE locales_historial IS 'Historial de cambios de estado de locales';

-- ============================================================================
-- PASO 7: TABLA locales_leads (Relacional)
-- ============================================================================

CREATE TABLE IF NOT EXISTS locales_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  lead_telefono TEXT NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  vendedor_id UUID REFERENCES vendedores(id) ON DELETE SET NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  monto_separacion DECIMAL(12, 2),  -- Monto de separación del local
  monto_venta DECIMAL(12, 2),       -- Monto de venta del local
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locales_leads_local ON locales_leads(local_id);
CREATE INDEX idx_locales_leads_telefono ON locales_leads(lead_telefono);
CREATE INDEX idx_locales_leads_lead_id ON locales_leads(lead_id);

COMMENT ON TABLE locales_leads IS 'Tabla relacional: tracking de vinculaciones local-lead';

-- ============================================================================
-- PASO 8: TRIGGERS Y FUNCTIONS
-- ============================================================================

-- Function: Actualizar updated_at en tabla leads
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_leads_updated_at ON leads;
CREATE TRIGGER trigger_update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Function: Actualizar updated_at en tabla locales
CREATE OR REPLACE FUNCTION update_locales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_locales_updated_at ON locales;
CREATE TRIGGER trigger_update_locales_updated_at
  BEFORE UPDATE ON locales
  FOR EACH ROW
  EXECUTE FUNCTION update_locales_updated_at();

-- Function: Auto-bloquear local cuando estado = rojo
CREATE OR REPLACE FUNCTION auto_bloquear_local_rojo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'rojo' AND OLD.estado != 'rojo' THEN
    NEW.bloqueado = true;
    NEW.fecha_cierre_venta = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_bloquear_local_rojo ON locales;
CREATE TRIGGER trigger_auto_bloquear_local_rojo
  BEFORE UPDATE ON locales
  FOR EACH ROW
  EXECUTE FUNCTION auto_bloquear_local_rojo();

-- Function: Registrar cambio de estado en historial (DESHABILITADA - se usa Server Action)
-- Nota: Historial se registra desde Server Actions para mayor control
CREATE OR REPLACE FUNCTION registrar_cambio_estado_local()
RETURNS TRIGGER AS $$
BEGIN
  -- Función deshabilitada - historial se registra via Server Actions
  -- Mantener function para backwards compatibility
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASO 9: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Tabla: proyectos
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;

CREATE POLICY proyectos_select_authenticated ON proyectos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY proyectos_select_anon ON proyectos
  FOR SELECT TO anon USING (true);

-- Tabla: vendedores
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendedores_select_authenticated ON vendedores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY vendedores_select_anon ON vendedores
  FOR SELECT TO anon USING (true);

-- Tabla: usuarios
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuarios_select_authenticated ON usuarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY usuarios_select_anon ON usuarios
  FOR SELECT TO anon USING (true);

CREATE POLICY usuarios_insert_anon ON usuarios
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY usuarios_update_anon ON usuarios
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY usuarios_delete_anon ON usuarios
  FOR DELETE TO anon USING (true);

-- Tabla: leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_select_authenticated ON leads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY leads_select_anon ON leads
  FOR SELECT TO anon USING (true);

CREATE POLICY leads_insert_anon ON leads
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY leads_update_anon ON leads
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY leads_delete_anon ON leads
  FOR DELETE TO anon USING (true);

-- Tabla: locales
ALTER TABLE locales ENABLE ROW LEVEL SECURITY;

CREATE POLICY locales_select_authenticated ON locales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY locales_select_anon ON locales
  FOR SELECT TO anon USING (true);

CREATE POLICY locales_insert_anon ON locales
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY locales_update_authenticated ON locales
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY locales_update_anon ON locales
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY locales_delete_anon ON locales
  FOR DELETE TO anon USING (true);

-- Tabla: locales_historial
ALTER TABLE locales_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY locales_historial_select_authenticated ON locales_historial
  FOR SELECT TO authenticated USING (true);

CREATE POLICY locales_historial_select_anon ON locales_historial
  FOR SELECT TO anon USING (true);

CREATE POLICY locales_historial_insert_anon ON locales_historial
  FOR INSERT TO anon WITH CHECK (true);

-- Tabla: locales_leads
ALTER TABLE locales_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY locales_leads_select_authenticated ON locales_leads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY locales_leads_select_anon ON locales_leads
  FOR SELECT TO anon USING (true);

CREATE POLICY locales_leads_insert_anon ON locales_leads
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY locales_leads_update_anon ON locales_leads
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ============================================================================
-- PASO 10: SUPABASE REALTIME
-- ============================================================================

-- Habilitar Realtime para tabla locales (actualizaciones en tiempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE locales;

-- Opcional: Habilitar Realtime para leads (si necesario)
-- ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- ============================================================================
-- PASO 11: VERIFICACIÓN
-- ============================================================================

-- Query 1: Verificar tablas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('proyectos', 'vendedores', 'usuarios', 'leads', 'locales', 'locales_historial', 'locales_leads')
ORDER BY table_name;
-- Expected: 7 tablas

-- Query 2: Verificar índices creados
SELECT COUNT(*) as total_indices
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('proyectos', 'vendedores', 'usuarios', 'leads', 'locales', 'locales_historial', 'locales_leads');
-- Expected: 25+ índices

-- Query 3: Verificar triggers
SELECT COUNT(*) as total_triggers
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('leads', 'locales');
-- Expected: 3 triggers

-- Query 4: Verificar RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('proyectos', 'vendedores', 'usuarios', 'leads', 'locales', 'locales_historial', 'locales_leads')
ORDER BY tablename;
-- Expected: rowsecurity = true para todas

-- Query 5: Contar policies
SELECT COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public';
-- Expected: 20+ policies

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

/*
1. ESTE SCRIPT CREA LA ESTRUCTURA COMPLETA (SCHEMA)
   - Ejecuta este script en tu nuevo proyecto Supabase staging
   - Verificará que todas las tablas, índices, triggers y policies estén creados

2. PARA COPIAR LOS DATOS DE PRODUCCIÓN:
   - Ve a tu proyecto Supabase de producción
   - Dashboard → Database → Backups
   - Click "Create backup" (opcional)
   - Luego: Table Editor → Export → CSV para cada tabla:
     * proyectos
     * vendedores
     * usuarios
     * leads
     * locales
     * locales_historial
     * locales_leads

3. IMPORTAR DATOS EN STAGING:
   - Ve a proyecto Supabase staging
   - Table Editor → Selecciona tabla → Import → CSV
   - Importa en este orden (por dependencias):
     1. proyectos
     2. vendedores
     3. usuarios
     4. leads
     5. locales
     6. locales_historial
     7. locales_leads

4. VARIABLES DE ENTORNO STAGING (Vercel):
   - NEXT_PUBLIC_SUPABASE_URL=https://[tu-proyecto-staging].supabase.co
   - NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key-staging]
   - Obtener de: Supabase Staging → Settings → API

5. MIGRATIONS FUTURAS:
   - Los cambios en BD se documentarán en archivos migrations/
   - Ejecutar primero en staging, luego en producción
   - Mantener versionado (001_, 002_, etc.)

6. REALTIME:
   - Solo tabla locales tiene Realtime habilitado
   - Si necesitas Realtime en leads, descomenta la línea correspondiente

7. SECURITY:
   - RLS está habilitado en todas las tablas
   - Policies permiten authenticated y anon (para Server Actions)
   - No exponer SUPABASE_SERVICE_KEY en variables de entorno frontend
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
