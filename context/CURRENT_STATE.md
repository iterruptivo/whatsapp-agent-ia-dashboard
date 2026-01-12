# CURRENT_STATE - EcoPlaza Dashboard

> Estado detallado del proyecto. Actualizado cada sesion.

---

## AUDIT COMPLETADO: Sistema RBAC (12 Enero 2026)

**Reporte completo:** `docs/architecture/RBAC_AUDIT_REPORT_2026.md`
**Resumen ejecutivo:** `docs/architecture/RBAC_AUDIT_SUMMARY.md`
**Auditor:** DataDev (Database Architect)

### Resultado: Sistema Implementado al 95%

**Calificación Global:** C+ (65/100)
- Infraestructura de BD: A+ (100%)
- Código TypeScript: A (100%)
- Aplicación en Rutas: C- (40%)
- Testing: F (0%)

**Estado:**
- ✅ 5 tablas RBAC con schema completo
- ✅ 8 roles configurados (admin, gerencia, jefe_ventas, marketing, finanzas, coordinador, vendedor, vendedor_caseta)
- ✅ 62 permisos granulares (leads:read, ventas:approve, etc.)
- ✅ 200+ relaciones rol-permiso asignadas
- ✅ 3 funciones SQL (check_permiso, get_permisos_usuario, audit_log)
- ✅ 10+ políticas RLS activas
- ✅ 7 archivos TypeScript en lib/permissions/ completamente implementados
- ✅ Feature flag ENABLE_RBAC=true activo
- ⚠️ **PENDIENTE:** Aplicar RBAC en las 12 rutas principales (aún usan validación legacy)

**Recomendación:** Completar Fase 1-2 (80h) para activar RBAC en producción

---

## PROYECTO ACTIVO: Procesos Contabilidad-Finanzas-Ventas

**Plan aprobado:** `docs/planes/PLAN_PROCESOS_FINANZAS_VENTAS_2025.md`
**Fecha inicio:** 01 Enero 2025
**Deadline:** Viernes 03 Enero (revision con Victoria)

### Fases de Implementacion

| Fase | Estado | Descripcion |
|------|--------|-------------|
| **1. Constancias** | COMPLETADO | 3 tipos: Separacion, Abono, Cancelacion - Templates en Supabase Storage |
| **2. OCR Documentos** | COMPLETADO | GPT-4 Vision para vouchers/DNI/boletas - Requiere OPENAI_API_KEY |
| **3. Validacion Bancaria** | COMPLETADO | Import Excel + Matching automatico - 4 bancos configurados |
| **4. Pagos Consolidados** | COMPLETADO | 1 voucher = N locales - Auto-distribuir, busqueda por DNI/codigo |
| **5. Aprobacion Descuentos** | COMPLETADO | Rangos configurables, workflow aprobacion, WhatsApp |
| **6. Expediente Digital** | COMPLETADO | Timeline + Checklist + PDF expediente |
| **7. Contratos Flexibles** | COMPLETADO | Template proyecto o custom por contrato |
| 8. Facturacion Electronica | FUTURO | NubeFact (cuando tengan API key) |

### FASE 1 - Constancias (COMPLETADO)
- **Templates:** `templates/constancias/*.docx` + Supabase Storage bucket `constancias-templates`
- **Server Actions:** `lib/actions-constancias.ts`
- **Componente:** `components/control-pagos/GenerarConstanciaButton.tsx`
- **Integracion:** Botones en PagosPanel (Separacion, Abono verificado, Cancelacion 100%)
- **Sintaxis:** docx-templates usa `{FOR item IN items}...{$item.campo}...{END-FOR item}`

### FASE 2 - OCR Documentos (COMPLETADO + MEJORADO)
- **Server Actions:** `lib/actions-ocr.ts` - GPT-4 Vision para vouchers, DNI, boletas
- **Componentes:**
  - `components/shared/DocumentoOCRCard.tsx` - Preview + datos extraidos
  - `components/shared/VoucherOCRUploader.tsx` - Upload con OCR automatico
  - `components/shared/DocumentoOCRUploader.tsx` - **MULTI-IMAGEN** (02 Enero 2026)
- **API Route:** `app/api/ocr/extract/route.ts`
- **Integracion:**
  - RegistrarAbonoModal con "Captura Inteligente" expandible
  - FichaInscripcionModal con DNI (max 10) y Comprobantes (max 5)
- **Features Multi-Imagen:**
  - OCR inteligente: solo primera imagen ejecuta OCR
  - Galeria responsive con grid
  - Drag & drop multiple
  - Eliminacion individual
  - Preview modal fullscreen
- **REQUISITO:** Agregar `OPENAI_API_KEY=sk-...` en `.env.local`

### FASE 3 - Validacion Bancaria (COMPLETADO)
- **Tablas DB:** `config_bancos`, `importaciones_bancarias`, `transacciones_bancarias`
- **Migracion:** `supabase/migrations/20260101_validacion_bancaria.sql`
- **Server Actions:** `lib/actions-validacion-bancaria.ts`
- **Componentes:**
  - `components/validacion-bancaria/ImportarEstadoCuentaModal.tsx` - Upload Excel/CSV
  - `components/validacion-bancaria/MatchingPanel.tsx` - Matching manual/automatico
- **Pagina:** `app/validacion-bancaria/page.tsx`
- **Bancos configurados:** Interbank, BCP, BBVA, Scotiabank (con formatos Excel especificos)
- **Acceso:** Admin, Jefe Ventas, Finanzas (via Sidebar > Finanzas)

### FASE 4 - Pagos Consolidados (COMPLETADO)
- **Tablas DB:** `pagos_consolidados`, `pagos_consolidados_distribucion`
- **Migracion:** `supabase/migrations/20260102_pagos_consolidados.sql`
- **Server Actions:** `lib/actions-pagos-consolidados.ts`
  - `getLocalesCliente(proyectoId, dni)` - Buscar locales por DNI
  - `getLocalPorCodigo(proyectoId, codigo)` - Buscar por codigo
  - `createPagoConsolidado(input)` - Crear pago con distribucion
  - `verificarPagoConsolidado(id, usuarioId)` - Verificar (rol finanzas)
- **Componente:** `components/control-pagos/PagoConsolidadoModal.tsx`
- **Features:**
  - 1 voucher = N locales (distribucion flexible)
  - Busqueda por DNI o codigo de local
  - Auto-distribuir: llena cuotas en orden hasta agotar monto
  - Validacion: total distribuido = monto voucher
- **Integracion:** Boton "Pago Consolidado" en Control de Pagos

### FASE 5 - Aprobacion Descuentos (COMPLETADO)
- **Tablas DB:** `config_aprobaciones_descuento`, `aprobaciones_descuento`
- **Migracion:** `supabase/migrations/20260103_aprobaciones_descuento.sql` (EJECUTADA)
- **Server Actions:** `lib/actions-aprobaciones.ts`
  - `getConfigAprobaciones(proyectoId)` - Obtener config de rangos
  - `saveConfigAprobaciones(proyectoId, config)` - Guardar config
  - `crearSolicitudAprobacion(input)` - Crear solicitud
  - `getAprobacionesPendientes(proyectoId, rol)` - Listar pendientes
  - `aprobarDescuento(id, usuario)` - Aprobar
  - `rechazarDescuento(id, usuario, comentario)` - Rechazar
- **Componentes:**
  - `components/configuracion/AprobacionesConfigPanel.tsx` - Config rangos por proyecto
  - `components/aprobaciones/AprobacionesPendientesPanel.tsx` - Ver/aprobar/rechazar
- **Pagina:** `app/aprobaciones/page.tsx`
- **Webhook:** `app/api/webhooks/notificar-aprobacion/route.ts` (n8n -> WhatsApp)
- **Acceso:** Admin y Jefe Ventas (via Sidebar > Finanzas > Aprobaciones)
- **Features:**
  - Rangos de descuento configurables por proyecto
  - Aprobadores por rol (jefe_ventas, admin)
  - Notificaciones WhatsApp via n8n
  - Historial de aprobaciones

### FASE 6 - Expediente Digital (COMPLETADO)
- **Tabla DB:** `expediente_eventos` + columnas en control_pagos (expediente_completo, checklist_documentos)
- **Migracion:** `supabase/migrations/20260101_expediente_digital.sql` (EJECUTADA)
- **Server Actions:** `lib/actions-expediente.ts`
  - `getExpedienteTimeline(controlPagoId)` - Obtener timeline con eventos
  - `registrarEventoExpediente(input)` - Registrar nuevo evento
  - `actualizarChecklist(controlPagoId, tipo, completado)` - Actualizar checklist
  - `getExpedienteParaPDF(controlPagoId)` - Obtener datos para PDF
  - `getDocumentosExpediente(controlPagoId)` - Listar documentos del expediente
- **Componente:** `components/control-pagos/ExpedienteDigitalPanel.tsx`
- **PDF:** `lib/pdf-expediente.ts` - Genera PDF con datos cliente, local, pagos, documentos, timeline
- **Features:**
  - Vista Timeline cronologico de eventos
  - Checklist de documentos (DNI, vouchers, constancias, contrato)
  - Descarga PDF del expediente completo
  - Estadisticas (total eventos, documentos, estado)
- **Integracion:** Boton "Expediente" en PagosPanel (header)

### FASE 7 - Contratos Flexibles (COMPLETADO)
- **Tabla DB:** Columnas en `control_pagos`:
  - `contrato_template_personalizado_url` - URL del template custom usado
  - `contrato_template_usado` - Nombre del template usado
  - `contrato_generado_url` - URL del contrato generado
  - `contrato_generado_at` - Fecha de generacion
- **Migracion:** `supabase/migrations/20260101_contratos_flexibles.sql` (EJECUTADA)
- **Server Actions:** `lib/actions-contratos.ts`
  - `generateContrato(controlPagoId, tipoCambio, templateBase64?, templateNombre?)` - Genera con template proyecto o custom
  - `downloadProyectoTemplate(proyectoId)` - Descarga template para revision
  - `getProyectoTemplateInfo(proyectoId)` - Info del template configurado
- **Componente:** `components/control-pagos/GenerarContratoModal.tsx`
- **Features:**
  - Opcion template del proyecto (recomendado, por defecto)
  - Opcion template personalizado (upload .docx)
  - Boton "Descargar para revisar" template del proyecto
  - Preview de datos del contrato (cliente, local, monto, proyecto)
  - Input tipo de cambio configurable
  - Validacion de archivos (.docx, max 10MB)
- **Integracion:** Boton "Contrato" en tabla ControlPagosClient abre modal

---

## Credenciales de Testing

> REGLA MANDATORIA: SIEMPRE usar **PROYECTO PRUEBAS** al iniciar sesion para testing.

| Rol | Email | Password |
|-----|-------|----------|
| **Admin** | `gerencia@ecoplaza.com` | `q0#CsgL8my3$` |
| **Jefe Ventas** | `leojefeventas@ecoplaza.com` | `67hgs53899#` |
| **Vendedor** | `alonso@ecoplaza.com` | `Q0KlC36J4M_y` |
| **Vendedor Caseta** | `leocaseta@ecoplaza.com` | `y62$3904h%$$3` |
| **Finanzas** | `rosaquispef@ecoplaza.com` | `u$432##faYh1` |

---

## Estado de Modulos

### Autenticacion
- **Estado:** ESTABLE (Sesion 45I)
- **Uptime:** 100%
- **Session duration:** 2+ horas sin problemas
- **Tecnologia:** Supabase Auth + Middleware validation

### Leads
- **Estado:** OPERATIVO
- **Total:** ~43,000 leads
- **Features:** Import manual, import Excel, keyset pagination
- **Ultima sesion:** 74

### Locales
- **Estado:** OPERATIVO
- **Total:** 3,559 locales
- **Features:** Semaforo 4 estados, Real-time, Monto venta, PDF financiamiento
- **Ultima sesion:** 74

### Usuarios
- **Estado:** OPERATIVO
- **Total:** 77 usuarios activos
- **Roles:** admin, jefe_ventas, vendedor, vendedor_caseta, coordinador, finanzas, marketing
- **Ultima sesion:** 74

### Proyectos
- **Estado:** OPERATIVO
- **Total:** 12 proyectos
- **Features:** Configuracion TEA, cuotas, porcentajes
- **Ultima sesion:** 74

### Control de Pagos
- **Estado:** OPERATIVO
- **Features:** Calendario cuotas, abonos, verificacion finanzas
- **Ultima sesion:** 74

### Comisiones
- **Estado:** OPERATIVO
- **Features:** Desglose mensual, split vendedor/gestion, RLS policies
- **Ultima sesion:** 74

### Repulse
- **Estado:** OPERATIVO
- **Features:** Re-engagement leads, cron diario 3:00 AM, exclusion permanente
- **Ultima sesion:** 74

### Documentos
- **Estado:** OPERATIVO
- **Features:** Logo dinamico, PDF ficha inscripcion, Contratos Word (docx-templates)
- **Ultima sesion:** 74

---

## Arquitectura Tecnica

### Stack
- **Frontend:** Next.js 15.5.4, TypeScript, Tailwind CSS, Recharts
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Integraciones:** n8n (3 flujos activos), GPT-4o-mini (chatbot)
- **Deployment:** Vercel
- **Generacion Docs:** docx-templates (Word), jsPDF (PDF)

### Patrones Clave
- Client Components con `useAuth()` hook
- Middleware.ts para RBAC
- Server Actions con Supabase client (cookies)
- RLS policies en todas las tablas

---

## Flujos n8n Activos

1. **Victoria - Eco - Callao - PROD** - Captura leads WhatsApp
2. **Victoria - Eco - Urb. San Gabriel** - Proyecto apertura
3. **Repulse Webhook** - Re-engagement automatico

---

## Integraciones Externas

- **WhatsApp:** Via WATI + n8n
- **OpenAI:** GPT-4o-mini para chatbot Victoria, GPT-4 Vision para OCR
- **Supabase Storage:** Logos, documentos, evidencias, constancias

---

---

## MIGRACION OCR VOUCHERS - San Gabriel

### Contexto
Antes de desplegar a producción, debemos migrar las fichas existentes para que tengan datos OCR en `comprobante_deposito_ocr`.

### Fichas a Migrar (11 total, 31 vouchers)

| Local | Cliente | Vouchers | Ficha ID |
|-------|---------|----------|----------|
| LOCAL-101 | María Isabel Sierra | 3 | 9e10bc97-dcb2-4fea-a191-72a37ea63762 |
| LOCAL-189 | Mery Pari | 5 | 01172e19-1793-406c-84ec-a5861bfc5685 |
| LOCAL-382 | Jhon Francis Cuadros | 2 | 1740656f-1525-44fd-975a-1f063efe3916 |
| LOCAL-392 | Denis David Meza | 3 | a29cb749-de1a-4e43-99ba-bb8c62ec465c |
| LOCAL-459 | Ana Julia Martinez | 4 | a8f268ed-13bc-461a-8af4-4af4acc245b1 |
| LOCAL-508 | Reyna Petronila Tello | 3 | 2481bf8b-d592-4bcb-9a82-4dbe6913c2cb |
| LOCAL-586 | Ana Julia Martinez | 3 | b2f5e369-452c-49f9-8116-b605204602bf |
| LOCAL-60 | Mauro Ivan Moran | 2 | 1ce9d226-5f00-4436-a740-9e6aee86798f |
| LOCAL-71 | Hector Gamboa | 1 | a62098d4-0085-422c-8918-d1eb922237fb |
| LOCAL-712 | Mary Agustina Hilari | 3 | 85469b81-91de-4a78-9289-4134c5439266 |
| LOCAL-723 | Jocabed Inga | 2 | e7c1d342-fae0-4922-9185-331be55a5e4f |

### Script de Migración
- **Archivo:** `scripts/migrate-vouchers-ocr.js`
- **Costo estimado:** ~$0.62 USD (31 vouchers × $0.02)

### Estado
- [x] Script creado - `scripts/migrate-vouchers-ocr.js`
- [x] Migración ejecutada - 03 Enero 2026
- [x] Verificación completada - 100% éxito (31/31 vouchers)

### Resultados
| Métrica | Valor |
|---------|-------|
| Fichas procesadas | 11 |
| Vouchers procesados | 31 |
| Exitosos | 31 |
| Fallidos | 0 |
| Tasa de éxito | 100.0% |

---

## MIGRACION DNI - Nuevo Formato + OCR

### Contexto
Las URLs de DNI usaban formato antiguo (`{timestamp}_{index}.jpg`) que no era reconocido por el nuevo componente DNIPairUploader. Se migraron al formato nuevo (`titular-frente-{timestamp}.jpg`).

### Resultados
| Métrica | Valor |
|---------|-------|
| Fichas procesadas | 11 |
| Imágenes procesadas | 19 |
| Exitosas | 19 |
| Tasa de éxito | 100.0% |

### Fichas con Cónyuge (corregidas)
| Local | Titular | Cónyuge |
|-------|---------|---------|
| LOCAL-392 | FELICITA GREMILDA SANCHEZ | DENIS DAVID MEZA |
| LOCAL-60 | MAURO IVAN MORAN (frente+reverso) | MARIA ERIKA HUATUCO (frente+reverso) |
| LOCAL-712 | HUBER LUIS INOCENTE | MARY AGUSTINA HILARI |

### Scripts Creados
- `scripts/migrate-dni-format.js` - Migración principal
- `scripts/fix-conyuge-dni.js` - Corrección cónyuges
- `scripts/check-dni-urls.js` - Verificación URLs
- `scripts/download-dni-images.js` - Descarga para revisión

---

**Ultima Actualizacion:** 03 Enero 2026
**Sesion:** 81 - Migración OCR vouchers San Gabriel
