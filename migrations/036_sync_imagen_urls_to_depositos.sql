-- =============================================================================
-- Migración 036: Sincronizar URLs de imágenes a depositos_ficha
-- Fecha: 2026-01-28
-- Descripción: Copia las URLs del array comprobante_deposito_fotos de
--              clientes_ficha al campo imagen_url de depositos_ficha.
--              Las imágenes no se ven porque están en el array pero no
--              en la tabla normalizada.
-- =============================================================================

-- =============================================================================
-- CONTEXTO
-- =============================================================================
-- El array comprobante_deposito_fotos en clientes_ficha contiene las URLs:
--   ["https://storage.../imagen1.jpg", "https://storage.../imagen2.jpg"]
--
-- La tabla depositos_ficha tiene:
--   - ficha_id: referencia a clientes_ficha
--   - indice_original: 0, 1, 2... (índice del array)
--   - imagen_url: donde debe ir la URL
--
-- Esta migración copia cada URL del array al registro correspondiente
-- usando el índice como referencia.
-- =============================================================================

DO $$
DECLARE
  ficha_record RECORD;
  url_index INTEGER;
  imagen_url_value TEXT;
  total_fichas INTEGER := 0;
  total_urls_copiadas INTEGER := 0;
  total_urls_actualizadas INTEGER := 0;
  registros_sin_match INTEGER := 0;
BEGIN
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'INICIANDO SINCRONIZACIÓN DE URLs DE IMÁGENES';
  RAISE NOTICE '=============================================================================';

  -- Iterar sobre cada ficha que tiene URLs de comprobantes
  FOR ficha_record IN
    SELECT
      cf.id AS ficha_id,
      cf.comprobante_deposito_fotos
    FROM clientes_ficha cf
    WHERE cf.comprobante_deposito_fotos IS NOT NULL
      AND array_length(cf.comprobante_deposito_fotos, 1) > 0
  LOOP
    total_fichas := total_fichas + 1;

    -- Iterar sobre cada URL en el array (PostgreSQL arrays son 1-indexed)
    FOR url_index IN 1..array_length(ficha_record.comprobante_deposito_fotos, 1)
    LOOP
      -- Extraer la URL del array (url_index - 1 porque indice_original es 0-indexed)
      imagen_url_value := ficha_record.comprobante_deposito_fotos[url_index];

      -- Validar que la URL no sea null, vacía o inválida
      IF imagen_url_value IS NOT NULL
        AND imagen_url_value != ''
        AND imagen_url_value != 'null'
        AND imagen_url_value != 'undefined'
      THEN
        -- Actualizar imagen_url en depositos_ficha
        -- Solo actualizar si:
        -- 1. imagen_url es NULL, o
        -- 2. imagen_url es diferente a la URL del array
        -- NOTA: url_index - 1 porque PostgreSQL arrays son 1-indexed pero indice_original es 0-indexed
        UPDATE depositos_ficha
        SET
          imagen_url = imagen_url_value,
          updated_at = NOW()
        WHERE
          ficha_id = ficha_record.ficha_id
          AND indice_original = (url_index - 1)
          AND (
            imagen_url IS NULL
            OR imagen_url != imagen_url_value
          );

        -- Verificar si se actualizó algo
        IF FOUND THEN
          GET DIAGNOSTICS total_urls_actualizadas = ROW_COUNT;
          total_urls_copiadas := total_urls_copiadas + total_urls_actualizadas;
          RAISE DEBUG 'Actualizada URL índice % para ficha %: %',
            url_index, ficha_record.ficha_id, imagen_url_value;
        ELSE
          -- El depósito con ese índice no existe en la tabla
          registros_sin_match := registros_sin_match + 1;
          RAISE DEBUG 'No existe depósito con índice % para ficha %',
            url_index, ficha_record.ficha_id;
        END IF;
      ELSE
        RAISE DEBUG 'URL inválida o vacía en índice % para ficha %',
          url_index, ficha_record.ficha_id;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'SINCRONIZACIÓN COMPLETADA';
  RAISE NOTICE 'Fichas procesadas: %', total_fichas;
  RAISE NOTICE 'URLs copiadas/actualizadas: %', total_urls_copiadas;
  RAISE NOTICE 'Registros sin match en depositos_ficha: %', registros_sin_match;
  RAISE NOTICE '=============================================================================';

  -- Advertencia si hay muchos registros sin match
  IF registros_sin_match > 0 THEN
    RAISE WARNING 'Se encontraron % URLs en arrays que no tienen registro correspondiente en depositos_ficha', registros_sin_match;
    RAISE WARNING 'Esto puede indicar que faltan registros en la tabla depositos_ficha';
  END IF;
END $$;

-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =============================================================================

-- Query para verificar que las URLs se copiaron correctamente:
--
-- SELECT
--   d.id,
--   d.ficha_id,
--   d.indice_original,
--   d.imagen_url AS url_en_tabla,
--   cf.comprobante_deposito_fotos[d.indice_original + 1] AS url_en_array,
--   CASE
--     WHEN d.imagen_url = cf.comprobante_deposito_fotos[d.indice_original + 1]
--     THEN 'MATCH ✓'
--     ELSE 'DIFERENTE ✗'
--   END AS estado
-- FROM depositos_ficha d
-- INNER JOIN clientes_ficha cf ON cf.id = d.ficha_id
-- WHERE cf.comprobante_deposito_fotos IS NOT NULL
--   AND array_length(cf.comprobante_deposito_fotos, 1) > d.indice_original
-- ORDER BY d.ficha_id, d.indice_original
-- LIMIT 50;

-- Query para encontrar discrepancias:
--
-- SELECT
--   d.ficha_id,
--   d.indice_original,
--   d.imagen_url AS url_tabla,
--   cf.comprobante_deposito_fotos[d.indice_original + 1] AS url_array
-- FROM depositos_ficha d
-- INNER JOIN clientes_ficha cf ON cf.id = d.ficha_id
-- WHERE cf.comprobante_deposito_fotos IS NOT NULL
--   AND array_length(cf.comprobante_deposito_fotos, 1) > d.indice_original
--   AND (
--     d.imagen_url IS NULL
--     OR d.imagen_url != cf.comprobante_deposito_fotos[d.indice_original + 1]
--   );

-- Query para contar imágenes por estado:
--
-- SELECT
--   COUNT(*) FILTER (WHERE d.imagen_url IS NOT NULL) AS con_url,
--   COUNT(*) FILTER (WHERE d.imagen_url IS NULL) AS sin_url,
--   COUNT(*) AS total
-- FROM depositos_ficha d;

-- =============================================================================
-- NOTAS IMPORTANTES
-- =============================================================================

-- 1. Este script solo actualiza registros existentes en depositos_ficha
-- 2. No crea registros nuevos (eso debe hacerse con la migración de datos OCR)
-- 3. Solo actualiza si imagen_url es NULL o diferente a la del array
-- 4. Valida que las URLs no sean null, vacías o 'undefined'
-- 5. Si hay URLs sin match, puede indicar registros faltantes en depositos_ficha
-- 6. Las URLs en el array están indexadas desde 1 (PostgreSQL arrays) pero
--    indice_original usa indexación desde 0, por eso usamos url_index - 1
-- 7. comprobante_deposito_fotos es un TEXT[] (array de PostgreSQL), no JSONB

-- =============================================================================
-- CASOS EDGE
-- =============================================================================

-- Caso 1: Array tiene más URLs que registros en depositos_ficha
--   → Se reporta como "registros sin match"
--   → Solución: Ejecutar primero migración para crear registros faltantes

-- Caso 2: imagen_url ya tiene un valor diferente al del array
--   → Se actualiza con el valor del array (fuente de verdad)

-- Caso 3: URL en array es null o vacía
--   → Se ignora, no se actualiza imagen_url

-- Caso 4: depositos_ficha tiene registros sin ficha_id en clientes_ficha
--   → Se ignoran (por el INNER JOIN)

-- =============================================================================
-- FIN DE MIGRACIÓN
-- =============================================================================
