# Sistema RBAC - Documentación Técnica

Sistema de permisos granulares basado en RBAC (Role-Based Access Control) para EcoPlaza Dashboard.

## Tabla de Contenidos

- [Overview](#overview)
- [Arquitectura](#arquitectura)
- [Uso en Middleware](#uso-en-middleware)
- [Uso en Server Actions](#uso-en-server-actions)
- [Uso en Frontend](#uso-en-frontend)
- [Configuración](#configuración)
- [Migración](#migración)

---

## Overview

### Problema que Resuelve

El sistema legacy tenía:
- 200+ líneas de código hardcodeado de permisos
- Lógica dispersa en múltiples archivos
- Imposible agregar permisos sin modificar código
- Sin auditoría de cambios

### Solución

Sistema RBAC granular con:
- **Permisos formato:** `modulo:accion` (ej: `leads:read`, `usuarios:write`)
- **Cache inteligente:** 5 minutos TTL, < 10ms validación
- **Feature flag:** Activación gradual sin romper nada
- **Retrocompatible:** Sistema legacy como fallback

---

## Arquitectura

### Archivos Principales

```
lib/permissions/
├── route-permissions.ts       # Mapeo rutas → permisos
├── permissions-cache.ts       # Cache en memoria (5min TTL)
└── README.md                  # Este archivo

middleware.ts                  # Validación de rutas
```

### Flujo de Validación

```
1. Usuario accede a ruta → middleware.ts

2. Middleware verifica:
   - ¿Usuario autenticado? → Si no, redirect /login
   - ¿Usuario activo? → Si no, redirect /login?error=deactivated
   - ¿ENABLE_RBAC=true? → Si sí, continuar flujo RBAC

3. Flujo RBAC:
   - Obtener permiso requerido de route-permissions.ts
   - Verificar en cache si usuario tiene permiso
   - Si tiene: ALLOW (200ms total)
   - Si no tiene: DENY + redirect a ruta por defecto
   - Si no hay cache: Fallback a validación legacy

4. Flujo Legacy (si RBAC=false):
   - Validación hardcoded por rol
   - Mismo comportamiento que antes
```

---

## Uso en Middleware

### Configuración

El middleware ya está actualizado. Solo debes activar el feature flag:

```env
# .env.local
ENABLE_RBAC=true
```

### Agregar Nueva Ruta Protegida

Editar `lib/permissions/route-permissions.ts`:

```typescript
export const ROUTE_PERMISSIONS: Record<string, RoutePermissionRule> = {
  // ... rutas existentes

  // Nueva ruta
  '/nueva-pagina': {
    permission: 'modulo:accion',
    description: 'Descripción legible del permiso',
    redirectOnDeny: '/operativo', // Opcional
  },
};
```

### Logs de Middleware

Con RBAC habilitado, el middleware loggea:

```bash
[MIDDLEWARE] 🔐 RBAC enabled - checking permissions for: /operativo
[MIDDLEWARE] Route requires permission: leads:read
[MIDDLEWARE] ✅ Access GRANTED - User has permission: leads:read

# Si no tiene permiso:
[MIDDLEWARE] ❌ Access DENIED - User does not have permission: usuarios:write
[MIDDLEWARE] User: juan@ecoplaza.com Role: vendedor
[MIDDLEWARE] AUDIT: Unauthorized access attempt to /admin/usuarios by juan@ecoplaza.com
[MIDDLEWARE] Redirecting to: /operativo
```

---

## Uso en Server Actions

### Archivos Backend

El sistema RBAC backend está implementado en:

```
lib/permissions/
├── types.ts          # Interfaces, constantes (MODULOS, ACCIONES, PERMISOS_*)
├── cache.ts          # Cache en memoria (nuevo - compatible con permissions-cache.ts)
├── check.ts          # Funciones de verificación (hasPermission, getUserPermissions)
├── server.ts         # Wrappers HOF (withPermission, requirePermission)
└── index.ts          # Re-exports públicos
```

### Opción 1: Wrappear Server Action (Recomendado para nuevo código)

```typescript
// lib/actions-leads.ts
import { withPermission } from '@/lib/permissions';

export const deleteLeadAction = withPermission(
  'leads',
  'delete',
  async (leadId: string) => {
    const supabase = await createClient();
    return await supabase.from('leads').delete().eq('id', leadId);
  }
);
```

### Opción 2: Validación Directa (Para código existente)

```typescript
// lib/actions-leads.ts
import { requirePermission } from '@/lib/permissions';

export async function deleteLeadAction(leadId: string) {
  // Valida y lanza error si no tiene permiso
  await requirePermission('leads', 'delete');

  const supabase = await createClient();
  return await supabase.from('leads').delete().eq('id', leadId);
}
```

### Opción 3: Verificar sin lanzar error

```typescript
// lib/actions-leads.ts
import { checkPermission } from '@/lib/permissions';

export async function deleteLeadAction(leadId: string) {
  const result = await checkPermission('leads', 'delete');

  if (!result.ok) {
    return { error: result.error };
  }

  // Lógica de delete...
}
```

### Múltiples Permisos

```typescript
// Requiere AL MENOS UNO de los permisos
import { withAnyPermission, PERMISOS_LEADS, PERMISOS_VENTAS } from '@/lib/permissions';

export const viewDataAction = withAnyPermission(
  [PERMISOS_LEADS.READ, PERMISOS_VENTAS.READ],
  async () => {
    // Se ejecuta si tiene leads:read O ventas:read
  }
);

// Requiere TODOS los permisos
import { withAllPermissions } from '@/lib/permissions';

export const complexAction = withAllPermissions(
  [
    { modulo: 'leads', accion: 'write' },
    { modulo: 'ventas', accion: 'approve' }
  ],
  async (data) => {
    // Se ejecuta solo si tiene ambos permisos
  }
);
```

### Helpers

```typescript
import {
  getCurrentUserId,
  isCurrentUserAdmin,
  canCurrentUser
} from '@/lib/permissions';

// Obtener ID del usuario actual
const userId = await getCurrentUserId();

// Verificar si es admin
const isAdmin = await isCurrentUserAdmin();

// Verificar permiso específico
const canDelete = await canCurrentUser('leads', 'delete');
```

---

## Uso en Frontend

**PENDIENTE DE IMPLEMENTAR**

Cuando esté listo, usar hook:

```typescript
// components/LeadsTable.tsx
'use client';

import { usePermission } from '@/hooks/usePermission';

export function LeadsTable() {
  const { hasPermission } = usePermission();

  return (
    <div>
      {hasPermission('leads:delete') && (
        <Button onClick={handleDelete}>Eliminar</Button>
      )}
    </div>
  );
}
```

---

## Configuración

### Variables de Entorno

```env
# .env.local

# Feature flag principal
ENABLE_RBAC=false  # false = sistema legacy, true = sistema RBAC

# TODO: Cuando esté la BD
# ENABLE_PERMISSION_AUDIT=true  # Auditoría a tabla permisos_audit
```

### Cache Configuration

En `lib/permissions/permissions-cache.ts`:

```typescript
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Modificar TTL si necesario:
// - 1 min: Ambientes de testing
// - 5 min: Producción (balance performance/actualización)
// - 10 min: Si BD está muy cargada
```

---

## Migración

### Fase 1: Preparación (COMPLETA ✅)

- [x] Crear `route-permissions.ts`
- [x] Crear `permissions-cache.ts`
- [x] Actualizar middleware con feature flag
- [x] Agregar variable `ENABLE_RBAC=false`

### Fase 2: Testing Interno (ACTUAL)

**Estado:** Sistema instalado, esperando activación

**Pasos:**

1. Activar en ambiente de testing:
   ```env
   ENABLE_RBAC=true
   ```

2. Verificar logs del middleware:
   ```bash
   npm run dev
   # Navegar por el dashboard
   # Verificar logs en consola
   ```

3. Probar cada rol:
   - Admin → Debe tener acceso a todo
   - Jefe Ventas → Acceso a insights, leads, repulse, aprobaciones
   - Vendedor → Solo operativo y comisiones
   - Caseta → Solo locales
   - Finanzas → Solo control-pagos

4. Verificar redirects:
   - Vendedor intentando acceder /admin/usuarios → redirect /operativo
   - Finanzas intentando acceder /operativo → redirect /control-pagos

### Fase 3: Rollout Gradual (PENDIENTE)

**Cuando:** Después de 1 semana de testing interno sin issues

1. Activar en producción para Admin y Jefe Ventas solo
2. Monitorear logs y métricas
3. Activar para todos los roles gradualmente
4. Monitorear performance (cache hit rate, tiempos)

### Fase 4: Migración de Server Actions (PENDIENTE)

**Cuando:** Después de 2 semanas de middleware estable

1. Crear `lib/permissions/check-permission.ts`
2. Actualizar `lib/actions-leads.ts`
3. Actualizar resto de server actions
4. Eliminar validaciones hardcoded

### Fase 5: Migración de Frontend (PENDIENTE)

**Cuando:** Después de server actions migrados

1. Crear `hooks/usePermission.ts`
2. Actualizar componentes principales
3. Eliminar validaciones hardcoded de UI

### Fase 6: Cleanup (PENDIENTE)

**Cuando:** 100% migrado y estable por 4+ semanas

1. Eliminar código legacy del middleware
2. Eliminar `getLegacyPermissionsForRole()`
3. Remover feature flag (dejar siempre true)
4. Actualizar documentación

---

## Troubleshooting

### Usuario no puede acceder a ruta permitida

**Causa:** Cache expirado o permiso no mapeado

**Solución:**
1. Verificar logs del middleware
2. Verificar que ruta esté en `ROUTE_PERMISSIONS`
3. Verificar que rol tenga permiso en `getLegacyPermissionsForRole()`

### Performance degradado

**Causa:** Cache hit rate bajo

**Solución:**
1. Revisar `getCacheStats()` en middleware
2. Aumentar TTL si hit rate < 90%
3. Verificar si hay memory leaks

### Redirect loop infinito

**Causa:** Ruta de redirect también está protegida

**Solución:**
1. Verificar `redirectOnDeny` en route-permissions
2. Asegurar que `getDefaultRouteForRole()` retorna ruta accesible

---

## Referencias

- **Plan Maestro:** `docs/PLAN_MAESTRO_RBAC.md`
- **Catálogo de 62 Permisos:** `docs/PLAN_MAESTRO_RBAC.md` - Sección 4.4
- **Matriz Rol-Permisos:** `docs/PLAN_MAESTRO_RBAC.md` - Sección 5.1

---

## Catálogo de Permisos Backend

### Módulos y Constantes

Todos los módulos y acciones están definidos como constantes TypeScript en `lib/permissions/types.ts`:

```typescript
import { MODULOS, ACCIONES, PERMISOS_LEADS } from '@/lib/permissions';

// Módulos del sistema
MODULOS.LEADS              // 'leads'
MODULOS.LOCALES            // 'locales'
MODULOS.VENTAS             // 'ventas'
MODULOS.CONTROL_PAGOS      // 'control_pagos'
MODULOS.COMISIONES         // 'comisiones'
MODULOS.REPULSE            // 'repulse'
MODULOS.APROBACIONES       // 'aprobaciones'
MODULOS.USUARIOS           // 'usuarios'
MODULOS.PROYECTOS          // 'proyectos'
MODULOS.INSIGHTS           // 'insights'
MODULOS.REUNIONES          // 'reuniones'
MODULOS.CONFIGURACION      // 'configuracion'

// Acciones genéricas
ACCIONES.READ              // 'read'
ACCIONES.READ_ALL          // 'read_all'
ACCIONES.WRITE             // 'write'
ACCIONES.DELETE            // 'delete'
ACCIONES.EXPORT            // 'export'
ACCIONES.IMPORT            // 'import'
ACCIONES.APPROVE           // 'approve'
ACCIONES.CONFIG            // 'config'
// ... y más

// Permisos pre-definidos por módulo
PERMISOS_LEADS.READ              // { modulo: 'leads', accion: 'read' }
PERMISOS_LEADS.DELETE            // { modulo: 'leads', accion: 'delete' }
PERMISOS_VENTAS.APPROVE          // { modulo: 'ventas', accion: 'approve' }
PERMISOS_CONTROL_PAGOS.VERIFY    // { modulo: 'control_pagos', accion: 'verify' }
```

### Lista Completa de Permisos (62 totales)

Ver catálogo completo en:
- **types.ts** - Constantes `PERMISOS_*` por módulo
- **PLAN_MAESTRO_RBAC.md** - Sección 4.4 (tabla con 62 permisos)

### Compatibilidad con Sistema Legacy

El sistema backend incluye `checkPermissionLegacy()` que se activa cuando `ENABLE_RBAC=false`:

```typescript
// Cuando RBAC está deshabilitado, el sistema usa validación hardcoded
// por rol (admin, jefe_ventas, vendedor, etc.) para compatibilidad
// con el sistema actual sin romper nada.
```

---

**Última Actualización:** 11 Enero 2026
**Estado:** Fase 1 Completa - Backend RBAC Implementado - Listo para Testing
