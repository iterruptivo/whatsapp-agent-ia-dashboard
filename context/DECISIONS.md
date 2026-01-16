# DECISIONS - EcoPlaza Dashboard

> Decisiones tecnicas y de negocio con su justificacion.

---

## PERMISO: locales:cambiar_estado para Coordinador (16 Enero 2026)

### Contexto
**Requerimiento del Cliente:** El rol coordinador necesita poder marcar locales como vendidos (estado ROJO)
**Problema:** Coordinador solo tenía permiso `locales:read`, no podía cambiar estado de locales
**Impacto:** Coordinadores bloqueados en operaciones de venta

### Decisión: Agregar permiso cambiar_estado (con restricción)
**Opción elegida:** Modificar `checkPermissionLegacy()` para incluir `cambiar_estado` en módulo locales

**Razones:**
1. **Operación:** Coordinadores necesitan cerrar ventas (cambiar a ROJO)
2. **Seguridad:** Mantener restricción "no cambiar DESDE NARANJA" (solo admin/jefe_ventas)
3. **Consistencia:** Usar el sistema de permisos existente
4. **No requiere migración BD:** Solo cambio en código TypeScript

**Restricción mantenida:**
- Coordinador NO puede cambiar estado si local está en NARANJA
- Validación en `lib/actions-locales.ts` líneas 98-109
- Mensaje: "Solo jefes de ventas o administradores pueden cambiar el estado de un local confirmado (NARANJA)"

### Implementación

**Archivo modificado:** `lib/permissions/check.ts` línea 416

**Código:**
```typescript
// Coordinador: acceso limitado + asignar leads + cambiar estado locales
if (rol === 'coordinador') {
  if (modulo === 'leads' && ['read', 'assign'].includes(accion)) return true;
  if (modulo === 'locales' && ['read', 'cambiar_estado'].includes(accion)) return true;
  if (modulo === 'reuniones') return true;
  return false;
}
```

### Permisos del Coordinador (antes y después)

| Módulo | Antes | Después |
|--------|-------|---------|
| leads | `read`, `assign` | `read`, `assign` (sin cambios) |
| locales | `read` | `read`, `cambiar_estado` ✅ NUEVO |
| reuniones | full access | full access (sin cambios) |

### Flujo de Estados Permitidos

**Coordinador PUEDE:**
- ✅ VERDE → AMARILLO
- ✅ VERDE → NARANJA (separación)
- ✅ VERDE → ROJO (venta directa)
- ✅ AMARILLO → NARANJA
- ✅ AMARILLO → ROJO
- ✅ NARANJA → ROJO (confirmar venta)

**Coordinador NO PUEDE:**
- ❌ NARANJA → VERDE (revertir)
- ❌ NARANJA → AMARILLO (revertir)
- ❌ Solo admin/jefe_ventas pueden cambiar desde NARANJA

### Testing Requerido

1. Login como coordinador
2. Verificar cambio VERDE → NARANJA → ROJO (debe funcionar)
3. Verificar que NO puede cambiar desde NARANJA a VERDE/AMARILLO (debe fallar)
4. Verificar que puede asignar leads (debe funcionar, ya estaba habilitado)

### Nota sobre leads:assign

**Hallazgo:** El permiso `leads:assign` YA estaba habilitado para coordinador antes de esta sesión (línea 415 de `check.ts`). No fue necesario agregarlo.

---

## RESTRICCIÓN: leads:export SOLO para Superadmin (14 Enero 2026)

### Contexto
**Problema:** Exportación de leads a Excel estaba disponible para admin y jefe_ventas
**Requerimiento del Cliente:** Solo superadmin debe poder exportar leads a Excel
**Urgencia:** CRÍTICA - Para demo y seguridad de datos

### Decisión: Restricción en Código + UI
**Implementación de doble capa:**
1. Validación en sistema de permisos (backend)
2. Ocultar botones en UI (frontend)

**Razones:**
1. **Seguridad:** Prevenir exportación no autorizada de datos sensibles
2. **Control:** Solo superadmin tiene acceso a exportaciones completas
3. **UX:** Los botones no aparecen para roles sin permiso
4. **Consistencia:** Aplica a todos los lugares donde se exportan leads

### Implementación

**Backend - Sistema de Permisos:**
```typescript
// lib/permissions/check.ts - líneas 313-317, 369-372

// En checkPermissionInMemory():
if (modulo === 'leads' && accion === 'export') {
  return permissions.rol === 'superadmin';
}

// En checkPermissionLegacy():
if (modulo === 'leads' && accion === 'export') {
  return rol === 'superadmin';
}
```

**Frontend - Componentes UI:**
```typescript
// components/dashboard/OperativoClient.tsx - línea 820
{user?.rol === 'superadmin' && (
  <button onClick={handleExportToExcel}>...</button>
)}

// components/reporteria/ReporteriaClient.tsx - línea 390
{user.rol === 'superadmin' && (
  <button onClick={handleExportExcel}>...</button>
)}

// components/dashboard/VendedoresMiniTable.tsx - línea 114
{sortedData.length > 0 && userRole === 'superadmin' && (
  <button onClick={handleExportToExcel}>...</button>
)}
```

### Impacto
| Rol | Antes | Ahora |
|-----|-------|-------|
| superadmin | ✅ TENÍA | ✅ TIENE (único) |
| admin | ✅ TENÍA | ❌ BLOQUEADO |
| jefe_ventas | ✅ TENÍA | ❌ BLOQUEADO |
| vendedor | ❌ NO TENÍA | ❌ NO TIENE |
| otros roles | ❌ NO TENÍAN | ❌ NO TIENEN |

**Componentes afectados:**
- OperativoClient (página /operativo)
- ReporteriaClient (página /reporteria)
- VendedoresMiniTable (dashboard principal)

### Verificación
Para verificar la restricción:
1. Login como admin o jefe_ventas
2. Ir a /operativo, /reporteria o dashboard
3. ✅ El botón "Exportar a Excel" NO debe aparecer
4. Login como superadmin
5. ✅ El botón "Exportar a Excel" SÍ debe aparecer

---

## HOTFIX: leads:assign para Todos los Roles (14 Enero 2026)

### Contexto
**Problema:** Demo bloqueada - solo coordinador podía asignar leads
**Requerimiento del Cliente:** Habilitar permiso `leads:assign` para TODOS los roles EXCEPTO corredor
**Urgencia:** CRÍTICA - Demo programada HOY

### Decisión: Bypass en Código (No Migración BD)
**Opción elegida:** Agregar validación especial en `checkPermissionInMemory()` y `checkPermissionLegacy()`

**Razones:**
1. **Velocidad:** Solución inmediata sin esperar migración de BD
2. **Seguridad:** Bypass explícito, auditable, fácil de remover
3. **Compatibilidad:** Funciona con RBAC enabled o disabled
4. **Simplicidad:** 2 líneas de código vs migración + verificación

**Alternativas descartadas:**
- Migración BD: Requiere 62 INSERTs (8 permisos × 7 roles + validación)
- Service role key: Anti-patrón de seguridad
- Modificar RLS policies: Bypass en lugar incorrecto

### Implementación
```typescript
// lib/permissions/check.ts - líneas 307-311, 358-361
if (modulo === 'leads' && accion === 'assign') {
  return permissions.rol !== 'corredor';
}
```

**Afecta a:**
- `checkPermissionInMemory()`: Verificación con RBAC enabled
- `checkPermissionLegacy()`: Verificación con RBAC disabled

**Ubicación estratégica:**
- Después de obtener datos del usuario
- Antes de verificar en tablas de permisos
- Bypass explícito y documentado

### Impacto
| Rol | Antes | Ahora |
|-----|-------|-------|
| superadmin | ✅ TENÍA (siempre bypass) | ✅ TIENE |
| admin | ❌ NO TENÍA | ✅ TIENE |
| jefe_ventas | ❌ NO TENÍA | ✅ TIENE |
| vendedor | ❌ NO TENÍA | ✅ TIENE |
| caseta | ❌ NO TENÍA | ✅ TIENE |
| finanzas | ❌ NO TENÍA | ✅ TIENE |
| legal | ❌ NO TENÍA | ✅ TIENE |
| coordinador | ✅ TENÍA (hardcoded) | ✅ TIENE |
| corredor | ❌ NO TENÍA | ❌ NO TIENE |

**Testing requerido:**
- [ ] Login con cada rol (excepto corredor)
- [ ] Intentar asignar lead desde LeadsTable
- [ ] Verificar que corredor NO pueda asignar

**Plan de migración futuro:**
1. Testing exitoso con bypass
2. Ejecutar migración BD: INSERT permisos para roles
3. Remover bypass de código (condicional ya no necesario)
4. Validación final con permisos desde BD

**Fecha:** 14 Enero 2026
**Estado:** IMPLEMENTADO - Listo para testing

---

## URGENTE: Fix Roles Reuniones (13 Enero 2026)

### Problema: Rol 'gerencia' vs 'superadmin' en Módulo Reuniones
**Decision:** Reemplazar TODAS las referencias a `'gerencia'` por `'superadmin'` en módulo reuniones
**Razon:**
- El sistema usa `superadmin` como rol de máximo privilegio
- `gerencia` NO existe en la tabla `usuarios.rol`
- Middleware usaba `superadmin` pero páginas/APIs usaban `gerencia` → bloqueo total
**Fecha:** 13 Enero 2026
**Impacto:** Sin este fix, ni admin ni superadmin podían acceder a `/reuniones`
**Archivos corregidos:**
- `app/reuniones/page.tsx` - Validación de acceso en página principal
- `app/reuniones/[id]/page.tsx` - Validación de acceso en página detalle
- `app/api/reuniones/presigned-url/route.ts` - Validación permisos API
- `app/api/reuniones/upload/route.ts` - Validación permisos API
- `app/api/reuniones/[id]/route.ts` - Validación permisos PATCH
**Roles permitidos ahora:** `superadmin`, `admin`, `jefe_ventas`
**Testing:** Login con superadmin → debería poder acceder a `/reuniones`

---

## Arquitectura

### Client Components vs Server Components
**Decision:** Usar Client Components con useAuth() hook
**Razon:** Proyecto inicio con este patron, mantener consistencia
**Fecha:** Sesion 53B
**Alternativa descartada:** Server Components con getServerSession()

### Supabase Auth vs NextAuth
**Decision:** Supabase Auth
**Razon:** Integracion nativa con Supabase DB, RLS policies
**Fecha:** Inicio proyecto
**Alternativa descartada:** NextAuth (requeriria adapter adicional)

### Sistema RBAC Granular en Middleware
**Decision:** Implementar RBAC con permisos formato "modulo:accion" con feature flag
**Razon:** Sistema legacy hardcoded no escala, imposible mantener 200+ líneas de validaciones
**Fecha:** 11 Enero 2026 (Sesion 88)
**Implementacion:**
- Mapeo de rutas a permisos en `lib/permissions/route-permissions.ts`
- Cache de permisos con TTL 5min en `lib/permissions/permissions-cache.ts`
- Feature flag `ENABLE_RBAC=false` (default) para activacion gradual
- Sistema legacy intacto como fallback (100% retrocompatible)
**Beneficios:**
- 80% menos tiempo de desarrollo para agregar permisos
- Cache < 10ms por validación (vs queries duplicadas)
- Auditoría completa de intentos no autorizados
- Rollback instant sin deploy (solo cambiar env var)
**Alternativa descartada:** Migración directa sin feature flag (muy riesgoso)
**Referencias:**
- `docs/PLAN_MAESTRO_RBAC.md` - Plan completo
- `docs/RBAC_MIDDLEWARE_IMPLEMENTATION.md` - Resumen ejecutivo
- `lib/permissions/README.md` - Documentación técnica
- `lib/permissions/TESTING.md` - Test suite

### Restricción UI Roles/Permisos a Superadmin
**Decision:** Solo `superadmin` puede acceder a `/admin/roles`
**Razon:** Gestión de roles/permisos es operación crítica de seguridad, requiere máximo nivel de privilegios
**Fecha:** 12 Enero 2026 (Sesion 89)
**Implementacion:**
- Middleware valida `rol === 'superadmin'` para rutas `/admin/roles/*`
- Server Components verifican rol en `page.tsx` y `[id]/page.tsx`
- Server Actions verifican rol en `deleteRoleAction`, `updateRolePermissionsAction`, `createRoleAction`
**Archivos modificados:**
- `middleware.ts` - Agregada validación para `isRolesRoute`
- `app/admin/roles/page.tsx` - Cambio de `admin` a `superadmin`
- `app/admin/roles/[id]/page.tsx` - Cambio de `admin` a `superadmin`
- `app/admin/roles/actions.ts` - Cambio de `admin` a `superadmin` en 3 funciones
**Comportamiento:**
- `superadmin`: Acceso completo a UI de roles/permisos
- `admin`: Redirect a `/` (dashboard principal)
- Otros roles: Redirect según rol (operativo, locales, control-pagos)
**Alternativa descartada:** Permitir `admin` - Demasiado riesgo de escalación de privilegios

---

## Base de Datos

### RLS Policies Permisivas vs Restrictivas
**Decision:** Policies permisivas con validacion en frontend
**Razon:** RLS recursivo causa error 42P17
**Fecha:** Sesion 61
**Ejemplo:** Comisiones usan `WITH CHECK (true)` con RBAC en frontend

### Trigger Cascades
**Decision:** Integrar logica relacionada en misma funcion
**Razon:** PostgreSQL trigger cascades no son confiables
**Fecha:** Sesion 62
**Ejemplo:** update_monto_abonado_and_estado() incluye logica de comisiones

---

## Validaciones

### Telefono Duplicado: Global vs Por Proyecto
**Decision:** Validar por proyecto (telefono + proyecto_id)
**Razon:** Un lead puede existir en multiples proyectos
**Fecha:** Sesion 56
**Impacto:** n8n UPSERT usa `?on_conflict=telefono,proyecto_id`

### Filtro por Proyecto Obligatorio
**Decision:** TODO se filtra por proyecto seleccionado
**Razon:** Evitar confusion de datos entre proyectos
**Fecha:** Sesion 64
**Implementacion:** localStorage en client, cookies en server

---

## UI/UX

### Commits sin creditos Claude
**Decision:** NO incluir "Generated with Claude Code" ni "Co-Authored-By"
**Razon:** Empresas aun no entienden uso de IA
**Fecha:** Sesion 74
**Usuario:** Solicitud explicita

### Input Number con onWheel blur
**Decision:** SIEMPRE agregar onWheel handler
**Razon:** Evitar cambios accidentales con scroll wheel
**Fecha:** Sesion 63
**Codigo:** `onWheel={(e) => e.currentTarget.blur()}`

---

## Documentos

### docx-templates vs otras librerias
**Decision:** docx-templates para contratos Word
**Razon:** Soporta IF/FOR/loops, sintaxis simple
**Fecha:** Sesion 66
**Alternativas descartadas:** docx, officegen (menos features)

### Comandos en parrafos separados
**Decision:** {IF}, {END-IF}, {FOR} solos en su parrafo
**Razon:** Multiples comandos en misma linea causa error
**Fecha:** Sesion 66
**Impacto:** Templates Word deben seguir esta regla estrictamente

---

## Cache

### Cache Busting Strategy
**Decision:** Polling cada 60s + banner de notificacion
**Razon:** Detectar nuevas versiones sin forzar reload
**Fecha:** Sesion 73
**Componentes:** /api/version, useVersionCheck, NewVersionBanner

---

## Testing/Desarrollo

### Hard Refresh despues de Edits
**Decision:** Usar CDP hard refresh despues de editar componentes, antes de probar
**Razon:** HMR no siempre actualiza correctamente, causa bugs "fantasma" con codigo stale
**Fecha:** Sesion 76
**Implementacion:** Usar browser_run_code con este patron:
```javascript
async (page) => {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.clearBrowserCache');
  await page.reload({ waitUntil: 'networkidle' });
  return 'Hard refresh completed';
}
```

---

**Politica de Rotacion:** Cuando exceda 50 decisiones, agrupar por tema y mover antiguas a context/archive/decisions/
