# 🤖 CLAUDE CODE - Dashboard EcoPlaza
**Índice Maestro de Documentación**

> **DOCUMENTACIÓN MODULAR:** Este archivo es el índice central. Consulta los módulos y sesiones para detalles completos.

---

## 🔄 ÚLTIMA ACTUALIZACIÓN

**Fecha:** 12 Diciembre 2025
**Sesión:** 69 - 👤📊 **Rol Marketing + Limpieza Insights**
**Estado:** ✅ **DEPLOYED TO MAIN**
**Documentación:** Ver detalles abajo

---

## 📊 ESTADO DEL PROYECTO

### **Módulos Activos**
| Módulo | Estado | Última Actualización | Métricas |
|--------|--------|---------------------|----------|
| [Autenticación](docs/modulos/auth.md) | ✅ **100% ESTABLE** | **Sesión 45I (13 Nov)** | **Uptime: 100% • 2+ hrs sesión** |
| [Leads](docs/modulos/leads.md) | ✅ OPERATIVO | Sesión 44 (12 Nov) | 1,417 leads |
| [Locales](docs/modulos/locales.md) | ✅ OPERATIVO | **Sesión 52H (22 Nov)** | 823 locales |
| [Usuarios](docs/modulos/usuarios.md) | ✅ OPERATIVO | **Sesión 69 (12 Dic)** | 24 usuarios, 7 roles |
| [Proyectos](docs/modulos/proyectos.md) | ✅ OPERATIVO | Sesión 40B (8 Nov) | 7 proyectos |
| [Integraciones](docs/modulos/integraciones.md) | ✅ OPERATIVO | Sesión 40B (8 Nov) | 3 flujos n8n |
| [Documentos](docs/modulos/documentos.md) | ⏳ **EN DESARROLLO** | **Sesión 66 (9 Dic)** | Logo + Docs + PDF + Contratos Word |
| [Repulse](docs/modulos/repulse.md) | ✅ **OPERATIVO** | **Sesión 68 (11 Dic)** | re-engagement leads (cron diario) |

### **Métricas Globales (Actualizado: 12 Dic 2025)**
```
Total Leads:        1,417
Total Locales:      823
Usuarios Activos:   24
  - Admins:         2 (gerente, bryan)
  - Jefe Ventas:    1
  - Vendedores:     8
  - Vendedor Caseta: 11
  - Finanzas:       1 (Rosa Quispe)
  - Marketing:      1
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
  - Última sesión: **69 (Rol Marketing)**
  - Estado: OPERATIVO (24 usuarios activos, 7 roles)

- **[Proyectos](docs/modulos/proyectos.md)** - Gestión multiproyecto + configuración TEA/cuotas
  - Última sesión: **51 (Sistema configuración completo)**
  - Estado: OPERATIVO (7 proyectos + configuraciones)

- **[Integraciones](docs/modulos/integraciones.md)** - n8n, webhooks, WhatsApp
  - Última sesión: 43 (Rubro opcional Callao)
  - Estado: OPERATIVO (3 flujos activos)

- **[Documentos](docs/modulos/documentos.md)** - Generación automática de documentos legales
  - Última sesión: **66 (Sistema Contratos Word con docx-templates)**
  - Estado: EN DESARROLLO (6/8 fases completadas)
  - Tecnología: docx-templates para templates Word + HTML templates + JSZip post-processing

- **[Repulse](docs/modulos/repulse.md)** - Sistema de re-engagement de leads
  - Última sesión: **68 (Cron Diario 3:00 AM + Limpieza Teléfonos)**
  - Estado: ✅ OPERATIVO (branch integrado a staging)
  - Features: detección automática DIARIA, envío batch, exclusión permanente, historial visible, webhook n8n

---

### **📅 Sesiones de Desarrollo**

Documentación cronológica completa de todas las sesiones.

- **[Octubre 2025](docs/sesiones/2025-10-octubre.md)** - Sesiones 24-32
  - Sistema de Locales (26-27)
  - Session Loss Analysis (28-29)
  - Monto de Venta + Roles (30)
  - Búsqueda Exacta + Import Manual (31)
  - Actualización n8n Callao (32)

- **[Noviembre 2025](docs/sesiones/2025-11-noviembre.md)** - Sesiones 33-63
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
  - **Dashboard Admin UX + Horizontal Bar Chart UTM (57)** ✅
  - **Sistema Desglose Mensual Comisiones (58)** ✅
  - **Vista Dual Comisiones Tabs Admin/Jefe (59)** ✅
  - **🔐 RLS Policy + Modal Trazabilidad Vendedores (61)** ✅
  - **🐛 Fix Trigger Cascade Comisiones (62)** ✅
  - **🛠️ Múltiples mejoras UX + Fix timezone (63)** ✅

- **[Diciembre 2025](docs/sesiones/2025-12-diciembre.md)** - Sesiones 64+
  - **📄 Sistema Generación Documentos (64)** ✅
  - **📄 Template HTML Ficha de Inscripción (64B)** ✅
  - **🔐 Rol Finanzas + Ficha Inscripción Modal (65)** ✅
  - **🔄 Sistema Repulse: Integración /operativo + Exclusiones (65B)** ✅
  - **💬 Sistema Repulse: Webhook n8n + Quota Widget (65C)** ✅
  - **🖼️📎📄 Logo Dinámico + Docs Adjuntos + PDF + Contratos Word (66)** ✅
  - **🔐 Sistema Verificación por Finanzas + Liberación Comisiones (67)** ✅
  - **📞🔄 Limpieza Teléfonos + Cron Repulse Diario (68)** ✅
  - **👤📊 Rol Marketing + Limpieza Insights (69)** ✅

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

### **Sesión 69** (12 Dic) - 👤📊 ✅ **Rol Marketing + Limpieza Insights**
**Tipo:** Feature RBAC + Refactoring
**Estado:** ✅ **DEPLOYED TO MAIN**

**Cambios implementados:**

---

#### **PARTE 1: Nuevo Rol `marketing`**

**Requerimiento:** Crear rol para equipo de marketing con acceso limitado.

**Permisos del rol:**
| Permiso | Estado |
|---------|--------|
| Acceso a Insights (`/`) | ✅ Landing page |
| Acceso a Operativo (`/operativo`) | ✅ |
| Reasignar vendedores a leads | ✅ |
| Exportar leads | ❌ |
| Importar leads | ❌ |
| Acceso a Locales | ❌ |
| Acceso a Control de Pagos | ❌ |
| Acceso a Comisiones | ❌ |

**Archivos modificados:**

| Archivo | Cambio |
|---------|--------|
| `middleware.ts` | Routing para marketing → `/` como landing |
| `components/shared/Sidebar.tsx` | Menú: solo Insights y Operativo |
| `components/dashboard/DashboardHeader.tsx` | Badge rosa para marketing |
| `lib/auth-context.tsx` | Tipo `marketing` en UserRole |
| `components/admin/UsuarioFormModal.tsx` | Marketing en dropdown de roles |
| `components/admin/UsuariosClient.tsx` | Label y color para marketing |
| `components/dashboard/LeadsTable.tsx` | userRole type incluye marketing |

**Database:** Requiere actualizar constraint en Supabase:
```sql
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
CHECK (rol IN ('admin', 'vendedor', 'jefe_ventas', 'vendedor_caseta', 'coordinador', 'finanzas', 'marketing'));
```

---

#### **PARTE 2: Limpieza de Insights (DashboardClient)**

**Contexto:** Insights (`/`) solo es accedido por `admin` y `marketing`. Ambos usan `/operativo` para gestión de leads, haciendo redundante la tabla en Insights.

**Removido completamente de DashboardClient.tsx:**

| Componente/Feature | Líneas |
|--------------------|--------|
| `LeadsTable` import y componente | ~15 |
| `LeadDetailPanel` import y componente | ~10 |
| `LeadImportModal` import y componente | ~20 |
| `ManualLeadPanel` import y componente | ~20 |
| State variables (selectedLead, isPanelOpen, filters, etc.) | ~15 |
| Handlers (handleLeadClick, handleClosePanel, handleExportToExcel) | ~50 |
| Admin Filters Section (dropdowns, botones export/import) | ~150 |
| Imports no usados (Download, Upload, Plus, ChevronDown, etc.) | ~5 |

**Resultado:** Archivo reducido de **638 líneas a 344 líneas** (-46%)

**Lo que permanece en Insights:**
- Stats cards (Total Leads, Completos, En Conversación, etc.)
- Gráficos (PieChart estados, PieChart asistencias, HorizontalBarChart UTM)
- VendedoresMiniTable (Leads por vendedor)
- DateRangeFilter (filtro por fechas)
- ConfirmDialog (notificaciones)

---

**Commits:**
- `ee36c50` - feat: Add marketing to LeadsTable userRole type
- `870c511` - feat: Add marketing role to admin user management
- `e172661` - fix: Hide leads table and filters from marketing role in Insights
- `307b97c` - refactor: Remove LeadsTable and filters from Insights (DashboardClient)

---

### **Sesión 66** (7-9 Dic) - 🖼️📎📄 ✅ **Logo Dinámico + Docs Adjuntos + PDF + Contratos Word**
**Tipo:** Feature completo (Logo + Documentos + PDF + Sistema de Contratos)
**Estado:** ✅ **DEPLOYED TO STAGING**

**Features implementados:**

---

#### **PARTE 1: Logo Dinámico por Proyecto**

**Problemas resueltos:**
1. **Datos legales no aparecían en template** - Consultaba lugar incorrecto
2. **Logo estático** - Necesidad de logo dinámico por proyecto

**Cambios implementados:**

| Componente | Descripción |
|------------|-------------|
| **Supabase Storage** | Bucket `logos-proyectos` (público) |
| **DB** | Campo `proyectos.logo_url` (TEXT) |
| **LogoUploader.tsx** | Componente con crop/zoom/rotación usando `react-easy-crop` |
| **proyecto-config.ts** | Funciones `uploadProyectoLogo()`, `deleteProyectoLogo()`, `getProyectoLegalData()` |

**Integración:**
- Nueva sección "Logo Oficial del Proyecto" en `/configuracion-proyectos`
- Template Ficha de Inscripción con placeholders `{{LOGO_URL}}`, `{{LOGO_DISPLAY}}`

---

#### **PARTE 2: Documentos Adjuntos Requeridos**

**Requerimiento:** Subir fotos de DNI y Comprobante de depósito en la Ficha de Inscripción.

**Schema actualizado (tabla `clientes_ficha`):**
```sql
ALTER TABLE clientes_ficha
ADD COLUMN IF NOT EXISTS dni_fotos TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS comprobante_deposito_fotos TEXT[] DEFAULT '{}';
```

**Supabase Storage:**
- Bucket: `documentos-ficha` (público)
- Naming convention: `{local_id}/{tipo}/{timestamp}_{index}.jpg`
- Ejemplo: `abc123-uuid/dni/1733580000000_0.jpg`

**Componente DocumentUploader.tsx (NUEVO):**
| Feature | Detalle |
|---------|---------|
| Compresión | `browser-image-compression` - max 1MB, 1000px width |
| Formato | Conversión automática a JPEG |
| Máximo | 2 imágenes por tipo |
| Validación | Requiere mínimo 1 imagen de cada tipo para guardar/preview |
| Preview | Thumbnails con botón eliminar |
| Estados | Loading, error, required warning |

**Integración en FichaInscripcionModal:**
- Sección "DOCUMENTOS ADJUNTOS (REQUERIDOS)" al final del formulario
- Dos DocumentUploader: DNI (max 2) y Comprobante de Depósito (max 2)
- Validación antes de guardar y antes de vista previa

**Documentos en Vista Previa/PDF:**
- DNI en página separada (page-break)
- Comprobante en página separada (page-break)
- Imágenes grandes para impresión

---

#### **PARTE 3: Descarga PDF con Nombre Único**

**Problema:** `window.print()` con "Microsoft Print to PDF" no respetaba el `document.title`

**Solución implementada:**
- Librería `html2pdf.js` cargada via CDN en el preview
- Botón "Descargar PDF" genera archivo con nombre correcto
- Botón "Imprimir" mantiene opción tradicional

**Nombre de archivo:**
```
FICHA-INSCRIPCION-{CODIGO_LOCAL}-{YYYYMMDD}-{HHMMSS}.pdf
```
Ejemplo: `FICHA-INSCRIPCION-PRUEBA-01-20251207-213500.pdf`

**Estructura del preview:**
```html
<div id="pdf-content">
  <div class="ficha-container">
    <!-- Contenido de la ficha -->
  </div>
  <!-- Documentos adjuntos con page-break-before -->
  <div class="page-break-before">DNI...</div>
  <div class="page-break-before">Comprobante...</div>
</div>
```

**Opciones configuradas en html2pdf:**
```javascript
{
  margin: 5,
  filename: 'FICHA-INSCRIPCION-{codigo}-{fecha}-{hora}.pdf',
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  pagebreak: { mode: 'css', before: '.page-break-before' }
}
```

---

**Archivos nuevos:**
- `components/shared/LogoUploader.tsx` (292 líneas)
- `components/shared/DocumentUploader.tsx` (268 líneas)
- `consultas-leo/SQL_ADD_LOGO_URL.sql`
- `consultas-leo/SQL_ADD_DOCUMENTOS_FICHA.sql`

**Archivos modificados:**
- `lib/proyecto-config.ts` - Funciones logo + `getProyectoLegalData()`
- `lib/db.ts` - Campo `logo_url` en interface `Proyecto`
- `lib/actions-proyecto-config.ts` - Campo `logo_url` en interface + query
- `lib/actions-clientes-ficha.ts` - Campos `dni_fotos`, `comprobante_deposito_fotos`
- `app/configuracion-proyectos/page.tsx` - UI LogoUploader integrado
- `components/locales/FichaInscripcionModal.tsx` - Logo, documentos, descarga PDF
- `package.json` - Dependencias: `react-easy-crop`, `browser-image-compression`

**Dependencias agregadas:**
```json
"browser-image-compression": "^2.0.2",
"react-easy-crop": "^5.1.0"
```

**Commits:**
- `453549e` - feat: Add LogoUploader component and logo management functions
- `3ecfcbd` - feat: Add LogoUploader to project configuration page
- `cf22628` - feat: Add DOCUMENTOS ADJUNTOS section with DocumentUploader
- `c906982` - fix: handleChange type for string[]
- `bd9217f` - style: Remove labels below document images
- `8a1768b` - feat: Separate pages for DNI and deposit proof
- `6176004` - feat: Set document title for print filename
- `4728bcb` - feat: Add timestamp to print filename for uniqueness
- `08f4b91` - feat: Add direct PDF download with correct filename
- `c235d1b` - fix: Include document images (DNI/Comprobante) in PDF download

---

#### **PARTE 4: Sistema de Generación de Contratos con docx-templates**

**Requerimiento:** Generar contratos Word (.docx) a partir de templates con variables dinámicas.

**Tecnología seleccionada:**
- Librería: `docx-templates` (npm)
- Almacenamiento: Supabase Storage bucket `contratos-templates`
- Templates: Archivos .docx con placeholders `{variable}`, `{IF condicion}`, `{FOR item IN lista}`, etc.

**Arquitectura del sistema:**

| Componente | Descripción |
|------------|-------------|
| **Supabase Storage** | Bucket `contratos-templates` para almacenar templates Word |
| **ContratoTemplateUploader.tsx** | Componente para subir templates con documentación de variables |
| **actions-contratos.ts** | Server actions para generación de contratos |
| **numero-a-letras.ts** | Utilidades para convertir números/fechas a texto en español |

**Variables disponibles en templates:**

```
DATOS DEL PROYECTO:
- {nombre_proyecto} - Nombre del proyecto
- {datos_legales.razon_social} - Razón social de la empresa
- {datos_legales.ruc} - RUC de la empresa
- {datos_legales.direccion} - Dirección legal
- {datos_legales.representante_legal} - Nombre del representante
- {datos_legales.dni_representante} - DNI del representante
- {datos_legales.cargo_representante} - Cargo del representante

DATOS DEL LOCAL:
- {local.codigo} - Código del local (ej: PRUEBA-01)
- {local.area_m2} - Área en metros cuadrados

DATOS DEL CLIENTE (TITULAR):
- {cliente.nombres}, {cliente.apellido_paterno}, {cliente.apellido_materno}
- {cliente.tipo_documento}, {cliente.numero_documento}
- {cliente.estado_civil}, {cliente.direccion}, {cliente.ocupacion}

DATOS DEL CÓNYUGE (condicional):
- {tiene_conyuge} - Boolean para condicional {IF tiene_conyuge}
- {conyuge.nombres}, {conyuge.apellido_paterno}, etc.

COPROPIETARIOS (array para {FOR}):
- {tiene_copropietarios} - Boolean
- {copropietarios} - Array para {FOR cp IN copropietarios}
- Cada cp tiene: cp.nombres, cp.tipo_documento, cp.numero_documento, etc.

MONTOS Y FINANCIAMIENTO:
- {precio_venta_usd}, {precio_venta_usd_texto}
- {precio_venta_pen}, {precio_venta_pen_texto}
- {monto_separacion_usd}, {monto_separacion_usd_texto}
- {inicial_usd}, {inicial_usd_texto}, {inicial_pen}, {inicial_pen_texto}
- {inicial_restante_usd}, {inicial_restante_pen}
- {cuota_mensual_usd}, {cuota_mensual_pen}
- {numero_cuotas}, {numero_cuotas_texto}
- {tea_porcentaje}
- {tipo_cambio}, {tipo_cambio_texto}

FECHAS:
- {fecha_contrato} - Formato DD/MM/YYYY
- {fecha_contrato_texto} - "ocho de diciembre del dos mil veinticinco"
- {fecha_primer_pago}, {fecha_ultimo_pago}
- {dia_pago}, {dia_pago_texto} - Día del mes para cuotas
```

**Reglas críticas para templates Word:**

> ⚠️ **IMPORTANTE**: Los comandos `{IF}`, `{END-IF}`, `{FOR}`, `{END-FOR}` DEBEN estar **solos en su propio párrafo** en Word.
>
> - Usar ENTER (no Shift+Enter) para crear nuevo párrafo
> - NUNCA poner múltiples comandos en la misma línea
> - Incorrecto: `{END-IF} {IF condicion}` ❌
> - Correcto: Cada comando en línea separada ✅

**Ejemplo de estructura en template:**

```
El señor {cliente.nombres} {cliente.apellido_paterno}...

{IF tiene_conyuge}
Conjuntamente con su cónyuge {conyuge.nombres}...
{END-IF}

{IF tiene_copropietarios}
Como copropietarios:
{FOR cp IN copropietarios}
- {cp.nombres} {cp.apellido_paterno}, DNI {cp.numero_documento}
{END-FOR}
{END-IF}
```

**Post-procesamiento (removeEmptyParagraphs):**
- Los templates generados pueden tener párrafos vacíos donde estaban los comandos
- La función `removeEmptyParagraphs()` usa JSZip para limpiar el XML interno
- Busca `<w:p>` vacíos (sin texto visible) y los elimina
- Mejora la presentación final del documento

**Funciones en numero-a-letras.ts:**

| Función | Ejemplo |
|---------|---------|
| `numeroALetras(15000, 'USD')` | "QUINCE MIL Y 00/100 DÓLARES AMERICANOS" |
| `numeroALetras(57600, 'PEN')` | "CINCUENTA Y SIETE MIL SEISCIENTOS Y 00/100 SOLES" |
| `fechaALetras('2025-12-08')` | "ocho de diciembre del dos mil veinticinco" |
| `numeroEnteroALetras(24)` | "VEINTICUATRO" |
| `tipoCambioALetras(3.84)` | "Tres con 84/100 soles" |
| `calcularFechaUltimaCuota(fecha, 24)` | Date de última cuota |

**Error común y solución:**

| Error | Causa | Solución |
|-------|-------|----------|
| "infinite loop or massive dataset detected" | Múltiples comandos `{IF}/{FOR}` en mismo párrafo Word | Separar cada comando en su propio párrafo usando ENTER |

**Archivos del sistema:**
- `lib/actions-contratos.ts` - Server actions + post-processing
- `lib/utils/numero-a-letras.ts` - Utilidades de conversión
- `components/shared/ContratoTemplateUploader.tsx` - UI de subida con docs
- `modelos-contrato/` - Templates de ejemplo

---

### **Sesión 65** (5 Dic) - 🔐 ✅ **Rol Finanzas + Ficha Inscripción Modal + Nueva Tabla clientes_ficha**
**Tipo:** Feature + RBAC + Database
**Estado:** ✅ **DEPLOYED TO MAIN**

**Cambios implementados:**

**1. Rol `finanzas` - Acceso restringido a solo /control-pagos**

| Archivo | Cambio |
|---------|--------|
| `middleware.ts` | Finanzas redirigido a `/control-pagos` desde todas las rutas |
| `Sidebar.tsx` | Finanzas solo ve "Control de Pagos" en menú |
| `app/control-pagos/page.tsx` | Agregado `finanzas` a validaciones de rol |

**Acceso por rol actualizado:**
| Rol | / | /operativo | /locales | /control-pagos | /comisiones |
|-----|---|------------|----------|----------------|-------------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| vendedor | ❌→/operativo | ✅ | ✅ | ❌ | ✅ |
| jefe_ventas | ❌→/locales | ❌→/locales | ✅ | ✅ | ✅ |
| vendedor_caseta | ❌→/locales | ✅ | ✅ | ❌ | ✅ |
| coordinador | ❌→/locales | ❌→/locales | ✅ | ❌ | ✅ |
| **finanzas** | ❌→/control-pagos | ❌→/control-pagos | ❌→/control-pagos | ✅ | ❌→/control-pagos |

**2. Nuevo usuario creado:**
- **Rosa Quispe** (rosaquispef@ecoplaza.com)
- Rol: `finanzas`
- Password: `u$432##faYh1`
- vendedor_id: `null` (no es vendedor, no tiene relación con tabla vendedores)

**3. Nueva tabla `clientes_ficha` (ejecutado en Supabase)**
```sql
CREATE TABLE clientes_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id UUID NOT NULL REFERENCES locales(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Datos Titular (19 campos)
  titular_nombres, titular_apellido_paterno, titular_apellido_materno,
  titular_tipo_documento, titular_numero_documento, titular_fecha_nacimiento,
  titular_lugar_nacimiento, titular_estado_civil, titular_nacionalidad,
  titular_direccion, titular_distrito, titular_provincia, titular_departamento,
  titular_celular, titular_telefono_fijo, titular_email,
  titular_ocupacion, titular_centro_trabajo, titular_ruc,

  -- Datos Cónyuge (11 campos)
  tiene_conyuge BOOLEAN DEFAULT false,
  conyuge_nombres, conyuge_apellido_paterno, conyuge_apellido_materno,
  conyuge_tipo_documento, conyuge_numero_documento, conyuge_fecha_nacimiento,
  conyuge_lugar_nacimiento, conyuge_nacionalidad, conyuge_ocupacion,
  conyuge_celular, conyuge_email,

  -- Marketing y metadata
  utm_source, utm_detalle, observaciones, vendedor_id,
  created_at, updated_at
);
```

**4. Ficha de Inscripción Modal**

| Archivo | Descripción |
|---------|-------------|
| `lib/actions-clientes-ficha.ts` (NUEVO) | Server actions: `getClienteFichaByLocalId()`, `upsertClienteFicha()` |
| `components/locales/FichaInscripcionModal.tsx` | Modal completo con formulario editable |
| `components/locales/LocalesTable.tsx` | Botón "Iniciar ficha de inscripción" en locales NARANJA |

**Características del modal:**
- Pre-llena nombre y teléfono desde el lead
- Secciones: Local, Titular (19 campos), Cónyuge (toggle + 11 campos), Marketing, Observaciones
- Dropdowns: Tipo documento (DNI/CE/Pasaporte), Estado civil, UTM source
- Guarda automáticamente via `upsertClienteFicha()` (insert o update)

**5. Reorganización templates ficha inscripción**
```
templates/ficha-inscripcion/
├── templates/
│   └── template-estandar.html
└── configs/
    ├── proyecto-pruebas.json (con campo "template": "template-estandar")
    └── preview-proyecto-pruebas.html
```

**6. Eliminación columna `lead_id` de `control_pagos`**
- Columna nunca se usaba (siempre NULL)
- Linking real es via `lead_nombre` y `lead_telefono` (snapshot)
- Backup guardado en `consultas-leo/control_pagos_rows.sql`

**Scripts de usuarios actualizados:**
- `consultas-leo/manage-users/create-rosa-finanzas.js` (NUEVO - patrón sin vendedor)

**Commits:**
- `4457f49` - feat: Add clientes_ficha editable form to FichaInscripcionModal
- `8f3ccb7` - feat: Restrict finanzas role to only /control-pagos access
- `9ef44b4` - fix: Allow finanzas role to access /control-pagos page

---

### **Sesión 63** (30 Nov) - 🛠️ ✅ **Múltiples mejoras UX + Fix timezone**
**Tipo:** Mejoras de UX + Fixes
**Estado:** ✅ **DEPLOYED TO STAGING**

**Fixes implementados:**

| Fix | Descripción | Commit |
|-----|-------------|--------|
| Timezone fecha pago | `new Date().toISOString()` convertía a UTC causando salto de día | `599d6c0` |
| Botón Marcar Pagada | Dropdown se cortaba al final de tabla → botón directo | `77d430a` |
| Limpieza teléfonos | Import Excel ahora limpia +, espacios, guiones | `704c871` |

**Features implementados:**

| Feature | Descripción | Commit |
|---------|-------------|--------|
| Gráfico 3 barras | Chart comisiones muestra Disponible/Pagado/Pendiente por mes | `80aa914` |
| Modal comparativo | Click en Precio Base abre modal con barras comparativas | `a5226f0` |
| Tooltip personalizado | Componente reutilizable con animación y flecha | `5724901` |

**Archivos nuevos:**
- `components/control-pagos/PrecioComparativoModal.tsx`
- `components/shared/Tooltip.tsx`

**Archivos modificados:**
- `components/locales/FinanciamientoModal.tsx` - Fix timezone
- `components/comisiones/ComisionesChart.tsx` - 3 barras agrupadas
- `components/comisiones/ComisionesDesgloseMensual.tsx` - Botón directo
- `components/leads/LeadImportModal.tsx` - Limpieza teléfonos
- `components/control-pagos/ControlPagosClient.tsx` - Modal + Tooltip
- `app/globals.css` - Animación fade-in

**Ver detalles →** [Sesiones Noviembre](docs/sesiones/2025-11-noviembre.md#sesión-63---30-noviembre-2025)

---

### **Sesión 62** (30 Nov) - 🐛 ✅ **Fix Trigger Comisiones: PostgreSQL Cascade Issue**
**Tipo:** Bug crítico - Análisis + Fix permanente
**Problema reportado:** Al completar pago inicial de 3 locales (PRUEBA-11, PRUEBA-14, PRUEBA-15), solo PRUEBA-11 pasó comisiones a "Disponible"
**Estado:** ✅ **DEPLOYED & VERIFIED**

**Síntomas del bug (iniciales):**
- PRUEBA-11: Inicial completada ($4,250) → Comisiones en "Disponible" ✅
- PRUEBA-14: Inicial completada ($4,000) → Comisiones en "Pendiente" ❌
- PRUEBA-15: Inicial completada ($4,000) → Comisiones en "Pendiente" ❌

**Root Cause Identificado: PostgreSQL Trigger Cascade Issue**

**Hipótesis inicial descartada:** Precisión decimal (NO era el problema)
- Los montos eran exactos (diferencia = 0.00)
- Estado de `pagos_local` era `completado` en todos los casos

**Causa raíz real: Triggers anidados no se disparan consistentemente**

```
FLUJO PROBLEMÁTICO:
INSERT en abonos_pago
↓
TRIGGER 1: update_monto_abonado_and_estado() [AFTER INSERT on abonos_pago]
  → UPDATE pagos_local SET estado = 'completado'
  ↓
  TRIGGER 2: actualizar_comisiones_inicial_pagado() [AFTER UPDATE on pagos_local]
  → ⚠️ NO SE DISPARABA CONSISTENTEMENTE (trigger cascade issue)
```

**Patrón del bug:**
- PRUEBA-11 tenía **2 abonos**: `pendiente` → `parcial` → `completado` ✅
- PRUEBA-14/15 tenían **1 abono**: `pendiente` → `completado` ❌

Con 2 abonos, el segundo UPDATE disparaba el trigger correctamente.
Con 1 abono, el UPDATE dentro del trigger 1 no disparaba el trigger 2.

**Solución implementada: Integrar lógica en función única**

En lugar de depender del trigger cascade, se movió la lógica de actualización de comisiones directamente a `update_monto_abonado_and_estado()`:

```sql
CREATE OR REPLACE FUNCTION update_monto_abonado_and_estado()
RETURNS TRIGGER AS $$
DECLARE
  pago_record RECORD;
  total_abonado NUMERIC;
  nuevo_estado VARCHAR(20);
BEGIN
  SELECT * INTO pago_record FROM pagos_local WHERE id = NEW.pago_id;

  SELECT COALESCE(SUM(monto), 0) INTO total_abonado
  FROM abonos_pago WHERE pago_id = NEW.pago_id;

  nuevo_estado := CASE
    WHEN total_abonado >= pago_record.monto_esperado THEN 'completado'
    WHEN total_abonado > 0 AND total_abonado < pago_record.monto_esperado THEN 'parcial'
    ELSE 'pendiente'
  END;

  UPDATE pagos_local
  SET monto_abonado = total_abonado, estado = nuevo_estado, updated_at = NOW()
  WHERE id = NEW.pago_id;

  -- NUEVO: Actualizar comisiones directamente si inicial se completa
  IF pago_record.tipo = 'inicial'
     AND nuevo_estado = 'completado'
     AND pago_record.estado != 'completado' THEN
    UPDATE comisiones
    SET estado = 'disponible', fecha_disponible = NOW()
    WHERE control_pago_id = pago_record.control_pago_id
      AND estado = 'pendiente_inicial';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Fix temporal aplicado a datos existentes:**
```sql
UPDATE comisiones
SET estado = 'disponible', fecha_disponible = NOW()
WHERE control_pago_id IN (
  '8c2dfdd5-7f16-47f0-8c29-b374e02afd03', -- PRUEBA-14
  '92a450ea-4748-4073-91a4-7bf58b24bc2c'  -- PRUEBA-15
)
AND estado = 'pendiente_inicial';
```

**Testing realizado:**

| Escenario | Local | Resultado |
|-----------|-------|-----------|
| Pago único (100%) | PRUEBA-12 | ✅ Comisiones → disponible |
| Pago parcial + final | PRUEBA-10 | ✅ Comisiones → disponible |
| Verificación datos anteriores | PRUEBA-11/14/15 | ✅ Todas en disponible |

**Estado final verificado:**
- 19 comisiones totales ahora en estado `disponible`
- `fecha_disponible` poblada correctamente
- Sistema funcionando para pagos únicos y parciales

**Bug secundario investigado: "Usuario equivocado en trazabilidad"**
- Usuario reportó que "Bloqueó local (🔴)" mostraba admin en vez de jefe_ventas
- Investigación de `locales_historial` confirmó que admin (gerente) SÍ realizó las acciones
- NO era bug - el usuario había confundido quién ejecutó las acciones
- Trazabilidad funcionando correctamente

**Archivos modificados:**
- `supabase/migrations/20251123_create_pagos_system.sql` - Función actualizada en Supabase directamente

**Lecciones aprendidas:**
- **PostgreSQL trigger cascades** no son confiables para lógica crítica de negocio
- Integrar lógica relacionada en la misma función es más robusto
- Siempre probar con **diferentes patrones de datos** (1 abono vs múltiples)
- Verificar historial antes de asumir bugs de trazabilidad

---

### **Sesión 61** (30 Nov) - 🔐 ✅ **RLS Policy + Modal Trazabilidad para Vendedores**
**Feature:** Permitir a vendedores ver comisiones de otros vendedores en el modal de trazabilidad
**Problema resuelto:** Vendedores solo veían SUS comisiones en el modal, no las de otros participantes del mismo local
**Estado:** ✅ **DEPLOYED & TESTED**

**Contexto del problema:**
- En la página `/comisiones`, cuando un vendedor hacía click en "% COM" para ver el desglose
- El modal "Desglose de Comisiones" solo mostraba SU comisión
- No podía ver las comisiones de otros vendedores que participaron en el mismo local
- Ejemplo: Local PRUEBA-11 con Leo D Leon y Alonso → Leo solo veía su comisión, no la de Alonso

**Root Cause:**
- RLS policy original solo permitía ver comisiones donde `usuario_id = auth.uid()`
- No contemplaba el caso de ver comisiones de locales donde el usuario participó

**Solución implementada en 3 FASES:**

**FASE 1: Mover trigger del modal (Frontend)**
- Archivo: `components/comisiones/ComisionesDesgloseMensual.tsx`
- Cambio: Click en columna "% COM" abre el modal (antes era columna vendedor)
- El porcentaje ahora es clickeable con estilo `text-blue-600 hover:underline`

**FASE 2: Habilitar modal para todos los roles (Frontend)**
- Archivo: `components/comisiones/SplitComisionesModal.tsx`
- Agregada prop `userRole` para filtrar comisiones por fase
- Vendedor/vendedor_caseta solo ven fase "vendedor" (no "gestión")
- Admin/jefe_ventas ven todas las fases

**FASE 3: Nueva RLS Policy (Database)**
- **Policy anterior:**
```sql
CREATE POLICY "Usuarios pueden ver sus propias comisiones" ON comisiones
FOR SELECT TO authenticated
USING (
  (usuario_id = auth.uid())
  OR
  (EXISTS (SELECT 1 FROM usuarios WHERE usuarios.id = auth.uid() AND usuarios.rol IN ('admin', 'jefe_ventas')))
);
```

- **Policy nueva:**
```sql
CREATE POLICY "Usuarios pueden ver comisiones de locales donde participaron" ON comisiones
FOR SELECT TO authenticated
USING (
  -- Admin y jefe_ventas ven TODO
  (EXISTS (SELECT 1 FROM usuarios WHERE usuarios.id = auth.uid() AND usuarios.rol IN ('admin', 'jefe_ventas')))
  OR
  -- Usuario ve sus propias comisiones
  (usuario_id = auth.uid())
  OR
  -- Usuario confirmó local NARANJA
  (local_id IN (SELECT l.id FROM locales l WHERE l.usuario_paso_naranja_id = auth.uid()))
  OR
  -- Usuario es vendedor asignado al lead (via locales_leads)
  (local_id IN (
    SELECT ll.local_id
    FROM locales_leads ll
    INNER JOIN usuarios u ON u.vendedor_id = ll.vendedor_id
    WHERE u.id = auth.uid()
  ))
);
```

**Análisis técnico de la RLS:**

| Caso | ¿Cubierto? | Cómo |
|------|------------|------|
| Admin/Jefe ve todo | ✅ | `EXISTS` en tabla `usuarios` |
| Usuario ve SUS comisiones | ✅ | `usuario_id = auth.uid()` |
| "Confirmó local (🟠)" | ✅ | `locales.usuario_paso_naranja_id = auth.uid()` |
| "Lead asignado a" | ✅ | JOIN `locales_leads` → `usuarios` donde `usuarios.id = auth.uid()` |

**¿Por qué NO hay recursión?**
- La policy de `comisiones` consulta: `usuarios`, `locales`, `locales_leads`
- Ninguna consulta la tabla `comisiones` dentro de su propia policy
- Esto evita el error `42P17: infinite recursion detected`

**Intentos fallidos documentados:**
1. **Service role key bypass** - Error: `supabaseKey is required` (no disponible en client-side)
2. **Subquery en misma tabla** - Error: `42P17: infinite recursion detected`

**Beneficios:**
- ✅ Vendedores ven comisiones de todos los participantes en el modal
- ✅ Tabla principal sigue mostrando solo SUS comisiones (sin cambio)
- ✅ Filtro por fase funciona (vendedores no ven fase "gestión")
- ✅ No rompe funcionalidad existente de admin/jefe
- ✅ Performance OK (queries usan índices existentes)

**SQL de rollback (backup):**
```sql
DROP POLICY IF EXISTS "Usuarios pueden ver comisiones de locales donde participaron" ON comisiones;

CREATE POLICY "Usuarios pueden ver sus propias comisiones" ON comisiones
FOR SELECT TO authenticated
USING (
  (usuario_id = auth.uid())
  OR
  (EXISTS (SELECT 1 FROM usuarios WHERE usuarios.id = auth.uid() AND usuarios.rol IN ('admin', 'jefe_ventas')))
);
```

**Archivos modificados:**
- `components/comisiones/ComisionesDesgloseMensual.tsx` - Click en % COM abre modal
- `components/comisiones/SplitComisionesModal.tsx` - Filtro por userRole
- Supabase RLS Policy en tabla `comisiones`

**Testing realizado:**
- ✅ Vendedor Leo D Leon puede ver comisiones de Alonso en mismo local
- ✅ Vendedor solo ve fase "vendedor" en modal
- ✅ Admin ve todas las fases en modal
- ✅ Tabla principal sin cambios (cada quien ve solo sus comisiones)

**Commit:** Pendiente (cambios en frontend listos, RLS ya aplicada en Supabase)

---

### **Sesión 59** (28 Nov) - 👥 ⏳ **Sistema de Vista Dual para /comisiones (Tabs Admin/Jefe)**
**Feature:** Tabs "Mis Comisiones" / "Control de Todas" para admin y jefe_ventas
**Problema resuelto:** Admin y jefe_ventas necesitan ver tanto sus comisiones como las de todo el equipo
**Estado:** ⏳ **PENDING QA REVIEW**
**QA Document:** `QA_TESTING_SESSION_59.md`

**Implementación completa en 3 FASES:**

**FASE 1: Backend (BackDev)**
- Archivo: `lib/actions-comisiones.ts` (+82 líneas)
- **Nueva función:** `getAllComisionStats()`
  - Calcula stats consolidados de TODAS las comisiones (sin filtro por usuario)
  - Validación: Solo admin y jefe_ventas pueden ejecutarla
  - Retorna: `ComisionStats` con totales globales
- Export agregado al módulo

**FASE 2: Frontend - Page.tsx con Tabs (FrontDev)**
- Archivo: `app/comisiones/page.tsx` (+60 líneas)

**Cambios implementados:**

1. **State para tabs:**
   ```typescript
   const [activeTab, setActiveTab] = useState<'mis' | 'control'>('mis');
   ```

2. **State para datos duales:**
   - `comisiones` + `stats` (propias del usuario)
   - `allComisiones` + `allStats` (todas las comisiones - solo admin/jefe)

3. **Fetch dual en `fetchData()`:**
   - SIEMPRE fetch de comisiones propias (todos los roles)
   - Admin/Jefe: TAMBIÉN fetch de todas las comisiones (paralelo)
   ```typescript
   if (user.rol === 'admin' || user.rol === 'jefe_ventas') {
     const allCom = await getAllComisiones();
     const allSt = await getAllComisionStats();
     setAllComisiones(allCom);
     setAllStats(allSt);
   }
   ```

4. **UI de tabs (solo admin/jefe):**
   - Botón "Mis Comisiones" (default activo)
   - Botón "Control de Todas"
   - Border verde en tab activo (color primary)
   - Vendedores NO ven tabs (vista simple)

5. **Headers dinámicos:**
   - Tab "Mis": "Mis Comisiones" / "Tus comisiones generadas por ventas de locales"
   - Tab "Control": "Control de Todas las Comisiones" / "Vista consolidada de comisiones de todos los vendedores"

6. **Renderizado condicional:**
   - Stats Cards: Reciben `allStats` en tab "Control", `stats` en tab "Mis"
   - Chart: Reciben `allStats` en tab "Control", `stats` en tab "Mis"
   - Tabla: Recibe `allComisiones` en tab "Control", `comisiones` en tab "Mis"
   - Props adicionales a tabla: `showVendedorColumn` y `showVendedorFilter` en tab "Control"

**FASE 3: Frontend - Modificar ComisionesDesgloseMensual (FrontDev)**
- Archivo: `components/comisiones/ComisionesDesgloseMensual.tsx` (+50 líneas)

**Cambios implementados:**

1. **Nuevas props opcionales:**
   ```typescript
   showVendedorColumn?: boolean;  // Default: false
   showVendedorFilter?: boolean;  // Default: false
   ```

2. **State nuevo:**
   ```typescript
   const [filtroVendedor, setFiltroVendedor] = useState<string>('todos');
   ```

3. **Helper `vendedoresUnicos`:**
   - Extrae lista única de vendedores (Map<id, nombre>)
   - Solo se ejecuta si `showVendedorFilter === true`
   - Retorna array de objetos `{ id, nombre }`

4. **Lógica de filtrado:**
   - Agregado filtro por vendedor (ANTES de otros filtros)
   - Solo aplica si `showVendedorFilter === true` y `filtroVendedor !== 'todos'`
   - Filtra por `comision.usuario_id === filtroVendedor`

5. **Grid de filtros (barra superior):**
   - **Sin filtro vendedor:** 3 columnas (búsqueda, estado, año)
   - **Con filtro vendedor:** 4 columnas (búsqueda, vendedor, estado, año)
   - Grid responsivo: `md:grid-cols-3` o `md:grid-cols-4`

6. **Dropdown filtro vendedor:**
   - Opción default: "Todos los vendedores"
   - Opciones dinámicas generadas de `vendedoresUnicos`
   - Icon Filter a la izquierda
   - Styling consistente con otros dropdowns

7. **Columna VENDEDOR en tabla (condicional):**
   - **Header:** "Vendedor" (entre Proyecto y Monto Venta)
   - **Body:** `{comision.usuario_nombre || 'N/A'}`
   - Solo visible si `showVendedorColumn === true`
   - Styling: `text-sm text-gray-700`

**FLUJO COMPLETO (End-to-End):**

**1. Vendedor/Vendedor Caseta:**
- Abre `/comisiones`
- NO ve tabs (vista simple)
- Ve solo SUS comisiones
- Tabla NO muestra columna VENDEDOR
- Filtros NO incluyen dropdown vendedor
- Comportamiento: IGUAL que antes

**2. Admin - Tab "Mis Comisiones":**
- Abre `/comisiones` (tab "Mis" activo por default)
- Stats cards: Solo SUS totales
- Chart: Solo SUS datos
- Tabla: Solo SUS comisiones
- NO ve columna VENDEDOR
- NO ve filtro por vendedor
- NO ve columna ACCIONES (solo en tab "Control")

**3. Admin - Tab "Control de Todas":**
- Click en tab "Control de Todas"
- Stats cards: Totales consolidados de TODOS los vendedores
- Chart: Datos consolidados
- Tabla: TODAS las comisiones del sistema
- VE columna VENDEDOR (con nombres)
- VE filtro por vendedor (dropdown)
- VE columna ACCIONES (botón "Marcar Pagada")
- Puede filtrar por vendedor específico
- Puede marcar comisiones como pagadas

**4. Jefe Ventas - Tab "Mis Comisiones":**
- Comportamiento IDÉNTICO a Admin (caso 2)

**5. Jefe Ventas - Tab "Control de Todas":**
- Stats consolidados: SÍ
- Tabla completa con VENDEDOR: SÍ
- Filtro por vendedor: SÍ
- **Columna ACCIONES: NO** (solo admin puede marcar como pagadas)

**Beneficios:**
- ✅ Admin/jefe pueden ver tanto sus comisiones como las del equipo completo
- ✅ Cambio de tab instantáneo (datos pre-cargados en mount)
- ✅ Filtro por vendedor permite análisis rápido por persona
- ✅ Vendedores mantienen vista simple sin cambios
- ✅ RBAC correcto (solo admin marca como pagadas)
- ✅ Componentes existentes intactos (backward compatible)

**Testing pendiente (QADev):**
- Ver `QA_TESTING_SESSION_59.md` para checklist completo (21 test cases)
- **Test cases críticos:**
  1. Vendedor no accede a "Control de Todas" (security)
  2. Jefe no puede marcar como pagada (security)
  3. Admin tab "Control" muestra todas las comisiones correctamente
  4. Integración: Marcar pagada actualiza DB y stats

**Próximos pasos (futuro):**
- Persistir tab activo en localStorage (refresh mantiene tab)
- Exportar vista consolidada a Excel (admin)
- Dashboard de comisiones por vendedor (analytics)

**Archivos modificados:**
- lib/actions-comisiones.ts (+82 líneas)
- app/comisiones/page.tsx (+60 líneas)
- components/comisiones/ComisionesDesgloseMensual.tsx (+50 líneas)

**Archivos nuevos:**
- QA_TESTING_SESSION_59.md (checklist completo)

**Líneas totales:** +192 líneas netas
**Commit:** Pendiente (después de QA approval)

---

### **Sesión 58** (28 Nov) - 📅 ⏳ **Sistema Desglose Mensual de Comisiones**
**Feature:** Vista mensual accordion de comisiones con filtros inteligentes y lazy loading
**Estado:** ⏳ **PENDING QA REVIEW**
**QA Document:** `QA_TESTING_SESSION_58.md`

**Implementación completa en 3 FASES:**

**FASE 1: Backend (BackDev)**
- Archivo: `lib/actions-comisiones.ts` (+1 línea)
- Cambio: Agregado campo `fecha_disponible: string | null` a interface `Comision`
- SQL: Columna ya existente en DB (migration previa)
- No se modificaron queries (SELECT ya incluye el campo)

**FASE 2: Frontend - Componente Nuevo (FrontDev)**
- Archivo: `components/comisiones/ComisionesDesgloseMensual.tsx` (NUEVO, 460 líneas)

**Características implementadas:**

1. **Lógica de agrupación híbrida por mes:**
   - **Pendiente Inicial:** Aparece en mes de `fecha_procesado` (mes de venta)
   - **Disponible:** SE MUEVE a mes de `fecha_disponible` (mes que se completó inicial)
   - **Pagada:** PERMANECE en mes de `fecha_pago_comision` (mes de pago)

   **Ejemplo de flujo:**
   - Venta procesada 15 nov → Comisión en "Noviembre 2025" (pendiente)
   - Inicial completa 20 dic → Comisión SE MUEVE a "Diciembre 2025" (disponible)
   - Admin paga 28 dic → Comisión permanece en "Diciembre 2025" (pagada)

2. **Sistema de filtros:**
   - **Búsqueda:** Por código de local o nombre de proyecto (input con icon Search)
   - **Estado:** Dropdown (Todos, Pendiente Inicial, Disponible, Pagada)
   - **Año:** Dropdown dinámico con años disponibles en los datos
   - Combinación de filtros funciona simultáneamente

3. **Accordions por mes:**
   - **Header clickeable:**
     - Icon ChevronDown/Up (expande/colapsa)
     - Nombre del mes (ej: "Noviembre 2025")
     - Count + total (ej: "5 comisiones • Total: $4,250.00")
     - Badges de estado con counts y montos:
       - 🟡 Pendiente: N ($X)
       - 🟢 Disponible: N ($X)
       - 🟣 Pagada: N ($X)
   - **Body expandible:** Tabla detallada (9 columnas)
   - **Mes actual expandido por defecto** (useEffect inicial)
   - Múltiples meses pueden estar expandidos simultáneamente

4. **Tabla detallada (9 columnas):**
   - Código Local
   - Proyecto
   - Monto Venta (formato USD)
   - Fase (badge: Vendedor/Gestión)
   - % Comisión
   - Monto Comisión (bold verde)
   - Estado (badge: Pendiente/Disponible/Pagada)
   - Fecha Procesado
   - **Fecha Disponible** (muestra "-" si es null)

5. **Lazy loading:**
   - Muestra últimos **6 meses** por defecto
   - Botón "Cargar 6 meses más antiguos" al final
   - Ordenamiento descendente (más reciente primero)
   - Si no hay más meses, botón desaparece

6. **Empty states:**
   - Sin comisiones: Icon Calendar + mensaje "No hay comisiones para mostrar"
   - Filtros sin resultados: Mensaje "Intenta ajustar los filtros"

**FASE 3: Integración (FrontDev)**
- Archivo: `app/comisiones/page.tsx` (+2 líneas)
- Cambios:
  1. Import `ComisionesDesgloseMensual`
  2. Agregar componente entre `ComisionesChart` y `ComisionesTable`
- **Orden visual final:**
  1. ComisionStatsCards (widgets totales)
  2. ComisionesChart (gráfico de barras)
  3. **ComisionesDesgloseMensual** (NUEVO - accordions mensuales)
  4. ComisionesTable (tabla existente - SIN MODIFICAR)

**Componentes NO modificados (verified):**
- `ComisionStatsCards.tsx` - Widgets funcionan igual
- `ComisionesChart.tsx` - Gráfico funciona igual (datos mockeados Sesión 53)
- `ComisionesTable.tsx` - Tabla funciona igual (botón "Marcar Pagada", etc.)

**Design System:**
- **Colores corporativos:**
  - Verde comisiones: `text-green-600` (bold)
  - Badges pendiente: `bg-yellow-100 text-yellow-800`
  - Badges disponible: `bg-green-100 text-green-800`
  - Badges pagada: `bg-purple-100 text-purple-800`
  - Badges vendedor: `bg-blue-100 text-blue-800`
  - Badges gestión: `bg-indigo-100 text-indigo-800`
- **Icons:** Search, Filter, Calendar, ChevronDown, ChevronUp (Lucide React)
- **Formato montos:** USD con 2 decimales (`$1,234.56`)
- **Formato fechas:** `DD/MM/YYYY` (locale es-PE)

**Beneficios:**
- ✅ Vista temporal clara de evolución de comisiones
- ✅ Filtros permiten análisis rápido por estado/año
- ✅ Lazy loading previene sobrecarga con muchos meses
- ✅ Lógica híbrida de agrupación refleja ciclo de vida real de comisión
- ✅ No rompe funcionalidad existente (componentes intactos)

**Testing pendiente (QADev):**
- Ver `QA_TESTING_SESSION_58.md` para checklist completo (8 categorías, 30+ test cases)
- Categorías: Agrupación, Filtros, Accordions, Lazy loading, Responsive, Edge cases, Integración, Performance

**Próximos pasos (futuro):**
- Integrar datos reales en `ComisionesChart` (actualmente usa mocks Sesión 53)
- Vista consolidada admin/jefe_ventas (actualmente todos ven solo SUS comisiones)
- Columna "Cliente" en tabla detallada (si se requiere)
- Exportar reporte mensual a PDF/Excel

**Archivos modificados:**
- lib/actions-comisiones.ts (+1 línea)
- app/comisiones/page.tsx (+2 líneas)

**Archivos creados:**
- components/comisiones/ComisionesDesgloseMensual.tsx (460 líneas)
- QA_TESTING_SESSION_58.md (checklist completo)

**Líneas totales:** +463 líneas netas
**Commit:** Pendiente (después de QA approval)

---

### **Sesión 57** (28 Nov) - 📊 ✅ **Dashboard Admin UX + Horizontal Bar Chart UTM**
**Feature:** Mejoras de UX en dashboard admin + nuevo gráfico de barras horizontales para UTM
**Estado:** ✅ **DEPLOYED TO STAGING**

**Cambios implementados:**

**1. Swap de Widgets en Stats Grid**
- **Cambio:** Posiciones intercambiadas entre "Leads Incompletos" y "En Conversación"
- **Commit:** `3c98c37`

**2. Widget Mini Tabla (reemplaza "Leads Incompletos")**
- **Nuevo widget:** Mini tabla con 3 filas mostrando estados secundarios
- **Contenido:**
  - Lead Manual (púrpura)
  - Lead Incompleto (amarillo)
  - Abandonado (gris)
- **Styling:**
  - Bordes dotted entre filas (último sin borde)
  - Padding compacto (`p-4`, `pb-1`, `py-1`, `pt-1`)
  - Hover effect (`hover:bg-gray-50 transition-all duration-200`)
- **Commits:** `b44c9fe`, `a12b508`, `e9ba636`, `b47f2ba`, `1823cca`

**3. Horizontal Bar Chart para UTM (reemplaza PieChart)**
- **Problema:** PieChart limitaba a 5 UTMs + "Otros", ocultando fuentes importantes
- **Solución:** Nuevo componente `HorizontalBarChart.tsx` que muestra TODAS las fuentes
- **Características:**
  - Barras horizontales ordenadas de mayor a menor
  - Height dinámico según cantidad de items
  - Labels a la izquierda, valores a la derecha
  - Colores predefinidos para UTMs conocidos (victoria, facebook, google, etc.)
  - Fallback colors para UTMs desconocidos
  - Total de leads al pie del gráfico
  - Tooltip con detalle al hover
- **Archivos:**
  - `components/dashboard/HorizontalBarChart.tsx` (nuevo, 72 líneas)
  - `components/dashboard/DashboardClient.tsx` (modificado)
- **Commit:** `8a5da22`

**Visual del nuevo gráfico:**
```
victoria      ████████████████████  456
facebook      ██████████████        312
google        ████████████          287
instagram     ██████████            245
whatsapp      ████████              198
referido      ██████                156
...todos los UTMs visibles...

Total: 1,668 leads
```

**Archivos modificados:**
- `components/dashboard/DashboardClient.tsx` - Stats grid + import HorizontalBarChart + utmData sin límite
- `components/dashboard/HorizontalBarChart.tsx` (nuevo)

**Commits:**
- `3c98c37` - feat: Swap widget positions
- `b44c9fe` - feat: Replace Leads Incompletos with mini table
- `a12b508` - fix: Remove space-y-3 class
- `e9ba636` - feat: Add dotted borders between rows
- `b47f2ba` - feat: Reduce padding for compact widgets
- `1823cca` - feat: Add hover background color
- `8a5da22` - feat: Replace UTM pie chart with horizontal bar chart

---

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
- **RLS recursión infinita (error 42P17)** - NUNCA hacer subquery a la misma tabla dentro de su policy (ej: `SELECT FROM comisiones WHERE... IN (SELECT FROM comisiones)` causa recursión). Usar tablas diferentes como `locales`, `usuarios`, `locales_leads` para las condiciones

### **PostgreSQL Triggers**
- **Trigger cascades NO son confiables** - Un UPDATE dentro de un trigger NO garantiza disparar otro trigger AFTER UPDATE en la misma transacción
- **Integrar lógica relacionada en la misma función** es más robusto que depender de triggers encadenados
- **Probar con diferentes patrones de datos** - Un bug puede manifestarse solo con 1 registro pero funcionar con 2+ (ej: pago único vs pagos parciales)

### **Desarrollo**
- Rollback es herramienta válida (no temer usarlo)
- Cambios quirúrgicos > rewrites completos
- Documentación exhaustiva previene errores futuros
- Testing incremental ahorra tiempo (FASE 1 antes de FASE 2)
- **SIEMPRE** verificar patrones existentes del proyecto antes de implementar nuevas páginas
- Glob archivos en /lib/ para verificar qué utilidades existen antes de asumir
- Leer páginas existentes (page.tsx, operativo/page.tsx) para seguir mismo patrón de auth
- NO asumir que archivos existen sin verificar - build errors tienen prioridad

### **Regla de Filtro por Proyecto (OBLIGATORIA - Sesión 64)**
- **TODO se filtra por proyecto seleccionado** - Todas las funciones de query (getAllControlPagos, getAllComisiones, etc.) DEBEN recibir `proyectoId` y filtrar por proyecto
- **NUNCA mostrar datos globales** a menos que el usuario lo solicite explícitamente
- **El proyecto viene de localStorage** (`selectedProyecto.id`) en client components
- **El proyecto viene de cookies** (`getSelectedProyectoId()`) en server components
- Ejemplo correcto: `getAllControlPagos(proyectoId)` con filtro `.eq('proyecto_id', proyectoId)`
- Ejemplo incorrecto: `getAllControlPagos()` sin filtro (mostraría todos los proyectos)

### **TypeScript & PDF Generation**
- **Tuple types explícitos** para arrays de tamaño fijo: `const color: [number, number, number] = [255, 0, 0]` en vez de `const color = [255, 0, 0]`
- **jsPDF autoTable alignment** requiere configuración en DOS lugares: `headStyles.halign` para headers Y `columnStyles[n].halign` para body
- **Margin consistency** entre secciones y tablas: usar mismo valor de margin para alinear elementos
- **Colores semánticos** en tablas mejoran legibilidad: rojo=gasto, azul=reducción deuda, verde=valor total

### **Convenciones UI/UX (OBLIGATORIAS)**
- **Input type="number"**: SIEMPRE agregar `onWheel={(e) => e.currentTarget.blur()}` para evitar cambios accidentales con scroll wheel
  ```tsx
  <input
    type="number"
    onWheel={(e) => e.currentTarget.blur()}
    // ... otros props
  />
  ```
- **Tooltips personalizados**: Usar componente `@/components/shared/Tooltip` en vez del title nativo del navegador
- **Fechas locales**: Usar `getFullYear()`, `getMonth()`, `getDate()` en vez de `toISOString()` para evitar problemas de timezone

### **docx-templates (Generación de Contratos Word)**
- **Comandos en párrafos separados (CRÍTICO)**: `{IF}`, `{END-IF}`, `{FOR}`, `{END-FOR}` DEBEN estar solos en su propio párrafo Word
  - Usar ENTER (no Shift+Enter) para crear nuevo párrafo
  - Múltiples comandos en misma línea causa error "infinite loop or massive dataset detected"
  - Incorrecto: `{END-IF} {IF tiene_conyuge}` ❌
  - Correcto: Cada comando en línea separada ✅
- **Análisis de templates problemáticos**: Extraer `word/document.xml` del .docx (es un ZIP) para ver estructura XML real
- **Post-procesamiento con JSZip**: Los comandos dejan párrafos vacíos que se deben eliminar con `removeEmptyParagraphs()`
- **Regex ES5 compatibility**: Usar `[\s\S]` en lugar de `.` con flag `s` que no es soportado en ES5
- **Variables anidadas**: Usar notación de punto (`{cliente.nombres}`) para objetos anidados
- **Condicionales con arrays**: `{IF array.length}` funciona para verificar si array tiene elementos

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
