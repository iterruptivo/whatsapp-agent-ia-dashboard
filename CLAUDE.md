# 🤖 CLAUDE CODE - Dashboard EcoPlaza
**Índice Maestro de Documentación**

> **DOCUMENTACIÓN MODULAR:** Este archivo es el índice central. Consulta los módulos y sesiones para detalles completos.

---

## 🔄 ÚLTIMA ACTUALIZACIÓN

**Fecha:** 27 Noviembre 2025
**Sesión:** 56 - 🔧 **Validación Teléfono Por Proyecto + Precio Base Import + Features UI**
**Estado:** ✅ **DEPLOYED TO STAGING**
**Documentación:** Ver "Últimas 5 Sesiones" abajo

---

## 📊 ESTADO DEL PROYECTO

### **Módulos Activos**
| Módulo | Estado | Última Actualización | Métricas |
|--------|--------|---------------------|----------|
| [Autenticación](docs/modulos/auth.md) | ✅ **100% ESTABLE** | **Sesión 45I (13 Nov)** | **Uptime: 100% • 2+ hrs sesión** |
| [Leads](docs/modulos/leads.md) | ✅ OPERATIVO | Sesión 44 (12 Nov) | 1,417 leads |
| [Locales](docs/modulos/locales.md) | ✅ OPERATIVO | **Sesión 52H (22 Nov)** | 823 locales |
| [Usuarios](docs/modulos/usuarios.md) | ✅ OPERATIVO | Sesión 40D (8 Nov) | 22 usuarios |
| [Proyectos](docs/modulos/proyectos.md) | ✅ OPERATIVO | Sesión 40B (8 Nov) | 7 proyectos |
| [Integraciones](docs/modulos/integraciones.md) | ✅ OPERATIVO | Sesión 40B (8 Nov) | 3 flujos n8n |

### **Métricas Globales (Actualizado: 10 Nov 2025)**
```
Total Leads:        1,417
Total Locales:      823
Usuarios Activos:   22
  - Admins:         2 (gerente, bryan)
  - Jefe Ventas:    1
  - Vendedores:     8
  - Vendedor Caseta: 11
Proyectos:          7
Flujos n8n Activos: 3
Uptime General:     99.9%
```

---

## 📚 DOCUMENTACIÓN POR CATEGORÍA

### **🔧 Módulos Funcionales**

Cada módulo contiene: Estado actual, sesiones relacionadas, funcionalidades, código relevante, mejoras pendientes.

- **[Autenticación](docs/modulos/auth.md)** - Login, session management, middleware security
  - Última sesión: **45I (Sistema 100% Estable)**
  - Estado: **100% ESTABLE** (session loss eliminado, auto-refresh JWT sin logout, cache localStorage)

- **[Leads](docs/modulos/leads.md)** - Captura, gestión, import manual
  - Última sesión: **46B (UX: Usuario controla actualización dashboard)**
  - Estado: OPERATIVO (1,417 leads con keyset pagination)

- **[Locales](docs/modulos/locales.md)** - Semáforo, monto de venta, tracking, PDF financiamiento
  - Última sesión: **54 (Sistema Control de Pagos)**
  - Estado: OPERATIVO (823 locales con real-time + PDF + control de pagos post-venta)

- **[Usuarios](docs/modulos/usuarios.md)** - Roles, permisos, CRUD
  - Última sesión: 40D (Nuevo admin Bryan)
  - Estado: OPERATIVO (22 usuarios activos)

- **[Proyectos](docs/modulos/proyectos.md)** - Gestión multiproyecto + configuración TEA/cuotas
  - Última sesión: **51 (Sistema configuración completo)**
  - Estado: OPERATIVO (7 proyectos + configuraciones)

- **[Integraciones](docs/modulos/integraciones.md)** - n8n, webhooks, WhatsApp
  - Última sesión: 43 (Rubro opcional Callao)
  - Estado: OPERATIVO (3 flujos activos)

---

### **📅 Sesiones de Desarrollo**

Documentación cronológica completa de todas las sesiones.

- **[Octubre 2025](docs/sesiones/2025-10-octubre.md)** - Sesiones 24-32
  - Sistema de Locales (26-27)
  - Session Loss Analysis (28-29)
  - Monto de Venta + Roles (30)
  - Búsqueda Exacta + Import Manual (31)
  - Actualización n8n Callao (32)

- **[Noviembre 2025](docs/sesiones/2025-11-noviembre.md)** - Sesiones 33-56
  - Fix Límite 1000 Leads (33-33C) ✅
  - Emergency Rollback (35B) 🔴
  - Middleware Security (36) ✅
  - Timeout 30s (39) ✅
  - Columna Asistió (41) ✅
  - Split useEffect (42) ✅
  - Rubro Opcional Callao (43) ✅
  - Panel Entrada Manual Leads (44) ✅
  - **Sistema Auth 100% Estable (45A-45I)** ✅ 🎯
  - **Fix PGRST116 Import Manual + UX (46A-46B)** ✅
  - **Modal Comentario Obligatorio NARANJA (48C)** ✅
  - **Validación Teléfono Por Proyecto + Precio Base Import (56)** ✅

---

### **⏳ Mejoras Pendientes**

Optimizaciones y features futuras identificadas pero no implementadas.

- **[Roadmap Sistema de Documentación](docs/ROADMAP_MEJORAS_DOCUMENTACION.md)** 📋
  - Solución #1: Reestructuración Modular ✅ IMPLEMENTADA (10 Nov 2025)
  - Solución #2: Python CLI Knowledge Navigator (3-6 meses)
  - Solución #3: Embeddings + Semantic Search (8-12 meses)
  - Solución #4: AI-Powered Project Assistant (12+ meses)

- **[Auth Improvements](docs/mejoras-pendientes/auth-improvements.md)**
  - Mejora #1: Retry logic con backoff (FASE 1 completada - timeout 30s)
  - Mejora #2: Configuración explícita Supabase client
  - Mejora #3: Caching de query usuarios en middleware

- **Paginación Server-Side** (Cuando lleguen a 8,000 leads)
  - Actualmente: Client-side filtering (suficiente para 1,417 leads)
  - Implementar cuando: Dashboard tarda >3s en cargar

---

### **🏗️ Arquitectura**

Decisiones técnicas, stack tecnológico, estructura del proyecto.

- **[Stack Tecnológico](docs/arquitectura/stack-tecnologico.md)**
  - Frontend: Next.js 15.5.4, TypeScript, Tailwind CSS, Recharts, Lucide React
  - Backend: Supabase (PostgreSQL + Auth + Realtime), n8n
  - AI: GPT-4o-mini (WhatsApp chatbot)
  - Deployment: Vercel

- **[Decisiones Técnicas](docs/arquitectura/decisiones-tecnicas.md)**
  - Patrones arquitectónicos
  - Trade-offs importantes
  - Lessons learned

- **[Estructura del Proyecto](docs/arquitectura/estructura-proyecto.md)**
  - Organización de carpetas
  - Convenciones de código
  - Flujos de desarrollo

---

## 🎯 ÚLTIMAS 5 SESIONES (Resumen Ejecutivo)

### **Sesión 56** (27 Nov) - 🔧 ✅ **Validación Teléfono Por Proyecto + Precio Base Import + Features UI**
**Feature:** Múltiples mejoras de validación, importación y UX
**Estado:** ✅ **DEPLOYED TO STAGING**

**Cambios implementados:**

**1. Validación de Teléfono Duplicado: GLOBAL → POR PROYECTO**
- **Problema:** Teléfono duplicado se validaba globalmente, impidiendo que un lead existiera en múltiples proyectos
- **Solución:** Cambiar validación a `telefono + proyecto_id` (composite unique)
- **Archivos:**
  - `lib/db.ts` - `searchLeadByPhone()` ahora recibe `proyectoId` opcional y filtra por proyecto
  - `lib/actions.ts` - `createManualLead()` valida duplicados solo dentro del proyecto
  - `lib/actions-locales.ts` - `saveDatosRegistroVenta()` valida duplicados por proyecto
  - `app/api/leads/search/route.ts` - API endpoint acepta `proyectoId` en query params
  - `components/leads/LeadImportModal.tsx` - Import manual valida por proyecto
- **n8n:** UPSERT cambió a `?on_conflict=telefono,proyecto_id`

**2. Dropdowns de Proyecto Eliminados (Proyecto Fijo del Login/Local)**
- **Antes:** Modales mostraban dropdown para seleccionar proyecto manualmente
- **Después:** Proyecto viene automáticamente del login (localStorage) o del local seleccionado
- **Modales actualizados:**
  - `ComentarioNaranjaModal.tsx` - Proyecto viene del `local.proyecto_id`
  - `DatosRegistroVentaModal.tsx` - Proyecto viene del `local.proyecto_id`
  - `VisitaSinLocalModal.tsx` - Proyecto viene del `selectedProyectoId` (login)
- **UX:** Campo proyecto mostrado como texto fijo (no editable) con mensaje informativo

**3. Fix: Botón Validación (Usar Props en vez de State)**
- **Problema:** Botón submit usaba `selectedProyecto` (state) que no se actualizaba
- **Solución:** Usar `local.proyecto_id` (prop) directamente en validación y submit
- **Afectados:** ComentarioNaranjaModal, DatosRegistroVentaModal, VisitaSinLocalModal

**4. Fix: PRIMARY KEY Violation en Leads**
- **Problema:** Tabla `leads` tenía PRIMARY KEY en `telefono` causando conflictos
- **Solución:** PRIMARY KEY debe ser `id`, con UNIQUE constraint en `(telefono, proyecto_id)`
- **SQL:** Modificar constraint para permitir mismo teléfono en diferentes proyectos

**5. Precio Base en Import de Locales (Excel)**
- **Feature:** Nueva columna opcional `precio_base` en importación Excel/CSV
- **Reglas:**
  - Si es `0` → Rechazar fila con error
  - Si está vacío → Dejar `null` para entrada manual posterior
  - Si tiene valor `> 0` → Usar ese valor
- **Archivos:**
  - `lib/locales.ts` - Interface `LocalImportRow` + validación en `importLocalesQuery()`
  - `LocalImportModal.tsx` - Parsing en `parseCSV()` y `parseExcel()` + plantilla actualizada

**6. Features UI Temporalmente Ocultos → Restaurados**
- **Temporalmente ocultos (main):**
  - Sidebar: Control de Pagos, Comisiones, Configurar Proyectos
  - LocalesTable: "Iniciar Registro de Venta"
- **Restaurados en staging** (commit `1ff6a91`)
- **Archivos:** `Sidebar.tsx`, `LocalesTable.tsx`

**7. Fix TypeScript: Empty Array Type Inference**
- **Error:** `Property 'icon' does not exist on type 'never'`
- **Causa:** `bottomItems: []` inferido como `never[]`
- **Solución:** `bottomItems: [] as MenuItem[]`

**Commits:**
- `543517b` - feat: Add precio_base column support to Excel import
- `b009235` - feat: Temporarily hide unfinished features
- `77c566f` - fix: TypeScript error - explicit MenuItem[] type
- `1ff6a91` - feat: Restore hidden features (staging)

**Merge:** `main` → `staging` (Fast-forward, 16 archivos)

**Archivos modificados:**
- lib/db.ts, lib/actions.ts, lib/actions-locales.ts, lib/locales.ts
- app/api/leads/search/route.ts
- components/leads/LeadImportModal.tsx
- components/locales/ComentarioNaranjaModal.tsx
- components/locales/DatosRegistroVentaModal.tsx
- components/locales/VisitaSinLocalModal.tsx
- components/locales/LocalImportModal.tsx
- components/locales/LocalesTable.tsx
- components/locales/LocalesClient.tsx
- components/shared/Sidebar.tsx

---

### **Sesión 54** (22 Nov) - 💰 ⏳ **Sistema Completo de Control de Pagos (Post-Venta)**
**Feature:** Sistema completo de gestión de pagos para locales vendidos (post-venta)
**Problema resuelto:** Necesidad de gestionar calendario de cuotas, pagos recibidos y morosidad
**Estado:** ⏳ **PENDING QA REVIEW**

**Implementación completa en 4 FASES:**

**FASE 1: Database Schema (DataDev)**
- Migration SQL: `supabase/migrations/20251122_create_control_pagos.sql`
- Nueva tabla `control_pagos` con snapshot inmutable de datos:
  - Relación: `local_id` (FK a locales con ON DELETE CASCADE)
  - Snapshot local: código, proyecto, metraje
  - Snapshot cliente: lead_id, nombre, teléfono
  - Montos: venta, separación, inicial, inicial_restante, monto_restante
  - Financiamiento: con_financiamiento (boolean), porcentaje_inicial, numero_cuotas, tea, fecha_primer_pago
  - **Calendario cuotas:** JSONB completo (array de objetos con fecha, monto, interés, amortización, saldo)
  - Estado: 'activo' | 'completado' | 'cancelado'
  - Metadata: procesado_por, vendedor_id, created_at, updated_at
- RLS policies: SELECT (authenticated), INSERT/UPDATE (admin + jefe_ventas)
- Trigger para `updated_at`
- Índices: local_id, proyecto_id, estado, vendedor_id, created_at DESC
- Modificación tabla `locales`: Campo `en_control_pagos` (boolean, default false) + índice

**FASE 2: Backend (BackDev)**
- Archivo nuevo: `lib/actions-control-pagos.ts` (370 líneas)
- Server Actions:
  1. **procesarVentaLocal(data)**: Procesa venta completa
     - Validaciones: Auth, rol (admin/jefe_ventas), local no duplicado
     - INSERT en control_pagos (snapshot completo)
     - UPDATE locales SET en_control_pagos = true
     - INSERT en locales_historial
     - Retorna: `{ success, message }`
  2. **getAllControlPagos()**: Obtiene todos los registros activos (ORDER BY created_at DESC)
  3. **getControlPagoById(id)**: Obtiene por ID
  4. **getControlPagoByLocalId(localId)**: Obtiene por local_id
  5. **getControlPagosStats()**: Contadores por estado (activo, completado, cancelado)
- Interfaces:
  - **ProcesarVentaData**: 17 campos (local, cliente, montos, financiamiento, calendario, usuario)
  - **ControlPago**: Estructura completa de registro

**FASE 3: Frontend - Modificaciones `/locales` (FrontDev)**

1. **FinanciamientoModal.tsx (+40 líneas):**
   - Import `useAuth` y `procesarVentaLocal`
   - State `isProcessing` (loading durante procesamiento)
   - Modal confirmación "Procesar" ahora ejecuta lógica real:
     - Preparar objeto `dataProcesar` con 17 campos
     - Llamar `await procesarVentaLocal(dataProcesar)`
     - Success: Cerrar modal + alert + `window.location.reload()`
     - Error: Alert con mensaje + mantener modal abierto
   - Error handling completo con try/catch

2. **LocalesTable.tsx (+15 líneas):**
   - **renderSemaforo():** Si `local.en_control_pagos === true`:
     - Mostrar badge azul (#0066cc): "🔒 En proceso de venta"
     - NO mostrar semáforo ni círculos de colores
   - **renderSalirNegociacion():** Bloquear si `en_control_pagos === true` (return null)
   - **renderIniciarFinanciamiento():** Bloquear si `en_control_pagos === true` (return null)
   - Badge design: `bg-blue-600 text-white font-semibold rounded-full px-3 py-1.5`

3. **lib/locales.ts (1 línea):**
   - Interface `Local`: Campo `en_control_pagos: boolean` agregado

**FASE 4: Frontend - Nueva página `/control-pagos` (FrontDev)**

1. **app/control-pagos/page.tsx (reescrito, 84 líneas):**
   - Client Component con useAuth
   - Validación RBAC: Solo admin y jefe_ventas
   - useEffect para fetch `getAllControlPagos()` on mount
   - Loading states: Auth + data
   - Render `<ControlPagosClient initialData={controlPagos} />`

2. **components/control-pagos/ControlPagosClient.tsx (nuevo, 200 líneas):**
   - **Header verde corporativo (#1b967a):**
     - Icon FileText
     - Título: "Locales en Control de Pagos"
     - Total: "Total de locales procesados: {N}"
   - **Tabla profesional (10 columnas):**
     1. **Código Local:** Código (bold) + metraje (pequeño gris)
     2. **Proyecto:** Nombre del proyecto
     3. **Cliente:** Nombre (bold) + teléfono (pequeño gris)
     4. **Monto Total:** Formato USD con comas
     5. **Inicial (%):** Porcentaje (azul) + monto (gris pequeño)
     6. **Restante:** Formato USD verde
     7. **Cuotas:** Badge azul "{N} cuotas" + TEA (si aplica)
     8. **Financiamiento:** Badge verde "Sí" o gris "No"
     9. **Próximo Pago:** Fecha con icon Calendar
     10. **Acciones:** Link "Ver detalle" (placeholder)
   - **Empty state profesional:**
     - Icon FileText gris
     - Texto: "No hay locales en control de pagos"
     - Subtexto: "Los locales procesados aparecerán aquí"
   - Helpers: `formatMonto()`, `formatFecha()`

**FLUJO COMPLETO (End-to-End):**
1. Admin/Jefe Ventas abre modal Financiamiento (local ROJO)
2. Completa datos: ¿Financiamiento? (Sí/No), Cuotas, Fecha de pago
3. Click "Generar calendario de pagos" → Tabla aparece
4. Click "Procesar" → Modal de confirmación
5. Click "Continuar" → Procesamiento:
   - INSERT en `control_pagos` (snapshot completo)
   - UPDATE `locales` SET `en_control_pagos = true`
   - INSERT en `locales_historial`
6. Página `/locales`:
   - Local muestra badge azul "🔒 En proceso de venta"
   - Todos los botones/enlaces bloqueados (no clickeables)
   - Semáforo NO visible
7. Página `/control-pagos`:
   - Local aparece en tabla con datos completos
   - Link "Ver detalle" (futuro: modal con calendario)

**Beneficios:**
- ✅ Snapshot inmutable de datos al momento de venta (no depende de JOINs futuros)
- ✅ Locales bloqueados previenen cambios accidentales
- ✅ Vista centralizada de todos los locales en proceso
- ✅ Base sólida para futura gestión de pagos (registrar cuotas pagadas)
- ✅ Calendario de cuotas almacenado en JSONB (flexible para futuras queries)

**Próximos pasos (futuro):**
- Modal detalle con calendario completo de cuotas (tabla expandible)
- Registrar pagos recibidos (nuevo campo `pagos_recibidos` JSONB)
- Alertas de cuotas vencidas (webhook o cron job)
- Dashboard de morosidad (analytics de atrasos)
- Exportar PDF con estado de cuenta del cliente

**Archivos modificados:**
- FinanciamientoModal.tsx (+40 líneas)
- LocalesTable.tsx (+15 líneas)
- lib/locales.ts (+1 línea)
- app/control-pagos/page.tsx (reescrito, 84 líneas)

**Archivos nuevos:**
- lib/actions-control-pagos.ts (370 líneas)
- components/control-pagos/ControlPagosClient.tsx (200 líneas)
- supabase/migrations/20251122_create_control_pagos.sql (160 líneas)

**Líneas totales:** +788 líneas netas
**Commit:** `6fc6787`
**Testing pendiente:** 3 escenarios críticos (ver abajo)

---

### **Sesión 53** (22 Nov) - 🎨 ✅ **Tercera Columna en Configuración de Proyectos**
**Feature:** Agregar tercera columna "Mantenimiento de comisiones" a la página `/configuracion-proyectos`
**Problema resuelto:** Expandir layout de 2 a 3 columnas para agregar nueva sección de configuración
**Estado:** ✅ **DEPLOYED TO STAGING**

**Cambios implementados:**

1. **Grid layout expandido:**
   - Cambio: `lg:grid-cols-2` → `lg:grid-cols-3` (línea 410)
   - Desktop: 3 columnas horizontales con gap-8
   - Mobile/Tablet: Columnas apiladas verticalmente

2. **Nueva columna 3 agregada (líneas 774-791):**
   - Título: "Mantenimiento de comisiones"
   - Subtítulo: "Configuración de comisiones para este proyecto"
   - Placeholder visual:
     - Border dashed gris (`border-2 border-dashed border-gray-300`)
     - Background: `bg-gray-50`
     - Texto centrado: "Por configurar" (itálico, gris)
     - Padding: `p-8` para aire visual

3. **Layout final (3 columnas):**
   - **Columna 1 (izquierda):** TEA + Color + Estado - **SIN CAMBIOS**
   - **Columna 2 (centro):** Porcentaje Inicial + Cuotas sin/con interés - **SIN CAMBIOS**
   - **Columna 3 (derecha):** Mantenimiento de comisiones (nuevo)

**Responsive design:**
- Desktop (>1024px): 3 columnas horizontales
- Tablet/Mobile (<1024px): Columnas apiladas

**Styling & Consistency:**
- Usa misma estructura `space-y-6` de otras columnas
- Tipografía y colores consistentes con diseño existente
- Border dashed para indicar "pendiente de configurar"

**Archivos modificados:**
- `app/configuracion-proyectos/page.tsx` (+21 líneas, -2 líneas)

**Commits:**
- `38eaffc` - "feat: Add third column 'Mantenimiento de comisiones' to project configuration"

**Testing QA:**
- ⏳ Pendiente validación @QADev:
  - Layout 3 columnas en desktop
  - Responsive design correcto
  - Columnas 1 y 2 sin modificaciones
  - Funcionalidad existente intacta

**Beneficio:**
- Espacio preparado para futura funcionalidad de gestión de comisiones
- Layout escalable y modular

---

### **Sesión 53C** (22 Nov) - 🎨 ⏳ **UX Mejora: Modal Financiamiento con Header/Footer Sticky**
**Feature:** Mejorar experiencia de usuario en modal de financiamiento con sticky header/footer
**Problema resuelto:** Header y footer no permanecían visibles al scrollear contenido largo del modal
**Cambio quirúrgico:** Solo modificación de estilos UI, sin afectar lógica de negocio

**Mejoras implementadas:**

1. **Header sticky con fondo verde corporativo:**
   - Background: `#1b967a` (verde EcoPlaza)
   - Texto: Blanco (`text-white`)
   - Posición: `sticky top-0 z-10`
   - Border radius superior: `rounded-t-lg`
   - Botón cerrar (X) ahora en blanco con hover gris claro

2. **Footer sticky:**
   - Posición: `sticky bottom-0`
   - Background: Blanco con borde superior
   - Border radius inferior: `rounded-b-lg`
   - Botones "Cerrar" y "Procesar" permanecen visibles

3. **Body scrollable independiente:**
   - Clase: `overflow-y-auto flex-1`
   - Único elemento que hace scroll
   - Contiene todo el contenido del formulario

**Estructura modal:**
- Container principal: `flex flex-col` (layout vertical)
- Header: Fijo arriba (no scrollea)
- Body: Scrollable (contiene todo el formulario)
- Footer: Fijo abajo (no scrollea)
- Max height modal: `max-h-[90vh]` (mantiene tamaño máximo)

**Colores corporativos usados:**
- Verde header: `#1b967a` (mismo que botón "Procesar")
- Texto header: Blanco
- Hover botón X: `text-gray-200`

**Beneficio UX:**
- Usuario siempre ve el título del modal (sabe qué local está editando)
- Botones de acción siempre accesibles (no necesita scrollear al final)
- Scroll más intuitivo (solo contenido se mueve, UI permanece estable)
- Mejor experiencia con calendarios largos (30+ cuotas)

**Archivos modificados:**
- `components/locales/FinanciamientoModal.tsx` (+6 líneas netas)
  - Línea 224: Container con `flex flex-col`
  - Líneas 225-237: Header sticky verde
  - Línea 240: Body con `overflow-y-auto flex-1`
  - Línea 571: Footer sticky

**Testing pendiente:**
- [ ] Verificar header permanece arriba al scrollear
- [ ] Verificar footer permanece abajo al scrollear
- [ ] Verificar funcionamiento en diferentes tamaños de ventana
- [ ] Verificar con calendarios largos (30+ cuotas)

**Estado:** ⏳ PENDING QA REVIEW
**Commit:** Pendiente (después de QA approval)

---

### **Sesión 53B** (22 Nov) - 🔥 ✅ **HOTFIX: Build Error - Client Component Pattern**
**Tipo:** Hotfix urgente de build error en Vercel
**Problema:** Build failing con "Module not found: Can't resolve '@/lib/auth-server'"
**Root cause:** Páginas control-pagos y comisiones intentaban importar archivo que NO EXISTE

**Error original:**
```
Module not found: Can't resolve '@/lib/auth-server'
  app/control-pagos/page.tsx (línea 10)
  app/comisiones/page.tsx (línea 10)
```

**Análisis:**
- auth-server.ts NO EXISTE en el proyecto
- Proyecto usa patrón Client Component + useAuth() hook (NO Server Component)
- Páginas existentes (page.tsx, operativo/page.tsx) usan 'use client' + useAuth()
- Middleware.ts maneja autenticación y RBAC en nivel de routing
- Patrón server-side con getServerSession() NO es estándar del proyecto

**Solución implementada:**
1. **Convertir a Client Components:**
   - Agregar 'use client' directive
   - Cambiar async function → function regular
   - Usar useAuth() hook en vez de getServerSession()

2. **Pattern seguido (igual que app/page.tsx):**
   - useRouter() para navigation
   - useAuth() para obtener { user, loading }
   - useEffect para redirect condicional
   - Loading state mientras auth carga
   - Validación client-side con user.rol

3. **Middleware.ts actualizado:**
   - Agregar flags isControlPagosRoute y isComisionesRoute
   - RBAC para /control-pagos: solo admin y jefe_ventas
   - RBAC para /comisiones: todos los roles autenticados
   - Redirects automáticos según rol

**Cambios en archivos:**

**app/control-pagos/page.tsx:**
```typescript
'use client'; // NUEVO

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context'; // CAMBIO: No más auth-server

export default function ControlPagosPage() { // CAMBIO: No más async
  const { user, loading } = useAuth(); // CAMBIO: useAuth hook

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.rol !== 'admin' && user.rol !== 'jefe_ventas') {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <LoadingSpinner />;
  }
  // ... resto del componente
}
```

**app/comisiones/page.tsx:**
```typescript
'use client'; // NUEVO

import { useAuth } from '@/lib/auth-context'; // CAMBIO

export default function ComisionesPage() { // No más async
  const { user, loading } = useAuth();

  // useEffect para redirect
  // Loading state
  // JSX usa user.rol (no session.rol)
}
```

**middleware.ts (+24 líneas):**
```typescript
const isControlPagosRoute = pathname.startsWith('/control-pagos');
const isComisionesRoute = pathname.startsWith('/comisiones');

// CONTROL DE PAGOS - Admin and jefe_ventas only
if (isControlPagosRoute) {
  if (userData.rol !== 'admin' && userData.rol !== 'jefe_ventas') {
    // Redirect según rol
    if (userData.rol === 'vendedor') {
      return NextResponse.redirect(new URL('/operativo', req.url));
    } else if (userData.rol === 'vendedor_caseta') {
      return NextResponse.redirect(new URL('/locales', req.url));
    }
  }
  return res;
}

// COMISIONES - All roles
if (isComisionesRoute) {
  return res;
}
```

**Patrón de autenticación del proyecto:**
```
CORRECTO (usado en proyecto):
├─ Client Components ('use client')
├─ useAuth() hook (auth-context.tsx)
├─ Middleware.ts protege rutas (getUser() validation)
└─ Loading states en componentes

INCORRECTO (intentado en 53):
├─ Server Components (async)
├─ getServerSession() de archivo inexistente
└─ redirect() de next/navigation
```

**Doble validación de seguridad:**
1. **Middleware.ts** - Valida + redirige antes de renderizar
2. **useEffect en página** - Validación client-side + redirect si bypass

**Testing:**
- ✅ Build compila sin errores
- ✅ Middleware protege rutas correctamente
- ✅ useAuth() provee user object con rol
- ✅ Loading states funcionan
- ✅ Redirects automáticos según rol

**Lecciones aprendidas:**
- **SIEMPRE** verificar patrones existentes del proyecto antes de implementar
- Glob archivos en /lib/ para ver qué utilidades existen
- Leer páginas existentes (page.tsx) para seguir mismo patrón
- NO asumir que archivos existen sin verificar
- Build errors son prioritarios - fix inmediato antes de features

**Archivos modificados:**
- app/control-pagos/page.tsx (76 líneas → patrón Client Component)
- app/comisiones/page.tsx (75 líneas → patrón Client Component)
- middleware.ts (+24 líneas → RBAC nuevas rutas)

**Commits:**
- 7e3d887 (Sesión 53 - Items sidebar)
- **b84f16e** (Sesión 53B - Hotfix build error)

**Deploy:** ✅ STAGING (build success)

---

### **Sesión 53** (22 Nov) - 🔧 ✅ **CORRECCIÓN: Items Separados en Sidebar (Control Pagos + Comisiones)**
**Tipo:** Corrección urgente de implementación incorrecta
**Problema:** Se implementaron tabs DENTRO de `/locales` cuando lo correcto era crear items SEPARADOS en el sidebar
**Root cause:** Malinterpretación de requerimiento del usuario

**Implementación incorrecta (REVERTIDA):**
- Sistema de tabs con LocalesClientWrapper
- TabButton component
- 3 tabs: Gestión | Control de Pagos | Comisiones
- Navegación interna en `/locales`

**Implementación correcta (APLICADA):**
- 2 nuevas páginas separadas con rutas propias
- Items agregados al dropdown "Finanzas" en sidebar
- Navegación desde menú lateral (no tabs internos)

**Archivos ELIMINADOS (reversión):**
- `components/locales/LocalesClientWrapper.tsx` (92 líneas)
- `components/shared/TabButton.tsx` (26 líneas)
- `components/locales/ControlPagosTab.tsx` (56 líneas)
- `components/locales/ComisionesTab.tsx` (67 líneas)
- `components/locales/LocalesGestionTab.tsx` (529 líneas)

**Archivos CREADOS:**
- `app/control-pagos/page.tsx` (62 líneas)
  - Placeholder profesional con icono FileText
  - Solo accesible para admin y jefe_ventas
  - Validación role-based con redirect
  - Mensaje "Funcionalidad en desarrollo"
- `app/comisiones/page.tsx` (70 líneas)
  - Placeholder profesional con icono DollarSign
  - Accesible para todos los roles
  - Mensaje personalizado según rol del usuario
  - Mensaje "Funcionalidad en desarrollo"

**Archivos MODIFICADOS:**
- `app/locales/page.tsx` (1 línea)
  - Restaurar: `import LocalesClient` (en vez de LocalesClientWrapper)
- `components/shared/Sidebar.tsx` (+16 líneas)
  - Import FileText icon
  - Lógica condicional en `getMenuStructure()`:
    - Crear array `finanzasItems` dinámico según rol
    - Item 1: "Gestión de Locales" (todos)
    - Item 2: "Control de Pagos" (solo admin/jefe_ventas)
    - Item 3: "Comisiones" (todos)

**Estructura final del Sidebar:**
```
Finanzas ▼ (dropdown DollarSign icon)
  ├─ Gestión de Locales → /locales (todos)
  ├─ Control de Pagos → /control-pagos (solo admin/jefe_ventas)
  └─ Comisiones → /comisiones (todos)
```

**Role-based access control:**
- `admin`: Ve los 3 items
- `jefe_ventas`: Ve los 3 items
- `vendedor`: Ve Gestión + Comisiones (NO ve Control de Pagos)
- `vendedor_caseta`: Ve Gestión + Comisiones (NO ve Control de Pagos)

**Cambios netos:**
- Líneas eliminadas: 770
- Líneas agregadas: 155
- Balance: -615 líneas de código
- Archivos eliminados: 5
- Archivos creados: 2

**Testing:**
- ✅ Sidebar muestra items correctos según rol
- ✅ Navegación a páginas funciona
- ✅ Placeholders se renderizan correctamente
- ✅ Validación role-based en `/control-pagos` funciona
- ✅ `/locales` sigue funcionando como antes

**Lecciones aprendidas:**
- Verificar SIEMPRE el contexto exacto del usuario antes de implementar
- "Tabs dentro de Gestión de Locales" ≠ "Items en el sidebar bajo Finanzas"
- Tabs internos = navegación dentro de UNA página
- Items sidebar = navegación entre DIFERENTES páginas
- Cuando hay duda, PREGUNTAR al usuario antes de implementar

**Commit:** 7e3d887
**Deploy:** ✅ STAGING

---

### **Sesión 52I** (22 Nov) - ✅ ⚡ **Mejora UX: Botón "Procesar" Deshabilitado hasta Generar Calendario**
**Feature:** Validación preventiva en modal de financiamiento
**Problema resuelto:** Usuarios podían intentar procesar venta sin calendario de pagos generado
**Pattern:** Disabled State Pattern - Client-side validation con feedback visual

**Comportamiento del botón "Procesar":**

**DESHABILITADO (inicial):**
- Condición: `calendarioCuotas.length === 0`
- Estilos: `bg-gray-300 text-gray-500 cursor-not-allowed`
- Interacción: No responde a clicks (atributo `disabled`)

**HABILITADO:**
- Condición: `calendarioCuotas.length > 0`
- Estilos: `bg-[#1b967a] text-white hover:bg-[#157a63]` (verde corporativo)
- Interacción: Click abre modal de confirmación

**Reset triggers (vuelve a deshabilitado):**
1. Usuario cambia "¿Con financiamiento?" (toggle Sí/No)
2. Usuario cambia fecha de pago
3. Usuario cambia número de cuotas

**Implementación técnica:**
```typescript
<button
  onClick={() => setShowConfirmModal(true)}
  disabled={calendarioCuotas.length === 0}
  className={`px-6 py-2 font-semibold rounded-lg transition-colors ${
    calendarioCuotas.length === 0
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
      : 'bg-[#1b967a] text-white hover:bg-[#157a63]'
  }`}
>
  Procesar
</button>
```

**Validaciones:**
- ✅ Client-side: Validación reactiva con `calendarioCuotas.length`
- ✅ Atributo HTML `disabled` previene clicks
- ✅ Cursor `not-allowed` indica estado deshabilitado
- ✅ Colores dinámicos (gris vs verde) según estado

**Flujo correcto:**
1. Usuario abre modal → Botón GRIS deshabilitado
2. Usuario completa datos (financiamiento, cuotas, fecha)
3. Usuario click "Generar calendario de pagos" → Tabla aparece
4. Botón cambia a VERDE habilitado
5. Usuario click "Procesar" → Modal de confirmación
6. Usuario confirma → Procesamiento de venta

**Beneficios:**
- ✅ Previene errores de flujo incompleto
- ✅ Feedback visual claro (gris = falta algo)
- ✅ Garantiza integridad de datos
- ✅ Reduce frustración por errores evitables
- ✅ Guía intuitiva del proceso

**Archivos:** FinanciamientoModal.tsx (+7 líneas)
**Commit:** `708354b`
**Testing:** ✅ QA approved (5 escenarios)
**Deploy:** ✅ STAGING
**[📖 Ver documentación completa →](docs/sesiones/SESION_52I_BOTON_PROCESAR_DISABLED.md)**

---

### **Sesión 52H** (22 Nov) - 📄 ✅ **Sistema Completo de Generación de PDF para Financiamiento**
**Feature:** Generación de PDF profesional con branding EcoPlaza para calendario de pagos de financiamiento
**Problema resuelto:** Vendedores y gerentes necesitan documentos PDF para compartir con clientes
**Librería:** jsPDF + jspdf-autotable

**Contenido del PDF:**
1. **Header navy** - Logo EcoPlaza + título "Financiamiento de Local"
2. **Sección: Información del Local** - Código, proyecto, precio venta, separación, lead vinculado (Cliente)
3. **Sección: Cálculos Financieros** - Inicial (%), restante inicial, monto restante
4. **Sección: Detalles de Financiamiento** - ¿Con financiamiento?, cuotas, TEA, fecha de pago
5. **Sección: Calendario de Pagos** - Tabla con autoTable

**Tablas calendario:**
- **SIN financiamiento (3 columnas):** # Cuota | Fecha de Pago | Monto
- **CON financiamiento (6 columnas):** # Cuota | Fecha | Interés (rojo) | Amortización (azul) | Cuota (verde bold) | Saldo

**Colores corporativos:**
- Verde: #1b967a (headers, cuota)
- Navy: #192c4d (header PDF, headers tabla)
- Amarillo: #fbde17 (futuro uso)

**Problemas resueltos:**
1. **TypeScript tuple types** - Cambiar `const verde = [27, 150, 122]` a `const verde: [number, number, number] = [27, 150, 122]`
2. **Tabla desbordada** - Margins 15px (igual que headers) en vez de 5px
3. **Texto desalineado** - Todo centrado (modal y PDF): headers + body cells
4. **Headers PDF no centrados** - Agregar `halign: 'center'` a headStyles

**Formato profesional:**
- Zebra striping (gris/blanco alternado)
- Colores semánticos (rojo=interés, azul=amortización, verde=cuota)
- Footer con fecha de generación
- Nombre archivo: `Local-{codigo}-Financiamiento.pdf`

**Archivos:** lib/pdf-generator.ts (nuevo, 293 líneas), FinanciamientoModal.tsx (+50 líneas), package.json (jspdf deps)
**Commits:** 6c6ffd0, 3c85a7c, 0e4ac2a, 4fb89fa, 2291ec8
**[📖 Ver documentación completa →](docs/sesiones/SESION_52H_PDF_FINANCIAMIENTO.md)**

---

## 📈 PROGRESO DEL PROYECTO

## 🚀 FEATURES PRINCIPALES

### **Dashboard Admin**
- ✅ Ver todos los leads de todos los proyectos
- ✅ Asignar/reasignar vendedores
- ✅ Importar leads manuales (formulario visual uno por uno)
- ✅ Importar leads masivos (CSV/Excel)
- ✅ Importar locales (CSV)
- ✅ Exportar leads a Excel
- ✅ Gestionar usuarios (CRUD)
- ✅ Gestionar proyectos
- ✅ **Configurar proyectos** (TEA, color, estado, porcentajes inicial, cuotas)
- ✅ Ver métricas y estadísticas

### **Dashboard Vendedor**
- ✅ Ver solo leads asignados
- ✅ Agregar leads manuales (formulario visual uno por uno)
- ✅ Gestionar locales (semáforo 4 estados)
- ✅ Capturar monto de venta en estado naranja
- ✅ Tracking de leads en locales
- ✅ Ver historial de cambios
- ✅ Exportar sus leads a Excel

### **Sistema de Locales**
- ✅ Workflow de negociación (verde→amarillo→naranja→rojo)
- ✅ Real-time updates (Supabase Realtime)
- ✅ Monto de venta con inline editing
- ✅ Audit trail completo (historial)
- ✅ CSV bulk import
- ✅ Role-based access control
- ✅ Registro de venta (modal con financiamiento, precio venta, monto separación)

### **Integraciones**
- ✅ n8n: Captura automática de leads vía WhatsApp
- ✅ GPT-4o-mini: Chatbot Victoria para atención al cliente
- ✅ Notificaciones WhatsApp cuando se asigna lead
- ✅ RAG en GitHub para instrucciones del agente

---

## 📈 PROGRESO DEL PROYECTO

### **Fase 1: Database Setup (COMPLETADO)**
- ✅ Tablas: leads, locales, locales_historial, usuarios, vendedores, proyectos
- ✅ RLS policies configuradas
- ✅ Índices optimizados
- ✅ Supabase Realtime habilitado

### **Fase 2: Autenticación (COMPLETADO)**
- ✅ Login/Logout
- ✅ Role-based access control (4 roles)
- ✅ Session management ESTABLE (Sesión 42)
- ✅ Middleware security (getUser validation)

### **Fase 3: Features Avanzadas (EN CURSO)**
- ✅ Sistema de Locales completo
- ✅ Import manual de leads
- ✅ Monto de venta
- ✅ Columna Asistió
- ✅ Keyset pagination (1,417 leads sin JOINs)
- ⏳ Analytics de conversión (pendiente)

---

## 🔗 OTROS RECURSOS

### **Documentación del Proyecto**
- [CONTEXTO_PROYECTO.md](CONTEXTO_PROYECTO.md) - Arquitectura completa, plan de desarrollo original, tech stack
- [README.md](README.md) - Setup, instalación, deployment instructions

### **SQL y Consultas**
- [consultas-leo/](consultas-leo/) - Documentos históricos, SQL migrations, incident reports
  - `SQL_CREATE_LOCALES_TABLES.sql` - Tablas de locales
  - `SQL_ADD_PROYECTO_SAN_GABRIEL.sql` - Nuevo proyecto
  - `INCIDENT_REPORT_SESSION_35B.md` - Emergency rollback (500+ líneas)

### **Análisis Históricos**
- [consultas-leo/](consultas-leo/) - Análisis técnicos y debugging sesiones
  - `ANALISIS_TOKEN_REFRESH_CHROME.md` (17 Nov 2025) - Análisis de fallo token refresh en Chrome. **NOTA:** Propuso FASE 1-5 de soluciones, pero commit `b6cde58` de Alonso (19 Nov) implementó solución más efectiva con refs anti-stale-closure. Documento conservado como referencia histórica.

### **Flujos n8n**
- [consultas-leo/](consultas-leo/) - JSON exports de flujos n8n
  - Victoria - Eco - Callao - PROD
  - Victoria - Eco - Urb. San Gabriel - APERTURA

---

## 🔴 CASOS DE EMERGENCIA

### **Si el login deja de funcionar:**
1. Revisar Vercel logs inmediatamente
2. Verificar última sesión deployada: [Sesiones Noviembre](docs/sesiones/2025-11-noviembre.md)
3. Rollback si necesario: `git reset --hard [commit-stable]`
4. Consultar: [Incident Report 35B](consultas-leo/INCIDENT_REPORT_SESSION_35B.md)

### **Si dashboard muestra menos leads de los esperados:**
1. Verificar en SQL Supabase: `SELECT COUNT(*) FROM leads WHERE proyecto_id = '...'`
2. Revisar: [Sesión 33C](docs/sesiones/2025-11-noviembre.md#sesión-33c) (Keyset pagination sin JOINs)
3. Confirmar que `getAllLeads()` usa fetch separado (no JOINs)

### **Si usuarios reportan session loss:**
1. Revisar console logs del usuario
2. Verificar: [Módulo Auth](docs/modulos/auth.md) (última sesión estable: 42)
3. Si timeout: Aumentar en `lib/auth-context.tsx` (actualmente 30s)

---

## 📊 HEALTH CHECK

**Última verificación:** 22 Noviembre 2025

| Componente | Estado | Última Revisión |
|------------|--------|-----------------|
| Autenticación | 🟢 ESTABLE | Sesión 45I |
| Dashboard Admin | 🟢 OPERATIVO | Daily |
| Dashboard Operativo | 🟢 OPERATIVO | Daily |
| **Sistema de Locales** | 🟢 **OPERATIVO** | **Sesión 52H** |
| **PDF Financiamiento** | 🟢 **OPERATIVO** | **Sesión 52H** |
| Configuración Proyectos | 🟢 OPERATIVO | Sesión 51 |
| n8n Webhooks | 🟢 OPERATIVO | Sesión 40B |
| Supabase Realtime | 🟢 OPERATIVO | Daily |
| Vercel Deployment | 🟢 STABLE | Auto |

---

## 🎓 APRENDIZAJES CLAVE

### **Autenticación**
- Middleware debe ser minimal (solo validar JWT, no business logic)
- `getUser()` > `getSession()` (validación con servidor)
- Split useEffects previene infinite loops
- Timeout de 30s es balance óptimo (tolerancia vs UX)

### **Supabase Quirks**
- `.limit()` falla con JOINs → usar `.range()` o fetch separado
- Límite por defecto de 1000 registros → siempre especificar explícitamente
- RLS policies con Server Actions necesitan policy para `anon` role
- **SELECT policies restrictivas pueden bloquear UPDATE/DELETE** - Si SELECT policy usa `activo = true`, no podrá UPDATE a `activo = false`
- **Server Actions sin auth context fallan RLS** - NUNCA usar browser client en Server Actions, usar createServerClient con cookies
- **Service role key bypass es anti-patrón** - Evitar supabaseAdmin, siempre buscar solución con RLS correcto

### **Desarrollo**
- Rollback es herramienta válida (no temer usarlo)
- Cambios quirúrgicos > rewrites completos
- Documentación exhaustiva previene errores futuros
- Testing incremental ahorra tiempo (FASE 1 antes de FASE 2)
- **SIEMPRE** verificar patrones existentes del proyecto antes de implementar nuevas páginas
- Glob archivos en /lib/ para verificar qué utilidades existen antes de asumir
- Leer páginas existentes (page.tsx, operativo/page.tsx) para seguir mismo patrón de auth
- NO asumir que archivos existen sin verificar - build errors tienen prioridad

### **TypeScript & PDF Generation**
- **Tuple types explícitos** para arrays de tamaño fijo: `const color: [number, number, number] = [255, 0, 0]` en vez de `const color = [255, 0, 0]`
- **jsPDF autoTable alignment** requiere configuración en DOS lugares: `headStyles.halign` para headers Y `columnStyles[n].halign` para body
- **Margin consistency** entre secciones y tablas: usar mismo valor de margin para alinear elementos
- **Colores semánticos** en tablas mejoran legibilidad: rojo=gasto, azul=reducción deuda, verde=valor total

---

## 👥 EQUIPO DE DESARROLLO

**Project Leader & Chief Architect** - Coordina todas las actividades

**Especialistas:**
- **BackDev** - API, business logic, server-side
- **FrontDev** - UI/UX, React, Tailwind
- **DataDev** - Database, Supabase, queries
- **SecDev** - Auth, security, RLS
- **IntegDev** - n8n, webhooks, APIs
- **PythonDev** - Analytics, ML (futuro)
- **DevOps** - Deployment, CI/CD (futuro)
- **QADev** - Testing, quality assurance

---

## 🔄 CICLO DE ACTUALIZACIÓN

Este índice maestro se actualiza después de cada sesión de desarrollo con:
- ✅ Estado actual del proyecto
- ✅ Nuevas sesiones agregadas
- ✅ Métricas actualizadas
- ✅ Links a documentación detallada

Para detalles completos de cualquier sesión o módulo, consulta los archivos vinculados.

---

**Última Actualización:** 22 Noviembre 2025
**Versión de Documentación:** 2.0 (Modular)
**Proyecto:** EcoPlaza Dashboard - Gestión de Leads

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**

**Co-Authored-By:** Project Leader Claude Code
