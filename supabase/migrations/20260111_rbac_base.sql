-- ============================================================================
-- MIGRACION RBAC - PARTE 1: TABLAS BASE
-- Fecha: 11 Enero 2026
-- Autor: DataDev (Database Architect)
-- Descripcion: Sistema RBAC granular con roles dinamicos y permission sets
-- ============================================================================

-- ============================================================================
-- TABLA: roles
-- Define los roles del sistema (admin, vendedor, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  es_sistema BOOLEAN NOT NULL DEFAULT false,
  jerarquia INTEGER NOT NULL DEFAULT 100,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices para roles
CREATE INDEX idx_roles_nombre ON roles(nombre);
CREATE INDEX idx_roles_activo ON roles(activo);
CREATE INDEX idx_roles_jerarquia ON roles(jerarquia);
CREATE INDEX idx_roles_es_sistema ON roles(es_sistema);

-- Comentarios
COMMENT ON TABLE roles IS 'Catálogo de roles del sistema (admin, vendedor, jefe_ventas, etc.)';
COMMENT ON COLUMN roles.nombre IS 'Nombre único del rol (ej: admin, vendedor, jefe_ventas)';
COMMENT ON COLUMN roles.es_sistema IS 'Si es true, no se puede editar/eliminar desde UI';
COMMENT ON COLUMN roles.jerarquia IS 'Orden jerárquico: menor = más permisos (admin=0, vendedor=100)';

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLA: permisos
-- Catálogo de permisos granulares por módulo y acción
-- ============================================================================
CREATE TABLE IF NOT EXISTS permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo VARCHAR(50) NOT NULL,
  accion VARCHAR(50) NOT NULL,
  descripcion TEXT,
  es_sistema BOOLEAN NOT NULL DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraint: combinación módulo+acción debe ser única
ALTER TABLE permisos
  ADD CONSTRAINT uk_permisos_modulo_accion UNIQUE (modulo, accion);

-- Indices para permisos
CREATE INDEX idx_permisos_modulo ON permisos(modulo);
CREATE INDEX idx_permisos_accion ON permisos(accion);
CREATE INDEX idx_permisos_activo ON permisos(activo);
CREATE INDEX idx_permisos_es_sistema ON permisos(es_sistema);

-- Comentarios
COMMENT ON TABLE permisos IS 'Catálogo de permisos granulares (leads:read, leads:write, locales:admin, etc.)';
COMMENT ON COLUMN permisos.modulo IS 'Módulo del dashboard (leads, locales, usuarios, proyectos, finanzas, etc.)';
COMMENT ON COLUMN permisos.accion IS 'Acción permitida (read, write, admin, export, delete, approve, etc.)';
COMMENT ON COLUMN permisos.es_sistema IS 'Si es true, no se puede editar/eliminar desde UI';

-- ============================================================================
-- TABLA: rol_permisos
-- Relación N:N entre roles y permisos
-- ============================================================================
CREATE TABLE IF NOT EXISTS rol_permisos (
  rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permiso_id UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  PRIMARY KEY (rol_id, permiso_id)
);

-- Indices para rol_permisos
CREATE INDEX idx_rol_permisos_rol_id ON rol_permisos(rol_id);
CREATE INDEX idx_rol_permisos_permiso_id ON rol_permisos(permiso_id);
CREATE INDEX idx_rol_permisos_created_by ON rol_permisos(created_by);

-- Comentarios
COMMENT ON TABLE rol_permisos IS 'Relación N:N entre roles y permisos';

-- ============================================================================
-- TABLA: usuario_permisos_extra
-- Permission Sets: permisos adicionales por usuario (como Salesforce)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuario_permisos_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  permiso_id UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  otorgado_por UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  motivo TEXT,
  fecha_otorgado TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_expiracion TIMESTAMPTZ,
  activo BOOLEAN NOT NULL DEFAULT true
);

-- Constraint: un usuario no puede tener el mismo permiso extra duplicado activo
CREATE UNIQUE INDEX uk_usuario_permiso_activo
  ON usuario_permisos_extra(usuario_id, permiso_id)
  WHERE activo = true;

-- Indices para usuario_permisos_extra
CREATE INDEX idx_usuario_permisos_extra_usuario_id ON usuario_permisos_extra(usuario_id);
CREATE INDEX idx_usuario_permisos_extra_permiso_id ON usuario_permisos_extra(permiso_id);
CREATE INDEX idx_usuario_permisos_extra_otorgado_por ON usuario_permisos_extra(otorgado_por);
CREATE INDEX idx_usuario_permisos_extra_activo ON usuario_permisos_extra(activo);
CREATE INDEX idx_usuario_permisos_extra_fecha_expiracion ON usuario_permisos_extra(fecha_expiracion);

-- Comentarios
COMMENT ON TABLE usuario_permisos_extra IS 'Permission Sets: permisos adicionales otorgados a usuarios específicos (sobre los de su rol)';
COMMENT ON COLUMN usuario_permisos_extra.motivo IS 'Justificación del permiso extra (ej: "Reemplazo temporal de Jefe Ventas")';
COMMENT ON COLUMN usuario_permisos_extra.fecha_expiracion IS 'NULL = permanente, fecha = expira automáticamente';

-- ============================================================================
-- TABLA: permisos_audit
-- Auditoría de cambios en permisos
-- ============================================================================
CREATE TABLE IF NOT EXISTS permisos_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  accion VARCHAR(50) NOT NULL,
  tabla_afectada VARCHAR(50) NOT NULL,
  registro_id UUID,
  valores_antes JSONB,
  valores_despues JSONB,
  realizado_por UUID NOT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices para permisos_audit
CREATE INDEX idx_permisos_audit_usuario_id ON permisos_audit(usuario_id);
CREATE INDEX idx_permisos_audit_accion ON permisos_audit(accion);
CREATE INDEX idx_permisos_audit_tabla_afectada ON permisos_audit(tabla_afectada);
CREATE INDEX idx_permisos_audit_realizado_por ON permisos_audit(realizado_por);
CREATE INDEX idx_permisos_audit_created_at ON permisos_audit(created_at DESC);

-- Comentarios
COMMENT ON TABLE permisos_audit IS 'Auditoría de cambios en roles, permisos y asignaciones';
COMMENT ON COLUMN permisos_audit.accion IS 'Tipo de acción: role_created, role_updated, permission_granted, permission_revoked, etc.';
COMMENT ON COLUMN permisos_audit.tabla_afectada IS 'Tabla modificada: roles, permisos, rol_permisos, usuario_permisos_extra';

-- ============================================================================
-- TABLA: usuarios - AGREGAR COLUMNA rol_id
-- Migración gradual: mantener rol (legacy) y agregar rol_id (nuevo)
-- ============================================================================
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS rol_id UUID REFERENCES roles(id) ON DELETE RESTRICT;

CREATE INDEX idx_usuarios_rol_id ON usuarios(rol_id);

COMMENT ON COLUMN usuarios.rol IS 'LEGACY: Mantener durante migración, eliminar en v2';
COMMENT ON COLUMN usuarios.rol_id IS 'Nuevo sistema RBAC: referencia a tabla roles';

-- ============================================================================
-- FUNCION: check_permiso
-- Función para validar si un usuario tiene un permiso específico
-- Verifica: rol_permisos + usuario_permisos_extra
-- ============================================================================
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
  SELECT rol_id INTO v_rol_id FROM usuarios WHERE id = p_usuario_id;

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

  -- Si ya tiene el permiso por rol, retornar true
  IF v_tiene_permiso THEN
    RETURN true;
  END IF;

  -- Verificar permiso extra (Permission Set)
  SELECT EXISTS (
    SELECT 1
    FROM usuario_permisos_extra upe
    JOIN permisos p ON upe.permiso_id = p.id
    WHERE upe.usuario_id = p_usuario_id
      AND p.modulo = p_modulo
      AND p.accion = p_accion
      AND upe.activo = true
      AND p.activo = true
      AND (upe.fecha_expiracion IS NULL OR upe.fecha_expiracion > NOW())
  ) INTO v_tiene_permiso;

  RETURN v_tiene_permiso;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_permiso IS 'Valida si un usuario tiene un permiso específico (rol + permisos extra)';

-- ============================================================================
-- FUNCION: get_permisos_usuario
-- Retorna todos los permisos de un usuario (rol + extras activos)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_permisos_usuario(p_usuario_id UUID)
RETURNS TABLE (
  permiso_id UUID,
  modulo VARCHAR,
  accion VARCHAR,
  descripcion TEXT,
  origen VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  -- Permisos del rol
  SELECT
    p.id AS permiso_id,
    p.modulo,
    p.accion,
    p.descripcion,
    'rol'::VARCHAR AS origen
  FROM usuarios u
  JOIN rol_permisos rp ON u.rol_id = rp.rol_id
  JOIN permisos p ON rp.permiso_id = p.id
  WHERE u.id = p_usuario_id
    AND p.activo = true

  UNION

  -- Permisos extra
  SELECT
    p.id AS permiso_id,
    p.modulo,
    p.accion,
    p.descripcion,
    'extra'::VARCHAR AS origen
  FROM usuario_permisos_extra upe
  JOIN permisos p ON upe.permiso_id = p.id
  WHERE upe.usuario_id = p_usuario_id
    AND upe.activo = true
    AND p.activo = true
    AND (upe.fecha_expiracion IS NULL OR upe.fecha_expiracion > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_permisos_usuario IS 'Retorna todos los permisos de un usuario (rol + extras activos)';

-- ============================================================================
-- FUNCION: audit_log
-- Helper para registrar eventos en permisos_audit
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_log(
  p_usuario_id UUID,
  p_accion VARCHAR,
  p_tabla_afectada VARCHAR,
  p_registro_id UUID,
  p_valores_antes JSONB,
  p_valores_despues JSONB,
  p_realizado_por UUID,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO permisos_audit (
    usuario_id,
    accion,
    tabla_afectada,
    registro_id,
    valores_antes,
    valores_despues,
    realizado_por,
    ip_address,
    user_agent
  ) VALUES (
    p_usuario_id,
    p_accion,
    p_tabla_afectada,
    p_registro_id,
    p_valores_antes,
    p_valores_despues,
    p_realizado_por,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit_log IS 'Helper para registrar eventos de auditoría en permisos_audit';

-- ============================================================================
-- SUCCESS
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✓ Migración RBAC Parte 1 completada exitosamente';
  RAISE NOTICE '✓ Tablas creadas: roles, permisos, rol_permisos, usuario_permisos_extra, permisos_audit';
  RAISE NOTICE '✓ Funciones creadas: check_permiso, get_permisos_usuario, audit_log';
  RAISE NOTICE '✓ Siguiente paso: Ejecutar seed data con roles y permisos iniciales';
END $$;
