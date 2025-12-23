# QA Testing Checklist - Session 58: Monthly Commission Breakdown

**Feature:** Sistema de desglose mensual de comisiones con accordions, filtros y lazy loading
**Date:** 28 Noviembre 2025
**Status:** PENDING QA REVIEW

---

## Changes Implemented

### FASE 1: Backend (BackDev)
**File:** `lib/actions-comisiones.ts`
- ✅ Added `fecha_disponible: string | null` to `Comision` interface (line 18)
- ✅ No changes to queries needed (field already exists in DB from SQL migration)

### FASE 2: Frontend - New Component (FrontDev)
**File:** `components/comisiones/ComisionesDesgloseMensual.tsx` (NEW - 460 lines)

**Features implemented:**
1. **Hybrid month grouping logic:**
   - Pendiente → Grouped by `fecha_procesado` month
   - Disponible → Grouped by `fecha_disponible` month
   - Pagada → Grouped by `fecha_pago_comision` month

2. **Filters:**
   - Search by código/proyecto
   - Filter by estado (Todos, Pendiente, Disponible, Pagada)
   - Filter by year (dynamic dropdown with available years)

3. **Accordions:**
   - Header shows: Month name, count, total amount, badges per status
   - Expandable/collapsible body with detailed table
   - Current month expanded by default

4. **Lazy loading:**
   - Shows last 6 months by default
   - "Cargar 6 meses más antiguos" button loads next 6
   - Sorted descending (most recent first)

5. **Detailed table (9 columns):**
   - Código Local
   - Proyecto
   - Monto Venta
   - Fase (badge: Vendedor/Gestión)
   - % Comisión
   - Monto Comisión (bold green)
   - Estado (badge: Pendiente/Disponible/Pagada)
   - Fecha Procesado
   - Fecha Disponible

### FASE 3: Integration (FrontDev)
**File:** `app/comisiones/page.tsx`
- ✅ Import `ComisionesDesgloseMensual` component
- ✅ Added component between `ComisionesChart` and `ComisionesTable`
- ✅ Order: StatsCards → Chart → **DesgloseMensual** → Table

**No existing components were modified.**

---

## Test Cases

### 1. Agrupación Correcta por Mes

**Escenario 1.1: Comisión Pendiente Inicial**
- [ ] Crear comisión pendiente (venta procesada 15 nov)
- [ ] Verificar que aparece en acordeón "Noviembre 2025"
- [ ] Verificar badge amarillo en header del mes
- [ ] Verificar que `fecha_disponible` muestra "-"

**Escenario 1.2: Comisión Disponible**
- [ ] Marcar comisión como disponible (inicial completa 20 dic)
- [ ] Verificar que SE MUEVE a acordeón "Diciembre 2025"
- [ ] Verificar badge verde en header del mes
- [ ] Verificar que `fecha_disponible` muestra "20/12/2025"

**Escenario 1.3: Comisión Pagada**
- [ ] Admin marca comisión como pagada (28 dic)
- [ ] Verificar que PERMANECE en "Diciembre 2025"
- [ ] Verificar badge púrpura en header del mes
- [ ] Verificar que todas las fechas están completas

### 2. Filtros Funcionan Correctamente

**Escenario 2.1: Filtro por Estado**
- [ ] Cambiar a "Pendiente Inicial" → Solo muestra pendientes
- [ ] Cambiar a "Disponible" → Solo muestra disponibles
- [ ] Cambiar a "Pagada" → Solo muestra pagadas
- [ ] Cambiar a "Todos" → Muestra todas

**Escenario 2.2: Filtro por Año**
- [ ] Dropdown muestra años disponibles (2025, 2024, etc.)
- [ ] Seleccionar "2025" → Solo meses de 2025 visibles
- [ ] Seleccionar "Todos" → Todos los años visibles

**Escenario 2.3: Búsqueda**
- [ ] Buscar por código de local (ej: "L-001") → Filtra correctamente
- [ ] Buscar por proyecto (ej: "Callao") → Filtra correctamente
- [ ] Buscar texto inexistente → Muestra mensaje "No hay comisiones para mostrar"
- [ ] Borrar búsqueda → Restaura resultados

**Escenario 2.4: Combinación de Filtros**
- [ ] Aplicar estado + año + búsqueda simultáneamente
- [ ] Verificar que todos los filtros se respetan
- [ ] Limpiar filtros uno por uno → Resultados se actualizan

### 3. Accordions Funcionan

**Escenario 3.1: Expansión/Colapso**
- [ ] Al cargar página, mes actual está expandido por defecto
- [ ] Click en otro mes → Se expande
- [ ] Click en mes expandido → Se colapsa
- [ ] Múltiples meses pueden estar expandidos simultáneamente

**Escenario 3.2: Header del Mes**
- [ ] Muestra nombre del mes correcto (ej: "Noviembre 2025")
- [ ] Muestra cantidad de comisiones (ej: "5 comisiones")
- [ ] Muestra total del mes (ej: "Total: $4,250.00")
- [ ] Badges de estado muestran count + monto correcto

**Escenario 3.3: Tabla Detallada**
- [ ] Todas las columnas se muestran correctamente
- [ ] Montos formateados con USD y 2 decimales
- [ ] Badges de Fase (Vendedor/Gestión) con colores correctos
- [ ] Badges de Estado (Pendiente/Disponible/Pagada) con colores correctos
- [ ] Hover sobre fila cambia background a gris claro

### 4. Lazy Loading

**Escenario 4.1: Visualización Inicial**
- [ ] Por defecto muestra últimos 6 meses
- [ ] Meses ordenados descendente (más reciente primero)
- [ ] Botón "Cargar 6 meses más antiguos" visible si hay más de 6 meses

**Escenario 4.2: Cargar Más**
- [ ] Click en botón → Carga 6 meses adicionales
- [ ] Scroll smooth hacia nuevos meses
- [ ] Si no hay más meses, botón desaparece

**Escenario 4.3: Edge Case - Solo 1 Mes**
- [ ] Si solo hay 1 mes con comisiones, no muestra botón "Cargar más"

### 5. Responsive Design

**Escenario 5.1: Desktop (>1024px)**
- [ ] Filtros en una fila horizontal (3 columnas)
- [ ] Tabla completa visible sin scroll horizontal
- [ ] Accordions ocupan ancho completo

**Escenario 5.2: Mobile (<768px)**
- [ ] Filtros apilados verticalmente
- [ ] Tabla scrolleable horizontalmente
- [ ] Headers de acordeón se ajustan (badges apilados)
- [ ] Botones y dropdowns nativos funcionan

### 6. Edge Cases

**Escenario 6.1: Sin Comisiones**
- [ ] Usuario sin comisiones → Muestra icono + mensaje
- [ ] Mensaje: "No hay comisiones para mostrar"
- [ ] Subtexto: "Intenta ajustar los filtros"

**Escenario 6.2: Todas Filtradas**
- [ ] Aplicar filtros que no coinciden → Mensaje de "No hay comisiones"
- [ ] Limpiar filtros → Comisiones reaparecen

**Escenario 6.3: Fecha Disponible NULL**
- [ ] Comisión pendiente sin `fecha_disponible`
- [ ] Columna muestra "-" en vez de fecha

### 7. Integración con Componentes Existentes

**Escenario 7.1: No Romper Funcionalidad Existente**
- [ ] ComisionStatsCards sigue mostrando totales correctos
- [ ] ComisionesChart sigue mostrando gráfico (datos mockeados en Sesión 53)
- [ ] ComisionesTable sigue funcionando (botón "Marcar Pagada", etc.)
- [ ] No hay errores en console del navegador

**Escenario 7.2: Orden Visual Correcto**
- [ ] 1. ComisionStatsCards (widgets)
- [ ] 2. ComisionesChart (gráfico de barras)
- [ ] 3. **ComisionesDesgloseMensual** (nuevo)
- [ ] 4. ComisionesTable (tabla existente)

### 8. Performance

**Escenario 8.1: Carga Inicial**
- [ ] Página carga en menos de 2 segundos
- [ ] No hay lag al expandir/colapsar accordions
- [ ] Filtros responden instantáneamente

**Escenario 8.2: Con Muchas Comisiones**
- [ ] Con 100+ comisiones, filtros funcionan rápido
- [ ] Lazy loading previene renderizar todos los meses a la vez
- [ ] Scroll smooth sin stuttering

---

## Visual Verification Checklist

### Colors & Branding
- [ ] Verde corporativo: `#1b967a` (usado en montos de comisión)
- [ ] Badges de estado:
  - Pendiente: Amarillo (`bg-yellow-100 text-yellow-800`)
  - Disponible: Verde (`bg-green-100 text-green-800`)
  - Pagada: Púrpura (`bg-purple-100 text-purple-800`)
- [ ] Badges de fase:
  - Vendedor: Azul (`bg-blue-100 text-blue-800`)
  - Gestión: Índigo (`bg-indigo-100 text-indigo-800`)

### Typography
- [ ] Headers de mes: `text-base font-semibold`
- [ ] Monto comisión: `font-bold text-green-600`
- [ ] Subtítulos: `text-sm text-gray-500`

### Icons
- [ ] Calendar icon en header principal
- [ ] Search icon en input de búsqueda
- [ ] Filter icon en dropdown de estado
- [ ] Calendar icon en dropdown de año
- [ ] ChevronDown/ChevronUp en accordions

---

## Files Modified Summary

**Modified:**
- `lib/actions-comisiones.ts` (+1 line)
- `app/comisiones/page.tsx` (+2 lines)

**Created:**
- `components/comisiones/ComisionesDesgloseMensual.tsx` (460 lines)

**Not Modified (verify still working):**
- `components/comisiones/ComisionStatsCards.tsx`
- `components/comisiones/ComisionesChart.tsx`
- `components/comisiones/ComisionesTable.tsx`

---

## Deployment Checklist

Before deploying to staging:
- [ ] All test cases passed
- [ ] No console errors in browser
- [ ] No TypeScript errors
- [ ] Build successful (`npm run build`)
- [ ] Visual review in Chrome/Firefox/Safari
- [ ] Mobile responsive verified
- [ ] No regression in existing components

---

## Known Limitations (Future Enhancements)

1. **Chart no usa datos reales:** `ComisionesChart.tsx` usa datos mockeados (Sesión 53). En el futuro, integrar con lógica real de `ComisionesDesgloseMensual`.

2. **Solo vista usuario:** Actualmente todos los roles ven solo SUS comisiones (Sesión 53). En el futuro, admin/jefe_ventas verá vista consolidada de todos.

3. **No muestra cliente en tabla detallada:** Tabla no incluye columna "Cliente". Considerar agregar en futuras iteraciones si es necesario.

---

## QA Approval

**QADev:** ___________________
**Date:** ___________________
**Status:** ⬜ APPROVED / ⬜ REJECTED

**Comments:**
```
[QADev: Add any issues, bugs, or feedback here]
```

---

**End of QA Checklist**
