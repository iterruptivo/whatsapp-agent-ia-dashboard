# TAREA ACTIVA: Cache Busting Strategy

## Estado: EN PROGRESO
## Prioridad: ALTA
## Creado: 2025-12-23
## Ultima Actualizacion: 2025-12-23

---

## PROBLEMA A RESOLVER

Cuando se publica una nueva version a produccion, los usuarios siguen viendo la version anterior en cache:
- F5 normal NO actualiza (trae cache)
- Solo Ctrl+F5 o limpiar cache manualmente funciona
- Afecta PCs, tablets y moviles

### Causa Raiz Identificada

3 niveles de cache no coordinados:
1. **Browser Cache** - Next.js cachea estaticos 31 dias por defecto
2. **Vercel CDN Cache** - Edge caching agresivo
3. **Posible Service Worker** - Si existe, cachea indefinidamente

---

## CHECKLIST DE IMPLEMENTACION

### NIVEL 1 - CRITICO (Implementar primero)
- [x] Actualizar `next.config.ts` con headers agresivos
- [x] Actualizar `middleware.ts` con validacion de cache
- [x] Crear endpoint `app/api/version/route.ts`
- [x] Test en local (F5 debe mostrar cambios)
- [ ] Deploy a staging y verificar

### NIVEL 2 - ALTA PRIORIDAD (Banner de notificacion)
- [x] Crear `lib/hooks/useVersionCheck.ts`
- [x] Crear `components/shared/NewVersionBanner.tsx`
- [x] Integrar banner en `app/layout.tsx`
- [x] Test en local con Playwright (exitoso)
- [ ] Deploy a production

### NIVEL 3 - MEDIA PRIORIDAD (Service Worker)
- [ ] Verificar si hay Service Worker activo en produccion
- [ ] Si existe, implementar script de limpieza
- [ ] Test de purga de SW

### NIVEL 4 - OPTIMIZACION (Futuro)
- [ ] Implementar BUILD_ID basado en Git hash
- [ ] Configurar `vercel.json` con headers adicionales
- [ ] Documentar en runbook de operaciones

---

## CODIGO A IMPLEMENTAR

### NIVEL 1.1: next.config.ts - Headers de Cache

```typescript
// Agregar a next.config.ts existente
async headers() {
  return [
    // Documentos HTML - NUNCA cachear
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate, max-age=0'
        },
        {
          key: 'Pragma',
          value: 'no-cache'
        },
        {
          key: 'Expires',
          value: '0'
        }
      ]
    },
    // APIs - Sin cache
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, max-age=0'
        }
      ]
    }
  ];
}
```

### NIVEL 1.2: middleware.ts - Agregar headers

```typescript
// Agregar al middleware existente
// Forzar validacion en documentos HTML
if (!pathname.startsWith('/_next/static') && !pathname.includes('.')) {
  response.headers.set('Cache-Control', 'no-cache, no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
}
```

### NIVEL 1.3: app/api/version/route.ts (NUEVO)

```typescript
export const dynamic = 'force-dynamic';

export async function GET() {
  const buildId = process.env.NEXT_BUILD_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'development';

  return Response.json({
    buildId,
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, max-age=0'
    }
  });
}
```

### NIVEL 2.1: lib/hooks/useVersionCheck.ts (NUEVO)

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';

interface VersionInfo {
  buildId: string;
  version: string;
  timestamp: string;
}

export function useVersionCheck(checkInterval: number = 60000) {
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const [initialBuildId, setInitialBuildId] = useState<string | null>(null);

  const checkVersion = useCallback(async () => {
    try {
      const response = await fetch('/api/version', {
        cache: 'no-store',
        headers: { 'pragma': 'no-cache' }
      });

      if (!response.ok) return;

      const data: VersionInfo = await response.json();

      if (!initialBuildId) {
        setInitialBuildId(data.buildId);
        return;
      }

      if (data.buildId !== initialBuildId) {
        console.log('[Version] Nueva version detectada:', data.buildId);
        setNewVersionAvailable(true);
      }
    } catch (error) {
      console.error('[Version] Error checking version:', error);
    }
  }, [initialBuildId]);

  useEffect(() => {
    checkVersion();
    const interval = setInterval(checkVersion, checkInterval);
    return () => clearInterval(interval);
  }, [checkVersion, checkInterval]);

  const reloadToNewVersion = useCallback(() => {
    window.location.reload();
  }, []);

  return { newVersionAvailable, reloadToNewVersion };
}
```

### NIVEL 2.2: components/shared/NewVersionBanner.tsx (NUEVO)

```typescript
'use client';

import { useVersionCheck } from '@/lib/hooks/useVersionCheck';
import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

export function NewVersionBanner() {
  const { newVersionAvailable, reloadToNewVersion } = useVersionCheck(60000);
  const [dismissed, setDismissed] = useState(false);

  if (!newVersionAvailable || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <div>
            <p className="font-semibold">Nueva version disponible</p>
            <p className="text-blue-100 text-sm">Recarga para obtener las ultimas mejoras</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reloadToNewVersion}
            className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Recargar
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-blue-200 hover:text-white p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### NIVEL 2.3: Integracion en app/layout.tsx

```typescript
// Agregar import
import { NewVersionBanner } from '@/components/shared/NewVersionBanner';

// Agregar dentro del body, al inicio
<body>
  <NewVersionBanner />
  {/* resto del contenido */}
</body>
```

---

## NOTAS DE PROGRESO

### Sesion 2025-12-23
- [x] Investigacion completada (agente Explore)
- [x] Plan detallado creado
- [x] Usuario aprobo el plan
- [x] Creado sistema de tracking de tareas
- [x] NIVEL 1 implementado:
  - next.config.ts: Headers de cache + BUILD_ID con Git
  - middleware.ts: /api/version como ruta publica
  - app/api/version/route.ts: Endpoint de version
- [x] NIVEL 2 implementado:
  - lib/hooks/useVersionCheck.ts: Hook de polling cada 60s
  - components/shared/NewVersionBanner.tsx: Banner de notificacion
  - app/layout.tsx: Integrado el banner
- [x] Test local exitoso:
  - /api/version devuelve buildId correcto
  - Headers Cache-Control: no-cache, no-store funcionando
- [x] Test Playwright completado:
  - Login exitoso como gerente@ecoplaza.com
  - Console muestra: `[VersionCheck] Initial buildId stored: development`
  - Endpoint /api/version responde correctamente con JSON
  - Banner NO aparece (correcto, no hay cambio de version)
- [ ] **PENDIENTE**: Deploy a staging/production para test real

---

## RESULTADO ESPERADO

| Escenario | Antes | Despues |
|-----------|-------|---------|
| F5 en nueva version | Muestra version vieja | Muestra version nueva |
| Usuario informado | No sabe de updates | Banner automatico |
| Tiempo de deteccion | Manual/nunca | Max 60 segundos |

---

## ARCHIVOS A CREAR/MODIFICAR

```
MODIFICAR:
- next.config.ts (agregar headers)
- middleware.ts (agregar cache headers)
- app/layout.tsx (agregar NewVersionBanner)

CREAR:
- app/api/version/route.ts
- lib/hooks/useVersionCheck.ts
- components/shared/NewVersionBanner.tsx
```

---

## COMANDOS DE TEST

```bash
# Verificar version en local
curl http://localhost:3000/api/version

# Verificar headers de cache
curl -I http://localhost:3000/

# En consola del navegador
fetch('/api/version').then(r => r.json()).then(console.log)
```

---

## REFERENCIAS

- Next.js Caching: https://nextjs.org/docs/app/guides/caching
- Vercel Cache Headers: https://vercel.com/docs/headers/cache-control-headers
- Service Worker Strategies: https://web.dev/articles/stale-while-revalidate
