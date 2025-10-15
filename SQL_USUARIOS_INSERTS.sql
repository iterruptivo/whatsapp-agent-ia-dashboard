-- ============================================================================
-- SQL INSERTS FOR USUARIOS TABLE
-- EcoPlaza Dashboard - Supabase Authentication
-- ============================================================================
--
-- INSTRUCTIONS:
-- 1. First, create the 3 auth users in Supabase UI (see AUTH_SETUP_GUIDE.md)
-- 2. Copy the UUIDs from each newly created auth.users record
-- 3. Replace <UUID_GERENCIA>, <UUID_ALONSO>, <UUID_LEO> below with actual UUIDs
-- 4. Run this SQL in Supabase SQL Editor
--
-- ============================================================================

-- ============================================================================
-- USER 1: ADMIN (gerencia@ecoplaza.com)
-- ============================================================================
-- Role: admin
-- Access: Full dashboard (/) + operativo (/operativo)
-- vendedor_id: NULL (admins are not vendedores)

INSERT INTO usuarios (id, email, nombre, rol, vendedor_id, activo)
VALUES (
  'bb7d4dc5-b03d-43b5-acaf-cf7fe080081c',  -- ⚠️ REPLACE THIS with actual UUID from auth.users
  'gerencia@ecoplaza.com',
  'gerente gerente',
  'admin',
  NULL,
  true
);

-- ============================================================================
-- USER 2: VENDEDOR ALONSO (alonso@ecoplaza.com)
-- ============================================================================
-- Role: vendedor
-- Access: Only operativo dashboard (/operativo)
-- vendedor_id: 2b8dc336-3755-4097-8f6a-090b48719aaa (Alonso Palacios in vendedores table)

INSERT INTO usuarios (id, email, nombre, rol, vendedor_id, activo)
VALUES (
  '127e4596-2df6-4036-adcd-c4842311beca',  -- ⚠️ REPLACE THIS with actual UUID from auth.users
  'alonso@ecoplaza.com',
  'Alonso Palacios',
  'vendedor',
  '2b8dc336-3755-4097-8f6a-090b48719aaa',  -- Alonso's vendedor_id
  true
);

-- ============================================================================
-- USER 3: VENDEDOR LEO (leo@ecoplaza.com)
-- ============================================================================
-- Role: vendedor
-- Access: Only operativo dashboard (/operativo)
-- vendedor_id: 9d367391-e382-4314-bdc7-e5f882f6549d (Leo D Leon in vendedores table)

INSERT INTO usuarios (id, email, nombre, rol, vendedor_id, activo)
VALUES (
  '5899cfa2-85e0-4bec-9229-faf3952da0f1',  -- ⚠️ REPLACE THIS with actual UUID from auth.users
  'leo@ecoplaza.com',
  'Leo D Leon',
  'vendedor',
  '9d367391-e382-4314-bdc7-e5f882f6549d',  -- Leo's vendedor_id
  true
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Query 1: Verify all users were inserted correctly
SELECT
  u.id,
  u.email,
  u.nombre,
  u.rol,
  u.vendedor_id,
  v.nombre AS vendedor_nombre,
  u.activo,
  u.created_at
FROM usuarios u
LEFT JOIN vendedores v ON u.vendedor_id = v.id
ORDER BY u.rol DESC, u.email;

-- Expected result: 3 rows
-- 1. gerencia@ecoplaza.com | admin | NULL vendedor_id
-- 2. alonso@ecoplaza.com | vendedor | 2b8dc336-... | Alonso Palacios
-- 3. leo@ecoplaza.com | vendedor | 9d367391-... | Leo D Leon

-- ============================================================================

-- Query 2: Verify auth.users are linked correctly
SELECT
  au.id AS auth_user_id,
  au.email AS auth_email,
  au.confirmed_at,
  u.nombre AS usuario_nombre,
  u.rol,
  v.nombre AS vendedor_nombre
FROM auth.users au
LEFT JOIN usuarios u ON au.id = u.id
LEFT JOIN vendedores v ON u.vendedor_id = v.id
WHERE au.email IN ('gerencia@ecoplaza.com', 'alonso@ecoplaza.com', 'leo@ecoplaza.com')
ORDER BY u.rol DESC, au.email;

-- Expected result: 3 rows with confirmed_at NOT NULL
-- All users should have matching usuario_nombre

-- ============================================================================

-- Query 3: Check for any duplicate emails
SELECT email, COUNT(*)
FROM usuarios
GROUP BY email
HAVING COUNT(*) > 1;

-- Expected result: 0 rows (no duplicates)

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- If you need to delete these users and start over:

-- DELETE FROM usuarios WHERE email IN (
--   'gerencia@ecoplaza.com',
--   'alonso@ecoplaza.com',
--   'leo@ecoplaza.com'
-- );

-- Note: You'll also need to delete from auth.users in Supabase UI
-- (Authentication > Users > select user > Delete user)

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- 1. SECURITY:
--    - All passwords are currently "1234" for testing
--    - CHANGE PASSWORDS in production environment
--    - Use Supabase Auth UI to change passwords
--
-- 2. ROLES:
--    - 'admin': Full access to all dashboards
--    - 'vendedor': Limited to /operativo dashboard only
--
-- 3. VENDEDOR_ID:
--    - Only populated for users with rol = 'vendedor'
--    - Must match an existing record in vendedores table
--    - Used for "Mis Leads" filter in operativo dashboard
--
-- 4. ACTIVO FLAG:
--    - true: User can login
--    - false: User is deactivated (cannot login)
--    - Use this instead of deleting users (preserves audit trail)
--
-- 5. CONSTRAINTS:
--    - usuarios.id REFERENCES auth.users(id) - CASCADE DELETE
--    - usuarios.email UNIQUE - prevents duplicate emails
--    - usuarios.rol CHECK (rol IN ('admin', 'vendedor')) - only 2 roles allowed
--    - usuarios.vendedor_id REFERENCES vendedores(id) - foreign key
--
-- ============================================================================
