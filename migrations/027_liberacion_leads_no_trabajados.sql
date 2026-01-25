-- ============================================================================
-- MIGRACIÓN 027: Liberación Masiva de Leads No Trabajados
-- Fecha: 2026-01-24
-- Descripción: Quita la asignación de leads que no fueron trabajados
-- ============================================================================

-- IMPORTANTE: Este script configura variables de sesión para que el trigger
-- de auditoría registre correctamente el origen de los cambios.

-- 1. CONFIGURAR VARIABLES DE SESIÓN PARA AUDITORÍA
-- ============================================================================
-- El trigger fn_leads_audit() lee estas variables para registrar quién hizo el cambio
-- NOTA: No configuramos usuario_id para que el trigger use NULL (sistema)

SET LOCAL app.usuario_nombre = 'Sistema - Liberación Masiva';
SET LOCAL app.origen = 'liberacion_masiva';

-- 2. REPORTE PREVIO (para confirmar cantidad)
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM leads
  WHERE
    created_at >= '2025-12-01'
    AND vendedor_asignado_id IS NOT NULL
    AND (tipificacion_nivel_1 IS NULL OR tipificacion_nivel_1 = '')
    AND (tipificacion_nivel_2 IS NULL OR tipificacion_nivel_2 = '')
    AND (tipificacion_nivel_3 IS NULL OR tipificacion_nivel_3 = '')
    AND (observaciones_vendedor IS NULL OR observaciones_vendedor = '')
    AND NOT EXISTS (
      SELECT 1 FROM locales_leads ll WHERE ll.lead_id = leads.id
    );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'LIBERACIÓN MASIVA DE LEADS NO TRABAJADOS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Leads a liberar: %', v_count;
  RAISE NOTICE 'Criterios aplicados:';
  RAISE NOTICE '  - Desde: 2025-12-01';
  RAISE NOTICE '  - Con vendedor asignado';
  RAISE NOTICE '  - Sin tipificación (N1, N2, N3)';
  RAISE NOTICE '  - Sin observaciones';
  RAISE NOTICE '  - Sin vínculo a local';
  RAISE NOTICE '========================================';
END $$;

-- 3. EJECUTAR LIBERACIÓN
-- ============================================================================
-- El trigger tr_leads_audit registrará cada cambio automáticamente

UPDATE leads
SET
  vendedor_asignado_id = NULL,
  updated_at = NOW()
WHERE
  created_at >= '2025-12-01'
  AND vendedor_asignado_id IS NOT NULL
  AND (tipificacion_nivel_1 IS NULL OR tipificacion_nivel_1 = '')
  AND (tipificacion_nivel_2 IS NULL OR tipificacion_nivel_2 = '')
  AND (tipificacion_nivel_3 IS NULL OR tipificacion_nivel_3 = '')
  AND (observaciones_vendedor IS NULL OR observaciones_vendedor = '')
  AND NOT EXISTS (
    SELECT 1 FROM locales_leads ll WHERE ll.lead_id = leads.id
  );

-- 4. REPORTE POST-LIBERACIÓN
-- ============================================================================

DO $$
DECLARE
  v_liberados INTEGER;
  v_historial INTEGER;
BEGIN
  -- Contar leads ahora sin asignación (aproximado)
  GET DIAGNOSTICS v_liberados = ROW_COUNT;

  -- Contar registros de historial recién creados
  SELECT COUNT(*) INTO v_historial
  FROM leads_historial
  WHERE origen = 'liberacion_masiva'
    AND created_at >= NOW() - INTERVAL '5 minutes';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'LIBERACIÓN COMPLETADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Registros de historial creados: %', v_historial;
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
