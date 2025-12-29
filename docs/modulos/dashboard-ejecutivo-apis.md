# APIs Dashboard Ejecutivo - Documentación

**Fecha:** 2025-12-28
**Sesión:** 76
**Desarrollador:** Claude (Backend Agent)

---

## Resumen

7 APIs RESTful para el Dashboard Ejecutivo de EcoPlaza, con datos agregados de leads, locales, vendedores, canales y finanzas.

---

## Ubicación

```
app/api/executive/
├── summary/route.ts
├── funnel/route.ts
├── pipeline/route.ts
├── vendedores/route.ts
├── canales/route.ts
├── financiero/route.ts
└── proyectos/route.ts
```

---

## 1. Summary - KPIs Principales

**Endpoint:** `GET /api/executive/summary`

**Query Params:**
- `proyecto_id` (opcional): UUID del proyecto para filtrar

**Response:**
```json
{
  "success": true,
  "data": {
    "total_leads": 20000,
    "leads_completos": 9000,
    "leads_visitaron": 1300,
    "locales_vendidos": 156,
    "revenue_total": 8700000,
    "total_locales": 823,
    "tasa_conversion": 0.78,
    "promedio_venta": 55769
  }
}
```

**Metricas:**
- Total de leads capturados
- Leads con estado "lead_completo"
- Leads que visitaron (asistio = true)
- Locales vendidos (estado = rojo)
- Revenue total (suma de monto_venta)
- Tasa de conversión (ventas/leads * 100)
- Promedio de venta

---

## 2. Funnel - Funnel de Conversión

**Endpoint:** `GET /api/executive/funnel`

**Query Params:**
- `proyecto_id` (opcional): UUID del proyecto

**Response:**
```json
{
  "success": true,
  "data": {
    "leads_captados": 20000,
    "leads_completos": 9000,
    "leads_visitaron": 1300,
    "ventas": 156,
    "conversion_completos": 45.0,
    "conversion_visitaron": 14.44,
    "conversion_ventas": 12.0
  }
}
```

**Etapas del Funnel:**
1. Leads Captados (100%)
2. Leads Completos (% de captados)
3. Leads Visitaron (% de completos)
4. Ventas (% de visitaron)

---

## 3. Pipeline - Estado de Locales

**Endpoint:** `GET /api/executive/pipeline`

**Query Params:**
- `proyecto_id` (opcional): UUID del proyecto

**Response:**
```json
{
  "success": true,
  "data": [
    { "estado": "verde", "cantidad": 500, "valor_total": 27500000 },
    { "estado": "amarillo", "cantidad": 120, "valor_total": 6600000 },
    { "estado": "naranja", "cantidad": 47, "valor_total": 2585000 },
    { "estado": "rojo", "cantidad": 156, "valor_total": 8580000 }
  ]
}
```

**Sistema de Semáforo:**
- Verde: Disponible
- Amarillo: En proceso
- Naranja: Confirmado
- Rojo: Vendido

---

## 4. Vendedores - Ranking de Productividad

**Endpoint:** `GET /api/executive/vendedores`

**Query Params:**
- `proyecto_id` (opcional): UUID del proyecto

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "vendedor_id": "uuid",
      "vendedor": "Juan Pérez",
      "leads_asignados": 450,
      "leads_visitaron": 180,
      "ventas_cerradas": 25,
      "monto_total": 680000,
      "comisiones_pendientes": 34000,
      "tasa_conversion": 5.56
    }
  ]
}
```

**Filtro de Roles:**
- vendedor
- vendedor_caseta
- jefe_ventas

**Orden:** Por monto_total descendente

---

## 5. Canales - Efectividad por UTM

**Endpoint:** `GET /api/executive/canales`

**Query Params:**
- `proyecto_id` (opcional): UUID del proyecto

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "canal": "Victoria (IA)",
      "leads": 5000,
      "visitaron": 750,
      "compraron": 45,
      "conversion_visita": 15.0,
      "conversion_compra": 6.0
    },
    {
      "canal": "Facebook",
      "leads": 8000,
      "visitaron": 400,
      "compraron": 60,
      "conversion_visita": 5.0,
      "conversion_compra": 15.0
    }
  ]
}
```

**REGLA IMPORTANTE - Atribución Victoria (IA):**

Un lead se atribuye a "Victoria (IA)" si:
- `utm = 'victoria'` (string literal), O
- `utm` es un número puro (regex: `/^\d+$/`)

Ejemplos:
- `utm: 'victoria'` → Victoria (IA)
- `utm: '12345'` → Victoria (IA)
- `utm: 'facebook'` → Facebook
- `utm: null` → Directo

**Conversiones:**
- `conversion_visita`: % de leads que visitaron
- `conversion_compra`: % de visitaron que compraron

**Orden:** Por cantidad de leads descendente

---

## 6. Financiero - Salud Financiera

**Endpoint:** `GET /api/executive/financiero`

**Query Params:**
- `proyecto_id` (opcional): UUID del proyecto

**Response:**
```json
{
  "success": true,
  "data": {
    "morosidad": {
      "pagos_vencidos": 45,
      "monto_vencido": 127500,
      "clientes_morosos": 12,
      "porcentaje_morosidad": 8.5
    },
    "inicial_pendiente": {
      "cantidad": 23,
      "monto_total": 450000
    },
    "proyeccion_mes": {
      "pagos_esperados": 67,
      "monto_esperado": 320000
    }
  }
}
```

**Metricas:**

**Morosidad:**
- Pagos vencidos: pagos con estado pendiente/parcial y fecha_esperada < hoy
- Monto vencido: suma de pendientes vencidos
- Clientes morosos: control_pago_id únicos con pagos vencidos
- % Morosidad: (clientes morosos / total clientes) * 100

**Inicial Pendiente:**
- Controles de pago donde inicial_pagado < monto_inicial

**Proyección del Mes:**
- Pagos con fecha_esperada entre hoy y fin de mes
- Monto esperado de esos pagos

---

## 7. Proyectos - Comparativa Multi-Proyecto

**Endpoint:** `GET /api/executive/proyectos`

**Query Params:** Ninguno (siempre devuelve todos los proyectos activos)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "proyecto_id": "uuid",
      "proyecto": "Proyecto Trapiche",
      "leads": 12000,
      "locales_total": 500,
      "locales_vendidos": 95,
      "ocupacion_porcentaje": 19.0,
      "revenue": 5200000
    },
    {
      "proyecto_id": "uuid",
      "proyecto": "Proyecto Callao",
      "leads": 8000,
      "locales_total": 323,
      "locales_vendidos": 61,
      "ocupacion_porcentaje": 18.9,
      "revenue": 3500000
    }
  ]
}
```

**Metricas por Proyecto:**
- Total de leads
- Total de locales
- Locales vendidos
- % de ocupación (vendidos/total * 100)
- Revenue total

**Orden:** Por revenue descendente

---

## Patrones de Implementación

### 1. Cliente Supabase
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 2. Filtrado por Proyecto
```typescript
const proyectoId = searchParams.get('proyecto_id');

let query = supabase.from('leads').select('*');
if (proyectoId) {
  query = query.eq('proyecto_id', proyectoId);
}
```

### 3. Manejo de Errores
```typescript
try {
  // ... query logic
  if (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Mensaje de error' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: results
  });
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json(
    { success: false, error: 'Error interno' },
    { status: 500 }
  );
}
```

### 4. Agregaciones en Cliente
Todas las APIs usan agregación del lado del cliente para evitar RLS issues y simplificar queries:

```typescript
// Obtener datos raw
const { data: leads } = await supabase.from('leads').select('*');

// Agregar en memoria
const stats = leads.reduce((acc, lead) => {
  // ... lógica de agregación
}, initialValue);
```

---

## Testing

### Ejemplos de Uso

**1. Summary General:**
```bash
curl http://localhost:3000/api/executive/summary
```

**2. Summary de Proyecto Específico:**
```bash
curl http://localhost:3000/api/executive/summary?proyecto_id=uuid-del-proyecto
```

**3. Canales con Victoria (IA):**
```bash
curl http://localhost:3000/api/executive/canales
```

**4. Comparativa de Proyectos:**
```bash
curl http://localhost:3000/api/executive/proyectos
```

### Casos de Prueba

1. **Sin proyecto_id**: Debe agregar datos de TODOS los proyectos
2. **Con proyecto_id válido**: Debe filtrar solo ese proyecto
3. **Con proyecto_id inválido**: Debe devolver arrays vacíos
4. **Datos vacíos**: Debe manejar casos sin leads/locales
5. **Victoria (IA)**: Debe agrupar correctamente 'victoria' y números puros

---

## Próximos Pasos

1. **Crear componentes UI** en `components/executive/`
2. **Crear página** en `app/executive/page.tsx`
3. **Actualizar Sidebar** con categoría Reportería
4. **Agregar gráficas** con Recharts/Chart.js
5. **Implementar filtros** de fecha y proyecto
6. **Testing con datos reales** en PROYECTO PRUEBAS

---

## Dependencias

- Next.js 15.5 App Router
- @supabase/supabase-js
- TypeScript
- Variables de entorno:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

**Autor:** Claude (Backend Developer Agent)
**Última actualización:** 2025-12-28
