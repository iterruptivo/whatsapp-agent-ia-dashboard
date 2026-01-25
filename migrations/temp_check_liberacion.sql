-- Verificar por qué Gabriel Mendoza aún tiene tantos leads sin trabajar

-- 1. Total de leads asignados a Gabriel Mendoza
SELECT 'Total leads Gabriel Mendoza' as metric,
  COUNT(*) as cantidad
FROM leads
WHERE vendedor_asignado_id = '6731e967-ee95-4953-83d9-0278a9561de7';

-- 2. Leads ANTERIORES a dic 2025 (no fueron parte de la liberación)
SELECT 'Leads ANTES de dic 2025 (no liberados)' as metric,
  COUNT(*) as cantidad
FROM leads
WHERE vendedor_asignado_id = '6731e967-ee95-4953-83d9-0278a9561de7'
  AND created_at < '2025-12-01';

-- 3. Leads SIN trabajar ANTERIORES a dic 2025
SELECT 'Sin trabajar ANTES dic 2025' as metric,
  COUNT(*) as cantidad
FROM leads
WHERE vendedor_asignado_id = '6731e967-ee95-4953-83d9-0278a9561de7'
  AND created_at < '2025-12-01'
  AND (tipificacion_nivel_1 IS NULL OR tipificacion_nivel_1 = '')
  AND (tipificacion_nivel_2 IS NULL OR tipificacion_nivel_2 = '')
  AND (tipificacion_nivel_3 IS NULL OR tipificacion_nivel_3 = '')
  AND (observaciones_vendedor IS NULL OR observaciones_vendedor = '');

-- 4. Leads DESDE dic 2025 que NO fueron liberados (porque tienen algo)
SELECT 'Desde dic 2025 con algo trabajado' as metric,
  COUNT(*) as cantidad
FROM leads
WHERE vendedor_asignado_id = '6731e967-ee95-4953-83d9-0278a9561de7'
  AND created_at >= '2025-12-01'
  AND (
    (tipificacion_nivel_1 IS NOT NULL AND tipificacion_nivel_1 != '') OR
    (tipificacion_nivel_2 IS NOT NULL AND tipificacion_nivel_2 != '') OR
    (tipificacion_nivel_3 IS NOT NULL AND tipificacion_nivel_3 != '') OR
    (observaciones_vendedor IS NOT NULL AND observaciones_vendedor != '')
  );

-- 5. Leads DESDE dic 2025 vinculados a local (no se liberan)
SELECT 'Desde dic 2025 vinculados a local' as metric,
  COUNT(*) as cantidad
FROM leads l
WHERE l.vendedor_asignado_id = '6731e967-ee95-4953-83d9-0278a9561de7'
  AND l.created_at >= '2025-12-01'
  AND EXISTS (SELECT 1 FROM locales_leads ll WHERE ll.lead_id = l.id);
