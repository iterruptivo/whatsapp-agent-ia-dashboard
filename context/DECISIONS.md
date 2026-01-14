# DECISIONS - EcoPlaza Dashboard

> Decisiones tecnicas y de negocio con su justificacion.

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
