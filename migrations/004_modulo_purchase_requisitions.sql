-- ============================================================================
-- MIGRACIÓN: Módulo Purchase Requisitions - Sistema de Solicitudes de Compra
-- ============================================================================
-- Fecha: 13 Enero 2026
-- Descripción: Sistema de Purchase Requisitions con workflow de aprobación
-- Arquitectura: Configuración GLOBAL, auto-aprobación configurable, proyecto como referencia
-- ============================================================================

-- ============================================================================
-- TABLA 1: pr_categories (Catálogo de categorías de compra)
-- Configuración GLOBAL - 10 categorías aprobadas
-- ============================================================================

CREATE TABLE IF NOT EXISTS pr_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identificación
  code VARCHAR(10) UNIQUE NOT NULL,  -- 'IT', 'MKT', 'OBRA', etc.
  name VARCHAR(100) NOT NULL,        -- 'Tecnología & Sistemas', etc.
  description TEXT,                   -- Descripción detallada de qué incluye

  -- Presentación
  icon VARCHAR(50),                   -- Emoji o nombre de ícono ('💻', 'laptop', etc.)
  display_order INT NOT NULL,         -- Orden de visualización en UI

  -- Configuración de aprobación
  default_approver_role VARCHAR(50),  -- Rol default para aprobar esta categoría

  -- Estado
  is_active BOOLEAN DEFAULT TRUE,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_display_order UNIQUE (display_order)
);

-- Índices para pr_categories
CREATE INDEX IF NOT EXISTS idx_pr_categories_active
  ON pr_categories(is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_pr_categories_code
  ON pr_categories(code);

-- ============================================================================
-- TABLA 2: pr_approval_rules (Reglas de aprobación GLOBALES)
-- Configurables por monto con escalación automática
-- ============================================================================

CREATE TABLE IF NOT EXISTS pr_approval_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identificación
  name VARCHAR(100) NOT NULL,  -- 'Auto-aprobación <S/500', 'Aprobación Manager', etc.

  -- Rango de montos (en moneda base PEN)
  min_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_amount DECIMAL(12,2),  -- NULL = sin límite superior

  -- Aprobador
  approver_role VARCHAR(50) NOT NULL,  -- 'auto', 'admin', 'gerencia', 'superadmin', etc.

  -- SLA (Service Level Agreement)
  sla_hours INT NOT NULL,  -- Horas para responder (0 para auto, 4 para urgente, 24 para normal, etc.)

  -- Requisitos
  requires_justification BOOLEAN DEFAULT TRUE,
  requires_attachments BOOLEAN DEFAULT FALSE,

  -- Estado
  is_active BOOLEAN DEFAULT TRUE,

  -- Prioridad de evaluación (menor = evaluar primero)
  priority INT NOT NULL DEFAULT 100,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_amount_range CHECK (max_amount IS NULL OR max_amount > min_amount),
  CONSTRAINT valid_sla CHECK (sla_hours >= 0),
  CONSTRAINT valid_priority CHECK (priority >= 0)
);

-- Índices para pr_approval_rules
CREATE INDEX IF NOT EXISTS idx_pr_approval_rules_active
  ON pr_approval_rules(is_active, priority);

CREATE INDEX IF NOT EXISTS idx_pr_approval_rules_amounts
  ON pr_approval_rules(min_amount, max_amount)
  WHERE is_active = TRUE;

-- ============================================================================
-- TABLA 3: purchase_requisitions (Principal)
-- Todas las solicitudes de compra del sistema
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identificador único (generado automáticamente)
  pr_number VARCHAR(20) UNIQUE NOT NULL,  -- 'PR-2026-00001'
  sequence_number INT NOT NULL,            -- Secuencia anual para generar pr_number

  -- Solicitante
  requester_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  requester_department VARCHAR(100),  -- Departamento del solicitante
  requester_name VARCHAR(255),        -- Cached para evitar JOINs

  -- Referencia a proyecto (OPCIONAL - solo para contexto)
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  proyecto_nombre VARCHAR(255),  -- Cached

  -- Información básica
  title VARCHAR(255) NOT NULL,
  category_id UUID NOT NULL REFERENCES pr_categories(id) ON DELETE RESTRICT,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  required_by_date DATE NOT NULL,  -- Fecha en que se necesita el item

  -- Detalles financieros
  item_description TEXT NOT NULL,        -- Descripción detallada del item/servicio
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  unit_price DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'PEN' CHECK (currency IN ('PEN', 'USD')),
  total_amount DECIMAL(12,2) NOT NULL,   -- Auto-calculado: quantity * unit_price

  -- Justificación y detalles adicionales
  justification TEXT NOT NULL,           -- Por qué es necesaria esta compra
  preferred_vendor VARCHAR(255),         -- Proveedor sugerido (opcional)
  cost_center VARCHAR(100),              -- Centro de costo (opcional)
  notes TEXT,                            -- Notas adicionales

  -- Archivos adjuntos (URLs de Supabase Storage)
  attachments JSONB DEFAULT '[]'::jsonb,  -- [{name: 'cotizacion.pdf', url: '...', size: 1024}]

  -- Workflow de aprobación
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN (
    'draft',           -- Borrador (editable por solicitante)
    'submitted',       -- Enviada (esperando asignación de aprobador)
    'pending_approval',-- Pendiente de aprobación
    'approved',        -- Aprobada
    'rejected',        -- Rechazada
    'completed',       -- Completada (compra realizada)
    'cancelled'        -- Cancelada
  )),

  current_approver_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,  -- Aprobador actual
  current_approver_name VARCHAR(255),  -- Cached
  approval_rule_id UUID REFERENCES pr_approval_rules(id) ON DELETE SET NULL,  -- Regla que aplicó

  -- Timestamps de workflow
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  approval_comments TEXT,

  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  rejection_reason TEXT,

  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,

  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  cancellation_reason TEXT,

  -- Auditoría general
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_quantity CHECK (quantity > 0),
  CONSTRAINT valid_unit_price CHECK (unit_price >= 0),
  CONSTRAINT valid_total_amount CHECK (total_amount >= 0),
  CONSTRAINT valid_attachments CHECK (jsonb_typeof(attachments) = 'array')
);

-- Índices optimizados para queries frecuentes

-- Índice principal: PRs por solicitante ordenadas por fecha
CREATE INDEX IF NOT EXISTS idx_pr_requester
  ON purchase_requisitions(requester_id, created_at DESC);

-- Índice crucial: Bandeja de aprobación (aprobador + estado pendiente)
CREATE INDEX IF NOT EXISTS idx_pr_pending_approver
  ON purchase_requisitions(current_approver_id, status, created_at DESC)
  WHERE status = 'pending_approval';

-- Índice por estado (para filtros en lista general)
CREATE INDEX IF NOT EXISTS idx_pr_status
  ON purchase_requisitions(status, created_at DESC);

-- Índice por categoría (para reportes y filtros)
CREATE INDEX IF NOT EXISTS idx_pr_category
  ON purchase_requisitions(category_id, created_at DESC);

-- Índice por proyecto (para filtrar PRs de un proyecto específico)
CREATE INDEX IF NOT EXISTS idx_pr_proyecto
  ON purchase_requisitions(proyecto_id, created_at DESC)
  WHERE proyecto_id IS NOT NULL;

-- Índice por número de PR (búsqueda exacta)
CREATE INDEX IF NOT EXISTS idx_pr_number
  ON purchase_requisitions(pr_number);

-- Índice por prioridad (para bandeja de aprobación)
CREATE INDEX IF NOT EXISTS idx_pr_priority
  ON purchase_requisitions(priority, created_at DESC);

-- Índice por fecha requerida (para alertas de urgencia)
CREATE INDEX IF NOT EXISTS idx_pr_required_by_date
  ON purchase_requisitions(required_by_date, status)
  WHERE status IN ('submitted', 'pending_approval', 'approved');

-- Índice compuesto para reportes financieros
CREATE INDEX IF NOT EXISTS idx_pr_financial_reports
  ON purchase_requisitions(status, currency, total_amount, created_at DESC)
  WHERE status IN ('approved', 'completed');

-- ============================================================================
-- TABLA 4: pr_approval_history (Historial de acciones en PRs)
-- Timeline completo de cambios para auditoría y UI
-- ============================================================================

CREATE TABLE IF NOT EXISTS pr_approval_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pr_id UUID NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,

  -- Actor (usuario que realizó la acción)
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,  -- Cached para historial inmutable
  user_role VARCHAR(50),             -- Rol en el momento de la acción

  -- Acción realizada
  action VARCHAR(30) NOT NULL CHECK (action IN (
    'created',      -- PR creada
    'submitted',    -- Enviada a aprobación
    'assigned',     -- Asignada a aprobador
    'approved',     -- Aprobada
    'rejected',     -- Rechazada
    'escalated',    -- Escalada a superior
    'cancelled',    -- Cancelada
    'completed',    -- Marcada como completada
    'commented',    -- Comentario agregado
    'edited'        -- Editada (solo en draft)
  )),

  -- Cambios de estado
  previous_status VARCHAR(30),
  new_status VARCHAR(30),

  -- Detalles de la acción
  comments TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,  -- Datos adicionales específicos de la acción

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

-- Índices para pr_approval_history

-- Índice principal: historial por PR ordenado por fecha
CREATE INDEX IF NOT EXISTS idx_pr_history_pr
  ON pr_approval_history(pr_id, created_at DESC);

-- Índice por usuario (para ver actividad de un aprobador)
CREATE INDEX IF NOT EXISTS idx_pr_history_user
  ON pr_approval_history(user_id, created_at DESC);

-- Índice por acción (para analytics)
CREATE INDEX IF NOT EXISTS idx_pr_history_action
  ON pr_approval_history(action, created_at DESC);

-- Índice GIN para búsquedas en metadata
CREATE INDEX IF NOT EXISTS idx_pr_history_metadata
  ON pr_approval_history USING GIN (metadata jsonb_path_ops);

-- ============================================================================
-- TABLA 5: pr_comments (Comentarios en PRs)
-- Comunicación entre solicitante y aprobadores
-- ============================================================================

CREATE TABLE IF NOT EXISTS pr_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pr_id UUID NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,

  -- Autor del comentario
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,  -- Cached
  user_role VARCHAR(50),             -- Rol en el momento del comentario

  -- Contenido
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,  -- TRUE = solo visible para aprobadores

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,  -- Soft delete

  -- Constraints
  CONSTRAINT comment_not_empty CHECK (length(trim(comment)) > 0)
);

-- Índices para pr_comments

-- Índice principal: comentarios por PR ordenados por fecha (excluyendo eliminados)
CREATE INDEX IF NOT EXISTS idx_pr_comments_pr
  ON pr_comments(pr_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Índice por usuario
CREATE INDEX IF NOT EXISTS idx_pr_comments_user
  ON pr_comments(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Índice para comentarios internos (solo aprobadores)
CREATE INDEX IF NOT EXISTS idx_pr_comments_internal
  ON pr_comments(pr_id, is_internal, created_at DESC)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- FUNCIONES: Lógica de negocio y automatización
-- ============================================================================

-- Función 1: Generar PR Number automáticamente
-- Formato: PR-YYYY-NNNNN (ejemplo: PR-2026-00001)
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
  -- IMPORTANTE: Usar FOR UPDATE para evitar race conditions
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  INTO next_seq
  FROM purchase_requisitions
  WHERE EXTRACT(YEAR FROM created_at) = current_year
  FOR UPDATE;

  NEW.sequence_number := next_seq;
  NEW.pr_number := 'PR-' || current_year || '-' || LPAD(next_seq::TEXT, 5, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_generate_pr_number ON purchase_requisitions;
CREATE TRIGGER tr_generate_pr_number
  BEFORE INSERT ON purchase_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION generate_pr_number();

COMMENT ON FUNCTION generate_pr_number IS 'Genera automáticamente el pr_number en formato PR-YYYY-NNNNN';

-- Función 2: Auto-calcular total_amount
-- Se ejecuta en INSERT y UPDATE de quantity o unit_price
CREATE OR REPLACE FUNCTION calculate_pr_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount := NEW.quantity * NEW.unit_price;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_calculate_pr_total ON purchase_requisitions;
CREATE TRIGGER tr_calculate_pr_total
  BEFORE INSERT OR UPDATE OF quantity, unit_price ON purchase_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_pr_total();

COMMENT ON FUNCTION calculate_pr_total IS 'Calcula automáticamente total_amount = quantity × unit_price';

-- Función 3: Determinar regla de aprobación aplicable según monto
-- Devuelve la regla con mayor prioridad (menor número) que aplique
CREATE OR REPLACE FUNCTION get_approval_rule_for_amount(p_amount DECIMAL)
RETURNS UUID AS $$
  SELECT id FROM pr_approval_rules
  WHERE is_active = TRUE
    AND p_amount >= min_amount
    AND (max_amount IS NULL OR p_amount <= max_amount)
  ORDER BY priority ASC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_approval_rule_for_amount IS 'Devuelve la regla de aprobación aplicable para un monto dado. Usa priority (menor = primero).';

-- Función 4: Obtener rol del aprobador según regla
CREATE OR REPLACE FUNCTION get_approver_role_for_pr(p_pr_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_total_amount DECIMAL;
  v_approver_role VARCHAR(50);
BEGIN
  -- Obtener monto total de la PR
  SELECT total_amount INTO v_total_amount
  FROM purchase_requisitions
  WHERE id = p_pr_id;

  -- Obtener el rol del aprobador de la regla aplicable
  SELECT approver_role INTO v_approver_role
  FROM pr_approval_rules
  WHERE is_active = TRUE
    AND v_total_amount >= min_amount
    AND (max_amount IS NULL OR v_total_amount <= max_amount)
  ORDER BY priority ASC
  LIMIT 1;

  RETURN v_approver_role;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_approver_role_for_pr IS 'Devuelve el rol del aprobador para una PR específica según su monto.';

-- Función 5: Cachear nombres para desnormalización optimizada
-- Se ejecuta en INSERT/UPDATE para evitar JOINs en queries frecuentes
CREATE OR REPLACE FUNCTION cache_pr_names()
RETURNS TRIGGER AS $$
BEGIN
  -- Cachear nombre del solicitante
  IF NEW.requester_id IS NOT NULL AND (NEW.requester_name IS NULL OR OLD.requester_id IS DISTINCT FROM NEW.requester_id) THEN
    SELECT nombre INTO NEW.requester_name
    FROM usuarios
    WHERE id = NEW.requester_id;
  END IF;

  -- Cachear nombre del proyecto (si existe)
  IF NEW.proyecto_id IS NOT NULL AND (NEW.proyecto_nombre IS NULL OR OLD.proyecto_id IS DISTINCT FROM NEW.proyecto_id) THEN
    SELECT nombre INTO NEW.proyecto_nombre
    FROM proyectos
    WHERE id = NEW.proyecto_id;
  END IF;

  -- Cachear nombre del aprobador actual (si existe)
  IF NEW.current_approver_id IS NOT NULL AND (NEW.current_approver_name IS NULL OR OLD.current_approver_id IS DISTINCT FROM NEW.current_approver_id) THEN
    SELECT nombre INTO NEW.current_approver_name
    FROM usuarios
    WHERE id = NEW.current_approver_id;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_cache_pr_names ON purchase_requisitions;
CREATE TRIGGER tr_cache_pr_names
  BEFORE INSERT OR UPDATE ON purchase_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION cache_pr_names();

COMMENT ON FUNCTION cache_pr_names IS 'Cachea nombres de usuarios y proyectos en la PR para evitar JOINs frecuentes.';

-- Función 6: Registrar automáticamente en historial al cambiar estado
CREATE OR REPLACE FUNCTION log_pr_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo registrar si cambió el estado
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO pr_approval_history (
      pr_id,
      user_id,
      user_name,
      user_role,
      action,
      previous_status,
      new_status,
      comments
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.approved_by, NEW.rejected_by, NEW.cancelled_by, NEW.requester_id),
      COALESCE(NEW.current_approver_name, NEW.requester_name, 'Sistema'),
      (SELECT rol FROM usuarios WHERE id = COALESCE(NEW.approved_by, NEW.rejected_by, NEW.cancelled_by, NEW.requester_id)),
      CASE
        WHEN TG_OP = 'INSERT' THEN 'created'
        WHEN NEW.status = 'submitted' THEN 'submitted'
        WHEN NEW.status = 'pending_approval' THEN 'assigned'
        WHEN NEW.status = 'approved' THEN 'approved'
        WHEN NEW.status = 'rejected' THEN 'rejected'
        WHEN NEW.status = 'cancelled' THEN 'cancelled'
        WHEN NEW.status = 'completed' THEN 'completed'
        ELSE 'edited'
      END,
      OLD.status,
      NEW.status,
      CASE
        WHEN NEW.status = 'approved' THEN NEW.approval_comments
        WHEN NEW.status = 'rejected' THEN NEW.rejection_reason
        WHEN NEW.status = 'cancelled' THEN NEW.cancellation_reason
        ELSE NULL
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_log_pr_status_change ON purchase_requisitions;
CREATE TRIGGER tr_log_pr_status_change
  AFTER INSERT OR UPDATE OF status ON purchase_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION log_pr_status_change();

COMMENT ON FUNCTION log_pr_status_change IS 'Registra automáticamente en pr_approval_history cada cambio de estado de una PR.';

-- Función 7: Actualizar updated_at en pr_comments
CREATE OR REPLACE FUNCTION update_pr_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_pr_comment_timestamp ON pr_comments;
CREATE TRIGGER tr_update_pr_comment_timestamp
  BEFORE UPDATE ON pr_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_pr_comment_timestamp();

-- Función 8: Actualizar updated_at en pr_categories
CREATE OR REPLACE FUNCTION update_pr_category_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_pr_category_timestamp ON pr_categories;
CREATE TRIGGER tr_update_pr_category_timestamp
  BEFORE UPDATE ON pr_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_pr_category_timestamp();

-- Función 9: Actualizar updated_at en pr_approval_rules
CREATE OR REPLACE FUNCTION update_pr_approval_rule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_pr_approval_rule_timestamp ON pr_approval_rules;
CREATE TRIGGER tr_update_pr_approval_rule_timestamp
  BEFORE UPDATE ON pr_approval_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_pr_approval_rule_timestamp();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pr_approval_rules ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS: pr_categories (Catálogo global - todos pueden leer)
-- ============================================================================

-- Todos los usuarios autenticados pueden ver categorías activas
CREATE POLICY "Everyone can view active categories"
  ON pr_categories
  FOR SELECT
  USING (is_active = TRUE);

-- Solo admins/superadmins pueden gestionar categorías
CREATE POLICY "Admins can manage categories"
  ON pr_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('admin', 'superadmin')
    )
  );

-- ============================================================================
-- RLS: pr_approval_rules (Configuración global - lectura para todos)
-- ============================================================================

-- Todos los usuarios autenticados pueden ver reglas activas
CREATE POLICY "Everyone can view active rules"
  ON pr_approval_rules
  FOR SELECT
  USING (is_active = TRUE);

-- Solo admins/superadmins pueden gestionar reglas
CREATE POLICY "Admins can manage rules"
  ON pr_approval_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('admin', 'superadmin')
    )
  );

-- ============================================================================
-- RLS: purchase_requisitions
-- IMPORTANTE: Usuario ve sus propias PRs + las que debe aprobar + admins ven todas
-- ============================================================================

-- Policy 1: Ver PRs propias, asignadas a uno, o si eres admin/gerencia
CREATE POLICY "Users can view own PRs or assigned or admin"
  ON purchase_requisitions
  FOR SELECT
  USING (
    requester_id = auth.uid()  -- Mis PRs
    OR current_approver_id = auth.uid()  -- Asignadas a mí para aprobar
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('admin', 'superadmin', 'gerencia')  -- Roles con visibilidad total
    )
  );

-- Policy 2: TODOS los usuarios pueden crear PRs (decisión de negocio confirmada)
CREATE POLICY "Everyone can create PRs"
  ON purchase_requisitions
  FOR INSERT
  WITH CHECK (
    requester_id = auth.uid()  -- Solo puede crear con su propio user_id
  );

-- Policy 3: Actualizar PRs
-- - Solicitante puede editar solo en estado 'draft'
-- - Aprobador puede cambiar estado (aprobar/rechazar) si está asignado a él
-- - Admins pueden actualizar cualquier PR
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

-- Policy 4: Solo admins pueden eliminar PRs (soft delete vía cancelled)
CREATE POLICY "Admins can delete PRs"
  ON purchase_requisitions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('admin', 'superadmin')
    )
  );

-- ============================================================================
-- RLS: pr_approval_history
-- Visible para todos los involucrados en la PR + admins
-- ============================================================================

-- Policy 1: Ver historial si estás involucrado en la PR (solicitante, aprobador, o admin)
CREATE POLICY "View history for involved users"
  ON pr_approval_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM purchase_requisitions pr
      WHERE pr.id = pr_id
      AND (
        pr.requester_id = auth.uid()
        OR pr.current_approver_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM usuarios
          WHERE id = auth.uid()
          AND rol IN ('admin', 'superadmin', 'gerencia')
        )
      )
    )
  );

-- Policy 2: Service role o triggers pueden insertar historial
-- IMPORTANTE: Esta policy permite a cualquier usuario autenticado insertar
-- pero los triggers se ejecutan con SECURITY DEFINER
CREATE POLICY "Service can insert history"
  ON pr_approval_history
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- RLS: pr_comments
-- Visibilidad según is_internal flag
-- ============================================================================

-- Policy 1: Ver comentarios
-- - Comentarios públicos (is_internal = FALSE): visible para todos los involucrados
-- - Comentarios internos (is_internal = TRUE): solo para aprobadores y admins
CREATE POLICY "View comments based on is_internal flag"
  ON pr_comments
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      -- Comentarios públicos: todos los involucrados en la PR
      (NOT is_internal AND EXISTS (
        SELECT 1 FROM purchase_requisitions pr
        WHERE pr.id = pr_id
        AND (pr.requester_id = auth.uid() OR pr.current_approver_id = auth.uid())
      ))
      -- Comentarios internos: solo aprobadores y admins
      OR (is_internal AND EXISTS (
        SELECT 1 FROM usuarios
        WHERE id = auth.uid()
        AND rol IN ('admin', 'superadmin', 'gerencia', 'jefe_ventas')
      ))
    )
  );

-- Policy 2: Crear comentarios (solo involucrados en la PR)
CREATE POLICY "Involved users can create comments"
  ON pr_comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM purchase_requisitions pr
      WHERE pr.id = pr_id
      AND (pr.requester_id = auth.uid() OR pr.current_approver_id = auth.uid())
    )
  );

-- Policy 3: Actualizar comentarios (solo el autor o admins)
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

-- Policy 4: Soft delete de comentarios (solo autor o admins)
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
-- SEED DATA: Categorías (10 aprobadas)
-- ============================================================================

INSERT INTO pr_categories (code, name, description, icon, default_approver_role, display_order, is_active) VALUES
('IT', 'Tecnología & Sistemas', 'Laptops, licencias de software, servidores, equipos de red, cámaras de seguridad, soporte técnico', '💻', 'admin', 1, true),
('MKT', 'Marketing & Publicidad', 'Publicidad digital, eventos promocionales, merchandising, material POP, señalética, campañas', '📢', 'admin', 2, true),
('OBRA', 'Construcción & Obra', 'Materiales de construcción, maquinaria pesada, herramientas, equipos de seguridad, mano de obra', '🏗️', 'gerencia', 3, true),
('SERV', 'Servicios Profesionales', 'Consultorías especializadas, asesoría legal, servicios contables, estudios técnicos', '👔', 'gerencia', 4, true),
('MOB', 'Mobiliario & Equipamiento', 'Muebles de oficina, equipos para sala de ventas, decoración, estanterías', '🪑', 'admin', 5, true),
('OPS', 'Operaciones & Mantenimiento', 'Servicios de limpieza, seguridad, mantenimiento de edificios, utilities, suministros', '🔧', 'admin', 6, true),
('RRHH', 'Recursos Humanos', 'Capacitaciones, uniformes, beneficios para personal, eventos de team building', '👥', 'admin', 7, true),
('VENTAS', 'Ventas & Comercial', 'Equipamiento de casetas de venta, material promocional POP, tablets para vendedores', '🏪', 'jefe_ventas', 8, true),
('LOG', 'Transporte & Logística', 'Combustible, mantenimiento de vehículos, servicios de transporte, fletes', '🚚', 'admin', 9, true),
('GRAL', 'Gastos Generales', 'Útiles de oficina, suministros menores, snacks, artículos de limpieza', '📦', 'auto', 10, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- SEED DATA: Reglas de Aprobación (Configurables)
-- NOTA: Estas son reglas ejemplo - deben ajustarse según necesidad de ECOPLAZA
-- ============================================================================

INSERT INTO pr_approval_rules (name, min_amount, max_amount, approver_role, sla_hours, requires_justification, requires_attachments, priority, is_active) VALUES
-- Regla 0: Urgente - evaluar PRIMERO (priority más bajo)
('Urgente (cualquier monto)', 0, NULL, 'gerencia', 4, true, false, 0, true),

-- Regla 1: Auto-aprobación para gastos menores (CONFIGURABLE - puede desactivarse)
('Auto-aprobación (gastos menores)', 0, 500, 'auto', 0, false, false, 1, true),

-- Regla 2: Aprobación de Manager (S/ 500 - S/ 2,000)
('Aprobación Manager', 500.01, 2000, 'admin', 24, true, false, 2, true),

-- Regla 3: Aprobación de Director (S/ 2,000 - S/ 10,000)
('Aprobación Director', 2000.01, 10000, 'gerencia', 72, true, true, 3, true),

-- Regla 4: Aprobación de Gerente General (> S/ 10,000)
('Aprobación Gerente General', 10000.01, NULL, 'superadmin', 120, true, true, 4, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED DATA: Template de notificación para PRs (integración con módulo notificaciones)
-- NOTA: Estos templates YA EXISTEN en 003_modulo_notificaciones.sql
-- Solo los incluimos como referencia de tipos de eventos disponibles
-- ============================================================================

-- Template types disponibles para Purchase Requisitions:
-- - pr_created: PR creada por solicitante
-- - pr_pending_approval: PR asignada a aprobador (ALTA prioridad)
-- - pr_approved: PR aprobada
-- - pr_rejected: PR rechazada
-- - pr_escalated: PR escalada a superior (timeout)
-- - pr_cancelled: PR cancelada

-- ============================================================================
-- COMENTARIOS FINALES
-- ============================================================================

COMMENT ON TABLE pr_categories IS 'Catálogo de categorías de compra (10 aprobadas): IT, MKT, OBRA, SERV, MOB, OPS, RRHH, VENTAS, LOG, GRAL';
COMMENT ON TABLE pr_approval_rules IS 'Reglas de aprobación configurables por monto con SLA y requisitos específicos';
COMMENT ON TABLE purchase_requisitions IS 'Tabla principal de Purchase Requisitions con workflow de aprobación';
COMMENT ON TABLE pr_approval_history IS 'Historial completo de acciones y cambios de estado para timeline y auditoría';
COMMENT ON TABLE pr_comments IS 'Comentarios en PRs (públicos o internos) para comunicación entre solicitante y aprobadores';

COMMENT ON COLUMN purchase_requisitions.pr_number IS 'Número único autogenerado en formato PR-YYYY-NNNNN (ejemplo: PR-2026-00001)';
COMMENT ON COLUMN purchase_requisitions.proyecto_id IS 'Referencia OPCIONAL al proyecto - solo para contexto, NO filtra aprobación';
COMMENT ON COLUMN purchase_requisitions.status IS 'Estados: draft, submitted, pending_approval, approved, rejected, completed, cancelled';
COMMENT ON COLUMN purchase_requisitions.attachments IS 'Array JSON de archivos adjuntos (URLs de Supabase Storage)';
COMMENT ON COLUMN purchase_requisitions.approval_rule_id IS 'Regla de aprobación que se aplicó según el monto';
COMMENT ON COLUMN pr_approval_rules.approver_role IS 'Rol que aprueba: auto, admin, gerencia, superadmin, jefe_ventas, etc.';
COMMENT ON COLUMN pr_approval_rules.priority IS 'Prioridad de evaluación (menor = evaluar primero). Urgente debe ser 0.';
COMMENT ON COLUMN pr_comments.is_internal IS 'TRUE = solo visible para aprobadores y admins, FALSE = visible para todos';

-- ============================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================================================

-- 1. CONFIGURACIÓN GLOBAL vs POR PROYECTO:
--    - Las categorías y reglas de aprobación son GLOBALES (no por proyecto)
--    - El campo proyecto_id en PRs es OPCIONAL y solo para REFERENCIA/CONTEXTO
--    - NO se usa proyecto_id para filtrar quién puede aprobar

-- 2. AUTO-APROBACIÓN:
--    - Configurable mediante regla con approver_role = 'auto'
--    - Puede desactivarse poniendo is_active = FALSE en la regla
--    - Default: montos < S/ 500 se auto-aprueban (regla priority 1)

-- 3. TODOS PUEDEN CREAR PRs:
--    - Decisión de negocio confirmada: CUALQUIER usuario puede crear PRs
--    - RLS policy permite INSERT con requester_id = auth.uid()

-- 4. WORKFLOW DE APROBACIÓN:
--    draft → submitted → pending_approval → approved/rejected
--    - Draft: solo editable por solicitante
--    - Submitted: asignado automáticamente según regla
--    - Pending: esperando acción del aprobador
--    - Approved: puede marcarse como completed cuando se haga la compra
--    - Rejected: puede volver a submitted si se edita y reenvía

-- 5. INTEGRACIÓN CON NOTIFICACIONES:
--    - Crear notificación al cambiar a 'pending_approval' (tipo: pr_pending_approval)
--    - Crear notificación al aprobar (tipo: pr_approved)
--    - Crear notificación al rechazar (tipo: pr_rejected)
--    - Templates ya están en tabla notification_templates (003_modulo_notificaciones.sql)

-- 6. QUERIES RECOMENDADAS:
--
--    -- Bandeja de aprobación del usuario actual
--    SELECT * FROM purchase_requisitions
--    WHERE current_approver_id = auth.uid()
--      AND status = 'pending_approval'
--    ORDER BY priority DESC, created_at ASC;
--
--    -- Mis PRs (como solicitante)
--    SELECT * FROM purchase_requisitions
--    WHERE requester_id = auth.uid()
--    ORDER BY created_at DESC;
--
--    -- Timeline de una PR
--    SELECT * FROM pr_approval_history
--    WHERE pr_id = 'xxx'
--    ORDER BY created_at DESC;
--
--    -- Comentarios de una PR
--    SELECT * FROM pr_comments
--    WHERE pr_id = 'xxx' AND deleted_at IS NULL
--    ORDER BY created_at ASC;
--
--    -- Determinar regla aplicable para un monto
--    SELECT * FROM get_approval_rule_for_amount(1500.00);

-- 7. PRÓXIMOS PASOS:
--    - Crear server actions en lib/actions-purchase-requisitions.ts
--    - Crear tipos TypeScript en lib/types/purchase-requisitions.ts
--    - Crear componentes UI:
--      * CreatePRForm.tsx (formulario de creación)
--      * PRList.tsx (lista de mis PRs)
--      * PRApprovalInbox.tsx (bandeja de aprobación)
--      * PRDetailView.tsx (vista detalle + timeline)
--    - Integrar con módulo de notificaciones
--    - Crear página /solicitudes-compra

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
