-- ============================================================================
-- QUERY PARA OBTENER IDs DE PROYECTOS
-- Ejecuta esto en Supabase SQL Editor
-- ============================================================================

SELECT
  id AS proyecto_id,
  nombre,
  slug,
  color,
  activo
FROM proyectos
ORDER BY nombre;

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- proyecto_id                          | nombre              | slug     | color   | activo
-- -------------------------------------|---------------------|----------|---------|-------
-- 0661ce3d-4a99-4f7d-82bf-242ecfa58f28 | Proyecto Trapiche   | trapiche | #1b967a | true
-- xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | Proyecto Callao     | callao   | #3b82f6 | true

-- ============================================================================
-- IMPORTANTE:
-- Copia el UUID de "Proyecto Callao" y reemplázalo en el flujo n8n de Callao
-- ============================================================================
