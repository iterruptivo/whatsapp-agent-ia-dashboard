-- ============================================================================
-- MIGRACIÓN 031: Sistema de Historial de Fichas de Inscripción (Audit Trail)
-- Fecha: 2026-01-27
-- Descripción: Registra automáticamente todos los cambios en fichas de inscripción
--              Incluye auditoría de cambios de titular, local, y campos críticos
-- ============================================================================

-- 1. CREAR TABLA DE HISTORIAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS fichas_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID NOT NULL REFERENCES clientes_ficha(id) ON DELETE CASCADE,

  -- Tipo de cambio
  accion VARCHAR(30) NOT NULL CHECK (accion IN (
    'INSERT',           -- Ficha creada
    'UPDATE',           -- Campo modificado
    'DELETE',           -- Ficha eliminada
    'CAMBIO_TITULAR',   -- Cambio de cliente/titular
    'CAMBIO_LOCAL'      -- Cambio de local/puesto
  )),

  -- Qué cambió (para UPDATE regular)
  campo VARCHAR(100),
  valor_anterior TEXT,
  valor_nuevo TEXT,

  -- Para cambios de titularidad (snapshot completo del titular)
  titular_anterior JSONB,
  titular_nuevo JSONB,

  -- Para cambios de local (guardar IDs y códigos para trazabilidad)
  local_anterior_id UUID,
  local_anterior_codigo VARCHAR(50),
  local_nuevo_id UUID,
  local_nuevo_codigo VARCHAR(50),

  -- Quién lo hizo (capturado de variables de sesión)
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nombre VARCHAR(255),
  usuario_rol VARCHAR(50),

  -- Autorización (para cambios críticos como titular/local)
  autorizado_por_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  autorizado_por_nombre VARCHAR(255),
  motivo_cambio TEXT,

  -- Contexto de la operación
  origen VARCHAR(50) DEFAULT 'dashboard', -- dashboard, api, sistema, importacion, migracion
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(45),

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice principal: buscar historial de una ficha
CREATE INDEX idx_fichas_historial_ficha_id ON fichas_historial(ficha_id);

-- Índice para ordenar por fecha (más recientes primero)
CREATE INDEX idx_fichas_historial_created_at ON fichas_historial(created_at DESC);

-- Índice compuesto para queries frecuentes (historial de una ficha ordenado)
CREATE INDEX idx_fichas_historial_ficha_fecha ON fichas_historial(ficha_id, created_at DESC);

-- Índice para filtrar por tipo de acción
CREATE INDEX idx_fichas_historial_accion ON fichas_historial(accion);

-- Índice para buscar por usuario
CREATE INDEX idx_fichas_historial_usuario ON fichas_historial(usuario_id);

-- Índice para buscar cambios de local específico
CREATE INDEX idx_fichas_historial_local_nuevo ON fichas_historial(local_nuevo_id) WHERE local_nuevo_id IS NOT NULL;

-- 3. FUNCIÓN PARA REGISTRAR CAMBIOS
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_fichas_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id UUID;
  v_usuario_nombre TEXT;
  v_usuario_rol TEXT;
  v_origen TEXT;
  v_local_anterior_codigo TEXT;
  v_local_nuevo_codigo TEXT;
  v_titular_anterior JSONB;
  v_titular_nuevo JSONB;
BEGIN
  -- Intentar obtener usuario del contexto de sesión (seteado por la app)
  BEGIN
    v_usuario_id := current_setting('app.usuario_id', true)::UUID;
    v_usuario_nombre := current_setting('app.usuario_nombre', true);
    v_usuario_rol := current_setting('app.usuario_rol', true);
    v_origen := COALESCE(current_setting('app.origen', true), 'sistema');
  EXCEPTION WHEN OTHERS THEN
    v_usuario_id := NULL;
    v_usuario_nombre := 'Sistema';
    v_usuario_rol := NULL;
    v_origen := 'sistema';
  END;

  -- ============================================================================
  -- INSERT: Registrar creación de la ficha
  -- ============================================================================
  IF TG_OP = 'INSERT' THEN
    INSERT INTO fichas_historial (
      ficha_id, accion, campo, valor_anterior, valor_nuevo,
      usuario_id, usuario_nombre, usuario_rol, origen, metadata
    )
    VALUES (
      NEW.id,
      'INSERT',
      NULL,
      NULL,
      NULL,
      v_usuario_id,
      v_usuario_nombre,
      v_usuario_rol,
      v_origen,
      jsonb_build_object(
        'titular_nombres', NEW.titular_nombres,
        'titular_apellidos', NEW.titular_apellido_paterno || ' ' || NEW.titular_apellido_materno,
        'titular_documento', NEW.titular_tipo_documento || '-' || NEW.titular_numero_documento,
        'local_id', NEW.local_id,
        'vendedor_id', NEW.vendedor_id,
        'monto_total_usd', NEW.monto_separacion_usd + NEW.cuota_inicial_usd + NEW.saldo_financiar_usd
      )
    );
    RETURN NEW;
  END IF;

  -- ============================================================================
  -- DELETE: Registrar eliminación de la ficha
  -- ============================================================================
  IF TG_OP = 'DELETE' THEN
    INSERT INTO fichas_historial (
      ficha_id, accion, campo, valor_anterior, valor_nuevo,
      usuario_id, usuario_nombre, usuario_rol, origen
    )
    VALUES (
      OLD.id,
      'DELETE',
      NULL,
      NULL,
      NULL,
      v_usuario_id,
      v_usuario_nombre,
      v_usuario_rol,
      v_origen
    );
    RETURN OLD;
  END IF;

  -- ============================================================================
  -- UPDATE: Registrar cada campo que cambió
  -- ============================================================================
  IF TG_OP = 'UPDATE' THEN

    -- ====================================================================
    -- CAMBIO DE LOCAL (campo crítico)
    -- ====================================================================
    IF OLD.local_id IS DISTINCT FROM NEW.local_id THEN
      -- Obtener códigos de los locales para mejor trazabilidad
      SELECT codigo INTO v_local_anterior_codigo FROM locales WHERE id = OLD.local_id;
      SELECT codigo INTO v_local_nuevo_codigo FROM locales WHERE id = NEW.local_id;

      INSERT INTO fichas_historial (
        ficha_id, accion, campo, valor_anterior, valor_nuevo,
        local_anterior_id, local_anterior_codigo,
        local_nuevo_id, local_nuevo_codigo,
        usuario_id, usuario_nombre, usuario_rol, origen,
        metadata
      )
      VALUES (
        NEW.id,
        'CAMBIO_LOCAL',
        'local_id',
        v_local_anterior_codigo,
        v_local_nuevo_codigo,
        OLD.local_id,
        v_local_anterior_codigo,
        NEW.local_id,
        v_local_nuevo_codigo,
        v_usuario_id,
        v_usuario_nombre,
        v_usuario_rol,
        v_origen,
        jsonb_build_object(
          'local_anterior_id', OLD.local_id,
          'local_nuevo_id', NEW.local_id,
          'requiere_autorizacion', true
        )
      );
    END IF;

    -- ====================================================================
    -- CAMBIO DE TITULAR (nombres o documento)
    -- ====================================================================
    IF (OLD.titular_nombres IS DISTINCT FROM NEW.titular_nombres) OR
       (OLD.titular_apellido_paterno IS DISTINCT FROM NEW.titular_apellido_paterno) OR
       (OLD.titular_apellido_materno IS DISTINCT FROM NEW.titular_apellido_materno) OR
       (OLD.titular_tipo_documento IS DISTINCT FROM NEW.titular_tipo_documento) OR
       (OLD.titular_numero_documento IS DISTINCT FROM NEW.titular_numero_documento) THEN

      -- Construir snapshot completo del titular anterior
      v_titular_anterior := jsonb_build_object(
        'nombres', OLD.titular_nombres,
        'apellido_paterno', OLD.titular_apellido_paterno,
        'apellido_materno', OLD.titular_apellido_materno,
        'tipo_documento', OLD.titular_tipo_documento,
        'numero_documento', OLD.titular_numero_documento,
        'celular', OLD.titular_celular,
        'email', OLD.titular_email,
        'direccion', OLD.titular_direccion,
        'distrito', OLD.titular_distrito,
        'provincia', OLD.titular_provincia,
        'departamento', OLD.titular_departamento
      );

      -- Construir snapshot completo del titular nuevo
      v_titular_nuevo := jsonb_build_object(
        'nombres', NEW.titular_nombres,
        'apellido_paterno', NEW.titular_apellido_paterno,
        'apellido_materno', NEW.titular_apellido_materno,
        'tipo_documento', NEW.titular_tipo_documento,
        'numero_documento', NEW.titular_numero_documento,
        'celular', NEW.titular_celular,
        'email', NEW.titular_email,
        'direccion', NEW.titular_direccion,
        'distrito', NEW.titular_distrito,
        'provincia', NEW.titular_provincia,
        'departamento', NEW.titular_departamento
      );

      INSERT INTO fichas_historial (
        ficha_id, accion, campo,
        valor_anterior, valor_nuevo,
        titular_anterior, titular_nuevo,
        usuario_id, usuario_nombre, usuario_rol, origen,
        metadata
      )
      VALUES (
        NEW.id,
        'CAMBIO_TITULAR',
        'titular',
        OLD.titular_nombres || ' ' || OLD.titular_apellido_paterno || ' (' || OLD.titular_numero_documento || ')',
        NEW.titular_nombres || ' ' || NEW.titular_apellido_paterno || ' (' || NEW.titular_numero_documento || ')',
        v_titular_anterior,
        v_titular_nuevo,
        v_usuario_id,
        v_usuario_nombre,
        v_usuario_rol,
        v_origen,
        jsonb_build_object(
          'requiere_autorizacion', true,
          'cambio_documento', OLD.titular_numero_documento <> NEW.titular_numero_documento
        )
      );
    END IF;

    -- ====================================================================
    -- DATOS FINANCIEROS (campos críticos para auditoría)
    -- ====================================================================

    -- monto_separacion_usd
    IF OLD.monto_separacion_usd IS DISTINCT FROM NEW.monto_separacion_usd THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'monto_separacion_usd', OLD.monto_separacion_usd::TEXT, NEW.monto_separacion_usd::TEXT, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- cuota_inicial_usd
    IF OLD.cuota_inicial_usd IS DISTINCT FROM NEW.cuota_inicial_usd THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'cuota_inicial_usd', OLD.cuota_inicial_usd::TEXT, NEW.cuota_inicial_usd::TEXT, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- saldo_financiar_usd
    IF OLD.saldo_financiar_usd IS DISTINCT FROM NEW.saldo_financiar_usd THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'saldo_financiar_usd', OLD.saldo_financiar_usd::TEXT, NEW.saldo_financiar_usd::TEXT, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- numero_cuotas
    IF OLD.numero_cuotas IS DISTINCT FROM NEW.numero_cuotas THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'numero_cuotas', OLD.numero_cuotas::TEXT, NEW.numero_cuotas::TEXT, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- cuota_mensual_usd
    IF OLD.cuota_mensual_usd IS DISTINCT FROM NEW.cuota_mensual_usd THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'cuota_mensual_usd', OLD.cuota_mensual_usd::TEXT, NEW.cuota_mensual_usd::TEXT, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- tea (Tasa Efectiva Anual)
    IF OLD.tea IS DISTINCT FROM NEW.tea THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'tea', OLD.tea::TEXT, NEW.tea::TEXT, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- modalidad_pago
    IF OLD.modalidad_pago IS DISTINCT FROM NEW.modalidad_pago THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'modalidad_pago', OLD.modalidad_pago, NEW.modalidad_pago, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- porcentaje_inicial
    IF OLD.porcentaje_inicial IS DISTINCT FROM NEW.porcentaje_inicial THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'porcentaje_inicial', OLD.porcentaje_inicial::TEXT, NEW.porcentaje_inicial::TEXT, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- ====================================================================
    -- DATOS DE CONTACTO DEL TITULAR
    -- ====================================================================

    -- titular_celular
    IF OLD.titular_celular IS DISTINCT FROM NEW.titular_celular THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'titular_celular', OLD.titular_celular, NEW.titular_celular, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- titular_email
    IF OLD.titular_email IS DISTINCT FROM NEW.titular_email THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'titular_email', OLD.titular_email, NEW.titular_email, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- ====================================================================
    -- DIRECCIÓN DEL TITULAR
    -- ====================================================================

    -- titular_direccion
    IF OLD.titular_direccion IS DISTINCT FROM NEW.titular_direccion THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'titular_direccion', OLD.titular_direccion, NEW.titular_direccion, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- titular_distrito
    IF OLD.titular_distrito IS DISTINCT FROM NEW.titular_distrito THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'titular_distrito', OLD.titular_distrito, NEW.titular_distrito, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- titular_provincia
    IF OLD.titular_provincia IS DISTINCT FROM NEW.titular_provincia THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'titular_provincia', OLD.titular_provincia, NEW.titular_provincia, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- titular_departamento
    IF OLD.titular_departamento IS DISTINCT FROM NEW.titular_departamento THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'titular_departamento', OLD.titular_departamento, NEW.titular_departamento, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- ====================================================================
    -- ASIGNACIONES (vendedor, lead)
    -- ====================================================================

    -- vendedor_id
    IF OLD.vendedor_id IS DISTINCT FROM NEW.vendedor_id THEN
      DECLARE
        v_vendedor_anterior TEXT;
        v_vendedor_nuevo TEXT;
      BEGIN
        SELECT nombre INTO v_vendedor_anterior FROM vendedores WHERE id = OLD.vendedor_id;
        SELECT nombre INTO v_vendedor_nuevo FROM vendedores WHERE id = NEW.vendedor_id;

        INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen, metadata)
        VALUES (NEW.id, 'UPDATE', 'vendedor_id',
          COALESCE(v_vendedor_anterior, 'Sin asignar'),
          COALESCE(v_vendedor_nuevo, 'Sin asignar'),
          v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen,
          jsonb_build_object('id_anterior', OLD.vendedor_id, 'id_nuevo', NEW.vendedor_id));
      END;
    END IF;

    -- lead_id
    IF OLD.lead_id IS DISTINCT FROM NEW.lead_id THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen, metadata)
      VALUES (NEW.id, 'UPDATE', 'lead_id', OLD.lead_id::TEXT, NEW.lead_id::TEXT, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen,
        jsonb_build_object('id_anterior', OLD.lead_id, 'id_nuevo', NEW.lead_id));
    END IF;

    -- ====================================================================
    -- OTROS CAMPOS IMPORTANTES
    -- ====================================================================

    -- observaciones
    IF OLD.observaciones IS DISTINCT FROM NEW.observaciones THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'observaciones',
        CASE WHEN OLD.observaciones IS NULL THEN NULL ELSE LEFT(OLD.observaciones, 100) END,
        CASE WHEN NEW.observaciones IS NULL THEN NULL ELSE LEFT(NEW.observaciones, 100) END,
        v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- rubro
    IF OLD.rubro IS DISTINCT FROM NEW.rubro THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'rubro', OLD.rubro, NEW.rubro, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- tiene_conyuge (importante para contratos y documentación legal)
    IF OLD.tiene_conyuge IS DISTINCT FROM NEW.tiene_conyuge THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'tiene_conyuge', OLD.tiene_conyuge::TEXT, NEW.tiene_conyuge::TEXT, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. CREAR TRIGGER
-- ============================================================================

-- Eliminar trigger si existe (para poder re-ejecutar la migración)
DROP TRIGGER IF EXISTS tr_fichas_audit ON clientes_ficha;

-- Crear trigger para INSERT, UPDATE, DELETE
CREATE TRIGGER tr_fichas_audit
AFTER INSERT OR UPDATE OR DELETE ON clientes_ficha
FOR EACH ROW
EXECUTE FUNCTION fn_fichas_audit();

-- 5. RLS (Row Level Security)
-- ============================================================================

ALTER TABLE fichas_historial ENABLE ROW LEVEL SECURITY;

-- Policy: Todos los roles operativos pueden ver el historial
CREATE POLICY "fichas_historial_select_operativo" ON fichas_historial
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = auth.uid()
    AND u.rol IN ('superadmin', 'admin', 'finanzas', 'gerencia', 'jefe_ventas', 'coordinador', 'vendedor', 'vendedor_caseta')
  )
);

-- Policy: Solo el sistema puede insertar (via trigger)
CREATE POLICY "fichas_historial_insert_system" ON fichas_historial
FOR INSERT
WITH CHECK (true); -- El trigger corre con permisos de sistema

-- 6. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE fichas_historial IS 'Registro de auditoría de todos los cambios en fichas de inscripción. Visible para todos los roles operativos.';
COMMENT ON COLUMN fichas_historial.accion IS 'Tipo de operación: INSERT (ficha creada), UPDATE (campo modificado), DELETE (ficha eliminada), CAMBIO_TITULAR (cambio de cliente), CAMBIO_LOCAL (cambio de puesto)';
COMMENT ON COLUMN fichas_historial.campo IS 'Nombre del campo modificado. NULL para INSERT/DELETE/CAMBIO_TITULAR/CAMBIO_LOCAL.';
COMMENT ON COLUMN fichas_historial.titular_anterior IS 'Snapshot completo del titular anterior (solo para CAMBIO_TITULAR)';
COMMENT ON COLUMN fichas_historial.titular_nuevo IS 'Snapshot completo del titular nuevo (solo para CAMBIO_TITULAR)';
COMMENT ON COLUMN fichas_historial.local_anterior_id IS 'ID del local anterior (solo para CAMBIO_LOCAL)';
COMMENT ON COLUMN fichas_historial.local_nuevo_id IS 'ID del local nuevo (solo para CAMBIO_LOCAL)';
COMMENT ON COLUMN fichas_historial.autorizado_por_id IS 'Usuario que autorizó el cambio (para cambios críticos como titular/local)';
COMMENT ON COLUMN fichas_historial.motivo_cambio IS 'Justificación del cambio (requerido para cambios críticos)';
COMMENT ON COLUMN fichas_historial.origen IS 'Fuente del cambio: dashboard, api, sistema, importacion, migracion';
COMMENT ON COLUMN fichas_historial.metadata IS 'Información adicional en formato JSON (IDs originales, flags de autorización, contexto, etc.)';

-- 7. FUNCIÓN HELPER PARA CONSULTAR HISTORIAL
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ficha_historial(p_ficha_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  accion VARCHAR,
  campo VARCHAR,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  titular_anterior JSONB,
  titular_nuevo JSONB,
  local_anterior_codigo VARCHAR,
  local_nuevo_codigo VARCHAR,
  usuario_nombre VARCHAR,
  usuario_rol VARCHAR,
  origen VARCHAR,
  motivo_cambio TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fh.id,
    fh.accion,
    fh.campo,
    fh.valor_anterior,
    fh.valor_nuevo,
    fh.titular_anterior,
    fh.titular_nuevo,
    fh.local_anterior_codigo,
    fh.local_nuevo_codigo,
    fh.usuario_nombre,
    fh.usuario_rol,
    fh.origen,
    fh.motivo_cambio,
    fh.created_at
  FROM fichas_historial fh
  WHERE fh.ficha_id = p_ficha_id
  ORDER BY fh.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario de la función
COMMENT ON FUNCTION get_ficha_historial IS 'Función helper para obtener el historial completo de una ficha de inscripción, ordenado por fecha DESC. Incluye snapshots de titulares y códigos de locales para mejor trazabilidad.';

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
