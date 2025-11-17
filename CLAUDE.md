# 🤖 CLAUDE CODE - Dashboard EcoPlaza
**Índice Maestro de Documentación**

> **DOCUMENTACIÓN MODULAR:** Este archivo es el índice central. Consulta los módulos y sesiones para detalles completos.

---

## 🔄 ÚLTIMA ACTUALIZACIÓN

**Fecha:** 16 Noviembre 2025
**Sesión:** 46B - ✅ **UX Improvement: Usuario controla cuándo actualizar dashboard**
**Estado:** ✅ **DEPLOYED - TESTING**
**Documentación:** Ver resumen abajo

---

## 📊 ESTADO DEL PROYECTO

### **Módulos Activos**
| Módulo | Estado | Última Actualización | Métricas |
|--------|--------|---------------------|----------|
| [Autenticación](docs/modulos/auth.md) | ✅ **100% ESTABLE** | **Sesión 45I (13 Nov)** | **Uptime: 100% • 2+ hrs sesión** |
| [Leads](docs/modulos/leads.md) | ✅ OPERATIVO | Sesión 44 (12 Nov) | 1,417 leads |
| [Locales](docs/modulos/locales.md) | ✅ OPERATIVO | Sesión 38 (5 Nov) | 823 locales |
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
  - Última sesión: 38 (UX mejoras modal)
  - Estado: OPERATIVO (823 locales con real-time)

- **[Usuarios](docs/modulos/usuarios.md)** - Roles, permisos, CRUD
  - Última sesión: 40D (Nuevo admin Bryan)
  - Estado: OPERATIVO (22 usuarios activos)

- **[Proyectos](docs/modulos/proyectos.md)** - Gestión multiproyecto
  - Última sesión: 40B (Flujo n8n San Gabriel)
  - Estado: OPERATIVO (7 proyectos)

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

- **[Noviembre 2025](docs/sesiones/2025-11-noviembre.md)** - Sesiones 33-46
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

### **Sesión 46 (A-B)** (16 Nov) - ✅ **FIX PGRST116 + UX Improvement**

#### **Sesión 46A: Fix PGRST116 en Import Manual**
**Problema crítico:** Error PGRST116 al intentar agregar lead manual con email leo@ecoplaza.com
**Síntoma:** "Cannot coerce the result to a single JSON object"
**Root Cause:** `.maybeSingle()` falla cuando encuentra duplicados en la DB (2+ leads con mismo teléfono)

**Solución quirúrgica (1 línea modificada):**
- Cambiar `.maybeSingle()` por `.limit(1)` en verificación de duplicados
- `.limit(1)` solo verifica "¿existe al menos uno?" sin fallar con duplicados
- Mejorar logging: mostrar objeto completo en vez de solo 3 campos

**Archivos:** `lib/actions.ts`, `ManualLeadPanel.tsx`
**Commit:** `7fe69cf` - fix: PGRST116 en import manual - usar .limit(1) en vez de .maybeSingle()

#### **Sesión 46B: UX - Usuario controla cuándo actualizar dashboard**
**Problema UX:** Panel se auto-cerraba con timeout 2s, dashboard se actualizaba automáticamente
**Solución:** Aplicar mismo patrón que LeadImportModal (Sesión 46A)

**Mejoras implementadas:**
1. Eliminado auto-refresh después de importación exitosa
2. Botón "Cerrar" cambia a "Actualizar dashboard" cuando hay imports exitosos
3. Ícono X también actualiza dashboard cuando corresponde
4. Panel permanece abierto - usuario ve confirmación con calma

**Comportamiento final:**
- Usuario agrega lead → Click "Importar 1 Lead" → Panel permanece abierto mostrando éxito
- Usuario controla cuándo cerrar: click "Actualizar dashboard" o X
- Dashboard solo se refresca cuando usuario lo solicita
- **Consistencia:** LeadImportModal (CSV/Excel) y ManualLeadPanel (uno por uno) tienen la MISMA UX

**Archivos:** `ManualLeadPanel.tsx` (handleImportAll, handleCloseWithRefresh, X icon, botón result)
**Commit:** `242bacb` - feat: UX manual leads - Usuario controla cuándo actualizar dashboard

---

### **Sesión 45 (A-I)** (13 Nov) - 🎯 ✅ **SISTEMA DE AUTENTICACIÓN 100% ESTABLE**
**Problema crítico:** Session loss en refresh, loading infinito, logout cada 55min
**Duración:** 8 horas de debugging exhaustivo (9 subsesiones)
**Root Causes encontrados:**
1. Loop de eventos Supabase durante inicialización
2. selectedProyecto null después de refresh
3. Auto-refresh JWT cada 55min causando logout

**Soluciones implementadas:**
- Cache localStorage (5min validity) → refresh <1s
- Flag isInitializing + cooldown 2s → previene loops
- Restore selectedProyecto de sessionStorage → elimina loading infinito
- TOKEN_REFRESHED handler → elimina logout cada 55min
- SIGNED_IN smart handler → distingue login real vs token refresh
- Timeout 30s → tolerante con plan gratuito

**Resultado:**
- ✅ 0% usuarios afectados (antes: 100%)
- ✅ Sesiones duran indefinidamente (probado 2+ horas)
- ✅ Dashboard carga <1s con cache
- ✅ Sin logouts forzados
- ✅ Sistema completamente estable

**[📖 Ver documentación completa →](consultas-leo/SESION_45_COMPLETE_AUTH_STABILITY.md)**

---

### **Sesión 44** (12 Nov) - ✅ Panel Entrada Manual de Leads + UX Improvements
**Feature:** Panel lateral para agregar leads uno por uno (alternativa a CSV)
**Validaciones:** Phone internacional, email, vendedor, nombre (100% consistente)
**UX:** Dropdown "Importar Leads Manuales", tabla con header verde, zebra striping
**UI:** Border rojo + mensaje de error para todos los campos
**Archivos:** ManualLeadPanel.tsx (nuevo, 620 líneas), LeadsTable.tsx, DashboardClient.tsx
**[Ver detalles →](consultas-leo/SESION_44_MANUAL_LEAD_PANEL.md)**

---

### **Sesión 43** (10 Nov) - ✅ RAG Update: Rubro Opcional en Callao
**Cambio:** Campo "rubro" ya no es requerido para lead_completo
**Requerido ahora:** Solo nombre + fecha y hora de visita
**n8n Code2:** 2 líneas modificadas (if validation)
**Template:** Documentación para replicar en Galilea y San Gabriel
**[Ver detalles →](consultas-leo/SESION_43_RUBRO_OPCIONAL_CALLAO.md)**

---

### **Sesión 42** (10 Nov) - ✅ FIX CRÍTICO: Split useEffect
**Problema:** Session loss con "loading" infinito
**Root Cause:** useEffect único con 2 responsabilidades + dependency que causaba loop
**Solución:** Split en 2 useEffects independientes
**Resultado:** Session loss reducido (mejorado en Sesión 45)
**[Ver detalles →](docs/sesiones/2025-11-noviembre.md#sesión-42)**

---

### **Sesión 41B** (10 Nov) - ✅ Columna "Fecha": created_at
**Cambio:** Columna "Fecha" ahora muestra `created_at` (cuándo entró al sistema) en vez de `fecha_captura` (cuándo completó datos)
**Impacto:** 1 línea modificada, solo cambio visual
**[Ver detalles →](docs/modulos/leads.md#sesion-41b)**

---

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

**Última verificación:** 10 Noviembre 2025

| Componente | Estado | Última Revisión |
|------------|--------|-----------------|
| Autenticación | 🟢 ESTABLE | Sesión 42 |
| Dashboard Admin | 🟢 OPERATIVO | Daily |
| Dashboard Operativo | 🟢 OPERATIVO | Daily |
| Sistema de Locales | 🟢 OPERATIVO | Sesión 38 |
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

**Última Actualización:** 10 Noviembre 2025
**Versión de Documentación:** 2.0 (Modular)
**Proyecto:** EcoPlaza Dashboard - Gestión de Leads

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**

**Co-Authored-By:** Project Leader Claude Code
