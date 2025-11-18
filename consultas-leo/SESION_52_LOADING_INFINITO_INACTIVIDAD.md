# SESIÓN 52 - Loading Infinito Post-Inactividad (INVESTIGACIÓN + 2 INTENTOS FALLIDOS)

**Fecha:** 18 Noviembre 2025
**Tipo:** Bug Critical - Investigation + Failed Fixes
**Complejidad:** Alta
**Estado:** ⚠️ **WORKAROUND DOCUMENTADO - FIX PENDIENTE**
**Duración:** 4 horas

---

## 📋 CONTEXTO

### Problema Reportado por Usuario

**Síntoma:**
- Usuario deja dashboard inactivo 5-10 minutos (cambia de tab)
- Usuario vuelve y hace click para navegar a otra página
- Dashboard se queda en **loading infinito** (animación de cargando)
- **Workaround:** Refresh manual (F5) permite continuar

**Reproducción:**
1. Login exitoso → Dashboard funcional
2. Dejar tab inactivo 5-10 min
3. Volver al tab → Click para navegar (ej: Dashboard → Operativo)
4. **BUG:** Animación de loading infinito
5. **Solución temporal:** F5 (hard refresh)

**Versión afectada:** OPCIÓN B (95%) - commit `cb5bfe4`

---

## 🔍 ANÁLISIS INICIAL

### Análisis Project Leader (Interno)

**Root cause identificado (INCOMPLETO):**
- `selectedProyecto` se pierde del React Context después de inactividad
- `useEffect` de fetch tiene condición `if (selectedProyecto && user)` → NO ejecuta
- `setLoading(false)` nunca se llama → loading infinito

**Propuesta inicial:**
- FIX #1: Recuperar `selectedProyecto` desde sessionStorage
- FIX #2: Condición de loading más inteligente
- FIX #3: Respetar `skipLogoutOnError`

**Evaluación:** ❌ Análisis superficial, enfocado en SÍNTOMAS no CAUSA RAÍZ

---

### Análisis Codex (Externo - CORRECTO)

**Root cause REAL:**

> "El backend invalida tu sesión cuando vuelves después de estar inactivo, pero el estado React sigue creyendo que sigues logueado hasta que haces un refresh completo."

**Problema técnico:**
1. **Cliente Supabase sin configuración explícita:**
   - `createBrowserClient` sin opciones → comportamiento inconsistente
   - Auto-refresh de JWT no funciona correctamente
   - Chrome retrasa renovación en tabs inactivos

2. **TOKEN_REFRESHED ignorado:**
   - Handler actual solo hace `console.log` (línea 417-421 auth-context.tsx)
   - React state nunca se entera de refresh exitoso/fallido
   - Sesión expirada no detectada hasta navegación

3. **Navegación con sesión expirada:**
   - Usuario click → middleware valida cookie → `getUser()` falla
   - Middleware marca `validatedUser = null` → redirect `/login`
   - Navegación client-side → UI queda en loading esperando datos que nunca llegarán
   - Redirect ocurrió en servidor, UI nunca se entera

**Evidencia en logs:**
```
[AUTH] Session validation failed: Auth session missing!
[AUTH] No session found, but skipping logout (initial load)
[AUTH] Session validation failed on init, logging out  ← CONTRADICCIÓN
```

**Solución propuesta (3 fixes):**
1. Configurar cliente Supabase explícitamente (persistSession, autoRefreshToken, storage)
2. Manejar TOKEN_REFRESHED correctamente (revalidar + actualizar estado)
3. Listener visibilitychange (revalidar al volver de inactividad)

---

## 🔨 INTENTO #1 - IMPLEMENTACIÓN LITERAL DE CODEX (FALLÓ)

### Cambios Implementados

**Commits:**
- `e7b16ee` - FIX #1: Configuración explícita Supabase client
- `d309638` - FIX #2 & #3: TOKEN_REFRESHED + Visibilitychange

**Archivos modificados:**
- `lib/supabase.ts` (+14 líneas, -1 línea)
- `lib/auth-context.tsx` (+60 líneas, -4 líneas)

### FIX #1 (INTENTO 1): Configuración Supabase

**Código implementado:**
```typescript
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,  // ← ERROR
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,  // ← ERROR CRÍTICO
    storageKey: 'ecoplaza-auth',
  },
});
```

**Intención:**
- Auto-refresh consistente de JWT
- Persistencia de sesión explícita

### FIX #2 (INTENTO 1): TOKEN_REFRESHED Handler

**Código implementado:**
```typescript
if (event === 'TOKEN_REFRESHED') {
  console.log('[AUTH] Token refreshed, revalidating user data');

  const { data: { session: newSession } } = await supabase.auth.getSession();

  if (newSession?.user) {
    setSupabaseUser(newSession.user);
    const userData = await fetchUserDataWithTimeout(newSession.user, 30000);
    if (userData) {
      setUser(userData);
      loginTimestamp.current = Date.now();
    }
  } else {
    await supabase.auth.signOut();
    router.push('/login');
  }
  return;
}
```

**Intención:**
- React se entera de refresh exitoso/fallido
- Estado actualizado automáticamente

### FIX #3 (INTENTO 1): Visibilitychange Listener

**Código implementado:**
```typescript
useEffect(() => {
  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible' && supabaseUser) {
      const { isValid } = await validateAndFetchUserData(30000, true);
      if (!isValid) {
        await supabase.auth.signOut();
        router.push('/login');
      }
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [supabaseUser]);
```

**Intención:**
- Detectar sesión expirada al volver de inactividad
- Logout automático si expiró

---

### Resultado INTENTO #1: ❌ CRÍTICO - LOGIN ROTO

**Síntoma:**
- Usuario ingresa credenciales → Click "Iniciar sesión"
- Botón se queda en "Iniciando sesión..." (spinner infinito)
- Console logs muestran:
  ```
  [AUTH] Session validation failed: Auth session missing!
  [AUTH] Session validation failed on init, logging out
  [AUTH] State changed: SIGNED_IN
  [AUTH] ✅ User already authenticated, ignoring duplicate SIGNED_IN event
  ```

**Root Cause (Análisis Codex):**

> "Al forzar `storage: window.localStorage`, los tokens ya no se escriben en las cookies (`sb-access-token`, `sb-refresh-token`). El middleware necesita esas cookies para validar la sesión desde el backend."

**Detalles técnicos:**
1. `createBrowserClient` de `@supabase/ssr` usa **storage híbrido**:
   - ✅ `localStorage` → persistencia cliente
   - ✅ **Cookies** → middleware server-side (CRÍTICO)

2. Al override con `storage: window.localStorage`:
   - ✅ Sesión se guarda en localStorage
   - ❌ **Cookies NO se escriben** (rompió sincronización)

3. Flujo roto:
   - Login exitoso → Sesión en localStorage ✅
   - `router.push('/')` → Middleware valida cookies ❌
   - Cookies vacías → `Session validation failed` → redirect `/login`
   - Loop infinito: login → redirect → login → redirect

**Verificación:**
- DevTools → Application → Cookies → **NO aparecen `sb-access-token` ni `sb-refresh-token`**
- Sin cookies → middleware SIEMPRE ve "Session missing"

**Rollback:**
```bash
git reset --hard 98ead17
git push --force
```

---

## 🔨 INTENTO #2 - FIX CORREGIDO SIN OVERRIDE STORAGE (FALLÓ)

### Cambios Implementados

**Commit:**
- `78b59c0` - SESIÓN 52 - 3 Fixes (CORREGIDO)

**Archivos modificados:**
- `lib/supabase.ts` (+9 líneas, -1 línea)
- `lib/auth-context.tsx` (+56 líneas, -6 líneas)

### FIX #1 (INTENTO 2): Configuración Supabase CORREGIDA

**Código implementado:**
```typescript
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,  // ← CAMBIADO a true
    // NO especificar storage → dejar que @supabase/ssr maneje híbrido  // ← REMOVIDO override
    storageKey: 'ecoplaza-auth',
  },
});
```

**Cambios vs Intento 1:**
- ❌ Eliminado `storage: window.localStorage`
- ✅ Cambiado `detectSessionInUrl: false` → `true`
- ✅ Mantener `persistSession`, `autoRefreshToken`, `storageKey`

**Intención:**
- Permitir que @supabase/ssr maneje storage híbrido (localStorage + cookies)
- Auto-refresh funcional
- Cookies sincronizadas correctamente

### FIX #2 y #3 (INTENTO 2): Igual que Intento 1

Mismo código que Intento 1 (TOKEN_REFRESHED handler + visibilitychange listener).

---

### Resultado INTENTO #2: ❌ CRÍTICO - LOGIN ROTO OTRA VEZ

**Síntoma:**
- **Exactamente igual** que Intento 1
- Login no funciona, spinner infinito
- Console logs idénticos

**Root Cause (Análisis Codex - DEFINITIVO):**

> "lib/supabase.ts sigue creando el cliente con `createBrowserClient` pero **sin proporcionar ningún método de cookies** (options.cookies). En ese caso, la helper reduce el storage a localStorage únicamente, con lo cual los tokens **nunca se escriben** en `sb-access-token`/`sb-refresh-token`."

**Problema fundamental:**
```typescript
// ACTUAL (INTENTO 2):
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
```

**Por qué TODAVÍA falla:**
- `createBrowserClient` **SIN** objeto `cookies: { getAll, setAll }`
- @supabase/ssr detecta: "No hay métodos de cookies → usar solo localStorage"
- Resultado: **Mismas cookies faltantes** que Intento 1
- Middleware: "Sin cookies → Session missing → redirect /login"

**Diferencia Intento 1 vs Intento 2:**
- Intento 1: `storage: localStorage` (explícito) → cookies NO escritas
- Intento 2: Sin `storage` PERO sin `cookies` methods → **mismo resultado**

**Conclusión:**
- Configurar `auth: { ... }` **NO es suficiente**
- **NECESITAMOS** implementar `cookies: { getAll, setAll }` explícitamente

**Rollback:**
```bash
git reset --hard 7da6dab
git push --force
```

---

## 🎯 SOLUCIÓN CORRECTA (Pendiente Implementación)

### Análisis Codex - Root Cause Definitivo

**Problema:**
`lib/supabase.ts` usa `createBrowserClient` **sin objeto `cookies`**

**Solución:**
Implementar `cookies: { getAll, setAll }` basados en `document.cookie`

### Código Propuesto por Codex

```typescript
import { createBrowserClient } from '@supabase/ssr'

export const createSupabaseBrowserClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return document.cookie.split('; ').map((c) => {
            const [name, ...rest] = c.split('=')
            return { name, value: rest.join('=') }
          })
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            let cookie = `${name}=${value}`
            if (options?.path) cookie += `; path=${options.path}`
            if (options?.maxAge) cookie += `; max-age=${options.maxAge}`
            if (options?.sameSite) cookie += `; samesite=${options.sameSite}`
            if (options?.secure) cookie += `; secure`
            document.cookie = cookie
          })
        },
      },
    }
  )
```

**Uso en AuthProvider:**
```typescript
// lib/auth-context.tsx
const supabaseRef = useRef(createSupabaseBrowserClient())
```

### Por qué Funcionará

1. ✅ **Cookies escritas correctamente:**
   - `setAll()` escribe `sb-access-token` y `sb-refresh-token` en `document.cookie`
   - Middleware puede leerlas desde request headers

2. ✅ **Storage híbrido real:**
   - localStorage → persistencia cliente
   - Cookies → validación server-side (middleware)

3. ✅ **Login funcional:**
   - `signInWithPassword()` → `setAll()` escribe cookies
   - `router.push('/')` → Middleware lee cookies → sesión válida ✅
   - Navegación exitosa

4. ✅ **Auto-refresh funcional:**
   - JWT refresh cada ~55min → `setAll()` actualiza cookies
   - Middleware siempre tiene tokens frescos

---

## 📊 WORKAROUND ACTUAL (Implementado)

### Estado del Dashboard

**Versión estable:** OPCIÓN B (95%) - commit `cb5bfe4` (restaurado)

**Funcionalidad:**
- ✅ Login funcional
- ✅ Navegación normal funcional
- ✅ Dashboard operativo
- ⚠️ **Bug conocido:** Loading infinito después de 10+ min inactividad

### Workaround para Usuarios

**Instrucción:**
> "Si el dashboard se queda en loading después de estar inactivo 10+ minutos, hacer **refresh manual (F5)**."

**Pasos:**
1. Dashboard en loading infinito
2. Presionar `F5` o `Ctrl + R`
3. Dashboard recarga completamente
4. Funcionalidad restaurada

**Frecuencia del bug:**
- Solo ocurre después de **10+ minutos de inactividad** (tab en background)
- NO ocurre en uso normal activo

**Impacto:**
- Bajo (workaround simple y rápido)
- Usuarios pueden continuar trabajando normalmente

---

## 📈 PLAN DE IMPLEMENTACIÓN (Futuro)

### Fase 1: Testing Local (PRÓXIMO PASO)

**Objetivo:** Implementar solución de Codex en localhost ANTES de deploy

**Pasos:**
1. Implementar código propuesto por Codex en localhost
2. Testing exhaustivo:
   - Login → ✅ debe funcionar
   - Cookies verificadas en DevTools → `sb-access-token`, `sb-refresh-token` presentes
   - Navegación normal → ✅ funcional
   - Inactividad 5 min → ✅ no loading infinito
   - Inactividad 10 min → ✅ no loading infinito
3. Solo si TODOS los tests pasan → proceder a Fase 2

**Criterio de éxito:**
- ✅ Login funcional en localhost
- ✅ Cookies presentes en DevTools
- ✅ Navegación post-inactividad funcional
- ✅ Cero regresiones

**Si falla en localhost:**
- Investigar más profundamente
- NO hacer deploy
- Buscar alternativa

---

### Fase 2: Deploy Controlado

**Solo si Fase 1 fue 100% exitosa:**

1. **Horario:** Madrugada o fin de semana (bajo tráfico)
2. **Deploy:** Push a GitHub → Vercel auto-deploy
3. **Monitoreo:** Primeras 2 horas críticas
4. **Testing producción:**
   - Login de múltiples usuarios
   - Verificar cookies en diferentes browsers (Chrome, Edge, Firefox)
   - Testing de inactividad
5. **Rollback inmediato** si cualquier issue

**Rollback plan:**
```bash
git reset --hard [commit-estable-actual]
git push --force
```

---

## 🎓 APRENDIZAJES CLAVE

### Técnicos

1. **@supabase/ssr requiere cookies explícitas:**
   - `createBrowserClient` sin `cookies: { getAll, setAll }` → solo localStorage
   - Middleware necesita cookies para validación server-side
   - **NO basta** con configurar `auth: { persistSession, autoRefreshToken }`

2. **Implementación literal de recomendaciones es peligrosa:**
   - Codex tenía razón en el problema
   - PERO la implementación literal (Intento 1) rompió todo
   - Corrección parcial (Intento 2) TODAVÍA falló
   - **Necesitamos entender COMPLETAMENTE** antes de implementar

3. **Storage híbrido es crítico:**
   - localStorage → cliente
   - Cookies → servidor (middleware)
   - Romper uno = romper flujo completo

### Proceso

1. **Testing local ANTES de deploy es CRÍTICO:**
   - Build local falló (error filesystem Windows)
   - Deployamos "a ciegas" confiando en TypeScript
   - Resultado: 2 deploys fallidos, downtime

2. **Un rollback rápido es invaluable:**
   - Tener commit estable identificado
   - Comando de rollback listo
   - Deploy de rollback inmediato

3. **Workarounds son válidos:**
   - Mejor dashboard al 95% funcional HOY
   - Que intentar fix arriesgado sin garantías

4. **Análisis externo (Codex) es valioso PERO:**
   - Verificar implementación en localhost primero
   - No deployar sin testing exhaustivo
   - Contrastar con conocimiento interno

---

## 🔗 REFERENCIAS

### Commits Importantes

**Estable actual:**
- `cb5bfe4` - OPCIÓN B (95%) - Server-side validation + query optimization

**Intentos fallidos:**
- `e7b16ee` - INTENTO 1 FIX #1 (rompió login con storage override)
- `d309638` - INTENTO 1 FIX #2 & #3 (TOKEN_REFRESHED + visibilitychange)
- `78b59c0` - INTENTO 2 CORREGIDO (login TODAVÍA roto)

**Rollbacks:**
- `98ead17` - Rollback INTENTO 1
- `7da6dab` - Rollback INTENTO 2
- `a6881ae` - Trigger Vercel deploy estable

### Documentación Relacionada

- [SESION_45_COMPLETE_AUTH_STABILITY.md](SESION_45_COMPLETE_AUTH_STABILITY.md) - Sistema 100% estable (Sesión 45)
- [SESION_51_AUTH_FINAL_98_PERCENT.md](SESION_51_AUTH_FINAL_98_PERCENT.md) - 3 fixes quirúrgicos (98%)
- [ANALISIS_TOKEN_REFRESH_CHROME.md](ANALISIS_TOKEN_REFRESH_CHROME.md) - Análisis exhaustivo token refresh
- [CLAUDE.md](../CLAUDE.md) - Índice maestro documentación

### Archivos Clave

- `lib/supabase.ts` - Configuración cliente Supabase (NECESITA cookies)
- `lib/auth-context.tsx` - AuthProvider, handlers eventos Supabase
- `middleware.ts` - Validación server-side (necesita cookies)
- `app/login/page.tsx` - Página de login

---

## 📋 CHECKLIST PRÓXIMA SESIÓN

### Pre-Implementación

- [ ] Leer esta documentación completa
- [ ] Entender por qué fallaron Intento 1 y 2
- [ ] Revisar código propuesto por Codex
- [ ] Verificar que build local funciona

### Implementación Localhost

- [ ] Implementar `cookies: { getAll, setAll }` en `lib/supabase.ts`
- [ ] Convertir export a función `createSupabaseBrowserClient()`
- [ ] Actualizar `lib/auth-context.tsx` para usar `useRef(createSupabaseBrowserClient())`
- [ ] Testing local exhaustivo (5 tests mínimo)

### Validación Localhost

- [ ] Login funcional
- [ ] Cookies presentes en DevTools (`sb-access-token`, `sb-refresh-token`)
- [ ] Navegación normal funcional
- [ ] Inactividad 5 min → no loading infinito
- [ ] Inactividad 10 min → no loading infinito

### Deploy (Solo si localhost 100% exitoso)

- [ ] Confirmar horario de bajo tráfico
- [ ] Tener rollback plan listo
- [ ] Deploy a producción
- [ ] Monitoreo 2 horas
- [ ] Testing producción (múltiples usuarios, browsers)

### Post-Deploy

- [ ] Actualizar CLAUDE.md con Sesión 52
- [ ] Actualizar docs/modulos/auth.md
- [ ] Documentar solución final si exitosa
- [ ] Marcar issue como resuelto

---

**Última Actualización:** 18 Noviembre 2025
**Versión:** 1.0
**Estado:** ⚠️ **WORKAROUND DOCUMENTADO - IMPLEMENTACIÓN PENDIENTE**

**Próxima acción:** Implementar solución Codex en **localhost** primero

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**

**Co-Authored-By:** Project Leader Claude Code
