-- ============================================================
-- SQL INSERT para Anne (anne@ecoplaza.com)
-- Usuario creado en Supabase Auth: 1cfd4814-25cf-4a20-9302-8a2520c63072
-- Rol: vendedor
-- Fecha: 21 Octubre 2025
-- ============================================================

-- STEP 1: Insertar en tabla vendedores
-- Este INSERT crea el perfil de vendedor
INSERT INTO vendedores (nombre, telefono, activo)
VALUES ('Anne', '51999999999', TRUE);

-- STEP 2: Obtener el ID del vendedor recién creado
-- IMPORTANTE: Ejecutar esta query INMEDIATAMENTE después del INSERT anterior
-- Copiar el UUID que retorna esta query
SELECT id, nombre, telefono, activo
FROM vendedores
WHERE telefono = '51999999999'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================
-- STEP 3: Insertar en tabla usuarios
-- REEMPLAZAR <VENDEDOR_ID> con el UUID obtenido en STEP 2
-- ============================================================

INSERT INTO usuarios (id, email, nombre, rol, vendedor_id, activo)
VALUES (
  '1cfd4814-25cf-4a20-9302-8a2520c63072',  -- UUID del auth.users
  'anne@ecoplaza.com',                      -- Email
  'Anne',                                    -- Nombre
  'vendedor',                                -- Rol
  '<VENDEDOR_ID>',                           -- REEMPLAZAR con UUID de vendedores
  TRUE                                       -- Activo
);

-- ============================================================
-- STEP 4: VERIFICATION QUERIES
-- Ejecutar estas queries para verificar que todo está correcto
-- ============================================================

-- 4.1: Verificar que el vendedor fue creado
SELECT id, nombre, telefono, activo, created_at
FROM vendedores
WHERE telefono = '51999999999';

-- 4.2: Verificar que el usuario fue creado y linkéado
SELECT
  u.id AS usuario_id,
  u.email,
  u.nombre,
  u.rol,
  u.vendedor_id,
  v.nombre AS vendedor_nombre,
  v.telefono AS vendedor_telefono,
  u.activo
FROM usuarios u
LEFT JOIN vendedores v ON u.vendedor_id = v.id
WHERE u.email = 'anne@ecoplaza.com';

-- 4.3: Verificar que el auth user está linkéado correctamente
SELECT
  au.id AS auth_user_id,
  au.email AS auth_email,
  u.nombre AS usuario_nombre,
  u.rol,
  u.vendedor_id,
  v.nombre AS vendedor_nombre
FROM auth.users au
LEFT JOIN usuarios u ON au.id = u.id
LEFT JOIN vendedores v ON u.vendedor_id = v.id
WHERE au.email = 'anne@ecoplaza.com';

-- 4.4: Verificar todos los usuarios del sistema (para contexto)
SELECT
  u.id,
  u.email,
  u.nombre,
  u.rol,
  v.nombre AS vendedor_nombre,
  u.activo
FROM usuarios u
LEFT JOIN vendedores v ON u.vendedor_id = v.id
ORDER BY u.rol DESC, u.nombre ASC;

-- ============================================================
-- EXPECTED RESULTS
-- ============================================================
-- Query 4.1: Debe retornar 1 fila con Anne, telefono 51999999999
-- Query 4.2: Debe retornar 1 fila con email anne@ecoplaza.com, rol vendedor, vendedor_nombre Anne
-- Query 4.3: Debe retornar 1 fila con auth email anne@ecoplaza.com linkéado
-- Query 4.4: Debe mostrar 4 usuarios (gerencia, alonso, leo, anne)

-- ============================================================
-- ROLLBACK (si algo sale mal)
-- ============================================================
-- SOLO ejecutar si necesitas revertir los cambios

-- Eliminar de usuarios
-- DELETE FROM usuarios WHERE email = 'anne@ecoplaza.com';

-- Eliminar de vendedores
-- DELETE FROM vendedores WHERE telefono = '51999999999';

-- ============================================================
-- INSTRUCCIONES DE USO
-- ============================================================
-- 1. Ejecutar STEP 1 (INSERT vendedores)
-- 2. Ejecutar STEP 2 (SELECT para obtener VENDEDOR_ID)
-- 3. COPIAR el UUID retornado
-- 4. REEMPLAZAR <VENDEDOR_ID> en STEP 3 con el UUID copiado
-- 5. Ejecutar STEP 3 (INSERT usuarios)
-- 6. Ejecutar queries de verificación (STEP 4)
-- 7. Confirmar que Anne puede hacer login en el dashboard
-- ============================================================
