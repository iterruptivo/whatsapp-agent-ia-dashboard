# 📋 PLAN: Sistema de Desglose Mensual de Comisiones

**Fecha:** 28 Noviembre 2025
**Sesión:** 58
**Project Leader:** Coordinar implementación quirúrgica

---

## 🎯 OBJETIVO

Implementar tabla de desglose mensual de comisiones con:
- ✅ Agrupación por mes (accordions)
- ✅ Filtros inteligentes (Estado, Año, Búsqueda)
- ✅ Lazy loading (6 meses por defecto)
- ✅ Tracking temporal completo (fecha_procesado, fecha_disponible, fecha_pago)

---

## ⚠️ REQUISITOS CRÍTICOS

### **NO ROMPER:**
- ❌ `ComisionesTable.tsx` - Tabla actual debe seguir funcionando
- ❌ `ComisionStatsCards.tsx` - Widgets de totales
- ❌ `ComisionesChart.tsx` - Gráfico existente
- ❌ Flujo actual: Procesar venta → Comisión pendiente → Disponible → Pagada

### **SÍ MODIFICAR:**
- ✅ `lib/actions-comisiones.ts` - Agregar `fecha_disponible` a interface
- ✅ Crear componente NUEVO (no modificar existente)
- ✅ `app/comisiones/page.tsx` - Integrar nuevo componente

---

## 📊 CONTEXTO: SQL YA EJECUTADO

```sql
-- Columna fecha_disponible agregada a tabla comisiones
-- Trigger actualizado para setear fecha cuando pasa a disponible
```

**Verificar antes de empezar:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'comisiones' AND column_name = 'fecha_disponible';
```

Debe retornar: `fecha_disponible | timestamp with time zone`

---

## 🏗️ ARQUITECTURA DE LA SOLUCIÓN

### **Lógica de agrupación por mes:**

| Estado | Mes donde aparece | Columnas visibles |
|--------|-------------------|-------------------|
| **Pendiente Inicial** | Mes de `fecha_procesado` | `fecha_procesado`: 15 nov<br>`fecha_disponible`: - |
| **Disponible** | Mes de `fecha_disponible` | `fecha_procesado`: 15 nov<br>`fecha_disponible`: 20 dic |
| **Pagada** | Mes de `fecha_pago_comision` | Todas las 3 fechas |

**Ejemplo:**
- Venta procesada 15 nov → Comisión aparece en "Noviembre 2025" (pendiente)
- Inicial completa 20 dic → Comisión SE MUEVE a "Diciembre 2025" (disponible)
- Admin paga 28 dic → Comisión permanece en "Diciembre 2025" (pagada)

---

## 📦 FASES DE IMPLEMENTACIÓN

### **FASE 1: Backend (BackDev) - 15 min**

**Archivo:** `lib/actions-comisiones.ts`

**Cambios:**
1. Actualizar interface `Comision`:
```typescript
export interface Comision {
  // ... campos existentes
  fecha_disponible: string | null; // NUEVO
}
```

2. Actualizar query en `getComisionesByUsuario()` y `getAllComisiones()`:
```typescript
.select(`
  *,
  locales!inner(codigo as local_codigo, proyecto_id),
  proyectos!inner(nombre as proyecto_nombre),
  usuarios(nombre_completo as usuario_nombre)
`)
```

**Testing:**
- Verificar que SELECT incluye `fecha_disponible`
- No romper queries existentes

---

### **FASE 2: Frontend - Componente Nuevo (FrontDev) - 60 min**

**Archivo:** `components/comisiones/ComisionesDesgloseMensual.tsx` (NUEVO)

**Estructura:**
```typescript
'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import type { Comision } from '@/lib/actions-comisiones';

interface ComisionesDesgloseMensualProps {
  comisiones: Comision[];
}

export default function ComisionesDesgloseMensual({ comisiones }: ComisionesDesgloseMensualProps) {
  // States
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroAnio, setFiltroAnio] = useState<string>('2025');
  const [busqueda, setBusqueda] = useState<string>('');
  const [mesesVisibles, setMesesVisibles] = useState<number>(6);
  const [mesesExpandidos, setMesesExpandidos] = useState<Set<string>>(new Set());

  // Lógica de agrupación
  const comisionesPorMes = useMemo(() => {
    // 1. Filtrar por estado, año, búsqueda
    // 2. Agrupar por mes según lógica híbrida
    // 3. Ordenar meses descendente (más reciente primero)
  }, [comisiones, filtroEstado, filtroAnio, busqueda]);

  // Expandir mes actual por defecto
  useEffect(() => {
    const mesActual = new Date().toISOString().slice(0, 7); // "2025-11"
    setMesesExpandidos(new Set([mesActual]));
  }, []);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      {/* Accordions por mes */}
      {/* Botón "Cargar más antiguos" */}
    </div>
  );
}
```

**Componentes internos:**
1. **Barra de filtros:**
   - Dropdown Estado (Todos, Pendiente, Disponible, Pagada)
   - Dropdown Año (2025, 2024, ...)
   - Input búsqueda (código/proyecto/cliente)

2. **Accordion por mes:**
   - Header: Mes + Total + Badges de estado
   - Body: Tabla detallada con 10 columnas

3. **Tabla detallada:**
   - Código Local
   - Proyecto
   - Cliente
   - Monto Venta
   - Fase (badge)
   - % Comisión
   - Monto Comisión (bold verde)
   - Estado (badge)
   - Fecha Procesado
   - Fecha Disponible (si aplica)

**Helpers:**
```typescript
const getMonthKey = (comision: Comision): string => {
  if (comision.estado === 'pagada' && comision.fecha_pago_comision) {
    return comision.fecha_pago_comision.slice(0, 7); // "2025-12"
  }
  if (comision.estado === 'disponible' && comision.fecha_disponible) {
    return comision.fecha_disponible.slice(0, 7);
  }
  return comision.fecha_procesado.slice(0, 7);
};

const formatMonthYear = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const months = ['Enero', 'Febrero', 'Marzo', ...];
  return `${months[parseInt(month) - 1]} ${year}`;
};
```

---

### **FASE 3: Integración (FrontDev) - 10 min**

**Archivo:** `app/comisiones/page.tsx`

**Cambios:**
```typescript
import ComisionesDesgloseMensual from '@/components/comisiones/ComisionesDesgloseMensual';

// Dentro del return, después de ComisionesChart:
<ComisionesChart stats={stats} />
<ComisionesDesgloseMensual comisiones={comisiones} />
<ComisionesTable ... /> {/* Mantener como estaba */}
```

**Orden visual:**
1. ComisionStatsCards (widgets)
2. ComisionesChart (gráfico)
3. **ComisionesDesgloseMensual** (NUEVO)
4. ComisionesTable (tabla actual - mantener)

---

### **FASE 4: Testing (QADev) - 15 min**

**Test Cases:**

1. **Agrupación correcta:**
   - [ ] Pendiente inicial aparece en mes de venta
   - [ ] Disponible aparece en mes que se completó inicial
   - [ ] Pagada aparece en mes de pago

2. **Filtros:**
   - [ ] Filtro por estado funciona
   - [ ] Filtro por año funciona
   - [ ] Búsqueda por código/proyecto/cliente funciona
   - [ ] Combinación de filtros funciona

3. **Accordions:**
   - [ ] Mes actual expandido por defecto
   - [ ] Click en header expande/colapsa
   - [ ] Solo últimos 6 meses visibles
   - [ ] "Cargar más" muestra 6 meses adicionales

4. **Responsive:**
   - [ ] Mobile: Tabla scrolleable horizontalmente
   - [ ] Mobile: Filtros en dropdown nativos
   - [ ] Desktop: Todo visible sin scroll horizontal

5. **Edge Cases:**
   - [ ] Sin comisiones: Mensaje "No hay comisiones registradas"
   - [ ] Solo 1 mes: No muestra "Cargar más"
   - [ ] Todas filtradas: Mensaje "No hay resultados"

---

## 📊 EJEMPLO VISUAL DEL RESULTADO

```
┌──────────────────────────────────────────────────────────┐
│  🔍 Buscar: [________]  Estado: [Todos ▼]  Año: [2025 ▼]│
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  ▼ DICIEMBRE 2025                                        │
│     3 comisiones • Total: $4,250.00                      │
│     🟢 Disponible: 2 ($2,000) • 🟣 Pagada: 1 ($2,250)    │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Local│Proyecto│Cliente│Fase│%  │Comisión│Estado   │ │
│  │ L-001│Callao  │Juan P.│Vend│2.5│$1,250  │Disponib.│ │
│  │ L-001│Callao  │Juan P.│Gest│1.5│$750    │Disponib.│ │
│  │ L-045│San Gab │Maria L│Vend│2.5│$2,250  │Pagada   │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  ▶ NOVIEMBRE 2025                                        │
│     5 comisiones • Total: $3,875.00                      │
│     🟡 Pendiente: 3 ($1,500) • 🟢 Disponible: 2 ($2,375) │
└──────────────────────────────────────────────────────────┘

[Cargar 6 meses más antiguos]
```

---

## 🔧 ARCHIVOS AFECTADOS

**Modificar:**
- `lib/actions-comisiones.ts` (agregar campo a interface)
- `app/comisiones/page.tsx` (agregar import + componente)

**Crear:**
- `components/comisiones/ComisionesDesgloseMensual.tsx` (~400 líneas)

**NO TOCAR:**
- `components/comisiones/ComisionesTable.tsx`
- `components/comisiones/ComisionStatsCards.tsx`
- `components/comisiones/ComisionesChart.tsx`
- `lib/actions-comisiones.ts` (excepto interface)

---

## ✅ CHECKLIST FINAL

Antes de dar por terminado:

- [ ] SQL ejecutado y verificado
- [ ] Interface `Comision` actualizada
- [ ] Componente `ComisionesDesgloseMensual` creado
- [ ] Integrado en `/comisiones`
- [ ] Todos los test cases pasados
- [ ] Responsive mobile verificado
- [ ] No hay errores en console
- [ ] Build exitoso (`npm run build`)
- [ ] Commit descriptivo con mensaje detallado

---

## 🚀 PROMPT PARA PROJECT LEADER

```
Implementar sistema de desglose mensual de comisiones según PLAN_DESGLOSE_MENSUAL_COMISIONES.md.

CONTEXTO:
- SQL ya ejecutado (fecha_disponible agregada a comisiones)
- Trigger actualizado para setear fecha cuando pasa a disponible
- NO romper funcionalidad existente

COORDINACIÓN REQUERIDA:
1. BackDev: Actualizar interfaces en lib/actions-comisiones.ts
2. FrontDev: Crear ComisionesDesgloseMensual.tsx con accordions + filtros
3. FrontDev: Integrar en app/comisiones/page.tsx
4. QADev: Testing end-to-end según checklist del plan

IMPORTANTE:
- Ser quirúrgico: Solo modificar archivos especificados
- Mantener componentes existentes intactos
- Seguir lógica de agrupación híbrida del plan
- Testing incremental por fase

Consulta PLAN_DESGLOSE_MENSUAL_COMISIONES.md para detalles completos.
```

---

**Fin del Plan**
