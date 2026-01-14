-- ============================================================================
-- MIGRACIÓN 007: Fix Approval Rules - Cambiar rol 'gerencia' a 'admin'
-- ============================================================================
-- Fecha: 13 Enero 2026
-- Problema: El rol 'gerencia' no existe en el sistema de roles
-- Error: "No se encontró aprobador disponible con rol: gerencia"
-- Solución: Cambiar 'gerencia' por 'admin' en las reglas de aprobación
-- ============================================================================

-- OPCIÓN 1: Cambiar 'gerencia' a 'admin' en todas las reglas
UPDATE pr_approval_rules
SET approver_role = 'admin'
WHERE approver_role = 'gerencia';

-- OPCIÓN 2 (Alternativa): Desactivar la regla "Urgente" que causa el problema
-- Esta regla tiene priority=0 y max_amount=NULL, lo que hace que coincida con TODOS los montos
-- Comentar si se prefiere la OPCIÓN 1
-- UPDATE pr_approval_rules
-- SET is_active = false
-- WHERE name = 'Urgente (cualquier monto)';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Ver las reglas actualizadas
SELECT
  name,
  min_amount,
  max_amount,
  approver_role,
  priority,
  is_active
FROM pr_approval_rules
ORDER BY priority ASC;

-- ============================================================================
-- NOTAS
-- ============================================================================

-- Los roles válidos en el sistema son:
-- - 'auto' (auto-aprobación)
-- - 'vendedor'
-- - 'caseta'
-- - 'finanzas'
-- - 'jefe_ventas'
-- - 'legal'
-- - 'admin'
-- - 'superadmin'
-- - 'corredor'

-- El rol 'gerencia' NO EXISTE y nunca fue creado en la tabla usuarios.

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
