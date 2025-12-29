# Componentes del Dashboard Ejecutivo - EcoPlaza

Componentes UI creados para el Dashboard Ejecutivo del sistema EcoPlaza.

---

## Componentes Creados

### 1. KPICards.tsx

**Propósito:** Mostrar 4 métricas clave en cards superiores del dashboard

**Props:**
```typescript
interface KPICardsProps {
  summary: {
    revenue_total: number;
    pipeline_value: number;
    conversion_rate: number;
    total_leads: number;
    total_sales: number;
  };
  victoriaData: {
    victoria_leads: number;
    victoria_sales: number;
    victoria_conversion: number;
    victoria_attribution_percent: number;
  };
}
```

**Características:**
- 4 cards con iconos lucide-react
- Revenue total con icono DollarSign (verde)
- Pipeline value con icono TrendingUp (azul)
- Conversión global con icono Users (amarillo)
- Victoria IA Attribution con icono Sparkles (morado)
- Formato automático de moneda ($8.7M, $520K)
- Formato de porcentajes (0.78%)
- Responsive grid (1 col mobile, 2 tablet, 4 desktop)
- Hover effect con shadow

---

### 2. FunnelChart.tsx

**Propósito:** Visualización de embudo de conversión de leads a ventas

**Props:**
```typescript
interface FunnelChartProps {
  data: {
    captados: number;
    completos: number;
    visitaron: number;
    ventas: number;
  };
}
```

**Características:**
- Barras horizontales decrecientes usando Recharts BarChart
- Cálculo automático de conversión entre etapas
- Colores por etapa: azul → verde → amarillo → verde EcoPlaza
- Tooltip personalizado con datos detallados
- Labels con valores formateados (20,000)
- Grid inferior con indicadores de conversión %
- Altura 400px responsive

---

### 3. PipelineChart.tsx

**Propósito:** Visualización del pipeline de locales por estado (semáforo)

**Props:**
```typescript
interface PipelineChartProps {
  data: Array<{
    estado: "verde" | "amarillo" | "naranja" | "rojo";
    cantidad: number;
    valor: number;
  }>;
}
```

**Características:**
- Gráfico de barras con Recharts
- Colores según semáforo:
  - Verde: #10b981 (Disponible)
  - Amarillo: #f59e0b (En Proceso)
  - Naranja: #f97316 (Confirmado)
  - Rojo: #ef4444 (Vendido)
- Tooltip con emoji de semáforo correspondiente
- Cards resumen debajo con estadísticas por estado
- Formato de moneda automático
- Dual Y-axis (cantidad y valor)

---

### 4. CanalesTable.tsx

**Propósito:** Tabla de efectividad por canal UTM con destacado de Victoria (IA)

**Props:**
```typescript
interface CanalesTableProps {
  data: Array<{
    canal: string;
    leads: number;
    visitaron: number;
    compraron: number;
  }>;
}
```

**Características:**
- Tabla responsive con 5 columnas
- Detección automática de canal "Victoria (IA)"
- Fila Victoria destacada con fondo morado
- Badge "IA" morado para Victoria
- Icono Sparkles para Victoria
- Cálculo automático de conversión %
- Indicadores TrendingUp/Down según promedio
- Card resumen inferior con stats de Victoria
- Ordenamiento por ventas (compraron) descendente

---

### 5. VendedoresRanking.tsx

**Propósito:** Ranking de vendedores con top 3 destacado y tabla completa

**Props:**
```typescript
interface VendedoresRankingProps {
  data: Array<{
    nombre: string;
    leads: number;
    visitas: number;
    ventas: number;
    monto: number;
    comisiones: number;
  }>;
}
```

**Características:**
- Top 3 destacado con cards y medallas:
  - 1er lugar: Medalla oro (amarillo) con fondo amarillo claro
  - 2do lugar: Medalla plata (gris) con fondo gris claro
  - 3er lugar: Medalla bronce (café) con fondo café claro
- Tabla completa con top 10 vendedores
- Medallas en primera columna para top 3
- Cálculo de conversión % (ventas/leads)
- Formato de moneda automático
- Comisiones en amarillo
- Fila TOTAL al final con sumas
- Ordenamiento por monto total descendente

---

### 6. FinancieroHealth.tsx

**Propósito:** Cards de salud financiera con semáforo de morosidad

**Props:**
```typescript
interface FinancieroHealthProps {
  morosidad: {
    porcentaje: number;
    monto: number;
    clientes: number;
  };
  inicialPendiente: {
    monto: number;
    contratos: number;
  };
  proyeccion: {
    monto: number;
    mes: string;
  };
}
```

**Características:**
- 3 cards horizontales:
  - **Morosidad:** Con semáforo de alerta según %
    - < 5%: Verde "Saludable"
    - 5-10%: Amarillo "Atención"
    - 10-15%: Naranja "Alerta"
    - >= 15%: Rojo "Crítico"
  - **Inicial Pendiente:** Azul con icono Clock
  - **Proyección Mes:** Verde con icono TrendingUp y barra de progreso
- Card resumen ejecutivo con gradiente EcoPlaza
- Iconos: AlertTriangle, Clock, TrendingUp, DollarSign
- Border-left de 4px con color de alerta
- Cálculos automáticos (promedio/contrato, % progreso mes)

---

## Stack Técnico

- **Next.js 15.5** con App Router
- **React 19** con TypeScript
- **Tailwind CSS** para estilos
- **Recharts 3.2.1** para gráficos
- **lucide-react** para iconos

---

## Colores Corporativos EcoPlaza

```css
Verde primario: #1b967a
Azul navy:      #192c4d
Amarillo:       #fbde17
```

Colores adicionales de semáforo:
```css
Verde:    #10b981 (emerald-500)
Amarillo: #f59e0b (amber-500)
Naranja:  #f97316 (orange-500)
Rojo:     #ef4444 (red-500)
Azul:     #3b82f6 (blue-500)
Morado:   #8b5cf6 (violet-500) - Victoria IA
```

---

## Responsive Design

Todos los componentes implementan diseño responsive mobile-first:

- **Mobile** (< 640px): 1 columna, componentes apilados
- **Tablet** (640px - 1024px): 2 columnas para grids
- **Desktop** (>= 1024px): Layout completo según diseño

Breakpoints Tailwind:
- `sm:` 640px
- `md:` 768px
- `lg:` 1024px
- `xl:` 1280px

---

## Página de Demostración

**URL:** http://localhost:3000/showcase-components

Página pública (sin autenticación) para visualizar todos los componentes con datos de ejemplo.

---

## Uso de Ejemplo

```tsx
import KPICards from "@/components/executive/KPICards";
import FunnelChart from "@/components/executive/FunnelChart";
import PipelineChart from "@/components/executive/PipelineChart";
import CanalesTable from "@/components/executive/CanalesTable";
import VendedoresRanking from "@/components/executive/VendedoresRanking";
import FinancieroHealth from "@/components/executive/FinancieroHealth";

export default function ExecutiveDashboard() {
  const summaryData = { /* datos de API */ };
  const victoriaData = { /* datos de API */ };
  const funnelData = { /* datos de API */ };
  const pipelineData = [ /* datos de API */ ];
  const canalesData = [ /* datos de API */ ];
  const vendedoresData = [ /* datos de API */ ];
  const morosidadData = { /* datos de API */ };
  const inicialPendienteData = { /* datos de API */ };
  const proyeccionData = { /* datos de API */ };

  return (
    <div className="p-8">
      <KPICards summary={summaryData} victoriaData={victoriaData} />

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <FunnelChart data={funnelData} />
        <PipelineChart data={pipelineData} />
      </div>

      <CanalesTable data={canalesData} />
      <VendedoresRanking data={vendedoresData} />

      <FinancieroHealth
        morosidad={morosidadData}
        inicialPendiente={inicialPendienteData}
        proyeccion={proyeccionData}
      />
    </div>
  );
}
```

---

**Autor:** Frontend Agent - EcoPlaza Dashboard
**Fecha:** 2025-12-28
**Versión:** 1.0.0
