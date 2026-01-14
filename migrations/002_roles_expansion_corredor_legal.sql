-- ============================================================================
-- MIGRACIÓN: Roles y Permisos para Módulo Expansión
-- ============================================================================
-- Fecha: 12 Enero 2026
-- Descripción: Inserta roles 'corredor' y 'legal', módulo 'expansion' y permisos
-- ============================================================================

-- ============================================================================
-- PASO 1: Insertar nuevos roles en tabla 'roles'
-- ============================================================================

-- Rol: Corredor (broker externo)
INSERT INTO roles (nombre, descripcion, es_sistema, activo)
VALUES (
  'corredor',
  'Corredor externo - busca terrenos para EcoPlaza',
  true,
  true
)
ON CONFLICT (nombre) DO NOTHING;

-- Rol: Legal (revisa y aprueba registros)
INSERT INTO roles (nombre, descripcion, es_sistema, activo)
VALUES (
  'legal',
  'Área legal - aprueba registros de corredores',
  true,
  true
)
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================================
-- PASO 2: Insertar permisos del módulo 'expansion'
-- ============================================================================

-- expansion:read - Corredor ve su registro
INSERT INTO permisos (modulo, accion, descripcion)
VALUES ('expansion', 'read', 'Ver su propio registro de corredor')
ON CONFLICT (modulo, accion) DO NOTHING;

-- expansion:read_all - Admin/Legal ve todos los registros
INSERT INTO permisos (modulo, accion, descripcion)
VALUES ('expansion', 'read_all', 'Ver todos los registros de corredores')
ON CONFLICT (modulo, accion) DO NOTHING;

-- expansion:write - Corredor crea/edita su registro
INSERT INTO permisos (modulo, accion, descripcion)
VALUES ('expansion', 'write', 'Crear y editar registro de corredor')
ON CONFLICT (modulo, accion) DO NOTHING;

-- expansion:approve - Legal/Admin aprueba registros
INSERT INTO permisos (modulo, accion, descripcion)
VALUES ('expansion', 'approve', 'Aprobar registro de corredor')
ON CONFLICT (modulo, accion) DO NOTHING;

-- expansion:reject - Legal/Admin rechaza registros
INSERT INTO permisos (modulo, accion, descripcion)
VALUES ('expansion', 'reject', 'Rechazar registro de corredor')
ON CONFLICT (modulo, accion) DO NOTHING;

-- expansion:observe - Legal/Admin observa registros
INSERT INTO permisos (modulo, accion, descripcion)
VALUES ('expansion', 'observe', 'Agregar observaciones a registro de corredor')
ON CONFLICT (modulo, accion) DO NOTHING;

-- ============================================================================
-- PASO 3: Asignar permisos al rol 'corredor'
-- ============================================================================

-- El corredor solo puede ver y editar su propio registro
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'corredor'
AND p.modulo = 'expansion'
AND p.accion IN ('read', 'write')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- ============================================================================
-- PASO 4: Asignar permisos al rol 'legal'
-- ============================================================================

-- Legal puede ver todos, aprobar, rechazar y observar
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'legal'
AND p.modulo = 'expansion'
AND p.accion IN ('read', 'read_all', 'approve', 'reject', 'observe')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- ============================================================================
-- PASO 5: Asignar permisos de expansion a roles existentes
-- ============================================================================

-- superadmin: todos los permisos de expansion
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'superadmin'
AND p.modulo = 'expansion'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- admin: todos los permisos de expansion
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'admin'
AND p.modulo = 'expansion'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Mostrar roles creados
SELECT id, nombre, descripcion, es_sistema, activo
FROM roles
WHERE nombre IN ('corredor', 'legal')
ORDER BY nombre;

-- Mostrar permisos de expansion
SELECT id, modulo, accion, descripcion
FROM permisos
WHERE modulo = 'expansion'
ORDER BY accion;

-- Mostrar asignaciones de permisos
SELECT r.nombre as rol, p.modulo, p.accion
FROM rol_permisos rp
JOIN roles r ON r.id = rp.rol_id
JOIN permisos p ON p.id = rp.permiso_id
WHERE p.modulo = 'expansion'
ORDER BY r.nombre, p.accion;
