# Migración de Server Actions a RBAC

**Fecha:** 12 Enero 2026
**Backend Developer:** Claude Code
**Estado:** ✅ COMPLETADO (8 funciones críticas migradas)

## Objetivo

Migrar los Server Actions más críticos para usar el sistema RBAC con Higher-Order Functions (HOF) para validación automática de permisos.

---

## Funciones Migradas (8 total)

### 1. `assignLeadToVendedor` → `leads:assign`

**Archivo:** `lib/actions.ts`
**Permiso:** `PERMISOS_LEADS.ASSIGN`
**Descripción:** Asignar o reasignar leads a vendedores
**Cambio:**
```typescript
// ANTES: Sin validación de permisos
export async function assignLeadToVendedor(leadId: string, vendedorId: string) {
  try {
    // ... lógica
  }
}

// DESPUÉS: Con validación RBAC
export async function assignLeadToVendedor(leadId: string, vendedorId: string) {
  // RBAC: Validar permiso leads:assign
  const permissionCheck = await checkPermission(PERMISOS_LEADS.ASSIGN.modulo, PERMISOS_LEADS.ASSIGN.accion);
  if (!permissionCheck.ok) {
    return { success: false, message: permissionCheck.error || 'No autorizado' };
  }
  // ... lógica
}
```

---

### 2. `updateLocalEstado` → `locales:cambiar_estado`

**Archivo:** `lib/actions-locales.ts`
**Permiso:** `PERMISOS_LOCALES.CAMBIAR_ESTADO`
**Descripción:** Cambiar estado del semáforo de locales (verde, amarillo, naranja, rojo)
**Cambio:**
```typescript
// DESPUÉS: Con validación RBAC
export async function updateLocalEstado(...) {
  // RBAC: Validar permiso locales:cambiar_estado
  const { checkPermission } = await import('@/lib/permissions/server');
  const { PERMISOS_LOCALES } = await import('@/lib/permissions/types');

  const permissionCheck = await checkPermission(
    PERMISOS_LOCALES.CAMBIAR_ESTADO.modulo,
    PERMISOS_LOCALES.CAMBIAR_ESTADO.accion
  );
  if (!permissionCheck.ok) {
    return { success: false, message: permissionCheck.error || 'No autorizado' };
  }
  // ... lógica
}
```

---

### 3. `deleteLocal` → `locales:delete`

**Archivo:** `lib/actions-locales.ts`
**Permiso:** `PERMISOS_LOCALES.DELETE`
**Descripción:** Eliminar un local del inventario
**Cambio:** Similar al patrón anterior con dynamic import

---

### 4. `createUsuario` → `usuarios:write`

**Archivo:** `lib/actions-usuarios.ts`
**Permiso:** `PERMISOS_USUARIOS.WRITE`
**Descripción:** Crear nuevo usuario en el sistema
**Cambio:** Dynamic import + validación al inicio de la función

---

### 5. `toggleUsuarioActivo` → `usuarios:delete`

**Archivo:** `lib/actions-usuarios.ts`
**Permiso:** `PERMISOS_USUARIOS.DELETE`
**Descripción:** Activar/desactivar usuarios (soft delete)
**Cambio:** Usa permiso DELETE porque desactivar es equivalente a soft delete

---

### 6. `registrarAbono` → `control_pagos:write`

**Archivo:** `lib/actions-pagos.ts`
**Permiso:** `PERMISOS_CONTROL_PAGOS.WRITE`
**Descripción:** Registrar abonos de pagos de locales
**Cambio:** Validación antes de crear el client de Supabase

---

### 7. `addLeadToRepulse` → `repulse:write`

**Archivo:** `lib/actions-repulse.ts`
**Permiso:** `PERMISOS_REPULSE.WRITE`
**Descripción:** Agregar lead manualmente al sistema Repulse
**Cambio:** Validación con error descriptivo

---

### 8. `excluirLeadDeRepulse` → `repulse:exclude`

**Archivo:** `lib/actions-repulse.ts`
**Permiso:** `PERMISOS_REPULSE.EXCLUDE`
**Descripción:** Excluir lead permanentemente de futuros repulses
**Cambio:** Permiso específico `exclude` (más granular que `write`)

---

## Patrón de Migración Usado

### Opción 1: Import estático (para archivos con pocas dependencias)
```typescript
import { checkPermission } from '@/lib/permissions/server';
import { PERMISOS_LEADS } from '@/lib/permissions/types';

export async function myAction(...) {
  const permissionCheck = await checkPermission(
    PERMISOS_LEADS.WRITE.modulo,
    PERMISOS_LEADS.WRITE.accion
  );
  if (!permissionCheck.ok) {
    return { success: false, message: permissionCheck.error || 'No autorizado' };
  }
  // ... lógica
}
```

### Opción 2: Dynamic import (para archivos con muchas dependencias)
```typescript
export async function myAction(...) {
  const { checkPermission } = await import('@/lib/permissions/server');
  const { PERMISOS_LOCALES } = await import('@/lib/permissions/types');

  const permissionCheck = await checkPermission(
    PERMISOS_LOCALES.DELETE.modulo,
    PERMISOS_LOCALES.DELETE.accion
  );
  if (!permissionCheck.ok) {
    return { success: false, message: permissionCheck.error || 'No autorizado' };
  }
  // ... lógica
}
```

**¿Por qué dynamic import en algunos casos?**
- Evitar circular dependencies en archivos que tienen muchas importaciones
- Mantener el bundle size pequeño
- Pattern recomendado por Next.js para Server Actions

---

## Validación y Testing

### 1. Verificar que las funciones aún compilan
```bash
npm run build
```

### 2. Testing funcional (después de activar RBAC)
```bash
# En .env.local
ENABLE_RBAC=true

# Probar cada función con diferentes roles
```

### 3. Escenarios de prueba críticos

| Función | Rol con permiso | Rol sin permiso | Resultado esperado |
|---------|-----------------|-----------------|-------------------|
| `assignLeadToVendedor` | admin, jefe_ventas | vendedor | Error: "No autorizado" |
| `updateLocalEstado` | admin, jefe_ventas, vendedor | finanzas | Error: "No autorizado" |
| `deleteLocal` | admin | todos los demás | Error: "No autorizado" |
| `createUsuario` | admin | todos los demás | Error: "No autorizado" |
| `toggleUsuarioActivo` | admin | todos los demás | Error: "No autorizado" |
| `registrarAbono` | admin, finanzas, jefe_ventas | vendedor | Error: "No autorizado" |
| `addLeadToRepulse` | admin, jefe_ventas, marketing | vendedor | Error: "No autorizado" |
| `excluirLeadDeRepulse` | admin, marketing | todos los demás | Error: "No autorizado" |

---

## Funciones Pendientes de Migración (prioridad media-baja)

### `lib/actions.ts`
- `importManualLeads` → `leads:import`
- `createManualLead` → `leads:write`
- (otras funciones de leads según necesidad)

### `lib/actions-locales.ts`
- `importLocales` → `locales:import`
- `desbloquearLocal` → `locales:admin`
- `updateMontoVenta` → `locales:write`
- `saveDatosRegistroVenta` → `ventas:write`
- `salirDeNegociacion` → `locales:write`
- `updatePrecioBase` → `locales:write`

### `lib/actions-usuarios.ts`
- `updateUsuario` → `usuarios:write`
- `resetUsuarioPassword` → `usuarios:write`
- `bulkCreateUsuarios` → `usuarios:write` + `usuarios:import`
- `reemplazarUsuario` → `usuarios:write` + `usuarios:delete`
- `getUsuariosStats` → `usuarios:read_all`

### `lib/actions-pagos.ts`
- `toggleSeparacionPagada` → `control_pagos:write`
- `toggleVerificacionAbono` → `control_pagos:verify`

### `lib/actions-repulse.ts`
- `createRepulseTemplate` → `repulse:config`
- `updateRepulseTemplate` → `repulse:config`
- `deleteRepulseTemplate` → `repulse:config`
- `addMultipleLeadsToRepulse` → `repulse:write`
- `removeLeadFromRepulse` → `repulse:write`
- `registrarEnvioRepulse` → `repulse:write`
- `prepararEnvioRepulseBatch` → `repulse:write`

---

## Beneficios de la Migración

### ✅ Seguridad
- Validación centralizada de permisos
- Auditoría automática de intentos no autorizados
- Menos código de validación duplicado

### ✅ Mantenibilidad
- Lógica de permisos en un solo lugar
- Fácil actualizar permisos sin tocar business logic
- Documentación clara de qué permisos requiere cada acción

### ✅ Escalabilidad
- Agregar nuevos permisos sin modificar Server Actions
- Sistema de Permission Sets para casos especiales
- Rollout gradual (feature flag ENABLE_RBAC)

---

## Métricas de la Migración

- **Funciones críticas migradas:** 8/8 ✅
- **Archivos modificados:** 5
- **Líneas agregadas (aprox):** ~80
- **Permisos utilizados:** 8 diferentes
- **Tiempo estimado de rollout:** 2 semanas (testing + gradual activation)

---

## Próximos Pasos

1. **Testing manual** con diferentes roles (Admin, Jefe Ventas, Vendedor, Finanzas)
2. **Activar RBAC en staging** (`ENABLE_RBAC=true`)
3. **Migrar funciones de prioridad media** (importación masiva, exportes)
4. **Rollout gradual en producción** (por proyecto, luego global)
5. **Migración de API Routes** usando middleware RBAC

---

**Documentación relacionada:**
- `docs/rbac/PLAN_MAESTRO_RBAC.md` - Plan completo del sistema
- `lib/permissions/server.ts` - HOF y helpers RBAC
- `lib/permissions/types.ts` - Catálogo de permisos
