# QA Testing - Sesión 59: Sistema de Vista Dual para /comisiones

**Feature:** Sistema de tabs para admin/jefe_ventas en página /comisiones
**Fecha:** 28 Noviembre 2025
**Estado:** PENDING QA REVIEW
**Archivos modificados:** 3 archivos (+~300 líneas)

---

## CAMBIOS IMPLEMENTADOS

### 1. Backend - lib/actions-comisiones.ts (+82 líneas)
- **Nueva función:** `getAllComisionStats()`
- **Funcionalidad:** Calcular stats consolidados de TODAS las comisiones (sin filtro por usuario)
- **Validación:** Solo admin y jefe_ventas pueden ejecutarla
- **Export:** Agregado a exports del módulo

### 2. Frontend - app/comisiones/page.tsx (+60 líneas)
- **State tabs:** `activeTab: 'mis' | 'control'` (default: 'mis')
- **State datos duales:**
  - `comisiones` + `stats` (propias del usuario)
  - `allComisiones` + `allStats` (todas las comisiones - solo admin/jefe)
- **Fetch dual:** Admin/jefe obtienen ambos datasets en `fetchData()`
- **UI Tabs:** Botones "Mis Comisiones" / "Control de Todas" (solo admin/jefe)
- **Headers dinámicos:** Título y subtítulo cambian según tab activo
- **Props condicionales:** Stats, Chart y Tabla reciben datos según tab

### 3. Frontend - components/comisiones/ComisionesDesgloseMensual.tsx (+50 líneas)
- **Nuevas props opcionales:**
  - `showVendedorColumn?: boolean` (default: false)
  - `showVendedorFilter?: boolean` (default: false)
- **State nuevo:** `filtroVendedor` (filter por vendedor)
- **Helper:** `vendedoresUnicos` (lista única de vendedores con ID y nombre)
- **Filtro por vendedor:** Agregado en lógica de filtrado (antes de otros filtros)
- **Columna VENDEDOR:** Header + body condicionales con `showVendedorColumn`
- **Dropdown vendedor:** 4-column grid cuando `showVendedorFilter` es true
- **Usabilidad:** "Todos los vendedores" como opción default

---

## CHECKLIST DE TESTING (QA)

### IMPORTANTE: Requisitos de Testing
- **Node Version:** v16+ requerido (v14 tiene syntax errors con `??=`)
- **Build:** `npm run build` debe compilar sin errores
- **Deployment:** Staging environment requerido para testing real

---

## TEST CASE 1: Vendedor (Rol sin tabs)

### Pre-condiciones:
- Usuario con rol `vendedor` autenticado
- Tiene al menos 3 comisiones propias (diferentes estados)

### Pasos:
1. Navegar a `/comisiones`
2. Verificar que NO se muestran tabs
3. Verificar que header muestra "Mis Comisiones"
4. Verificar que stats cards muestran solo SUS totales
5. Verificar que tabla NO muestra columna VENDEDOR
6. Verificar que filtros NO incluyen dropdown de vendedor

### Resultado esperado:
- ✅ Vista simple sin cambios (igual que antes)
- ✅ Solo ve sus propias comisiones
- ✅ Funcionalidad existente intacta

### Criterio de aceptación:
- [ ] NO ve tabs
- [ ] Stats correctos (solo sus comisiones)
- [ ] Tabla solo muestra sus comisiones
- [ ] NO ve columna VENDEDOR
- [ ] NO ve filtro por vendedor
- [ ] Filtros existentes funcionan (estado, año, búsqueda)

---

## TEST CASE 2: Vendedor Caseta (Rol sin tabs)

### Pre-condiciones:
- Usuario con rol `vendedor_caseta` autenticado
- Tiene al menos 2 comisiones propias

### Pasos:
1. Navegar a `/comisiones`
2. Verificar que NO se muestran tabs
3. Verificar funcionalidad igual que vendedor

### Resultado esperado:
- ✅ Vista simple sin cambios
- ✅ Solo ve sus propias comisiones

### Criterio de aceptación:
- [ ] Comportamiento idéntico a vendedor (TEST CASE 1)

---

## TEST CASE 3: Admin - Tab "Mis Comisiones"

### Pre-condiciones:
- Usuario con rol `admin` autenticado
- Admin tiene 2+ comisiones propias
- Sistema tiene comisiones de otros usuarios

### Pasos:
1. Navegar a `/comisiones`
2. Verificar que tabs son visibles
3. Click en tab "Mis Comisiones" (debe estar activo por default)
4. Verificar header: "Mis Comisiones"
5. Verificar stats cards
6. Verificar tabla de desglose mensual

### Resultado esperado:
- ✅ Tabs visibles ("Mis Comisiones" activo)
- ✅ Stats muestran SOLO totales del admin
- ✅ Tabla muestra SOLO comisiones del admin
- ✅ NO ve columna VENDEDOR
- ✅ NO ve filtro por vendedor
- ✅ NO ve columna ACCIONES (solo en tab "Control")

### Criterio de aceptación:
- [ ] Tab "Mis Comisiones" activo (border verde)
- [ ] Stats cards correctos (solo admin)
- [ ] Chart correcto (solo admin)
- [ ] Tabla muestra solo comisiones del admin
- [ ] NO ve columna VENDEDOR
- [ ] NO ve filtro por vendedor
- [ ] NO ve botón "Marcar Pagada"

---

## TEST CASE 4: Admin - Tab "Control de Todas"

### Pre-condiciones:
- Usuario con rol `admin` autenticado
- Sistema tiene comisiones de múltiples vendedores (mínimo 3)
- Al menos 1 comisión en estado "disponible"

### Pasos:
1. En `/comisiones`, click en tab "Control de Todas"
2. Verificar header: "Control de Todas las Comisiones"
3. Verificar stats cards (deben mostrar totales consolidados)
4. Verificar tabla de desglose mensual:
   - Columna VENDEDOR visible
   - Filtro por vendedor visible
5. Probar filtro por vendedor:
   - Seleccionar vendedor específico
   - Verificar que solo muestra comisiones de ese vendedor
6. Probar combinación de filtros (vendedor + estado)
7. Verificar columna ACCIONES:
   - Debe aparecer botón "Marcar Pagada" para comisiones disponibles

### Resultado esperado:
- ✅ Tab "Control de Todas" activo
- ✅ Stats consolidados de TODOS los vendedores
- ✅ Tabla muestra TODAS las comisiones
- ✅ Columna VENDEDOR visible con nombres correctos
- ✅ Filtro por vendedor funciona
- ✅ Botón "Marcar Pagada" visible (solo admin)

### Criterio de aceptación:
- [ ] Tab "Control de Todas" activo (border verde)
- [ ] Stats cards muestran totales consolidados
- [ ] Chart muestra datos consolidados
- [ ] Tabla muestra comisiones de TODOS los vendedores
- [ ] Columna VENDEDOR visible y correcta
- [ ] Filtro por vendedor funciona
- [ ] Filtro combina correctamente con estado/año/búsqueda
- [ ] Botón "Marcar Pagada" visible para comisiones disponibles
- [ ] Click en "Marcar Pagada" → dropdown confirmación
- [ ] "Confirmar Pago" actualiza comisión a estado "pagada"

---

## TEST CASE 5: Jefe Ventas - Tab "Mis Comisiones"

### Pre-condiciones:
- Usuario con rol `jefe_ventas` autenticado
- Jefe tiene 2+ comisiones propias
- Sistema tiene comisiones de otros usuarios

### Pasos:
1. Navegar a `/comisiones`
2. Verificar que tabs son visibles
3. Click en tab "Mis Comisiones"
4. Verificar comportamiento idéntico a Admin (TEST CASE 3)

### Resultado esperado:
- ✅ Tabs visibles
- ✅ Vista personal correcta
- ✅ NO ve columna ACCIONES

### Criterio de aceptación:
- [ ] Comportamiento idéntico a Admin - Tab "Mis Comisiones" (TEST CASE 3)

---

## TEST CASE 6: Jefe Ventas - Tab "Control de Todas"

### Pre-condiciones:
- Usuario con rol `jefe_ventas` autenticado
- Sistema tiene comisiones de múltiples vendedores
- Al menos 1 comisión en estado "disponible"

### Pasos:
1. En `/comisiones`, click en tab "Control de Todas"
2. Verificar header: "Control de Todas las Comisiones"
3. Verificar stats consolidados
4. Verificar tabla con columna VENDEDOR y filtro
5. **CRÍTICO:** Verificar que NO ve columna ACCIONES
6. Verificar que NO puede marcar comisiones como pagadas

### Resultado esperado:
- ✅ Tab "Control de Todas" funciona
- ✅ Stats consolidados correctos
- ✅ Tabla completa con columna VENDEDOR
- ✅ Filtro por vendedor funciona
- ❌ NO ve columna ACCIONES
- ❌ NO puede marcar comisiones como pagadas (solo admin)

### Criterio de aceptación:
- [ ] Tab "Control de Todas" activo
- [ ] Stats consolidados correctos
- [ ] Tabla muestra TODAS las comisiones
- [ ] Columna VENDEDOR visible
- [ ] Filtro por vendedor funciona
- [ ] **NO ve columna ACCIONES**
- [ ] **NO ve botón "Marcar Pagada"**

---

## EDGE CASES

### EDGE 1: Sin comisiones propias (Admin con tab "Mis")
- Admin sin comisiones propias
- Tab "Mis Comisiones" → Stats en 0, tabla vacía
- Tab "Control de Todas" → Muestra comisiones de otros

**Esperado:**
- [ ] Tab "Mis" muestra empty state correcto
- [ ] Tab "Control" funciona normalmente

### EDGE 2: Sistema sin comisiones (Admin nuevo)
- Sistema sin ninguna comisión
- Ambos tabs deben mostrar empty state

**Esperado:**
- [ ] Tabs visibles
- [ ] Stats en 0 en ambos tabs
- [ ] Empty state en ambas tablas

### EDGE 3: Cambiar entre tabs múltiples veces
- Click rápido entre "Mis" y "Control" (5 veces)
- Verificar que stats/tabla se actualizan correctamente

**Esperado:**
- [ ] No hay flickering
- [ ] Datos correctos en cada cambio
- [ ] No hay console errors

### EDGE 4: Refresh mantiene tab activo
- Abrir tab "Control de Todas"
- Aplicar filtros (vendedor + estado)
- Hacer F5 (refresh)

**Esperado:**
- [ ] Vuelve a tab "Mis Comisiones" (default)
- [ ] Filtros se resetean (comportamiento normal)

**Mejora futura:** Persistir activeTab en localStorage

### EDGE 5: Filtro vendedor con resultado vacío
- Tab "Control de Todas"
- Seleccionar vendedor sin comisiones + estado específico
- Verificar empty state

**Esperado:**
- [ ] Muestra mensaje "No hay comisiones para mostrar"
- [ ] Mensaje "Intenta ajustar los filtros"

### EDGE 6: Performance con muchas comisiones
- Sistema con 50+ comisiones de 5+ vendedores
- Tab "Control de Todas"
- Verificar lazy loading (6 meses)

**Esperado:**
- [ ] Carga inicial rápida (<2s)
- [ ] Lazy loading funciona
- [ ] Filtros responden rápido

---

## INTEGRACIÓN

### INT 1: ComisionStatsCards recibe datos correctos
- Verificar que stats cards muestran valores correctos en ambos tabs
- Comparar totales con query SQL directa

**SQL de verificación:**
```sql
-- Tab "Mis Comisiones" (admin)
SELECT COUNT(*), SUM(monto_comision)
FROM comisiones
WHERE usuario_id = 'admin-id';

-- Tab "Control de Todas"
SELECT COUNT(*), SUM(monto_comision)
FROM comisiones;
```

**Esperado:**
- [ ] Stats cards coinciden con SQL

### INT 2: ComisionesChart recibe datos correctos
- Chart debe mostrar datos según tab activo

**Esperado:**
- [ ] Chart actualiza al cambiar tab
- [ ] Datos coinciden con stats cards

### INT 3: Marcar comisión como pagada (Admin en "Control")
- Tab "Control de Todas"
- Marcar comisión de otro vendedor como pagada
- Verificar que se actualiza en DB
- Verificar que stats se recalculan

**Esperado:**
- [ ] Comisión cambia a "pagada"
- [ ] Stats disponible disminuye
- [ ] Stats pagado aumenta
- [ ] fecha_pago_comision se registra
- [ ] pagado_por = admin.id

---

## PERFORMANCE

### PERF 1: Fetch dual en mount
- Admin abre `/comisiones`
- Medir tiempo de fetch (Network tab)

**Esperado:**
- [ ] Fetch simultáneo (paralelo)
- [ ] Total <3s (ambos completos)

### PERF 2: Cambio de tab (sin re-fetch)
- Admin en tab "Mis"
- Click en tab "Control"

**Esperado:**
- [ ] NO hace nuevo fetch (datos ya cargados)
- [ ] Cambio instantáneo (<100ms)

---

## RESPONSIVE

### RESP 1: Mobile - Tabs en pantalla pequeña
- Viewport 375px (iPhone)
- Verificar tabs apilados o colapsados

**Esperado:**
- [ ] Tabs legibles en mobile
- [ ] Grid filtros adapta a 1 columna

### RESP 2: Tablet - Grid filtros
- Viewport 768px (iPad)
- Tab "Control" con 4 filtros

**Esperado:**
- [ ] Grid muestra 2x2 o 4 columnas
- [ ] Inputs no se superponen

---

## SECURITY

### SEC 1: Vendedor intenta acceder a tab "Control"
- Vendedor autenticado
- Manipular DOM para mostrar tab "Control" (inspect element)
- Click en tab

**Esperado:**
- [ ] Backend rechaza `getAllComisiones()` (RLS)
- [ ] Backend rechaza `getAllComisionStats()` (validación rol)
- [ ] No muestra datos de otros vendedores

### SEC 2: Jefe intenta marcar como pagada
- Jefe_ventas en tab "Control"
- Manipular DOM para mostrar botón "Marcar Pagada"
- Click en botón

**Esperado:**
- [ ] Backend rechaza `marcarComisionPagada()` (validación rol admin)
- [ ] Comisión NO cambia de estado

---

## RESUMEN DE TEST CASES

| # | Categoría | Test Case | Prioridad | Estado |
|---|-----------|-----------|-----------|--------|
| 1 | Roles | Vendedor sin tabs | ALTA | ⏳ |
| 2 | Roles | Vendedor Caseta sin tabs | ALTA | ⏳ |
| 3 | Admin | Tab "Mis Comisiones" | ALTA | ⏳ |
| 4 | Admin | Tab "Control de Todas" | CRÍTICA | ⏳ |
| 5 | Jefe | Tab "Mis Comisiones" | ALTA | ⏳ |
| 6 | Jefe | Tab "Control de Todas" | CRÍTICA | ⏳ |
| E1 | Edge | Sin comisiones propias | MEDIA | ⏳ |
| E2 | Edge | Sistema sin comisiones | MEDIA | ⏳ |
| E3 | Edge | Cambio tabs rápido | BAJA | ⏳ |
| E4 | Edge | Refresh página | BAJA | ⏳ |
| E5 | Edge | Filtro sin resultados | BAJA | ⏳ |
| E6 | Edge | Performance 50+ comisiones | MEDIA | ⏳ |
| I1 | Integración | Stats cards correctos | ALTA | ⏳ |
| I2 | Integración | Chart correcto | ALTA | ⏳ |
| I3 | Integración | Marcar pagada funciona | CRÍTICA | ⏳ |
| P1 | Performance | Fetch dual <3s | MEDIA | ⏳ |
| P2 | Performance | Cambio tab <100ms | BAJA | ⏳ |
| R1 | Responsive | Mobile tabs | BAJA | ⏳ |
| R2 | Responsive | Tablet grid | BAJA | ⏳ |
| S1 | Security | Vendedor no accede Control | CRÍTICA | ⏳ |
| S2 | Security | Jefe no marca pagada | CRÍTICA | ⏳ |

**Total:** 21 test cases
**Prioridad CRÍTICA:** 4 casos
**Prioridad ALTA:** 8 casos

---

## CRITERIO DE APROBACIÓN

✅ **APROBADO** si:
- Todos los casos CRÍTICOS pasan (4/4)
- Al menos 80% de casos ALTA pasan (6/8)
- No hay errores de console
- Build compila sin errores

❌ **RECHAZADO** si:
- Cualquier caso CRÍTICO falla
- Más de 2 casos ALTA fallan
- Errores en console
- Build no compila

---

## NOTAS DE IMPLEMENTACIÓN

### Patrón de código seguido:
- Client Component ('use client')
- useAuth() hook para auth
- Props opcionales con valores default
- Renderizado condicional con `&&`
- Fetch dual para admin/jefe (paralelo en misma función)

### Decisiones técnicas:
1. **Tab default "Mis":** Admin/jefe siempre inician en vista personal
2. **Fetch dual en mount:** Mejor UX (datos pre-cargados para cambio de tab)
3. **Props opcionales:** No rompe componente existente (backward compatible)
4. **Columna ACCIONES:** Solo admin puede marcar como pagada (jefe_ventas NO)

### Archivos NO modificados (verified):
- ComisionStatsCards.tsx
- ComisionesChart.tsx
- ComisionesTable.tsx (componente antiguo oculto)

---

## INSTRUCCIONES DE TESTING

1. **Deploy a staging:**
   ```bash
   git checkout staging
   git pull origin main
   npm run build
   npm run start
   ```

2. **Crear datos de prueba:**
   - 3 vendedores con 2-3 comisiones cada uno
   - 1 admin con 2 comisiones propias
   - 1 jefe_ventas con 1 comisión propia
   - Diferentes estados: pendiente_inicial, disponible, pagada

3. **Ejecutar test cases en orden:**
   - Vendedor → Vendedor Caseta → Admin → Jefe
   - Marcar cada checklist item al completar

4. **Reportar errores:**
   - Screenshot + descripción
   - Console logs (si aplica)
   - Steps to reproduce

---

**QA Tester:** @QADev
**Deadline:** TBD
**Ambiente:** Staging

