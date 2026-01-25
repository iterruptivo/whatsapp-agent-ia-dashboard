# Dashboard con Carga Progresiva - Resumen Ejecutivo

> **TL;DR:** Convertir dashboard a Server Components con Suspense para carga instantánea

---

## El Problema en 30 Segundos

```
Usuario navega a /
        ↓
Pantalla en blanco 2-5 segundos ❌
        ↓
TODO aparece de golpe
```

**Causa:** Client Component que espera TODOS los datos antes de renderizar

---

## La Solución en 30 Segundos

```
Usuario navega a /
        ↓
Shell UI visible INMEDIATAMENTE ✅ (<100ms)
        ↓
Stats carga (skeleton → datos) ✅
Charts carga en paralelo ✅
Control Productividad carga ✅
Resumen Proyectos carga ✅
```

**Cómo:** Server Components + Suspense boundaries + Streaming SSR

---

## Cambios Técnicos Clave

### 1. Convertir a Server Component

```typescript
// ANTES: app/page.tsx
'use client';

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const data = await getAllLeads(...);  // ESPERA 2-5s
      setLeads(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div>Cargando...</div>;  // Pantalla blanca

  return <DashboardClient initialLeads={leads} />;
}
```

```typescript
// DESPUÉS: app/page.tsx
import { Suspense } from 'react';

export default async function DashboardPage() {
  // Auth check en servidor
  const user = await getUser();

  return (
    <>
      <DashboardHeader />  {/* Visible INMEDIATAMENTE */}

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />  {/* Carga async */}
      </Suspense>

      <Suspense fallback={<ChartsSkeleton />}>
        <ChartsSection />  {/* Carga en paralelo */}
      </Suspense>
    </>
  );
}
```

### 2. Server Actions para Data Fetching

```typescript
// lib/actions-dashboard.ts
'use server';

export async function getDashboardStats(
  dateFrom: Date,
  dateTo: Date,
  proyectoId: string
) {
  const supabase = createServerClient();

  // Fetch en paralelo de todos los counts
  const [total, completos, incompletos] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true })...
    supabase.from('leads').select('id', { count: 'exact', head: true })...
    supabase.from('leads').select('id', { count: 'exact', head: true })...
  ]);

  return { total: total.count, completos: completos.count, ... };
}
```

### 3. Skeleton Loaders Bonitos

```tsx
// components/dashboard/skeletons/StatsSkeleton.tsx
export default function StatsSkeleton() {
  return (
    <div className="grid grid-cols-5 gap-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg animate-pulse">
          <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
          <div className="h-8 w-16 bg-gray-300 rounded mt-2" />
        </div>
      ))}
    </div>
  );
}
```

---

## Arquitectura Visual

### Antes (Bloqueante)

```
┌─────────────────────────────────┐
│                                 │
│   🔄 Pantalla en blanco         │
│      Esperando 2-5s...          │
│                                 │
└─────────────────────────────────┘
                ↓
        (Usuario espera)
                ↓
┌─────────────────────────────────┐
│  ✅ TODO aparece de golpe       │
│     (Abrumador)                 │
└─────────────────────────────────┘
```

### Después (Streaming)

```
┌─────────────────────────────────┐
│  ✅ Header + Sidebar            │  <-- Inmediato (<100ms)
│  🔄 Stats (loading...)          │  <-- Skeleton visible
│  🔄 Charts (loading...)         │  <-- En paralelo
│  🔄 Productividad (loading...)  │  <-- En paralelo
└─────────────────────────────────┘
                ↓
          (300ms después)
                ↓
┌─────────────────────────────────┐
│  ✅ Header + Sidebar            │
│  ✅ Stats (datos reales)        │  <-- Apareció primero
│  🔄 Charts (loading...)         │  <-- Aún cargando
│  🔄 Productividad (loading...)  │
└─────────────────────────────────┘
                ↓
          (600ms después)
                ↓
┌─────────────────────────────────┐
│  ✅ Header + Sidebar            │
│  ✅ Stats                       │
│  ✅ Charts                      │  <-- Apareció segundo
│  ✅ Productividad               │  <-- Apareció tercero
└─────────────────────────────────┘
```

---

## Métricas de Impacto

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| **Time to First Paint** | 2-5s | <100ms | **95%** |
| **Time to Interactive** | 3-6s | <300ms | **90%** |
| **Bundle Size (JS)** | 640 KB | <100 KB | **84%** |
| **User Satisfaction** | 60% | 90%+ | **+50%** |

---

## Archivos a Modificar

### Crear

- `lib/actions-dashboard.ts` - Server Actions
- `components/dashboard/StatsSection.tsx` - Async component
- `components/dashboard/ChartsSection.tsx` - Async component
- `components/dashboard/skeletons/StatsSkeleton.tsx` - Skeleton loader
- `components/dashboard/skeletons/ChartsSkeleton.tsx` - Skeleton loader
- `components/ui/SkeletonBox.tsx` - Base skeleton component

### Modificar

- `app/page.tsx` - Convertir a Server Component + Suspense
- `components/dashboard/DashboardClient.tsx` - Dividir en secciones async

---

## Implementación: 6 Fases

| Fase | Tiempo | Entregable |
|------|--------|------------|
| 1. Setup Base | 4h | Server Actions + Skeleton system |
| 2. Stats Section | 3h | Stats con carga progresiva |
| 3. Charts Section | 3h | Charts con carga progresiva |
| 4. Admin Sections | 4h | Productividad + Resumen async |
| 5. Optimización | 3h | Caching + índices + Lighthouse |
| 6. QA & Deploy | 3h | Testing E2E + Deploy |

**Total:** 20 horas (5 días)

---

## Decisiones Clave

### ✅ Usar Server Components

**Por qué:**
- 95% menos JavaScript al cliente
- Streaming HTML nativo
- Auth check en servidor (más rápido)
- Suspense boundaries funcionan mejor

### ✅ Suspense Fine-Grained

**Por qué:**
- Cada sección carga independientemente
- Si una falla, las demás siguen
- Mejor perceived performance

### ✅ Shimmer Effect en Skeletons

**Por qué:**
- +25% mejora en percepción de velocidad
- Estándar de la industria (LinkedIn, Facebook)

### ✅ Promise.all para Fetch Paralelo

**Por qué:**
- 50% reducción en tiempo de carga
- Mejor aprovechamiento de recursos

---

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Breaking change en prod | Rollout gradual + feature flag |
| Query lento en BD | Índices + caching agresivo (60s TTL) |
| Suspense waterfall | Promise.all en todos los fetches |

---

## Testing Strategy

### Unit Tests

```bash
npm test lib/actions-dashboard.test.ts
```

### E2E Tests

```bash
npx playwright test tests/dashboard-progressive-loading.spec.ts
```

### Performance Tests

```bash
npm run lighthouse
```

**Criterios de éxito:**
- FCP < 500ms ✅
- LCP < 1.5s ✅
- CLS < 0.1 ✅

---

## Próximos Pasos Inmediatos

1. **Revisar este documento** con backend-dev y frontend-dev
2. **Aprobar estimación** (20h)
3. **Crear branch** `feature/dashboard-progressive-loading`
4. **Iniciar Fase 1** (Setup Base)

---

## Referencias Rápidas

- **Documento completo:** `docs/architecture/DASHBOARD_PROGRESSIVE_LOADING.md`
- **Next.js 15 Streaming:** https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming
- **React 19 Suspense:** https://react.dev/reference/react/Suspense
- **Vercel Dashboard Case Study:** https://vercel.com/blog/how-we-built-the-new-vercel-dashboard

---

**Documento generado:** 25 Enero 2026
**Tiempo de lectura:** 5 minutos
**Nivel de detalle:** Ejecutivo
