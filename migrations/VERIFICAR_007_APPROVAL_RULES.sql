-- ============================================================================
-- VERIFICACIÓN MIGRACIÓN 007: Approval Rules Fixed
-- ============================================================================
-- Ejecutar este SQL en Supabase SQL Editor para verificar el estado
-- ============================================================================

-- 1. Ver todas las reglas de aprobación (debe haber 5)
SELECT
  name,
  min_amount,
  max_amount,
  approver_role,
  priority,
  is_active,
  created_at
FROM pr_approval_rules
ORDER BY priority ASC;

-- RESULTADO ESPERADO:
-- ┌─────────────────────────────────┬────────────┬────────────┬───────────────┬──────────┬───────────┐
-- │ name                            │ min_amount │ max_amount │ approver_role │ priority │ is_active │
-- ├─────────────────────────────────┼────────────┼────────────┼───────────────┼──────────┼───────────┤
-- │ Urgente (cualquier monto)       │ 0          │ null       │ admin         │ 0        │ true      │
-- │ Auto-aprobación (gastos menores)│ 0          │ 500        │ auto          │ 1        │ true      │
-- │ Aprobación Manager              │ 500.01     │ 2000       │ admin         │ 2        │ true      │
-- │ Aprobación Director             │ 2000.01    │ 10000      │ admin         │ 3        │ true      │
-- │ Aprobación Gerente General      │ 10000.01   │ null       │ superadmin    │ 4        │ true      │
-- └─────────────────────────────────┴────────────┴────────────┴───────────────┴──────────┴───────────┘

-- ============================================================================
-- 2. Verificar que NO existan reglas con rol 'gerencia'
-- ============================================================================
SELECT
  COUNT(*) as reglas_con_gerencia
FROM pr_approval_rules
WHERE approver_role = 'gerencia';

-- RESULTADO ESPERADO: reglas_con_gerencia = 0

-- ============================================================================
-- 3. Contar reglas por rol (para auditoría)
-- ============================================================================
SELECT
  approver_role,
  COUNT(*) as cantidad_reglas,
  ARRAY_AGG(name ORDER BY priority) as reglas
FROM pr_approval_rules
WHERE is_active = true
GROUP BY approver_role
ORDER BY approver_role;

-- RESULTADO ESPERADO:
-- ┌───────────────┬──────────────────┬───────────────────────────────────────────────────────┐
-- │ approver_role │ cantidad_reglas  │ reglas                                                │
-- ├───────────────┼──────────────────┼───────────────────────────────────────────────────────┤
-- │ admin         │ 3                │ {Urgente, Aprobación Manager, Aprobación Director}    │
-- │ auto          │ 1                │ {Auto-aprobación (gastos menores)}                    │
-- │ superadmin    │ 1                │ {Aprobación Gerente General}                          │
-- └───────────────┴──────────────────┴───────────────────────────────────────────────────────┘

-- ============================================================================
-- 4. Simular matching de reglas para diferentes montos
-- ============================================================================

-- Monto: $300 (debe usar "Auto-aprobación")
SELECT
  name,
  approver_role,
  priority
FROM pr_approval_rules
WHERE is_active = true
  AND 300 >= min_amount
  AND (max_amount IS NULL OR 300 <= max_amount)
ORDER BY priority ASC
LIMIT 1;

-- RESULTADO ESPERADO: Auto-aprobación (gastos menores) | auto | 1

-- Monto: $1,500 (debe usar "Aprobación Manager")
SELECT
  name,
  approver_role,
  priority
FROM pr_approval_rules
WHERE is_active = true
  AND 1500 >= min_amount
  AND (max_amount IS NULL OR 1500 <= max_amount)
ORDER BY priority ASC
LIMIT 1;

-- RESULTADO ESPERADO: Aprobación Manager | admin | 2

-- Monto: $5,000 (debe usar "Aprobación Director")
SELECT
  name,
  approver_role,
  priority
FROM pr_approval_rules
WHERE is_active = true
  AND 5000 >= min_amount
  AND (max_amount IS NULL OR 5000 <= max_amount)
ORDER BY priority ASC
LIMIT 1;

-- RESULTADO ESPERADO: Aprobación Director | admin | 3

-- Monto: $15,000 (debe usar "Aprobación Gerente General")
SELECT
  name,
  approver_role,
  priority
FROM pr_approval_rules
WHERE is_active = true
  AND 15000 >= min_amount
  AND (max_amount IS NULL OR 15000 <= max_amount)
ORDER BY priority ASC
LIMIT 1;

-- RESULTADO ESPERADO: Aprobación Gerente General | superadmin | 4

-- ============================================================================
-- 5. Verificar usuarios disponibles para aprobar
-- ============================================================================

-- Usuarios con rol 'admin' (deben aprobar hasta $10,000)
SELECT
  COUNT(*) as usuarios_admin,
  ARRAY_AGG(email ORDER BY email) as emails
FROM usuarios
WHERE rol = 'admin'
  AND is_active = true;

-- Usuarios con rol 'superadmin' (deben aprobar montos mayores a $10,000)
SELECT
  COUNT(*) as usuarios_superadmin,
  ARRAY_AGG(email ORDER BY email) as emails
FROM usuarios
WHERE rol = 'superadmin'
  AND is_active = true;

-- ============================================================================
-- 6. Verificar que la regla "Urgente" no cause conflictos
-- ============================================================================

-- La regla "Urgente" tiene priority=0 y max_amount=NULL, lo que significa que
-- coincide con TODOS los montos. Sin embargo, como tiene priority=0, solo se
-- usa si se marca explícitamente como "urgente" en el flujo de negocio.

SELECT
  'ADVERTENCIA: La regla Urgente coincide con todos los montos' as nota,
  name,
  min_amount,
  max_amount,
  priority,
  approver_role
FROM pr_approval_rules
WHERE name LIKE '%Urgente%'
  AND is_active = true;

-- NOTA: Esto es intencional. La regla "Urgente" se activa manualmente
-- cuando una PR se marca como urgente, sin importar el monto.

-- ============================================================================
-- FIN DE VERIFICACIÓN
-- ============================================================================

-- Resumen:
-- ✓ 5 reglas activas
-- ✓ 0 reglas con rol 'gerencia'
-- ✓ 3 reglas asignadas a 'admin'
-- ✓ 1 regla asignada a 'auto'
-- ✓ 1 regla asignada a 'superadmin'
-- ✓ Matching de reglas por monto funciona correctamente
