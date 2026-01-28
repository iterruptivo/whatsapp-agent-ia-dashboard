-- =============================================================================
-- Migración 035: Sincronizar datos JSONB a tabla depositos_ficha
-- Fecha: 2026-01-27
-- Descripción: Sincroniza datos editados en comprobante_deposito_ocr (JSONB)
--              hacia la tabla normalizada depositos_ficha.
--              El JSONB tiene datos más recientes porque los usuarios editan
--              y upsertClienteFicha actualiza el JSONB.
-- =============================================================================

-- =============================================================================
-- CONTEXTO
-- =============================================================================
-- El sistema tiene escritura dual: cuando el usuario edita un depósito,
-- se actualiza TANTO el JSONB como la tabla. Sin embargo, hay casos donde
-- el JSONB tiene datos más recientes (por ediciones manuales o migraciones).
-- Este script sincroniza SOLO los campos que tienen valores en el JSONB
-- hacia la tabla, sin sobrescribir con nulls.
-- =============================================================================

-- =============================================================================
-- FUNCIÓN HELPER: Parsear fecha DD-MM-YYYY o DD/MM/YYYY a DATE
-- =============================================================================

CREATE OR REPLACE FUNCTION parse_fecha_ocr(fecha_text TEXT)
RETURNS DATE AS $$
DECLARE
  parts TEXT[];
  dia TEXT;
  mes TEXT;
  anio TEXT;
BEGIN
  -- Si es null o vacío, retornar null
  IF fecha_text IS NULL OR fecha_text = '' OR fecha_text = 'null' OR fecha_text = 'undefined' THEN
    RETURN NULL;
  END IF;

  -- Si ya está en formato YYYY-MM-DD, retornar directamente
  IF fecha_text ~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN fecha_text::DATE;
  END IF;

  -- Parsear DD-MM-YYYY o DD/MM/YYYY
  IF fecha_text ~ '^\d{1,2}[-/]\d{1,2}[-/]\d{4}$' THEN
    parts := regexp_split_to_array(fecha_text, '[-/]');
    dia := lpad(parts[1], 2, '0');
    mes := lpad(parts[2], 2, '0');
    anio := parts[3];
    RETURN (anio || '-' || mes || '-' || dia)::DATE;
  END IF;

  -- Si no coincide con ningún formato, retornar null
  RETURN NULL;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- FUNCIÓN HELPER: Parsear hora HH:MM o HH:MM:SS a TIME
-- =============================================================================

CREATE OR REPLACE FUNCTION parse_hora_ocr(hora_text TEXT)
RETURNS TIME AS $$
DECLARE
  parts TEXT[];
  hora TEXT;
  minuto TEXT;
BEGIN
  -- Si es null o vacío o N/A, retornar null
  IF hora_text IS NULL OR hora_text = '' OR hora_text = 'null' OR hora_text = 'N/A' THEN
    RETURN NULL;
  END IF;

  -- Si ya está en formato HH:MM:SS, retornar directamente
  IF hora_text ~ '^\d{1,2}:\d{2}:\d{2}$' THEN
    RETURN hora_text::TIME;
  END IF;

  -- Parsear HH:MM
  IF hora_text ~ '^\d{1,2}:\d{2}$' THEN
    parts := regexp_split_to_array(hora_text, ':');
    hora := lpad(parts[1], 2, '0');
    minuto := parts[2];
    RETURN (hora || ':' || minuto || ':00')::TIME;
  END IF;

  -- Si no coincide con ningún formato, retornar null
  RETURN NULL;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- SINCRONIZACIÓN: JSONB → Tabla depositos_ficha
-- =============================================================================

DO $$
DECLARE
  ficha_record RECORD;
  deposito_ocr JSONB;
  deposito_index INTEGER;
  total_fichas INTEGER := 0;
  total_depositos_actualizados INTEGER := 0;
  fecha_parsed DATE;
  hora_parsed TIME;
  monto_value NUMERIC(15,2);
  moneda_value VARCHAR(3);
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'INICIANDO SINCRONIZACIÓN JSONB → depositos_ficha';
  RAISE NOTICE '=============================================================================';

  -- Iterar sobre cada ficha que tiene depósitos en JSONB
  FOR ficha_record IN
    SELECT
      cf.id AS ficha_id,
      cf.local_id,
      l.proyecto_id,
      cf.comprobante_deposito_ocr,
      cf.comprobante_deposito_fotos
    FROM clientes_ficha cf
    INNER JOIN locales l ON l.id = cf.local_id
    WHERE cf.comprobante_deposito_ocr IS NOT NULL
      AND jsonb_array_length(cf.comprobante_deposito_ocr) > 0
  LOOP
    total_fichas := total_fichas + 1;

    -- Iterar sobre cada depósito en el array JSONB
    FOR deposito_index IN 0..(jsonb_array_length(ficha_record.comprobante_deposito_ocr) - 1)
    LOOP
      deposito_ocr := ficha_record.comprobante_deposito_ocr->deposito_index;

      -- Parsear valores del JSONB
      monto_value := CASE
        WHEN deposito_ocr->>'monto' IS NULL OR deposito_ocr->>'monto' = 'null' THEN NULL
        ELSE (deposito_ocr->>'monto')::NUMERIC(15,2)
      END;

      moneda_value := CASE
        WHEN deposito_ocr->>'moneda' IS NULL OR deposito_ocr->>'moneda' = 'null' THEN NULL
        ELSE UPPER(deposito_ocr->>'moneda')
      END;

      fecha_parsed := parse_fecha_ocr(deposito_ocr->>'fecha');
      hora_parsed := parse_hora_ocr(deposito_ocr->>'hora');

      -- Actualizar la tabla SOLO si el depósito ya existe
      -- (NO creamos depósitos nuevos, solo sincronizamos existentes)
      UPDATE depositos_ficha
      SET
        -- Solo actualizar monto si JSONB tiene valor
        monto = CASE
          WHEN monto_value IS NOT NULL THEN monto_value
          ELSE monto
        END,

        -- Solo actualizar moneda si JSONB tiene valor
        moneda = CASE
          WHEN moneda_value IS NOT NULL THEN moneda_value
          ELSE moneda
        END,

        -- Solo actualizar fecha si JSONB tiene valor parseado válido
        fecha_comprobante = CASE
          WHEN fecha_parsed IS NOT NULL THEN fecha_parsed
          ELSE fecha_comprobante
        END,

        -- Solo actualizar hora si JSONB tiene valor parseado válido
        hora_comprobante = CASE
          WHEN hora_parsed IS NOT NULL THEN hora_parsed
          ELSE hora_comprobante
        END,

        -- Solo actualizar banco si JSONB tiene valor
        banco = CASE
          WHEN deposito_ocr->>'banco' IS NOT NULL
            AND deposito_ocr->>'banco' != 'null'
            AND deposito_ocr->>'banco' != ''
          THEN deposito_ocr->>'banco'
          ELSE banco
        END,

        -- Solo actualizar numero_operacion si JSONB tiene valor
        numero_operacion = CASE
          WHEN deposito_ocr->>'numero_operacion' IS NOT NULL
            AND deposito_ocr->>'numero_operacion' != 'null'
            AND deposito_ocr->>'numero_operacion' != ''
          THEN deposito_ocr->>'numero_operacion'
          ELSE numero_operacion
        END,

        -- Solo actualizar depositante si JSONB tiene valor
        depositante = CASE
          WHEN deposito_ocr->>'depositante' IS NOT NULL
            AND deposito_ocr->>'depositante' != 'null'
            AND deposito_ocr->>'depositante' != ''
          THEN deposito_ocr->>'depositante'
          ELSE depositante
        END,

        -- Actualizar updated_at para tracking
        updated_at = NOW()
      WHERE
        ficha_id = ficha_record.ficha_id
        AND indice_original = deposito_index;

      -- Contar si se actualizó algo
      IF FOUND THEN
        total_depositos_actualizados := total_depositos_actualizados + 1;
        RAISE DEBUG 'Actualizado depósito % de ficha %', deposito_index, ficha_record.ficha_id;
      ELSE
        RAISE DEBUG 'No existe depósito % en tabla para ficha %', deposito_index, ficha_record.ficha_id;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'SINCRONIZACIÓN COMPLETADA';
  RAISE NOTICE 'Fichas procesadas: %', total_fichas;
  RAISE NOTICE 'Depósitos actualizados: %', total_depositos_actualizados;
  RAISE NOTICE '=============================================================================';
END $$;

-- =============================================================================
-- LIMPIEZA: Eliminar funciones helper (opcional)
-- =============================================================================

-- Descomentar estas líneas si quieres eliminar las funciones después de la migración
-- DROP FUNCTION IF EXISTS parse_fecha_ocr(TEXT);
-- DROP FUNCTION IF EXISTS parse_hora_ocr(TEXT);

-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =============================================================================

-- Query para verificar que los datos se sincronizaron correctamente:
--
-- SELECT
--   d.id,
--   d.ficha_id,
--   d.indice_original,
--   d.monto,
--   d.moneda,
--   d.fecha_comprobante,
--   d.hora_comprobante,
--   d.banco,
--   d.numero_operacion,
--   d.updated_at,
--   cf.comprobante_deposito_ocr->d.indice_original AS jsonb_data
-- FROM depositos_ficha d
-- INNER JOIN clientes_ficha cf ON cf.id = d.ficha_id
-- WHERE d.updated_at >= NOW() - INTERVAL '1 hour'
-- ORDER BY d.updated_at DESC
-- LIMIT 20;

-- =============================================================================
-- NOTAS IMPORTANTES
-- =============================================================================

-- 1. Este script NO crea depósitos nuevos, solo actualiza existentes
-- 2. Solo actualiza campos que tienen valores en el JSONB (no sobrescribe con null)
-- 3. Los campos validado_finanzas, abono_pago_id, etc. NO se tocan
-- 4. Se mantienen las funciones helper por si se necesitan en el futuro
-- 5. El parseo de fechas maneja múltiples formatos: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
-- 6. El parseo de horas maneja: HH:MM, HH:MM:SS
-- 7. Si hay errores en el parseo, se mantiene el valor actual de la tabla

-- =============================================================================
-- FIN DE MIGRACIÓN
-- =============================================================================
