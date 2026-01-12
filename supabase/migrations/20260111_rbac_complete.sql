-- ============================================================================
-- MIGRACION RBAC COMPLETA - Sistema de Permisos Granulares
-- Fecha: 11 Enero 2026
-- Proyecto: EcoPlaza Dashboard
-- ============================================================================
-- Descripción: Setup completo del sistema RBAC con:
--   - 8 roles con jerarquías
--   - 62 permisos granulares (modulo:accion)
--   - Relaciones rol-permisos
--   - Permission Sets (permisos extra por usuario)
--   - Auditoría completa
--   - Funciones de validación
--   - Vista consolidada
--   - Políticas RLS
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1: CREAR TABLAS
-- ============================================================================

-- Tabla: roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  es_sistema BOOLEAN DEFAULT false,
  jerarquia INTEGER DEFAULT 100,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: permisos
CREATE TABLE IF NOT EXISTS permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo VARCHAR(50) NOT NULL,
  accion VARCHAR(50) NOT NULL,
  descripcion TEXT,
  es_sistema BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(modulo, accion)
);

-- Tabla: rol_permisos (relación N:N)
CREATE TABLE IF NOT EXISTS rol_permisos (
  rol_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permiso_id UUID REFERENCES permisos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id),
  PRIMARY KEY (rol_id, permiso_id)
);

-- Tabla: usuario_permisos_extra (Permission Sets como Salesforce)
CREATE TABLE IF NOT EXISTS usuario_permisos_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  permiso_id UUID REFERENCES permisos(id) ON DELETE CASCADE,
  otorgado_por UUID REFERENCES usuarios(id),
  motivo TEXT,
  fecha_otorgado TIMESTAMPTZ DEFAULT NOW(),
  fecha_expiracion TIMESTAMPTZ,
  activo BOOLEAN DEFAULT true
);

-- Tabla: permisos_audit (Auditoría)
CREATE TABLE IF NOT EXISTS permisos_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id),
  accion VARCHAR(50) NOT NULL,
  tabla_afectada VARCHAR(50) NOT NULL,
  registro_id UUID,
  valores_antes JSONB,
  valores_despues JSONB,
  realizado_por UUID REFERENCES usuarios(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columna rol_id a usuarios (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'rol_id'
  ) THEN
    ALTER TABLE usuarios ADD COLUMN rol_id UUID REFERENCES roles(id);
  END IF;
END $$;

-- ============================================================================
-- PARTE 2: CREAR INDICES
-- ============================================================================

-- Índices para roles
CREATE INDEX IF NOT EXISTS idx_roles_nombre ON roles(nombre);
CREATE INDEX IF NOT EXISTS idx_roles_jerarquia ON roles(jerarquia);
CREATE INDEX IF NOT EXISTS idx_roles_activo ON roles(activo);

-- Índices para permisos
CREATE INDEX IF NOT EXISTS idx_permisos_modulo ON permisos(modulo);
CREATE INDEX IF NOT EXISTS idx_permisos_accion ON permisos(accion);
CREATE INDEX IF NOT EXISTS idx_permisos_activo ON permisos(activo);
CREATE INDEX IF NOT EXISTS idx_permisos_modulo_accion ON permisos(modulo, accion);

-- Índices para rol_permisos
CREATE INDEX IF NOT EXISTS idx_rol_permisos_rol_id ON rol_permisos(rol_id);
CREATE INDEX IF NOT EXISTS idx_rol_permisos_permiso_id ON rol_permisos(permiso_id);

-- Índices para usuario_permisos_extra
CREATE INDEX IF NOT EXISTS idx_usuario_permisos_usuario_id ON usuario_permisos_extra(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_permisos_permiso_id ON usuario_permisos_extra(permiso_id);
CREATE INDEX IF NOT EXISTS idx_usuario_permisos_activo ON usuario_permisos_extra(activo);
CREATE INDEX IF NOT EXISTS idx_usuario_permisos_expiracion ON usuario_permisos_extra(fecha_expiracion);

-- Índices para permisos_audit
CREATE INDEX IF NOT EXISTS idx_permisos_audit_usuario_id ON permisos_audit(usuario_id);
CREATE INDEX IF NOT EXISTS idx_permisos_audit_created_at ON permisos_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permisos_audit_tabla_accion ON permisos_audit(tabla_afectada, accion);

-- Índice para usuarios.rol_id
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_id ON usuarios(rol_id);

-- ============================================================================
-- PARTE 3: CREAR FUNCIONES
-- ============================================================================

-- Función: check_permiso - Validar si usuario tiene permiso específico
CREATE OR REPLACE FUNCTION check_permiso(
  p_usuario_id UUID,
  p_modulo VARCHAR,
  p_accion VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_tiene_permiso BOOLEAN;
  v_rol_id UUID;
BEGIN
  -- Obtener rol del usuario
  SELECT rol_id INTO v_rol_id FROM usuarios WHERE id = p_usuario_id AND activo = true;

  IF v_rol_id IS NULL THEN
    RETURN false;
  END IF;

  -- Verificar permiso vía rol
  SELECT EXISTS (
    SELECT 1
    FROM rol_permisos rp
    JOIN permisos p ON rp.permiso_id = p.id
    WHERE rp.rol_id = v_rol_id
      AND p.modulo = p_modulo
      AND p.accion = p_accion
      AND p.activo = true
  ) INTO v_tiene_permiso;

  IF v_tiene_permiso THEN
    RETURN true;
  END IF;

  -- Verificar permisos extra (Permission Sets)
  SELECT EXISTS (
    SELECT 1
    FROM usuario_permisos_extra upe
    JOIN permisos p ON upe.permiso_id = p.id
    WHERE upe.usuario_id = p_usuario_id
      AND p.modulo = p_modulo
      AND p.accion = p_accion
      AND p.activo = true
      AND upe.activo = true
      AND (upe.fecha_expiracion IS NULL OR upe.fecha_expiracion > NOW())
  ) INTO v_tiene_permiso;

  RETURN v_tiene_permiso;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Función: get_permisos_usuario - Obtener todos los permisos efectivos de un usuario
CREATE OR REPLACE FUNCTION get_permisos_usuario(p_usuario_id UUID)
RETURNS TABLE (
  modulo VARCHAR,
  accion VARCHAR,
  descripcion TEXT,
  origen VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  -- Permisos del rol
  SELECT DISTINCT
    p.modulo,
    p.accion,
    p.descripcion,
    'rol'::VARCHAR AS origen
  FROM usuarios u
  JOIN rol_permisos rp ON u.rol_id = rp.rol_id
  JOIN permisos p ON rp.permiso_id = p.id
  WHERE u.id = p_usuario_id
    AND u.activo = true
    AND p.activo = true

  UNION

  -- Permisos extra (Permission Sets)
  SELECT DISTINCT
    p.modulo,
    p.accion,
    p.descripcion,
    'extra'::VARCHAR AS origen
  FROM usuario_permisos_extra upe
  JOIN permisos p ON upe.permiso_id = p.id
  WHERE upe.usuario_id = p_usuario_id
    AND upe.activo = true
    AND p.activo = true
    AND (upe.fecha_expiracion IS NULL OR upe.fecha_expiracion > NOW())

  ORDER BY modulo, accion;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- PARTE 4: CREAR VISTA CONSOLIDADA
-- ============================================================================

CREATE OR REPLACE VIEW user_effective_permissions AS
SELECT DISTINCT
  u.id AS usuario_id,
  u.email,
  u.nombre,
  u.rol AS rol_legacy,
  r.nombre AS rol_nombre,
  r.jerarquia AS rol_jerarquia,
  p.id AS permiso_id,
  p.modulo,
  p.accion,
  p.descripcion,
  CASE
    WHEN upe.id IS NOT NULL THEN 'extra'
    ELSE 'rol'
  END AS origen_permiso,
  upe.fecha_expiracion
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
LEFT JOIN rol_permisos rp ON rp.rol_id = r.id
LEFT JOIN permisos p ON p.id = rp.permiso_id
LEFT JOIN usuario_permisos_extra upe ON upe.usuario_id = u.id AND upe.permiso_id = p.id AND upe.activo = true
WHERE u.activo = true
  AND r.activo = true
  AND p.activo = true
  AND (upe.fecha_expiracion IS NULL OR upe.fecha_expiracion > NOW());

-- ============================================================================
-- PARTE 5: SEED DATA - INSERTAR ROLES (8 ROLES)
-- ============================================================================

INSERT INTO roles (nombre, descripcion, es_sistema, jerarquia) VALUES
('admin', 'Administrador del sistema con acceso total', true, 0),
('gerencia', 'Dirección y gerencia general', true, 10),
('jefe_ventas', 'Jefe de ventas con acceso a equipos y métricas', true, 20),
('marketing', 'Equipo de marketing y campañas', true, 30),
('finanzas', 'Control de pagos y aprobación de descuentos', true, 40),
('coordinador', 'Coordinador de locales y operaciones', true, 50),
('vendedor', 'Vendedor con leads asignados', true, 60),
('vendedor_caseta', 'Vendedor de caseta con módulo locales', true, 60)  -- MISMO NIVEL que vendedor
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================================
-- PARTE 6: SEED DATA - INSERTAR PERMISOS (62 PERMISOS)
-- ============================================================================

INSERT INTO permisos (modulo, accion, descripcion, es_sistema) VALUES
-- LEADS (8)
('leads', 'read', 'Ver leads propios', true),
('leads', 'read_all', 'Ver TODOS los leads', true),
('leads', 'write', 'Crear y editar leads', true),
('leads', 'delete', 'Eliminar leads', true),
('leads', 'assign', 'Asignar leads a vendedores', true),
('leads', 'export', 'Exportar leads a Excel', true),
('leads', 'import', 'Importar leads desde Excel', true),
('leads', 'bulk_actions', 'Acciones masivas', true),

-- LOCALES (7)
('locales', 'read', 'Ver locales del proyecto', true),
('locales', 'read_all', 'Ver locales de todos los proyectos', true),
('locales', 'write', 'Crear y editar locales', true),
('locales', 'delete', 'Eliminar locales', true),
('locales', 'cambiar_estado', 'Cambiar estado del semáforo', true),
('locales', 'export', 'Exportar catálogo', true),
('locales', 'admin', 'Administración completa', true),

-- VENTAS (4)
('ventas', 'read', 'Ver registro de ventas', true),
('ventas', 'write', 'Registrar venta', true),
('ventas', 'delete', 'Eliminar venta', true),
('ventas', 'cambiar_precio', 'Modificar precio post-venta', true),

-- CONTROL_PAGOS (7)
('control_pagos', 'read', 'Ver control de pagos', true),
('control_pagos', 'write', 'Registrar abonos', true),
('control_pagos', 'verify', 'Verificar pagos', true),
('control_pagos', 'generar_constancias', 'Generar constancias', true),
('control_pagos', 'generar_contratos', 'Generar contratos Word', true),
('control_pagos', 'expediente', 'Gestionar expediente digital', true),
('control_pagos', 'validacion_bancaria', 'Validar extractos bancarios', true),

-- COMISIONES (3)
('comisiones', 'read', 'Ver mis comisiones', true),
('comisiones', 'read_all', 'Ver comisiones de todos', true),
('comisiones', 'export', 'Exportar reporte', true),

-- REPULSE (4)
('repulse', 'read', 'Ver lista de repulse', true),
('repulse', 'write', 'Enviar mensajes', true),
('repulse', 'config', 'Configurar reglas', true),
('repulse', 'exclude', 'Excluir leads permanentemente', true),

-- APROBACIONES (4)
('aprobaciones', 'read', 'Ver solicitudes', true),
('aprobaciones', 'approve', 'Aprobar descuentos', true),
('aprobaciones', 'reject', 'Rechazar solicitudes', true),
('aprobaciones', 'config', 'Configurar rangos', true),

-- USUARIOS (6)
('usuarios', 'read', 'Ver lista de usuarios', true),
('usuarios', 'write', 'Crear y editar usuarios', true),
('usuarios', 'delete', 'Desactivar usuarios', true),
('usuarios', 'change_role', 'Cambiar rol de usuarios', true),
('usuarios', 'assign_permissions', 'Otorgar permisos extra', true),
('usuarios', 'view_audit', 'Ver historial de cambios', true),

-- PROYECTOS (4)
('proyectos', 'read', 'Ver lista de proyectos', true),
('proyectos', 'write', 'Crear y editar proyectos', true),
('proyectos', 'delete', 'Desactivar proyectos', true),
('proyectos', 'config', 'Configurar TEA, cuotas, templates', true),

-- INSIGHTS (2)
('insights', 'read', 'Ver dashboard de métricas', true),
('insights', 'export', 'Exportar reportes', true),

-- REUNIONES (4)
('reuniones', 'read', 'Ver reuniones propias', true),
('reuniones', 'read_all', 'Ver TODAS las reuniones', true),
('reuniones', 'write', 'Crear y editar reuniones', true),
('reuniones', 'delete', 'Eliminar reuniones', true),

-- CONFIGURACION (4)
('configuracion', 'read', 'Ver configuraciones', true),
('configuracion', 'write', 'Editar configuraciones', true),
('configuracion', 'webhooks', 'Gestionar webhooks', true),
('configuracion', 'integraciones', 'Configurar integraciones', true),

-- CROSS-MODULE (5)
('cross', 'ver_todos_proyectos', 'Ver datos cross-proyecto', true),
('cross', 'ver_todos_vendedores', 'Ver datos de todos los vendedores', true),
('cross', 'resetear_password', 'Resetear passwords', true),
('cross', 'ejecutar_campana_masiva', 'Ejecutar campañas masivas', true),
('cross', 'usar_template_custom', 'Subir templates personalizados', true)

ON CONFLICT (modulo, accion) DO NOTHING;

-- ============================================================================
-- PARTE 7: SEED DATA - ASIGNAR PERMISOS A ROLES
-- ============================================================================

-- ROL: ADMIN (todos los 62 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'admin'),
  p.id
FROM permisos p
WHERE p.activo = true
ON CONFLICT DO NOTHING;

-- ROL: JEFE_VENTAS (44 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'jefe_ventas'),
  p.id
FROM permisos p
WHERE p.activo = true
  AND (
    -- Leads: todo excepto delete
    (p.modulo = 'leads' AND p.accion IN ('read', 'read_all', 'write', 'assign', 'export', 'import', 'bulk_actions'))
    -- Locales: todo excepto delete y admin
    OR (p.modulo = 'locales' AND p.accion IN ('read', 'read_all', 'write', 'cambiar_estado', 'export'))
    -- Ventas: todo
    OR (p.modulo = 'ventas')
    -- Control pagos: todo excepto verify
    OR (p.modulo = 'control_pagos' AND p.accion IN ('read', 'write', 'generar_constancias', 'generar_contratos', 'expediente', 'validacion_bancaria'))
    -- Comisiones: read_all, export
    OR (p.modulo = 'comisiones' AND p.accion IN ('read_all', 'export'))
    -- Repulse: read, write, exclude
    OR (p.modulo = 'repulse' AND p.accion IN ('read', 'write', 'exclude'))
    -- Aprobaciones: read, approve, reject
    OR (p.modulo = 'aprobaciones' AND p.accion IN ('read', 'approve', 'reject'))
    -- Usuarios: read, assign_permissions, view_audit
    OR (p.modulo = 'usuarios' AND p.accion IN ('read', 'assign_permissions', 'view_audit'))
    -- Proyectos: read, write, config
    OR (p.modulo = 'proyectos' AND p.accion IN ('read', 'write', 'config'))
    -- Insights: read, export
    OR (p.modulo = 'insights')
    -- Reuniones: read_all, write, delete
    OR (p.modulo = 'reuniones' AND p.accion IN ('read_all', 'write', 'delete'))
    -- Cross: ver_todos_vendedores, ejecutar_campana_masiva
    OR (p.modulo = 'cross' AND p.accion IN ('ver_todos_vendedores', 'ejecutar_campana_masiva'))
  )
ON CONFLICT DO NOTHING;

-- ROL: VENDEDOR (13 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'vendedor'),
  p.id
FROM permisos p
WHERE p.activo = true
  AND (
    (p.modulo = 'leads' AND p.accion IN ('read', 'write'))
    OR (p.modulo = 'locales' AND p.accion IN ('read', 'cambiar_estado'))
    OR (p.modulo = 'ventas' AND p.accion IN ('read', 'write'))
    OR (p.modulo = 'control_pagos' AND p.accion IN ('read', 'write'))
    OR (p.modulo = 'comisiones' AND p.accion = 'read')
    OR (p.modulo = 'proyectos' AND p.accion = 'read')
    OR (p.modulo = 'reuniones' AND p.accion IN ('read', 'write'))
  )
ON CONFLICT DO NOTHING;

-- ROL: VENDEDOR_CASETA (5 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'vendedor_caseta'),
  p.id
FROM permisos p
WHERE p.activo = true
  AND (
    (p.modulo = 'locales' AND p.accion IN ('read', 'cambiar_estado'))
    OR (p.modulo = 'control_pagos' AND p.accion IN ('read', 'write'))
    OR (p.modulo = 'proyectos' AND p.accion = 'read')
  )
ON CONFLICT DO NOTHING;

-- ROL: FINANZAS (18 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'finanzas'),
  p.id
FROM permisos p
WHERE p.activo = true
  AND (
    (p.modulo = 'locales' AND p.accion = 'read')
    OR (p.modulo = 'control_pagos')
    OR (p.modulo = 'aprobaciones' AND p.accion IN ('read', 'approve', 'reject'))
    OR (p.modulo = 'proyectos' AND p.accion = 'read')
    OR (p.modulo = 'comisiones' AND p.accion IN ('read_all', 'export'))
  )
ON CONFLICT DO NOTHING;

-- ROL: COORDINADOR (11 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'coordinador'),
  p.id
FROM permisos p
WHERE p.activo = true
  AND (
    (p.modulo = 'leads' AND p.accion = 'read')
    OR (p.modulo = 'locales' AND p.accion IN ('read', 'write', 'cambiar_estado', 'export'))
    OR (p.modulo = 'control_pagos' AND p.accion = 'read')
    OR (p.modulo = 'proyectos' AND p.accion = 'read')
    OR (p.modulo = 'reuniones' AND p.accion IN ('read_all', 'write'))
  )
ON CONFLICT DO NOTHING;

-- ROL: MARKETING (15 permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'marketing'),
  p.id
FROM permisos p
WHERE p.activo = true
  AND (
    (p.modulo = 'leads' AND p.accion IN ('read', 'read_all', 'export', 'import'))
    OR (p.modulo = 'locales' AND p.accion = 'read')
    OR (p.modulo = 'repulse')
    OR (p.modulo = 'proyectos' AND p.accion = 'read')
    OR (p.modulo = 'insights')
    OR (p.modulo = 'cross' AND p.accion = 'ver_todos_vendedores')
  )
ON CONFLICT DO NOTHING;

-- ROL: GERENCIA (51 permisos - hereda de jefe_ventas + adicionales)
-- Primero copiamos todos los permisos de jefe_ventas
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'gerencia'),
  rp.permiso_id
FROM rol_permisos rp
WHERE rp.rol_id = (SELECT id FROM roles WHERE nombre = 'jefe_ventas')
ON CONFLICT DO NOTHING;

-- Agregamos permisos adicionales exclusivos de gerencia
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT
  (SELECT id FROM roles WHERE nombre = 'gerencia'),
  p.id
FROM permisos p
WHERE p.activo = true
  AND (
    (p.modulo = 'usuarios' AND p.accion IN ('write', 'delete', 'change_role'))
    OR (p.modulo = 'proyectos' AND p.accion = 'delete')
    OR (p.modulo = 'configuracion' AND p.accion = 'read')
    OR (p.modulo = 'leads' AND p.accion = 'delete')
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PARTE 8: MIGRAR USUARIOS EXISTENTES
-- ============================================================================

-- Poblar columna rol_id basándose en columna rol legacy
UPDATE usuarios
SET rol_id = (
  SELECT id FROM roles WHERE roles.nombre = usuarios.rol
)
WHERE rol_id IS NULL
  AND rol IN ('admin', 'gerencia', 'jefe_ventas', 'marketing', 'finanzas', 'coordinador', 'vendedor', 'vendedor_caseta');

-- ============================================================================
-- PARTE 9: POLITICAS RLS
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rol_permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_permisos_extra ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos_audit ENABLE ROW LEVEL SECURITY;

-- Políticas: roles
DROP POLICY IF EXISTS "usuarios_ven_roles_activos" ON roles;
CREATE POLICY "usuarios_ven_roles_activos"
  ON roles FOR SELECT
  USING (auth.uid() IS NOT NULL AND activo = true);

DROP POLICY IF EXISTS "solo_admin_crea_roles" ON roles;
CREATE POLICY "solo_admin_crea_roles"
  ON roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND (rol = 'admin' OR rol_id = (SELECT id FROM roles WHERE nombre = 'admin'))
    )
  );

-- Políticas: permisos
DROP POLICY IF EXISTS "usuarios_ven_permisos_activos" ON permisos;
CREATE POLICY "usuarios_ven_permisos_activos"
  ON permisos FOR SELECT
  USING (auth.uid() IS NOT NULL AND activo = true);

DROP POLICY IF EXISTS "solo_admin_crea_permisos" ON permisos;
CREATE POLICY "solo_admin_crea_permisos"
  ON permisos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND (rol = 'admin' OR rol_id = (SELECT id FROM roles WHERE nombre = 'admin'))
    )
  );

-- Políticas: rol_permisos
DROP POLICY IF EXISTS "usuarios_ven_rol_permisos" ON rol_permisos;
CREATE POLICY "usuarios_ven_rol_permisos"
  ON rol_permisos FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "solo_admin_asigna_permisos_a_roles" ON rol_permisos;
CREATE POLICY "solo_admin_asigna_permisos_a_roles"
  ON rol_permisos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND (rol = 'admin' OR rol_id = (SELECT id FROM roles WHERE nombre = 'admin'))
    )
  );

-- Políticas: usuario_permisos_extra
DROP POLICY IF EXISTS "usuarios_ven_permisos_extra_propios_o_admin" ON usuario_permisos_extra;
CREATE POLICY "usuarios_ven_permisos_extra_propios_o_admin"
  ON usuario_permisos_extra FOR SELECT
  USING (
    usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND (rol = 'admin' OR rol_id = (SELECT id FROM roles WHERE nombre = 'admin'))
    )
  );

DROP POLICY IF EXISTS "admin_y_jefe_ventas_otorgan_permisos_extra" ON usuario_permisos_extra;
CREATE POLICY "admin_y_jefe_ventas_otorgan_permisos_extra"
  ON usuario_permisos_extra FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND (
          rol IN ('admin', 'jefe_ventas')
          OR rol_id IN (SELECT id FROM roles WHERE nombre IN ('admin', 'jefe_ventas'))
        )
    )
  );

-- Políticas: permisos_audit
DROP POLICY IF EXISTS "solo_autorizados_ven_audit_log" ON permisos_audit;
CREATE POLICY "solo_autorizados_ven_audit_log"
  ON permisos_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      JOIN rol_permisos rp ON r.id = rp.rol_id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE u.id = auth.uid()
        AND p.modulo = 'usuarios'
        AND p.accion = 'view_audit'
        AND p.activo = true
    )
  );

DROP POLICY IF EXISTS "sistema_inserta_en_audit_log" ON permisos_audit;
CREATE POLICY "sistema_inserta_en_audit_log"
  ON permisos_audit FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- PARTE 10: VALIDACIONES Y REPORTES
-- ============================================================================

-- Verificar migración de usuarios
DO $$
DECLARE
  v_total_usuarios INTEGER;
  v_usuarios_migrados INTEGER;
  v_usuarios_pendientes INTEGER;
  v_total_roles INTEGER;
  v_total_permisos INTEGER;
  v_total_relaciones INTEGER;
BEGIN
  -- Contar usuarios
  SELECT COUNT(*) INTO v_total_usuarios FROM usuarios;
  SELECT COUNT(*) INTO v_usuarios_migrados FROM usuarios WHERE rol_id IS NOT NULL;
  SELECT COUNT(*) INTO v_usuarios_pendientes FROM usuarios WHERE rol_id IS NULL;

  -- Contar roles y permisos
  SELECT COUNT(*) INTO v_total_roles FROM roles WHERE activo = true;
  SELECT COUNT(*) INTO v_total_permisos FROM permisos WHERE activo = true;
  SELECT COUNT(*) INTO v_total_relaciones FROM rol_permisos;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRACION RBAC COMPLETADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Roles creados: %', v_total_roles;
  RAISE NOTICE 'Permisos creados: %', v_total_permisos;
  RAISE NOTICE 'Relaciones rol-permiso: %', v_total_relaciones;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total usuarios: %', v_total_usuarios;
  RAISE NOTICE 'Usuarios migrados: %', v_usuarios_migrados;
  RAISE NOTICE 'Usuarios pendientes: %', v_usuarios_pendientes;
  RAISE NOTICE '========================================';

  IF v_usuarios_pendientes > 0 THEN
    RAISE WARNING 'Hay % usuarios sin rol_id. Revisar manualmente.', v_usuarios_pendientes;
  END IF;

  IF v_total_roles <> 8 THEN
    RAISE WARNING 'Se esperaban 8 roles, se encontraron %', v_total_roles;
  END IF;

  IF v_total_permisos <> 62 THEN
    RAISE WARNING 'Se esperaban 62 permisos, se encontraron %', v_total_permisos;
  END IF;

  RAISE NOTICE 'Migracion completada exitosamente!';
END $$;

COMMIT;
