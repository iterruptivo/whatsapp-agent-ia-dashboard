-- ============================================================================
-- MIGRACIÓN: Módulo Notificaciones - Sistema de Notificaciones Centralizado
-- ============================================================================
-- Fecha: 13 Enero 2026
-- Descripción: Sistema de notificaciones real-time tipo Linear/Notion
-- Arquitectura: Multi-canal (in-app, email, WhatsApp), templates, preferencias
-- ============================================================================

-- ============================================================================
-- TABLA 1: notifications
-- Almacena todas las notificaciones del sistema
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Destinatario
  user_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,

  -- Clasificación
  type VARCHAR(100) NOT NULL,  -- 'lead_assigned', 'pr_approved', etc.
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'leads',
    'purchase_requisitions',
    'pagos',
    'aprobaciones',
    'locales',
    'comisiones',
    'expansion',
    'reuniones',
    'sistema'
  )),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),

  -- Contenido
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',  -- Datos flexibles específicos del tipo

  -- Acción
  action_url TEXT,  -- Link al detalle (/leads/123, /solicitudes-compra/456)
  action_label VARCHAR(100),  -- 'Ver lead', 'Aprobar PR', etc.

  -- Estado
  is_read BOOLEAN DEFAULT FALSE,
  is_saved BOOLEAN DEFAULT FALSE,  -- Pin como importante
  is_archived BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Threading (agrupar notificaciones relacionadas)
  parent_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  thread_key VARCHAR(255),  -- 'lead-123', 'pr-456' para agrupar

  -- Actor (quien generó la notificación)
  actor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  actor_name VARCHAR(255),
  actor_avatar_url TEXT,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- Para cleanup automático (5 meses default)
  deleted_at TIMESTAMPTZ,  -- Soft delete

  -- Constraint: validar que metadata es JSON válido
  CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object')
);

-- Índices optimizados para las queries más frecuentes
-- Índice principal: notificaciones por usuario ordenadas por fecha
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Índice para contador de no leídas (badge en header)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = FALSE AND deleted_at IS NULL;

-- Índice GIN para búsquedas en metadata JSONB
CREATE INDEX IF NOT EXISTS idx_notifications_metadata
  ON notifications USING GIN (metadata jsonb_path_ops);

-- Índice por categoría (filtros en UI)
CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON notifications(user_id, category, created_at DESC)
  WHERE deleted_at IS NULL;

-- Índice para cleanup automático
CREATE INDEX IF NOT EXISTS idx_notifications_cleanup
  ON notifications(expires_at)
  WHERE expires_at IS NOT NULL AND deleted_at IS NULL;

-- Índice para threading
CREATE INDEX IF NOT EXISTS idx_notifications_thread
  ON notifications(thread_key, created_at)
  WHERE thread_key IS NOT NULL AND deleted_at IS NULL;

-- Índice por prioridad (para notificaciones urgentes)
CREATE INDEX IF NOT EXISTS idx_notifications_priority
  ON notifications(user_id, priority, created_at DESC)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLA 2: notification_preferences
-- Preferencias de notificaciones por usuario
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Canales de comunicación
  channels JSONB DEFAULT '{"in_app": true, "email": true, "whatsapp": false}'::jsonb,

  -- Modo No Molestar (Quiet Hours)
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',

  -- Resumen Diario/Semanal (Digest)
  digest_enabled BOOLEAN DEFAULT FALSE,
  digest_frequency VARCHAR(20) DEFAULT 'daily' CHECK (digest_frequency IN ('daily', 'weekly', 'never')),
  digest_time TIME DEFAULT '09:00',

  -- Preferencias por categoría (override de canales)
  -- Ejemplo: {"leads": {"in_app": true, "email": false}, "purchase_requisitions": {"in_app": true, "email": true, "whatsapp": true}}
  category_preferences JSONB DEFAULT '{}'::jsonb,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: validar que channels y category_preferences son JSON válidos
  CONSTRAINT valid_channels CHECK (jsonb_typeof(channels) = 'object'),
  CONSTRAINT valid_category_preferences CHECK (jsonb_typeof(category_preferences) = 'object')
);

-- Índice por usuario
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user
  ON notification_preferences(user_id);

-- ============================================================================
-- TABLA 3: notification_templates
-- Templates reutilizables para cada tipo de notificación
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identificación
  type VARCHAR(100) NOT NULL UNIQUE,  -- 'lead_assigned', 'pr_approved', etc.
  category VARCHAR(50) NOT NULL,

  -- Templates con placeholders {{variable}}
  in_app_title VARCHAR(255) NOT NULL,
  in_app_message TEXT NOT NULL,

  email_subject VARCHAR(255),
  email_body TEXT,

  whatsapp_message TEXT,

  -- Configuración
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
  action_label VARCHAR(100),

  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  version INT DEFAULT 1,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notification_templates_type
  ON notification_templates(type);

CREATE INDEX IF NOT EXISTS idx_notification_templates_category
  ON notification_templates(category);

CREATE INDEX IF NOT EXISTS idx_notification_templates_active
  ON notification_templates(is_active);

-- ============================================================================
-- TABLA 4: notification_delivery_log (Opcional - para tracking multi-canal)
-- Registro de entregas por canal (email, WhatsApp)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,

  channel VARCHAR(20) NOT NULL CHECK (channel IN ('in_app', 'email', 'whatsapp', 'push')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),

  -- Metadata del proveedor (Resend, WATI, etc.)
  provider VARCHAR(50),
  provider_message_id VARCHAR(255),
  provider_response JSONB,

  -- Error tracking
  error_message TEXT,
  retry_count INT DEFAULT 0,
  last_retry_at TIMESTAMPTZ,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_delivery_log_notification
  ON notification_delivery_log(notification_id);

CREATE INDEX IF NOT EXISTS idx_delivery_log_status
  ON notification_delivery_log(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_log_channel
  ON notification_delivery_log(channel, status);

-- ============================================================================
-- FUNCIONES: Operaciones batch optimizadas
-- ============================================================================

-- Función 1: Marcar todas las notificaciones como leídas (batch)
-- IMPORTANTE: Limita a 10,000 registros por batch para evitar bloat
CREATE OR REPLACE FUNCTION mark_all_as_read_batch(
  p_user_id UUID,
  p_limit INT DEFAULT 10000
)
RETURNS INT AS $$
DECLARE
  v_updated INT;
BEGIN
  WITH to_update AS (
    SELECT id FROM notifications
    WHERE user_id = p_user_id
      AND is_read = FALSE
      AND deleted_at IS NULL
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  FROM to_update
  WHERE notifications.id = to_update.id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_all_as_read_batch IS 'Marca hasta 10K notificaciones como leídas en batch. Para evitar bloat, llamar múltiples veces si hay más.';

-- Función 2: Obtener contador de notificaciones no leídas (optimizado)
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM notifications
  WHERE user_id = p_user_id
    AND is_read = FALSE
    AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_unread_notification_count IS 'Devuelve el número de notificaciones no leídas. Usado para el badge en el header.';

-- Función 3: Soft delete de notificaciones antiguas (cleanup automático)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(
  p_retention_months INT DEFAULT 5
)
RETURNS INT AS $$
DECLARE
  v_deleted INT;
BEGIN
  WITH to_delete AS (
    SELECT id FROM notifications
    WHERE created_at < NOW() - INTERVAL '1 month' * p_retention_months
      AND is_saved = FALSE  -- No borrar las guardadas
      AND deleted_at IS NULL
    LIMIT 50000
    FOR UPDATE SKIP LOCKED
  )
  UPDATE notifications
  SET deleted_at = NOW()
  FROM to_delete
  WHERE notifications.id = to_delete.id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_notifications IS 'Soft delete de notificaciones antiguas (5 meses default). No elimina las guardadas.';

-- Función 4: Marcar notificaciones expiradas
CREATE OR REPLACE FUNCTION mark_expired_notifications()
RETURNS INT AS $$
DECLARE
  v_marked INT;
BEGIN
  WITH to_mark AS (
    SELECT id FROM notifications
    WHERE expires_at < NOW()
      AND is_saved = FALSE
      AND deleted_at IS NULL
    LIMIT 10000
    FOR UPDATE SKIP LOCKED
  )
  UPDATE notifications
  SET deleted_at = NOW()
  FROM to_mark
  WHERE notifications.id = to_mark.id;

  GET DIAGNOSTICS v_marked = ROW_COUNT;
  RETURN v_marked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_expired_notifications IS 'Marca notificaciones que llegaron a su expires_at. Ejecutar diariamente con pg_cron.';

-- Función 5: Crear preferencias default para nuevo usuario
CREATE OR REPLACE FUNCTION create_default_notification_preferences(p_user_id UUID)
RETURNS UUID AS $$
INSERT INTO notification_preferences (user_id)
VALUES (p_user_id)
ON CONFLICT (user_id) DO NOTHING
RETURNING id;
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION create_default_notification_preferences IS 'Crea preferencias default al registrar un usuario nuevo.';

-- ============================================================================
-- TRIGGER: Actualizar updated_at automáticamente
-- ============================================================================

-- Trigger para notification_preferences
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notification_preferences ON notification_preferences;
CREATE TRIGGER trigger_update_notification_preferences
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Trigger para notification_templates
CREATE OR REPLACE FUNCTION update_notification_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notification_templates ON notification_templates;
CREATE TRIGGER trigger_update_notification_templates
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_templates_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS: notifications
-- ============================================================================

-- Usuarios solo ven sus propias notificaciones
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Usuarios pueden actualizar sus notificaciones (mark as read, save, archive)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role puede insertar notificaciones (desde server actions)
-- NOTA: Esta policy permite a cualquier authenticated user insertar
-- En producción, considerar restringir a service_role solamente
CREATE POLICY "Service can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Soft delete: usuarios pueden eliminar sus notificaciones
CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- RLS: notification_preferences
-- ============================================================================

-- Usuarios solo ven sus propias preferencias
CREATE POLICY "Users can view own preferences"
  ON notification_preferences
  FOR SELECT
  USING (user_id = auth.uid());

-- Usuarios pueden crear/actualizar sus preferencias
CREATE POLICY "Users can manage own preferences"
  ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- RLS: notification_templates
-- ============================================================================

-- Todos los usuarios autenticados pueden leer templates
CREATE POLICY "Authenticated users can view templates"
  ON notification_templates
  FOR SELECT
  USING (is_active = TRUE);

-- Solo admins pueden modificar templates
CREATE POLICY "Admins can manage templates"
  ON notification_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol IN ('superadmin', 'admin')
    )
  );

-- ============================================================================
-- RLS: notification_delivery_log
-- ============================================================================

-- Usuarios pueden ver el log de entrega de sus notificaciones
CREATE POLICY "Users can view own delivery log"
  ON notification_delivery_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notifications
      WHERE id = notification_id AND user_id = auth.uid()
    )
  );

-- Service role puede insertar/actualizar logs
CREATE POLICY "Service can manage delivery log"
  ON notification_delivery_log
  FOR ALL
  WITH CHECK (true);

-- ============================================================================
-- SUPABASE REALTIME: Habilitar para la tabla notifications
-- ============================================================================

-- IMPORTANTE: Para habilitar Realtime, ejecutar en el Dashboard de Supabase:
-- Settings > Database > Publications > supabase_realtime > Add table: notifications

-- Alternativamente, ejecutar este comando si tienes permisos:
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Nota: Esto permitirá que los clientes se suscriban a cambios en la tabla
-- usando supabase.channel().on('postgres_changes', {...})

-- ============================================================================
-- SEED: Templates iniciales
-- ============================================================================

-- Template: Lead Asignado
INSERT INTO notification_templates (type, category, in_app_title, in_app_message, email_subject, email_body, priority, action_label, is_active)
VALUES (
  'lead_assigned',
  'leads',
  'Nuevo lead asignado',
  '{{actor_name}} te asignó el lead {{lead_nombre}}',
  'ECOPLAZA - Nuevo lead: {{lead_nombre}}',
  '<h2>Hola {{user_name}},</h2><p>{{actor_name}} te asignó un nuevo lead:</p><div style="padding: 16px; background: #f3f4f6; border-radius: 8px; margin: 16px 0;"><p><strong>Cliente:</strong> {{lead_nombre}}</p><p><strong>Teléfono:</strong> {{lead_telefono}}</p><p><strong>Proyecto:</strong> {{proyecto_nombre}}</p></div><a href="{{action_url}}" style="display: inline-block; background: #1b967a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">Ver lead en ECOPLAZA</a>',
  'normal',
  'Ver lead',
  true
) ON CONFLICT (type) DO NOTHING;

-- Template: Lead Contactado
INSERT INTO notification_templates (type, category, in_app_title, in_app_message, email_subject, email_body, priority, action_label, is_active)
VALUES (
  'lead_contacted',
  'leads',
  'Lead contactado: {{lead_nombre}}',
  '{{actor_name}} contactó al lead {{lead_nombre}}',
  'ECOPLAZA - Lead contactado: {{lead_nombre}}',
  '<h2>Actualización de Lead</h2><p>{{actor_name}} contactó al lead {{lead_nombre}}.</p><p><strong>Estado:</strong> {{estado}}</p><a href="{{action_url}}" style="display: inline-block; background: #1b967a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver detalles</a>',
  'low',
  'Ver detalles',
  true
) ON CONFLICT (type) DO NOTHING;

-- Template: PR Creada
INSERT INTO notification_templates (type, category, in_app_title, in_app_message, email_subject, email_body, priority, action_label, is_active)
VALUES (
  'pr_created',
  'purchase_requisitions',
  'PR #{{pr_number}} creada',
  'Tu Purchase Requisition #{{pr_number}} fue creada',
  'ECOPLAZA - PR #{{pr_number}} Creada',
  '<h2>Hola {{user_name}},</h2><p>Tu Purchase Requisition fue creada exitosamente:</p><div style="padding: 16px; background: #f3f4f6; border-radius: 8px; margin: 16px 0;"><p><strong>PR:</strong> #{{pr_number}}</p><p><strong>Monto:</strong> {{currency}} {{amount}}</p><p><strong>Estado:</strong> {{estado}}</p></div><a href="{{action_url}}" style="display: inline-block; background: #1b967a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver PR</a>',
  'normal',
  'Ver PR',
  true
) ON CONFLICT (type) DO NOTHING;

-- Template: PR Pendiente Aprobación
INSERT INTO notification_templates (type, category, in_app_title, in_app_message, email_subject, email_body, whatsapp_message, priority, action_label, is_active)
VALUES (
  'pr_pending_approval',
  'purchase_requisitions',
  'PR #{{pr_number}} requiere tu aprobación',
  '{{requester_name}} solicita {{currency}} {{amount}}',
  'ECOPLAZA - Aprobación: PR #{{pr_number}}',
  '<h2>Hola {{approver_name}},</h2><p>Tienes una Purchase Requisition pendiente de aprobación:</p><div style="border: 2px solid #fb923c; padding: 20px; border-radius: 8px; margin: 16px 0;"><p><strong>PR:</strong> #{{pr_number}}</p><p><strong>Monto:</strong> {{currency}} {{amount}}</p><p><strong>Solicitante:</strong> {{requester_name}}</p><p><strong>Categoría:</strong> {{category}}</p></div><div style="margin-top: 20px;"><a href="{{approve_url}}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 8px;">✓ Aprobar</a><a href="{{reject_url}}" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">✕ Rechazar</a></div>',
  '🔔 *Aprobación Requerida*\n\nPR #{{pr_number}}\nMonto: {{currency}} {{amount}}\nSolicitante: {{requester_name}}\n\nAprobar: {{approve_url}}',
  'high',
  'Ver PR',
  true
) ON CONFLICT (type) DO NOTHING;

-- Template: PR Aprobada
INSERT INTO notification_templates (type, category, in_app_title, in_app_message, email_subject, email_body, priority, action_label, is_active)
VALUES (
  'pr_approved',
  'purchase_requisitions',
  'PR #{{pr_number}} aprobada',
  '{{approver_name}} aprobó tu solicitud de {{currency}} {{amount}}',
  'ECOPLAZA - PR #{{pr_number}} Aprobada',
  '<h2>¡Buenas noticias!</h2><p>Tu Purchase Requisition #{{pr_number}} fue aprobada por {{approver_name}}.</p><div style="padding: 16px; background: #d1fae5; border: 2px solid #10b981; border-radius: 8px; margin: 16px 0;"><p><strong>PR:</strong> #{{pr_number}}</p><p><strong>Monto:</strong> {{currency}} {{amount}}</p><p><strong>Aprobador:</strong> {{approver_name}}</p></div><a href="{{action_url}}" style="display: inline-block; background: #1b967a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver PR</a>',
  'high',
  'Ver PR',
  true
) ON CONFLICT (type) DO NOTHING;

-- Template: PR Rechazada
INSERT INTO notification_templates (type, category, in_app_title, in_app_message, email_subject, email_body, priority, action_label, is_active)
VALUES (
  'pr_rejected',
  'purchase_requisitions',
  'PR #{{pr_number}} rechazada',
  '{{approver_name}} rechazó tu solicitud',
  'ECOPLAZA - PR #{{pr_number}} Rechazada',
  '<h2>Purchase Requisition Rechazada</h2><p>Tu Purchase Requisition #{{pr_number}} fue rechazada por {{approver_name}}.</p><div style="padding: 16px; background: #fee2e2; border: 2px solid #ef4444; border-radius: 8px; margin: 16px 0;"><p><strong>PR:</strong> #{{pr_number}}</p><p><strong>Monto:</strong> {{currency}} {{amount}}</p><p><strong>Motivo:</strong> {{rejection_reason}}</p></div><a href="{{action_url}}" style="display: inline-block; background: #1b967a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver detalles</a>',
  'high',
  'Ver detalles',
  true
) ON CONFLICT (type) DO NOTHING;

-- Template: Pago Registrado
INSERT INTO notification_templates (type, category, in_app_title, in_app_message, email_subject, email_body, priority, action_label, is_active)
VALUES (
  'payment_registered',
  'pagos',
  'Pago registrado: {{local_codigo}}',
  '{{actor_name}} registró un pago de {{currency}} {{amount}}',
  'ECOPLAZA - Pago Registrado: {{local_codigo}}',
  '<h2>Nuevo Pago Registrado</h2><p>{{actor_name}} registró un pago:</p><div style="padding: 16px; background: #f3f4f6; border-radius: 8px; margin: 16px 0;"><p><strong>Local:</strong> {{local_codigo}}</p><p><strong>Monto:</strong> {{currency}} {{amount}}</p><p><strong>Cliente:</strong> {{cliente_nombre}}</p></div><a href="{{action_url}}" style="display: inline-block; background: #1b967a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver pago</a>',
  'normal',
  'Ver pago',
  true
) ON CONFLICT (type) DO NOTHING;

-- Template: Pago Verificado
INSERT INTO notification_templates (type, category, in_app_title, in_app_message, email_subject, email_body, priority, action_label, is_active)
VALUES (
  'payment_verified',
  'pagos',
  'Pago verificado: {{local_codigo}}',
  '{{actor_name}} verificó el pago de {{currency}} {{amount}}',
  'ECOPLAZA - Pago Verificado: {{local_codigo}}',
  '<h2>Pago Verificado</h2><p>{{actor_name}} verificó el pago:</p><div style="padding: 16px; background: #d1fae5; border: 2px solid #10b981; border-radius: 8px; margin: 16px 0;"><p><strong>Local:</strong> {{local_codigo}}</p><p><strong>Monto:</strong> {{currency}} {{amount}}</p><p><strong>Verificado por:</strong> {{actor_name}}</p></div><a href="{{action_url}}" style="display: inline-block; background: #1b967a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Ver pago</a>',
  'normal',
  'Ver pago',
  true
) ON CONFLICT (type) DO NOTHING;

-- ============================================================================
-- COMENTARIOS FINALES
-- ============================================================================

COMMENT ON TABLE notifications IS 'Sistema centralizado de notificaciones para todos los módulos de ECOPLAZA';
COMMENT ON TABLE notification_preferences IS 'Preferencias de notificaciones por usuario (canales, quiet hours, digest)';
COMMENT ON TABLE notification_templates IS 'Templates reutilizables con placeholders para cada tipo de notificación';
COMMENT ON TABLE notification_delivery_log IS 'Log de entregas multi-canal (email, WhatsApp) para tracking y debugging';

COMMENT ON COLUMN notifications.type IS 'Tipo de evento: lead_assigned, pr_approved, etc.';
COMMENT ON COLUMN notifications.category IS 'Categoría del módulo: leads, purchase_requisitions, pagos, etc.';
COMMENT ON COLUMN notifications.priority IS 'Prioridad: urgent, high, normal, low';
COMMENT ON COLUMN notifications.metadata IS 'Datos flexibles en JSON específicos del tipo de notificación';
COMMENT ON COLUMN notifications.thread_key IS 'Clave para agrupar notificaciones relacionadas (lead-123, pr-456)';
COMMENT ON COLUMN notifications.is_saved IS 'Pin como importante, no se elimina en cleanup automático';
COMMENT ON COLUMN notifications.expires_at IS 'Fecha de expiración para cleanup automático (default: 5 meses)';
COMMENT ON COLUMN notification_preferences.channels IS 'Canales habilitados: {"in_app": true, "email": true, "whatsapp": false}';
COMMENT ON COLUMN notification_preferences.category_preferences IS 'Override de canales por categoría';

-- ============================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================================================

-- 1. REALTIME: Habilitar en Supabase Dashboard > Settings > Database > Publications
--    O ejecutar: ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 2. CLEANUP AUTOMÁTICO: Configurar pg_cron para ejecutar diariamente:
--    SELECT cron.schedule('cleanup-notifications', '0 3 * * *',
--      'SELECT cleanup_old_notifications(5);');
--    SELECT cron.schedule('mark-expired-notifications', '0 4 * * *',
--      'SELECT mark_expired_notifications();');

-- 3. PREFERENCIAS DEFAULT: Al crear un usuario, ejecutar:
--    SELECT create_default_notification_preferences(user_id);

-- 4. BADGE COUNTER: Para obtener el badge del header:
--    SELECT get_unread_notification_count(user_id);

-- 5. MARK ALL AS READ: Para marcar todas como leídas (en batches de 10K):
--    SELECT mark_all_as_read_batch(user_id, 10000);
--    Si devuelve 10000, ejecutar nuevamente hasta que devuelva < 10000.

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
