# Analytics Setup - PostHog + Microsoft Clarity

## Resumen

Sistema de analytics modular para el Dashboard EcoPlaza que combina:
- **PostHog**: Product analytics, eventos, funnels, user journeys
- **Microsoft Clarity**: Session replay, heatmaps, rage clicks

**Costo total: $0/mes** (ambos tienen free tier generoso)

---

## Paso 1: Crear cuenta en PostHog

### 1.1 Registro
1. Ir a **https://posthog.com/**
2. Click en **"Get started - free"**
3. Registrarse con email o Google
4. Elegir **"US Cloud"** (más cerca de Perú)

### 1.2 Crear proyecto
1. Nombre del proyecto: `EcoPlaza Dashboard`
2. Seleccionar **"Web app"**
3. Framework: **Next.js**

### 1.3 Obtener API Key
1. Ir a **Settings** → **Project Settings**
2. Copiar el **Project API Key** (empieza con `phc_`)
3. Guardar para el paso 3

---

## Paso 2: Crear cuenta en Microsoft Clarity

### 2.1 Registro
1. Ir a **https://clarity.microsoft.com/**
2. Click en **"Get started - It's free"**
3. Registrarse con cuenta Microsoft/GitHub

### 2.2 Crear proyecto
1. Click en **"+ New project"**
2. Nombre: `EcoPlaza Dashboard`
3. URL del sitio: `https://dashboard.ecoplaza.pe` (o tu URL)
4. Categoría: **Business & Finance**

### 2.3 Obtener Project ID
1. Ir a **Settings** → **Setup**
2. Click en **"Install manually"**
3. Verás un código como: `clarity("set", "xxxxxxxxxxxx")`
4. El Project ID son esos caracteres (ej: `l8k2j9m1n3`)
5. Guardar para el paso 3

---

## Paso 3: Configurar variables de entorno

### 3.1 En desarrollo (.env.local)

Editar `E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard\.env.local`:

```env
# ANALYTICS - ACTIVAR
NEXT_PUBLIC_ANALYTICS_ENABLED=true

# PostHog
NEXT_PUBLIC_POSTHOG_ENABLED=true
NEXT_PUBLIC_POSTHOG_KEY=phc_TU_API_KEY_AQUI
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Microsoft Clarity
NEXT_PUBLIC_CLARITY_ENABLED=true
NEXT_PUBLIC_CLARITY_PROJECT_ID=TU_PROJECT_ID_AQUI

# Debug (opcional, solo desarrollo)
NEXT_PUBLIC_ANALYTICS_DEBUG=true
```

### 3.2 En producción (Vercel)

1. Ir a **Vercel** → **Settings** → **Environment Variables**
2. Agregar las mismas variables (sin DEBUG)

---

## Paso 4: Reiniciar el servidor

```bash
# Detener servidor actual (Ctrl+C)
npm run dev
```

---

## Paso 5: Verificar funcionamiento

### 5.1 En consola del navegador
Si `NEXT_PUBLIC_ANALYTICS_DEBUG=true`, verás:
```
[Analytics] PostHog inicializado correctamente
[Analytics] Clarity inicializado con projectId: xxxxx
[Analytics] Pageview: /operativo
```

### 5.2 En PostHog
1. Ir a **PostHog** → **Activity**
2. Deberías ver eventos `$pageview` llegando en tiempo real

### 5.3 En Clarity
1. Ir a **Clarity** → **Dashboard**
2. Esperar 1-2 minutos
3. Verás el contador de sesiones activas

---

## Uso del Hook useAnalytics

### Importar
```typescript
import { useAnalytics } from '@/lib/analytics';
```

### Eventos disponibles
```typescript
const {
  // Identificación
  trackLogin,         // Al hacer login
  trackLogout,        // Al hacer logout

  // Negocio
  trackLeadAssigned,      // Lead asignado a vendedor
  trackLeadStatusChange,  // Cambio de estado de lead
  trackLocalStatusChange, // Cambio de estado de local
  trackContratoGenerated, // Contrato generado
  trackPagoRegistered,    // Pago registrado

  // UI
  trackSearch,        // Búsqueda realizada
  trackFilterApplied, // Filtro aplicado
  trackExport,        // Export a Excel/PDF
  trackError,         // Error capturado

  // Genérico
  track,              // Evento custom
} = useAnalytics();
```

### Ejemplos de uso
```typescript
// En login
trackLogin({
  id: user.id,
  email: user.email,
  nombre: user.nombre,
  rol: user.rol,
});

// Al asignar lead
trackLeadAssigned(leadId, vendedorId, false);

// Evento custom
track('modal_opened', { modal: 'contrato', local: 'A-101' });
```

---

## Desactivar Analytics

Para desactivar completamente, en `.env.local`:
```env
NEXT_PUBLIC_ANALYTICS_ENABLED=false
```

O desactivar individualmente:
```env
NEXT_PUBLIC_POSTHOG_ENABLED=false
NEXT_PUBLIC_CLARITY_ENABLED=false
```

---

## Archivos del módulo

```
lib/analytics/
├── index.ts              # Exports principales
├── config.ts             # Configuración centralizada
├── analytics-provider.tsx # Provider wrapper
├── posthog-provider.tsx  # PostHog específico
├── clarity-script.tsx    # Clarity específico
└── use-analytics.ts      # Hook con eventos tipados
```

---

## Métricas automáticas

### PostHog captura automáticamente:
- Pageviews (todas las páginas)
- Clicks (todos los elementos)
- Form submissions
- Session duration
- Device/browser info
- Geographic location

### Clarity captura automáticamente:
- Session recordings (video)
- Heatmaps
- Scroll depth
- Rage clicks
- Dead clicks
- Quick backs

---

## Dashboards recomendados

### En PostHog
1. **Daily Active Users (DAU)**
2. **Session Duration promedio**
3. **Páginas más visitadas**
4. **Eventos por módulo**
5. **Retention D1, D7, D30**

### En Clarity
1. **Recordings** → Ver sesiones de usuarios
2. **Heatmaps** → Ver zonas calientes
3. **Insights** → Rage clicks, dead clicks

---

## Troubleshooting

### "No veo eventos en PostHog"
- Verificar que `NEXT_PUBLIC_ANALYTICS_ENABLED=true`
- Verificar que el API Key es correcto
- Revisar consola del navegador por errores

### "Clarity no graba sesiones"
- Esperar 2-3 minutos después de la primera visita
- Verificar Project ID correcto
- Revisar Network tab por requests a `clarity.ms`

### "Performance lenta"
- Analytics carga de forma async, no debería afectar
- Si hay problemas, desactivar con `NEXT_PUBLIC_ANALYTICS_ENABLED=false`

---

**Última actualización:** 28 Diciembre 2025
