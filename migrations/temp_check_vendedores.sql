-- Verificar top 10 vendedores con más leads
SELECT
  u.nombre,
  u.rol,
  v.id as vendedor_id,
  COUNT(l.id) as total_leads,
  COUNT(CASE WHEN l.tipificacion_nivel_1 IS NOT NULL AND l.tipificacion_nivel_1 != '' THEN 1 END) as con_tipif
FROM usuarios u
JOIN vendedores v ON u.vendedor_id = v.id
LEFT JOIN leads l ON l.vendedor_asignado_id = v.id
WHERE u.rol IN ('vendedor', 'vendedor_caseta')
  AND u.activo = true
GROUP BY u.nombre, u.rol, v.id
ORDER BY total_leads DESC
LIMIT 10;
