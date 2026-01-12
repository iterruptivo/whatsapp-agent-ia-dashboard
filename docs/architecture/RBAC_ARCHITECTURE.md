# Arquitectura: Sistema de Permisos Granulares (RBAC)

**Fecha:** 11 Enero 2026
**Version:** 1.0
**Arquitecto:** Claude (Architect Agent)
**Proyecto:** EcoPlaza Dashboard

---

## Resumen Ejecutivo

Diseño de un sistema de permisos granulares basado en roles (RBAC - Role-Based Access Control) para reemplazar las validaciones hardcodeadas actuales por un sistema flexible, mantenible y escalable.

**Problemas actuales:**
- Roles hardcodeados en middleware (strings repetidos 200+ veces)
- Lógica de permisos duplicada en componentes y server actions
- Difícil agregar nuevos permisos sin modificar múltiples archivos
- No hay separación clara entre roles y permisos

**Solución propuesta:**
- Sistema de permisos basado en módulos y acciones
- Tablas en PostgreSQL para configuración dinámica
- Cache en memoria para performance
- Hooks y funciones helper para validación consistente
- Migración gradual con feature flag

---

## Diagrama de Flujo

```mermaid
graph TB
    A[Usuario inicia sesión] --> B[Middleware valida sesión]
    B --> C{Usuario activo?}
    C -->|No| D[Redirect a login]
    C -->|Sí| E[Cargar permisos desde cache/DB]
    E --> F[Guardar en contexto + cache]
    F --> G[Usuario navega a ruta]
    G --> H{Middleware: hasRouteAccess?}
    H -->|No| I[Redirect según rol]
    H -->|Sí| J[Renderizar página]
    J --> K[Componente usa usePermissions]
    K --> L{can('modulo', 'accion')?}
    L -->|Sí| M[Mostrar botón/feature]
    L -->|No| N[Ocultar feature]

    O[Server Action] --> P[hasPermission en backend]
    P -->|Sí| Q[Ejecutar acción]
    P -->|No| R[Return error 403]

    style E fill:#e1f5ff
    style K fill:#e1f5ff
    style P fill:#ffe1e1
```

---

## Estructura de Permisos

### Módulos del Sistema

| Módulo | Descripción | Acciones típicas |
|--------|-------------|------------------|
| `leads` | Gestión de leads | ver, crear, editar, eliminar, asignar, exportar, importar |
| `locales` | Gestión de locales | ver, crear, editar, eliminar, cambiar_estado, asignar_vendedor |
| `ventas` | Registro de ventas | ver, crear, editar, eliminar, aprobar, cambiar_precio |
| `control_pagos` | Control de pagos | ver, crear, editar, verificar, generar_constancia, ver_todos_proyectos |
| `comisiones` | Comisiones de vendedores | ver, calcular, pagar, ver_propias, ver_todas |
| `repulse` | Re-engagement de leads | ver, crear, eliminar, ejecutar_campana |
| `reporteria` | Reportes y analytics | ver, exportar, ver_todos_proyectos |
| `usuarios` | Administración de usuarios | ver, crear, editar, eliminar, resetear_password |
| `proyectos` | Configuración de proyectos | ver, crear, editar, eliminar |
| `validacion_bancaria` | Validación bancaria | ver, importar, matching, exportar |
| `aprobaciones` | Aprobaciones de descuentos | ver, aprobar, rechazar, configurar_rangos |
| `expediente` | Expediente digital | ver, editar, generar_pdf |
| `contratos` | Contratos de venta | ver, generar, usar_template_custom |
| `reuniones` | Módulo de reuniones | ver, crear, editar, eliminar, transcribir |
| `admin` | Panel de administración | ver_dashboard, ver_insights, configurar_kanban |

### Acciones Genéricas

| Acción | Descripción | Aplicable a |
|--------|-------------|-------------|
| `ver` | Ver registros (limitado por RLS) | Todos los módulos |
| `crear` | Crear nuevos registros | Todos excepto admin |
| `editar` | Modificar registros existentes | Todos excepto admin |
| `eliminar` | Borrar registros | Todos excepto admin |
| `exportar` | Exportar datos a Excel/PDF | leads, locales, reporteria, comisiones |
| `importar` | Importar datos desde Excel | leads, usuarios, validacion_bancaria |
| `ver_todos_proyectos` | Ver datos cross-proyecto | control_pagos, reporteria |
| `aprobar` | Aprobar acciones sensibles | ventas, aprobaciones |

### Permisos Especiales

| Permiso | Módulo | Descripción | Roles con acceso |
|---------|--------|-------------|------------------|
| `editar_precio_venta` | ventas | Modificar precio después de venta | admin, jefe_ventas |
| `aprobar_descuento` | aprobaciones | Aprobar descuentos | admin, jefe_ventas |
| `verificar_pago` | control_pagos | Verificar abonos | finanzas, admin |
| `ver_todos_vendedores` | reporteria | Ver datos de todos los vendedores | admin, jefe_ventas, marketing |
| `configurar_sistema` | proyectos | Configurar TEA, cuotas, etc. | admin |
| `usar_template_custom` | contratos | Subir templates personalizados | admin |
| `ejecutar_campana_masiva` | repulse | Ejecutar campañas repulse | admin, jefe_ventas |
| `resetear_password` | usuarios | Resetear passwords de usuarios | admin |
| `ver_comisiones_todas` | comisiones | Ver comisiones de todos | admin, jefe_ventas |
| `ver_comisiones_propias` | comisiones | Ver solo mis comisiones | vendedor, vendedor_caseta |

---

## Jerarquía de Roles

### Roles y Permisos por Defecto

```typescript
// Jerarquía visual (mayor a menor privilegio)
superadmin (futuro)
    ↓
admin
    ↓
gerencia (legacy, mapea a jefe_ventas)
    ↓
jefe_ventas
    ↓
marketing
    ↓
vendedor
    ↓
vendedor_caseta
    ↓
coordinador
    ↓
finanzas (acceso especializado)
```

### Matriz de Permisos por Rol

| Módulo/Acción | admin | jefe_ventas | vendedor | vendedor_caseta | coordinador | finanzas | marketing |
|---------------|-------|-------------|----------|-----------------|-------------|----------|-----------|
| **LEADS** | | | | | | | |
| ver | ✅ | ✅ | ✅ (propios) | ✅ | ✅ | ❌ | ✅ |
| crear | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| editar | ✅ | ✅ | ✅ (propios) | ✅ | ✅ | ❌ | ❌ |
| asignar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| exportar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **LOCALES** | | | | | | | |
| ver | ✅ | ✅ | ✅ (asignados) | ✅ | ✅ | ❌ | ❌ |
| crear | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| editar | ✅ | ✅ | ✅ (limitado) | ✅ | ✅ | ❌ | ❌ |
| cambiar_estado | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| asignar_vendedor | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **VENTAS** | | | | | | | |
| ver | ✅ | ✅ | ✅ (propias) | ✅ | ✅ | ❌ | ❌ |
| crear | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| editar | ✅ | ✅ | ✅ (limitado) | ❌ | ❌ | ❌ | ❌ |
| cambiar_precio | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CONTROL_PAGOS** | | | | | | | |
| ver | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| crear | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| verificar | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| generar_constancia | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| ver_todos_proyectos | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **COMISIONES** | | | | | | | |
| ver_todas | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| ver_propias | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| calcular | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| exportar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **REPULSE** | | | | | | | |
| ver | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| ejecutar_campana | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **REPORTERIA** | | | | | | | |
| ver | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| exportar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| ver_todos_proyectos | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **USUARIOS** | | | | | | | |
| ver | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| crear | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| editar | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| resetear_password | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **PROYECTOS** | | | | | | | |
| ver | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| configurar | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **APROBACIONES** | | | | | | | |
| ver | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| aprobar | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| configurar_rangos | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **VALIDACION_BANCARIA** | | | | | | | |
| ver | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| importar | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| matching | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **ADMIN** | | | | | | | |
| ver_dashboard | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| configurar_kanban | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Permisos Especiales por Rol

```typescript
const ROLE_SPECIAL_PERMISSIONS = {
  admin: [
    'ver_todos_proyectos',
    'editar_precio_venta',
    'aprobar_descuento',
    'verificar_pago',
    'configurar_sistema',
    'usar_template_custom',
    'ejecutar_campana_masiva',
    'resetear_password',
    'ver_comisiones_todas',
    'ver_todos_vendedores',
  ],
  jefe_ventas: [
    'editar_precio_venta',
    'aprobar_descuento',
    'ejecutar_campana_masiva',
    'ver_comisiones_todas',
    'ver_todos_vendedores',
  ],
  marketing: [
    'ver_todos_vendedores',
  ],
  finanzas: [
    'verificar_pago',
  ],
  vendedor: [
    'ver_comisiones_propias',
  ],
  vendedor_caseta: [
    'ver_comisiones_propias',
  ],
  coordinador: [
    'ver_comisiones_propias',
  ],
};
```

---

## Arquitectura Técnica

### 1. Base de Datos

#### Tabla: `permissions`

Define todos los permisos disponibles en el sistema.

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo TEXT NOT NULL,           -- 'leads', 'locales', 'ventas', etc.
  accion TEXT NOT NULL,            -- 'ver', 'crear', 'editar', etc.
  nombre TEXT NOT NULL,            -- Nombre legible: "Ver leads"
  descripcion TEXT,                -- "Permite visualizar leads del proyecto"
  es_especial BOOLEAN DEFAULT false, -- Flag para permisos especiales
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(modulo, accion)
);

-- Índices para performance
CREATE INDEX idx_permissions_modulo ON permissions(modulo);
CREATE INDEX idx_permissions_especial ON permissions(es_especial) WHERE es_especial = true;
```

#### Tabla: `role_permissions`

Mapea roles a permisos (tabla de unión).

```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol TEXT NOT NULL,               -- 'admin', 'jefe_ventas', etc.
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(rol, permission_id)
);

-- Índices para queries rápidas
CREATE INDEX idx_role_permissions_rol ON role_permissions(rol);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
```

#### Tabla: `user_permissions` (Opcional - Permisos Override)

Permite dar permisos específicos a usuarios individuales (override de rol).

```sql
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,    -- true = dar permiso, false = revocar
  reason TEXT,                     -- Por qué se dio/revocó
  granted_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(usuario_id, permission_id)
);

-- Índices
CREATE INDEX idx_user_permissions_usuario ON user_permissions(usuario_id);
CREATE INDEX idx_user_permissions_granted ON user_permissions(granted);
```

#### View: `user_effective_permissions`

Vista consolidada de permisos efectivos de cada usuario.

```sql
CREATE OR REPLACE VIEW user_effective_permissions AS
SELECT DISTINCT
  u.id AS usuario_id,
  u.rol,
  p.modulo,
  p.accion,
  p.nombre,
  p.es_especial,
  CASE
    WHEN up.granted IS NOT NULL THEN up.granted  -- Override de usuario
    ELSE true                                     -- Permiso de rol
  END AS tiene_permiso
FROM usuarios u
LEFT JOIN role_permissions rp ON rp.rol = u.rol
LEFT JOIN permissions p ON p.id = rp.permission_id
LEFT JOIN user_permissions up ON up.usuario_id = u.id AND up.permission_id = p.id
WHERE u.activo = true;
```

### 2. Backend (Server)

#### Archivo: `lib/permissions/permissions-db.ts`

Queries de base de datos para permisos.

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';

export interface Permission {
  id: string;
  modulo: string;
  accion: string;
  nombre: string;
  descripcion?: string;
  es_especial: boolean;
}

export interface UserPermissions {
  usuario_id: string;
  rol: string;
  permissions: Permission[];
}

/**
 * Obtiene TODOS los permisos de un usuario (rol + overrides)
 */
export async function getUserPermissions(usuarioId: string): Promise<UserPermissions | null> {
  const supabase = await createClient();

  // Query a la view que consolida permisos
  const { data, error } = await supabase
    .from('user_effective_permissions')
    .select('*')
    .eq('usuario_id', usuarioId)
    .eq('tiene_permiso', true);

  if (error || !data || data.length === 0) {
    console.error('[PERMISSIONS] Error fetching user permissions:', error);
    return null;
  }

  const permissions: Permission[] = data.map(row => ({
    id: row.permission_id,
    modulo: row.modulo,
    accion: row.accion,
    nombre: row.nombre,
    descripcion: row.descripcion,
    es_especial: row.es_especial,
  }));

  return {
    usuario_id: usuarioId,
    rol: data[0].rol,
    permissions,
  };
}

/**
 * Verifica si un usuario tiene un permiso específico
 */
export async function hasPermission(
  usuarioId: string,
  modulo: string,
  accion: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_effective_permissions')
    .select('tiene_permiso')
    .eq('usuario_id', usuarioId)
    .eq('modulo', modulo)
    .eq('accion', accion)
    .eq('tiene_permiso', true)
    .maybeSingle();

  if (error) {
    console.error('[PERMISSIONS] Error checking permission:', error);
    return false;
  }

  return data?.tiene_permiso === true;
}

/**
 * Verifica múltiples permisos de una vez (OR logic)
 */
export async function hasAnyPermission(
  usuarioId: string,
  checks: Array<{ modulo: string; accion: string }>
): Promise<boolean> {
  for (const check of checks) {
    const has = await hasPermission(usuarioId, check.modulo, check.accion);
    if (has) return true;
  }
  return false;
}
```

#### Archivo: `lib/permissions/permissions-cache.ts`

Cache en memoria para permisos (TTL 5 minutos).

```typescript
import { getUserPermissions, UserPermissions } from './permissions-db';

interface CacheEntry {
  data: UserPermissions;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const cache = new Map<string, CacheEntry>();

/**
 * Obtiene permisos con cache
 */
export async function getCachedUserPermissions(
  usuarioId: string
): Promise<UserPermissions | null> {
  // Intentar cache primero
  const cached = cache.get(usuarioId);
  if (cached) {
    const age = Date.now() - cached.timestamp;
    if (age < CACHE_TTL) {
      console.log('[PERMISSIONS CACHE] Hit (age:', Math.round(age / 1000), 'seconds)');
      return cached.data;
    }
    cache.delete(usuarioId); // Expirado
  }

  // Fetch de BD
  console.log('[PERMISSIONS CACHE] Miss, fetching from DB');
  const permissions = await getUserPermissions(usuarioId);

  if (permissions) {
    cache.set(usuarioId, {
      data: permissions,
      timestamp: Date.now(),
    });
  }

  return permissions;
}

/**
 * Invalida cache de un usuario
 */
export function invalidateUserPermissions(usuarioId: string): void {
  cache.delete(usuarioId);
  console.log('[PERMISSIONS CACHE] Invalidated for user:', usuarioId);
}

/**
 * Limpia todo el cache
 */
export function clearPermissionsCache(): void {
  cache.clear();
  console.log('[PERMISSIONS CACHE] All cache cleared');
}
```

#### Archivo: `lib/permissions/check-permission.ts`

Helper para validar permisos en Server Actions.

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { hasPermission } from './permissions-db';

/**
 * Middleware para Server Actions: valida permiso antes de ejecutar
 */
export async function requirePermission(
  modulo: string,
  accion: string
): Promise<{ ok: true; usuarioId: string } | { ok: false; error: string }> {
  const supabase = await createClient();

  // Validar sesión
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, error: 'No autenticado' };
  }

  // Verificar permiso
  const has = await hasPermission(user.id, modulo, accion);
  if (!has) {
    console.error(`[PERMISSION DENIED] User ${user.email} tried to ${accion} in ${modulo}`);
    return { ok: false, error: 'No tienes permiso para esta acción' };
  }

  return { ok: true, usuarioId: user.id };
}

/**
 * Helper para validar múltiples permisos (OR logic)
 */
export async function requireAnyPermission(
  checks: Array<{ modulo: string; accion: string }>
): Promise<{ ok: true; usuarioId: string } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { ok: false, error: 'No autenticado' };
  }

  // Verificar al menos uno
  for (const check of checks) {
    const has = await hasPermission(user.id, check.modulo, check.accion);
    if (has) {
      return { ok: true, usuarioId: user.id };
    }
  }

  const modulosAcciones = checks.map(c => `${c.modulo}.${c.accion}`).join(', ');
  console.error(`[PERMISSION DENIED] User ${user.email} lacks permissions: ${modulosAcciones}`);
  return { ok: false, error: 'No tienes permiso para esta acción' };
}
```

### 3. Frontend (Client)

#### Archivo: `lib/permissions/permissions-context.tsx`

Context para compartir permisos en el cliente.

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getUserPermissionsClient } from './permissions-client';

interface Permission {
  modulo: string;
  accion: string;
  nombre: string;
  es_especial: boolean;
}

interface PermissionsContextType {
  permissions: Permission[];
  loading: boolean;
  can: (modulo: string, accion: string) => boolean;
  canAny: (checks: Array<{ modulo: string; accion: string }>) => boolean;
  refresh: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const data = await getUserPermissionsClient();
      setPermissions(data?.permissions || []);
    } catch (error) {
      console.error('[PERMISSIONS] Error fetching permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const can = (modulo: string, accion: string): boolean => {
    return permissions.some(p => p.modulo === modulo && p.accion === accion);
  };

  const canAny = (checks: Array<{ modulo: string; accion: string }>): boolean => {
    return checks.some(check => can(check.modulo, check.accion));
  };

  return (
    <PermissionsContext.Provider value={{ permissions, loading, can, canAny, refresh: fetchPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
}
```

#### Archivo: `lib/permissions/permissions-client.ts`

Cliente para obtener permisos desde el frontend.

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { getCachedUserPermissions } from './permissions-cache';

export async function getUserPermissionsClient() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }

  return await getCachedUserPermissions(user.id);
}
```

#### Hook: `usePermissions()`

Hook para usar en componentes.

```typescript
'use client';

import { usePermissions } from '@/lib/permissions/permissions-context';

// USO EN COMPONENTES:
function MiComponente() {
  const { can, canAny, loading } = usePermissions();

  if (loading) return <Spinner />;

  return (
    <div>
      {can('leads', 'crear') && (
        <Button>Crear Lead</Button>
      )}

      {can('leads', 'exportar') && (
        <Button>Exportar a Excel</Button>
      )}

      {canAny([
        { modulo: 'usuarios', accion: 'editar' },
        { modulo: 'usuarios', accion: 'eliminar' }
      ]) && (
        <Button>Administrar Usuarios</Button>
      )}
    </div>
  );
}
```

### 4. Middleware

#### Actualización: `middleware.ts`

Validar acceso a rutas usando permisos.

```typescript
// ANTES (hardcoded):
if (userData.rol === 'admin' || userData.rol === 'jefe_ventas') {
  return res;
}

// DESPUÉS (con permisos):
import { hasRouteAccess } from '@/lib/permissions/route-permissions';

const pathname = req.nextUrl.pathname;
const hasAccess = await hasRouteAccess(validatedUser.id, pathname);

if (!hasAccess) {
  // Redirect según ruta default del rol
  const defaultRoute = getDefaultRouteForRole(userData.rol);
  return NextResponse.redirect(new URL(defaultRoute, req.url));
}
```

#### Archivo: `lib/permissions/route-permissions.ts`

Mapeo de rutas a permisos requeridos.

```typescript
const ROUTE_PERMISSIONS_MAP: Record<string, { modulo: string; accion: string }[]> = {
  '/': [
    { modulo: 'admin', accion: 'ver_dashboard' },
  ],
  '/operativo': [
    { modulo: 'leads', accion: 'ver' },
  ],
  '/locales': [
    { modulo: 'locales', accion: 'ver' },
  ],
  '/control-pagos': [
    { modulo: 'control_pagos', accion: 'ver' },
  ],
  '/comisiones': [
    { modulo: 'comisiones', accion: 'ver_todas' },
    { modulo: 'comisiones', accion: 'ver_propias' },
  ],
  '/repulse': [
    { modulo: 'repulse', accion: 'ver' },
  ],
  '/reporteria': [
    { modulo: 'reporteria', accion: 'ver' },
  ],
  '/admin/usuarios': [
    { modulo: 'usuarios', accion: 'ver' },
  ],
  '/configuracion-proyectos': [
    { modulo: 'proyectos', accion: 'configurar' },
  ],
  '/aprobaciones': [
    { modulo: 'aprobaciones', accion: 'ver' },
  ],
  '/validacion-bancaria': [
    { modulo: 'validacion_bancaria', accion: 'ver' },
  ],
  '/reuniones': [
    { modulo: 'reuniones', accion: 'ver' },
  ],
};

export async function hasRouteAccess(usuarioId: string, pathname: string): Promise<boolean> {
  // Buscar match exacto o wildcard
  const requiredPerms = ROUTE_PERMISSIONS_MAP[pathname];
  if (!requiredPerms) {
    // Ruta no mapeada = permitir (backward compatibility)
    return true;
  }

  // Verificar si tiene al menos uno de los permisos (OR logic)
  return await hasAnyPermission(usuarioId, requiredPerms);
}
```

---

## Modelo de Datos

### ERD Simplificado

```
┌─────────────────┐
│   permissions   │
├─────────────────┤
│ id (PK)         │
│ modulo          │
│ accion          │
│ nombre          │
│ descripcion     │
│ es_especial     │
└─────────────────┘
        ▲
        │
        │ (many-to-many)
        │
┌───────┴──────────┐
│ role_permissions │
├──────────────────┤
│ id (PK)          │
│ rol              │
│ permission_id FK │
└──────────────────┘

┌─────────────────┐
│    usuarios     │
├─────────────────┤
│ id (PK)         │
│ rol             │◄──┐
│ ...             │   │
└─────────────────┘   │
        ▲             │
        │             │
        │ (FK)        │
        │             │
┌───────┴──────────┐  │
│ user_permissions │  │
├──────────────────┤  │
│ id (PK)          │  │
│ usuario_id FK    ├──┘
│ permission_id FK │
│ granted BOOL     │
│ reason TEXT      │
└──────────────────┘
```

### SQL Completo de Migración

```sql
-- ============================================================================
-- MIGRACIÓN: Sistema de Permisos Granulares (RBAC)
-- Fecha: 2026-01-11
-- Archivo: 20260111_rbac_permissions.sql
-- ============================================================================

-- 1. Tabla de permisos
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo TEXT NOT NULL,
  accion TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  es_especial BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_permission UNIQUE(modulo, accion)
);

CREATE INDEX idx_permissions_modulo ON permissions(modulo);
CREATE INDEX idx_permissions_especial ON permissions(es_especial) WHERE es_especial = true;

-- 2. Tabla rol-permisos
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'gerencia', 'jefe_ventas', 'vendedor', 'vendedor_caseta', 'coordinador', 'finanzas', 'marketing')),
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_role_permission UNIQUE(rol, permission_id)
);

CREATE INDEX idx_role_permissions_rol ON role_permissions(rol);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- 3. Tabla user-permisos (override)
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  reason TEXT,
  granted_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_user_permission UNIQUE(usuario_id, permission_id)
);

CREATE INDEX idx_user_permissions_usuario ON user_permissions(usuario_id);
CREATE INDEX idx_user_permissions_granted ON user_permissions(granted);

-- 4. Vista de permisos efectivos
CREATE OR REPLACE VIEW user_effective_permissions AS
SELECT DISTINCT
  u.id AS usuario_id,
  u.rol,
  p.id AS permission_id,
  p.modulo,
  p.accion,
  p.nombre,
  p.descripcion,
  p.es_especial,
  COALESCE(up.granted, true) AS tiene_permiso
FROM usuarios u
LEFT JOIN role_permissions rp ON rp.rol = u.rol
LEFT JOIN permissions p ON p.id = rp.permission_id
LEFT JOIN user_permissions up ON up.usuario_id = u.id AND up.permission_id = p.id
WHERE u.activo = true;

-- 5. RLS Policies
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden modificar permisos
CREATE POLICY "Admin can manage permissions"
  ON permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
      AND rol = 'admin'
      AND activo = true
    )
  );

-- Todos los usuarios autenticados pueden ver permisos
CREATE POLICY "Authenticated users can view permissions"
  ON permissions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Similar para role_permissions y user_permissions
CREATE POLICY "Admin can manage role permissions"
  ON role_permissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin' AND activo = true)
  );

CREATE POLICY "Authenticated users can view role permissions"
  ON role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage user permissions"
  ON user_permissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin' AND activo = true)
  );

CREATE POLICY "Users can view own permissions"
  ON user_permissions FOR SELECT
  USING (auth.uid() = usuario_id OR EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'));

COMMENT ON TABLE permissions IS 'Catálogo de permisos del sistema (módulos y acciones)';
COMMENT ON TABLE role_permissions IS 'Mapeo de roles a permisos';
COMMENT ON TABLE user_permissions IS 'Permisos específicos por usuario (overrides)';
COMMENT ON VIEW user_effective_permissions IS 'Vista consolidada de permisos efectivos de cada usuario';
```

---

## APIs / Server Actions

### Server Actions Actualizadas

#### Ejemplo: `lib/actions-leads.ts`

```typescript
'use server';

import { requirePermission } from '@/lib/permissions/check-permission';

export async function createLead(data: CreateLeadInput) {
  // ANTES:
  // const supabase = await createClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) return { error: 'No autenticado' };

  // DESPUÉS:
  const check = await requirePermission('leads', 'crear');
  if (!check.ok) {
    return { error: check.error };
  }

  // Continuar con lógica...
  const supabase = await createClient();
  // ... insert lead
}

export async function updateLead(leadId: string, data: UpdateLeadInput) {
  const check = await requirePermission('leads', 'editar');
  if (!check.ok) {
    return { error: check.error };
  }

  // ... lógica
}

export async function deleteLead(leadId: string) {
  const check = await requirePermission('leads', 'eliminar');
  if (!check.ok) {
    return { error: check.error };
  }

  // ... lógica
}

export async function exportLeadsToExcel(filters: LeadFilters) {
  const check = await requirePermission('leads', 'exportar');
  if (!check.ok) {
    return { error: check.error };
  }

  // ... lógica
}
```

#### Ejemplo: Permisos OR (múltiples opciones)

```typescript
export async function viewComisiones() {
  // Puede ver comisiones si tiene permiso para ver todas O ver propias
  const check = await requireAnyPermission([
    { modulo: 'comisiones', accion: 'ver_todas' },
    { modulo: 'comisiones', accion: 'ver_propias' },
  ]);

  if (!check.ok) {
    return { error: check.error };
  }

  // Determinar qué filtrar según permiso exacto
  const hasTodas = await hasPermission(check.usuarioId, 'comisiones', 'ver_todas');

  const supabase = await createClient();
  let query = supabase.from('comisiones').select('*');

  if (!hasTodas) {
    // Solo ver propias
    query = query.eq('vendedor_id', check.usuarioId);
  }

  // ... continuar
}
```

### API Routes (Webhooks/Externos)

API routes mantienen su validación actual (no usan sistema de permisos, usan API keys/tokens).

```typescript
// app/api/extension/create-lead/route.ts
// NO CAMBIAR - Ya tiene validación propia (Bearer token)

// app/api/webhooks/notificar-aprobacion/route.ts
// NO CAMBIAR - Webhook público con validación de firma
```

---

## Migración desde Hardcoded

### Estrategia de Migración Gradual

**Principio:** Feature flag para activar/desactivar RBAC sin romper producción.

#### Fase 1: Preparación (Sin romper nada)

1. **Ejecutar migración SQL** - Crea tablas, NO las usa aún
2. **Seed inicial de permisos** - Popular `permissions` y `role_permissions`
3. **Deploy código nuevo** - Funciones de permisos creadas pero NO invocadas

**Estado:** Sistema sigue usando validaciones hardcoded. Sin impacto.

#### Fase 2: Testing (Feature Flag OFF)

1. **Agregar variable de entorno:**
   ```bash
   ENABLE_RBAC=false  # Default: false
   ```

2. **Código dual (ejemplo middleware):**
   ```typescript
   const ENABLE_RBAC = process.env.ENABLE_RBAC === 'true';

   if (ENABLE_RBAC) {
     // Nueva lógica con permisos
     const hasAccess = await hasRouteAccess(validatedUser.id, pathname);
     if (!hasAccess) {
       return NextResponse.redirect(/* ... */);
     }
   } else {
     // Lógica vieja (hardcoded)
     if (userData.rol === 'admin' || userData.rol === 'jefe_ventas') {
       return res;
     }
   }
   ```

3. **Testing en staging:**
   - Setear `ENABLE_RBAC=true` en staging
   - Probar todos los flujos con QA
   - Verificar que permisos funcionen correctamente

**Estado:** Producción sigue con hardcoded. Staging con RBAC.

#### Fase 3: Rollout Gradual (Feature Flag ON por módulo)

1. **Flag granular por módulo:**
   ```typescript
   const RBAC_ENABLED_MODULES = process.env.RBAC_MODULES?.split(',') || [];
   // Ejemplo: RBAC_MODULES=leads,locales

   function shouldUseRBAC(modulo: string): boolean {
     return RBAC_ENABLED_MODULES.includes(modulo) || ENABLE_RBAC === true;
   }
   ```

2. **Activar por módulo:**
   - Semana 1: `RBAC_MODULES=leads`
   - Semana 2: `RBAC_MODULES=leads,locales`
   - Semana 3: `RBAC_MODULES=leads,locales,ventas,control_pagos`
   - Semana 4: `ENABLE_RBAC=true` (todos)

**Estado:** Migración gradual, rollback fácil por módulo.

#### Fase 4: Limpieza (Remover código viejo)

Cuando `ENABLE_RBAC=true` esté estable en producción (2+ semanas sin issues):

1. **Remover flags y código hardcoded**
2. **Consolidar funciones**
3. **Actualizar docs**

**Estado:** Sistema 100% con RBAC.

### Mapeo de Roles Actuales a Permisos

Script SQL para popular permisos iniciales basado en lógica actual.

```sql
-- ============================================================================
-- SEED: Permisos iniciales basados en lógica hardcoded actual
-- Archivo: seed_permissions.sql
-- ============================================================================

-- 1. INSERT de todos los permisos (módulos x acciones)
INSERT INTO permissions (modulo, accion, nombre, descripcion, es_especial) VALUES
-- LEADS
('leads', 'ver', 'Ver leads', 'Ver lista de leads del proyecto', false),
('leads', 'crear', 'Crear leads', 'Crear nuevos leads manualmente o importar', false),
('leads', 'editar', 'Editar leads', 'Modificar información de leads', false),
('leads', 'eliminar', 'Eliminar leads', 'Borrar leads del sistema', false),
('leads', 'asignar', 'Asignar leads', 'Asignar leads a vendedores', false),
('leads', 'exportar', 'Exportar leads', 'Exportar leads a Excel', false),
('leads', 'importar', 'Importar leads', 'Importar leads desde Excel', false),

-- LOCALES
('locales', 'ver', 'Ver locales', 'Ver catálogo de locales', false),
('locales', 'crear', 'Crear locales', 'Crear nuevos locales en proyectos', false),
('locales', 'editar', 'Editar locales', 'Modificar datos de locales', false),
('locales', 'eliminar', 'Eliminar locales', 'Borrar locales', false),
('locales', 'cambiar_estado', 'Cambiar estado local', 'Cambiar estado del semáforo', false),
('locales', 'asignar_vendedor', 'Asignar vendedor', 'Asignar local a vendedor', false),

-- VENTAS
('ventas', 'ver', 'Ver ventas', 'Ver registro de ventas', false),
('ventas', 'crear', 'Registrar venta', 'Registrar nueva venta de local', false),
('ventas', 'editar', 'Editar venta', 'Modificar datos de venta', false),
('ventas', 'cambiar_precio', 'Cambiar precio venta', 'Modificar precio después de venta', true),

-- CONTROL_PAGOS
('control_pagos', 'ver', 'Ver control de pagos', 'Ver calendario de cuotas y abonos', false),
('control_pagos', 'crear', 'Registrar abono', 'Registrar nuevo abono', false),
('control_pagos', 'editar', 'Editar abono', 'Modificar abonos registrados', false),
('control_pagos', 'verificar', 'Verificar pagos', 'Verificar abonos (rol finanzas)', true),
('control_pagos', 'generar_constancia', 'Generar constancia', 'Generar constancias de separación/abono', false),
('control_pagos', 'ver_todos_proyectos', 'Ver todos los proyectos', 'Cross-proyecto (admin only)', true),

-- COMISIONES
('comisiones', 'ver_todas', 'Ver todas las comisiones', 'Ver comisiones de todos los vendedores', false),
('comisiones', 'ver_propias', 'Ver mis comisiones', 'Ver solo mis comisiones', false),
('comisiones', 'calcular', 'Calcular comisiones', 'Ejecutar cálculo de comisiones', false),
('comisiones', 'exportar', 'Exportar comisiones', 'Exportar a Excel/PDF', false),

-- REPULSE
('repulse', 'ver', 'Ver repulse', 'Ver módulo de re-engagement', false),
('repulse', 'crear', 'Crear campaña repulse', 'Crear campañas de re-engagement', false),
('repulse', 'ejecutar_campana', 'Ejecutar campaña masiva', 'Enviar mensajes masivos', true),

-- REPORTERIA
('reporteria', 'ver', 'Ver reportería', 'Acceso a reportes y analytics', false),
('reporteria', 'exportar', 'Exportar reportes', 'Exportar reportes a Excel/PDF', false),

-- USUARIOS
('usuarios', 'ver', 'Ver usuarios', 'Ver lista de usuarios', false),
('usuarios', 'crear', 'Crear usuarios', 'Crear nuevos usuarios', false),
('usuarios', 'editar', 'Editar usuarios', 'Modificar datos de usuarios', false),
('usuarios', 'eliminar', 'Eliminar usuarios', 'Desactivar usuarios', false),
('usuarios', 'resetear_password', 'Resetear contraseña', 'Resetear password de usuarios', true),

-- PROYECTOS
('proyectos', 'ver', 'Ver proyectos', 'Ver configuración de proyectos', false),
('proyectos', 'configurar', 'Configurar proyectos', 'Modificar TEA, cuotas, etc.', true),

-- APROBACIONES
('aprobaciones', 'ver', 'Ver aprobaciones', 'Ver solicitudes de aprobación', false),
('aprobaciones', 'aprobar', 'Aprobar descuentos', 'Aprobar/rechazar descuentos', true),
('aprobaciones', 'configurar_rangos', 'Configurar rangos', 'Configurar rangos de aprobación', true),

-- VALIDACION_BANCARIA
('validacion_bancaria', 'ver', 'Ver validación bancaria', 'Ver módulo de validación', false),
('validacion_bancaria', 'importar', 'Importar estado cuenta', 'Importar Excel bancario', false),
('validacion_bancaria', 'matching', 'Hacer matching', 'Matching manual/automático', false),
('validacion_bancaria', 'exportar', 'Exportar a Concard', 'Exportar a Excel Concard', false),

-- EXPEDIENTE
('expediente', 'ver', 'Ver expediente', 'Ver expediente digital del cliente', false),
('expediente', 'editar', 'Editar expediente', 'Modificar eventos y checklist', false),
('expediente', 'generar_pdf', 'Generar PDF expediente', 'Descargar PDF completo', false),

-- CONTRATOS
('contratos', 'ver', 'Ver contratos', 'Ver contratos generados', false),
('contratos', 'generar', 'Generar contrato', 'Generar contrato de venta', false),
('contratos', 'usar_template_custom', 'Usar template custom', 'Subir template .docx personalizado', true),

-- REUNIONES
('reuniones', 'ver', 'Ver reuniones', 'Ver lista de reuniones', false),
('reuniones', 'crear', 'Crear reunión', 'Subir nueva reunión', false),
('reuniones', 'editar', 'Editar reunión', 'Modificar reuniones', false),
('reuniones', 'eliminar', 'Eliminar reunión', 'Borrar reuniones', false),
('reuniones', 'transcribir', 'Transcribir reunión', 'Ejecutar transcripción con IA', false),

-- ADMIN
('admin', 'ver_dashboard', 'Ver dashboard admin', 'Acceso a página principal (Insights)', false),
('admin', 'configurar_kanban', 'Configurar Kanban', 'Configurar tipificaciones Kanban', false)

ON CONFLICT (modulo, accion) DO NOTHING;

-- 2. MAPEO DE ROLES A PERMISOS (basado en middleware actual)

-- ADMIN: TODO
INSERT INTO role_permissions (rol, permission_id)
SELECT 'admin', id FROM permissions
ON CONFLICT DO NOTHING;

-- JEFE_VENTAS
INSERT INTO role_permissions (rol, permission_id)
SELECT 'jefe_ventas', id FROM permissions
WHERE
  (modulo = 'leads' AND accion IN ('ver', 'crear', 'editar', 'asignar', 'exportar'))
  OR (modulo = 'locales' AND accion IN ('ver', 'crear', 'editar', 'cambiar_estado', 'asignar_vendedor'))
  OR (modulo = 'ventas' AND accion IN ('ver', 'crear', 'editar', 'cambiar_precio'))
  OR (modulo = 'control_pagos' AND accion IN ('ver', 'crear', 'editar', 'generar_constancia'))
  OR (modulo = 'comisiones' AND accion IN ('ver_todas', 'calcular', 'exportar'))
  OR (modulo = 'repulse' AND accion IN ('ver', 'crear', 'ejecutar_campana'))
  OR (modulo = 'reporteria' AND accion IN ('ver', 'exportar'))
  OR (modulo = 'proyectos' AND accion = 'ver')
  OR (modulo = 'aprobaciones' AND accion IN ('ver', 'aprobar'))
  OR (modulo = 'validacion_bancaria' AND accion IN ('ver', 'importar', 'matching', 'exportar'))
  OR (modulo = 'expediente')
  OR (modulo = 'contratos' AND accion IN ('ver', 'generar'))
  OR (modulo = 'reuniones')
  OR (modulo = 'admin' AND accion = 'ver_dashboard')
ON CONFLICT DO NOTHING;

-- VENDEDOR
INSERT INTO role_permissions (rol, permission_id)
SELECT 'vendedor', id FROM permissions
WHERE
  (modulo = 'leads' AND accion IN ('ver', 'crear', 'editar'))
  OR (modulo = 'locales' AND accion IN ('ver', 'editar', 'cambiar_estado'))
  OR (modulo = 'ventas' AND accion IN ('ver', 'crear', 'editar'))
  OR (modulo = 'comisiones' AND accion = 'ver_propias')
ON CONFLICT DO NOTHING;

-- VENDEDOR_CASETA
INSERT INTO role_permissions (rol, permission_id)
SELECT 'vendedor_caseta', id FROM permissions
WHERE
  (modulo = 'leads' AND accion IN ('ver', 'crear', 'editar'))
  OR (modulo = 'locales' AND accion IN ('ver', 'editar', 'cambiar_estado'))
  OR (modulo = 'comisiones' AND accion = 'ver_propias')
ON CONFLICT DO NOTHING;

-- COORDINADOR (igual que vendedor_caseta)
INSERT INTO role_permissions (rol, permission_id)
SELECT 'coordinador', id FROM permissions
WHERE
  (modulo = 'leads' AND accion IN ('ver', 'crear', 'editar'))
  OR (modulo = 'locales' AND accion IN ('ver', 'editar', 'cambiar_estado'))
  OR (modulo = 'comisiones' AND accion = 'ver_propias')
ON CONFLICT DO NOTHING;

-- FINANZAS
INSERT INTO role_permissions (rol, permission_id)
SELECT 'finanzas', id FROM permissions
WHERE
  (modulo = 'control_pagos')
  OR (modulo = 'validacion_bancaria')
  OR (modulo = 'expediente')
ON CONFLICT DO NOTHING;

-- MARKETING
INSERT INTO role_permissions (rol, permission_id)
SELECT 'marketing', id FROM permissions
WHERE
  (modulo = 'leads' AND accion IN ('ver', 'exportar'))
  OR (modulo = 'reporteria')
  OR (modulo = 'admin' AND accion = 'ver_dashboard')
ON CONFLICT DO NOTHING;

-- GERENCIA (legacy, mapea a jefe_ventas)
INSERT INTO role_permissions (rol, permission_id)
SELECT 'gerencia', permission_id FROM role_permissions WHERE rol = 'jefe_ventas'
ON CONFLICT DO NOTHING;
```

### Estrategia de Rollback

**Escenario 1: Bug crítico en staging**
- Cambiar `ENABLE_RBAC=false` en staging
- Sistema vuelve a hardcoded inmediatamente
- Fix bug, re-test, re-deploy

**Escenario 2: Bug en producción (módulo específico)**
- Remover módulo de `RBAC_MODULES`: `RBAC_MODULES=leads` → `RBAC_MODULES=`
- Solo ese módulo vuelve a hardcoded
- Resto sigue con RBAC

**Escenario 3: Bug catastrófico en producción (todo)**
- `ENABLE_RBAC=false` en Vercel env vars
- Redeploy (automático, 2 min)
- Sistema completo vuelve a hardcoded

**Ventana de rollback:** Código hardcoded se mantiene por 4 semanas después de `ENABLE_RBAC=true` estable.

---

## Dependencias

### Paquetes npm

**No se requieren nuevos paquetes.** Todo se implementa con stack actual:
- Supabase PostgreSQL (ya instalado)
- Next.js 15 (ya instalado)
- TypeScript (ya instalado)

### Variables de Entorno

Nuevas variables a agregar en Vercel:

```bash
# Feature flags
ENABLE_RBAC=false              # Activar sistema RBAC (default: false)
RBAC_MODULES=                  # Módulos con RBAC (separados por coma)

# Cache
PERMISSIONS_CACHE_TTL=300000   # TTL del cache en ms (default: 5min)
```

---

## Consideraciones

### Ventajas

| Beneficio | Descripción |
|-----------|-------------|
| **Mantenibilidad** | Permisos centralizados en BD, no dispersos en código |
| **Escalabilidad** | Agregar nuevo permiso = 1 INSERT, no modificar 20 archivos |
| **Flexibilidad** | Admin puede dar/quitar permisos sin deploy |
| **Auditabilidad** | Historial de quién dio/quitó permisos (user_permissions.granted_by) |
| **Performance** | Cache en memoria reduce queries a BD |
| **Testing** | Fácil probar diferentes combinaciones de permisos |
| **Migración segura** | Feature flag permite rollback instantáneo |

### Riesgos

| Riesgo | Mitigación |
|--------|------------|
| **Complejidad inicial** | Feature flag permite adopción gradual |
| **Performance (cache miss)** | TTL 5min + cache en memoria = < 10ms overhead |
| **Migración incompleta** | Checklist exhaustivo + testing en staging |
| **Permisos mal configurados** | Seed inicial basado en lógica hardcoded actual (probada) |
| **Bug en producción** | Rollback inmediato con feature flag |

### Limitaciones

1. **No reemplaza RLS:** Permisos validan qué UI mostrar, RLS valida qué datos acceder
2. **Requiere cache:** Sin cache, cada request = 1+ queries extra
3. **Overhead inicial:** Migración gradual toma 4-6 semanas
4. **No retrocompatible:** Código viejo hardcoded no funciona con feature flag ON

### Alternativas Consideradas

| Alternativa | Por qué NO se eligió |
|-------------|----------------------|
| **CASL (librería JS)** | Requiere definir reglas en código (no BD), no es dinámico |
| **Casbin** | Overkill para este proyecto, curva de aprendizaje alta |
| **Permisos en JWT** | Token crece mucho, cache invalidation complejo |
| **Solo RLS (sin permisos)** | No permite ocultar UI, solo protege datos |
| **Hardcoded mejorado** | Sigue siendo difícil de mantener a largo plazo |

### Timeline Estimado

| Fase | Duración | Tareas |
|------|----------|--------|
| **1. Setup BD** | 4 horas | Migración SQL, seed permisos, RLS policies |
| **2. Backend** | 12 horas | Helpers, cache, check-permission functions |
| **3. Frontend** | 8 horas | Context, hook usePermissions, componentes |
| **4. Middleware** | 6 horas | Actualizar middleware con feature flag |
| **5. Server Actions** | 20 horas | Actualizar ~50 server actions con requirePermission |
| **6. Testing** | 16 horas | QA completo en staging (todos los roles) |
| **7. Rollout** | 4 semanas | 1 módulo por semana, monitoreo |
| **8. Limpieza** | 8 horas | Remover código hardcoded, docs |
| **TOTAL** | **~6 semanas** | 74 horas dev + 4 semanas rollout |

### Métricas de Éxito

**KPIs:**
- ✅ 0 bugs críticos en producción durante rollout
- ✅ < 50ms overhead promedio en requests (cache hit rate > 90%)
- ✅ 100% de server actions migrados a requirePermission
- ✅ 0 validaciones hardcoded después de limpieza
- ✅ Admin puede dar/quitar permisos sin deploy

**Validación:**
- Testing E2E con Playwright para cada rol
- Monitoreo de logs (permisos denegados)
- Feedback de usuarios (UI oculta correctamente features)

---

## Próximos Pasos

### Checklist de Implementación

**FASE 1: Preparación (Semana 1)**
- [ ] Crear branch `feature/rbac-permissions`
- [ ] Ejecutar migración SQL en staging
- [ ] Ejecutar seed de permisos iniciales
- [ ] Verificar tablas y view en Supabase Dashboard
- [ ] Testing manual de queries en SQL Editor

**FASE 2: Backend (Semana 2)**
- [ ] Crear `lib/permissions/permissions-db.ts`
- [ ] Crear `lib/permissions/permissions-cache.ts`
- [ ] Crear `lib/permissions/check-permission.ts`
- [ ] Crear `lib/permissions/route-permissions.ts`
- [ ] Unit tests para helpers

**FASE 3: Frontend (Semana 2-3)**
- [ ] Crear `lib/permissions/permissions-context.tsx`
- [ ] Crear `lib/permissions/permissions-client.ts`
- [ ] Agregar PermissionsProvider en layout.tsx
- [ ] Testing de hook usePermissions en componentes

**FASE 4: Middleware (Semana 3)**
- [ ] Agregar feature flag `ENABLE_RBAC=false`
- [ ] Actualizar middleware.ts con lógica dual
- [ ] Testing de acceso a rutas (todos los roles)

**FASE 5: Server Actions (Semana 3-4)**
- [ ] Actualizar actions-leads.ts
- [ ] Actualizar actions-locales.ts
- [ ] Actualizar actions-ventas.ts
- [ ] Actualizar actions-control-pagos.ts
- [ ] Actualizar actions-comisiones.ts
- [ ] Actualizar actions-usuarios.ts
- [ ] ... (todas las actions)

**FASE 6: Testing (Semana 5)**
- [ ] QA manual con todas las credenciales de testing
- [ ] Testing E2E con Playwright
- [ ] Activar `ENABLE_RBAC=true` en staging
- [ ] Smoke testing completo

**FASE 7: Rollout (Semana 6-9)**
- [ ] Semana 6: `RBAC_MODULES=leads` en producción
- [ ] Semana 7: `RBAC_MODULES=leads,locales,ventas`
- [ ] Semana 8: `RBAC_MODULES=leads,locales,ventas,control_pagos,comisiones`
- [ ] Semana 9: `ENABLE_RBAC=true` en producción (todos)

**FASE 8: Limpieza (Semana 10-11)**
- [ ] Remover código hardcoded
- [ ] Remover feature flags
- [ ] Actualizar documentación
- [ ] Code review final
- [ ] Merge a main

---

## Referencias

### Documentación Interna

- `middleware.ts` - Lógica actual de RBAC hardcoded
- `lib/auth-context.tsx` - Sistema de autenticación actual
- `docs/modulos/usuarios.md` - Módulo de usuarios (roles)
- `context/DECISIONS.md` - Decisiones de arquitectura

### Estándares Externos

- [NIST RBAC Standard](https://csrc.nist.gov/projects/role-based-access-control)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [PostgreSQL RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)

---

**Fin del documento**

**Aprobación pendiente de:**
- Backend Dev (implementación)
- Frontend Dev (componentes)
- QA Specialist (testing)
- Security Auth (validación de seguridad)
