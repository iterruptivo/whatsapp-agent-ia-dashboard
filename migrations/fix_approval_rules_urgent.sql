-- Fix: La regla "Urgente" con priority=0 y max_amount=NULL bloquea todas las aprobaciones
-- porque coincide con TODOS los montos antes que las demás reglas.
-- El rol 'admin' no tiene usuarios activos, causando error "No approver found".
-- Solución: Cambiar approver_role a 'superadmin' que sí tiene usuarios activos.

-- 1. Corregir regla "Urgente (cualquier monto)"
UPDATE pr_approval_rules
SET approver_role = 'superadmin'
WHERE name = 'Urgente (cualquier monto)';

-- 2. Corregir regla "Aprobación Director" que también usaba 'gerencia'
UPDATE pr_approval_rules
SET approver_role = 'superadmin'
WHERE name = 'Aprobación Director';

-- 3. Verificar el resultado
SELECT
    id,
    name,
    min_amount,
    max_amount,
    approver_role,
    priority,
    is_active,
    CASE
        WHEN max_amount IS NULL THEN 'ILIMITADO'
        ELSE max_amount::text
    END as max_display
FROM pr_approval_rules
ORDER BY priority ASC;
