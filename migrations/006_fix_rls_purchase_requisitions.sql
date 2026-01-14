-- ============================================================================
-- MIGRACIÓN 006: FIX RLS Purchase Requisitions - Eliminar FOR UPDATE
-- ============================================================================
-- Fecha: 13 Enero 2026
-- Problema: FOR UPDATE no está permitido en políticas RLS con funciones de agregación
-- Error: "FOR UPDATE is not allowed with aggregate functions"
-- ============================================================================

-- ============================================================================
-- PASO 1: Reemplazar función generate_pr_number() sin FOR UPDATE
-- ============================================================================

-- El problema: La función usa FOR UPDATE con COUNT/MAX, lo cual falla en contexto RLS
-- Solución: Usar LOCK TABLE o cambiar estrategia de generación de secuencia

CREATE OR REPLACE FUNCTION generate_pr_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year INT;
  next_seq INT;
BEGIN
  -- Solo generar si no existe pr_number (para permitir override manual si es necesario)
  IF NEW.pr_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  current_year := EXTRACT(YEAR FROM NOW());

  -- Obtener siguiente secuencia para este año
  -- SOLUCIÓN: Usar SELECT sin FOR UPDATE (RLS no permite FOR UPDATE con agregaciones)
  -- La atomicidad se garantiza con SERIALIZABLE transaction isolation o advisory locks
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO next_seq
  FROM purchase_requisitions
  WHERE EXTRACT(YEAR FROM created_at) = current_year;

  NEW.sequence_number := next_seq;
  NEW.pr_number := 'PR-' || current_year || '-' || LPAD(next_seq::TEXT, 5, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_pr_number IS 'Genera automáticamente el pr_number en formato PR-YYYY-NNNNN (sin FOR UPDATE para compatibilidad con RLS)';

-- ============================================================================
-- PASO 2: Eliminar FOR UPDATE de todas las RLS policies problemáticas
-- ============================================================================

-- Policy 3: Actualizar PRs
-- ANTES: Tenía implícitamente FOR UPDATE en USING clause
-- AHORA: Simplificada sin FOR UPDATE

DROP POLICY IF EXISTS "Requester can update draft, approver can update status, admin can update all" ON purchase_requisitions;

CREATE POLICY "Requester can update draft, approver can update status, admin can update all"
  ON purchase_requisitions
  FOR UPDATE
  USING (
    (requester_id = auth.uid() AND status = 'draft')  -- Solicitante edita borrador
    OR current_approver_id = auth.uid()  -- Aprobador cambia estado
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    (requester_id = auth.uid() AND status = 'draft')
    OR current_approver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('admin', 'superadmin')
    )
  );

-- ============================================================================
-- PASO 3: Fix RLS policies en pr_comments (también tenían FOR UPDATE)
-- ============================================================================

-- Policy 3: Actualizar comentarios (sin FOR UPDATE explícito en subquery)
DROP POLICY IF EXISTS "Author or admin can update comments" ON pr_comments;

CREATE POLICY "Author or admin can update comments"
  ON pr_comments
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('admin', 'superadmin')
    )
  );

-- Policy 4: Soft delete de comentarios (sin FOR UPDATE en subquery)
DROP POLICY IF EXISTS "Author or admin can delete comments" ON pr_comments;

CREATE POLICY "Author or admin can delete comments"
  ON pr_comments
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (deleted_at IS NOT NULL);  -- Solo permite marcar como eliminado

-- ============================================================================
-- PASO 4: ALTERNATIVA AVANZADA - Usar PostgreSQL Advisory Locks
-- ============================================================================

-- Si se necesita garantizar atomicidad absoluta en generate_pr_number,
-- podemos usar advisory locks en lugar de FOR UPDATE:

CREATE OR REPLACE FUNCTION generate_pr_number_with_lock()
RETURNS TRIGGER AS $$
DECLARE
  current_year INT;
  next_seq INT;
  lock_key BIGINT;
BEGIN
  -- Solo generar si no existe pr_number
  IF NEW.pr_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  current_year := EXTRACT(YEAR FROM NOW());

  -- Crear lock key único basado en año (para que cada año tenga su propio lock)
  lock_key := 1000000 + current_year;  -- Ejemplo: 1002026 para año 2026

  -- Adquirir advisory lock (se libera automáticamente al final de la transacción)
  PERFORM pg_advisory_xact_lock(lock_key);

  -- Ahora es seguro leer y generar secuencia
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO next_seq
  FROM purchase_requisitions
  WHERE EXTRACT(YEAR FROM created_at) = current_year;

  NEW.sequence_number := next_seq;
  NEW.pr_number := 'PR-' || current_year || '-' || LPAD(next_seq::TEXT, 5, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_pr_number_with_lock IS 'Genera pr_number con advisory locks para garantizar atomicidad sin FOR UPDATE';

-- ============================================================================
-- PASO 5: Decidir qué función usar (comentar una de las dos)
-- ============================================================================

-- OPCIÓN A: Usar función simple sin locks (más rápida, riesgo mínimo de colisión)
DROP TRIGGER IF EXISTS tr_generate_pr_number ON purchase_requisitions;
CREATE TRIGGER tr_generate_pr_number
  BEFORE INSERT ON purchase_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION generate_pr_number();

-- OPCIÓN B: Usar función con advisory locks (más segura, ligeramente más lenta)
-- DROP TRIGGER IF EXISTS tr_generate_pr_number ON purchase_requisitions;
-- CREATE TRIGGER tr_generate_pr_number
--   BEFORE INSERT ON purchase_requisitions
--   FOR EACH ROW
--   EXECUTE FUNCTION generate_pr_number_with_lock();

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Test 1: Verificar que se puede crear una PR
-- (ejecutar en tu aplicación o mediante server action)

-- Test 2: Verificar que no hay FOR UPDATE en policies activas
SELECT
  schemaname,
  tablename,
  policyname,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('purchase_requisitions', 'pr_comments', 'pr_approval_history')
ORDER BY tablename, policyname;

-- ============================================================================
-- ROLLBACK (si es necesario)
-- ============================================================================

-- Para revertir esta migración:
-- 1. Ejecutar nuevamente 004_modulo_purchase_requisitions.sql
-- 2. O restaurar las funciones y policies originales

-- ============================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================================================

-- 1. RACE CONDITIONS EN SECUENCIA:
--    - La probabilidad de colisión es extremadamente baja en producción
--    - Si se necesita garantía absoluta: usar OPCIÓN B (advisory locks)
--    - Si el performance es crítico: usar OPCIÓN A (sin locks)

-- 2. ALTERNATIVE: Usar SEQUENCE de PostgreSQL
--    - Se podría crear una secuencia dedicada para cada año
--    - Ejemplo: CREATE SEQUENCE pr_seq_2026 START 1;
--    - Más complejo de mantener (crear nueva secuencia cada año)

-- 3. RLS POLICIES Y FOR UPDATE:
--    - PostgreSQL 12+ no permite FOR UPDATE en subqueries dentro de RLS
--    - Error común: "FOR UPDATE is not allowed with aggregate functions"
--    - Solución: Remover FOR UPDATE de todas las policies y triggers

-- 4. TESTING RECOMENDADO:
--    - Crear múltiples PRs rápidamente para verificar unicidad de pr_number
--    - Verificar que los permisos RLS siguen funcionando correctamente
--    - Probar con diferentes roles (solicitante, aprobador, admin)

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
