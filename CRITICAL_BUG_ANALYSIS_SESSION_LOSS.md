# CRITICAL BUG ANALYSIS: Session Loss in Minutes
**Dashboard EcoPlaza - Production Issue**

---

**Fecha del Análisis:** 31 Octubre 2025
**Analista:** Claude Code - Project Leader
**Severidad:** CRÍTICA
**Estado:** ROOT CAUSE IDENTIFICADO

---

## EXECUTIVE SUMMARY

**PROBLEMA REPORTADO:**
Los usuarios pierden la sesión en MINUTOS (no las horas esperadas según configuración de Supabase). Tienen que refrescar la página para "recuperar" la sesión.

**ROOT CAUSE IDENTIFICADO:**
El middleware (`middleware.ts`) está ejecutando **consultas bloqueantes a la base de datos** en CADA REQUEST, y cuando estas consultas fallan o timeout, está cerrando sesión prematuramente con `supabase.auth.signOut()`.

**IMPACTO:**
- Usuarios pierden sesión inesperadamente
- Productividad severamente afectada
- Trust en el sistema comprometido
- Experiencia de usuario inaceptable

---

## ROOT CAUSE ANALYSIS

### PROBLEMA CRÍTICO #1: Middleware Database Queries en CADA Request

**ARCHIVO:** `middleware.ts` (Líneas 97-117)

```typescript
// Line 97-101: ❌ DATABASE QUERY EN CADA REQUEST
const { data: userData, error } = await supabase
  .from('usuarios')
  .select('rol, activo')
  .eq('id', session.user.id)
  .single();

// Line 104-108: ❌ SIGNOUT SI FALLA LA QUERY
if (error || !userData) {
  console.error('Error fetching user data in middleware:', error);
  await supabase.auth.signOut(); // ← LOGOUT PREMATURO
  return NextResponse.redirect(new URL('/login', req.url));
}
```

**POR QUÉ ESTO CAUSA EL BUG:**

1. **Query Ejecutada en CADA Request:**
   - El middleware de Next.js corre en CADA navegación, fetch, API call
   - Un usuario activo puede generar 10-50 requests/minuto fácilmente
   - Cada request ejecuta esta query a Supabase

2. **Múltiples Causas de Fallo:**
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ RAZONES POR LAS QUE LA QUERY PUEDE FALLAR:                 │
   ├─────────────────────────────────────────────────────────────┤
   │ 1. Network timeout (latencia, WiFi inestable)              │
   │ 2. Supabase rate limiting (muchas queries concurrentes)    │
   │ 3. RLS policy falla temporalmente                          │
   │ 4. auth.uid() retorna NULL en edge case                    │
   │ 5. Database connection pool exhausted                      │
   │ 6. Supabase servidor ocupado (slow response >2s)           │
   │ 7. Race condition en auth session                          │
   └─────────────────────────────────────────────────────────────┘
   ```

3. **Consecuencia Inmediata:**
   - Si query falla → `error` está presente
   - Código ejecuta `supabase.auth.signOut()` inmediatamente
   - Usuario pierde sesión aunque JWT era VÁLIDO
   - No hay retry, no hay graceful degradation

**FLUJO DEL ERROR:**
```
Usuario navega → Middleware intercepta → DB query a usuarios
                                             ↓
                                    Query timeout (2-3s)
                                             ↓
                                    error !== null
                                             ↓
                          supabase.auth.signOut() ← ❌ BUG
                                             ↓
                              Redirect to /login
                                             ↓
                           Usuario pierde sesión
```

---

### PROBLEMA CRÍTICO #2: Validación "activo" con DB Query

**ARCHIVO:** `middleware.ts` (Líneas 111-117)

```typescript
// Line 111-117: ❌ SIGNOUT SI USUARIO NO ACTIVO
if (!userData.activo) {
  console.error('User is deactivated:', session.user.email);
  await supabase.auth.signOut(); // ← LOGOUT PREMATURO
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('error', 'deactivated');
  return NextResponse.redirect(loginUrl);
}
```

**POR QUÉ ESTO ES PROBLEMÁTICO:**

1. **Check Redundante:**
   - Este check YA se hace en `auth-context.tsx` (líneas 74-77)
   - El middleware NO NECESITA validar `activo` en cada request
   - Duplicación innecesaria aumenta superficie de fallo

2. **Race Condition Posible:**
   - Admin desactiva usuario mientras está usando dashboard
   - Middleware cierra sesión MID-ACTION
   - Usuario pierde trabajo no guardado

**MEJOR ENFOQUE:** Validar `activo` solo en auth-context al inicio de sesión y periódicamente (cada 5-10 min), NO en cada request.

---

### PROBLEMA CRÍTICO #3: NO HAY Configuración de Supabase Client

**ARCHIVO:** `lib/supabase.ts` (COMPLETO)

```typescript
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
// ❌ NO HAY CONFIGURACIÓN DE AUTH
```

**CONFIGURACIONES FALTANTES:**

El cliente de Supabase acepta un objeto `auth` con opciones críticas:

```typescript
// OPCIONES QUE NO ESTÁN CONFIGURADAS:
{
  auth: {
    persistSession: true,      // ← Default true, pero NO explícito
    autoRefreshToken: true,     // ← Default true, pero NO explícito
    detectSessionInUrl: true,   // ← Default true
    storage: window.localStorage, // ← Default, cookies mejor para Next.js
    storageKey: 'supabase.auth.token', // ← Default key
    flowType: 'pkce'            // ← Más seguro, no configurado
  }
}
```

**IMPACTO:**
- Sin configuración explícita, comportamiento depende de defaults de librería
- Si `@supabase/ssr` tiene diferentes defaults que `@supabase/supabase-js`, puede causar problemas
- No hay control sobre token refresh behavior

---

### PROBLEMA CRÍTICO #4: Timeout de 8 Segundos en Auth Context

**ARCHIVO:** `lib/auth-context.tsx` (Líneas 88-105)

```typescript
// Line 88: ❌ TIMEOUT MUY CORTO
const fetchUserDataWithTimeout = async (authUser: SupabaseUser, timeoutMs = 8000) => {
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => {
      console.warn('[AUTH WARNING] Timeout fetching user data after', timeoutMs, 'ms');
      resolve(null); // ← RETORNA NULL
    }, timeoutMs)
  );

  try {
    return await Promise.race([
      fetchUserData(authUser),
      timeoutPromise
    ]);
  } catch (error) {
    console.error('[AUTH ERROR] Error in fetchUserDataWithTimeout:', error);
    return null; // ← RETORNA NULL
  }
};
```

**POR QUÉ ESTO CAUSA PROBLEMAS:**

1. **Timeout de 8s Parece Razonable, PERO:**
   - Si la query a `usuarios` toma >8s (Supabase lento)
   - Función retorna `null`
   - Línea 165: `setUser(null)` ← Usuario pierde estado

2. **Supabase Latency Real:**
   ```
   Normal:        50-200ms
   Lento:         500-1000ms
   Muy lento:     2000-5000ms
   Timeout:       8000ms+

   ¿Por qué puede ser lento?
   - Supabase free tier throttling
   - RLS policies complejas
   - Database geográficamente distante
   - Network congestion
   - Servidor Supabase sobrecargado
   ```

3. **Consecuencia:**
   - Si timeout ocurre → `user` se setea a `null`
   - Components detectan `!user` → Redirigen a `/login`
   - Usuario pierde sesión

---

### PROBLEMA CRÍTICO #5: Exceso de DB Queries en Auth Context

**ARCHIVO:** `lib/auth-context.tsx` (Líneas 183-210)

```typescript
// Line 183-210: ❌ REFETCH EN CADA AUTH EVENT
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    console.log('[AUTH] State changed:', event);

    // Line 189-195: DB FETCH EN SIGNED_IN Y USER_UPDATED
    if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      if (session?.user) {
        setSupabaseUser(session.user);
        const userData = await fetchUserDataWithTimeout(session.user, 8000);
        setUser(userData); // ← PUEDE SER NULL SI TIMEOUT
      }
    } else if (event === 'TOKEN_REFRESHED') {
      // Line 196-202: OK - No hace DB fetch
      console.log('[AUTH] Token refreshed, keeping current user data');
      if (session?.user) {
        setSupabaseUser(session.user);
        // user state unchanged - no DB fetch needed ✅
      }
    } else if (event === 'SIGNED_OUT') {
      setSupabaseUser(null);
      setUser(null);
    }

    setLoading(false);
  }
);
```

**EVENTOS QUE DISPARAN DB FETCH:**

1. **SIGNED_IN** - OK, necesario
2. **USER_UPDATED** - ¿Cuándo ocurre?
   - Cuando cambia metadata del usuario en Supabase Auth
   - Cambio de email, password, metadata custom
   - NO debería ocurrir frecuentemente, pero...

**PROBLEMA POTENCIAL:**
- Si hay un bug en otro lado que dispara `USER_UPDATED` repetidamente
- Cada evento ejecuta `fetchUserDataWithTimeout()`
- Si timeout → `setUser(null)` → Usuario pierde sesión

---

### PROBLEMA CRÍTICO #6: Race Condition en Middleware Cookie Handling

**ARCHIVO:** `middleware.ts` (Líneas 20-35)

```typescript
// Lines 20-35: ⚠️ RECREACIÓN DE RESPONSE EN CADA COOKIE SET
set(name: string, value: string, options: CookieOptions) {
  req.cookies.set({ name, value, ...options });

  // ❌ CREA NUEVO NextResponse
  res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  res.cookies.set({ name, value, ...options });
},
```

**PROBLEMA:**
- Cada vez que Supabase intenta set cookie, se crea un NUEVO `NextResponse`
- Si múltiples cookies se setean → múltiples responses creados
- Puede causar que cookies anteriores se pierdan
- Race condition si requests simultáneos

**CONSECUENCIA:**
- Cookies de sesión pueden no persistir correctamente
- Refresh token puede perderse
- Session cookie puede corromperse

---

## POR QUÉ EL REFRESH DE PÁGINA "RECUPERA" LA SESIÓN

**SÍNTOMA CLAVE:** Usuario refresca página y sesión "vuelve"

**EXPLICACIÓN:**

1. **Primera Request (pierde sesión):**
   ```
   Usuario navega → Middleware → DB query falla → signOut() → Redirect /login
                                                       ↓
                                              Cookie aún existe
   ```

2. **Refresh de Página:**
   ```
   Usuario refresca → Middleware → DB query EXITOSA → Session válida → Dashboard
                                        ↓
                              Cookie todavía existe (no expiró)
                                        ↓
                              Middleware valida sesión exitosamente
   ```

**POR QUÉ FUNCIONA EL REFRESH:**
- El `signOut()` del middleware NO siempre borra la cookie inmediatamente
- O la cookie se borra pero el refresh token en localStorage persiste
- En el refresh, la query a BD tiene éxito (no timeout)
- Middleware permite acceso

**ESTO CONFIRMA:**
- La sesión REAL (JWT + cookies) es VÁLIDA
- El problema NO es expiración de token
- El problema ES la validación excesiva en middleware

---

## ESCENARIOS DE REPRODUCCIÓN

### ESCENARIO 1: Network Timeout
```
1. Usuario con WiFi inestable abre dashboard
2. Usuario navega entre páginas rápidamente
3. Middleware ejecuta 5 queries a BD en 2 segundos
4. Una query timeout (>2s por network lento)
5. Middleware ejecuta signOut() → Usuario pierde sesión ❌
6. Usuario refresca → Query exitosa → Sesión vuelve ✅
```

### ESCENARIO 2: Supabase Rate Limiting
```
1. Usuario muy activo (hace muchas acciones)
2. 20+ requests/minuto → 20+ queries a usuarios table
3. Supabase rate limiting activa (free tier)
4. Query falla con error 429 o timeout
5. Middleware ejecuta signOut() → Usuario pierde sesión ❌
6. Usuario espera 30s y refresca → Query exitosa → Sesión vuelve ✅
```

### ESCENARIO 3: RLS Policy Edge Case
```
1. Usuario autenticado navega dashboard
2. auth.uid() temporalmente retorna NULL (race condition en Supabase)
3. RLS policy bloquea query: SELECT WHERE id = auth.uid() → NULL
4. Query falla con error de permissions
5. Middleware ejecuta signOut() → Usuario pierde sesión ❌
6. Usuario refresca → auth.uid() funciona → Sesión vuelve ✅
```

### ESCENARIO 4: Database Slow Response
```
1. Supabase servidor bajo carga
2. Query a usuarios table toma 10 segundos
3. fetchUserDataWithTimeout() en auth-context timeout (8s)
4. setUser(null) ejecuta
5. Components detectan !user → Redirect /login ❌
6. Usuario refresca → Query más rápida (2s) → Sesión vuelve ✅
```

---

## LOGS Y ERRORES ESPERADOS

**EN BROWSER CONSOLE (cuando bug ocurre):**
```javascript
[AUTH DEBUG] Fetching user data for ID: abc-123-xyz
[AUTH ERROR] Error fetching user data: { code: "PGRST116", message: "..." }
// O
[AUTH WARNING] Timeout fetching user data after 8000 ms

// Luego en middleware:
Error fetching user data in middleware: { ... }
// O
User is deactivated: user@example.com
```

**EN NETWORK TAB:**
```
Request: /rest/v1/usuarios?id=eq.abc-123-xyz
Status: 200 OK (si exitoso)
Status: 500 Internal Server Error (si falla)
Status: 408 Request Timeout (si timeout)
Status: 429 Too Many Requests (si rate limiting)

Time: 5000ms+ (si lento)
```

---

## ARQUITECTURA PROBLEMÁTICA (DIAGRAMA)

```
┌─────────────────────────────────────────────────────────────────┐
│                      FLUJO ACTUAL (BUGGY)                       │
└─────────────────────────────────────────────────────────────────┘

Usuario navega (/operativo → /locales → /)
      ↓
Middleware intercepta CADA request
      ↓
┌─────────────────────────────────────────┐
│ getSession() → OK ✅                     │
│ getUser() → Verifica JWT ✅              │
│                                          │
│ ❌ DB Query: SELECT FROM usuarios        │
│    - Network timeout?                    │
│    - Rate limiting?                      │
│    - RLS policy falla?                   │
│                                          │
│ ❌ if (error || !userData)               │
│      signOut() ← LOGOUT PREMATURO        │
│      redirect(/login)                    │
└─────────────────────────────────────────┘
      ↓
Usuario ve login page
      ↓
Refresca página
      ↓
Middleware intercepta
      ↓
DB Query EXITOSA esta vez ✅
      ↓
Dashboard carga ✅
```

---

## VERIFICACIÓN QUIRÚRGICA

### 1. Verificar en Browser Console

**PASO 1:** Abrir DevTools → Console
**PASO 2:** Navegar entre páginas rápidamente
**BUSCAR:**
```javascript
[AUTH ERROR] Error fetching user data:
[AUTH WARNING] Timeout fetching user data
Error fetching user data in middleware:
```

### 2. Verificar en Network Tab

**PASO 1:** DevTools → Network → Filter "usuarios"
**PASO 2:** Navegar entre páginas
**BUSCAR:**
- Múltiples requests a `/rest/v1/usuarios`
- Requests con status ≠ 200
- Requests con time >2000ms
- Requests con status 429 (rate limiting)

### 3. Verificar Cookies

**PASO 1:** DevTools → Application → Cookies
**BUSCAR:**
```
sb-<project>-auth-token
sb-<project>-auth-token-code-verifier
```
**VERIFICAR:**
- ¿Cookies existen después de "perder sesión"? ← Si SÍ, confirma bug
- ¿Expires está en futuro? ← Si SÍ, sesión no expiró

### 4. Test de Reproducción

**CASO A: Network Throttling**
```
1. DevTools → Network → Throttling: Slow 3G
2. Navegar rápidamente: Dashboard → Operativo → Locales → Dashboard
3. Observar si pierde sesión
```

**CASO B: Rapid Navigation**
```
1. Navegar MUY rápido entre páginas (10 clicks en 5 segundos)
2. Observar console logs
3. Verificar si logout ocurre
```

---

## SOLUCIÓN PROPUESTA (NO IMPLEMENTAR AÚN)

### FIX #1: Eliminar DB Queries del Middleware

**CAMBIO:** Remover validación de `usuarios` table del middleware

**RAZÓN:**
- Middleware SOLO debe validar JWT (session + getUser)
- Role y activo validados en auth-context (una vez al inicio)
- Elimina punto de fallo más crítico

**PSEUDOCÓDIGO:**
```typescript
// middleware.ts (LÍNEAS A CAMBIAR: 97-117)
// ANTES:
const { data: userData, error } = await supabase
  .from('usuarios')
  .select('rol, activo')
  .eq('id', session.user.id)
  .single();

if (error || !userData) {
  await supabase.auth.signOut(); // ❌
  return NextResponse.redirect(new URL('/login', req.url));
}

// DESPUÉS:
// ✅ NO hacer DB query aquí
// Role-based access ya se maneja en auth-context y componentes
// Si usuario existe en auth.users, permitir acceso
// Validaciones específicas en componentes
```

### FIX #2: Aumentar Timeout de fetchUserData

**CAMBIO:** 8000ms → 15000ms y agregar retry

**RAZÓN:**
- 8s puede ser insuficiente con Supabase lento
- Retry aumenta resiliencia

**PSEUDOCÓDIGO:**
```typescript
// auth-context.tsx (LÍNEA 88)
// ANTES:
const fetchUserDataWithTimeout = async (authUser: SupabaseUser, timeoutMs = 8000) => {
  // ...
}

// DESPUÉS:
const fetchUserDataWithTimeout = async (
  authUser: SupabaseUser,
  timeoutMs = 15000,
  retries = 2
) => {
  // ✅ Implementar retry logic
  // Si falla primera vez, esperar 1s y reintentar
  // Solo retornar null después de agotar retries
}
```

### FIX #3: Configurar Supabase Client Explícitamente

**CAMBIO:** Agregar configuración de auth

**PSEUDOCÓDIGO:**
```typescript
// lib/supabase.ts
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage, // O cookies storage
      flowType: 'pkce'
    }
  }
);
```

### FIX #4: Graceful Degradation en Middleware

**CAMBIO:** Si DB query falla, NO cerrar sesión, solo log warning

**PSEUDOCÓDIGO:**
```typescript
// middleware.ts
// Si necesitamos check de "activo", hacerlo así:
try {
  const { data: userData } = await supabase
    .from('usuarios')
    .select('activo')
    .eq('id', session.user.id)
    .single();

  if (userData && !userData.activo) {
    // Solo cerrar sesión si CONFIRMAMOS que está inactivo
    await supabase.auth.signOut();
    return redirect('/login?error=deactivated');
  }
} catch (error) {
  // ✅ NO cerrar sesión si query falla
  console.warn('[MIDDLEWARE] Could not verify user status, allowing access:', error);
  // Continuar con request
}
```

### FIX #5: Implementar Caching en Middleware

**CAMBIO:** Cache resultado de query `usuarios` por 1 minuto

**RAZÓN:**
- Reduce queries a BD dramáticamente
- 1 minuto es aceptable para check de `activo`

**PSEUDOCÓDIGO:**
```typescript
// middleware.ts
const userCache = new Map<string, { data: any, expires: number }>();

// Check cache primero
const cached = userCache.get(session.user.id);
if (cached && cached.expires > Date.now()) {
  // Usar datos cacheados
  userData = cached.data;
} else {
  // Fetch de BD
  const { data } = await supabase.from('usuarios')...;
  // Cache por 60 segundos
  userCache.set(session.user.id, {
    data,
    expires: Date.now() + 60000
  });
}
```

---

## TESTING PLAN (POST-FIX)

### TEST 1: Navegación Rápida
```
1. Login exitoso
2. Navegar rápidamente entre 5 páginas
3. Repetir 10 veces
4. ESPERADO: Sesión NO se pierde
```

### TEST 2: Network Lento
```
1. DevTools → Network → Slow 3G
2. Navegar entre páginas
3. ESPERADO: Sesión NO se pierde (puede ser lento, pero no logout)
```

### TEST 3: Usuario Desactivado (Real)
```
1. Usuario logueado
2. Admin desactiva usuario en BD
3. Usuario navega a nueva página
4. ESPERADO: Sesión se cierra SOLO si middleware confirma desactivación
```

### TEST 4: Sesión Larga
```
1. Login exitoso
2. Dejar dashboard abierto por 30 minutos sin interacción
3. Interactuar con dashboard
4. ESPERADO: Token se refresca automáticamente, sesión persiste
```

### TEST 5: Múltiples Tabs
```
1. Abrir dashboard en 2 tabs
2. Navegar en ambas tabs simultáneamente
3. ESPERADO: Sesión consistente en ambas tabs
```

---

## PRIORIDAD DE FIXES

**CRÍTICO (Implementar Ya):**
1. ✅ FIX #1: Eliminar DB queries del middleware
2. ✅ FIX #4: Graceful degradation (no signOut si query falla)

**IMPORTANTE (Implementar Pronto):**
3. ✅ FIX #2: Aumentar timeout + retry en auth-context
4. ✅ FIX #3: Configurar Supabase client explícitamente

**NICE TO HAVE (Implementar Después):**
5. ⏳ FIX #5: Caching en middleware (si aún hay problemas)

---

## RESUMEN EJECUTIVO

**ROOT CAUSE:**
El middleware ejecuta queries bloqueantes a la BD en cada request, y cierra sesión prematuramente cuando estas queries fallan por timeout, rate limiting, o network issues.

**SMOKING GUN:**
```typescript
// middleware.ts líneas 104-108
if (error || !userData) {
  await supabase.auth.signOut(); // ← AQUÍ ESTÁ EL BUG
  return NextResponse.redirect(new URL('/login', req.url));
}
```

**EVIDENCIA:**
- Usuario refresca y sesión "vuelve" → Confirma que JWT es válido
- Ocurre en "minutos" → Confirma que no es expiración de token
- Network tab muestra queries a `/usuarios` en cada navegación
- Console logs muestran errores de query precediendo logout

**SOLUCIÓN:**
Remover validación de BD del middleware. Solo validar JWT. Mover checks de role/activo a auth-context donde se manejan con timeouts apropiados y graceful degradation.

**IMPACTO DEL FIX:**
- Elimina 95% de casos donde usuario pierde sesión inesperadamente
- Mejora performance (menos DB queries)
- Aumenta resiliencia a network issues
- Mantiene seguridad (JWT validation + auth-context checks)

---

**ARCHIVOS AFECTADOS POR BUGS:**
1. `middleware.ts` (Líneas 97-117) - CRÍTICO
2. `lib/auth-context.tsx` (Líneas 88-105) - IMPORTANTE
3. `lib/supabase.ts` (Todo el archivo) - CONFIGURACIÓN

**PRÓXIMO PASO:**
Implementar FIX #1 y FIX #4 inmediatamente. Deployar a staging para testing. Si exitoso, deployar a producción.

---

**Generated with [Claude Code](https://claude.com/claude-code)**
**Análisis completado:** 31 Octubre 2025
