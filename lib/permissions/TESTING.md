# Testing del Sistema RBAC

Guía completa para probar el nuevo sistema de permisos granulares.

## Prerrequisitos

1. Sistema instalado (Fase 1 completa)
2. Acceso a ambiente de testing (Proyecto Pruebas en Supabase)
3. Credenciales de testing para cada rol

---

## Credenciales de Testing

```typescript
// Usar SIEMPRE proyecto de pruebas
const TESTING_CREDENTIALS = {
  admin: {
    email: 'gerencia@ecoplaza.com',
    password: 'q0#CsgL8my3$',
  },
  jefe_ventas: {
    email: 'leojefeventas@ecoplaza.com',
    password: '67hgs53899#',
  },
  vendedor: {
    email: 'alonso@ecoplaza.com',
    password: 'Q0KlC36J4M_y',
  },
  vendedor_caseta: {
    email: 'leocaseta@ecoplaza.com',
    password: 'y62$3904h%$$3',
  },
  finanzas: {
    email: 'rosaquispef@ecoplaza.com',
    password: 'u$432##faYh1',
  },
};
```

---

## Test Suite 1: Activación del Sistema

### Test 1.1: Feature Flag Deshabilitado (Estado Default)

**Setup:**
```env
ENABLE_RBAC=false
```

**Pasos:**
1. Login como cualquier usuario
2. Navegar por el dashboard
3. Verificar logs del middleware

**Expected:**
```bash
[MIDDLEWARE] 🔓 Using legacy role-based validation
# NO debe aparecer "RBAC enabled"
```

**Resultado:** Sistema funciona igual que antes ✅

---

### Test 1.2: Activar Feature Flag

**Setup:**
```env
ENABLE_RBAC=true
```

**Pasos:**
1. Reiniciar servidor: `npm run dev`
2. Login como Admin
3. Navegar a `/` (insights)

**Expected:**
```bash
[MIDDLEWARE] 🔐 RBAC enabled - checking permissions for: /
[MIDDLEWARE] Route requires permission: insights:read
[MIDDLEWARE] ✅ Access GRANTED - User has permission: insights:read
```

**Resultado:** RBAC activado correctamente ✅

---

## Test Suite 2: Permisos por Rol

### Test 2.1: Admin (Acceso Universal)

**Login:** `gerencia@ecoplaza.com`

**Rutas a probar:**

| Ruta | Expected | Permiso Requerido |
|------|----------|-------------------|
| `/` | ✅ ALLOW | `insights:read` |
| `/operativo` | ✅ ALLOW | `leads:read` |
| `/locales` | ✅ ALLOW | `locales:read` |
| `/control-pagos` | ✅ ALLOW | `control_pagos:read` |
| `/comisiones` | ✅ ALLOW | `comisiones:read` |
| `/repulse` | ✅ ALLOW | `repulse:read` |
| `/aprobaciones` | ✅ ALLOW | `aprobaciones:read` |
| `/admin/usuarios` | ✅ ALLOW | `usuarios:read` |
| `/configuracion-proyectos` | ✅ ALLOW | `proyectos:read` |

**Logs esperados:**
```bash
[MIDDLEWARE] ✅ Access GRANTED - User has permission: [permiso]
# Admin NUNCA debe ver "Access DENIED"
```

---

### Test 2.2: Jefe Ventas (Gestión Completa)

**Login:** `leojefeventas@ecoplaza.com`

**Rutas PERMITIDAS:**

| Ruta | Expected | Permiso |
|------|----------|---------|
| `/` | ✅ ALLOW | `insights:read` |
| `/operativo` | ✅ ALLOW | `leads:read` |
| `/locales` | ✅ ALLOW | `locales:read` |
| `/control-pagos` | ✅ ALLOW | `control_pagos:read` |
| `/comisiones` | ✅ ALLOW | `comisiones:read_all` |
| `/repulse` | ✅ ALLOW | `repulse:read` |
| `/aprobaciones` | ✅ ALLOW | `aprobaciones:read` |

**Rutas DENEGADAS:**

| Ruta | Expected | Redirect a |
|------|----------|------------|
| `/admin/usuarios` | ❌ DENY | `/` |
| `/configuracion-proyectos` | ❌ DENY | `/` |

**Logs esperados (deny):**
```bash
[MIDDLEWARE] ❌ Access DENIED - User does not have permission: usuarios:read
[MIDDLEWARE] User: leojefeventas@ecoplaza.com Role: jefe_ventas
[MIDDLEWARE] AUDIT: Unauthorized access attempt to /admin/usuarios by leojefeventas@ecoplaza.com
[MIDDLEWARE] Redirecting to: /
```

---

### Test 2.3: Vendedor (Solo Operativo)

**Login:** `alonso@ecoplaza.com`

**Rutas PERMITIDAS:**

| Ruta | Expected | Permiso |
|------|----------|---------|
| `/operativo` | ✅ ALLOW | `leads:read` |
| `/locales` | ✅ ALLOW | `locales:read` |
| `/comisiones` | ✅ ALLOW | `comisiones:read` |

**Rutas DENEGADAS:**

| Ruta | Expected | Redirect a |
|------|----------|------------|
| `/` | ❌ DENY | `/operativo` |
| `/control-pagos` | ❌ DENY | `/operativo` |
| `/repulse` | ❌ DENY | `/operativo` |
| `/aprobaciones` | ❌ DENY | `/operativo` |
| `/admin/usuarios` | ❌ DENY | `/operativo` |

---

### Test 2.4: Vendedor Caseta (Solo Locales)

**Login:** `leocaseta@ecoplaza.com`

**Rutas PERMITIDAS:**

| Ruta | Expected | Permiso |
|------|----------|---------|
| `/locales` | ✅ ALLOW | `locales:read` |
| `/operativo` | ✅ ALLOW | `leads:read` |

**Rutas DENEGADAS:**

| Ruta | Expected | Redirect a |
|------|----------|------------|
| `/` | ❌ DENY | `/locales` |
| `/control-pagos` | ❌ DENY | `/locales` |
| `/comisiones` | ❌ DENY | `/locales` |
| `/repulse` | ❌ DENY | `/locales` |

---

### Test 2.5: Finanzas (Solo Control de Pagos)

**Login:** `rosaquispef@ecoplaza.com`

**Rutas PERMITIDAS:**

| Ruta | Expected | Permiso |
|------|----------|---------|
| `/control-pagos` | ✅ ALLOW | `control_pagos:read` |

**Rutas DENEGADAS:**

| Ruta | Expected | Redirect a |
|------|----------|------------|
| `/` | ❌ DENY | `/control-pagos` |
| `/operativo` | ❌ DENY | `/control-pagos` |
| `/locales` | ❌ DENY | `/control-pagos` |
| `/comisiones` | ❌ DENY | `/control-pagos` |
| `/repulse` | ❌ DENY | `/control-pagos` |
| `/aprobaciones` | ❌ DENY | `/control-pagos` |

---

## Test Suite 3: Cache Performance

### Test 3.1: Cache Hit Rate

**Objetivo:** Verificar que cache funciona correctamente

**Pasos:**
1. Login como vendedor
2. Navegar a `/operativo` (primera vez)
3. Esperar 2 segundos
4. Recargar página (F5)
5. Recargar nuevamente

**Expected:**
```bash
# Primera vez (cache miss):
[MIDDLEWARE] Cache miss, fetching from DB
[MIDDLEWARE] ✅ User data cached successfully
[MIDDLEWARE] ✅ Access GRANTED - User has permission: leads:read

# Segunda vez (cache hit):
[MIDDLEWARE] ✅ Using cached user data (age: 2 seconds)
[MIDDLEWARE] ✅ Access GRANTED - User has permission: leads:read

# Tercera vez (cache hit):
[MIDDLEWARE] ✅ Using cached user data (age: 4 seconds)
[MIDDLEWARE] ✅ Access GRANTED - User has permission: leads:read
```

**Resultado:** Cache hit rate > 90% ✅

---

### Test 3.2: Cache Expiration

**Objetivo:** Verificar que cache expira después de 5 min

**Pasos:**
1. Login como vendedor
2. Navegar a `/operativo`
3. Esperar 6 minutos (o modificar TTL temporalmente)
4. Navegar a otra ruta

**Expected:**
```bash
[MIDDLEWARE] Cache expired, removing stale entry
[MIDDLEWARE] Cache miss, fetching from DB
[MIDDLEWARE] ✅ User data cached successfully
```

**Resultado:** Cache expira correctamente ✅

---

## Test Suite 4: Edge Cases

### Test 4.1: Ruta No Mapeada

**Objetivo:** Verificar fallback a legacy cuando ruta no está en `ROUTE_PERMISSIONS`

**Pasos:**
1. Agregar ruta nueva al proyecto (ej: `/test-page`)
2. NO agregar a `ROUTE_PERMISSIONS`
3. Navegar a `/test-page`

**Expected:**
```bash
[MIDDLEWARE] 🔐 RBAC enabled - checking permissions for: /test-page
[MIDDLEWARE] ℹ️ Route has no specific permission - allowing access
[MIDDLEWARE] ⚠️ Falling back to legacy validation
```

**Resultado:** Sistema funciona sin romper ✅

---

### Test 4.2: Usuario sin Cache (Graceful Degradation)

**Objetivo:** Verificar que sistema funciona si cache falla

**Pasos:**
1. Login como vendedor
2. Simular cache corrupto (modificar código temporalmente)
3. Navegar a `/operativo`

**Expected:**
```bash
[MIDDLEWARE] ⚠️ Permission cache miss - falling back to legacy validation
[MIDDLEWARE] ⚠️ Falling back to legacy validation
# Sistema DEBE permitir acceso si rol legacy lo permite
```

**Resultado:** Graceful degradation funciona ✅

---

### Test 4.3: Redirect Loop Prevention

**Objetivo:** Verificar que no hay loops infinitos de redirect

**Pasos:**
1. Login como finanzas
2. Intentar acceder `/operativo`
3. Debe redirect a `/control-pagos`
4. Debe cargar `/control-pagos` sin loops

**Expected:**
```bash
[MIDDLEWARE] ❌ Access DENIED - User does not have permission: leads:read
[MIDDLEWARE] Redirecting to: /control-pagos

# Luego:
[MIDDLEWARE] 🔐 RBAC enabled - checking permissions for: /control-pagos
[MIDDLEWARE] ✅ Access GRANTED - User has permission: control_pagos:read
```

**Resultado:** No hay loops ✅

---

## Test Suite 5: Auditoría

### Test 5.1: Logs de Acceso Denegado

**Objetivo:** Verificar que intentos no autorizados se loggean

**Pasos:**
1. Login como vendedor
2. Intentar acceder `/admin/usuarios` manualmente
3. Verificar logs

**Expected:**
```bash
[MIDDLEWARE] AUDIT: Unauthorized access attempt to /admin/usuarios by alonso@ecoplaza.com
```

**Resultado:** Auditoría funciona ✅

---

## Test Suite 6: Compatibilidad

### Test 6.1: Sistema Legacy Inalterado

**Setup:**
```env
ENABLE_RBAC=false
```

**Objetivo:** Verificar que sistema legacy no se rompió

**Pasos:**
1. Ejecutar TODOS los tests de Test Suite 2
2. Sistema debe comportarse EXACTAMENTE igual que antes

**Expected:** 100% de tests pasan ✅

---

## Métricas de Éxito

### Criterios para pasar a Fase 3 (Rollout Gradual)

- [ ] 100% de tests de permisos por rol pasan
- [ ] Cache hit rate > 90%
- [ ] Cache expiration funciona correctamente
- [ ] No hay redirect loops
- [ ] Auditoría loggea correctamente
- [ ] Sistema legacy funciona igual con flag=false
- [ ] Performance < 10ms por validación (cache hit)
- [ ] Sin memory leaks después de 1 hora de testing

### Performance Benchmarks

**Target (cache hit):**
- Middleware total: < 50ms
- Validación RBAC: < 10ms
- Cache lookup: < 1ms

**Target (cache miss):**
- Middleware total: < 200ms
- Query a BD: < 50ms
- Cache set: < 1ms

---

## Troubleshooting

### Cache no funciona

**Síntomas:**
```bash
[MIDDLEWARE] Cache miss, fetching from DB
# En cada request, nunca cache hit
```

**Solución:**
1. Verificar que `ENABLE_RBAC=true`
2. Verificar que `setCachedPermissions()` se llama
3. Verificar que `userCache.set()` se ejecuta

---

### Redirect loop

**Síntomas:** Página carga infinitamente

**Solución:**
1. Verificar `redirectOnDeny` en route-permissions
2. Verificar `getDefaultRouteForRole()` retorna ruta válida
3. Verificar que ruta de redirect tiene permisos

---

### Performance degradado

**Síntomas:** Dashboard lento con RBAC habilitado

**Solución:**
1. Verificar cache hit rate (debe ser > 90%)
2. Aumentar TTL si necesario
3. Verificar queries a BD

---

## Checklist Final

Antes de pasar a Producción:

- [ ] Todos los tests de esta guía pasan
- [ ] Testing con 5 usuarios simultáneos (1 por rol)
- [ ] Testing con recarga de página 10+ veces (cache)
- [ ] Testing de redirect loops en todas las combinaciones
- [ ] Logs de auditoría funcionando
- [ ] Performance dentro de targets
- [ ] Feature flag probado en ambos estados (true/false)
- [ ] Documentación actualizada
- [ ] Rollback plan documentado

---

**Última Actualización:** 11 Enero 2026
**Próximo paso:** Ejecutar Test Suite 1 y 2 completamente
