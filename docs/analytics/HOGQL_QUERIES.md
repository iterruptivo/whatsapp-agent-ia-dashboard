# HogQL Queries - Métricas Ejecutivas

Colección de queries HogQL para crear dashboards y reportes ejecutivos en PostHog.

**Uso:**
1. Ir a PostHog → Insights → SQL
2. Copiar y pegar la query
3. Ajustar parámetros (días, límites, etc.)
4. Guardar en dashboard

---

## MÉTRICAS DE USUARIOS

### 1. Usuarios Activos Diarios (DAU)

```sql
SELECT
  DATE(timestamp) as fecha,
  count(DISTINCT distinct_id) as usuarios_activos
FROM events
WHERE timestamp >= now() - INTERVAL 30 DAY
GROUP BY DATE(timestamp)
ORDER BY fecha DESC
```

### 2. Usuarios Activos por Rol

```sql
SELECT
  pdi.person.properties.rol as rol,
  count(DISTINCT e.distinct_id) as usuarios_activos,
  count(DISTINCT e.properties.$session_id) as sesiones_totales,
  count(e.uuid) as eventos_totales,
  avg(count(e.uuid)) OVER (PARTITION BY pdi.person.properties.rol) as eventos_promedio_por_usuario
FROM events e
LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
WHERE e.timestamp >= now() - INTERVAL 7 DAY
  AND pdi.person.properties.rol IS NOT NULL
GROUP BY pdi.person.properties.rol
ORDER BY usuarios_activos DESC
```

### 3. Top Usuarios por Actividad

```sql
SELECT
  pdi.person.properties.email as email,
  pdi.person.properties.name as nombre,
  pdi.person.properties.rol as rol,
  count(DISTINCT e.properties.$session_id) as sesiones,
  count(e.uuid) as eventos_totales,
  count(DISTINCT DATE(e.timestamp)) as dias_activos,
  min(e.timestamp) as primera_actividad,
  max(e.timestamp) as ultima_actividad
FROM events e
LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
WHERE e.timestamp >= now() - INTERVAL 30 DAY
  AND pdi.person.properties.email IS NOT NULL
GROUP BY pdi.person.properties.email, pdi.person.properties.name, pdi.person.properties.rol
ORDER BY eventos_totales DESC
LIMIT 20
```

### 4. Retención de Usuarios (Cohorte)

```sql
SELECT
  pdi.person.properties.email as usuario,
  min(DATE(e.timestamp)) as primer_dia,
  max(DATE(e.timestamp)) as ultimo_dia,
  count(DISTINCT DATE(e.timestamp)) as dias_activos,
  dateDiff('day', min(e.timestamp), max(e.timestamp)) as dias_span,
  CASE
    WHEN count(DISTINCT DATE(e.timestamp)) = 1 THEN 'One-time user'
    WHEN count(DISTINCT DATE(e.timestamp)) <= 3 THEN 'Low engagement'
    WHEN count(DISTINCT DATE(e.timestamp)) <= 7 THEN 'Medium engagement'
    ELSE 'High engagement'
  END as engagement_level
FROM events e
LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
WHERE e.timestamp >= now() - INTERVAL 30 DAY
  AND pdi.person.properties.email IS NOT NULL
GROUP BY pdi.person.properties.email
ORDER BY dias_activos DESC
```

---

## MÉTRICAS DE SESIONES

### 5. Sesiones por Día

```sql
SELECT
  DATE(timestamp) as fecha,
  count(DISTINCT properties.$session_id) as sesiones,
  count(DISTINCT distinct_id) as usuarios_unicos,
  count(uuid) as eventos_totales,
  round(count(uuid) / count(DISTINCT properties.$session_id), 2) as eventos_por_sesion
FROM events
WHERE timestamp >= now() - INTERVAL 30 DAY
  AND properties.$session_id IS NOT NULL
GROUP BY DATE(timestamp)
ORDER BY fecha DESC
```

### 6. Duración Promedio de Sesiones

```sql
SELECT
  properties.$session_id as session_id,
  pdi.person.properties.email as usuario,
  min(e.timestamp) as inicio,
  max(e.timestamp) as fin,
  dateDiff('second', min(e.timestamp), max(e.timestamp)) as duracion_segundos,
  count(e.uuid) as eventos_en_sesion
FROM events e
LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
WHERE e.timestamp >= now() - INTERVAL 7 DAY
  AND properties.$session_id IS NOT NULL
GROUP BY properties.$session_id, pdi.person.properties.email
HAVING duracion_segundos > 0
ORDER BY duracion_segundos DESC
LIMIT 50
```

### 7. Sesiones por Hora del Día

```sql
SELECT
  toHour(timestamp) as hora,
  count(DISTINCT properties.$session_id) as sesiones,
  count(DISTINCT distinct_id) as usuarios,
  round(avg(dateDiff('second', min(timestamp), max(timestamp))), 0) as duracion_promedio_seg
FROM events
WHERE timestamp >= now() - INTERVAL 7 DAY
  AND properties.$session_id IS NOT NULL
GROUP BY toHour(timestamp)
ORDER BY hora
```

---

## MÉTRICAS DE NAVEGACIÓN

### 8. Páginas Más Visitadas

```sql
SELECT
  properties.$pathname as pagina,
  count(*) as visitas,
  count(DISTINCT distinct_id) as visitantes_unicos,
  round(avg(properties.$prev_pageview_duration), 1) as tiempo_promedio_segundos,
  round(avg(properties.$prev_pageview_max_scroll_percentage), 1) as scroll_promedio_porcentaje
FROM events
WHERE event = '$pageview'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY properties.$pathname
ORDER BY visitas DESC
LIMIT 20
```

### 9. Funnel de Navegación (Paths)

```sql
SELECT
  properties.$prev_pageview_pathname as pagina_anterior,
  properties.$pathname as pagina_actual,
  count(*) as transiciones,
  count(DISTINCT distinct_id) as usuarios_unicos
FROM events
WHERE event = '$pageview'
  AND timestamp >= now() - INTERVAL 7 DAY
  AND properties.$prev_pageview_pathname IS NOT NULL
GROUP BY properties.$prev_pageview_pathname, properties.$pathname
ORDER BY transiciones DESC
LIMIT 30
```

### 10. Tasa de Rebote por Página

```sql
SELECT
  properties.$pathname as pagina,
  count(DISTINCT properties.$session_id) as sesiones_iniciadas,
  countIf(properties.$pageview_id = properties.$session_entry_url) as sesiones_con_rebote,
  round((countIf(properties.$pageview_id = properties.$session_entry_url) * 100.0) / count(DISTINCT properties.$session_id), 2) as tasa_rebote_porcentaje
FROM events
WHERE event = '$pageview'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY properties.$pathname
HAVING sesiones_iniciadas > 5
ORDER BY tasa_rebote_porcentaje DESC
```

---

## MÉTRICAS DE NEGOCIO (Cuando se implementen eventos custom)

### 11. Leads Creados por Día

```sql
-- NOTA: Requiere implementar evento 'lead_created'
SELECT
  DATE(timestamp) as fecha,
  count(*) as leads_creados,
  count(DISTINCT properties.proyecto_id) as proyectos_activos
FROM events
WHERE event = 'lead_created'
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY DATE(timestamp)
ORDER BY fecha DESC
```

### 12. Leads Asignados por Vendedor

```sql
-- NOTA: Requiere implementar evento 'lead_assigned'
SELECT
  pdi.person.properties.name as vendedor,
  pdi.person.properties.email as email,
  count(*) as leads_asignados,
  count(DISTINCT properties.proyecto_id) as proyectos
FROM events e
LEFT JOIN person_distinct_ids pdi ON properties.vendedor_id = pdi.person.id
WHERE event = 'lead_assigned'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY pdi.person.properties.name, pdi.person.properties.email
ORDER BY leads_asignados DESC
```

### 13. Conversión de Leads (Funnel)

```sql
-- NOTA: Requiere implementar eventos 'lead_created', 'lead_assigned', 'lead_status_changed', 'lead_converted'
SELECT
  event as etapa,
  count(*) as total_eventos,
  count(DISTINCT properties.lead_id) as leads_unicos
FROM events
WHERE event IN ('lead_created', 'lead_assigned', 'lead_converted')
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY event
ORDER BY
  CASE event
    WHEN 'lead_created' THEN 1
    WHEN 'lead_assigned' THEN 2
    WHEN 'lead_converted' THEN 3
  END
```

### 14. Tiempo Promedio de Conversión

```sql
-- NOTA: Requiere eventos 'lead_created' y 'lead_converted'
SELECT
  c.properties.lead_id as lead_id,
  min(created.timestamp) as fecha_creacion,
  min(c.timestamp) as fecha_conversion,
  dateDiff('hour', min(created.timestamp), min(c.timestamp)) as horas_para_convertir
FROM events c
JOIN events created ON c.properties.lead_id = created.properties.lead_id
WHERE c.event = 'lead_converted'
  AND created.event = 'lead_created'
  AND c.timestamp >= now() - INTERVAL 30 DAY
GROUP BY c.properties.lead_id
ORDER BY horas_para_convertir
```

### 15. Ingresos por Día

```sql
-- NOTA: Requiere implementar evento 'pago_registered'
SELECT
  DATE(timestamp) as fecha,
  sum(properties.monto) as ingresos_totales,
  count(*) as pagos_registrados,
  avg(properties.monto) as monto_promedio
FROM events
WHERE event = 'pago_registered'
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY DATE(timestamp)
ORDER BY fecha DESC
```

### 16. Contratos Generados por Usuario

```sql
-- NOTA: Requiere implementar evento 'contrato_generated'
SELECT
  pdi.person.properties.name as usuario,
  pdi.person.properties.email as email,
  pdi.person.properties.rol as rol,
  count(*) as contratos_generados,
  countIf(properties.tipo = 'reserva') as contratos_reserva,
  countIf(properties.tipo = 'compraventa') as contratos_compraventa
FROM events e
LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
WHERE event = 'contrato_generated'
  AND timestamp >= now() - INTERVAL 30 DAY
  AND pdi.person.properties.email IS NOT NULL
GROUP BY pdi.person.properties.name, pdi.person.properties.email, pdi.person.properties.rol
ORDER BY contratos_generados DESC
```

---

## MÉTRICAS DE PRODUCTO

### 17. Features Más Usadas

```sql
SELECT
  properties.$pathname as feature,
  count(DISTINCT distinct_id) as usuarios_unicos,
  count(*) as visitas,
  round(avg(properties.$prev_pageview_duration), 1) as tiempo_promedio_seg,
  count(DISTINCT properties.$session_id) as sesiones
FROM events
WHERE event = '$pageview'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY properties.$pathname
ORDER BY usuarios_unicos DESC
LIMIT 10
```

### 18. Búsquedas Más Comunes

```sql
-- NOTA: Requiere implementar evento 'search_performed'
SELECT
  properties.query as busqueda,
  count(*) as veces_buscado,
  avg(properties.resultados) as resultados_promedio,
  properties.modulo as modulo
FROM events
WHERE event = 'search_performed'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY properties.query, properties.modulo
HAVING count(*) > 1
ORDER BY veces_buscado DESC
LIMIT 20
```

### 19. Filtros Más Aplicados

```sql
-- NOTA: Requiere implementar evento 'filter_applied'
SELECT
  properties.modulo as modulo,
  JSONExtractString(properties.filtros, 'estado') as filtro_estado,
  count(*) as veces_aplicado,
  count(DISTINCT distinct_id) as usuarios
FROM events
WHERE event = 'filter_applied'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY properties.modulo, filtro_estado
ORDER BY veces_aplicado DESC
```

### 20. Exportaciones de Datos

```sql
-- NOTA: Requiere implementar evento 'data_exported'
SELECT
  properties.modulo as modulo,
  properties.formato as formato,
  count(*) as exportaciones,
  sum(properties.registros) as total_registros_exportados,
  count(DISTINCT distinct_id) as usuarios
FROM events
WHERE event = 'data_exported'
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY properties.modulo, properties.formato
ORDER BY exportaciones DESC
```

---

## MÉTRICAS DE UX/CALIDAD

### 21. Rage Clicks por Página

```sql
SELECT
  properties.$current_url as url,
  count(*) as rage_clicks,
  count(DISTINCT distinct_id) as usuarios_afectados,
  count(DISTINCT properties.$session_id) as sesiones_afectadas
FROM events
WHERE event = '$rageclick'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY properties.$current_url
ORDER BY rage_clicks DESC
```

### 22. Errores de Aplicación

```sql
-- NOTA: Requiere implementar evento 'error_occurred'
SELECT
  properties.error as error,
  JSONExtractString(properties.context, 'action') as accion,
  count(*) as ocurrencias,
  count(DISTINCT distinct_id) as usuarios_afectados,
  min(timestamp) as primera_vez,
  max(timestamp) as ultima_vez
FROM events
WHERE event = 'error_occurred'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY properties.error, JSONExtractString(properties.context, 'action')
ORDER BY ocurrencias DESC
```

### 23. Scroll Depth Promedio por Página

```sql
SELECT
  properties.$prev_pageview_pathname as pagina,
  count(*) as pageviews,
  round(avg(properties.$prev_pageview_max_scroll_percentage), 1) as scroll_promedio_porcentaje,
  round(avg(properties.$prev_pageview_max_content_percentage), 1) as contenido_visto_porcentaje,
  round(avg(properties.$prev_pageview_duration), 1) as tiempo_promedio_seg
FROM events
WHERE event = '$pageview'
  AND timestamp >= now() - INTERVAL 7 DAY
  AND properties.$prev_pageview_pathname IS NOT NULL
GROUP BY properties.$prev_pageview_pathname
HAVING count(*) > 10
ORDER BY scroll_promedio_porcentaje DESC
```

---

## MÉTRICAS DE RENDIMIENTO

### 24. Navegadores y Dispositivos

```sql
SELECT
  properties.$browser as browser,
  properties.$os as sistema_operativo,
  properties.$device_type as tipo_dispositivo,
  count(DISTINCT distinct_id) as usuarios,
  count(DISTINCT properties.$session_id) as sesiones,
  count(uuid) as eventos
FROM events
WHERE timestamp >= now() - INTERVAL 7 DAY
GROUP BY properties.$browser, properties.$os, properties.$device_type
ORDER BY usuarios DESC
```

### 25. Geolocalización de Usuarios

```sql
SELECT
  properties.$geoip_country_name as pais,
  properties.$geoip_city_name as ciudad,
  count(DISTINCT distinct_id) as usuarios,
  count(DISTINCT properties.$session_id) as sesiones
FROM events
WHERE timestamp >= now() - INTERVAL 7 DAY
  AND properties.$geoip_country_name IS NOT NULL
GROUP BY properties.$geoip_country_name, properties.$geoip_city_name
ORDER BY usuarios DESC
LIMIT 20
```

---

## DASHBOARDS RECOMENDADOS

### Dashboard 1: Executive Overview

- Query 1: DAU (últimos 30 días)
- Query 5: Sesiones por día
- Query 3: Top usuarios por actividad
- Query 8: Páginas más visitadas

### Dashboard 2: Sales Performance (Cuando se implementen eventos)

- Query 11: Leads creados por día
- Query 12: Leads asignados por vendedor
- Query 13: Conversión de leads (funnel)
- Query 15: Ingresos por día
- Query 16: Contratos generados por usuario

### Dashboard 3: Product Usage

- Query 17: Features más usadas
- Query 18: Búsquedas más comunes
- Query 19: Filtros más aplicados
- Query 20: Exportaciones de datos

### Dashboard 4: UX Health

- Query 21: Rage clicks por página
- Query 22: Errores de aplicación
- Query 23: Scroll depth por página
- Query 6: Duración de sesiones

---

## TIPS PARA HOGQL

### Filtrar por Proyecto Específico

Agregar a la condición WHERE:

```sql
AND pdi.person.properties.proyecto_id = '80761314-7a78-43db-8ad5-10f16eedac87'
```

### Agrupar por Semana

```sql
SELECT
  toStartOfWeek(timestamp) as semana,
  -- ...
GROUP BY toStartOfWeek(timestamp)
```

### Percentiles

```sql
SELECT
  quantile(0.50)(duracion) as p50_mediana,
  quantile(0.90)(duracion) as p90,
  quantile(0.95)(duracion) as p95
FROM (
  SELECT dateDiff('second', min(timestamp), max(timestamp)) as duracion
  FROM events
  WHERE properties.$session_id IS NOT NULL
  GROUP BY properties.$session_id
)
```

### Comparar con Periodo Anterior

```sql
SELECT
  'Periodo Actual' as periodo,
  count(DISTINCT distinct_id) as usuarios
FROM events
WHERE timestamp >= now() - INTERVAL 7 DAY

UNION ALL

SELECT
  'Periodo Anterior' as periodo,
  count(DISTINCT distinct_id) as usuarios
FROM events
WHERE timestamp >= now() - INTERVAL 14 DAY
  AND timestamp < now() - INTERVAL 7 DAY
```

---

**Autor:** Backend Developer Agent
**Última Actualización:** 2025-12-29
**Versión:** 1.0
