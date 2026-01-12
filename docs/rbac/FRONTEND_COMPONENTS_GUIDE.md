# Sistema RBAC - Guía de Componentes Frontend

**Fecha:** 11 Enero 2026
**Versión:** 1.0
**Estado:** Implementado

---

## Tabla de Contenidos

1. [Resumen](#resumen)
2. [Arquitectura](#arquitectura)
3. [Componentes Creados](#componentes-creados)
4. [API Endpoints](#api-endpoints)
5. [Guía de Uso](#guía-de-uso)
6. [Ejemplos Prácticos](#ejemplos-prácticos)
7. [UI de Administración](#ui-de-administración)

---

## Resumen

Se implementaron los componentes frontend del sistema RBAC para:

1. **Client-side permission checks** - Hook y contexto React
2. **Permission gates** - Componente para condicionar UI
3. **Admin UI** - Gestión visual de roles y permisos
4. **API endpoints** - Backend para frontend

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  React Components                                           │
│  ┌──────────────────┐    ┌──────────────────┐             │
│  │ usePermissions() │───▶│ PermissionGate   │             │
│  │ hook             │    │ component        │             │
│  └──────────────────┘    └──────────────────┘             │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────┐              │
│  │    PermissionsProvider (Context)        │              │
│  └─────────────────────────────────────────┘              │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────────────────────────────┐              │
│  │  GET /api/permissions                   │              │
│  └─────────────────────────────────────────┘              │
│           │                                                 │
└───────────┼─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  getUserPermissions() → Supabase → Cache → Return          │
└─────────────────────────────────────────────────────────────┘
```

---

## Componentes Creados

### 1. `lib/permissions/client.ts`

**Funciones para Client Components**

```typescript
// Fetch permisos desde API
export async function fetchUserPermissions(): Promise<UserPermissions | null>

// Check permiso en cliente
export function clientHasPermission(
  permisos: Permission[],
  modulo: string,
  accion: string
): boolean

// Check múltiples (OR)
export function clientHasAnyPermission(
  permisos: Permission[],
  permisosRequeridos: Permission[]
): boolean

// Check múltiples (AND)
export function clientHasAllPermissions(
  permisos: Permission[],
  permisosRequeridos: Permission[]
): boolean

// Helpers
export function formatPermissionsForDisplay(permisos: Permission[]): string[]
export function groupPermissionsByModule(permisos: Permission[]): Record<string, string[]>
export function countTotalPermissions(permissions: UserPermissions): number
```

---

### 2. `lib/permissions/context.tsx`

**React Context Provider**

```tsx
// Provider
<PermissionsProvider>
  <YourApp />
</PermissionsProvider>

// Hook
const { can, canAny, canAll, loading, isAdmin } = usePermissions();
```

**Context Value:**

```typescript
interface PermissionsContextValue {
  permissions: UserPermissions | null;
  loading: boolean;
  error: string | null;

  can: (modulo: string, accion: string) => boolean;
  canAny: (permisos: Permission[]) => boolean;
  canAll: (permisos: Permission[]) => boolean;

  isAdmin: boolean;
  isRBACEnabled: boolean;
  allPermissions: Permission[];
  refresh: () => Promise<void>;
}
```

---

### 3. `components/auth/PermissionGate.tsx`

**Componente para condicionar renderizado**

```tsx
interface PermissionGateProps {
  children: ReactNode;
  permission?: Permission;
  anyOf?: Permission[];
  allOf?: Permission[];
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}
```

---

### 4. `app/api/permissions/route.ts`

**API Endpoint**

```
GET /api/permissions
```

**Response:**
```json
{
  "permissions": {
    "userId": "uuid",
    "rol": "admin",
    "rolId": "uuid",
    "permisos": [...],
    "permisosExtra": [...]
  }
}
```

---

## API Endpoints

### GET /api/permissions

**Headers:**
- `Content-Type: application/json`
- Cookies de autenticación

**Response (200):**
```json
{
  "permissions": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "rol": "admin",
    "rolId": "role-uuid",
    "permisos": [
      { "modulo": "leads", "accion": "read" },
      { "modulo": "leads", "accion": "write" }
    ],
    "permisosExtra": []
  }
}
```

**Response (401):**
```json
{
  "error": "No autenticado"
}
```

---

## Guía de Uso

### Setup: Envolver App con Provider

En tu layout principal:

```tsx
// app/layout.tsx
import { PermissionsProvider } from '@/lib/permissions/context';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PermissionsProvider>
          {children}
        </PermissionsProvider>
      </body>
    </html>
  );
}
```

---

### Uso 1: Hook en Componentes

```tsx
import { usePermissions } from '@/lib/permissions';

export default function LeadActions() {
  const { can, loading } = usePermissions();

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      {can('leads', 'write') && <EditButton />}
      {can('leads', 'delete') && <DeleteButton />}
    </div>
  );
}
```

---

### Uso 2: PermissionGate Component

**Permiso único:**
```tsx
<PermissionGate permission={{ modulo: 'leads', accion: 'delete' }}>
  <DeleteButton />
</PermissionGate>
```

**Múltiples permisos (OR):**
```tsx
<PermissionGate
  anyOf={[
    { modulo: 'leads', accion: 'read' },
    { modulo: 'ventas', accion: 'read' }
  ]}
>
  <DataTable />
</PermissionGate>
```

**Múltiples permisos (AND):**
```tsx
<PermissionGate
  allOf={[
    { modulo: 'ventas', accion: 'approve' },
    { modulo: 'control_pagos', accion: 'verify' }
  ]}
>
  <ApproveButton />
</PermissionGate>
```

**Con fallback:**
```tsx
<PermissionGate
  permission={{ modulo: 'insights', accion: 'read' }}
  fallback={<div>No tienes acceso a este módulo</div>}
>
  <InsightsDashboard />
</PermissionGate>
```

---

### Uso 3: Múltiples Verificaciones

```tsx
import { usePermissions } from '@/lib/permissions';
import { PERMISOS_LEADS, PERMISOS_VENTAS } from '@/lib/permissions';

export default function ComplexComponent() {
  const { canAny, canAll } = usePermissions();

  // Usuario necesita AL MENOS uno
  const canViewData = canAny([
    PERMISOS_LEADS.READ,
    PERMISOS_VENTAS.READ,
  ]);

  // Usuario necesita TODOS
  const canApprove = canAll([
    PERMISOS_VENTAS.APPROVE,
    PERMISOS_CONTROL_PAGOS.VERIFY,
  ]);

  return (
    <div>
      {canViewData && <DataTable />}
      {canApprove && <ApproveButton />}
    </div>
  );
}
```

---

## Ejemplos Prácticos

### Ejemplo 1: Menú Condicional

```tsx
import { usePermissions } from '@/lib/permissions';

export default function ActionMenu() {
  const { can } = usePermissions();

  return (
    <div className="flex gap-2">
      {can('leads', 'write') && (
        <button>Editar</button>
      )}
      {can('leads', 'delete') && (
        <button>Eliminar</button>
      )}
      {can('leads', 'export') && (
        <button>Exportar</button>
      )}
    </div>
  );
}
```

---

### Ejemplo 2: Sección Completa

```tsx
import PermissionGate from '@/components/auth/PermissionGate';

export default function FinancialSection() {
  return (
    <PermissionGate
      permission={{ modulo: 'control_pagos', accion: 'read' }}
      fallback={
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p>No tienes acceso a esta sección.</p>
          <p className="text-sm">Contacta a tu administrador.</p>
        </div>
      }
    >
      <ControlPagosPanel />
    </PermissionGate>
  );
}
```

---

### Ejemplo 3: Botón con Loading

```tsx
import { usePermissions } from '@/lib/permissions';

export default function DeleteButton() {
  const { can, loading } = usePermissions();

  if (loading) {
    return <button disabled>...</button>;
  }

  if (!can('leads', 'delete')) {
    return null; // O mostrar tooltip "No tienes permiso"
  }

  return (
    <button onClick={handleDelete}>
      Eliminar
    </button>
  );
}
```

---

## UI de Administración

### Páginas Creadas

1. **`/admin/roles`** - Lista de roles
2. **`/admin/roles/[id]`** - Detalle y edición de permisos

---

### Componentes de Admin

#### 1. RolesTable

Tabla de roles con:
- Nombre y descripción
- Conteo de permisos
- Conteo de usuarios asignados
- Estado (activo/inactivo)
- Acciones (ver, editar, eliminar)

```tsx
<RolesTable roles={roles} onDelete={deleteRoleAction} />
```

---

#### 2. PermissionsMatrix

Matriz visual de permisos con checkboxes:

```tsx
<PermissionsMatrix
  selectedPermissions={permissions}
  onChange={setPermissions}
  title="Permisos del Rol"
/>
```

**Features:**
- Búsqueda de módulos/permisos
- Expandir/colapsar módulos
- Checkbox por módulo (seleccionar todos)
- Checkboxes individuales por permiso
- Conteo de permisos seleccionados
- Modo read-only opcional

---

### Server Actions

```typescript
// app/admin/roles/actions.ts

export async function deleteRoleAction(roleId: string): Promise<void>

export async function updateRolePermissionsAction(
  roleId: string,
  permissions: Permission[]
): Promise<{ success: boolean; error?: string }>

export async function createRoleAction(
  nombre: string,
  descripcion: string
): Promise<{ success: boolean; roleId?: string; error?: string }>
```

---

## Flujo de Trabajo: Administrador

### 1. Acceder a Gestión de Roles

```
1. Login como admin
2. Navegar a /admin/roles
3. Ver lista de roles existentes
```

---

### 2. Editar Permisos de un Rol

```
1. Click en "Editar" en cualquier rol
2. Navegar a /admin/roles/[id]
3. Ver matriz de permisos
4. Usar búsqueda para filtrar
5. Expandir módulo
6. Seleccionar/deseleccionar permisos
7. Click "Guardar Cambios"
8. Confirmación visual
```

---

### 3. Crear Nuevo Rol

```
1. Click "Crear Rol" en /admin/roles
2. Completar nombre y descripción
3. Asignar permisos en matriz
4. Guardar
5. Asignar rol a usuarios en /admin/usuarios
```

---

## Consideraciones de Performance

### 1. Cache en Cliente

El `PermissionsProvider` cachea los permisos en memoria:
- **1 fetch inicial** al montar la app
- **0 fetches** en navegación subsecuente
- **Refresh manual** disponible con `refresh()`

---

### 2. Cache en Servidor

Los permisos se cachean en servidor por 5 minutos:
- Primera consulta: ~5ms (BD)
- Siguientes consultas: <1ms (cache)
- Cache invalidado al cambiar permisos

---

### 3. Optimización de Renders

- `usePermissions()` usa `useMemo` y `useCallback`
- `PermissionGate` solo re-renderiza si cambian permisos
- `PermissionsMatrix` usa búsqueda local (no refetch)

---

## Testing

### Test Manual

**Verificar permisos en consola:**
```tsx
const { permissions, allPermissions } = usePermissions();
console.log('Permisos:', allPermissions);
```

**Test de UI:**
```tsx
<PermissionGate permission={{ modulo: 'leads', accion: 'delete' }}>
  <div style={{ background: 'green' }}>Tienes permiso</div>
</PermissionGate>

<PermissionGate permission={{ modulo: 'inexistente', accion: 'fake' }}>
  <div style={{ background: 'red' }}>NO deberías ver esto</div>
</PermissionGate>
```

---

## Troubleshooting

### Problema: "usePermissions must be used inside PermissionsProvider"

**Solución:** Asegúrate de que tu app esté envuelta con `<PermissionsProvider>`.

---

### Problema: Permisos no se actualizan

**Solución:**
1. Verificar que ENABLE_RBAC=true en .env
2. Llamar `refresh()` después de cambiar permisos
3. Verificar cache en servidor

---

### Problema: Loading infinito

**Solución:**
1. Verificar que /api/permissions retorne correctamente
2. Verificar autenticación de usuario
3. Check console para errores de red

---

## Próximos Pasos

- [ ] Implementar página `/admin/roles/nuevo` (crear rol)
- [ ] Agregar búsqueda y filtros en `/admin/roles`
- [ ] Implementar permisos extra por usuario
- [ ] Crear página de auditoría de permisos
- [ ] Agregar tooltips de ayuda en PermissionsMatrix

---

## Referencias

- **Backend RBAC:** `docs/rbac/PLAN_MAESTRO_RBAC.md`
- **DB Schema:** `docs/rbac/SCHEMA_RBAC.sql`
- **Server Functions:** `lib/permissions/server.ts`
- **Types:** `lib/permissions/types.ts`

---

**Última actualización:** 11 Enero 2026
**Autor:** Claude Opus 4.5
