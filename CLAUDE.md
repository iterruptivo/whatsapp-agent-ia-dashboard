# 🤖 CLAUDE CODE - Dashboard EcoPlaza
**Índice Maestro de Documentación**

> **DOCUMENTACIÓN MODULAR:** Este archivo es el índice central. Consulta los módulos y sesiones para detalles completos.

---

## 🔄 ÚLTIMA ACTUALIZACIÓN

**Fecha:** 21 Noviembre 2025
**Sesión:** 52C - 📝 **Modal Datos Previos para Registro de Venta**
**Estado:** ✅ **DEPLOYED TO STAGING**
**Documentación:** SESIÓN 52C (ver sección "ÚLTIMAS 5 SESIONES" más abajo)

---

## 📊 ESTADO DEL PROYECTO

### **Módulos Activos**
| Módulo | Estado | Última Actualización | Métricas |
|--------|--------|---------------------|----------|
| [Autenticación](docs/modulos/auth.md) | ✅ **100% ESTABLE** | **Sesión 45I (13 Nov)** | **Uptime: 100% • 2+ hrs sesión** |
| [Leads](docs/modulos/leads.md) | ✅ OPERATIVO | Sesión 44 (12 Nov) | 1,417 leads |
| [Locales](docs/modulos/locales.md) | ✅ OPERATIVO | **Sesión 52C (21 Nov)** | 823 locales |
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

- **[Locales](docs/modulos/locales.md)** - Semáforo, monto de venta, tracking
  - Última sesión: **48C (Modal comentario obligatorio NARANJA)**
  - Estado: OPERATIVO (823 locales con real-time + comentarios obligatorios)

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

- **[Noviembre 2025](docs/sesiones/2025-11-noviembre.md)** - Sesiones 33-48C
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

### **Sesión 52C** (21 Nov) - 📝 ✅ **Modal Datos Previos para Registro de Venta**
**Feature:** Modal previo que captura datos faltantes antes de abrir modal "Financiamiento de Local"
**Problema resuelto:** Admin/Jefe Ventas pueden pasar locales a ROJO sin NARANJA, dejando datos faltantes (monto_venta, monto_separacion, lead_id)
**Restricción:** Solo admin y jefe_ventas pueden acceder

**Flujo completo:**
1. Admin/Jefe Ventas click "Iniciar Registro de Venta" (local ROJO)
2. Sistema verifica si faltan datos (monto_venta || monto_separacion || lead_id)
   - ✅ SI tiene todos los datos → Abrir modal Financiamiento directamente
   - ❌ NO tiene alguno → Abrir modal "Datos necesarios para iniciar proceso"
3. Usuario completa datos faltantes en modal previo
4. Click "Confirmar local" → Guarda datos + registra historial + auto-abre modal Financiamiento

**3 Secciones del Modal:**

1. **Monto de Separación** (REQUERIDO)
   - Input numérico USD con validación >0
   - Placeholder: "Ej: 5000.00"
   - Formato: 2 decimales

2. **Monto de Venta** (REQUERIDO)
   - Input numérico USD con validación >0
   - Placeholder: "Ej: 45000.00"
   - Formato: 2 decimales

3. **Vincular Lead (Cliente)** (REQUERIDO)
   - Sistema búsqueda por teléfono (IDÉNTICO a LocalTrackingModal)
   - Validación: Código país obligatorio (regex E.164: `^[1-9]\d{9,14}$`)
   - Placeholder: "Ej: 51987654321"

**Estados de búsqueda:**
- `'search'` → Input teléfono + botón "Buscar" + nota código país
- `'lead-found'` → Card verde con info lead:
  - Nombre, Teléfono, Email (si existe), Proyecto
  - Botón "← Buscar otro teléfono"
- `'not-found'` → Alerta amarilla + formulario crear lead manual:
  - Input "Teléfono" (read-only, pre-filled)
  - Input "Nombre Completo del Cliente" * (requerido)
  - Dropdown "Proyecto" * (requerido, lista proyectos activos)
  - Mensaje azul informativo: "Se creará un nuevo lead en la tabla de leads con estado 'lead_manual' y asistió='Sí'"
  - Link "← Buscar otro teléfono"

**Botón "Confirmar local":**
- Habilitado cuando:
  - Monto separación >0 AND
  - Monto venta >0 AND
  - Teléfono válido (código país) AND
  - (Lead encontrado OR Nombre completo + Proyecto seleccionado)

**Acción al confirmar (Server Action):**
1. **Crear lead manual SI no existe:**
   - Tabla `leads` con campos: `telefono`, `nombre`, `proyecto_id`, `estado='lead_manual'`, `asistio=true`
   - Obtener `leadId` del lead creado
2. **Actualizar tabla `locales`:**
   - `monto_separacion`, `monto_venta`, `lead_id`
3. **Registrar en historial:**
   - Tabla `locales_historial`
   - Acción: "Admin/Jefe Ventas completó datos para registro de venta: monto_separacion=$XXX.XX, monto_venta=$XXX.XX, lead=[NOMBRE]"
   - `usuario_id`: ID del admin/jefe_ventas actual
4. **Auto-abrir modal Financiamiento:**
   - Cerrar modal Datos
   - Abrir modal Financiamiento con local actualizado

**Backend: Server Action `saveDatosRegistroVenta()`:**
- Parámetros:
  - `localId`, `montoSeparacion`, `montoVenta`
  - `leadId` (si vincula existente) o `newLeadData` (si crea nuevo)
  - `usuarioId` (admin/jefe_ventas)
- Validaciones server-side:
  - Montos >0 (doble seguridad)
  - Datos completos
- Flujo:
  1. Validar inputs
  2. Si `newLeadData` existe → Crear lead manual (llamar `createManualLead()`)
  3. Actualizar local con montos + leadId
  4. Registrar en historial
  5. Retornar local actualizado
- Retorna: `{ success, message?, local? }`

**Integración LocalesTable.tsx:**
```typescript
// Nueva lógica condicional
const handleIniciarRegistroVenta = (local: Local) => {
  const faltanDatos = !local.monto_venta || !local.monto_separacion || !local.lead_id;

  if (faltanDatos) {
    setDatosModal({ isOpen: true, local });
  } else {
    setFinanciamientoModal({ isOpen: true, local });
  }
};

// Callback onSuccess
const handleDatosSuccess = (updatedLocal: Local) => {
  setDatosModal({ isOpen: false, local: null });
  setFinanciamientoModal({ isOpen: true, local: updatedLocal });
};
```

**Validaciones críticas:**
- ✅ Client-side: Montos >0, teléfono formato internacional, campos requeridos
- ✅ Server-side: Montos >0, datos completos (doble seguridad)
- ✅ Teléfono: Regex E.164 internacional (10-15 dígitos, empieza con código país)
- ✅ Nombre: Requerido si crea lead nuevo
- ✅ Proyecto: Requerido si crea lead nuevo

**Archivos nuevos:**
- `components/locales/DatosRegistroVentaModal.tsx` (533 líneas)

**Archivos modificados:**
- `lib/actions-locales.ts` (+97 líneas) - Server action saveDatosRegistroVenta()
- `lib/locales.ts` (1 línea) - Interface Local con campo `lead_id: string | null`
- `components/locales/LocalesTable.tsx` (+46 líneas)
  - Import DatosRegistroVentaModal
  - State datosModal
  - handleIniciarRegistroVenta() con lógica condicional
  - handleDatosSuccess() callback
  - Render DatosRegistroVentaModal

**Testing escenarios:**
- ✅ Escenario 1: Local ROJO sin datos → Abrir modal previo
- ✅ Escenario 2: Local ROJO con datos → Abrir modal financiamiento directo
- ✅ Escenario 3: Búsqueda lead exitosa → Vincular
- ✅ Escenario 4: Búsqueda lead fallida → Crear nuevo con estado lead_manual + asistio=Sí
- ✅ Escenario 5: Confirmar → Datos guardados + historial + auto-abrir financiamiento

**Commit:** `b89dd91`
**Deploy:** ✅ STAGING

---

### **Sesión 52B** (21 Nov) - 💰 ✅ **Campos Financiamiento/Separación en Modal Registro de Venta**
**Feature:** Agregar 3 campos al modal de Registro de Venta (antes "Financiamiento")
**Problema resuelto:** Capturar información completa de financiamiento y mostrar montos de venta/separación
**Cambio terminológico:** "Iniciar Financiamiento" → "Iniciar Registro de Venta" (mejor describe el proceso)

**Nuevos campos implementados:**
1. **"¿Con financiamiento?"** - Radio buttons Si/No (default: Sí)
   - Estado local `conFinanciamiento` (boolean, default true)
   - Dos opciones mutuamente exclusivas
   - Estilo Tailwind limpio con hover states

2. **"Precio de venta"** - Display read-only
   - Muestra `local.monto_venta` (capturado en estado NARANJA)
   - Formato: S/ XXX,XXX.XX (moneda peruana con comas)
   - Card con fondo azul (`bg-blue-50`)
   - Tipografía grande y bold (`text-2xl font-bold text-blue-900`)

3. **"Separó con"** - Display read-only
   - Muestra `local.monto_separacion` (capturado en estado NARANJA)
   - Formato: S/ XXX,XXX.XX (moneda peruana con comas)
   - Card con fondo verde (`bg-green-50`)
   - Tipografía grande y bold (`text-2xl font-bold text-green-900`)

**Helper function:**
- `formatMonto()` - Formatea number a string con locale es-PE
  - Input: `12345.67` → Output: `"S/ 12,345.67"`
  - Maneja null/undefined → muestra "N/A"
  - Siempre 2 decimales (minimumFractionDigits, maximumFractionDigits)

**Layout mejorado:**
- Sección "Información del Local" (fondo gris, código/proyecto/metraje)
- Grid 2 columnas para montos (precio venta | separación)
- Radio buttons en sección separada con borde superior
- Espaciado vertical consistente (`space-y-6`)

**Archivos modificados:**
- `FinanciamientoModal.tsx` (+93 líneas netas)
  - Import useState
  - Estado conFinanciamiento
  - Helper formatMonto
  - Nuevo layout con 3 secciones
  - Comentarios SESIÓN 52B
- `LocalesTable.tsx` (1 línea)
  - Cambio texto: "Iniciar Financiamiento" → "Iniciar Registro de Venta"

**Commit:** `801e31e`
**Deploy:** ✅ STAGING

---

### **Sesión 52** (21 Nov) - 💰 ✅ **Enlace "Iniciar Registro de Venta" para Locales ROJOS**
**Feature:** Enlace condicional debajo del semáforo para iniciar proceso de registro de venta
**Problema resuelto:** Admin y Jefe de Ventas necesitan punto de entrada para gestionar financiamiento de locales vendidos
**Restricción:** Solo admin y jefe_ventas pueden ver el enlace

**Visibilidad condicional:**
1. Local debe estar en estado ROJO (vendido/bloqueado)
2. Usuario debe ser admin o jefe_ventas
3. Enlace aparece debajo de los círculos de colores (semáforo)

**Modal implementado:**
- Título: "Financiamiento de Local: [CODIGO] - [PROYECTO]"
- Ejemplo: "Financiamiento de Local: A-101 - Callao"
- Información mostrada: Código, proyecto, metraje, monto de venta
- Contenido: Placeholder (funcionalidad a desarrollar en siguiente sesión)

**UI/UX:**
- Color enlace: Verde (`text-green-600`) - Asociación con dinero/financiamiento
- Hover: Subrayado y color más oscuro
- Posición: Segunda línea debajo del semáforo (después de "Salir de la negociación")
- Modal: Max width 2xl, backdrop oscuro, botón cerrar (X)

**Componente nuevo:**
- `FinanciamientoModal.tsx` (73 líneas)
  - Props: isOpen, local, onClose
  - Header con título dinámico
  - Body con placeholder
  - Footer con botón "Cerrar"

**Cambios LocalesTable:**
- Import FinanciamientoModal
- State `financiamientoModal`
- Helper `renderIniciarFinanciamiento()` con doble validación (estado + rol)
- Render en tabla (línea 851)
- Modal component (líneas 923-928)

**Archivos:** FinanciamientoModal.tsx (nuevo), LocalesTable.tsx (+47 líneas)
**Commit:** `c355ab4`
**[📖 Ver documentación completa →](consultas-leo/SESION_52_ENLACE_INICIAR_FINANCIAMIENTO.md)**

---

### **Sesión 51** (20 Nov) - ⚙️ ✅ **Sistema Completo de Configuración de Proyectos**
**Feature:** Panel admin `/configuracion-proyectos` para configurar TEA, color, estado y listas ordenables
**Problema resuelto:** Admin puede configurar parámetros financieros por proyecto (porcentajes inicial, cuotas)
**Restricción:** Solo admin puede acceder (middleware + RLS policies)

**Configuraciones implementadas:**
1. **TEA del Proyecto** - Decimal 0.01-100 o null
2. **Color del Proyecto** - Picker hexadecimal con preview
3. **Estado activo/inactivo** - Toggle switch
4. **Porcentaje(s) de Inicial** - Lista orderable con valores 0.01-100 (ej: 50%, 30%, 45%)
5. **Cuotas sin intereses** - Lista orderable en meses enteros (ej: 12, 24, 36)
6. **Cuotas con intereses** - Lista orderable en meses enteros (ej: 60, 120, 180)

**Estructura datos (JSONB):**
```json
{
  "porcentajes_inicial": [{"value": 50, "order": 0}, {"value": 30, "order": 1}],
  "cuotas_sin_interes": [{"value": 12, "order": 0}, {"value": 24, "order": 1}],
  "cuotas_con_interes": [{"value": 60, "order": 0}, {"value": 120, "order": 1}]
}
```

**Problemas críticos resueltos:**
1. **RLS Policy Violation** - Eliminado service role key bypass, implementado createServerClient con cookies
2. **Campo activo no persiste** - SELECT policy bloqueaba UPDATE, modificado para permitir admin ver inactivos
3. **406 Errors** - Browser client sin auth, consolidado en Server Action con supabaseAuth

**UI/UX:**
- Multi-accordion (todos proyectos visibles, primero expandido)
- Layout 2 columnas desktop (TEA/Color/Estado | Porcentajes/Cuotas)
- Zebra striping headers (gris/azul alternado)
- Validaciones en tiempo real + no duplicados
- Enter key support + botones ↑↓ para ordenar

**Tabla nueva:** `proyecto_configuraciones` con RLS policies para admin
**Archivos:** actions-proyecto-config.ts (nuevo), page.tsx (810 líneas), Sidebar.tsx, middleware.ts
**[📖 Ver documentación completa →](docs/sesiones/SESION_51_CONFIGURACION_PROYECTOS_COMPLETE.md)**

---

### **Sesión 49** (19 Nov) - 🔧 ✅ **FIX CRÍTICO: Proyecto Filter Reset Loop en /locales**
**Problema crítico:** Filtro Proyecto se resetea automáticamente al proyecto del login
**Síntoma:** Usuario intenta cambiar a "Todos los proyectos" → resetea inmediatamente
**Impacto:** Usuarios NO pueden ver locales de otros proyectos ni vista "Todos"

**Root Cause:**
- `useEffect` líneas 110-118 en `LocalesClient.tsx` tenía `proyectoFilter` en dependency array
- Cada cambio del usuario → trigger `useEffect` → reset automático a `selectedProyecto.id`
- Condición `!proyectoFilter && selectedProyecto?.id` evalúa como true cuando filtro es empty string

**Solución quirúrgica (1 línea):**
- Remover `proyectoFilter` del dependency array: `}, [selectedProyecto?.id]);`
- `useEffect` ahora solo ejecuta cuando `selectedProyecto.id` cambia (nuevo login)
- Usuario tiene control total del filtro sin interferencia

**Comportamiento correcto:**
1. Filtro inicia con login project (preservado)
2. Usuario puede cambiar a "Todos los proyectos" (funciona)
3. Usuario puede cambiar a cualquier proyecto (funciona)
4. Filtro mantiene selección del usuario (sin resets)
5. Solo resetea si `selectedProyecto` cambia (nuevo login context)

**Testing:**
- Login como Gerente (admin) → filtro inicia en Callao
- Cambiar a "Todos los proyectos" → mantiene selección
- Cambiar a "San Gabriel" → mantiene selección
- Cambiar estados, metrajes → filtro proyecto NO resetea

**Archivos:** `LocalesClient.tsx` (3 líneas: dependency array + comment explicativo)
**Commit:** `dff7e66` - fix: Proyecto filter reset loop en /locales
**Deploy:** PRODUCTION (main branch)

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

**Última verificación:** 20 Noviembre 2025

| Componente | Estado | Última Revisión |
|------------|--------|-----------------|
| Autenticación | 🟢 ESTABLE | Sesión 45I |
| Dashboard Admin | 🟢 OPERATIVO | Daily |
| Dashboard Operativo | 🟢 OPERATIVO | Daily |
| Sistema de Locales | 🟢 OPERATIVO | Sesión 48C |
| **Configuración Proyectos** | 🟢 **OPERATIVO** | **Sesión 51** |
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

**Última Actualización:** 21 Noviembre 2025
**Versión de Documentación:** 2.0 (Modular)
**Proyecto:** EcoPlaza Dashboard - Gestión de Leads

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**

**Co-Authored-By:** Project Leader Claude Code
