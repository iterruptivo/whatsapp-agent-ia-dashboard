-- ============================================================================
-- MIGRACIÓN 030: Convertir fechas en comprobante_deposito_ocr de YYYY-MM-DD a DD-MM-YYYY
-- ============================================================================
-- Fecha: 26 Enero 2026
-- Objetivo: Convertir formato de fecha en JSONB comprobante_deposito_ocr
--           de YYYY-MM-DD (ej: "2026-01-02") a DD-MM-YYYY (ej: "02-01-2026")
--
-- Impacto:
--   - Tabla: clientes_ficha
--   - Campo: comprobante_deposito_ocr (JSONB array)
--   - Registros afectados: ~325 fichas con datos OCR
--
-- Estrategia:
--   1. Iterar sobre cada ficha con comprobante_deposito_ocr no nulo
--   2. Descomponer el array JSONB elemento por elemento
--   3. Para cada elemento, convertir campo "fecha" si está en formato YYYY-MM-DD
--   4. Reconstruir el array con las fechas convertidas
--   5. Actualizar el registro
--
-- Validaciones:
--   - Solo convertir si la fecha tiene formato YYYY-MM-DD (detectado por regex)
--   - Ignorar campos "fecha" con valor NULL o "N/A"
--   - NO afectar otros campos del JSONB
--   - NO tocar el campo fecha_comprobante de depositos_ficha (ese es tipo DATE)
-- ============================================================================

DO $$
DECLARE
    ficha_record RECORD;
    elemento_ocr JSONB;
    nuevo_array JSONB := '[]'::JSONB;
    fecha_original TEXT;
    fecha_convertida TEXT;
    fichas_actualizadas INT := 0;
    total_elementos_procesados INT := 0;
    fechas_convertidas INT := 0;
BEGIN
    -- Iterar sobre cada ficha con datos OCR
    FOR ficha_record IN
        SELECT id, comprobante_deposito_ocr
        FROM clientes_ficha
        WHERE comprobante_deposito_ocr IS NOT NULL
          AND jsonb_typeof(comprobante_deposito_ocr) = 'array'
          AND jsonb_array_length(comprobante_deposito_ocr) > 0
    LOOP
        -- Reset del nuevo array para esta ficha
        nuevo_array := '[]'::JSONB;

        -- Iterar sobre cada elemento del array OCR
        FOR elemento_ocr IN
            SELECT * FROM jsonb_array_elements(ficha_record.comprobante_deposito_ocr)
        LOOP
            total_elementos_procesados := total_elementos_procesados + 1;

            -- Verificar si el elemento tiene campo "fecha" y es un string
            IF elemento_ocr ? 'fecha' AND jsonb_typeof(elemento_ocr->'fecha') = 'string' THEN
                fecha_original := elemento_ocr->>'fecha';

                -- Validar que la fecha esté en formato YYYY-MM-DD (ej: "2026-01-02")
                -- Patrón: 4 dígitos - 2 dígitos - 2 dígitos
                IF fecha_original ~ '^\d{4}-\d{2}-\d{2}$' THEN
                    -- Convertir: YYYY-MM-DD → DD-MM-YYYY
                    fecha_convertida :=
                        SUBSTRING(fecha_original FROM 9 FOR 2) || '-' ||  -- DD
                        SUBSTRING(fecha_original FROM 6 FOR 2) || '-' ||  -- MM
                        SUBSTRING(fecha_original FROM 1 FOR 4);           -- YYYY

                    -- Actualizar el elemento con la nueva fecha
                    elemento_ocr := jsonb_set(
                        elemento_ocr,
                        '{fecha}',
                        to_jsonb(fecha_convertida),
                        true
                    );

                    fechas_convertidas := fechas_convertidas + 1;

                    RAISE NOTICE 'Fecha convertida: % → %', fecha_original, fecha_convertida;
                END IF;
            END IF;

            -- Agregar el elemento (modificado o no) al nuevo array
            nuevo_array := nuevo_array || elemento_ocr;
        END LOOP;

        -- Actualizar la ficha con el array reconstruido
        UPDATE clientes_ficha
        SET comprobante_deposito_ocr = nuevo_array
        WHERE id = ficha_record.id;

        fichas_actualizadas := fichas_actualizadas + 1;
    END LOOP;

    -- Resumen de la migración
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE 'MIGRACIÓN 030 COMPLETADA';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Fichas procesadas: %', fichas_actualizadas;
    RAISE NOTICE 'Elementos OCR procesados: %', total_elementos_procesados;
    RAISE NOTICE 'Fechas convertidas (YYYY-MM-DD → DD-MM-YYYY): %', fechas_convertidas;
    RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================
-- Ejecutar después de la migración para confirmar:
--
-- SELECT
--     id,
--     jsonb_pretty(comprobante_deposito_ocr) as ocr_con_fechas_nuevas
-- FROM clientes_ficha
-- WHERE comprobante_deposito_ocr IS NOT NULL
-- LIMIT 5;
--
-- Esperado: Fechas en formato DD-MM-YYYY (ej: "02-01-2026")
-- ============================================================================
