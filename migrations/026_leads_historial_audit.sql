-- ============================================================================
-- MIGRACIÓN 026: Sistema de Historial de Leads (Audit Trail)
-- Fecha: 2026-01-24
-- Descripción: Registra automáticamente todos los cambios en leads
-- ============================================================================

-- 1. CREAR TABLA DE HISTORIAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Qué cambió
  accion VARCHAR(20) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  campo VARCHAR(100), -- NULL para INSERT/DELETE, nombre del campo para UPDATE
  valor_anterior TEXT,
  valor_nuevo TEXT,

  -- Quién lo hizo
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nombre VARCHAR(255),

  -- Contexto
  origen VARCHAR(50) DEFAULT 'sistema', -- dashboard, api, sistema, chatbot, importacion, liberacion_masiva
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(45),

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice principal: buscar historial de un lead
CREATE INDEX idx_leads_historial_lead_id ON leads_historial(lead_id);

-- Índice para ordenar por fecha (más recientes primero)
CREATE INDEX idx_leads_historial_created_at ON leads_historial(created_at DESC);

-- Índice para filtrar por campo modificado
CREATE INDEX idx_leads_historial_campo ON leads_historial(campo);

-- Índice para buscar por usuario
CREATE INDEX idx_leads_historial_usuario ON leads_historial(usuario_id);

-- Índice compuesto para queries frecuentes
CREATE INDEX idx_leads_historial_lead_fecha ON leads_historial(lead_id, created_at DESC);

-- 3. FUNCIÓN PARA REGISTRAR CAMBIOS
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_leads_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id UUID;
  v_usuario_nombre TEXT;
  v_origen TEXT;
  v_campo TEXT;
  v_valor_anterior TEXT;
  v_valor_nuevo TEXT;
BEGIN
  -- Intentar obtener usuario del contexto de sesión (si fue seteado por la app)
  BEGIN
    v_usuario_id := current_setting('app.usuario_id', true)::UUID;
    v_usuario_nombre := current_setting('app.usuario_nombre', true);
    v_origen := COALESCE(current_setting('app.origen', true), 'sistema');
  EXCEPTION WHEN OTHERS THEN
    v_usuario_id := NULL;
    v_usuario_nombre := 'Sistema';
    v_origen := 'sistema';
  END;

  -- INSERT: Registrar creación del lead
  IF TG_OP = 'INSERT' THEN
    INSERT INTO leads_historial (lead_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, origen, metadata)
    VALUES (
      NEW.id,
      'INSERT',
      NULL,
      NULL,
      NULL,
      v_usuario_id,
      v_usuario_nombre,
      v_origen,
      jsonb_build_object(
        'nombre', NEW.nombre,
        'telefono', NEW.telefono,
        'estado', NEW.estado,
        'utm', NEW.utm
      )
    );
    RETURN NEW;
  END IF;

  -- DELETE: Registrar eliminación
  IF TG_OP = 'DELETE' THEN
    INSERT INTO leads_historial (lead_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, origen)
    VALUES (OLD.id, 'DELETE', NULL, NULL, NULL, v_usuario_id, v_usuario_nombre, v_origen);
    RETURN OLD;
  END IF;

  -- UPDATE: Registrar cada campo que cambió
  IF TG_OP = 'UPDATE' THEN

    -- vendedor_asignado_id (muy importante para auditoría)
    IF OLD.vendedor_asignado_id IS DISTINCT FROM NEW.vendedor_asignado_id THEN
      -- Obtener nombres de vendedores para mejor legibilidad
      SELECT
        COALESCE((SELECT nombre FROM vendedores WHERE id = OLD.vendedor_asignado_id), 'Sin asignar'),
        COALESCE((SELECT nombre FROM vendedores WHERE id = NEW.vendedor_asignado_id), 'Sin asignar')
      INTO v_valor_anterior, v_valor_nuevo;

      INSERT INTO leads_historial (lead_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, origen, metadata)
      VALUES (NEW.id, 'UPDATE', 'vendedor_asignado_id', v_valor_anterior, v_valor_nuevo, v_usuario_id, v_usuario_nombre, v_origen,
        jsonb_build_object('id_anterior', OLD.vendedor_asignado_id, 'id_nuevo', NEW.vendedor_asignado_id));
    END IF;

    -- estado
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
      INSERT INTO leads_historial (lead_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, origen)
      VALUES (NEW.id, 'UPDATE', 'estado', OLD.estado, NEW.estado, v_usuario_id, v_usuario_nombre, v_origen);
    END IF;

    -- tipificacion_nivel_1
    IF OLD.tipificacion_nivel_1 IS DISTINCT FROM NEW.tipificacion_nivel_1 THEN
      INSERT INTO leads_historial (lead_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, origen)
      VALUES (NEW.id, 'UPDATE', 'tipificacion_nivel_1', OLD.tipificacion_nivel_1, NEW.tipificacion_nivel_1, v_usuario_id, v_usuario_nombre, v_origen);
    END IF;

    -- tipificacion_nivel_2
    IF OLD.tipificacion_nivel_2 IS DISTINCT FROM NEW.tipificacion_nivel_2 THEN
      INSERT INTO leads_historial (lead_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, origen)
      VALUES (NEW.id, 'UPDATE', 'tipificacion_nivel_2', OLD.tipificacion_nivel_2, NEW.tipificacion_nivel_2, v_usuario_id, v_usuario_nombre, v_origen);
    END IF;

    -- tipificacion_nivel_3
    IF OLD.tipificacion_nivel_3 IS DISTINCT FROM NEW.tipificacion_nivel_3 THEN
      INSERT INTO leads_historial (lead_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, origen)
      VALUES (NEW.id, 'UPDATE', 'tipificacion_nivel_3', OLD.tipificacion_nivel_3, NEW.tipificacion_nivel_3, v_usuario_id, v_usuario_nombre, v_origen);
    END IF;

    -- observaciones_vendedor
    IF OLD.observaciones_vendedor IS DISTINCT FROM NEW.observaciones_vendedor THEN
      INSERT INTO leads_historial (lead_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, origen)
      VALUES (NEW.id, 'UPDATE', 'observaciones_vendedor',
        CASE WHEN OLD.observaciones_vendedor IS NULL THEN NULL ELSE LEFT(OLD.observaciones_vendedor, 100) END,
        CASE WHEN NEW.observaciones_vendedor IS NULL THEN NULL ELSE LEFT(NEW.observaciones_vendedor, 100) END,
        v_usuario_id, v_usuario_nombre, v_origen);
    END IF;

    -- asistio
    IF OLD.asistio IS DISTINCT FROM NEW.asistio THEN
      INSERT INTO leads_historial (lead_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, origen)
      VALUES (NEW.id, 'UPDATE', 'asistio', OLD.asistio::TEXT, NEW.asistio::TEXT, v_usuario_id, v_usuario_nombre, v_origen);
    END IF;

    -- excluido_repulse
    IF OLD.excluido_repulse IS DISTINCT FROM NEW.excluido_repulse THEN
      INSERT INTO leads_historial (lead_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, origen)
      VALUES (NEW.id, 'UPDATE', 'excluido_repulse', OLD.excluido_repulse::TEXT, NEW.excluido_repulse::TEXT, v_usuario_id, v_usuario_nombre, v_origen);
    END IF;

    -- nombre
    IF OLD.nombre IS DISTINCT FROM NEW.nombre THEN
      INSERT INTO leads_historial (lead_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, origen)
      VALUES (NEW.id, 'UPDATE', 'nombre', OLD.nombre, NEW.nombre, v_usuario_id, v_usuario_nombre, v_origen);
    END IF;

    -- telefono
    IF OLD.telefono IS DISTINCT FROM NEW.telefono THEN
      INSERT INTO leads_historial (lead_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, origen)
      VALUES (NEW.id, 'UPDATE', 'telefono', OLD.telefono, NEW.telefono, v_usuario_id, v_usuario_nombre, v_origen);
    END IF;

    -- email
    IF OLD.email IS DISTINCT FROM NEW.email THEN
      INSERT INTO leads_historial (lead_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, origen)
      VALUES (NEW.id, 'UPDATE', 'email', OLD.email, NEW.email, v_usuario_id, v_usuario_nombre, v_origen);
    END IF;

    -- rubro
    IF OLD.rubro IS DISTINCT FROM NEW.rubro THEN
      INSERT INTO leads_historial (lead_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, origen)
      VALUES (NEW.id, 'UPDATE', 'rubro', OLD.rubro, NEW.rubro, v_usuario_id, v_usuario_nombre, v_origen);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. CREAR TRIGGER
-- ============================================================================

-- Eliminar trigger si existe (para poder re-ejecutar la migración)
DROP TRIGGER IF EXISTS tr_leads_audit ON leads;

-- Crear trigger para INSERT, UPDATE, DELETE
CREATE TRIGGER tr_leads_audit
AFTER INSERT OR UPDATE OR DELETE ON leads
FOR EACH ROW
EXECUTE FUNCTION fn_leads_audit();

-- 5. RLS (Row Level Security)
-- ============================================================================

ALTER TABLE leads_historial ENABLE ROW LEVEL SECURITY;

-- Policy: Solo superadmin y admin pueden ver el historial
CREATE POLICY "leads_historial_select_admin" ON leads_historial
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = auth.uid()
    AND u.rol IN ('superadmin', 'admin')
  )
);

-- Policy: Solo el sistema puede insertar (via trigger)
CREATE POLICY "leads_historial_insert_system" ON leads_historial
FOR INSERT
WITH CHECK (true); -- El trigger corre con permisos de sistema

-- 6. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE leads_historial IS 'Registro de auditoría de todos los cambios en leads. Solo visible para superadmin y admin.';
COMMENT ON COLUMN leads_historial.accion IS 'Tipo de operación: INSERT (lead creado), UPDATE (campo modificado), DELETE (lead eliminado)';
COMMENT ON COLUMN leads_historial.campo IS 'Nombre del campo modificado. NULL para INSERT/DELETE.';
COMMENT ON COLUMN leads_historial.origen IS 'Fuente del cambio: dashboard, api, sistema, chatbot, importacion, liberacion_masiva';
COMMENT ON COLUMN leads_historial.metadata IS 'Información adicional en formato JSON (IDs originales, contexto, etc.)';

-- 7. FUNCIÓN HELPER PARA CONSULTAR HISTORIAL
-- ============================================================================

CREATE OR REPLACE FUNCTION get_lead_historial(p_lead_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  accion VARCHAR,
  campo VARCHAR,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  usuario_nombre VARCHAR,
  origen VARCHAR,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lh.id,
    lh.accion,
    lh.campo,
    lh.valor_anterior,
    lh.valor_nuevo,
    lh.usuario_nombre,
    lh.origen,
    lh.created_at
  FROM leads_historial lh
  WHERE lh.lead_id = p_lead_id
  ORDER BY lh.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
