# 📅 SESIONES DICIEMBRE 2025

## Índice
- [Sesión 64](#sesión-64---2-diciembre-2025) - Sistema Generación Documentos (Análisis + DB + UI)
- [Sesión 64B](#sesión-64b---3-diciembre-2025) - Template HTML Ficha de Inscripción
- [Sesión 65](#sesión-65---5-diciembre-2025) - Sistema Repulse: Integración /operativo + Exclusiones
- [Sesión 65B](#sesión-65b---5-diciembre-2025-continuación) - Sistema Repulse: Webhook n8n + UI Improvements
- [Sesión 65C](#sesión-65c---7-diciembre-2025) - Widget Quota WhatsApp + Mejoras UX
- [Sesión 66](#sesión-66---8-diciembre-2025) - 👥 Sistema Administración de Usuarios
- [Sesión 67](#sesión-67---9-diciembre-2025) - 🔐 Sistema Verificación por Finanzas + Liberación de Comisiones
- [Sesión 68](#sesión-68---11-diciembre-2025) - 📞🔄 Limpieza Teléfonos + Cron Repulse Diario
- [Sesión 72](#sesión-72---16-diciembre-2025) - 📊 Página de Reportería Multi-Proyecto (Vista Matriz)
- [Sesión 73](#sesión-73---17-diciembre-2025) - 👤 Acceso a Insights para Jefe de Ventas

---

## Sesión 64 - 2 Diciembre 2025

### 📄 Sistema de Generación de Documentos (Análisis + DB + UI)

**Tipo:** Feature - Análisis, Diseño e Implementación
**Estado:** ✅ FASE 1-5 COMPLETADAS (5/8 fases)
**Documentación completa:** [Módulo Documentos](../modulos/documentos.md)
**Commit:** `f8afd2a`
**Deploy:** ✅ STAGING

---

### Objetivo

Implementar generación automática de documentos legales (Acuerdo de Separación) a partir de un template Word, rellenando datos dinámicamente desde el sistema.

---

### Trabajo Realizado

#### FASE 1: Preparación de Herramientas ✅

1. **Instalación Python + python-docx**
   - Python 3.13.9 instalado en Windows
   - Librería `python-docx` para lectura de archivos Word
   - Extracción exitosa del contenido del template

#### FASE 2: Análisis del Documento ✅

**Archivo analizado:** `consultas-leo/Modelo - Acuerdo de Separación (VF).docx`

**Estructura identificada:**
| Sección | Contenido |
|---------|-----------|
| Título | ACUERDO DE SEPARACIÓN |
| Introducción | Datos de comprador(es) y vendedor |
| PRIMERA | Empresa, RUC, proyecto, ubicación, partida electrónica |
| SEGUNDA | Monto separación, cuenta bancaria, datos del local |
| TERCERO | Plazo (5 días) y penalidades |
| CUARTO | Información mínima INDECOPI |
| Firmas | Fecha, firmas comprador(es) y vendedor |

**Campos dinámicos identificados:** 20+ campos entre empresa, proyecto, local y cliente

#### FASE 3: Diseño de Base de Datos ✅

**Decisión arquitectónica:** Todos los campos de configuración en tabla `proyectos`

**Razón:** Cada proyecto puede pertenecer a una empresa diferente con:
- Diferente RUC
- Diferentes representantes legales
- Diferentes cuentas bancarias

**Campos JSONB para datos múltiples:**
- `representantes_legales` - Array de {nombre, dni, cargo}
- `cuentas_bancarias` - Array de {banco, numero, tipo, moneda}

#### FASE 4: Migración SQL Ejecutada ✅

```sql
-- Campos simples
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS razon_social VARCHAR(200);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS ruc VARCHAR(11);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS domicilio_fiscal TEXT;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS ubicacion_terreno TEXT;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS partida_electronica VARCHAR(50);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS zona_registral VARCHAR(100);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS plazo_firma_dias INTEGER DEFAULT 5;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS penalidad_porcentaje INTEGER DEFAULT 100;

-- Campos JSONB
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS representantes_legales JSONB DEFAULT '[]';
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS cuentas_bancarias JSONB DEFAULT '[]';
```

**Estado:** ✅ Ejecutado exitosamente en Supabase

#### FASE 5: Interfaces TypeScript + UI + Server Action ✅

**Interfaces actualizadas (3 archivos):**

1. **`lib/db.ts`**
   ```typescript
   export interface RepresentanteLegal {
     nombre: string;
     dni: string;
     cargo: string;
   }

   export interface CuentaBancaria {
     banco: string;
     numero: string;
     tipo: 'Corriente' | 'Ahorros';
     moneda: 'USD' | 'PEN';
   }

   export interface Proyecto {
     // ... campos existentes ...
     razon_social?: string | null;
     ruc?: string | null;
     domicilio_fiscal?: string | null;
     ubicacion_terreno?: string | null;
     partida_electronica?: string | null;
     zona_registral?: string | null;
     plazo_firma_dias?: number;
     penalidad_porcentaje?: number;
     representantes_legales?: RepresentanteLegal[];
     cuentas_bancarias?: CuentaBancaria[];
   }
   ```

2. **`lib/actions-proyecto-config.ts`**
   - Mismas interfaces agregadas
   - `getProyectosWithConfigurations()` - SELECT incluye campos legales
   - `saveProyectoConfiguracion()` - Acepta y guarda campos legales

3. **`app/configuracion-proyectos/page.tsx`** (+386 líneas)
   - Nueva sección "Datos para Trámites Legales"
   - Grid responsive (3 cols desktop, 2 tablet, 1 mobile)
   - Campos:
     - Razón Social
     - RUC
     - Zona Registral
     - Domicilio Fiscal (2 cols)
     - Partida Electrónica
     - Ubicación del Terreno (3 cols)
     - Plazo para Firma (días)
     - Penalidad por Desistimiento (%)
   - Subsección Representantes Legales (add/remove dinámico)
   - Subsección Cuentas Bancarias (add/remove dinámico)
   - `handleSave()` actualizado para enviar todos los campos

---

### Decisiones Técnicas

| Decisión | Opción Elegida | Razón |
|----------|----------------|-------|
| Ubicación de config empresa | Todo en `proyectos` | Cada proyecto puede tener diferente RUC/empresa |
| Formato multi-valor | JSONB arrays | Simplicidad vs tablas relacionales |
| Moneda default | USD | Requerimiento del negocio |
| Librería generación | docx-templates | Mantiene formato Word exacto |
| UI Layout | Grid responsive | Mejor UX en todos los dispositivos |

---

### Archivos Creados/Modificados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `lib/db.ts` | Modificado | +25 líneas (interfaces + campos Proyecto) |
| `lib/actions-proyecto-config.ts` | Modificado | +54 líneas (interfaces + SELECT/UPDATE) |
| `app/configuracion-proyectos/page.tsx` | Modificado | +386 líneas (UI completa) |
| `docs/modulos/documentos.md` | Creado | Módulo de documentación oficial |
| `docs/sesiones/2025-12-diciembre.md` | Creado | Esta documentación |
| `CLAUDE.md` | Modificado | Agregado módulo y sesión al índice |
| Tabla `proyectos` en Supabase | Modificada | +10 columnas (migración previa) |

**Total:** +1,149 líneas netas

---

### Próximos Pasos (Fases Pendientes)

| # | Tarea | Prioridad | Estado |
|---|-------|-----------|--------|
| 1 | ~~UI para editar configuración proyecto~~ | Alta | ✅ DONE |
| 2 | ~~Actualizar interface TypeScript `Proyecto`~~ | Alta | ✅ DONE |
| 3 | Agregar DNI/dirección a leads o control_pagos | Alta | ⏳ Pendiente |
| 4 | Instalar docx-templates | Media | ⏳ Pendiente |
| 5 | Crear template Word con placeholders | Media | ⏳ Pendiente |
| 6 | Server Action para generar documento | Media | ⏳ Pendiente |
| 7 | Botón "Generar Acuerdo" en Control de Pagos | Media | ⏳ Pendiente |
| 8 | Conversión a PDF (opcional) | Baja | ⏳ Pendiente |

---

### Testing Pendiente

- [ ] Verificar UI en `/configuracion-proyectos` (staging)
- [ ] Agregar representante legal y guardar
- [ ] Agregar cuenta bancaria y guardar
- [ ] Verificar persistencia en Supabase (tabla `proyectos`)
- [ ] Verificar responsive en mobile/tablet

---

### Referencias

- **Template original:** `consultas-leo/Modelo - Acuerdo de Separación (VF).docx`
- **Documentación detallada:** `consultas-leo/SESION_64_GENERACION_DOCUMENTOS.md`
- **Módulo oficial:** [docs/modulos/documentos.md](../modulos/documentos.md)
- **Librería recomendada:** https://github.com/guigrpa/docx-templates

---

**Commit:** `f8afd2a`
**Deploy:** ✅ STAGING

---

## Sesión 64B - 3 Diciembre 2025

### 📄 Template HTML Ficha de Inscripción

**Tipo:** Feature - Diseño de Template
**Estado:** ✅ TEMPLATE COMPLETO
**Archivos:** `templates/ficha-inscripcion/`

---

### Objetivo

Crear un template HTML responsive y printable para la "Ficha de Inscripción" de clientes, que servirá como base para la generación dinámica de documentos.

---

### Trabajo Realizado

#### Estructura del Template

**Archivo principal:** `templates/ficha-inscripcion/preview-proyecto-pruebas.html`

**Secciones implementadas:**

| # | Sección | Descripción |
|---|---------|-------------|
| 1 | Datos del Proyecto | Proyecto, rubro, área, local, nivel, ubicación |
| 2 | Datos del Cliente (Titular) | Información completa del comprador (20+ campos) |
| 3 | Datos del Cónyuge | Información del cónyuge si aplica |
| 3B | Otros Copropietarios | **NUEVO** - Tabla compacta para copropietarios adicionales |
| 4 | UIN | Modalidad pago, precios, financiamiento, cuotas |
| 5 | ¿Cómo se enteró? | Grid 8x2 con opciones de marketing |
| 6 | Datos del Asesor | Nombre, código, fecha de registro |
| - | Firmas | Titular, cónyuge, copropietarios, asesor, jefe ventas |

#### Campos Implementados

**Sección 2 - Datos del Cliente:**
- Nombres (apellido paterno, materno, nombres)
- Documento (DNI/CE/Pasaporte + número)
- Nacimiento (fecha, lugar)
- Estado civil (checkboxes)
- Nacionalidad
- Dirección domiciliaria (completa con distrito, provincia, departamento, referencia)
- Contacto (celular, email)
- Ocupación y centro de trabajo
- Género y edad
- Ingresos y nivel de estudios
- Tipo de trabajador y puesto
- Cantidad de hijos
- ¿Cuenta con propiedades?
- ¿Cuenta con tarjeta de crédito?
- Motivo de la compra

**Sección 3 - Datos del Cónyuge:**
- Mismos campos que titular + parentesco

**Sección 3B - Copropietarios (NUEVO):**
- Tabla compacta con 5 columnas:
  - Nombre completo
  - Documento
  - Teléfono
  - Email
  - Parentesco
- Soporta N copropietarios adicionales
- Firmas dinámicas generadas automáticamente

**Sección 4 - UIN (actualizada):**
- Modalidad de pago (Contado/Financiado)
- Precio Local / Puesto / Lote
- T. Cambio (tipo de cambio USD/PEN)
- Monto de Separación (formato: $X,XXX.XX - S/ X,XXX.XX)
- Fecha de Separación
- Cuota Inicial (USD y %)
- Saldo a Financiar
- Número de Cuotas
- TEA (%)
- Cuota Mensual
- Entidad Bancaria
- Fecha Inicio de Pago
- Compromiso Pago (detalle)

**Sección 5 - Marketing:**
Grid 8x2 con opciones:
| Caseta | Facebook | Instagram | WhatsApp | Pag. Web | Volante | Panel Publicitario | Ferias |
| Evento Presencial | Publicidad en Buses | Panel de Ruta | TikTok | Referido | Programa TV | Radio | Revistas |

#### Estilos CSS

- **Responsive:** Media queries para 768px y 480px
- **Print-ready:** Estilos específicos para impresión
- **Colores corporativos:**
  - Verde principal: `#1b967a`
  - Azul secundario: `#192c4d`
- **Checkboxes:** Estilo visual con ✓ en casillas marcadas
- **Tables:** `.marketing-table`, `.copropietarios-table`, `.data-table`
- **Signatures:** Grid 2x2 con líneas de firma

#### Archivos en carpeta templates/

```
templates/ficha-inscripcion/
├── preview-proyecto-pruebas.html  # Template HTML completo
├── config-proyecto-pruebas.json   # Configuración + datos de ejemplo
└── template-base.html             # (referencia)
```

---

### Decisiones de Diseño

| Decisión | Opción Elegida | Razón |
|----------|----------------|-------|
| Copropietarios múltiples | Opción Híbrida | Cónyuge en sección completa + tabla compacta para otros |
| Sección Observaciones | Eliminada | No requerida por el negocio |
| Marketing | Tabla 8x2 | Mejor visualización que grid CSS |
| Tipo de cambio | Campo separado | Permite mostrar monto en USD y PEN |
| Firmas dinámicas | Por copropietario | Cada copropietario firma individualmente |

---

### Próximos Pasos (Integración con Sistema)

| # | Tarea | Descripción |
|---|-------|-------------|
| 1 | Campo "¿Copropietarios?" | Toggle Sí/No + cantidad |
| 2 | Formulario dinámico | Generar N filas según cantidad |
| 3 | Array en JSON | `copropietarios: [{...}, {...}]` |
| 4 | Generador iterativo | Loop para crear filas en tabla y firmas |
| 5 | Integración control_pagos | Usar datos de venta para rellenar template |

---

### Vista Previa

Para ver el template, abrir en navegador:
```
templates/ficha-inscripcion/preview-proyecto-pruebas.html
```

---

## Sesión 65 - 5 Diciembre 2025

### 🔄 Sistema Repulse: Integración /operativo + Exclusiones

**Tipo:** Feature - Integración UI
**Estado:** ✅ COMPLETADO
**Branch:** `feature/repulse`
**Documentación completa:** [Módulo Repulse](../modulos/repulse.md)

---

### Objetivo

Integrar el sistema Repulse en la página `/operativo` permitiendo:
1. Agregar leads a repulse de forma individual y masiva
2. Excluir leads permanentemente del sistema de repulse
3. Visualizar estado de exclusión en panel de detalles

---

### Trabajo Realizado

#### FASE 1: Selección Múltiple en LeadsTable ✅

**Archivo:** `components/dashboard/LeadsTable.tsx`

- Checkboxes en cada fila de la tabla
- Checkbox "Select All" en header
- Contador de leads seleccionados
- Botón "Enviar a Repulse" (color amber/amarillo)
- Botón "Limpiar" con icono X y borde

**Nuevas props agregadas:**
```typescript
showRepulseSelection?: boolean;
selectedLeadIds?: string[];
onSelectionChange?: (ids: string[]) => void;
onSendToRepulse?: () => void;
isAddingToRepulse?: boolean;
```

#### FASE 2: Botón Individual en LeadDetailPanel ✅

**Archivo:** `components/dashboard/LeadDetailPanel.tsx`

- Sección "Repulse" al final del panel
- Botón "Enviar a Repulse" (individual)
- Botón "Excluir permanentemente de Repulse" con borde rojo
- Badge rojo cuando lead está excluido
- Link "Reincluir" para quitar exclusión

**Nuevas props agregadas:**
```typescript
onSendToRepulse?: (leadId: string) => void;
onToggleExcludeRepulse?: (leadId: string, exclude: boolean) => void;
showRepulseButton?: boolean;
```

#### FASE 3: Campo excluido_repulse en Interface ✅

**Archivo:** `lib/db.ts`

```typescript
export interface Lead {
  // ... campos existentes ...
  excluido_repulse: boolean;
}
```

#### FASE 4: Handlers en OperativoClient ✅

**Archivo:** `components/dashboard/OperativoClient.tsx`

Handlers implementados:
- `handleSendToRepulse(leadId)` - Agregar individual
- `handleSendMultipleToRepulse()` - Agregar batch
- `handleToggleExcludeRepulse(leadId, exclude)` - Toggle exclusión

---

### Decisiones Técnicas

| Decisión | Opción Elegida | Razón |
|----------|----------------|-------|
| Ubicación botones selección | Junto a "Leads Recientes" | Mejor UX, visible sin scroll |
| Color botón repulse | Amber/Amarillo | Diferencia de acciones principales |
| Exclusión | Campo en tabla `leads` | Persiste aunque se elimine de `repulse_leads` |
| Borde botón excluir | Rojo | Indicar acción destructiva |

---

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `lib/db.ts` | +1 campo `excluido_repulse` en interface Lead |
| `components/dashboard/LeadsTable.tsx` | +100 líneas (checkboxes, selección, botones) |
| `components/dashboard/LeadDetailPanel.tsx` | +60 líneas (sección repulse) |
| `components/dashboard/OperativoClient.tsx` | +80 líneas (handlers) |
| `docs/modulos/repulse.md` | Nuevo - Documentación completa |

---

### Commits

| Hash | Mensaje |
|------|---------|
| `4e210fc` | feat: add repulse integration in /operativo page |
| `86c9ab2` | fix: correct property names for addMultipleLeadsToRepulse response |
| `6d32171` | refactor: move repulse selection actions next to table title |
| `9702f8c` | style: add border and X icon to "Limpiar" button |
| `a3d9a2f` | feat: add repulse exclusion toggle in LeadDetailPanel |
| `a9fbb2f` | style: add red border to exclude repulse button |

---

### Fixes Durante la Sesión

**Error TypeScript en Vercel:**
```
Property 'error' does not exist on type
'{ success: boolean; added: number; skipped: number; errors: string[]; }'
```

**Solución:** Actualizar acceso a propiedades del response:
- `result.error` → `result.errors[0]`
- `result.insertedCount` → `result.added`
- `result.duplicateCount` → `result.skipped`

---

## Sesión 65B - 5 Diciembre 2025 (Continuación)

### 🔄 Sistema Repulse: Webhook n8n + UI Improvements

**Tipo:** Feature - Integración n8n + UX
**Estado:** ✅ COMPLETADO
**Branch:** `feature/repulse`

---

### Objetivo

1. Integrar envío de mensajes Repulse via webhook n8n
2. Mejorar UX con modales elegantes
3. Sincronizar estado entre `/operativo` y `/repulse`

---

### Trabajo Realizado

#### FASE 1: Integración Webhook n8n ✅

**Archivo:** `lib/actions-repulse.ts`

Nueva función `enviarRepulseViaWebhook()`:
- Envía cada lead individualmente al webhook (n8n Switch requiere un item por request)
- Payload: `{ telefono, mensaje, nombre, proyectoId, lead_id, repulse_lead_id }`
- Delay de 500ms entre envíos para evitar rate limits de WhatsApp
- Retorna contadores de enviados/errores con detalles

**Variable de entorno requerida:**
```
N8N_REPULSE_WEBHOOK_URL=https://iterruptivo.app.n8n.cloud/webhook/repulse-send
```

#### FASE 2: Modal de Envío con Resultados ✅

**Archivo:** `components/repulse/RepulseEnvioModal.tsx`

- Llama a `prepararEnvioRepulseBatch()` para registrar en historial
- Luego llama a `enviarRepulseViaWebhook()` para enviar mensajes
- Vista de resultado con:
  - Icono verde/amarillo/rojo según éxito
  - Contadores de enviados y fallidos
  - Detalle de los primeros 5 envíos
  - Mensaje de error si webhook no está configurado

#### FASE 3: Emoji Picker ✅

**Archivos:** `RepulseEnvioModal.tsx`, `RepulseTemplateModal.tsx`

- Dynamic import de `emoji-picker-react` (evita SSR issues)
- Botón de emoji en textarea de mensaje personalizado
- Inserta emoji en posición del cursor
- Popover con cierre al click fuera

#### FASE 4: ConfirmModal en RepulseClient ✅

**Archivo:** `components/repulse/RepulseClient.tsx`

Reemplazados `confirm()` del navegador por `ConfirmModal`:
- State para controlar modal: `{ isOpen, type, targetId }`
- Funciones: `openRemoveConfirm`, `openExcluirConfirm`, `closeConfirmModal`, `handleConfirmAction`
- Variante `warning` (amarillo) para eliminar
- Variante `danger` (rojo) para excluir

#### FASE 5: Fix Sincronización Reincluir ✅

**Archivo:** `lib/actions-repulse.ts`

Bug: Al reincluir desde `/operativo`, solo se actualizaba `leads.excluido_repulse = false`
pero el registro en `repulse_leads` quedaba con `estado = 'excluido'`.

**Solución:** `reincluirLeadEnRepulse()` ahora también actualiza:
```typescript
await supabase
  .from('repulse_leads')
  .update({ estado: 'pendiente' })
  .eq('lead_id', leadId)
  .eq('estado', 'excluido');
```

---

### Commits de la Sesión

| Hash | Mensaje |
|------|---------|
| `1c4c800` | feat: integrate n8n webhook for repulse message sending |
| `07b704f` | fix: send proyecto_id to n8n webhook for routing |
| `015b604` | feat: replace browser confirm() with ConfirmModal in RepulseClient |
| `3a09381` | fix: sync repulse_leads status when re-including lead from /operativo |

---

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `lib/actions-repulse.ts` | +100 líneas (webhook, fix reincluir) |
| `components/repulse/RepulseEnvioModal.tsx` | +80 líneas (webhook call, result UI, emoji) |
| `components/repulse/RepulseTemplateModal.tsx` | +50 líneas (emoji picker) |
| `components/repulse/RepulseClient.tsx` | +60 líneas (ConfirmModal) |

---

### Flujo Completo de Envío Repulse

```
1. Usuario selecciona leads en /repulse
2. Click "Enviar Repulse"
3. Modal: Selecciona template o escribe mensaje personalizado
4. Click "Enviar Repulse"
5. prepararEnvioRepulseBatch():
   - Registra en repulse_historial
   - Actualiza estado a 'enviado'
   - Incrementa conteo_repulses
6. enviarRepulseViaWebhook():
   - Envía cada lead al webhook n8n
   - n8n Switch rutea por proyectoId
   - WhatsApp Graph API envía mensaje
7. Modal muestra resultados (enviados/fallidos)
```

---

### Testing End-to-End ✅

**Fecha:** 6 Diciembre 2025
**Estado:** ✅ EXITOSO

**Problema encontrado durante testing:**
- El Switch de n8n usaba `{{ $json.proyectoId }}` pero el webhook recibe el payload dentro de `body`
- **Solución:** Cambiar a `{{ $json.body.proyectoId }}` en n8n

**Resultado del test:**
- Flujo n8n ejecuta correctamente (Succeeded in 911ms)
- Mensaje de WhatsApp enviado y recibido ✅

**Nota importante para testing:**
> WhatsApp Business API no permite enviar mensajes al mismo número asociado a la cuenta de negocio (anti-spam).
> Para probar, usar un lead con número diferente al del administrador/tester.

---

### Cron Job Configurado ✅

**Fecha:** 6 Diciembre 2025

Habilitado pg_cron en Supabase y configurado job para detección automática cada 15 días:

```sql
SELECT cron.schedule(
  'detectar-leads-repulse',
  '0 18 */15 * *',
  $$
  SELECT detectar_leads_repulse(id)
  FROM proyectos
  WHERE activo = true
  $$
);
```

| Campo | Valor |
|-------|-------|
| **Nombre** | detectar-leads-repulse |
| **Schedule** | `0 18 */15 * *` (1:00 PM Perú, cada 15 días) |
| **Estado** | ✅ active |

**Comandos útiles:**
```sql
-- Verificar job
SELECT * FROM cron.job;

-- Eliminar job (si necesario)
SELECT cron.unschedule('detectar-leads-repulse');

-- Ver historial de ejecuciones
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

### Función de Detección + Reactivación ✅

**Fecha:** 6 Diciembre 2025

La función `detectar_leads_repulse()` realiza dos operaciones:

1. **Detectar nuevos leads** (30+ días sin compra)
2. **Reactivar leads enviados** (15+ días desde último envío)

```sql
CREATE OR REPLACE FUNCTION detectar_leads_repulse(p_proyecto_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count_nuevos INTEGER := 0;
  v_count_reactivados INTEGER := 0;
BEGIN
  -- 1. Insertar leads nuevos (30+ días sin compra)
  INSERT INTO repulse_leads (lead_id, proyecto_id, origen, estado)
  SELECT l.id, l.proyecto_id, 'cron_automatico', 'pendiente'
  FROM leads l
  WHERE l.proyecto_id = p_proyecto_id
    AND l.excluido_repulse = FALSE
    AND l.created_at <= NOW() - INTERVAL '30 days'
    AND NOT EXISTS (SELECT 1 FROM locales_leads ll WHERE ll.lead_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM repulse_leads rl WHERE rl.lead_id = l.id AND rl.proyecto_id = l.proyecto_id)
  ON CONFLICT (lead_id, proyecto_id) DO NOTHING;
  GET DIAGNOSTICS v_count_nuevos = ROW_COUNT;

  -- 2. Reactivar leads con estado='enviado' y último envío > 15 días
  UPDATE repulse_leads
  SET estado = 'pendiente'
  WHERE proyecto_id = p_proyecto_id
    AND estado = 'enviado'
    AND ultimo_repulse_at <= NOW() - INTERVAL '15 days';
  GET DIAGNOSTICS v_count_reactivados = ROW_COUNT;

  RETURN v_count_nuevos + v_count_reactivados;
END;
$$ LANGUAGE plpgsql;
```

**Ciclo de vida de un lead en Repulse:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Lead nuevo (30+ días) ───► pendiente ───► enviado ─────┐      │
│                                 ▲                        │      │
│                                 │                        │      │
│                                 └── (15 días) ───────────┘      │
│                                                                 │
│  Lead responde ─────────────────────────────────► respondio     │
│  Lead excluido ─────────────────────────────────► excluido      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Estado | Descripción |
|--------|-------------|
| `pendiente` | Listo para enviar mensaje |
| `enviado` | Mensaje enviado, esperando respuesta |
| `respondio` | Lead respondió al mensaje |
| `excluido` | Excluido permanentemente |

**Importante:**
- El envío de mensajes es siempre **MANUAL** (usuario selecciona y envía)
- El cron solo cambia estados (detecta nuevos + reactiva enviados)
- `conteo_repulses` se incrementa cada vez que se envía un mensaje

---

### Sistema Repulse - COMPLETADO ✅

| Tarea | Estado |
|-------|--------|
| Integración webhook n8n | ✅ |
| Testing end-to-end | ✅ |
| Flujo n8n en producción | ✅ |
| Cron job pg_cron | ✅ |

---

### Mejora Diseñada: Sistema de Quota WhatsApp + Envío Automático Nocturno

**Fecha:** 6 Diciembre 2025
**Estado:** ⏳ PENDIENTE IMPLEMENTACIÓN
**Documentación completa:** Ver [Módulo Repulse - Mejora Planificada](../modulos/repulse.md#-mejora-planificada-sistema-de-quota-y-envío-automático)

#### Contexto

Meta WhatsApp Cloud API tiene un **límite de 250 mensajes business-initiated por día** para cuentas no verificadas. Todos los flujos (Victoria, Repulse, Campañas) comparten este límite.

#### Problema identificado

Si en un día se envían:
- Campañas: 200 mensajes
- Repulse manual: 100 mensajes
- **Total: 300 → PENALIZACIÓN de Meta**

#### Solución diseñada

1. **Tabla `whatsapp_quota_diaria`** en Supabase para trackear mensajes enviados por día
2. **Función `incrementar_quota_whatsapp()`** llamada desde n8n en cada envío
3. **Cron job nocturno (11:00 PM)** que:
   - Consulta quota disponible (250 - usados del día)
   - Envía automáticamente leads de Repulse pendientes con el restante
4. **Widget indicador** (opcional) en `/repulse` mostrando quota del día

#### Beneficios

- ✅ Maximiza uso de los 250 mensajes diarios
- ✅ Repulse no compite con campañas durante el día
- ✅ Completamente automático
- ✅ Previene penalizaciones de Meta

#### Estimación

~4 horas de implementación total.

---

## Sesión 65C - 7 Diciembre 2025

### 📊 Widget Quota WhatsApp + Mejoras UX

**Tipo:** Feature - Indicador de consumo + UX improvements
**Estado:** ✅ COMPLETADO
**Branch:** `feature/repulse`
**Commit:** `b8a8fd4`

---

### Objetivo

Implementar indicador visual de consumo de quota diaria de WhatsApp en la página `/repulse`, con mejoras de UX en tooltip y posicionamiento.

---

### Trabajo Realizado

#### FASE 1: Función getQuotaWhatsApp() ✅

**Archivo:** `lib/actions-repulse.ts`

Nueva función que calcula la quota disponible del día:

```typescript
export interface QuotaInfo {
  leadsHoy: number;      // Leads de campaña que entraron hoy
  limite: number;        // Límite diario (default 250)
  disponible: number;    // Mensajes disponibles para Repulse
  porcentajeUsado: number;
}

export async function getQuotaWhatsApp(limite: number = 250): Promise<QuotaInfo>
```

**Lógica de cálculo:**
- Cuenta leads con `estado != 'lead_manual'` creados hoy
- Usa timezone Perú (UTC-5) para el cálculo del día
- Estos leads representan mensajes de Victoria consumidos

**Conversión de timezone:**
```typescript
// Obtener fecha de inicio del día en hora Perú (UTC-5)
const nowPeru = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
const startOfDayPeru = new Date(nowPeru.getFullYear(), nowPeru.getMonth(), nowPeru.getDate());

// Convertir a UTC para la query (sumamos 5 horas porque Perú es UTC-5)
const startOfDayUTC = new Date(startOfDayPeru.getTime() + (5 * 60 * 60 * 1000));
```

#### FASE 2: Integración en página /repulse ✅

**Archivo:** `app/repulse/page.tsx`

- Agregado state `quota` con tipo `QuotaInfo`
- Fetch de quota en `fetchData()` junto con otros datos
- Pasado como prop `initialQuota` a `RepulseClient`

#### FASE 3: Badge de Quota en UI ✅

**Archivo:** `components/repulse/RepulseClient.tsx`

**Ubicación:** A la izquierda del botón "Actualizar" (en línea horizontal)

**Características del badge:**
- Texto: "Quota: {disponible}/{limite}" (ej: "Quota: 205/250")
- Icono de información (Info) para indicar tooltip
- Colores semánticos según porcentaje usado:
  - 🟢 `<50%`: `bg-green-50 text-green-700 border-green-200`
  - 🟡 `50-80%`: `bg-yellow-50 text-yellow-700 border-yellow-200`
  - 🔴 `>80%`: `bg-red-50 text-red-700 border-red-200`
- Borde sólido con color matching
- Tamaño `text-sm font-semibold` (más grande que versión inicial)

**Tooltip con información detallada:**
- "Leads de campaña hoy: {leadsHoy}"
- "Disponible para Repulse: {disponible}"
- "Límite diario Meta: {limite}"

#### FASE 4: Mejora componente Tooltip ✅

**Archivo:** `components/shared/Tooltip.tsx`

**Problema:** Tooltip se cortaba en los bordes de la pantalla

**Solución:** Posicionamiento inteligente con auto-ajuste

```typescript
// Calcular posición ajustada para no salir de la pantalla
useEffect(() => {
  if (isVisible && tooltipRef.current) {
    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let newX = position.x + 8;
    let newY = position.y - rect.height - 10;

    // Si se sale por la derecha, mover a la izquierda del cursor
    if (newX + rect.width > windowWidth - 10) {
      newX = position.x - rect.width - 8;
    }

    // Si se sale por la izquierda, forzar al borde izquierdo
    if (newX < 10) {
      newX = 10;
    }

    // Si se sale por arriba, mostrar debajo del cursor
    if (newY < 10) {
      newY = position.y + 20;
    }

    // Si se sale por abajo
    if (newY + rect.height > windowHeight - 10) {
      newY = windowHeight - rect.height - 10;
    }

    setAdjustedPosition({ x: newX, y: newY });
  }
}, [isVisible, position]);
```

**Mejoras adicionales:**
- Removida flecha del tooltip (diseño más limpio)
- `max-w-xs` para textos largos
- Padding aumentado `px-3 py-2`

---

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `lib/actions-repulse.ts` | +30 líneas (getQuotaWhatsApp con timezone Perú) |
| `app/repulse/page.tsx` | +15 líneas (state quota, fetch, prop) |
| `components/repulse/RepulseClient.tsx` | +25 líneas (badge reposicionado) |
| `components/shared/Tooltip.tsx` | +35 líneas (posicionamiento inteligente) |

**Total:** +105 líneas netas

---

### Decisiones Técnicas

| Decisión | Opción Elegida | Razón |
|----------|----------------|-------|
| Timezone | Perú (UTC-5) | Usuarios están en Lima, el día debe ser en hora local |
| Fuente de datos quota | Tabla `leads` | Ya existe, sin tabla adicional, single source of truth |
| Posición badge | Izquierda del botón | Más visible, en línea con acciones |
| Tooltip positioning | Auto-ajuste dinámico | Evita corte en bordes de pantalla |

---

### Testing Realizado

- ✅ Badge muestra quota correctamente
- ✅ Colores cambian según porcentaje usado
- ✅ Tooltip no se corta en bordes
- ✅ Timezone Perú aplicado (medianoche local)
- ✅ Build sin errores de TypeScript

---

### Commit

```
b8a8fd4 feat: improve quota badge UX - position, timezone, tooltip

Changes:
- Move quota badge to LEFT of "Actualizar" button (more visible)
- Make badge bigger with border and better styling
- Fix timezone: use Peru time (UTC-5) for daily quota calculation
- Fix tooltip cutoff: auto-adjust position to stay within viewport
- Remove arrow from tooltip for cleaner look
```

---

## Sesión 66 - 8 Diciembre 2025

### 👥 Sistema Administración de Usuarios

**Tipo:** Feature - CRUD + Importación Masiva
**Estado:** ✅ COMPLETADO
**Branch:** `feature/admin-usuarios` → merged to `staging`
**Documentación detallada:** [Módulo Usuarios](../modulos/usuarios.md)

---

### Resumen

Sistema completo de administración de usuarios accesible desde `/admin/usuarios` (solo admin).

### Funcionalidades

| Feature | Descripción |
|---------|-------------|
| CRUD Usuarios | Crear, editar, activar/desactivar usuarios |
| Reset Password | Enviar email de recuperación |
| Importación Excel | Crear usuarios masivamente desde archivo |
| Descarga Credenciales | Excel con contraseñas generadas automáticamente |

### Archivos Principales

- `app/admin/usuarios/page.tsx` - Página principal
- `components/admin/UsuariosClient.tsx` - Cliente con tabla y acciones
- `components/admin/UsuarioFormModal.tsx` - Modal crear/editar
- `components/admin/UsuarioImportModal.tsx` - Modal importación Excel
- `components/admin/ResetPasswordModal.tsx` - Modal reset password
- `lib/actions-usuarios.ts` - Server actions (CRUD, import)

### Roles Soportados

`admin`, `jefe_ventas`, `vendedor`, `vendedor_caseta`, `coordinador`, `finanzas`

---

## Sesión 67 - 9 Diciembre 2025

### 🔐 Sistema Verificación por Finanzas + Liberación de Comisiones

**Tipo:** Feature - Control de Pagos + Comisiones
**Estado:** ✅ COMPLETADO Y PROBADO
**Branch:** `staging`

---

### Objetivo

Implementar sistema donde el rol `finanzas` verifica abonos de pagos (acción irreversible), y las comisiones pasan a estado "disponible" SOLO cuando tanto la separación como el inicial están verificados.

---

### Trabajo Realizado

#### FASE 1: Columnas de Verificación en `abonos_pago` ✅

**Migration:** `supabase/migrations/20251209_add_verificacion_finanzas_columns.sql`

```sql
ALTER TABLE abonos_pago
ADD COLUMN IF NOT EXISTS verificado_finanzas BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verificado_finanzas_por UUID REFERENCES usuarios(id),
ADD COLUMN IF NOT EXISTS verificado_finanzas_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verificado_finanzas_nombre TEXT;

CREATE INDEX IF NOT EXISTS idx_abonos_pago_verificado_finanzas ON abonos_pago(verificado_finanzas);
```

#### FASE 2: Server Action `toggleVerificacionAbono()` ✅

**Archivo:** `lib/actions-pagos.ts` (+80 líneas)

Función que:
- Valida que el usuario sea rol `finanzas`
- Bloquea desverificación (acción irreversible)
- Verifica que el abono no esté ya verificado
- Marca como verificado con metadata (quién, cuándo, nombre snapshot)
- Usa timezone Lima/Perú para fecha

```typescript
export async function toggleVerificacionAbono(data: {
  abonoId: string;
  verificado: boolean;
  usuarioId: string;
  usuarioNombre: string;
}): Promise<{ success: boolean; message: string }>
```

#### FASE 3: UI de Verificación en PagosPanel ✅

**Archivo:** `components/control-pagos/PagosPanel.tsx`

Implementado en 3 ubicaciones (Separación, Inicial, Cuotas):

1. **Checkbox "Verificar abono"** (solo si `isFinanzas && !verificado_finanzas`)
2. **Badge verde "Verificado por X el DD/MM/YYYY"** (si ya verificado)
3. **Texto gris "Pendiente de verificación por Finanzas"** (otros roles)

**Modal de confirmación:**
- Icono amarillo de advertencia
- Texto "Esta acción es **irreversible**"
- Muestra monto y fecha del abono
- Botones "Cancelar" / "Sí, verificar"

#### FASE 4: RLS Policy para UPDATE ✅

**Problema encontrado:** El checkbox se chequeaba pero no se guardaba - faltaba policy UPDATE.

**Solución aplicada en Supabase:**
```sql
CREATE POLICY "abonos_pago_update_authenticated" ON abonos_pago
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);
```

#### FASE 5: Trigger para Liberar Comisiones ✅

**Migration:** `supabase/migrations/20251209_verificacion_finanzas_comisiones.sql`

**Lógica de negocio crítica:**
- Separación + Inicial Restante = Pago Inicial Total
- AMBOS deben estar verificados para liberar comisiones
- No basta con verificar solo el pago tipo "inicial"

**Trigger actualizado:**
```sql
CREATE OR REPLACE FUNCTION actualizar_comisiones_inicial_verificado()
RETURNS TRIGGER AS $$
DECLARE
  pago_record RECORD;
  control_pago_id_var UUID;
  pago_inicial RECORD;
  todos_verificados BOOLEAN;
BEGIN
  -- 1. Obtener info del pago al que pertenece este abono
  SELECT * INTO pago_record FROM pagos_local WHERE id = NEW.pago_id;

  -- 2. Solo procesar si es separación o inicial
  IF pago_record.tipo NOT IN ('separacion', 'inicial') THEN
    RETURN NEW;
  END IF;

  control_pago_id_var := pago_record.control_pago_id;

  -- 3. Verificar que el pago inicial esté completado
  SELECT * INTO pago_inicial
  FROM pagos_local
  WHERE control_pago_id = control_pago_id_var AND tipo = 'inicial';

  IF pago_inicial.estado != 'completado' THEN
    RETURN NEW;
  END IF;

  -- 4. Verificar que TODOS los abonos de separación e inicial estén verificados
  SELECT NOT EXISTS(
    SELECT 1 FROM abonos_pago ap
    INNER JOIN pagos_local pl ON ap.pago_id = pl.id
    WHERE pl.control_pago_id = control_pago_id_var
      AND pl.tipo IN ('separacion', 'inicial')
      AND (ap.verificado_finanzas = false OR ap.verificado_finanzas IS NULL)
  ) INTO todos_verificados;

  -- 5. Si todos verificados, liberar comisiones
  IF todos_verificados THEN
    UPDATE comisiones
    SET estado = 'disponible', fecha_disponible = NOW()
    WHERE control_pago_id = control_pago_id_var
      AND estado = 'pendiente_inicial';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger se dispara cuando verificado_finanzas cambia de false a true
CREATE TRIGGER trigger_comisiones_inicial_verificado
  AFTER UPDATE ON abonos_pago
  FOR EACH ROW
  WHEN (NEW.verificado_finanzas = true AND (OLD.verificado_finanzas IS NULL OR OLD.verificado_finanzas = false))
  EXECUTE FUNCTION actualizar_comisiones_inicial_verificado();
```

#### FASE 6: Texto "Por verificar" en Comisiones ✅

**Archivo:** `components/comisiones/ComisionesDesgloseMensual.tsx`

Cambio en columna Acción para estado `pendiente_inicial`:
- **Antes:** "-"
- **Después:** "Por verificar" (texto gris)

---

### Acceso por Rol Actualizado

| Rol | / | /operativo | /locales | /control-pagos | /comisiones |
|-----|---|------------|----------|----------------|-------------|
| admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| vendedor | ❌→/operativo | ✅ | ✅ | ❌ | ✅ |
| jefe_ventas | ❌→/locales | ❌→/locales | ✅ | ✅ | ✅ |
| vendedor_caseta | ❌→/locales | ✅ | ✅ | ❌ | ✅ |
| coordinador | ❌→/locales | ❌→/locales | ✅ | ❌ | ✅ |
| **finanzas** | ❌→/control-pagos | ❌→/control-pagos | ❌→/control-pagos | ✅ | ❌→/control-pagos |

---

### Flujo Completo de Verificación

```
1. Vendedor registra venta (local → ROJO)
2. Admin/Jefe procesa venta → control_pagos creado
3. Pagos se registran (separación + inicial)
4. Comisiones creadas con estado 'pendiente_inicial'

5. FINANZAS entra a /control-pagos
6. Abre PagosPanel del local
7. Verifica abono de separación → modal confirmación → ✅
8. Verifica abono de inicial → modal confirmación → ✅

   ↓ TRIGGER SE DISPARA ↓

9. Comisiones pasan a 'disponible' automáticamente
10. En /comisiones ahora aparecen como "Disponible"
```

---

### Archivos Modificados/Creados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `lib/actions-pagos.ts` | Modificado | +80 líneas (toggleVerificacionAbono, interface AbonoPago) |
| `components/control-pagos/PagosPanel.tsx` | Modificado | +150 líneas (UI verificación, modal confirmación) |
| `components/comisiones/ComisionesDesgloseMensual.tsx` | Modificado | +5 líneas (texto "Por verificar") |
| `middleware.ts` | Modificado | Acceso finanzas a /control-pagos |
| `components/shared/Sidebar.tsx` | Modificado | Finanzas solo ve Control de Pagos |
| `app/control-pagos/page.tsx` | Modificado | Acceso rol finanzas |
| `supabase/migrations/20251209_add_verificacion_finanzas_columns.sql` | Nuevo | Columnas verificación |
| `supabase/migrations/20251209_verificacion_finanzas_comisiones.sql` | Nuevo | Trigger comisiones |
| `supabase/migrations/20251128_trigger_comisiones_disponible_BACKUP.sql` | Nuevo | Backup trigger anterior |

**Total:** +350 líneas netas

---

### Bugs Encontrados y Solucionados

#### Bug 1: Checkbox no se guardaba
**Síntoma:** Modal de confirmación aparecía, mostraba success, pero checkbox quedaba sin marcar
**Causa:** Faltaba RLS policy UPDATE en tabla `abonos_pago`
**Solución:** Agregar policy `abonos_pago_update_authenticated`

#### Bug 2: Comisiones no pasaban a "Disponible"
**Síntoma:** Verificados ambos pagos (separación + inicial), pero comisiones seguían en "Pendiente"
**Causa:** Trigger original solo verificaba pago tipo='inicial', pero la lógica de negocio requiere AMBOS
**Solución:** Actualizar trigger para verificar que TODOS los abonos de separación e inicial estén verificados

---

### Lecciones Aprendidas

1. **RLS policies por operación:** SELECT, INSERT, UPDATE, DELETE son policies separadas. Verificar que existan todas las necesarias.

2. **Lógica de negocio antes de código:** Entender que "pago inicial" = separación + inicial restante fue clave para el trigger correcto.

3. **Triggers en cascada:** Mejor integrar lógica en una sola función que depender de triggers encadenados (aprendizaje de Sesión 62).

---

### Testing Realizado

- ✅ Usuario finanzas puede verificar abonos
- ✅ Modal de confirmación funciona
- ✅ Verificación es irreversible (no se puede desmarcar)
- ✅ Badge verde aparece después de verificar
- ✅ Trigger libera comisiones cuando AMBOS están verificados
- ✅ Comisiones muestran "Disponible" en /comisiones
- ✅ Otros roles ven "Pendiente de verificación por Finanzas"

---

### Rollback (si necesario)

**Para revertir al sistema anterior (sin verificación):**

```sql
-- 1. Eliminar trigger nuevo
DROP TRIGGER IF EXISTS trigger_comisiones_inicial_verificado ON abonos_pago;

-- 2. Restaurar trigger anterior (desde backup)
-- Ver: supabase/migrations/20251128_trigger_comisiones_disponible_BACKUP.sql

-- 3. Las columnas de verificación pueden quedarse (no afectan funcionamiento)
```

---

## Sesión 68 - 11 Diciembre 2025

### 📞🔄 Limpieza Teléfonos + Cron Repulse Diario

**Tipo:** Mantenimiento de datos + Configuración
**Estado:** ✅ COMPLETADO
**Branch:** `staging`

---

### Objetivo

1. Limpiar leads con teléfonos sin código de país (51)
2. Actualizar cron de Repulse de cada 15 días a DIARIO

---

### Trabajo Realizado

#### FASE 1: Limpieza de Teléfonos sin Código de País ✅

**Problema identificado:** Existían leads con teléfonos de 9 dígitos (sin el prefijo `51` de Perú), causando inconsistencias en el sistema.

**Proyectos afectados:**

| Proyecto | Leads sin 51 | Duplicados | Acción |
|----------|--------------|------------|--------|
| Proyecto Callao | 18 → 5 | 12 eliminados | DELETE duplicados + UPDATE restantes |
| Proyecto San Gabriel | 3 | 0 | UPDATE (agregar 51) |

**SQL utilizado para detectar:**

```sql
-- Leads sin código de país por proyecto
SELECT
  p.nombre AS proyecto,
  p.id AS proyecto_id,
  COUNT(l.id) AS telefonos_sin_51
FROM proyectos p
LEFT JOIN leads l
  ON l.proyecto_id = p.id
  AND l.telefono NOT LIKE '51%'
  AND LENGTH(l.telefono) = 9
WHERE p.activo = true
GROUP BY p.id, p.nombre
ORDER BY telefonos_sin_51 DESC;
```

**SQL para encontrar duplicados:**

```sql
-- Encontrar leads sin 51 que tienen duplicado con 51
SELECT
  s.id AS id_sin_51,
  s.nombre AS nombre_sin_51,
  s.telefono AS tel_sin_51,
  c.id AS id_con_51,
  c.nombre AS nombre_con_51,
  c.telefono AS tel_con_51
FROM leads s
INNER JOIN leads c
  ON s.telefono = SUBSTRING(c.telefono FROM 3)
  AND c.telefono LIKE '51%'
WHERE s.proyecto_id = 'UUID_PROYECTO'
  AND s.telefono NOT LIKE '51%'
  AND LENGTH(s.telefono) = 9
  AND c.proyecto_id = 'UUID_PROYECTO';
```

**Acciones ejecutadas:**

1. **Proyecto Callao:**
   - 12 leads duplicados eliminados (los que NO tenían 51)
   - 5 leads únicos actualizados (agregado prefijo 51)

2. **Proyecto San Gabriel:**
   - 0 duplicados encontrados
   - 3 leads únicos actualizados (agregado prefijo 51)

**SQL para agregar prefijo 51:**

```sql
UPDATE leads
SET telefono = '51' || telefono
WHERE proyecto_id = 'UUID_PROYECTO'
  AND telefono NOT LIKE '51%'
  AND LENGTH(telefono) = 9;
```

---

#### FASE 2: Cron Repulse Actualizado a DIARIO ✅

**Cambio:** De cada 15 días → DIARIO a las 3:00 AM (hora Perú)

**Razón:** Detectar leads elegibles para repulse más rápidamente, sin impacto en rendimiento (la función es ligera e idempotente).

**SQL ejecutado en Supabase:**

```sql
-- Eliminar cron anterior (cada 15 días)
SELECT cron.unschedule('detectar-leads-repulse');

-- Crear cron diario (3:00 AM Perú = 8:00 AM UTC)
SELECT cron.schedule(
  'detectar-leads-repulse',
  '0 8 * * *',
  $$
  SELECT detectar_leads_repulse(id)
  FROM proyectos
  WHERE activo = true
  $$
);
```

**Verificación:**

```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'detectar-leads-repulse';
-- Resultado: schedule = '0 8 * * *', active = true
```

**Ejecución manual previa:** Se ejecutó la detección manualmente para todos los proyectos antes de activar el cron diario.

---

#### FASE 3: Actualización Modal Informativo ✅

**Archivo:** `components/repulse/RepulseClient.tsx`

**Cambios:**
- Empty state: "cada 10 días" → "cada día (3:00 AM)"
- Modal info: "Cada 15 días" → "Todos los días a las 3:00 AM (hora Perú)"

**Commit:** `acd15f0`

---

### Análisis Técnico

**¿Por qué el cron diario no afecta el rendimiento?**

1. **Función ligera:** `detectar_leads_repulse()` usa queries con índices
2. **Idempotente:** `ON CONFLICT DO NOTHING` evita duplicados
3. **Background:** Se ejecuta en el servidor de Supabase, no afecta requests de usuarios
4. **Horario óptimo:** 3:00 AM cuando nadie usa el dashboard
5. **~7 proyectos:** Solo 7 queries pequeñas por ejecución

---

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `components/repulse/RepulseClient.tsx` | Textos del modal actualizados |
| `docs/modulos/repulse.md` | Documentación actualizada |
| `docs/sesiones/2025-12-diciembre.md` | Esta sesión agregada |
| Supabase cron.job | Schedule actualizado |

---

### Commits

| Hash | Mensaje |
|------|---------|
| `acd15f0` | docs: Update Repulse info modal - cron now runs daily at 3:00 AM |

---

### Configuración Final del Sistema Repulse

| Parámetro | Valor |
|-----------|-------|
| **Cron schedule** | `0 8 * * *` (diario 3:00 AM Perú) |
| **Detección leads** | 30+ días sin compra |
| **Reactivación** | 15+ días desde último envío |
| **Envío mensajes** | MANUAL (usuario selecciona y envía) |

---

#### FASE 4: Paginación Tabla Repulse ✅

**Problema:** Proyecto Trapiche tiene 222 leads, haciendo la tabla muy larga.

**Solución:** Paginación client-side (mismo patrón que `/locales`)

**Implementación:**

| Componente | Descripción |
|------------|-------------|
| `currentPage` state | Página actual (default: 1) |
| `itemsPerPage` | 50 leads por página |
| `paginatedLeads` useMemo | Slice de leads filtrados |
| Reset automático | Vuelve a página 1 al cambiar filtros |
| UI paginación | Arriba Y abajo de la tabla |

**Commits:**
- `dc80c33` - feat: Add pagination to Repulse table (100 items per page)
- `427714f` - feat: Update Repulse pagination - 50 items per page + top pagination

---

#### FASE 5: Sort por Fecha Lead ✅

**Feature:** Ordenar leads por fecha de creación (más antiguos/recientes primero)

**Implementación:**

| Componente | Descripción |
|------------|-------------|
| `sortOrder` state | `'asc' \| 'desc'` (default: `'asc'` = más antiguos) |
| `sortedLeads` useMemo | Ordena por `lead.created_at` |
| Header clickeable | Click en "Fecha Lead" alterna orden |
| Icono visual | ↑ (asc) o ↓ (desc) en verde primario |

**Comportamiento:**
- Default: Más antiguos primero (↑)
- Click en header: Alterna entre asc/desc
- Funciona combinado con filtros y paginación

**Commit:** `29fc4a2` - feat: Add sort by Fecha Lead to Repulse table

---

#### Nota: Variables en Templates de Mensaje

**Variable `{{nombre}}` cuando el lead no tiene nombre:**

```typescript
const mensajePersonalizado = mensaje
  .replace(/\{\{nombre\}\}/g, leadTyped.nombre || 'Cliente')
```

| Template | Lead con nombre | Lead sin nombre |
|----------|-----------------|-----------------|
| `Hola {{nombre}}, te interesa...` | Hola **Leo**... | Hola **Cliente**... |

El fallback "Cliente" es intencional para mensajes genéricos pero correctos.

---

### Archivos Modificados (Actualizado)

| Archivo | Cambios |
|---------|---------|
| `components/repulse/RepulseClient.tsx` | Paginación + Sort + Modal info |
| `docs/modulos/repulse.md` | Documentación actualizada |
| `docs/sesiones/2025-12-diciembre.md` | Esta sesión agregada |
| Supabase cron.job | Schedule actualizado |

---

### FASE 6: Ocultar Estados No Implementados ✅

**Problema:** Los estados "Respondieron" y "Sin respuesta" aparecen en UI pero NO están siendo trackeados.

**Análisis realizado:**
- El flujo **RePulse** solo envía mensajes (unidireccional)
- El flujo **Victoria** recibe las respuestas de WhatsApp
- Falta integración entre Victoria y el dashboard para marcar respuestas
- Para implementar: modificar Victoria + crear endpoint `/api/repulse/response`

**Decisión:** Ocultar del UI hasta implementar tracking via n8n (~2-3 hrs futuro)

**Cambios:**

| Elemento | Antes | Después |
|----------|-------|---------|
| Stats cards | 6 visibles | 4 visibles (2 comentados) |
| Grid layout | `lg:grid-cols-6` | `md:grid-cols-4` |
| Dropdown filtro | 6 opciones | 4 opciones |

**TODOs en código:**
```jsx
{/* TODO: Habilitar cuando se implemente tracking de respuestas via n8n */}
```

**Commit:** `b503be3` - feat: Hide 'Respondieron' and 'Sin respuesta' from Repulse UI

---

#### FASE 7: Research Meta Lead Ads Integration 📋

**Contexto:** El usuario solicitó investigar cómo automatizar la captura de leads desde campañas de Meta (Facebook/Instagram) del tipo "Generación de Leads".

**Decisión:** Implementar con n8n (no ahora, documentado para futuro)

**Documentación completa:** [Meta Lead Ads Integration](../integraciones/meta-lead-ads.md)

**Resumen del análisis:**

| Aspecto | Detalle |
|---------|---------|
| **Tipo de campaña** | Meta Lead Generation (formularios nativos) |
| **API requerida** | Meta Graph API / Leadgen Webhooks |
| **Solución elegida** | n8n con Facebook Lead Ads Trigger |
| **Tiempo estimado** | 2-3 horas de implementación |
| **Bloqueante** | App Review de Meta (1-5 días) |

**Opciones evaluadas:**

| Característica | Webhook Propio | n8n ✅ |
|----------------|----------------|--------|
| Tiempo setup | 8-12 hrs | 2-3 hrs |
| Complejidad | Alta | Baja |
| Infraestructura | Servidor propio | Ya tenemos n8n |
| Mantenimiento | Alto | Bajo |
| Escalabilidad | Total | Suficiente |

**Flujo propuesto:**
```
Meta Lead Ad → n8n Facebook Trigger → HTTP Request → /api/leads/meta → Nuevo Lead
```

**Estado:** 📋 DOCUMENTADO PARA IMPLEMENTACIÓN FUTURA

---

#### FASE 8: Sistema Detección de Respuestas Repulse ✅

**Problema:** Los estados "Respondieron" y "Sin respuesta" existían en UI pero no se trackeaban.

**Solución implementada:** Cron cada 30 minutos que detecta respuestas automáticamente.

**Lógica de detección:**

```
1. Enviamos repulse → ultimo_mensaje = '[REPULSE]: ...'
2. Usuario responde → Victoria actualiza ultimo_mensaje = 'mensaje del usuario'
3. Cron detecta: ultimo_mensaje NOT LIKE '[REPULSE]%' → RESPONDIÓ
4. Si pasan 7 días sin cambio → SIN RESPUESTA
```

**Función SQL:** `detectar_respuestas_repulse()`

| Acción | Condición |
|--------|-----------|
| Marcar "respondió" | `ultimo_mensaje NOT LIKE '[REPULSE]%'` (solo último envío) |
| Marcar "sin_respuesta" | 7 días sin respuesta desde `ultimo_repulse_at` |

**Crons configurados en Supabase:**

| Cron | Schedule | Función |
|------|----------|---------|
| `detectar-leads-repulse` | 8:00 AM diario | Detecta leads inactivos 30+ días |
| `detectar-respuestas-repulse` | Cada 30 minutos | Detecta quién respondió |

**Cambios en UI:**
- Stats cards "Respondieron" y "Sin respuesta" restaurados
- Filtros dropdown con todas las opciones habilitadas
- Grid de 6 columnas para mostrar todos los estados

**Archivo SQL:** `consultas-leo/SQL_CRON_DETECTAR_RESPUESTAS_REPULSE.sql`

**Commit:** `ff6b463` - feat: Restore 'Respondieron' and 'Sin respuesta' stats cards and filters

---

### Todos los Commits de Sesión 68

| Hash | Mensaje |
|------|---------|
| `77c0636` | feat: Add phone country code validation for lead import |
| `acd15f0` | docs: Update Repulse info modal - cron now runs daily at 3:00 AM |
| `dc80c33` | feat: Add pagination to Repulse table (100 items per page) |
| `29fc4a2` | feat: Add sort by Fecha Lead to Repulse table |
| `427714f` | feat: Update Repulse pagination - 50 items per page + top pagination |
| `8f12957` | docs: Update Session 68 with pagination, sort features |
| `b503be3` | feat: Hide 'Respondieron' and 'Sin respuesta' from Repulse UI |
| `f19e907` | docs: Add Meta Lead Ads integration research |
| `ff6b463` | feat: Restore 'Respondieron' and 'Sin respuesta' stats cards and filters |

---

## Sesión 70 - 15 Diciembre 2025

### 🔌 Chrome Extension v1.1.0 - Panel Lateral + Separadores de Fecha

**Tipo:** Feature - Chrome Extension Major Update
**Estado:** ✅ COMPLETADO
**Versión:** 1.1.0
**Archivos generados:** ZIP + Tutorial PDF

---

### Objetivo

1. Corregir formato de "Horario de Visita" a AM/PM (12 horas)
2. Agregar separadores de fecha al historial de conversaciones
3. Convertir popup a panel lateral permanente (iframe)
4. Validar que exista conversación activa antes de permitir captura

---

### Trabajo Realizado

#### FASE 1: Formato Horario de Visita AM/PM ✅

**Problema:** El campo "Horario de Visita" usaba formato 24 horas, difícil para usuarios.

**Solución:** Datetime picker con campos separados (fecha + hora + minuto + AM/PM)

**Archivos modificados:**

| Archivo | Cambio |
|---------|--------|
| `popup/popup.html` | Nuevo datetime picker con inputs separados |
| `popup/popup.js` | Función `buildHorarioVisita()` para construir ISO timestamp |
| `popup/popup.css` | Estilos para `.datetime-picker`, `.datetime-time-group` |

**Formato generado:**
- Display: `DD/MM/YYYY H:MMAM/PM` (ej: "15/12/2025 10:30AM")
- Timestamp: ISO 8601 con offset Lima (`2025-12-15T10:30:00-05:00`)

---

#### FASE 2: Separadores de Fecha en Historial ✅

**Problema:** Mensajes de diferentes días aparecían como conversación continua.

**Solución:** Capturar fecha de cada mensaje y agregar separadores.

**Implementación en `whatsapp.js`:**

Nueva función `extractMessageTimeAndDate()`:
```javascript
function extractMessageTimeAndDate(row) {
  // Extrae de data-pre-plain-text: "[11:08 a.m., 15/12/2025] +51..."
  const dateMatch = preText.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  return { time, date };
}
```

**Implementación en `popup.js`:**

```javascript
function formatMessagesForStorage() {
  let lastDate = null;
  for (const msg of capturedMessages) {
    if (msg.date && msg.date !== lastDate) {
      formatted.push(`--- ${msg.date} ---`);  // Separador
      lastDate = msg.date;
    }
    formatted.push(`${prefix}: ${msg.text}`);
  }
}
```

**Implementación en `LeadDetailPanel.tsx`:**

```typescript
interface ChatMessage {
  sender: 'user' | 'bot' | 'date_separator';  // Nuevo tipo
  text: string;
}

// Parsing
const dateSeparatorMatch = trimmedLine.match(/^---\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*---$/);

// Rendering
message.sender === 'date_separator' ? (
  <div className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
    {message.text}
  </div>
)
```

---

#### FASE 3: Panel Lateral con Iframe ✅

**Problema:** El popup se cerraba al hacer click fuera, impidiendo copiar/pegar de la conversación.

**Solución:** Panel lateral permanente que carga `popup.html` en un iframe.

**Cambios en `manifest.json`:**

```json
{
  "version": "1.1.0",
  "permissions": ["storage", "activeTab", "scripting"],
  "action": {
    // Removido "default_popup" - ahora usa click handler
    "default_title": "EcoPlaza Lead Capture - Abrir/Cerrar Panel"
  },
  "content_scripts": [{
    "css": ["content-scripts/panel.css"]  // Nuevo CSS
  }],
  "web_accessible_resources": [{
    "resources": ["popup/popup.html", "popup/popup.css", "popup/popup.js", "assets/icons/*"],
    "matches": ["https://web.whatsapp.com/*"]
  }]
}
```

**Nuevo archivo `content-scripts/panel.css`:**

```css
.ecoplaza-panel {
  position: fixed;
  top: 0;
  right: -400px;  /* Oculto por defecto */
  width: 400px;
  height: 100vh;
  z-index: 999999;
  transition: right 0.3s ease-in-out;
}

.ecoplaza-panel.ecoplaza-panel-visible {
  right: 0;
}

body.ecoplaza-panel-active #app {
  width: calc(100% - 400px) !important;  /* Ajusta WhatsApp */
}
```

**Funciones agregadas a `whatsapp.js`:**

| Función | Descripción |
|---------|-------------|
| `createSidePanel()` | Crea div + header + iframe |
| `toggleSidePanel(show)` | Muestra/oculta panel |
| `hasActiveConversation()` | Verifica si hay chat abierto |
| `handleIframeMessage(event)` | Comunicación bidireccional |
| `notifyIframePanelState(visible)` | Notifica estado al iframe |

**Comunicación iframe ↔ content script:**

| Mensaje | Dirección | Acción |
|---------|-----------|--------|
| `ECOPLAZA_GET_PHONE` | iframe → parent | Solicita teléfono |
| `ECOPLAZA_PHONE_RESULT` | parent → iframe | Responde teléfono |
| `ECOPLAZA_GET_CHAT` | iframe → parent | Solicita chat |
| `ECOPLAZA_CHAT_RESULT` | parent → iframe | Responde mensajes |
| `ECOPLAZA_CHECK_CONVERSATION` | iframe → parent | Verifica conversación |
| `ECOPLAZA_CONVERSATION_STATUS` | parent → iframe | Estado conversación |

**Modificaciones en `popup.js`:**

```javascript
// Detectar contexto
const isInIframe = window.self !== window.top;

// En modo iframe, usar postMessage en vez de chrome.tabs
if (isInIframe) {
  capturePhoneFromWhatsApp = async function() {
    window.parent.postMessage({ type: 'ECOPLAZA_GET_PHONE' }, '*');
  };

  // Polling cada 2 segundos para verificar conversación
  setInterval(checkConversationStatus, 2000);
}
```

**Actualización `background/service-worker.js`:**

```javascript
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url.includes('web.whatsapp.com')) {
    await chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
  }
});
```

---

#### FASE 4: Validación de Conversación Activa ✅

**Requerimiento:** No permitir capturar leads si no hay conversación seleccionada.

**Implementación:**

1. **Detección en `whatsapp.js`:**
```javascript
function hasActiveConversation() {
  const mainArea = document.querySelector('#main');
  if (!mainArea) return false;

  const messageRows = mainArea.querySelectorAll('[role="row"]');
  const headerButton = mainArea.querySelector('header button[role="button"]');

  return messageRows.length > 0 || !!headerButton;
}
```

2. **Overlay en `popup.js`:**
```javascript
function createNoConversationOverlay() {
  // Muestra mensaje "Sin conversación activa"
  // "Selecciona un chat en WhatsApp para capturar un lead"
}

function updateConversationOverlay(hasConversation) {
  overlay.style.display = hasConversation ? 'none' : 'flex';
}
```

3. **Estilos en `popup.css`:**
```css
.no-conversation-overlay {
  position: fixed;
  background: rgba(255, 255, 255, 0.98);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
```

---

#### FASE 5: Tutorial PDF Generado ✅

**Herramienta:** Playwright MCP para captura y generación PDF

**Archivos generados:**

| Archivo | Ubicación | Tamaño |
|---------|-----------|--------|
| `EcoPlaza-Lead-Capture-Extension-v1.1.0.zip` | `/chrome-extension/../` | 31 KB |
| `tutorial-ecoplaza-extension.pdf` | `/chrome-extension/` | 168 KB |
| `TUTORIAL_INSTALACION.html` | `/chrome-extension/` | 15 KB |
| `tutorial-preview.png` | `/chrome-extension/` | 366 KB |

**Contenido del tutorial:**
1. Novedades v1.1.0 (panel lateral, copiar/pegar, validación, separadores fecha)
2. Instalación paso a paso (6 pasos con screenshots)
3. Cómo usar la extensión (8 pasos)
4. Solución de problemas comunes

---

### Archivos Creados/Modificados

| Archivo | Acción | Líneas |
|---------|--------|--------|
| `manifest.json` | Modificado | +15 (web_accessible_resources, scripting) |
| `content-scripts/whatsapp.js` | Modificado | +170 (panel, iframe, communication) |
| `content-scripts/panel.css` | **NUEVO** | 120 (estilos panel lateral) |
| `popup/popup.js` | Modificado | +110 (iframe detection, postMessage) |
| `popup/popup.css` | Modificado | +60 (datetime picker, overlay) |
| `popup/popup.html` | Modificado | +15 (datetime picker inputs) |
| `background/service-worker.js` | Modificado | +35 (action.onClicked handler) |
| `TUTORIAL_INSTALACION.html` | **NUEVO** | 350 (tutorial completo) |
| `dashboard/LeadDetailPanel.tsx` | Modificado | +30 (date_separator type) |
| `dashboard/api/create-lead/route.ts` | Modificado | +2 (horarioVisitaTimestamp) |

**Total:** +907 líneas netas

---

### Decisiones Técnicas

| Decisión | Opción Elegida | Razón |
|----------|----------------|-------|
| Panel lateral vs popup | Iframe en panel lateral | Permite copiar/pegar sin cerrar |
| Comunicación | postMessage | Estándar para cross-origin iframe |
| Verificación conversación | Polling 2s | Balance entre responsividad y rendimiento |
| Fecha en historial | Separador `--- DD/MM/YYYY ---` | Fácil de parsear en dashboard |
| Timezone | Lima UTC-5 en ISO | Consistencia con hora local del usuario |

---

### Compatibilidad

| Feature | Popup Normal | Panel Lateral |
|---------|--------------|---------------|
| Captura teléfono | ✅ chrome.tabs | ✅ postMessage |
| Captura chat | ✅ chrome.tabs | ✅ postMessage |
| Login/Logout | ✅ | ✅ |
| Guardar lead | ✅ | ✅ |
| Conversación activa | N/A | ✅ Validación |

**Backward compatible:** El popup normal sigue funcionando si se abre directamente el HTML.

---

### Flujo de Uso (Panel Lateral)

```
1. Usuario abre WhatsApp Web
2. Click en icono EcoPlaza (toolbar)
   ↓
3. Service worker envía 'togglePanel' a content script
   ↓
4. Content script crea panel con iframe (popup.html)
5. WhatsApp se reduce a 60% del ancho
   ↓
6. Iframe detecta isInIframe = true
7. Polling cada 2s: ¿Hay conversación activa?
   ↓
8. SIN conversación → Overlay "Selecciona un chat"
   CON conversación → Formulario habilitado
   ↓
9. Usuario captura teléfono/chat (via postMessage)
10. Usuario completa datos (puede copiar de WhatsApp)
11. Guarda lead
   ↓
12. Click X o icono → Panel se oculta
```

---

### Testing Checklist

- [x] Panel se abre al click en icono
- [x] Panel se cierra con botón X
- [x] Panel se cierra con click en icono (toggle)
- [x] Overlay aparece sin conversación activa
- [x] Overlay desaparece al seleccionar chat
- [x] Captura teléfono funciona
- [x] Captura chat funciona con scroll
- [x] Separadores de fecha aparecen en preview
- [x] Login/logout funciona
- [x] Lead se guarda correctamente
- [x] Horario de visita en formato AM/PM
- [x] Dashboard muestra separadores de fecha

---

### Distribución

**Para usuarios:**
1. Enviar `EcoPlaza-Lead-Capture-Extension-v1.1.0.zip`
2. Enviar `tutorial-ecoplaza-extension.pdf`

**Instrucciones rápidas:**
1. Descomprimir ZIP
2. `chrome://extensions` → Modo desarrollador ON
3. "Cargar sin empaquetar" → Seleccionar carpeta
4. Ir a WhatsApp Web → Click en icono verde

---

## Sesión 71 - 16 Diciembre 2025

### 🏷️ Chrome Extension v1.2.0 - Tipificación de Leads

**Tipo:** Feature - Sistema de clasificación de leads
**Estado:** ✅ COMPLETADO Y DEPLOYADO
**Versión:** 1.2.0
**Commits:** `bdca5c1` (API), archivos locales (extensión)

---

### Objetivo

Implementar el sistema de tipificación de leads (3 niveles jerárquicos) en la extensión de Chrome, igualando la funcionalidad del dashboard.

---

### Trabajo Realizado

#### FASE 1: HTML - Sección de Tipificación ✅

**Archivo:** `chrome-extension/popup/popup.html`

Agregada sección de tipificación entre Email y Horario de Visita:

```html
<!-- Tipificación del Lead -->
<div class="tipificacion-section">
  <label class="tipificacion-title">
    <svg>...</svg>
    Tipificación del Lead
  </label>

  <div class="form-group">
    <label for="tipificacion-nivel1">Nivel 1</label>
    <select id="tipificacion-nivel1" class="select-tipificacion select-blue">
      <option value="">-- Seleccionar --</option>
      <option value="contactado">Contactado</option>
      <option value="no_contactado">No Contactado</option>
      <option value="seguimiento">Seguimiento</option>
      <option value="otros">Otros</option>
    </select>
  </div>

  <div class="form-group">
    <label for="tipificacion-nivel2">Nivel 2</label>
    <select id="tipificacion-nivel2" class="select-tipificacion select-green" disabled>
      <option value="">-- Primero selecciona Nivel 1 --</option>
    </select>
  </div>

  <div class="form-group">
    <label for="tipificacion-nivel3">Nivel 3</label>
    <select id="tipificacion-nivel3" class="select-tipificacion select-lime" disabled>
      <option value="">-- Primero selecciona Nivel 2 --</option>
    </select>
  </div>
</div>
```

---

#### FASE 2: CSS - Estilos de Tipificación ✅

**Archivo:** `chrome-extension/popup/popup.css`

Estilos color-coded para los 3 niveles:

```css
.tipificacion-section {
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 14px;
}

/* Nivel 1 - Azul */
.select-blue {
  background-color: #eff6ff;
  border: 1px solid #60a5fa;
  color: #1e40af;
}

/* Nivel 2 - Verde */
.select-green {
  background-color: #f0fdf4;
  border: 1px solid #22c55e;
  color: #166534;
}

/* Nivel 3 - Lima */
.select-lime {
  background-color: #f7fee7;
  border: 1px solid #84cc16;
  color: #3f6212;
}

/* Disabled state */
.select-tipificacion:disabled {
  background-color: var(--gray-100) !important;
  border-color: var(--gray-300) !important;
  color: var(--gray-400) !important;
  cursor: not-allowed;
  opacity: 0.7;
}
```

---

#### FASE 3: JavaScript - Lógica de Cascada ✅

**Archivo:** `chrome-extension/popup/popup.js`

**Datos de opciones:**

```javascript
const TIPIFICACION_NIVEL_2 = {
  contactado: [
    { value: 'interesado', label: 'Interesado' },
    { value: 'no_interesado', label: 'No Interesado' },
    { value: 'cliente_evaluacion', label: 'Cliente en Evaluación' },
    { value: 'cliente_negociacion', label: 'Cliente en Negociación' },
    { value: 'cliente_cierre', label: 'Cliente en Cierre' },
  ],
  no_contactado: [...],
  seguimiento: [...],
  otros: [...],
};

const TIPIFICACION_NIVEL_3 = [
  { value: 'solicita_info_proyecto', label: 'Solicita información del proyecto' },
  // ... 34 opciones totales
];
```

**Funciones de cascada:**

```javascript
function handleNivel1Change() {
  const nivel1Value = tipificacionNivel1.value;

  // Reset nivel 2
  tipificacionNivel2.innerHTML = '';
  tipificacionNivel2.disabled = true;

  // Reset nivel 3
  tipificacionNivel3.innerHTML = '<option value="">-- Primero selecciona Nivel 2 --</option>';
  tipificacionNivel3.disabled = true;

  if (!nivel1Value) {
    tipificacionNivel2.innerHTML = '<option value="">-- Primero selecciona Nivel 1 --</option>';
    return;
  }

  // Populate nivel 2 options based on nivel 1
  const nivel2Options = TIPIFICACION_NIVEL_2[nivel1Value] || [];
  tipificacionNivel2.innerHTML = '<option value="">-- Seleccionar --</option>' +
    nivel2Options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
  tipificacionNivel2.disabled = false;
}

function handleNivel2Change() {
  // Similar: habilita nivel 3 con las 34 opciones
}

// Event listeners
tipificacionNivel1.addEventListener('change', handleNivel1Change);
tipificacionNivel2.addEventListener('change', handleNivel2Change);
```

**Integración con handleSubmitLead():**

```javascript
// Get tipificación values
const tipNivel1 = tipificacionNivel1.value || null;
const tipNivel2 = tipificacionNivel2.value || null;
const tipNivel3 = tipificacionNivel3.value || null;

const result = await apiCreateLead({
  // ... otros campos
  tipificacionNivel1: tipNivel1,
  tipificacionNivel2: tipNivel2,
  tipificacionNivel3: tipNivel3,
});
```

**Reset en resetLeadForm():**

```javascript
tipificacionNivel1.value = '';
tipificacionNivel2.innerHTML = '<option value="">-- Primero selecciona Nivel 1 --</option>';
tipificacionNivel2.disabled = true;
tipificacionNivel3.innerHTML = '<option value="">-- Primero selecciona Nivel 2 --</option>';
tipificacionNivel3.disabled = true;
```

---

#### FASE 4: API Endpoint Actualizado ✅

**Archivo:** `dashboard/app/api/extension/create-lead/route.ts`

**Cambios:**

```typescript
const {
  // ... campos existentes
  tipificacionNivel1,
  tipificacionNivel2,
  tipificacionNivel3,
} = body;

// En INSERT:
tipificacion_nivel_1: tipificacionNivel1 || null,
tipificacion_nivel_2: tipificacionNivel2 || null,
tipificacion_nivel_3: tipificacionNivel3 || null,
```

**Commit:** `bdca5c1` - feat(chrome-extension): Add tipificación fields to create-lead API

---

#### FASE 5: Tutorial y ZIP Actualizados ✅

**Archivos modificados:**

| Archivo | Cambio |
|---------|--------|
| `manifest.json` | version: "1.1.0" → "1.2.0" |
| `TUTORIAL_INSTALACION.html` | Actualizado a v1.2.0, nueva sección de tipificación |

**Nuevo ZIP generado:**
- `EcoPlaza-Lead-Capture-Extension-v1.2.0.zip`

**Novedades documentadas en tutorial:**
- Sistema de Tipificación de Leads
- Nivel 1 (Azul): Contactado, No Contactado, Seguimiento, Otros
- Nivel 2 (Verde): Opciones dinámicas según Nivel 1
- Nivel 3 (Lima): 34 opciones detalladas

---

### Archivos Modificados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `chrome-extension/popup/popup.html` | Modificado | +35 líneas (sección tipificación) |
| `chrome-extension/popup/popup.css` | Modificado | +100 líneas (estilos color-coded) |
| `chrome-extension/popup/popup.js` | Modificado | +110 líneas (datos, cascada, handlers) |
| `chrome-extension/manifest.json` | Modificado | version 1.2.0 |
| `chrome-extension/TUTORIAL_INSTALACION.html` | Modificado | Actualizado a v1.2.0 |
| `dashboard/app/api/extension/create-lead/route.ts` | Modificado | +6 líneas (campos tipificación) |

**Total:** +250 líneas netas

---

### Flujo de Tipificación

```
1. Usuario selecciona Nivel 1 (azul)
   ↓
2. Nivel 2 se habilita con opciones específicas (verde)
   ↓
3. Usuario selecciona Nivel 2
   ↓
4. Nivel 3 se habilita con 34 opciones (lima)
   ↓
5. Usuario selecciona Nivel 3 (opcional)
   ↓
6. Al guardar lead, los 3 valores se envían al API
   ↓
7. API guarda en campos tipificacion_nivel_1/2/3
```

---

### Sincronización Dashboard ↔ Extensión

Los datos de tipificación son **idénticos** en:
- `LeadDetailPanel.tsx` (dashboard)
- `popup.js` (extensión)

| Nivel | Opciones |
|-------|----------|
| Nivel 1 | 4 opciones principales |
| Nivel 2 | 5-2 opciones según Nivel 1 |
| Nivel 3 | 34 opciones universales |

---

### Distribución v1.2.0

**Para usuarios:**
1. Descargar `EcoPlaza-Lead-Capture-Extension-v1.2.0.zip`
2. Si ya tienen instalada la extensión:
   - Reemplazar carpeta
   - Click "Actualizar" en `chrome://extensions`
3. Si es instalación nueva: seguir tutorial PDF

**Cambios visibles:**
- Nueva sección "Tipificación del Lead" en formulario
- 3 dropdowns con colores distintivos (azul/verde/lima)
- Dropdowns se habilitan en cascada

---

### Deploy

| Componente | Destino | Estado |
|------------|---------|--------|
| API endpoint | main + staging | ✅ Deployado |
| Extensión Chrome | Archivos locales + ZIP | ✅ Listo |
| Tutorial | TUTORIAL_INSTALACION.html | ✅ Actualizado |

---

## Sesión 72 - 16 Diciembre 2025

### 📊 Página de Reportería Multi-Proyecto

**Tipo:** Feature - Nueva página de reportería para admin/jefe_ventas/marketing
**Estado:** ✅ **DEPLOYED TO MAIN**
**Commits:** `577d144` (staging), `fde5089` (main)
**Testing:** ✅ Playwright verificado (admin, marketing, vendedor)

---

### Objetivo

Crear una página `/reporteria` standalone (sin sidebar) que muestre todos los vendedores con sus leads de TODOS los proyectos activos, con filtros avanzados y exportación a Excel.

---

### Especificaciones

| Aspecto | Detalle |
|---------|---------|
| **Acceso** | admin, jefe_ventas, marketing |
| **Navegación** | Sin sidebar - página standalone |
| **Entrada** | Dropdown de login → opción "📊 Reportería" |
| **Filtros** | Proyecto (todos/específico), Fecha desde/hasta, Búsqueda por nombre |
| **Exportación** | Excel con XLSX library |
| **Responsive** | Cards en móvil, tabla en desktop |

---

### Archivos Creados

| Archivo | Descripción | Líneas |
|---------|-------------|--------|
| `lib/actions-reporteria.ts` | Server actions con keyset pagination | 240 |
| `app/reporteria/page.tsx` | Página principal con validación RBAC | 85 |
| `components/reporteria/ReporteriaClient.tsx` | Componente cliente con UI completa | 477 |

---

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `middleware.ts` | +16 líneas - RBAC para /reporteria (líneas 328-343) |
| `app/login/page.tsx` | +15 líneas - Opción "Reportería" en dropdown |

---

### Arquitectura Backend

**Server Actions (`lib/actions-reporteria.ts`):**

```typescript
// Helper con contexto de servidor (cookies)
async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(/* config con cookies */);
}

// Función principal con keyset pagination
export async function getReporteriaData(filters: ReporteriaFilters) {
  // STEP 1: Obtener proyectos activos
  // STEP 2: Obtener usuarios vendedor/vendedor_caseta
  // STEP 3: Fetch leads con pagination (batches de 1000, máx 20 batches)
  // STEP 4: Agrupar por vendedor_id + proyecto_id
  // Retorna: VendedorReporteriaData[]
}

// Proyectos para dropdown de filtro
export async function getProyectosForFilter(): Promise<Proyecto[]>
```

**Interfaces:**

```typescript
interface VendedorReporteriaData {
  id: string;
  nombre: string;
  rol: 'vendedor' | 'vendedor_caseta';
  proyecto_id: string;
  proyecto_nombre: string;
  proyecto_color: string | null;
  leadsManuales: number;
  leadsAutomaticos: number;
  total: number;
}

interface ReporteriaFilters {
  proyectoId?: string | null;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  searchTerm?: string;
}
```

---

### Arquitectura Frontend

**Página (`app/reporteria/page.tsx`):**
- Client Component con useAuth()
- Validación de rol (admin, jefe_ventas, marketing)
- Modal "Acceso Denegado" para roles no autorizados
- Loading spinner mientras valida auth

**Cliente (`components/reporteria/ReporteriaClient.tsx`):**

| Sección | Descripción |
|---------|-------------|
| **Header sticky** | Logo EcoPlaza, título, botón "Volver al Dashboard", info usuario |
| **Filtros** | Grid 4 columnas: Proyecto, Desde, Hasta, Búsqueda |
| **Acciones** | Botón "Exportar Excel" (disabled si no hay datos) |
| **Tabla desktop** | 7 columnas: #, Vendedor (con badge rol), Proyecto, Lead Manual, NO Manual, Total, Distribución |
| **Cards móvil** | Layout responsivo con misma información |
| **Footer** | Totales: Lead Manual, NO Manual, Total general |

**Barra de distribución:**
- Púrpura: Leads manuales
- Verde (#1b967a): Leads automáticos
- Proporcional al total máximo de la tabla

---

### RBAC en Middleware

```typescript
// middleware.ts líneas 328-343
const isReporteriaRoute = pathname.startsWith('/reporteria');

if (isReporteriaRoute) {
  if (userData.rol !== 'admin' && userData.rol !== 'jefe_ventas' && userData.rol !== 'marketing') {
    // Redirect según rol
    if (userData.rol === 'vendedor') {
      return NextResponse.redirect(new URL('/operativo', req.url));
    } else if (userData.rol === 'finanzas') {
      return NextResponse.redirect(new URL('/control-pagos', req.url));
    } else if (userData.rol === 'vendedor_caseta' || userData.rol === 'coordinador') {
      return NextResponse.redirect(new URL('/locales', req.url));
    }
  }
  return res;
}
```

---

### Entrada desde Login

**Cambio en `app/login/page.tsx`:**

```tsx
{/* Separador y opción Reportería */}
<div className="border-t border-gray-200 my-1"></div>
<button
  onClick={() => {
    setSelectedProyecto({ id: 'REPORTERIA', nombre: '📊 Reportería', slug: 'reporteria' });
    setShowProyectoDropdown(false);
  }}
  className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
>
  📊 Reportería
</button>
```

**Flujo de login:**
1. Usuario selecciona "📊 Reportería" en dropdown
2. Al hacer login, se detecta `selectedProyecto.id === 'REPORTERIA'`
3. Redirect a `/reporteria` en lugar del dashboard normal

---

### Bug Corregido Durante Desarrollo

**Problema:** Datos no cargaban (spinner infinito "Cargando datos...")

**Causa raíz:** Server Actions usaban `import { supabase } from './supabase'` (cliente browser) que no tiene acceso a cookies en contexto de servidor.

**Solución:**
```typescript
// ANTES (incorrecto)
import { supabase } from './supabase';

// DESPUÉS (correcto)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(/* config */);
}
```

---

### Testing con Playwright

| Test | Usuario | Resultado |
|------|---------|-----------|
| Admin acceso | gerencia@ecoplaza.com | ✅ Acceso permitido, datos cargan |
| Marketing acceso | asanchez@ecoplaza.com.pe | ✅ Acceso permitido, 59 entries, 19,998 leads |
| Vendedor denegado | leo@ecoplaza.com | ✅ Modal "Acceso Denegado" correcto |
| Filtro proyecto | - | ✅ Funciona |
| Búsqueda nombre | - | ✅ Funciona |
| Export Excel | - | ✅ Botón habilitado con datos |

---

### Métricas de Datos (Test)

```
Total entries:     59 (vendedor + proyecto combinations)
Total leads:       19,998
Usuarios vendedor: 19
Proyectos activos: 7
Batches fetched:   20 (límite de seguridad alcanzado)
```

---

### Exportación Excel

**Columnas exportadas:**
1. # (índice)
2. Vendedor
3. Rol
4. Proyecto
5. Lead Manual
6. NO Manual
7. Total

**Nombre de archivo:** `reporteria-leads-{YYYYMMDD}.xlsx`

---

### Screenshots de Testing

| Archivo | Descripción |
|---------|-------------|
| `reporteria-admin-con-acceso.png` | Vista admin con datos |
| `reporteria-marketing-con-acceso.png` | Vista marketing con datos |
| `reporteria-vendedor-sin-acceso.png` | Modal acceso denegado |

---

### Pendiente

- [ ] Deploy a staging (requiere aprobación del usuario)
- [ ] Deploy a production (requiere aprobación del usuario)

---

### Commits Pendientes

Los cambios están en local, pendiente commit y push:
- `lib/actions-reporteria.ts` (nuevo)
- `app/reporteria/page.tsx` (nuevo)
- `components/reporteria/ReporteriaClient.tsx` (nuevo)
- `middleware.ts` (modificado +16 líneas)
- `app/login/page.tsx` (modificado +15 líneas)

**Total:** ~820 líneas netas

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**

---

## Sesión 73 - 17 Diciembre 2025

### 👤 Acceso a Insights para Jefe de Ventas

**Tipo:** Feature - RBAC Update
**Estado:** ✅ **DEPLOYED TO MAIN**
**Commits:** `9ab4d21`, `cb56f84`, `c154589` (staging), `8c4da7d` (main)

---

### Objetivo

Dar acceso al rol `jefe_ventas` a la página Insights (`/`) y configurarla como su landing page por defecto después del login.

---

### Cambios Implementados

#### 1. Middleware (`middleware.ts`)

| Cambio | Antes | Después |
|--------|-------|---------|
| Landing page post-login | `/operativo` | `/` |
| Acceso a Insights | ❌ Redirigido a `/locales` | ✅ Permitido |

**Líneas modificadas:**
- Línea 118: `jefe_ventas` agregado al grupo que va a `/` después de login
- Línea 214: `jefe_ventas` puede acceder a Insights (ya no redirige a `/locales`)

#### 2. Sidebar (`components/shared/Sidebar.tsx`)

**Menú actualizado para `jefe_ventas`:**

```typescript
// Antes
directItems: [{ href: '/operativo', label: 'Dashboard Operativo', icon: Users }]

// Después
directItems: [
  { href: '/', label: 'Insights', icon: LayoutDashboard },
  { href: '/operativo', label: 'Dashboard Operativo', icon: Users },
]
```

#### 3. Auth Context (`lib/auth-context.tsx`)

**Función `signIn()` - Redirect post-login:**

```typescript
// Antes
} else if (userData.rol === 'jefe_ventas' || userData.rol === 'coordinador' || userData.rol === 'finanzas') {
  router.push('/locales');
}

// Después
if (userData.rol === 'admin' || userData.rol === 'marketing' || userData.rol === 'jefe_ventas') {
  router.push('/');
} else if (userData.rol === 'coordinador') {
  router.push('/locales');
} else if (userData.rol === 'finanzas') {
  router.push('/control-pagos');
}
```

**Función `useRequireRole()` - Redirects actualizados:**
- `jefe_ventas` intentando acceso admin → `/` (Insights)
- `finanzas` intentando acceso admin → `/control-pagos`
- `vendedor_caseta/coordinador` → `/locales`

---

### Tabla de Acceso Actualizada

| Rol | Landing Page | Acceso Insights |
|-----|--------------|-----------------|
| admin | `/` | ✅ |
| marketing | `/` | ✅ |
| **jefe_ventas** | **`/`** | **✅** |
| vendedor | `/operativo` | ❌ |
| vendedor_caseta | `/operativo` | ❌ |
| coordinador | `/locales` | ❌ |
| finanzas | `/control-pagos` | ❌ |

---

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `middleware.ts` | +8/-8 líneas - RBAC actualizado |
| `components/shared/Sidebar.tsx` | +5/-2 líneas - Menú Insights |
| `lib/auth-context.tsx` | +14/-6 líneas - Redirects post-login |

---

### Commits

| Branch | Commit | Descripción |
|--------|--------|-------------|
| staging | `9ab4d21` | feat: Add jefe_ventas access to Insights (/) as landing page |
| staging | `cb56f84` | feat: Add Insights menu item for jefe_ventas role |
| staging | `c154589` | fix: Update jefe_ventas redirect to Insights (/) after login |
| main | `8c4da7d` | Merge staging: jefe_ventas access to Insights |

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
