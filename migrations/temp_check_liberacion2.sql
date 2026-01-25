-- Análisis completo de Gabriel Mendoza
SELECT
  'Total leads asignados' as categoria,
  COUNT(*)::text as cantidad
FROM leads
WHERE vendedor_asignado_id = '6731e967-ee95-4953-83d9-0278a9561de7'

UNION ALL

SELECT
  'Leads ANTES de dic 2025 (NO liberados)' as categoria,
  COUNT(*)::text as cantidad
FROM leads
WHERE vendedor_asignado_id = '6731e967-ee95-4953-83d9-0278a9561de7'
  AND created_at < '2025-12-01'

UNION ALL

SELECT
  'Sin trabajar ANTES dic 2025' as categoria,
  COUNT(*)::text as cantidad
FROM leads
WHERE vendedor_asignado_id = '6731e967-ee95-4953-83d9-0278a9561de7'
  AND created_at < '2025-12-01'
  AND (tipificacion_nivel_1 IS NULL OR tipificacion_nivel_1 = '')
  AND (observaciones_vendedor IS NULL OR observaciones_vendedor = '')

UNION ALL

SELECT
  'Leads DESDE dic 2025' as categoria,
  COUNT(*)::text as cantidad
FROM leads
WHERE vendedor_asignado_id = '6731e967-ee95-4953-83d9-0278a9561de7'
  AND created_at >= '2025-12-01';
