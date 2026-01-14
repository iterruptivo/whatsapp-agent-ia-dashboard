-- ============================================================================
-- MIGRACIÓN 009: Fix RLS Policy para submitPR()
-- ============================================================================
-- Fecha: 14 Enero 2026
-- Problema: La política de UPDATE no permite que el requester envíe su PR a aprobación
-- Causa: WITH CHECK requiere (status = 'draft') pero al momento del UPDATE el status YA cambió a 'pending_approval'
-- Solución: Modificar política para permitir que el requester actualice SU PR incluso cuando cambia de draft a pending_approval
-- ============================================================================

-- ============================================================================
-- ANÁLISIS DEL PROBLEMA
-- ============================================================================
--
-- Política actual (líneas 655-675):
--
-- CREATE POLICY "Requester can update draft, approver can update status, admin can update all"
--   ON purchase_requisitions
--   FOR UPDATE
--   USING (
--     (requester_id = auth.uid() AND status = 'draft')  -- ❌ FALLA: status ya no es 'draft'
--     OR current_approver_id = auth.uid()  -- ❌ FALLA: approver aún no es el usuario
--     OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin', 'superadmin'))
--   )
--   WITH CHECK (
--     (requester_id = auth.uid() AND status = 'draft')  -- ❌ PROBLEMA: status YA cambió
--     OR current_approver_id = auth.uid()
--     OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin', 'superadmin'))
--   );
--
-- Cuando submitPR() ejecuta:
-- UPDATE purchase_requisitions
-- SET status = 'pending_approval', current_approver_id = X
-- WHERE id = Y AND requester_id = auth.uid()
--
-- El WITH CHECK evalúa el NUEVO estado (NEW.*), donde:
-- - NEW.status = 'pending_approval' (ya no es 'draft')
-- - NEW.current_approver_id = X (no es auth.uid())
-- → TODAS las condiciones fallan → RLS rechaza el UPDATE

-- ============================================================================
-- SOLUCIÓN
-- ============================================================================
-- Permitir que el requester actualice SU PR en estos casos:
-- 1. Borrador (status = 'draft') → puede editar campos
-- 2. Envío a aprobación (OLD.status = 'draft' → NEW.status en ('submitted', 'pending_approval'))
-- 3. Cancelación (su propia PR)
--
-- El USING verifica OLD.*, el WITH CHECK verifica NEW.*
-- Necesitamos que WITH CHECK permita el cambio de draft → pending_approval

-- ============================================================================
-- EJECUCIÓN
-- ============================================================================

-- Paso 1: Eliminar política existente
DROP POLICY IF EXISTS "Requester can update draft, approver can update status, admin can update all" ON purchase_requisitions;

-- Paso 2: Crear nueva política mejorada
CREATE POLICY "Requester can update own PR, approver can update status, admin can update all"
  ON purchase_requisitions
  FOR UPDATE
  USING (
    -- USING verifica OLD.* (estado ANTES del update)
    requester_id = auth.uid()  -- El requester puede actualizar SU PR
    OR current_approver_id = auth.uid()  -- El aprobador asignado puede cambiar estado
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    -- WITH CHECK verifica NEW.* (estado DESPUÉS del update)
    -- Requester puede:
    -- a) Editar borrador (status sigue siendo 'draft')
    -- b) Enviar a aprobación (cambiar de 'draft' a 'pending_approval')
    -- c) Cancelar su PR (cambiar a 'cancelled')
    (
      requester_id = auth.uid()
      AND (
        status = 'draft'  -- Sigue en borrador
        OR status IN ('pending_approval', 'submitted')  -- Envío a aprobación
        OR status = 'cancelled'  -- Cancelación
      )
    )
    -- Aprobador puede cambiar estado de pending_approval → approved/rejected
    OR (
      current_approver_id = auth.uid()
      AND status IN ('approved', 'rejected', 'completed')
    )
    -- Admins pueden hacer cualquier cambio
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('admin', 'superadmin')
    )
  );

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Query para verificar la política aplicada
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'purchase_requisitions'
  AND policyname LIKE '%update%'
ORDER BY policyname;

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON POLICY "Requester can update own PR, approver can update status, admin can update all"
  ON purchase_requisitions IS
  'Permite al requester enviar su PR a aprobación (draft → pending_approval), al aprobador cambiar estado (pending → approved/rejected), y a admins gestionar todo.';

-- ============================================================================
-- TESTING MANUAL (ejecutar después de aplicar la migración)
-- ============================================================================

-- TEST 1: Crear PR en draft (debe funcionar)
-- INSERT INTO purchase_requisitions (requester_id, title, category_id, ..., status)
-- VALUES (auth.uid(), 'Test PR', ..., 'draft');

-- TEST 2: Actualizar draft (debe funcionar)
-- UPDATE purchase_requisitions
-- SET title = 'Updated Title'
-- WHERE requester_id = auth.uid() AND status = 'draft';

-- TEST 3: Enviar a aprobación (debe funcionar ahora)
-- UPDATE purchase_requisitions
-- SET status = 'pending_approval', current_approver_id = 'xxx'
-- WHERE requester_id = auth.uid() AND status = 'draft';

-- TEST 4: Aprobar PR como aprobador (debe funcionar)
-- UPDATE purchase_requisitions
-- SET status = 'approved', approved_at = NOW(), approved_by = auth.uid()
-- WHERE current_approver_id = auth.uid() AND status = 'pending_approval';

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
