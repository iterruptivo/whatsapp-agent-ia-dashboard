# Executive Dashboard APIs

**Fecha de creación:** 2025-12-28
**Versión:** 1.0.0

---

## Descripción

7 endpoints RESTful para el Dashboard Ejecutivo de EcoPlaza, proporcionando métricas agregadas de negocio en tiempo real desde Supabase.

---

## Endpoints Disponibles

| Endpoint | Descripción | Proyecto Filtrable |
|----------|-------------|-------------------|
| `GET /api/executive/summary` | KPIs principales | Sí |
| `GET /api/executive/funnel` | Funnel de conversión | Sí |
| `GET /api/executive/pipeline` | Pipeline por estado | Sí |
| `GET /api/executive/vendedores` | Ranking vendedores | Sí |
| `GET /api/executive/canales` | Efectividad por canal | Sí |
| `GET /api/executive/financiero` | Salud financiera | Sí |
| `GET /api/executive/proyectos` | Comparativa proyectos | No |

---

## Formato de Respuesta

Todas las APIs siguen el mismo formato:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Mensaje de error descriptivo"
}
```

---

## Query Parameters

### proyecto_id (opcional)

Filtrar datos por proyecto específico.

**Uso:**
```
GET /api/executive/summary?proyecto_id=uuid-del-proyecto
```

**Comportamiento:**
- Si se proporciona: Filtra todos los datos por ese proyecto
- Si se omite: Agrega datos de TODOS los proyectos

---

## Características Especiales

### 1. Atribución Victoria (IA)

En el endpoint `/api/executive/canales`, los leads se agrupan como "Victoria (IA)" si:

- `utm = 'victoria'` (string literal), O
- `utm` es un número puro (regex: `/^\d+$/`)

Ejemplos:
- `utm: 'victoria'` → **Victoria (IA)**
- `utm: '12345'` → **Victoria (IA)**
- `utm: 'facebook'` → Facebook
- `utm: null` → Directo

### 2. Agregación del Lado del Cliente

Todas las APIs obtienen datos raw de Supabase y realizan agregaciones en memoria para evitar:
- Problemas con RLS (Row Level Security)
- Queries SQL complejas
- Dependencias de funciones PL/pgSQL

### 3. Fallback en Summary

El endpoint `summary` intenta usar RPC primero, pero tiene fallback a queries individuales si falla.

---

## Ejemplos de Uso

### Desde Frontend (TypeScript)

```typescript
import { getSummary, getCanales } from '@/lib/executive-api';

// KPIs generales
const summary = await getSummary();
console.log(summary.revenue_total); // 8700000

// KPIs de proyecto específico
const summaryTrapiche = await getSummary('uuid-trapiche');
console.log(summaryTrapiche.locales_vendidos); // 95

// Canales con Victoria (IA)
const canales = await getCanales();
const victoria = canales.find(c => c.canal === 'Victoria (IA)');
console.log(victoria?.leads); // 5000
```

### Desde cURL

```bash
# Summary general
curl http://localhost:3000/api/executive/summary

# Summary de proyecto
curl "http://localhost:3000/api/executive/summary?proyecto_id=uuid-del-proyecto"

# Canales
curl http://localhost:3000/api/executive/canales

# Proyectos (comparativa)
curl http://localhost:3000/api/executive/proyectos
```

### Desde Navegador

```
http://localhost:3000/api/executive/summary
http://localhost:3000/api/executive/funnel?proyecto_id=uuid
http://localhost:3000/api/executive/canales
```

---

## Tablas de Supabase Utilizadas

| Tabla | Campos Clave | Usado En |
|-------|-------------|----------|
| `leads` | estado, asistio, utm, vendedor_asignado_id, proyecto_id | Todos |
| `locales` | estado, monto_venta, precio_base, vendedor_cerro_venta_id, lead_id, proyecto_id | Todos |
| `usuarios` | id, nombre, rol, activo | vendedores |
| `control_pagos` | proyecto_id, monto_inicial, inicial_pagado | financiero |
| `pagos_local` | control_pago_id, estado, fecha_esperada, monto_esperado, monto_abonado | financiero |
| `comisiones` | usuario_id, monto_comision, estado | vendedores |
| `proyectos` | id, nombre, activo | proyectos |

---

## Testing

### Script Bash

```bash
chmod +x scripts/test-executive-apis.sh
./scripts/test-executive-apis.sh http://localhost:3000
```

### Testing Manual

1. **Iniciar servidor:** `npm run dev`
2. **Abrir navegador:** http://localhost:3000/api/executive/summary
3. **Verificar JSON:** Debe retornar `{ "success": true, "data": {...} }`
4. **Probar filtro:** Agregar `?proyecto_id=uuid-valido`

### Casos de Prueba

- [ ] Summary sin proyecto_id (datos globales)
- [ ] Summary con proyecto_id válido
- [ ] Summary con proyecto_id inválido (debe retornar ceros)
- [ ] Canales agrupando Victoria (verificar 'victoria' y números)
- [ ] Vendedores solo con roles permitidos
- [ ] Financiero con morosidad calculada correctamente
- [ ] Proyectos ordenados por revenue

---

## Performance

### Optimizaciones Implementadas

1. **Queries en Paralelo:** Uso de `Promise.all()` donde es posible
2. **Agregación en Cliente:** Evita overhead de SQL functions
3. **Filtrado Temprano:** `eq('proyecto_id')` al inicio de queries
4. **Índices Asumidos:** proyecto_id, estado, created_at en tablas

### Tiempos Esperados

- Summary: ~200-500ms
- Funnel: ~150-300ms
- Pipeline: ~100-200ms
- Vendedores: ~300-600ms (más JOINs)
- Canales: ~200-400ms
- Financiero: ~400-800ms (cálculos complejos)
- Proyectos: ~300-500ms

---

## Seguridad

### Autenticación

**Actualmente:** No requieren autenticación (usan anon key)

**Recomendación para Producción:**
```typescript
// Agregar verificación de sesión
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'No autorizado' },
      { status: 401 }
    );
  }

  // ... resto del código
}
```

### RBAC (Role-Based Access Control)

Verificar rol del usuario:
```typescript
const { data: usuario } = await supabase
  .from('usuarios')
  .select('rol')
  .eq('id', user.id)
  .single();

if (!['admin', 'jefe_ventas'].includes(usuario?.rol)) {
  return NextResponse.json(
    { success: false, error: 'Permisos insuficientes' },
    { status: 403 }
  );
}
```

---

## Próximos Pasos

1. [ ] Agregar autenticación (Server Actions)
2. [ ] Implementar RBAC por endpoint
3. [ ] Agregar cache con Redis/Upstash
4. [ ] Crear variantes con rango de fechas
5. [ ] Optimizar queries con materialized views
6. [ ] Agregar rate limiting
7. [ ] Documentar en OpenAPI/Swagger

---

## Troubleshooting

### Error: "Error al obtener X"

**Causa:** Query falló en Supabase

**Solución:**
1. Verificar logs en consola del servidor
2. Revisar RLS policies en Supabase
3. Verificar que las tablas tengan datos
4. Verificar que proyecto_id existe en DB

### Error: Data es array vacío

**Causa:** Filtro de proyecto_id no encuentra datos

**Solución:**
1. Verificar que el proyecto_id es válido
2. Revisar que el proyecto tiene datos asociados
3. Probar sin proyecto_id para ver datos globales

### Error: Conversión NaN o undefined

**Causa:** División por cero o datos nulos

**Solución:**
1. Validar que hay datos antes de calcular %
2. Usar valores por defecto: `valor || 0`
3. Validar divisores: `divisor > 0 ? calc : 0`

---

## Soporte

**Documentación completa:** `docs/modulos/dashboard-ejecutivo-apis.md`

**Plan del proyecto:** `docs/planes/PLAN_DASHBOARD_EJECUTIVO.md`

**Cliente TypeScript:** `lib/executive-api.ts`

---

**Autor:** Claude (Backend Developer Agent)
**Última actualización:** 2025-12-28
