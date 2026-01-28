-- ============================================================================
-- MIGRACIÓN 033: Corregir trigger de auditoría - remover campo titular_sexo
-- Fecha: 2026-01-27
-- Descripción: El campo titular_sexo no existe en clientes_ficha pero el trigger
--              lo referencia, causando error al guardar fichas
-- ============================================================================

-- Recrear la función sin referencia a titular_sexo
CREATE OR REPLACE FUNCTION fn_fichas_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id UUID;
  v_usuario_nombre TEXT;
  v_usuario_rol TEXT;
  v_origen TEXT;
  v_local_anterior_codigo TEXT;
  v_local_anterior_piso TEXT;
  v_local_nuevo_codigo TEXT;
  v_local_nuevo_piso TEXT;
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
    -- CAMBIO DE LOCAL: NO manejado por trigger
    -- El server action (cambiarLocalFicha) lo maneja con todo el contexto:
    -- motivo, piso, autorización, etc.
    -- Si alguien cambia local_id directamente via SQL, no se audita aquí.
    -- ====================================================================
    -- (Comentado para evitar duplicados con server action)
    -- IF OLD.local_id IS DISTINCT FROM NEW.local_id THEN ... END IF;

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
    -- DATOS ADICIONALES DEL TITULAR
    -- ====================================================================

    -- titular_estado_civil
    IF OLD.titular_estado_civil IS DISTINCT FROM NEW.titular_estado_civil THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'titular_estado_civil', OLD.titular_estado_civil, NEW.titular_estado_civil, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- titular_fecha_nacimiento
    IF OLD.titular_fecha_nacimiento IS DISTINCT FROM NEW.titular_fecha_nacimiento THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'titular_fecha_nacimiento', OLD.titular_fecha_nacimiento::TEXT, NEW.titular_fecha_nacimiento::TEXT, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- NOTA: titular_sexo fue removido - el campo no existe en la tabla clientes_ficha

    -- titular_ocupacion
    IF OLD.titular_ocupacion IS DISTINCT FROM NEW.titular_ocupacion THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'titular_ocupacion', OLD.titular_ocupacion, NEW.titular_ocupacion, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
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

    -- utm_source
    IF OLD.utm_source IS DISTINCT FROM NEW.utm_source THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'utm_source', OLD.utm_source, NEW.utm_source, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- estado
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'estado', OLD.estado, NEW.estado, v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    -- contrato_url
    IF OLD.contrato_url IS DISTINCT FROM NEW.contrato_url THEN
      INSERT INTO fichas_historial (ficha_id, accion, campo, valor_anterior, valor_nuevo, usuario_id, usuario_nombre, usuario_rol, origen)
      VALUES (NEW.id, 'UPDATE', 'contrato_url',
        CASE WHEN OLD.contrato_url IS NULL THEN '(sin contrato)' ELSE 'contrato anterior' END,
        CASE WHEN NEW.contrato_url IS NULL THEN '(sin contrato)' ELSE 'contrato nuevo' END,
        v_usuario_id, v_usuario_nombre, v_usuario_rol, v_origen);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIN DE MIGRACIÓN 033
-- ============================================================================
