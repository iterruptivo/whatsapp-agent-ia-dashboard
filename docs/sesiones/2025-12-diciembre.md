# 📅 SESIONES DICIEMBRE 2025

## Índice
- [Sesión 64](#sesión-64---2-diciembre-2025) - Sistema Generación Documentos (Análisis + DB + UI)
- [Sesión 64B](#sesión-64b---3-diciembre-2025) - Template HTML Ficha de Inscripción
- [Sesión 65](#sesión-65---5-diciembre-2025) - Sistema Repulse: Integración /operativo + Exclusiones
- [Sesión 65B](#sesión-65b---5-diciembre-2025-continuación) - Sistema Repulse: Webhook n8n + UI Improvements

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

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
