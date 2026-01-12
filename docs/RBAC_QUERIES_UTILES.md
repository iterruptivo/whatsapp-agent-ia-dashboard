# Queries Útiles - Sistema RBAC

> **Fecha:** 11 Enero 2026
> **Proyecto:** EcoPlaza Dashboard - Sistema de Permisos Granulares

---

## 1. Consultas de Verificación

### 1.1 Ver todos los roles con sus jerarquías

```sql
SELECT nombre, descripcion, jerarquia, activo
FROM roles
ORDER BY jerarquia, nombre;
```

**Resultado esperado:** 8 roles (admin, gerencia, jefe_ventas, marketing, finanzas, coordinador, vendedor, vendedor_caseta)

### 1.2 Ver permisos por módulo

```sql
SELECT
  modulo,
  COUNT(*) as total_permisos,
  STRING_AGG(accion, ', ' ORDER BY accion) as acciones
FROM permisos
WHERE activo = true
GROUP BY modulo
ORDER BY total_permisos DESC, modulo;
```

**Resultado esperado:** 62 permisos distribuidos en 13 módulos

### 1.3 Ver permisos asignados a un rol específico

```sql
-- Ejemplo: Ver permisos de jefe_ventas
SELECT
  p.modulo,
  p.accion,
  p.modulo || ':' || p.accion AS permiso_completo,
  p.descripcion
FROM roles r
JOIN rol_permisos rp ON r.id = rp.rol_id
JOIN permisos p ON rp.permiso_id = p.id
WHERE r.nombre = 'jefe_ventas'
  AND r.activo = true
  AND p.activo = true
ORDER BY p.modulo, p.accion;
```

### 1.4 Matriz completa rol-permisos

```sql
SELECT
  r.nombre AS rol,
  r.jerarquia,
  COUNT(rp.permiso_id) AS total_permisos,
  STRING_AGG(DISTINCT p.modulo, ', ' ORDER BY p.modulo) AS modulos
FROM roles r
LEFT JOIN rol_permisos rp ON r.id = rp.rol_id
LEFT JOIN permisos p ON rp.permiso_id = p.id AND p.activo = true
WHERE r.activo = true
GROUP BY r.nombre, r.jerarquia
ORDER BY total_permisos DESC;
```

---

## 2. Consultas de Usuarios

### 2.1 Ver usuarios con sus roles

```sql
SELECT
  u.email,
  u.nombre,
  u.rol AS rol_legacy,
  r.nombre AS rol_nuevo,
  r.jerarquia
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
WHERE u.activo = true
ORDER BY r.jerarquia, u.nombre;
```

### 2.2 Ver permisos efectivos de un usuario

```sql
-- Usando la función get_permisos_usuario()
SELECT
  modulo,
  accion,
  modulo || ':' || accion AS permiso_completo,
  descripcion,
  origen
FROM get_permisos_usuario(
  (SELECT id FROM usuarios WHERE email = 'alonso@ecoplaza.com')
)
ORDER BY modulo, accion;
```

### 2.3 Ver todos los usuarios de un rol

```sql
SELECT
  u.nombre,
  u.email,
  u.activo
FROM usuarios u
JOIN roles r ON u.rol_id = r.id
WHERE r.nombre = 'vendedor'
ORDER BY u.nombre;
```

---

## 3. Validación de Permisos

### 3.1 Verificar si usuario tiene permiso específico

```sql
-- Ejemplo: ¿Puede alonso@ecoplaza.com eliminar leads?
SELECT check_permiso(
  (SELECT id FROM usuarios WHERE email = 'alonso@ecoplaza.com'),
  'leads',
  'delete'
) AS tiene_permiso;
```

**Resultado esperado:** `false` (vendedor no puede eliminar leads)

### 3.2 Verificar múltiples permisos de un usuario

```sql
WITH usuario_actual AS (
  SELECT id FROM usuarios WHERE email = 'gerencia@ecoplaza.com'
)
SELECT
  'leads:read' AS permiso,
  check_permiso(id, 'leads', 'read') AS tiene
FROM usuario_actual
UNION ALL
SELECT
  'leads:delete',
  check_permiso(id, 'leads', 'delete')
FROM usuario_actual
UNION ALL
SELECT
  'usuarios:write',
  check_permiso(id, 'usuarios', 'write')
FROM usuario_actual;
```

### 3.3 Comparar permisos entre dos roles

```sql
WITH permisos_jefe AS (
  SELECT p.modulo || ':' || p.accion AS permiso
  FROM rol_permisos rp
  JOIN permisos p ON rp.permiso_id = p.id
  WHERE rp.rol_id = (SELECT id FROM roles WHERE nombre = 'jefe_ventas')
),
permisos_vendedor AS (
  SELECT p.modulo || ':' || p.accion AS permiso
  FROM rol_permisos rp
  JOIN permisos p ON rp.permiso_id = p.id
  WHERE rp.rol_id = (SELECT id FROM roles WHERE nombre = 'vendedor')
)
SELECT
  'Solo Jefe Ventas' AS categoria,
  COUNT(*) AS total
FROM permisos_jefe
WHERE permiso NOT IN (SELECT permiso FROM permisos_vendedor)
UNION ALL
SELECT
  'Ambos roles',
  COUNT(*)
FROM permisos_jefe
WHERE permiso IN (SELECT permiso FROM permisos_vendedor)
UNION ALL
SELECT
  'Solo Vendedor',
  COUNT(*)
FROM permisos_vendedor
WHERE permiso NOT IN (SELECT permiso FROM permisos_jefe);
```

---

## 4. Permission Sets (Permisos Extra)

### 4.1 Otorgar permiso extra a usuario

```sql
-- Ejemplo: Dar permiso temporal de eliminar leads a un vendedor
INSERT INTO usuario_permisos_extra (
  usuario_id,
  permiso_id,
  otorgado_por,
  motivo,
  fecha_expiracion
) VALUES (
  (SELECT id FROM usuarios WHERE email = 'alonso@ecoplaza.com'),
  (SELECT id FROM permisos WHERE modulo = 'leads' AND accion = 'delete'),
  (SELECT id FROM usuarios WHERE email = 'gerencia@ecoplaza.com'),
  'Permiso temporal durante vacaciones de jefe de ventas',
  NOW() + INTERVAL '7 days'
);
```

### 4.2 Ver permisos extra activos

```sql
SELECT
  u.nombre AS usuario,
  u.email,
  p.modulo || ':' || p.accion AS permiso_extra,
  upe.motivo,
  upe.fecha_otorgado,
  upe.fecha_expiracion,
  otorgado.nombre AS otorgado_por
FROM usuario_permisos_extra upe
JOIN usuarios u ON upe.usuario_id = u.id
JOIN permisos p ON upe.permiso_id = p.id
JOIN usuarios otorgado ON upe.otorgado_por = otorgado.id
WHERE upe.activo = true
  AND (upe.fecha_expiracion IS NULL OR upe.fecha_expiracion > NOW())
ORDER BY upe.fecha_otorgado DESC;
```

### 4.3 Revocar permiso extra

```sql
-- Desactivar permiso extra específico
UPDATE usuario_permisos_extra
SET activo = false
WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'alonso@ecoplaza.com')
  AND permiso_id = (SELECT id FROM permisos WHERE modulo = 'leads' AND accion = 'delete');
```

---

## 5. Auditoría

### 5.1 Ver últimos cambios de permisos

```sql
SELECT
  pa.created_at,
  pa.accion,
  u_afectado.nombre AS usuario_afectado,
  u_afectado.email AS email_afectado,
  u_realizado.nombre AS realizado_por,
  pa.tabla_afectada,
  pa.valores_antes,
  pa.valores_despues
FROM permisos_audit pa
LEFT JOIN usuarios u_afectado ON pa.usuario_id = u_afectado.id
JOIN usuarios u_realizado ON pa.realizado_por = u_realizado.id
ORDER BY pa.created_at DESC
LIMIT 20;
```

### 5.2 Ver auditoría de un usuario específico

```sql
SELECT
  pa.created_at,
  pa.accion,
  pa.tabla_afectada,
  u_realizado.nombre AS realizado_por,
  pa.valores_antes,
  pa.valores_despues,
  pa.ip_address
FROM permisos_audit pa
JOIN usuarios u_realizado ON pa.realizado_por = u_realizado.id
WHERE pa.usuario_id = (SELECT id FROM usuarios WHERE email = 'alonso@ecoplaza.com')
ORDER BY pa.created_at DESC;
```

---

## 6. Consultas de Mantenimiento

### 6.1 Ver permisos expirados (limpiar)

```sql
SELECT
  u.email,
  p.modulo || ':' || p.accion AS permiso,
  upe.fecha_expiracion,
  upe.activo
FROM usuario_permisos_extra upe
JOIN usuarios u ON upe.usuario_id = u.id
JOIN permisos p ON upe.permiso_id = p.id
WHERE upe.fecha_expiracion < NOW()
  AND upe.activo = true;
```

### 6.2 Desactivar permisos expirados

```sql
UPDATE usuario_permisos_extra
SET activo = false
WHERE fecha_expiracion < NOW()
  AND activo = true;
```

### 6.3 Ver usuarios sin rol_id (sin migrar)

```sql
SELECT
  id,
  email,
  nombre,
  rol AS rol_legacy
FROM usuarios
WHERE rol_id IS NULL
  AND activo = true;
```

### 6.4 Migrar usuarios pendientes manualmente

```sql
-- Si hay usuarios sin rol_id, migrarlos
UPDATE usuarios
SET rol_id = (SELECT id FROM roles WHERE roles.nombre = usuarios.rol)
WHERE rol_id IS NULL
  AND rol IN ('admin', 'gerencia', 'jefe_ventas', 'marketing', 'finanzas', 'coordinador', 'vendedor', 'vendedor_caseta');
```

---

## 7. Estadísticas y Reportes

### 7.1 Distribución de usuarios por rol

```sql
SELECT
  r.nombre AS rol,
  r.jerarquia,
  COUNT(u.id) AS total_usuarios
FROM roles r
LEFT JOIN usuarios u ON r.id = u.rol_id AND u.activo = true
GROUP BY r.nombre, r.jerarquia
ORDER BY r.jerarquia;
```

### 7.2 Permisos más otorgados (Permission Sets)

```sql
SELECT
  p.modulo || ':' || p.accion AS permiso,
  COUNT(upe.id) AS veces_otorgado
FROM usuario_permisos_extra upe
JOIN permisos p ON upe.permiso_id = p.id
WHERE upe.activo = true
GROUP BY p.modulo, p.accion
ORDER BY veces_otorgado DESC
LIMIT 10;
```

### 7.3 Actividad de auditoría por usuario (quién hace más cambios)

```sql
SELECT
  u.nombre,
  u.email,
  COUNT(pa.id) AS total_acciones
FROM permisos_audit pa
JOIN usuarios u ON pa.realizado_por = u.id
GROUP BY u.nombre, u.email
ORDER BY total_acciones DESC
LIMIT 10;
```

---

## 8. Testing y Debugging

### 8.1 Simular check_permiso para todos los roles

```sql
WITH roles_list AS (
  SELECT DISTINCT nombre FROM roles WHERE activo = true
),
test_cases AS (
  SELECT 'leads' AS modulo, 'read' AS accion
  UNION ALL SELECT 'leads', 'delete'
  UNION ALL SELECT 'usuarios', 'write'
  UNION ALL SELECT 'control_pagos', 'verify'
)
SELECT
  r.nombre AS rol,
  t.modulo || ':' || t.accion AS permiso,
  check_permiso(
    (SELECT id FROM usuarios WHERE rol_id = (SELECT id FROM roles WHERE nombre = r.nombre) LIMIT 1),
    t.modulo,
    t.accion
  ) AS tiene_permiso
FROM roles_list r
CROSS JOIN test_cases t
ORDER BY r.nombre, t.modulo, t.accion;
```

### 8.2 Ver vista consolidada para un usuario

```sql
SELECT
  usuario_id,
  email,
  nombre,
  rol_legacy,
  rol_nombre,
  rol_jerarquia,
  modulo,
  accion,
  origen_permiso,
  fecha_expiracion
FROM user_effective_permissions
WHERE email = 'alonso@ecoplaza.com'
ORDER BY modulo, accion;
```

---

## 9. Queries de Performance

### 9.1 Analizar performance de check_permiso()

```sql
EXPLAIN ANALYZE
SELECT check_permiso(
  (SELECT id FROM usuarios WHERE email = 'alonso@ecoplaza.com'),
  'leads',
  'read'
);
```

**Resultado esperado:** < 5ms

### 9.2 Ver índices de tablas RBAC

```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('roles', 'permisos', 'rol_permisos', 'usuario_permisos_extra', 'permisos_audit')
ORDER BY tablename, indexname;
```

---

## 10. Queries de Administración

### 10.1 Crear nuevo permiso

```sql
INSERT INTO permisos (modulo, accion, descripcion, es_sistema)
VALUES ('nuevo_modulo', 'nueva_accion', 'Descripción del permiso', false)
ON CONFLICT (modulo, accion) DO NOTHING
RETURNING id, modulo, accion;
```

### 10.2 Asignar permiso a rol

```sql
INSERT INTO rol_permisos (rol_id, permiso_id)
VALUES (
  (SELECT id FROM roles WHERE nombre = 'jefe_ventas'),
  (SELECT id FROM permisos WHERE modulo = 'nuevo_modulo' AND accion = 'nueva_accion')
)
ON CONFLICT DO NOTHING;
```

### 10.3 Desactivar permiso (soft delete)

```sql
UPDATE permisos
SET activo = false
WHERE modulo = 'modulo' AND accion = 'accion';
```

### 10.4 Crear nuevo rol

```sql
INSERT INTO roles (nombre, descripcion, es_sistema, jerarquia)
VALUES ('nuevo_rol', 'Descripción del rol', false, 70)
ON CONFLICT (nombre) DO NOTHING
RETURNING id, nombre;
```

---

## 11. Validaciones Importantes

### 11.1 Verificar que vendedor y vendedor_caseta tengan jerarquía 60

```sql
SELECT nombre, jerarquia
FROM roles
WHERE nombre IN ('vendedor', 'vendedor_caseta');
```

**Resultado esperado:**
```
vendedor          | 60
vendedor_caseta   | 60
```

### 11.2 Contar permisos totales (debe ser 62)

```sql
SELECT COUNT(*) AS total_permisos
FROM permisos
WHERE activo = true;
```

**Resultado esperado:** 62

### 11.3 Verificar que admin tenga todos los permisos

```sql
SELECT COUNT(*) AS permisos_admin
FROM rol_permisos
WHERE rol_id = (SELECT id FROM roles WHERE nombre = 'admin');
```

**Resultado esperado:** 62

---

## 12. Rollback (Si es necesario)

### 12.1 Ver última migración aplicada

```sql
SELECT * FROM schema_migrations
ORDER BY version DESC
LIMIT 1;
```

### 12.2 Desactivar RBAC sin eliminar datos

```sql
-- Opción 1: Desactivar todos los roles (no recomendado)
UPDATE roles SET activo = false;

-- Opción 2: Mejor usar feature flag en .env
-- ENABLE_RBAC=false
```

---

**Nota:** Todas estas queries son seguras de ejecutar en producción. Usa transacciones (`BEGIN; ... ROLLBACK;`) al probar modificaciones.

**Última actualización:** 11 Enero 2026
