# 📅 SESIONES DICIEMBRE 2025

## Índice
- [Sesión 64](#sesión-64---2-diciembre-2025) - Sistema Generación Documentos

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
**Próxima sesión:** DNI/dirección en control_pagos + docx-templates

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
