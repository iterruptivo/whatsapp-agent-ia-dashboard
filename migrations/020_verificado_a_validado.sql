-- =============================================================================
-- Migración 020: Renombrar "verificado" a "validado" en módulo de pagos
-- Fecha: 2026-01-21
-- Descripción: Estandariza terminología de "verificado" a "validado" para
--              alinearse con el flujo de Finanzas en todo el sistema
-- Tablas afectadas: depositos_ficha
-- =============================================================================

-- =============================================================================
-- CONTEXTO
-- =============================================================================
-- La tabla depositos_ficha usa "verificado_finanzas" mientras que abonos_pago
-- usa "validado_finanzas". Esta migración estandariza ambas tablas para usar
-- "validado" que es el término correcto según el flujo de negocio.
--
-- IMPACTO:
-- - Renombra 4 columnas en depositos_ficha
-- - Renombra 2 índices
-- - Actualiza comentarios de columnas
-- - NO requiere migración de datos (ALTER COLUMN RENAME es seguro)
-- =============================================================================

-- =============================================================================
-- PARTE 1: RENOMBRAR COLUMNAS EN depositos_ficha
-- =============================================================================

DO $$
BEGIN
  -- Renombrar verificado_finanzas → validado_finanzas
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'depositos_ficha'
    AND column_name = 'verificado_finanzas'
  ) THEN
    ALTER TABLE depositos_ficha
      RENAME COLUMN verificado_finanzas TO validado_finanzas;
    RAISE NOTICE 'Columna verificado_finanzas renombrada a validado_finanzas';
  ELSE
    RAISE NOTICE 'Columna verificado_finanzas ya no existe (posiblemente ya renombrada)';
  END IF;

  -- Renombrar verificado_finanzas_por → validado_finanzas_por
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'depositos_ficha'
    AND column_name = 'verificado_finanzas_por'
  ) THEN
    ALTER TABLE depositos_ficha
      RENAME COLUMN verificado_finanzas_por TO validado_finanzas_por;
    RAISE NOTICE 'Columna verificado_finanzas_por renombrada a validado_finanzas_por';
  ELSE
    RAISE NOTICE 'Columna verificado_finanzas_por ya no existe';
  END IF;

  -- Renombrar verificado_finanzas_at → validado_finanzas_at
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'depositos_ficha'
    AND column_name = 'verificado_finanzas_at'
  ) THEN
    ALTER TABLE depositos_ficha
      RENAME COLUMN verificado_finanzas_at TO validado_finanzas_at;
    RAISE NOTICE 'Columna verificado_finanzas_at renombrada a validado_finanzas_at';
  ELSE
    RAISE NOTICE 'Columna verificado_finanzas_at ya no existe';
  END IF;

  -- Renombrar verificado_finanzas_nombre → validado_finanzas_nombre
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'depositos_ficha'
    AND column_name = 'verificado_finanzas_nombre'
  ) THEN
    ALTER TABLE depositos_ficha
      RENAME COLUMN verificado_finanzas_nombre TO validado_finanzas_nombre;
    RAISE NOTICE 'Columna verificado_finanzas_nombre renombrada a validado_finanzas_nombre';
  ELSE
    RAISE NOTICE 'Columna verificado_finanzas_nombre ya no existe';
  END IF;
END $$;

-- =============================================================================
-- PARTE 2: RENOMBRAR ÍNDICES
-- =============================================================================

-- Renombrar índice de depósitos pendientes de validación
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'depositos_ficha'
    AND indexname = 'idx_depositos_ficha_pendientes'
  ) THEN
    ALTER INDEX idx_depositos_ficha_pendientes
      RENAME TO idx_depositos_ficha_no_validados;
    RAISE NOTICE 'Índice idx_depositos_ficha_pendientes renombrado a idx_depositos_ficha_no_validados';
  ELSE
    RAISE NOTICE 'Índice idx_depositos_ficha_pendientes ya no existe';
  END IF;
END $$;

-- Renombrar índice de abonos pendientes de validación (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'abonos_pago'
    AND indexname = 'idx_abonos_verificacion_pendiente'
  ) THEN
    ALTER INDEX idx_abonos_verificacion_pendiente
      RENAME TO idx_abonos_validacion_pendiente;
    RAISE NOTICE 'Índice idx_abonos_verificacion_pendiente renombrado a idx_abonos_validacion_pendiente';
  ELSE
    RAISE NOTICE 'Índice idx_abonos_verificacion_pendiente no existe o ya fue renombrado';
  END IF;
END $$;

-- =============================================================================
-- PARTE 3: RECREAR ÍNDICE CON NUEVA REFERENCIA A COLUMNA
-- =============================================================================

-- El índice parcial debe actualizarse para referenciar la nueva columna
DROP INDEX IF EXISTS idx_depositos_ficha_no_validados;

CREATE INDEX idx_depositos_ficha_no_validados
  ON depositos_ficha(validado_finanzas)
  WHERE validado_finanzas = false;

COMMENT ON INDEX idx_depositos_ficha_no_validados IS
'Índice parcial para filtrar depósitos pendientes de validación por Finanzas (rendimiento en queries de Finanzas)';

-- =============================================================================
-- PARTE 4: ACTUALIZAR COMENTARIOS DE COLUMNAS
-- =============================================================================

COMMENT ON COLUMN depositos_ficha.validado_finanzas IS
'Si Finanzas ha validado este depósito. Proceso irreversible.';

COMMENT ON COLUMN depositos_ficha.validado_finanzas_por IS
'UUID del usuario de Finanzas que validó este depósito';

COMMENT ON COLUMN depositos_ficha.validado_finanzas_at IS
'Timestamp de cuando Finanzas validó este depósito';

COMMENT ON COLUMN depositos_ficha.validado_finanzas_nombre IS
'Snapshot del nombre del usuario que validó (para auditoría)';

-- Actualizar comentario de tabla para reflejar nuevo término
COMMENT ON TABLE depositos_ficha IS
'Depósitos/vouchers subidos en fichas de inscripción. Tabla normalizada que reemplaza comprobante_deposito_ocr JSONB. Validación por Finanzas antes de vincular con Control de Pagos.';

-- =============================================================================
-- PARTE 5: RENOMBRAR TRIGGER Y FUNCIÓN (SI EXISTE)
-- =============================================================================

-- Nota: Según análisis del código, el trigger de comisiones inicial validado
-- no existe en las migraciones actuales, pero se incluye por si fue creado
-- manualmente en la BD

-- Renombrar función del trigger (si existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'trigger_comisiones_inicial_verificado'
  ) THEN
    ALTER FUNCTION trigger_comisiones_inicial_verificado()
      RENAME TO trigger_comisiones_inicial_validado;
    RAISE NOTICE 'Función trigger_comisiones_inicial_verificado renombrada a trigger_comisiones_inicial_validado';
  ELSE
    RAISE NOTICE 'Función trigger_comisiones_inicial_verificado no existe';
  END IF;
END $$;

-- Renombrar trigger (si existe)
-- Nota: Los triggers se deben dropar y recrear, no se pueden renombrar directamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_comisiones_inicial_verificado'
  ) THEN
    -- Obtener información del trigger antes de dropear
    RAISE NOTICE 'Encontrado trigger trigger_comisiones_inicial_verificado. Se debe recrear manualmente con nuevo nombre.';
    RAISE WARNING 'ACCIÓN REQUERIDA: Si existe trigger_comisiones_inicial_verificado, debe recrearse como trigger_comisiones_inicial_validado';
  ELSE
    RAISE NOTICE 'Trigger trigger_comisiones_inicial_verificado no existe';
  END IF;
END $$;

-- =============================================================================
-- PARTE 6: RENOMBRAR COLUMNAS EN abonos_pago
-- =============================================================================

DO $$
BEGIN
  -- Renombrar verificado_finanzas → validado_finanzas
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'abonos_pago'
    AND column_name = 'verificado_finanzas'
  ) THEN
    ALTER TABLE abonos_pago
      RENAME COLUMN verificado_finanzas TO validado_finanzas;
    RAISE NOTICE 'abonos_pago: Columna verificado_finanzas renombrada a validado_finanzas';
  ELSE
    RAISE NOTICE 'abonos_pago: Columna verificado_finanzas ya no existe (posiblemente ya renombrada)';
  END IF;

  -- Renombrar verificado_finanzas_por → validado_finanzas_por
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'abonos_pago'
    AND column_name = 'verificado_finanzas_por'
  ) THEN
    ALTER TABLE abonos_pago
      RENAME COLUMN verificado_finanzas_por TO validado_finanzas_por;
    RAISE NOTICE 'abonos_pago: Columna verificado_finanzas_por renombrada a validado_finanzas_por';
  ELSE
    RAISE NOTICE 'abonos_pago: Columna verificado_finanzas_por ya no existe';
  END IF;

  -- Renombrar verificado_finanzas_at → validado_finanzas_at
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'abonos_pago'
    AND column_name = 'verificado_finanzas_at'
  ) THEN
    ALTER TABLE abonos_pago
      RENAME COLUMN verificado_finanzas_at TO validado_finanzas_at;
    RAISE NOTICE 'abonos_pago: Columna verificado_finanzas_at renombrada a validado_finanzas_at';
  ELSE
    RAISE NOTICE 'abonos_pago: Columna verificado_finanzas_at ya no existe';
  END IF;

  -- Renombrar verificado_finanzas_nombre → validado_finanzas_nombre
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'abonos_pago'
    AND column_name = 'verificado_finanzas_nombre'
  ) THEN
    ALTER TABLE abonos_pago
      RENAME COLUMN verificado_finanzas_nombre TO validado_finanzas_nombre;
    RAISE NOTICE 'abonos_pago: Columna verificado_finanzas_nombre renombrada a validado_finanzas_nombre';
  ELSE
    RAISE NOTICE 'abonos_pago: Columna verificado_finanzas_nombre ya no existe';
  END IF;
END $$;

-- Actualizar comentarios en abonos_pago
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'abonos_pago'
    AND column_name = 'validado_finanzas'
  ) THEN
    COMMENT ON COLUMN abonos_pago.validado_finanzas IS
      'Si Finanzas ha validado este abono. Proceso irreversible.';
    COMMENT ON COLUMN abonos_pago.validado_finanzas_por IS
      'UUID del usuario de Finanzas que validó este abono';
    COMMENT ON COLUMN abonos_pago.validado_finanzas_at IS
      'Timestamp de cuando Finanzas validó este abono';
    COMMENT ON COLUMN abonos_pago.validado_finanzas_nombre IS
      'Snapshot del nombre del usuario que validó (para auditoría)';
    RAISE NOTICE 'abonos_pago: Comentarios actualizados';
  END IF;
END $$;

-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =============================================================================

-- Query para verificar que las columnas fueron renombradas correctamente:
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
-- AND table_name = 'depositos_ficha'
-- AND column_name LIKE '%validado%'
-- ORDER BY column_name;
--
-- Resultado esperado:
-- validado_finanzas          | boolean
-- validado_finanzas_at       | timestamp with time zone
-- validado_finanzas_nombre   | character varying
-- validado_finanzas_por      | uuid

-- =============================================================================
-- ROLLBACK (si es necesario)
-- =============================================================================

-- Si necesitas revertir esta migración, ejecuta:
--
-- -- depositos_ficha
-- ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas TO verificado_finanzas;
-- ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas_por TO verificado_finanzas_por;
-- ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas_at TO verificado_finanzas_at;
-- ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas_nombre TO verificado_finanzas_nombre;
-- ALTER INDEX idx_depositos_ficha_no_validados RENAME TO idx_depositos_ficha_pendientes;
-- DROP INDEX IF EXISTS idx_depositos_ficha_no_validados;
-- CREATE INDEX idx_depositos_ficha_pendientes ON depositos_ficha(verificado_finanzas) WHERE verificado_finanzas = false;
--
-- -- abonos_pago
-- ALTER TABLE abonos_pago RENAME COLUMN validado_finanzas TO verificado_finanzas;
-- ALTER TABLE abonos_pago RENAME COLUMN validado_finanzas_por TO verificado_finanzas_por;
-- ALTER TABLE abonos_pago RENAME COLUMN validado_finanzas_at TO verificado_finanzas_at;
-- ALTER TABLE abonos_pago RENAME COLUMN validado_finanzas_nombre TO verificado_finanzas_nombre;

-- =============================================================================
-- FIN DE MIGRACIÓN
-- =============================================================================
