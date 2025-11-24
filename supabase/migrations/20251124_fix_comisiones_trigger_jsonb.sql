-- ============================================================================
-- MIGRATION: Fix Trigger Comisiones - Leer desde JSONB proyecto_configuraciones
-- ============================================================================
-- Fecha: 24 Noviembre 2025
-- Problema: Trigger intenta leer config_proyecto.comision_vendedor pero campo no existe
-- Solución: Leer desde proyecto_configuraciones.configuraciones_extra JSONB
-- ============================================================================

-- DROP existing trigger and function
DROP TRIGGER IF EXISTS trigger_crear_comisiones ON control_pagos;
DROP FUNCTION IF EXISTS crear_comisiones_desde_control_pagos();

-- CREATE new function with JSONB parsing
CREATE OR REPLACE FUNCTION crear_comisiones_desde_control_pagos()
RETURNS TRIGGER AS $$
DECLARE
  local_record RECORD;
  vendedor_asignado_record RECORD;
  usuario_naranja_record RECORD;
  usuario_rojo_record RECORD;
  usuario_procesado_record RECORD;
  config_data JSONB;
  vendedor_count INTEGER := 0;
  gestion_count INTEGER := 0;
  porcentaje_vendedor NUMERIC;
  porcentaje_gestion NUMERIC;
  comision_elem JSONB;
BEGIN
  -- Get local record
  SELECT * INTO local_record FROM locales WHERE id = NEW.local_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get proyecto configuraciones JSONB
  SELECT configuraciones_extra INTO config_data
  FROM proyecto_configuraciones
  WHERE proyecto_id = local_record.proyecto_id
  LIMIT 1;

  -- Get user records and count vendedores/gestion
  IF local_record.vendedor_actual_id IS NOT NULL THEN
    SELECT u.*, u.rol INTO vendedor_asignado_record
    FROM usuarios u WHERE u.id = local_record.vendedor_actual_id;
    IF FOUND THEN vendedor_count := vendedor_count + 1; END IF;
  END IF;

  IF local_record.usuario_paso_naranja_id IS NOT NULL AND
     local_record.usuario_paso_naranja_id IS DISTINCT FROM local_record.vendedor_actual_id THEN
    SELECT u.*, u.rol INTO usuario_naranja_record
    FROM usuarios u WHERE u.id = local_record.usuario_paso_naranja_id;
    IF FOUND THEN vendedor_count := vendedor_count + 1; END IF;
  END IF;

  IF local_record.usuario_paso_rojo_id IS NOT NULL THEN
    SELECT u.*, u.rol INTO usuario_rojo_record
    FROM usuarios u WHERE u.id = local_record.usuario_paso_rojo_id;
    IF FOUND THEN gestion_count := gestion_count + 1; END IF;
  END IF;

  IF NEW.procesado_por IS NOT NULL AND
     NEW.procesado_por IS DISTINCT FROM local_record.usuario_paso_rojo_id THEN
    SELECT u.*, u.rol INTO usuario_procesado_record
    FROM usuarios u WHERE u.id = NEW.procesado_por;
    IF FOUND THEN gestion_count := gestion_count + 1; END IF;
  END IF;

  -- ============================================================================
  -- COMISION VENDEDOR ASIGNADO (vendedor_actual_id)
  -- ============================================================================
  IF vendedor_asignado_record.id IS NOT NULL THEN
    -- Find matching commission percentage from JSONB
    porcentaje_vendedor := NULL;

    -- Loop through comisiones array in JSONB
    FOR comision_elem IN SELECT * FROM jsonb_array_elements(config_data->'comisiones')
    LOOP
      -- Check if rol matches AND user ID is in usuarios_ids array
      IF (comision_elem->>'rol') = vendedor_asignado_record.rol AND
         comision_elem->'usuarios_ids' @> jsonb_build_array(vendedor_asignado_record.id::text)
      THEN
        porcentaje_vendedor := (comision_elem->>'porcentaje')::numeric;
        EXIT; -- Found match, exit loop
      END IF;
    END LOOP;

    -- Insert commission if percentage was found
    IF porcentaje_vendedor IS NOT NULL THEN
      INSERT INTO comisiones (
        control_pago_id, local_id, usuario_id, rol_usuario, fase,
        porcentaje_comision, monto_venta, monto_comision,
        estado, fecha_procesado
      ) VALUES (
        NEW.id, local_record.id, vendedor_asignado_record.id, vendedor_asignado_record.rol, 'vendedor',
        CASE WHEN vendedor_count > 1 THEN porcentaje_vendedor / 2 ELSE porcentaje_vendedor END,
        NEW.monto_venta,
        (NEW.monto_venta * (CASE WHEN vendedor_count > 1 THEN porcentaje_vendedor / 2 ELSE porcentaje_vendedor END)) / 100,
        'pendiente_inicial', NEW.created_at
      );
    END IF;
  END IF;

  -- ============================================================================
  -- COMISION USUARIO NARANJA (usuario_paso_naranja_id)
  -- ============================================================================
  IF usuario_naranja_record.id IS NOT NULL THEN
    porcentaje_vendedor := NULL;

    FOR comision_elem IN SELECT * FROM jsonb_array_elements(config_data->'comisiones')
    LOOP
      IF (comision_elem->>'rol') = usuario_naranja_record.rol AND
         comision_elem->'usuarios_ids' @> jsonb_build_array(usuario_naranja_record.id::text)
      THEN
        porcentaje_vendedor := (comision_elem->>'porcentaje')::numeric;
        EXIT;
      END IF;
    END LOOP;

    IF porcentaje_vendedor IS NOT NULL THEN
      INSERT INTO comisiones (
        control_pago_id, local_id, usuario_id, rol_usuario, fase,
        porcentaje_comision, monto_venta, monto_comision,
        estado, fecha_procesado
      ) VALUES (
        NEW.id, local_record.id, usuario_naranja_record.id, usuario_naranja_record.rol, 'vendedor',
        CASE WHEN vendedor_count > 1 THEN porcentaje_vendedor / 2 ELSE porcentaje_vendedor END,
        NEW.monto_venta,
        (NEW.monto_venta * (CASE WHEN vendedor_count > 1 THEN porcentaje_vendedor / 2 ELSE porcentaje_vendedor END)) / 100,
        'pendiente_inicial', NEW.created_at
      );
    END IF;
  END IF;

  -- ============================================================================
  -- COMISION USUARIO ROJO (usuario_paso_rojo_id) - FASE GESTION
  -- ============================================================================
  IF usuario_rojo_record.id IS NOT NULL THEN
    porcentaje_gestion := NULL;

    FOR comision_elem IN SELECT * FROM jsonb_array_elements(config_data->'comisiones')
    LOOP
      IF (comision_elem->>'rol') = usuario_rojo_record.rol AND
         comision_elem->'usuarios_ids' @> jsonb_build_array(usuario_rojo_record.id::text)
      THEN
        porcentaje_gestion := (comision_elem->>'porcentaje')::numeric;
        EXIT;
      END IF;
    END LOOP;

    IF porcentaje_gestion IS NOT NULL THEN
      INSERT INTO comisiones (
        control_pago_id, local_id, usuario_id, rol_usuario, fase,
        porcentaje_comision, monto_venta, monto_comision,
        estado, fecha_procesado
      ) VALUES (
        NEW.id, local_record.id, usuario_rojo_record.id, usuario_rojo_record.rol, 'gestion',
        CASE WHEN gestion_count > 1 THEN porcentaje_gestion / 2 ELSE porcentaje_gestion END,
        NEW.monto_venta,
        (NEW.monto_venta * (CASE WHEN gestion_count > 1 THEN porcentaje_gestion / 2 ELSE porcentaje_gestion END)) / 100,
        'pendiente_inicial', NEW.created_at
      );
    END IF;
  END IF;

  -- ============================================================================
  -- COMISION USUARIO PROCESADO (procesado_por) - FASE GESTION
  -- ============================================================================
  IF usuario_procesado_record.id IS NOT NULL THEN
    porcentaje_gestion := NULL;

    FOR comision_elem IN SELECT * FROM jsonb_array_elements(config_data->'comisiones')
    LOOP
      IF (comision_elem->>'rol') = usuario_procesado_record.rol AND
         comision_elem->'usuarios_ids' @> jsonb_build_array(usuario_procesado_record.id::text)
      THEN
        porcentaje_gestion := (comision_elem->>'porcentaje')::numeric;
        EXIT;
      END IF;
    END LOOP;

    IF porcentaje_gestion IS NOT NULL THEN
      INSERT INTO comisiones (
        control_pago_id, local_id, usuario_id, rol_usuario, fase,
        porcentaje_comision, monto_venta, monto_comision,
        estado, fecha_procesado
      ) VALUES (
        NEW.id, local_record.id, usuario_procesado_record.id, usuario_procesado_record.rol, 'gestion',
        CASE WHEN gestion_count > 1 THEN porcentaje_gestion / 2 ELSE porcentaje_gestion END,
        NEW.monto_venta,
        (NEW.monto_venta * (CASE WHEN gestion_count > 1 THEN porcentaje_gestion / 2 ELSE porcentaje_gestion END)) / 100,
        'pendiente_inicial', NEW.created_at
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CREATE trigger
CREATE TRIGGER trigger_crear_comisiones
AFTER INSERT ON control_pagos
FOR EACH ROW
EXECUTE FUNCTION crear_comisiones_desde_control_pagos();

-- ============================================================================
-- NOTAS:
-- - Reemplaza trigger original que leía config_proyecto.comision_*
-- - Lee desde proyecto_configuraciones.configuraciones_extra JSONB
-- - Busca en array 'comisiones' la entrada que coincida con rol Y usuario_id
-- - Extrae 'porcentaje' de la entrada coincidente
-- - Mantiene lógica de split 50% cuando hay 2 vendedores/gestion
-- - Mantiene estados y fechas originales
-- ============================================================================
