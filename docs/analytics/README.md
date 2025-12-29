# Documentación de Analytics - EcoPlaza Dashboard

Documentación completa del sistema de analytics con PostHog.

**Última Actualización:** 2025-12-29

---

## INICIO RÁPIDO

### Para Gerencia / Stakeholders
Leer: **[EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md)**

Resumen ejecutivo con:
- Estado actual del tracking
- Datos disponibles
- Problemas detectados
- Plan de acción

### Para Desarrolladores
Leer: **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)**

Guía paso a paso para implementar eventos de negocio.

### Para Analistas de Datos
Leer: **[HOGQL_QUERIES.md](./HOGQL_QUERIES.md)**

25+ queries HogQL listas para usar en dashboards.

---

## DOCUMENTOS DISPONIBLES

| Documento | Propósito | Audiencia |
|-----------|-----------|-----------|
| [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) | Resumen ejecutivo del estado de analytics | Gerencia, Product Owners |
| [posthog-data-inventory.md](./posthog-data-inventory.md) | Inventario completo de datos disponibles | Analistas, Developers |
| [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) | Guía de implementación de eventos | Backend Developers |
| [HOGQL_QUERIES.md](./HOGQL_QUERIES.md) | Queries HogQL para métricas | Analistas de Datos |
| README.md (este archivo) | Índice de documentación | Todos |

---

## SCRIPTS DISPONIBLES

| Script | Propósito | Comando |
|--------|-----------|---------|
| `posthog-executive-report.js` | Reporte ejecutivo completo | `node scripts/posthog-executive-report.js [días]` |
| `explore-posthog-events.js` | Explorar eventos disponibles | `node scripts/explore-posthog-events.js` |
| `explore-posthog-deep.js` | Análisis profundo de datos | `node scripts/explore-posthog-deep.js` |
| `test-posthog-query.js` | Probar queries HogQL custom | Editar query y ejecutar |

**Ubicación:** `E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard\scripts\`

---

## ARQUITECTURA DEL SISTEMA

### Archivos Clave

```
lib/analytics/
├── config.ts                  # Configuración de PostHog
├── provider.tsx               # PostHogProvider wrapper
├── analytics-identify.tsx     # Auto-identificación de usuarios
├── use-analytics.ts           # Hook con eventos de negocio
└── index.ts                   # Exports

scripts/
├── posthog-executive-report.js
├── explore-posthog-events.js
├── explore-posthog-deep.js
└── test-posthog-query.js

docs/analytics/
├── README.md                  # Este archivo
├── EXECUTIVE_SUMMARY.md
├── posthog-data-inventory.md
├── IMPLEMENTATION_GUIDE.md
└── HOGQL_QUERIES.md
```

### Flujo de Datos

```
Usuario → Action → Server Action → trackEvent() → PostHog API → Dashboard
                      ↓
                  Supabase
```

---

## CONFIGURACIÓN

### Variables de Entorno

```env
NEXT_PUBLIC_POSTHOG_KEY=phx_B3pBlK1Hcjuu18EfzapIH6iSA5RBoyGA1k0ALbUSBKjdQPE
NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com
```

### Activar Debug Mode

En `lib/analytics/config.ts`:

```typescript
export const analyticsConfig = {
  enabled: true,
  debug: true,  // ← Cambiar a true
  apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
};
```

Esto mostrará logs en la consola del browser: `[Analytics] ...`

---

## DATOS ACTUALES

### Eventos Disponibles (últimos 7 días)

| Evento | Total | Descripción |
|--------|-------|-------------|
| $autocapture | 45 | Clicks automáticos |
| $pageview | 21 | Vistas de página |
| $pageleave | 14 | Salidas de página |
| $set | 6 | Actualización de props |
| $rageclick | 3 | Clicks de frustración |
| $identify | 2 | Identificación de usuario |

**Total:** 91 eventos | 3 usuarios | 6 sesiones

### Propiedades de Usuario

- `email` - Email del usuario
- `name` - Nombre completo
- `rol` - admin, vendedor, jefe_ventas, etc.
- `proyecto_id` - UUID del proyecto
- `proyecto_nombre` - Nombre del proyecto

### Propiedades de Eventos

**84 propiedades disponibles** incluyendo:
- Navegación: URL, pathname, referrer
- Sesión: session_id, window_id
- Scroll: scroll depth, content viewed
- Device: browser, OS, device type
- Geo: país, ciudad, coordenadas
- Timing: duración, timestamps

Ver [posthog-data-inventory.md](./posthog-data-inventory.md) para lista completa.

---

## ESTADO ACTUAL

### Lo que FUNCIONA

- ✅ PostHog configurado y capturando eventos
- ✅ Auto-identificación de usuarios
- ✅ Propiedades de usuario (email, rol, proyecto)
- ✅ Eventos automáticos ($pageview, $autocapture)
- ✅ Geolocalización
- ✅ Device/Browser tracking
- ✅ Session tracking

### Lo que FALTA (Crítico)

- ❌ Eventos de negocio NO implementados
- ❌ No rastreamos leads creados/asignados
- ❌ No rastreamos conversiones
- ❌ No rastreamos contratos generados
- ❌ No rastreamos pagos
- ❌ No rastreamos búsquedas/filtros/exports

**Impacto:** No podemos medir KPIs de negocio (conversión, pipeline, productividad).

---

## PLAN DE IMPLEMENTACIÓN

### Fase 1: Eventos de Negocio (Esta Semana)

**Prioridad:** CRÍTICA
**Esfuerzo:** 2-3 días

Implementar en:
- `lib/actions-leads.ts` - lead_assigned, lead_status_changed, lead_created
- `lib/actions-locales.ts` - local_status_changed, lead_converted
- `lib/actions-contratos.ts` - contrato_generated
- `lib/actions-pagos.ts` - pago_registered
- Componentes - search_performed, filter_applied, data_exported

Ver [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) para detalles.

### Fase 2: Dashboards (Semana 2)

**Prioridad:** ALTA
**Esfuerzo:** 1-2 días

Crear en PostHog:
1. Executive Dashboard - DAU, sesiones, eventos top
2. Sales Performance - Leads, conversiones, pipeline
3. Product Usage - Features usadas, búsquedas
4. UX Health - Rage clicks, errores, rendimiento

### Fase 3: Alertas (Semana 2)

**Prioridad:** MEDIA
**Esfuerzo:** 1 hora

Configurar:
- Rage clicks > 10/día
- Errores > 5/hora
- Conversión < 10% semanal
- Sesiones < 5/día

### Fase 4: Optimización (Semana 3-4)

**Prioridad:** BAJA
**Esfuerzo:** Variable

- Session recordings
- A/B testing
- Funnels detallados
- Cohortes

---

## MÉTRICAS DISPONIBLES

### Con Datos Actuales

- DAU/WAU/MAU (usuarios activos)
- Sesiones por usuario
- Retención de usuarios
- Features más usadas (páginas)
- Tiempo por feature
- Distribución por rol/proyecto
- Rage clicks (problemas UX)
- Navegadores/dispositivos

### Con Eventos de Negocio (NECESARIO)

- Leads nuevos por día/semana
- Leads asignados por vendedor
- Conversión por etapa del funnel
- Tasa de cierre
- Pipeline de ventas
- Contratos generados
- Ingresos por vendedor
- Tiempo de conversión
- Productividad de vendedores

---

## ACCESO A POSTHOG

### PostHog UI

- **URL:** https://us.posthog.com/project/274206
- **Iniciar sesión:** Con cuenta autorizada

### API Access

**API Key:** phx_B3pBlK1Hcjuu18EfzapIH6iSA5RBoyGA1k0ALbUSBKjdQPE
**Project ID:** 274206

Ejemplo de query via API:

```bash
curl -X POST https://us.posthog.com/api/projects/274206/query/ \
  -H "Authorization: Bearer phx_B3pBlK1Hcjuu18EfzapIH6iSA5RBoyGA1k0ALbUSBKjdQPE" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "kind": "HogQLQuery",
      "query": "SELECT count(*) FROM events WHERE timestamp >= now() - INTERVAL 1 DAY"
    }
  }'
```

---

## RECURSOS ADICIONALES

### Documentación Oficial

- [PostHog Docs](https://posthog.com/docs)
- [HogQL Reference](https://posthog.com/docs/hogql)
- [PostHog Next.js Guide](https://posthog.com/docs/libraries/next-js)

### Ejemplos de Queries

Ver [HOGQL_QUERIES.md](./HOGQL_QUERIES.md) para 25+ queries listas para usar.

### Troubleshooting

**Eventos no aparecen:**
1. Verificar `analyticsConfig.enabled = true`
2. Verificar que `NEXT_PUBLIC_POSTHOG_KEY` está configurado
3. Activar debug mode y ver console
4. Verificar que `trackEvent()` se está llamando

**Usuario no identificado:**
1. Verificar que `AnalyticsIdentify` está en el layout
2. Verificar que el usuario tiene email
3. Ver eventos `$identify` en PostHog

**Queries HogQL fallan:**
1. Verificar sintaxis (HogQL != SQL estándar)
2. Usar `LEFT JOIN` para person_distinct_ids
3. Verificar que las propiedades existen

---

## CONTACTO

**Documentación creada por:** Backend Developer Agent
**Fecha:** 2025-12-29
**Versión:** 1.0

Para preguntas o issues:
1. Revisar esta documentación
2. Ejecutar scripts de exploración
3. Consultar logs con debug mode

---

## CHANGELOG

### 2025-12-29
- Creación inicial de documentación completa
- 4 documentos principales creados
- 4 scripts de análisis disponibles
- Inventario completo de datos realizado
- Guía de implementación detallada
- 25+ queries HogQL documentadas

---

**Próxima Actualización:** Después de implementar eventos de negocio (Fase 1)
