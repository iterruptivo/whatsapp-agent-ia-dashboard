# Guía de Implementación - Eventos de Negocio en PostHog

**Objetivo:** Implementar tracking de eventos de negocio para métricas ejecutivas
**Esfuerzo Estimado:** 2-3 días
**Prioridad:** CRÍTICA

---

## RESUMEN

Actualmente tenemos 12 eventos de negocio **definidos** en `lib/analytics/use-analytics.ts` pero **NO implementados** en el código. Esta guía muestra exactamente dónde y cómo agregarlos.

---

## 1. EVENTOS DE LEADS

### 1.1 Lead Asignado

**Archivo:** `lib/actions-leads.ts`
**Función:** `asignarLead()`

```typescript
'use server';

import { trackEvent } from '@/lib/analytics/use-analytics';

export async function asignarLead(leadId: string, vendedorId: string) {
  const supabase = createClient(cookies());

  // ... lógica de asignación ...

  const { data, error } = await supabase
    .from('leads')
    .update({
      vendedor_id: vendedorId,
      fecha_asignacion: new Date().toISOString()
    })
    .eq('id', leadId)
    .select()
    .single();

  if (!error && data) {
    // ✅ AGREGAR EVENTO
    trackEvent('lead_assigned', {
      lead_id: leadId,
      vendedor_id: vendedorId,
      auto_asignado: false,
      proyecto_id: data.proyecto_id,
      timestamp: new Date().toISOString()
    });
  }

  return { data, error };
}
```

### 1.2 Lead Cambio de Estado

**Archivo:** `lib/actions-leads.ts`
**Función:** `actualizarEstadoLead()`

```typescript
export async function actualizarEstadoLead(
  leadId: string,
  nuevoEstado: string,
  estadoAnterior: string
) {
  const supabase = createClient(cookies());

  // ... lógica de actualización ...

  const { data, error } = await supabase
    .from('leads')
    .update({ estado: nuevoEstado })
    .eq('id', leadId)
    .select()
    .single();

  if (!error && data) {
    // ✅ AGREGAR EVENTO
    trackEvent('lead_status_changed', {
      lead_id: leadId,
      estado_anterior: estadoAnterior,
      estado_nuevo: nuevoEstado,
      proyecto_id: data.proyecto_id,
      vendedor_id: data.vendedor_id,
      timestamp: new Date().toISOString()
    });
  }

  return { data, error };
}
```

### 1.3 Lead Creado (NUEVO)

**Archivo:** `lib/actions-leads.ts` o donde se creen leads
**Función:** `crearLead()` o webhook handler

```typescript
export async function crearLead(leadData: InsertLead) {
  const supabase = createClient(cookies());

  const { data, error } = await supabase
    .from('leads')
    .insert(leadData)
    .select()
    .single();

  if (!error && data) {
    // ✅ AGREGAR EVENTO
    trackEvent('lead_created', {
      lead_id: data.id,
      fuente: leadData.fuente || 'whatsapp',
      proyecto_id: data.proyecto_id,
      timestamp: new Date().toISOString()
    });
  }

  return { data, error };
}
```

### 1.4 Lead Convertido (NUEVO)

**Archivo:** `lib/actions-locales.ts` cuando se reserva un local
**Función:** `reservarLocal()`

```typescript
export async function reservarLocal(localId: string, leadId: string) {
  const supabase = createClient(cookies());

  // ... lógica de reserva ...

  const { data, error } = await supabase
    .from('locales')
    .update({
      estado: 'reservado',
      lead_id: leadId
    })
    .eq('id', localId)
    .select('*, leads(*)')
    .single();

  if (!error && data) {
    // ✅ AGREGAR EVENTO - CONVERSIÓN
    trackEvent('lead_converted', {
      lead_id: leadId,
      local_id: localId,
      local_codigo: data.codigo,
      proyecto_id: data.proyecto_id,
      vendedor_id: data.leads.vendedor_id,
      timestamp: new Date().toISOString()
    });
  }

  return { data, error };
}
```

---

## 2. EVENTOS DE LOCALES

### 2.1 Local Cambio de Estado

**Archivo:** `lib/actions-locales.ts`
**Función:** `actualizarEstadoLocal()`

```typescript
export async function actualizarEstadoLocal(
  localCodigo: string,
  nuevoEstado: string,
  estadoAnterior: string
) {
  const supabase = createClient(cookies());

  const { data, error } = await supabase
    .from('locales')
    .update({ estado: nuevoEstado })
    .eq('codigo', localCodigo)
    .select()
    .single();

  if (!error && data) {
    // ✅ AGREGAR EVENTO
    trackEvent('local_status_changed', {
      local_codigo: localCodigo,
      estado_anterior: estadoAnterior,
      estado_nuevo: nuevoEstado,
      proyecto_id: data.proyecto_id,
      timestamp: new Date().toISOString()
    });
  }

  return { data, error };
}
```

---

## 3. EVENTOS DE CONTRATOS

### 3.1 Contrato Generado

**Archivo:** `lib/actions-contratos.ts` o donde se generen contratos
**Función:** `generarContrato()`

```typescript
export async function generarContrato(
  tipo: 'reserva' | 'compraventa',
  localCodigo: string
) {
  const supabase = createClient(cookies());

  // ... lógica de generación de contrato ...

  const { data, error } = await supabase
    .from('contratos')
    .insert({
      tipo,
      local_codigo: localCodigo,
      fecha_generacion: new Date().toISOString()
    })
    .select('*, locales(*)')
    .single();

  if (!error && data) {
    // ✅ AGREGAR EVENTO
    trackEvent('contrato_generated', {
      tipo,
      local_codigo: localCodigo,
      contrato_id: data.id,
      proyecto_id: data.locales.proyecto_id,
      timestamp: new Date().toISOString()
    });
  }

  return { data, error };
}
```

---

## 4. EVENTOS DE PAGOS

### 4.1 Pago Registrado

**Archivo:** `lib/actions-pagos.ts` o donde se registren pagos
**Función:** `registrarPago()`

```typescript
export async function registrarPago(pagoData: InsertPago) {
  const supabase = createClient(cookies());

  const { data, error } = await supabase
    .from('pagos')
    .insert(pagoData)
    .select('*, locales(*)')
    .single();

  if (!error && data) {
    // ✅ AGREGAR EVENTO
    trackEvent('pago_registered', {
      monto: data.monto,
      tipo_pago: data.tipo_pago,
      local_codigo: data.local_codigo,
      proyecto_id: data.locales.proyecto_id,
      pago_id: data.id,
      timestamp: new Date().toISOString()
    });
  }

  return { data, error };
}
```

---

## 5. EVENTOS DE BÚSQUEDA Y FILTROS

### 5.1 Búsqueda Realizada

**Archivo:** Componentes con búsqueda (ej: `components/dashboard/OperativoClient.tsx`)

```typescript
'use client';

import { useAnalytics } from '@/lib/analytics/use-analytics';
import { useState, useEffect } from 'react';

export function OperativoClient() {
  const { trackSearch } = useAnalytics();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLeads, setFilteredLeads] = useState([]);

  const handleSearch = (query: string) => {
    setSearchTerm(query);

    // ... lógica de búsqueda ...
    const results = leads.filter(lead =>
      lead.nombre.toLowerCase().includes(query.toLowerCase())
    );

    setFilteredLeads(results);

    // ✅ AGREGAR EVENTO (solo si hay query)
    if (query.trim().length > 0) {
      trackSearch(query, results.length, 'leads');
    }
  };

  // ...
}
```

### 5.2 Filtro Aplicado

**Archivo:** Componentes con filtros

```typescript
'use client';

import { useAnalytics } from '@/lib/analytics/use-analytics';

export function LeadFilters() {
  const { trackFilterApplied } = useAnalytics();

  const handleApplyFilters = (filters: FilterState) => {
    // ... lógica de filtrado ...

    // ✅ AGREGAR EVENTO
    trackFilterApplied({
      estado: filters.estado,
      vendedor_id: filters.vendedorId,
      fecha_desde: filters.fechaDesde,
      fecha_hasta: filters.fechaHasta,
    }, 'leads');
  };

  // ...
}
```

### 5.3 Exportación de Datos

**Archivo:** Componentes con botón de exportar

```typescript
'use client';

import { useAnalytics } from '@/lib/analytics/use-analytics';

export function ExportButton() {
  const { trackExport } = useAnalytics();

  const handleExportExcel = async () => {
    // ... lógica de exportación ...

    const totalRegistros = leads.length;

    // ✅ AGREGAR EVENTO
    trackExport('excel', 'leads', totalRegistros);

    // ... generar y descargar archivo ...
  };

  const handleExportPDF = async () => {
    const totalRegistros = contratos.length;

    // ✅ AGREGAR EVENTO
    trackExport('pdf', 'contratos', totalRegistros);

    // ... generar y descargar PDF ...
  };

  // ...
}
```

---

## 6. EVENTOS DE ERRORES

### 6.1 Errores de Aplicación

**Archivo:** Funciones que pueden fallar (Server Actions, API calls)

```typescript
'use server';

import { trackEvent } from '@/lib/analytics/use-analytics';

export async function asignarLead(leadId: string, vendedorId: string) {
  const supabase = createClient(cookies());

  try {
    const { data, error } = await supabase
      .from('leads')
      .update({ vendedor_id: vendedorId })
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      // ✅ AGREGAR EVENTO DE ERROR
      trackEvent('error_occurred', {
        error: error.message,
        context: {
          action: 'asignar_lead',
          lead_id: leadId,
          vendedor_id: vendedorId,
        },
        timestamp: new Date().toISOString()
      });

      throw error;
    }

    return { data, error: null };

  } catch (error) {
    // ✅ AGREGAR EVENTO DE ERROR INESPERADO
    trackEvent('error_occurred', {
      error: error instanceof Error ? error.message : 'Unknown error',
      context: {
        action: 'asignar_lead',
        lead_id: leadId,
        vendedor_id: vendedorId,
        stack: error instanceof Error ? error.stack : undefined,
      },
      timestamp: new Date().toISOString()
    });

    return { data: null, error };
  }
}
```

---

## 7. EVENTOS DE AUTENTICACIÓN

### 7.1 Login/Logout

**Ya implementados** en `lib/analytics/analytics-identify.tsx` via auto-identify.

Si queremos eventos adicionales:

```typescript
// En algún componente de login
const { trackLogin, trackLogout } = useAnalytics();

const handleLogin = async (credentials) => {
  const user = await login(credentials);

  // ✅ Evento de login (opcional, ya se hace auto-identify)
  trackLogin({
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    proyecto_id: user.proyecto_id
  });
};

const handleLogout = async () => {
  // ✅ Evento de logout
  trackLogout();
  await logout();
};
```

---

## 8. CHECKLIST DE IMPLEMENTACIÓN

### Server Actions

- [ ] `lib/actions-leads.ts`
  - [ ] `asignarLead()` → `lead_assigned`
  - [ ] `actualizarEstadoLead()` → `lead_status_changed`
  - [ ] `crearLead()` → `lead_created` (nuevo)

- [ ] `lib/actions-locales.ts`
  - [ ] `actualizarEstadoLocal()` → `local_status_changed`
  - [ ] `reservarLocal()` → `lead_converted` (nuevo)

- [ ] `lib/actions-contratos.ts`
  - [ ] `generarContrato()` → `contrato_generated`

- [ ] `lib/actions-pagos.ts`
  - [ ] `registrarPago()` → `pago_registered`

### Componentes Client

- [ ] `components/dashboard/OperativoClient.tsx`
  - [ ] Búsqueda → `trackSearch()`
  - [ ] Filtros → `trackFilterApplied()`
  - [ ] Exportar → `trackExport()`

- [ ] Otros componentes con búsqueda/filtros
  - [ ] Locales
  - [ ] Contratos
  - [ ] Pagos

### Manejo de Errores

- [ ] Agregar `trackError()` en todos los Server Actions
- [ ] Agregar `trackError()` en llamadas a APIs externas
- [ ] Agregar `trackError()` en validaciones críticas

---

## 9. VERIFICACIÓN

Después de implementar, verificar que los eventos se están enviando:

### Método 1: Console del Browser

1. Abrir DevTools → Console
2. Buscar logs: `[Analytics]` (si `analyticsConfig.debug = true`)
3. Ejecutar acciones y verificar eventos

### Método 2: PostHog UI

1. Ir a https://us.posthog.com/project/274206
2. Events → Live Events
3. Ejecutar acciones en el dashboard
4. Ver eventos aparecer en tiempo real

### Método 3: HogQL Query

```sql
SELECT
  event,
  count(*) as total
FROM events
WHERE timestamp >= now() - INTERVAL 1 HOUR
  AND event NOT LIKE '$%'
GROUP BY event
ORDER BY total DESC
```

Ejecutar con: `node scripts/test-posthog-query.js` (modificar query)

---

## 10. PROPIEDADES RECOMENDADAS

Para todos los eventos de negocio, incluir:

```typescript
{
  // Identificación
  proyecto_id: string,        // SIEMPRE
  user_id?: string,           // Usuario actual (si disponible)

  // Entidad
  lead_id?: string,
  local_id?: string,
  local_codigo?: string,
  contrato_id?: string,
  pago_id?: string,

  // Contexto
  timestamp: string,          // ISO 8601
  source?: string,            // 'dashboard' | 'api' | 'webhook'

  // Métricas
  monto?: number,
  duracion?: number,          // En segundos

  // Estados
  estado_anterior?: string,
  estado_nuevo?: string,
}
```

---

## 11. EJEMPLO COMPLETO

**Archivo:** `lib/actions-leads.ts`

```typescript
'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { trackEvent } from '@/lib/analytics/use-analytics';

export async function asignarLead(leadId: string, vendedorId: string) {
  const supabase = createClient(cookies());

  try {
    // 1. Obtener estado actual
    const { data: leadActual } = await supabase
      .from('leads')
      .select('estado, proyecto_id')
      .eq('id', leadId)
      .single();

    // 2. Actualizar lead
    const { data, error } = await supabase
      .from('leads')
      .update({
        vendedor_id: vendedorId,
        fecha_asignacion: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      // Track error
      trackEvent('error_occurred', {
        error: error.message,
        context: {
          action: 'asignar_lead',
          lead_id: leadId,
          vendedor_id: vendedorId,
        },
        timestamp: new Date().toISOString()
      });

      throw error;
    }

    // 3. Track evento exitoso
    trackEvent('lead_assigned', {
      lead_id: leadId,
      vendedor_id: vendedorId,
      auto_asignado: false,
      proyecto_id: data.proyecto_id,
      estado_actual: leadActual?.estado,
      timestamp: new Date().toISOString()
    });

    return { data, error: null };

  } catch (error) {
    // Track error inesperado
    trackEvent('error_occurred', {
      error: error instanceof Error ? error.message : 'Unknown error',
      context: {
        action: 'asignar_lead',
        lead_id: leadId,
        vendedor_id: vendedorId,
      },
      timestamp: new Date().toISOString()
    });

    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}
```

---

## 12. PRÓXIMOS PASOS

1. **Día 1:** Implementar eventos en Server Actions (leads, locales)
2. **Día 2:** Implementar eventos en componentes (búsqueda, filtros, exports)
3. **Día 3:** Testing y verificación
4. **Día 4:** Crear dashboards en PostHog
5. **Día 5:** Configurar alertas

---

**Autor:** Backend Developer Agent
**Última Actualización:** 2025-12-29
**Versión:** 1.0
