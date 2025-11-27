# 📅 SESIONES DE DESARROLLO - NOVIEMBRE 2025

## Índice de Sesiones

- [Sesión 33 (3 Nov)](#sesión-33---3-noviembre-2025) - FIX: Límite 1000 leads
- [Sesión 33B (3 Nov)](#sesión-33b---3-noviembre-2025) - DEBUG: .limit() → .range()
- [Sesión 33C (3 Nov)](#sesión-33c---3-noviembre-2025) - FASE 1: Remover JOINs (✅ EXITOSA)
- [Sesión 34 (5 Nov)](#sesión-34---5-noviembre-2025) - 3 Nuevos Proyectos + Admin Asigna Vendedor
- [Sesión 35 (5 Nov)](#sesión-35---5-noviembre-2025) - Session Loss Fix (❌ ROLLBACK)
- [Sesión 35B (5 Nov)](#sesión-35b---5-noviembre-2025) - 🔴 EMERGENCY ROLLBACK
- [Sesión 36 (5 Nov)](#sesión-36---5-noviembre-2025) - ✅ SESSION LOSS FIX: Middleware Security
- [Sesión 37 (5 Nov)](#sesión-37---5-noviembre-2025) - Import Button para Vendedor
- [Sesión 38 (5 Nov)](#sesión-38---5-noviembre-2025) - UX Mejoras Modal + Spec Asistió
- [Sesión 39 (6 Nov)](#sesión-39---6-noviembre-2025) - ✅ Timeout 8s→30s
- [Sesión 40 (7 Nov)](#sesión-40---7-noviembre-2025) - Nuevo Proyecto: Urb. San Gabriel
- [Sesión 40B (7-8 Nov)](#sesión-40b---7-8-noviembre-2025) - Flujo n8n San Gabriel
- [Sesión 40C (8 Nov)](#sesión-40c---8-noviembre-2025) - Teresa: Admin→Vendedor
- [Sesión 40D (8 Nov)](#sesión-40d---8-noviembre-2025) - Nuevo Admin: Bryan
- [Sesión 41 (8 Nov)](#sesión-41---8-noviembre-2025) - ✅ Columna "Asistió" (Tabla + Panel)
- [Sesión 41B (10 Nov)](#sesión-41b---10-noviembre-2025) - ✅ Columna "Fecha": created_at
- [Sesión 42 (10 Nov)](#sesión-42---10-noviembre-2025) - ✅ FIX CRÍTICO: Split useEffect
- [Sesión 56 (27 Nov)](#sesión-56---27-noviembre-2025) - 🔧 Validación Teléfono Por Proyecto + Precio Base Import

---

## Sesión 33 - 3 Noviembre 2025
**FIX CRÍTICO - Dashboard mostrando solo 1000 de 1406 leads**

**Problema:** Dashboard muestra "Total: 1000 leads" pero SQL muestra 1406 (-28.9% data faltante)

**Root Cause:** Supabase PostgREST límite por defecto = 1000 registros

**Solución (OPCIÓN 1):**
```typescript
// lib/db.ts línea 128-130
.order('created_at', { ascending: false })
.limit(10000); // ✅ Aumentar límite explícitamente
```

**Resultado:** Temporal (no funcionó con JOINs)

**Commit:** 3eab2d6
**Ver detalles →** [Módulo Leads](../modulos/leads.md#sesion-33)

---

## Sesión 33B - 3 Noviembre 2025
**DEBUG + FIX - Persistencia del límite de 1000**

**Problema:** `.limit(10000)` no funcionó, persiste límite de 1000

**Hallazgo:** `.limit()` FALLA con queries que usan JOINs

**Solución:**
```typescript
// Cambiar .limit(10000) → .range(0, 9999)
.order('created_at', { ascending: false})
.range(0, 9999); // ✅ Más confiable con JOINs
```

**Resultado:** Temporal (persistió límite de 1000)

**Commit:** 9cdfd61
**Ver detalles →** [Módulo Leads](../modulos/leads.md#sesion-33b)

---

## Sesión 33C - 3 Noviembre 2025
**FASE 1 IMPLEMENTADA - Remover JOINs (✅ EXITOSA)**

**Estrategia:** Fetch separado + enriquecimiento en código

**Cambio:**
- Query leads SIN JOINs
- Fetch vendedores/proyectos por separado
- Enriquecer leads en JavaScript

**Resultado:** ✅ **1,417 leads mostrados correctamente**

**Logs:**
```
[DB] ✅ Leads fetched (no JOINs): 1417
[DB] ✅ getAllLeads() FINAL COUNT: 1417
```

**Commit:** [Exitoso]
**Ver detalles →** [Módulo Leads](../modulos/leads.md#sesion-33c)

---

## Sesión 34 - 5 Noviembre 2025
**3 Nuevos Proyectos + Admin Asigna Vendedor**

**Proyectos agregados:**
1. Eco Plaza Callao - Modelo
2. Eco Plaza Callao - Centro Comercial
3. Galilea Barranco

**Feature:** Admin puede asignar vendedor a lead manualmente

**SQL:** `SQL_ADD_3_PROYECTOS.sql`

**Ver detalles →** Sesión 34 completa en CLAUDE.md (octubre)

---

## Sesión 35 - 5 Noviembre 2025
**Session Loss Fix (❌ ROLLBACK)**

**Intento:** Keyset pagination + session loss fix simultáneo

**Problema:** Login bloqueado completamente

**Causa:** Cambios en `auth-context.tsx` crearon infinite loop

**Resultado:** ROLLBACK necesario (Sesión 35B)

**Ver detalles →** [Módulo Auth](../modulos/auth.md#sesion-35)

---

## Sesión 35B - 5 Noviembre 2025
**🔴 EMERGENCY ROLLBACK - Login Completamente Bloqueado**

**Crisis:** NADIE puede acceder al dashboard

**Console:**
```
[AUTH] State changed: SIGNED_IN (repetido indefinidamente)
```

**Rollback Target:** Commit 9c8cc7b (keyset pagination, ANTES de session loss fix)

**Resultado:** ✅ Login funciona, keyset pagination mantenida

**Documentación:** `INCIDENT_REPORT_SESSION_35B.md` (500+ líneas)

**Ver detalles →** [Módulo Auth](../modulos/auth.md#sesion-35b)

---

## Sesión 36 - 5 Noviembre 2025
**✅ SESSION LOSS FIX - Middleware Security (PRODUCCIÓN ESTABLE)**

**Root Cause:** Middleware usaba `getSession()` (solo cookies) en vez de `getUser()` (valida con servidor)

**Solución:**
```typescript
// ANTES:
const { data: { session } } = await supabase.auth.getSession();

// DESPUÉS:
const { data: { user }, error } = await supabase.auth.getUser();
// ✅ Validación con servidor
```

**Cambios:** Solo middleware.ts (28 líneas modificadas)

**Resultado:**
- ✅ Login funciona perfectamente
- ✅ Warning de Vercel ELIMINADO
- ✅ Sistema ESTABLE

**Commit:** 5b90cb7

**Ver detalles →** [Módulo Auth](../modulos/auth.md#sesion-36)

---

## Sesión 37 - 5 Noviembre 2025
**Import Button para Vendedor en / y /operativo**

**Feature:** Vendedor puede importar sus propios leads desde dashboard y operativo

**Restricción:** Solo puede asignarse a sí mismo

**UI:** Botón "Importar Leads" visible para admin y vendedor

**Ver detalles →** Sesión 37 completa en CLAUDE.md

---

## Sesión 38 - 5 Noviembre 2025
**UX Mejoras Modal Vinculación + Spec Columna Asistió**

**UX Mejoras:** Modal de vinculación lead↔local mejorado

**Spec Columna Asistió:**
- Tracking de visitas físicas al proyecto
- Campo `asistio` (boolean) en tabla leads
- Se marca `true` al vincular lead con local

**Ver detalles →** [Módulo Locales](../modulos/locales.md#sesion-38)

---

## Sesión 39 - 6 Noviembre 2025
**✅ Timeout Aumentado: 8s → 30s (MEJORA #1 FASE 1)**

**Problema:** Console: `[AUTH WARNING] Timeout fetching user data after 8000 ms` → Logout automático

**Root Cause:** 8 segundos insuficiente para Supabase lento o red inestable

**Solución:**
```typescript
// lib/auth-context.tsx línea 88
const fetchUserDataWithTimeout = async (
  authUser: SupabaseUser,
  timeoutMs = 30000 // ✅ ANTES: 8000
) => { ... }
```

**Resultado:** 3.75x más tolerancia a latencia

**Commit:** a9893bb

**Ver detalles →** [Módulo Auth](../modulos/auth.md#sesion-39)

---

## Sesión 40 - 7 Noviembre 2025
**Agregar Nuevo Proyecto: Urbanización San Gabriel**

**Proyecto:**
- Nombre: Proyecto Urbanización San Gabriel
- Slug: eco-urb-san-gabriel
- ID: ab0452c0-cbc2-46f6-8360-6f1ec7ae8aa5
- Color: #8b5cf6 (púrpura violeta)

**SQL:** `SQL_ADD_PROYECTO_SAN_GABRIEL.sql`

**Ver detalles →** [Módulo Proyectos](../modulos/proyectos.md#sesion-40)

---

## Sesión 40B - 7-8 Noviembre 2025
**Configurar Flujo n8n para Apertura Temporal de Urb. San Gabriel**

**Evento:** Apertura 12 de Noviembre 2025 a las 9:30 AM

**Flujo:**
- Detección de confirmación con regex
- Horario hardcodeado temporalmente
- RAG específico: `ecoplaza-instrucciones-agente-urb-san-gabriel.txt`

**Estado:** TEMPORAL hasta después de inauguración

**Ver detalles →** [Módulo Integraciones](../modulos/integraciones.md#sesion-40b)

---

## Sesión 40C - 8 Noviembre 2025
**Actualizar Teresa: Admin → Vendedor**

**Usuario:** Teresa Del Carmen Nuñez Bohorquez

**Cambio:** rol admin → vendedor

**SQL:**
- INSERT en tabla vendedores con teléfono 51983301213
- UPDATE en tabla usuarios (rol + vendedor_id)

**SQL File:** `SQL_UPDATE_TERESA_ADMIN_TO_VENDEDOR.sql`

**Ver detalles →** [Módulo Usuarios](../modulos/usuarios.md#sesion-40c)

---

## Sesión 40D - 8 Noviembre 2025
**Agregar Nuevo Admin Bryan + Preparar Cambios**

**Nuevo Admin:** Bryan Alvarez Laguna (bryanala@ecoplaza.com)

**SQL:** `SQL_ADD_ADMIN_BRYAN.sql`

**Estado Final:**
- 2 Admins (gerente + bryan)
- 1 Jefe Ventas
- 8 Vendedores (incluyendo Teresa después de cambio)
- 11 Vendedores Caseta

**Total: 22 usuarios activos**

**Ver detalles →** [Módulo Usuarios](../modulos/usuarios.md#sesion-40d)

---

## Sesión 41 - 8 Noviembre 2025
**✅ Columna "Asistió" en Tabla + Panel de Detalles (PRODUCCIÓN)**

**Feature:** Tracking de visitas físicas al proyecto

**Backend:** Campo `asistio` (boolean, default: false)

**UI:**
- Columna "Asistió" en tabla (badges verde/gris)
- Campo en panel de detalles (4ta opción en Información de Contacto)

**Lógica:** `asistio = true` cuando lead se vincula a local

**Archivos:**
- lib/db.ts - Interface Lead
- lib/locales.ts - Backend logic
- components/dashboard/LeadsTable.tsx - Columna
- components/dashboard/LeadDetailPanel.tsx - Campo

**Commit:** 80bf4c8

**Ver detalles →** [Módulo Leads](../modulos/leads.md#sesion-41)

---

## Sesión 41B - 10 Noviembre 2025
**✅ Columna "Fecha": fecha_captura → created_at (PRODUCCIÓN)**

**Problema:** Columna "Fecha" mostraba `fecha_captura` (cuando completó datos)

**Usuario prefiere:** `created_at` (cuando entró al sistema)

**Diferencia:** created_at puede ser 26 horas antes de fecha_captura

**Cambio:** 1 línea modificada en LeadsTable.tsx
```typescript
// ANTES:
{new Date(lead.fecha_captura).toLocaleDateString('es-PE')}

// DESPUÉS:
{new Date(lead.created_at).toLocaleDateString('es-PE')}
```

**Commit:** 1c7e2c0

**Ver detalles →** [Módulo Leads](../modulos/leads.md#sesion-41b)

---

## Sesión 42 - 10 Noviembre 2025
**✅ FIX CRÍTICO: Session Loss con Split useEffect (PRODUCCIÓN ESTABLE)**

**Problema:** Users perdían sesión con "loading" infinito

**Root Cause:** useEffect único con 2 responsabilidades:
1. Auth state change listener
2. Fetch user data

Dependency `[supabaseUser?.id]` causaba infinite loop

**Solución:** Split en 2 useEffects independientes

```typescript
// useEffect #1: Solo auth listener (dependency: [])
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    setSupabaseUser(session?.user || null);
  });
  return () => subscription.unsubscribe();
}, []); // ✅ No dependency de user

// useEffect #2: Solo fetch data (dependency: [supabaseUser?.id])
useEffect(() => {
  if (!supabaseUser?.id) {
    setUser(null);
    return;
  }
  const fetchData = async () => {
    const userData = await fetchUserDataWithTimeout(supabaseUser);
    setUser(userData);
  };
  fetchData();
}, [supabaseUser?.id]); // ✅ Solo cuando auth user cambia
```

**Resultado:** Session loss COMPLETAMENTE ELIMINADO

**Commit:** [Deployed]

**Ver detalles →** [Módulo Auth](../modulos/auth.md#sesion-42)

---

## Sesión 56 - 27 Noviembre 2025
**🔧 Validación Teléfono Por Proyecto + Precio Base Import + Features UI**

**Estado:** ✅ DEPLOYED TO STAGING

### Cambio 1: Validación Teléfono GLOBAL → POR PROYECTO

**Problema:** Teléfono duplicado se validaba globalmente, impidiendo que un lead existiera en múltiples proyectos.

**Solución:** Validación ahora es `telefono + proyecto_id` (composite unique)

**Archivos modificados:**
- `lib/db.ts` - `searchLeadByPhone(phone, proyectoId?)` filtra por proyecto
- `lib/actions.ts` - `createManualLead()` valida duplicados dentro del proyecto
- `lib/actions-locales.ts` - `saveDatosRegistroVenta()` valida por proyecto
- `app/api/leads/search/route.ts` - Acepta `proyectoId` en query params

**n8n:** UPSERT cambió a `?on_conflict=telefono,proyecto_id`

### Cambio 2: Dropdowns de Proyecto Eliminados

**Antes:** Modales mostraban dropdown para seleccionar proyecto manualmente
**Después:** Proyecto viene automáticamente del login o del local seleccionado

**Modales actualizados:**
- `ComentarioNaranjaModal.tsx` - Usa `local.proyecto_id`
- `DatosRegistroVentaModal.tsx` - Usa `local.proyecto_id`
- `VisitaSinLocalModal.tsx` - Usa `selectedProyectoId` (login)

**UX:** Campo proyecto es texto fijo (no editable) con mensaje informativo

### Cambio 3: Fix Botón Validación

**Problema:** Botón submit usaba `selectedProyecto` (state) que no se actualizaba
**Solución:** Usar `local.proyecto_id` (prop) directamente

### Cambio 4: Fix PRIMARY KEY Violation

**Problema:** Tabla `leads` tenía PRIMARY KEY en `telefono`
**Solución:** PRIMARY KEY en `id`, UNIQUE constraint en `(telefono, proyecto_id)`

### Cambio 5: Precio Base en Import Excel

**Feature:** Nueva columna opcional `precio_base` en importación

**Reglas:**
- `0` → Rechazar fila
- Vacío → Dejar `null` para entrada manual
- `> 0` → Usar valor

**Archivos:**
- `lib/locales.ts` - Interface + validación
- `LocalImportModal.tsx` - Parsing + plantilla

### Cambio 6: Features UI Ocultos → Restaurados

**En main (ocultos temporalmente):**
- Sidebar: Control de Pagos, Comisiones, Configurar Proyectos
- LocalesTable: "Iniciar Registro de Venta"

**En staging:** Restaurados (commit `1ff6a91`)

### Cambio 7: Fix TypeScript

**Error:** `Property 'icon' does not exist on type 'never'`
**Causa:** `bottomItems: []` inferido como `never[]`
**Solución:** `bottomItems: [] as MenuItem[]`

### Commits
- `543517b` - feat: Add precio_base column support
- `b009235` - feat: Temporarily hide unfinished features
- `77c566f` - fix: TypeScript error
- `1ff6a91` - feat: Restore hidden features (staging)

### Merge
`main` → `staging` (Fast-forward, 16 archivos)

**Ver detalles →** [CLAUDE.md - Sesión 56](../../CLAUDE.md#sesión-56)

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
