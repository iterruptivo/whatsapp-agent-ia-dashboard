# PostHog Data Inventory - EcoPlaza Dashboard

**Generado:** 2025-12-29
**Periodo Analizado:** Últimos 7 días
**Project ID:** 274206

---

## RESUMEN EJECUTIVO

### Estado Actual del Tracking

- **Eventos Capturados:** SOLO eventos automáticos de PostHog ($pageview, $autocapture, etc.)
- **Eventos Custom de Negocio:** 0 (NINGUNO implementado aún)
- **Usuarios Identificados:** 1 (gerencia@ecoplaza.com)
- **Total de Eventos (7d):** 91 eventos
- **Sesiones (7d):** 6 sesiones

### Problema Crítico

**Los eventos de negocio definidos en `use-analytics.ts` NO se están usando en el código.** Esto significa que:
- No rastreamos leads asignados
- No rastreamos cambios de estado
- No rastreamos generación de contratos
- No rastreamos pagos registrados
- No rastreamos búsquedas/filtros/exports

---

## 1. EVENTOS DISPONIBLES

### 1.1 Eventos PostHog Automáticos (Últimos 7 días)

| Evento | Total | Usuarios Únicos | Descripción |
|--------|-------|-----------------|-------------|
| `$autocapture` | 45 | 3 | Clicks automáticos capturados |
| `$pageview` | 21 | 3 | Vistas de página |
| `$pageleave` | 14 | 2 | Salidas de página |
| `$set` | 6 | 1 | Actualización de propiedades |
| `$rageclick` | 3 | 1 | Clicks frustrados (UX problem) |
| `$identify` | 2 | 1 | Identificación de usuario |

### 1.2 Eventos Custom de Negocio

**TOTAL:** 0 eventos

**Eventos Definidos pero NO implementados:**
- `user_login`
- `user_logout`
- `project_changed`
- `lead_assigned`
- `lead_status_changed`
- `local_status_changed`
- `contrato_generated`
- `pago_registered`
- `search_performed`
- `filter_applied`
- `data_exported`
- `error_occurred`

---

## 2. PROPIEDADES DISPONIBLES

### 2.1 Propiedades de Eventos ($pageview)

**Total de propiedades:** 84

#### Navegación y URLs
- `$current_url` - URL completa
- `$pathname` - Path de la página
- `$host` - Dominio
- `$referrer` - Página anterior
- `$referring_domain` - Dominio de referencia
- `title` - Título de la página
- `navigation_type` - Tipo de navegación

#### Sesión
- `$session_id` - ID de sesión
- `$session_entry_url` - URL de entrada a la sesión
- `$session_entry_pathname` - Path de entrada
- `$session_entry_referrer` - Referrer de entrada
- `$window_id` - ID de ventana

#### Métricas de Scroll y Contenido
- `$prev_pageview_duration` - Duración de la página anterior
- `$prev_pageview_max_scroll` - Scroll máximo página anterior
- `$prev_pageview_max_scroll_percentage` - % scroll máximo
- `$prev_pageview_max_content` - Contenido máximo visto
- `$prev_pageview_max_content_percentage` - % contenido visto

#### Device y Browser
- `$browser` - Navegador (Chrome, Firefox, etc.)
- `$browser_version` - Versión del navegador
- `$browser_language` - Idioma del navegador
- `$os` - Sistema operativo
- `$os_version` - Versión del OS
- `$device_type` - Tipo de dispositivo (Desktop, Mobile, Tablet)
- `$screen_width` / `$screen_height` - Tamaño de pantalla
- `$viewport_width` / `$viewport_height` - Tamaño de viewport

#### Geolocalización
- `$geoip_country_code` - Código de país (PE, US, etc.)
- `$geoip_country_name` - Nombre del país
- `$geoip_city_name` - Ciudad
- `$geoip_latitude` / `$geoip_longitude` - Coordenadas
- `$geoip_time_zone` - Zona horaria
- `$geoip_subdivision_1_name` - Estado/Región
- `$geoip_subdivision_1_code` - Código de región

#### Usuario
- `$user_id` - ID del usuario identificado
- `$is_identified` - Si el usuario está identificado
- `distinct_id` - ID único de PostHog
- `$device_id` - ID del dispositivo

#### Técnico
- `$raw_user_agent` - User agent completo
- `$ip` - Dirección IP
- `$lib` - Librería usada (web, js, etc.)
- `$lib_version` - Versión de la librería
- `$timezone` / `$timezone_offset` - Zona horaria del cliente

### 2.2 Propiedades de Persona

**Total de propiedades:** 100+

#### Propiedades Custom (que estamos enviando)
- `email` - Email del usuario
- `name` - Nombre completo
- `rol` - Rol del usuario (admin, vendedor, etc.)
- `proyecto_id` - ID del proyecto seleccionado
- `proyecto_nombre` - Nombre del proyecto

#### Propiedades Iniciales (UTM, Atribución)
- `$initial_utm_source` / `$initial_utm_medium` / `$initial_utm_campaign` - Parámetros UTM
- `$initial_referrer` - Referrer inicial
- `$initial_referring_domain` - Dominio de referencia inicial
- `$initial_current_url` - URL inicial
- `$initial_gclid` / `$initial_fbclid` - IDs de Google Ads / Facebook

#### Propiedades de Device Inicial
- `$initial_browser`, `$initial_os`, `$initial_device_type`
- `$initial_screen_width`, `$initial_screen_height`

---

## 3. ANÁLISIS DE ACTIVIDAD (Últimos 7 días)

### 3.1 Usuarios Activos

**Total:** 1 usuario identificado

| Email | Nombre | Rol | Sesiones | Eventos | Primera Actividad | Última Actividad |
|-------|--------|-----|----------|---------|-------------------|------------------|
| gerencia@ecoplaza.com | gerente gerente | admin | 6 | 91 | 2025-12-28 23:13 | 2025-12-29 03:30 |

### 3.2 URLs Más Visitadas

| Path | Pageviews | Usuarios Únicos |
|------|-----------|-----------------|
| `/analytics` | 10 | 2 |
| `/` | 7 | 2 |
| `/login` | 3 | 2 |
| `/reporteria` | 1 | 1 |

### 3.3 Sesiones Detalladas

| Session ID | Usuario | Eventos | Inicio | Fin | Duración |
|------------|---------|---------|--------|-----|----------|
| ...553d | gerencia@ecoplaza.com | 1 | 03:30:15 | 03:30:15 | 0s |
| ...2c0b | gerencia@ecoplaza.com | 21 | 02:59:34 | 03:00:05 | 31s |
| ...6ef5 | gerencia@ecoplaza.com | 17 | 02:46:56 | 02:56:16 | 560s (9m) |
| ...8a52 | gerencia@ecoplaza.com | 7 | 01:26:09 | 01:28:07 | 118s (2m) |
| ...4974 | gerencia@ecoplaza.com | 1 | 01:26:09 | 01:26:09 | 0s |
| ...789c | gerencia@ecoplaza.com | 44 | 23:13:23 | 23:57:28 | 2645s (44m) |

### 3.4 Problemas UX Detectados

**Rage Clicks:** 3 eventos detectados
**Usuario Afectado:** 1
**Periodo:** 2025-12-28 23:21:01 - 23:21:03 (3 clicks en 2 segundos)

Esto indica frustración del usuario en alguna parte de la UI.

### 3.5 Tecnología Utilizada

| Browser | OS | Device Type | Usuarios | Eventos |
|---------|----|----|----------|---------|
| Chrome | Windows | Desktop | 3 | 91 |

---

## 4. CAPACIDADES DE ANÁLISIS

### 4.1 Datos Disponibles para Métricas Ejecutivas

#### Métricas de Usuario
- Usuarios activos diarios/semanales/mensuales (DAU/WAU/MAU)
- Sesiones por usuario
- Duración promedio de sesión
- Retención de usuarios (cohortes)
- Distribución por rol
- Distribución por proyecto

#### Métricas de Producto
- Páginas más visitadas
- Funnel de navegación
- Tiempo por página
- Scroll depth (profundidad de lectura)
- Rage clicks (frustración UX)
- Tasa de rebote por página

#### Métricas de Engagement
- Eventos por sesión
- Frecuencia de visitas
- Última actividad por usuario
- Patrones de uso por hora/día

#### Métricas Técnicas
- Distribución de navegadores/OS
- Tipos de dispositivos
- Geolocalización de usuarios
- Performance (tiempos de carga via web vitals)

### 4.2 Datos QUE FALTAN para Métricas de Negocio

Para construir métricas ejecutivas de NEGOCIO necesitamos implementar:

#### Leads
- `lead_created` - Lead nuevo capturado
- `lead_assigned` - Lead asignado a vendedor
- `lead_status_changed` - Cambio de etapa en el funnel
- `lead_contacted` - Primer contacto realizado
- `lead_qualified` - Lead calificado
- `lead_converted` - Lead convertido a venta
- `lead_lost` - Lead perdido (motivo)

#### Locales
- `local_reserved` - Local reservado
- `local_status_changed` - Cambio de estado
- `local_visited` - Visita al local registrada

#### Contratos y Pagos
- `contrato_generated` - Contrato generado
- `contrato_signed` - Contrato firmado
- `pago_registered` - Pago registrado
- `pago_verified` - Pago verificado

#### Actividad de Ventas
- `search_performed` - Búsqueda realizada
- `filter_applied` - Filtros aplicados
- `export_performed` - Exportación de datos
- `bulk_action` - Acción masiva ejecutada

#### Errores y UX
- `error_occurred` - Error de aplicación
- `form_abandoned` - Formulario abandonado
- `validation_error` - Error de validación

---

## 5. QUERIES HOGQL ÚTILES

### 5.1 Actividad por Usuario (últimos 30 días)

```sql
SELECT
  pdi.person.properties.email as email,
  pdi.person.properties.name as nombre,
  pdi.person.properties.rol as rol,
  count(DISTINCT e.properties.$session_id) as sesiones,
  count(e.uuid) as eventos_totales,
  count(DISTINCT DATE(e.timestamp)) as dias_activos,
  min(e.timestamp) as primera_actividad,
  max(e.timestamp) as ultima_actividad,
  dateDiff('day', min(e.timestamp), max(e.timestamp)) as dias_span
FROM events e
LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
WHERE e.timestamp >= now() - INTERVAL 30 DAY
  AND pdi.person.properties.email IS NOT NULL
GROUP BY pdi.person.properties.email, pdi.person.properties.name, pdi.person.properties.rol
ORDER BY eventos_totales DESC
```

### 5.2 Funnel de Navegación

```sql
SELECT
  properties.$pathname as pagina,
  count(*) as visitas,
  count(DISTINCT distinct_id) as visitantes_unicos,
  avg(properties.$prev_pageview_duration) as tiempo_promedio_seg
FROM events
WHERE event = '$pageview'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY properties.$pathname
ORDER BY visitas DESC
```

### 5.3 Sesiones Diarias

```sql
SELECT
  DATE(timestamp) as fecha,
  count(DISTINCT properties.$session_id) as sesiones,
  count(DISTINCT distinct_id) as usuarios_activos,
  count(uuid) as eventos_totales,
  avg(dateDiff('second', min(timestamp), max(timestamp))) as duracion_promedio_seg
FROM events
WHERE timestamp >= now() - INTERVAL 30 DAY
  AND properties.$session_id IS NOT NULL
GROUP BY DATE(timestamp)
ORDER BY fecha DESC
```

### 5.4 Usuarios Activos por Rol y Proyecto

```sql
SELECT
  pdi.person.properties.rol as rol,
  pdi.person.properties.proyecto_nombre as proyecto,
  count(DISTINCT e.distinct_id) as usuarios,
  count(DISTINCT e.properties.$session_id) as sesiones,
  count(e.uuid) as eventos
FROM events e
LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
WHERE e.timestamp >= now() - INTERVAL 7 DAY
  AND pdi.person.properties.rol IS NOT NULL
GROUP BY pdi.person.properties.rol, pdi.person.properties.proyecto_nombre
ORDER BY eventos DESC
```

### 5.5 Detección de Problemas UX

```sql
SELECT
  properties.$current_url as url,
  count(*) as rage_clicks,
  count(DISTINCT distinct_id) as usuarios_afectados
FROM events
WHERE event = '$rageclick'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY properties.$current_url
ORDER BY rage_clicks DESC
```

---

## 6. RECOMENDACIONES

### 6.1 CRÍTICO - Implementar Eventos de Negocio

**Prioridad:** ALTA
**Esfuerzo:** 2-3 días

Los eventos ya están definidos en `use-analytics.ts` pero NO se están usando.

**Implementar en:**
1. `lib/actions-leads.ts` - Lead assignment, status changes
2. `lib/actions-locales.ts` - Local status changes
3. `lib/actions-contratos.ts` - Contract generation
4. `lib/actions-pagos.ts` - Payment registration
5. Components con búsqueda/filtros - Search, filters, exports

### 6.2 Enriquecer Eventos con Contexto

Agregar siempre:
- `proyecto_id` - En TODOS los eventos
- `user_id` - Usuario actual
- `timestamp_cliente` - Para calcular latencias
- `session_duration` - Duración de la sesión actual

### 6.3 Crear Dashboards en PostHog

**Dashboards Sugeridos:**
1. **Executive Dashboard** - DAU, WAU, sesiones, eventos top
2. **Sales Activity** - Leads por vendedor, conversiones, pipeline
3. **Product Usage** - Features más usadas, tiempos, abandono
4. **UX Health** - Rage clicks, errores, páginas lentas

### 6.4 Configurar Alertas

- Rage clicks > 10 por día
- Errores > 5 por hora
- Sesión duración < 10 segundos (posible problema)

### 6.5 Habilitar Session Recordings

PostHog permite grabar sesiones. Útil para:
- Debuggear rage clicks
- Ver cómo los usuarios usan features nuevas
- Identificar problemas UX no obvios

---

## 7. PRÓXIMOS PASOS

### Fase 1: Implementación Básica (Semana 1)
- [ ] Agregar `trackLeadAssigned` en asignación de leads
- [ ] Agregar `trackLeadStatusChange` en cambios de estado
- [ ] Agregar `trackSearch` en búsquedas
- [ ] Agregar `trackFilterApplied` en filtros
- [ ] Agregar `trackExport` en exportaciones

### Fase 2: Métricas de Negocio (Semana 2)
- [ ] Crear evento `lead_created` con fuente (WhatsApp, manual, etc.)
- [ ] Crear evento `lead_converted` con monto y local
- [ ] Crear evento `lead_lost` con motivo
- [ ] Agregar `trackContratoGenerated` en generación de contratos
- [ ] Agregar `trackPagoRegistered` en registro de pagos

### Fase 3: Analytics Avanzado (Semana 3)
- [ ] Crear dashboard ejecutivo en PostHog
- [ ] Configurar alertas para eventos críticos
- [ ] Implementar funnels de conversión
- [ ] Configurar cohortes de usuarios
- [ ] Habilitar session recordings para admins

### Fase 4: Optimización (Semana 4)
- [ ] A/B testing de features
- [ ] Análisis de retención
- [ ] Feature flags para rollouts graduales
- [ ] Métricas de rendimiento (web vitals)

---

## APÉNDICE: Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `lib/analytics/config.ts` | Configuración de PostHog |
| `lib/analytics/use-analytics.ts` | Hook con eventos de negocio |
| `lib/analytics/analytics-identify.tsx` | Auto-identificación de usuarios |
| `lib/analytics/provider.tsx` | Provider de PostHog |
| `scripts/test-posthog-query.js` | Script para queries HogQL |
| `scripts/explore-posthog-events.js` | Exploración de eventos |
| `scripts/explore-posthog-deep.js` | Análisis profundo de datos |

---

**Generado por:** Backend Developer Agent
**Fecha:** 2025-12-29
**Versión:** 1.0
