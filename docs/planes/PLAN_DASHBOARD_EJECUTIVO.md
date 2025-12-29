# Plan: Dashboard Ejecutivo EcoPlaza

**Fecha:** 2025-12-29
**Objetivo:** Implementar dashboard ejecutivo con métricas de negocio para demostrar valor del sistema
**Estimación:** 4-5 días de desarrollo

---

## 1. CONTEXTO

### 1.1 Datos Disponibles
- **20,000 leads** con tracking completo de conversación
- **823 locales** con sistema de semáforo
- **24 usuarios** activos
- **7 proyectos** inmobiliarios
- **Sistema completo** de pagos, comisiones, control post-venta

### 1.2 Regla de Atribución Victoria (IA)
Un lead es atribuible a Victoria (IA) si:
- `utm = 'victoria'` (string literal)
- `utm` es un número puro (regex: `/^\d+$/`)

### 1.3 Estructura de Menú Propuesta
```
Sidebar (Panel Izquierdo)
├── Insights (/)
├── Operativo (/operativo)
├── Locales (/locales)
├── Control Pagos (/control-pagos)
├── Comisiones (/comisiones)
├── Usuarios (/usuarios)
├── ─────────────────────
├── Reportería (categoría expandible)
│   ├── Reportes (/reporteria)
│   ├── Analytics (/analytics)
│   └── Dashboard Ejecutivo (/executive)
└── Configuración
```

---

## 2. FASES DE IMPLEMENTACIÓN

### FASE 1: Dashboard Ejecutivo con Datos de Supabase

#### 1.1 API Routes Necesarias
- [ ] `GET /api/executive/summary` - KPIs principales
- [ ] `GET /api/executive/funnel` - Funnel de conversión
- [ ] `GET /api/executive/pipeline` - Pipeline por estado
- [ ] `GET /api/executive/vendedores` - Ranking vendedores
- [ ] `GET /api/executive/canales` - Efectividad por canal (UTM)
- [ ] `GET /api/executive/financiero` - Morosidad y flujo
- [ ] `GET /api/executive/proyectos` - Comparativa proyectos
- [ ] `GET /api/executive/victoria` - Atribución IA específica

#### 1.2 Componentes UI
- [ ] `app/executive/page.tsx` - Página principal
- [ ] `components/executive/ExecutiveDashboard.tsx` - Layout principal
- [ ] `components/executive/KPICard.tsx` - Cards de métricas
- [ ] `components/executive/FunnelChart.tsx` - Visualización funnel
- [ ] `components/executive/PipelineChart.tsx` - Semáforo visual
- [ ] `components/executive/VendedoresTable.tsx` - Ranking
- [ ] `components/executive/CanalesChart.tsx` - UTM breakdown
- [ ] `components/executive/FinancieroCards.tsx` - Morosidad/flujo
- [ ] `components/executive/ProyectosComparison.tsx` - Multi-proyecto
- [ ] `components/executive/VictoriaROI.tsx` - Dashboard IA

#### 1.3 Actualización de Menú
- [ ] Modificar `components/shared/Sidebar.tsx`
- [ ] Crear categoría "Reportería" expandible
- [ ] Agregar subitems: Reportes, Analytics, Dashboard Ejecutivo
- [ ] Mantener permisos por rol (admin, jefe_ventas)

### FASE 2: Eventos de Negocio en PostHog

#### 2.1 Eventos a Implementar
- [ ] `lead_created` - Nuevo lead capturado
- [ ] `lead_assigned` - Lead asignado a vendedor
- [ ] `lead_status_changed` - Cambio de estado de lead
- [ ] `local_status_changed` - Cambio semáforo (verde→amarillo→rojo)
- [ ] `contrato_generated` - Generación de contrato
- [ ] `pago_registered` - Registro de pago/abono
- [ ] `search_performed` - Búsqueda realizada
- [ ] `filter_applied` - Filtro aplicado
- [ ] `export_requested` - Export de datos

#### 2.2 Archivos a Modificar
- [ ] `lib/actions-leads.ts` - lead_created, lead_assigned, lead_status_changed
- [ ] `lib/actions-locales.ts` - local_status_changed
- [ ] `lib/actions-contratos.ts` - contrato_generated
- [ ] `lib/actions-pagos.ts` - pago_registered
- [ ] Componentes con búsqueda/filtros - search, filter, export

---

## 3. QUERIES SQL PRINCIPALES

### 3.1 KPIs Principales
```sql
SELECT
  (SELECT COUNT(*) FROM leads WHERE proyecto_id = $1) as total_leads,
  (SELECT COUNT(*) FROM leads WHERE proyecto_id = $1 AND estado = 'lead_completo') as leads_completos,
  (SELECT COUNT(*) FROM leads WHERE proyecto_id = $1 AND asistio = true) as leads_visitaron,
  (SELECT COUNT(*) FROM locales WHERE proyecto_id = $1 AND estado = 'rojo') as locales_vendidos,
  (SELECT SUM(monto_venta) FROM locales WHERE proyecto_id = $1 AND estado = 'rojo') as revenue_total,
  (SELECT COUNT(*) FROM locales WHERE proyecto_id = $1) as total_locales;
```

### 3.2 Funnel de Conversión
```sql
WITH funnel AS (
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE estado = 'lead_completo') as completos,
    COUNT(*) FILTER (WHERE asistio = true) as visitaron
  FROM leads WHERE proyecto_id = $1
)
SELECT
  total as leads_captados,
  completos as leads_completos,
  visitaron as leads_visitaron,
  (SELECT COUNT(*) FROM locales WHERE proyecto_id = $1 AND estado = 'rojo') as ventas
FROM funnel;
```

### 3.3 Pipeline por Estado
```sql
SELECT
  estado,
  COUNT(*) as cantidad,
  SUM(COALESCE(monto_venta, precio_base)) as valor_total
FROM locales
WHERE proyecto_id = $1
GROUP BY estado
ORDER BY
  CASE estado
    WHEN 'verde' THEN 1
    WHEN 'amarillo' THEN 2
    WHEN 'naranja' THEN 3
    WHEN 'rojo' THEN 4
  END;
```

### 3.4 Atribución Victoria (IA)
```sql
-- Leads atribuibles a Victoria
SELECT
  CASE
    WHEN utm = 'victoria' OR utm ~ '^\d+$' THEN 'Victoria (IA)'
    ELSE COALESCE(utm, 'Directo')
  END as canal,
  COUNT(*) as leads,
  COUNT(*) FILTER (WHERE asistio = true) as visitaron,
  COUNT(*) FILTER (WHERE id IN (
    SELECT lead_id FROM locales WHERE estado = 'rojo' AND lead_id IS NOT NULL
  )) as compraron
FROM leads
WHERE proyecto_id = $1
GROUP BY
  CASE
    WHEN utm = 'victoria' OR utm ~ '^\d+$' THEN 'Victoria (IA)'
    ELSE COALESCE(utm, 'Directo')
  END
ORDER BY leads DESC;
```

### 3.5 Productividad Vendedores
```sql
SELECT
  u.nombre as vendedor,
  COUNT(DISTINCT l.id) as leads_asignados,
  COUNT(DISTINCT l.id) FILTER (WHERE l.asistio = true) as leads_visitaron,
  COUNT(DISTINCT loc.id) as ventas_cerradas,
  COALESCE(SUM(loc.monto_venta), 0) as monto_total,
  COALESCE(SUM(c.monto_comision) FILTER (WHERE c.estado = 'disponible'), 0) as comisiones_pendientes
FROM usuarios u
LEFT JOIN leads l ON l.vendedor_asignado_id = u.id AND l.proyecto_id = $1
LEFT JOIN locales loc ON loc.vendedor_cerro_venta_id = u.id
  AND loc.estado = 'rojo' AND loc.proyecto_id = $1
LEFT JOIN comisiones c ON c.usuario_id = u.id
WHERE u.rol IN ('vendedor', 'vendedor_caseta', 'jefe_ventas')
  AND u.activo = true
GROUP BY u.id, u.nombre
ORDER BY monto_total DESC NULLS LAST;
```

### 3.6 Morosidad
```sql
SELECT
  COUNT(p.id) as pagos_vencidos,
  SUM(p.monto_esperado - p.monto_abonado) as monto_vencido,
  COUNT(DISTINCT cp.id) as clientes_morosos
FROM pagos_local p
JOIN control_pagos cp ON p.control_pago_id = cp.id
WHERE cp.proyecto_id = $1
  AND p.estado IN ('pendiente', 'parcial')
  AND p.fecha_esperada < CURRENT_DATE;
```

---

## 4. DISEÑO UI/UX

### 4.1 Layout Dashboard Ejecutivo
```
┌─────────────────────────────────────────────────────────────────┐
│ DASHBOARD EJECUTIVO - [Proyecto Dropdown] - [Rango Fechas]     │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │
│ │ Revenue   │ │ Pipeline  │ │ Conversión│ │ Victoria  │        │
│ │ $8.7M     │ │ $9.2M     │ │ 0.78%     │ │ 45% ventas│        │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘        │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌─────────────────────────────────┐ │
│ │   FUNNEL CONVERSIÓN     │ │     PIPELINE (SEMÁFORO)         │ │
│ │   ████████████ 20K      │ │  🟢 500  🟡 120  🟠 47  🔴 156  │ │
│ │   ██████████ 9K         │ │  $27.5M  $6.6M  $2.6M  $8.7M    │ │
│ │   ████ 1.3K             │ │                                 │ │
│ │   ██ 156                │ │   [Gráfico de barras apiladas]  │ │
│ └─────────────────────────┘ └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐   │
│ │   EFECTIVIDAD POR CANAL                                    │   │
│ │   ┌──────────────┬────────┬──────────┬─────────┬───────┐  │   │
│ │   │ Canal        │ Leads  │ Visitaron│ Compró  │ Conv% │  │   │
│ │   ├──────────────┼────────┼──────────┼─────────┼───────┤  │   │
│ │   │ Victoria(IA) │ 5,000  │ 750      │ 45      │ 0.9%  │  │   │
│ │   │ Facebook     │ 8,000  │ 400      │ 60      │ 0.75% │  │   │
│ │   │ Google       │ 4,000  │ 150      │ 35      │ 0.87% │  │   │
│ │   └──────────────┴────────┴──────────┴─────────┴───────┘  │   │
│ └───────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌─────────────────────────────────┐ │
│ │  TOP VENDEDORES         │ │   SALUD FINANCIERA              │ │
│ │  1. Juan P. - $680K     │ │   Morosidad: 8.5% ($127K)       │ │
│ │  2. María G. - $520K    │ │   Inicial Pend: $450K           │ │
│ │  3. Carlos R. - $480K   │ │   Proyección Mes: $320K         │ │
│ └─────────────────────────┘ └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Paleta de Colores
- **Verde (#10b981):** Positivo, disponible, cumplido
- **Amarillo (#f59e0b):** Atención, en proceso
- **Naranja (#f97316):** Alerta, confirmado
- **Rojo (#ef4444):** Crítico, vendido, vencido
- **Azul (#3b82f6):** Información, neutro
- **Morado (#8b5cf6):** Victoria/IA, destacado

### 4.3 Componentes Reutilizables
- Cards con sparklines
- Progress bars con gradientes
- Tooltips informativos
- Filtros con chips
- Exportar a PDF/Excel

---

## 5. PERMISOS POR ROL

| Rol | Dashboard Ejecutivo | Analytics | Reportes |
|-----|---------------------|-----------|----------|
| admin | ✅ Completo | ✅ | ✅ |
| jefe_ventas | ✅ Completo | ✅ | ✅ |
| finanzas | ✅ Solo financiero | ❌ | ✅ Financiero |
| vendedor | ❌ | ❌ | ❌ |
| coordinador | ❌ | ❌ | ❌ |

---

## 6. CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Setup y Menú ✅ COMPLETADO
- [x] Crear estructura de carpetas `/app/executive/`
- [x] Crear carpeta `/components/executive/`
- [x] Actualizar Sidebar.tsx con categoría Reportería
- [x] Crear página base executive/page.tsx
- [x] Verificar permisos de acceso por rol

### Fase 2: APIs de Datos ✅ COMPLETADO
- [x] Crear /api/executive/summary
- [x] Crear /api/executive/funnel
- [x] Crear /api/executive/pipeline
- [x] Crear /api/executive/vendedores
- [x] Crear /api/executive/canales (con lógica Victoria)
- [x] Crear /api/executive/financiero
- [x] Crear /api/executive/proyectos
- [x] Testear todas las APIs

### Fase 3: Componentes UI ✅ COMPLETADO
- [x] KPICards.tsx (4 cards superiores)
- [x] FunnelChart.tsx (visualización funnel)
- [x] PipelineChart.tsx (semáforo visual)
- [x] CanalesTable.tsx (UTM breakdown con Victoria)
- [x] VendedoresRanking.tsx (top vendedores)
- [x] FinancieroHealth.tsx (morosidad)
- [x] Integrar todos los componentes en page.tsx

### Fase 4: Eventos PostHog ✅ COMPLETADO
- [x] Crear lib/analytics/posthog-server.ts (server-side helper)
- [x] Agregar trackEvent en actions.ts (leads)
- [x] Agregar trackEvent en actions-locales.ts
- [x] Agregar trackEvent en actions-pagos.ts

### Fase 5: Testing y Polish ✅ COMPLETADO
- [x] TypeScript compila sin errores
- [x] Build de producción exitoso
- [x] Documentación actualizada

---

## 7. ARCHIVOS A CREAR/MODIFICAR

### Nuevos Archivos
```
app/
├── executive/
│   └── page.tsx

components/
├── executive/
│   ├── ExecutiveDashboard.tsx
│   ├── KPICards.tsx
│   ├── FunnelChart.tsx
│   ├── PipelineChart.tsx
│   ├── CanalesTable.tsx
│   ├── VendedoresRanking.tsx
│   ├── FinancieroHealth.tsx
│   └── ProyectosComparison.tsx

app/api/executive/
├── summary/route.ts
├── funnel/route.ts
├── pipeline/route.ts
├── vendedores/route.ts
├── canales/route.ts
├── financiero/route.ts
└── proyectos/route.ts
```

### Archivos a Modificar
```
components/shared/Sidebar.tsx  - Agregar categoría Reportería
lib/actions-leads.ts           - Agregar eventos PostHog
lib/actions-locales.ts         - Agregar eventos PostHog
lib/actions-pagos.ts           - Agregar eventos PostHog
```

---

**Autor:** Claude (Project Manager)
**Última actualización:** 2025-12-29
