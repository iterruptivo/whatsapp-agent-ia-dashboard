# 📅 SESIONES DICIEMBRE 2025

## Índice
- [Sesión 64](#sesión-64---2-diciembre-2025) - Sistema Generación Documentos

---

## Sesión 64 - 2 Diciembre 2025

### 📄 Sistema de Generación de Documentos (Análisis + Migración DB)

**Tipo:** Feature - Análisis y Diseño
**Estado:** ⏳ EN DESARROLLO (2/8 fases completadas)
**Documentación completa:** [Módulo Documentos](../modulos/documentos.md)

---

### Objetivo

Implementar generación automática de documentos legales (Acuerdo de Separación) a partir de un template Word, rellenando datos dinámicamente desde el sistema.

---

### Trabajo Realizado

#### FASE 1: Preparación de Herramientas

1. **Instalación Python + python-docx**
   - Python 3.13.9 instalado en Windows
   - Librería `python-docx` para lectura de archivos Word
   - Extracción exitosa del contenido del template

#### FASE 2: Análisis del Documento

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

#### FASE 3: Diseño de Base de Datos

**Decisión arquitectónica:** Todos los campos de configuración en tabla `proyectos`

**Razón:** Cada proyecto puede pertenecer a una empresa diferente con:
- Diferente RUC
- Diferentes representantes legales
- Diferentes cuentas bancarias

**Campos JSONB para datos múltiples:**
- `representantes_legales` - Array de {nombre, dni, cargo}
- `cuentas_bancarias` - Array de {banco, numero, tipo, moneda}

#### FASE 4: Migración SQL Ejecutada

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

---

### Decisiones Técnicas

| Decisión | Opción Elegida | Razón |
|----------|----------------|-------|
| Ubicación de config empresa | Todo en `proyectos` | Cada proyecto puede tener diferente RUC/empresa |
| Formato multi-valor | JSONB arrays | Simplicidad vs tablas relacionales |
| Moneda default | USD | Requerimiento del negocio |
| Librería generación | docx-templates | Mantiene formato Word exacto |

---

### Archivos Creados/Modificados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `consultas-leo/SESION_64_GENERACION_DOCUMENTOS.md` | Creado | Documentación detallada de análisis |
| `docs/modulos/documentos.md` | Creado | Módulo de documentación oficial |
| `CLAUDE.md` | Modificado | Agregado módulo y sesión al índice |
| Tabla `proyectos` en Supabase | Modificada | +10 columnas para config documentos |

---

### Próximos Pasos (Fases Pendientes)

| # | Tarea | Prioridad |
|---|-------|-----------|
| 1 | UI para editar configuración proyecto | Alta |
| 2 | Actualizar interface TypeScript `Proyecto` | Alta |
| 3 | Agregar DNI/dirección a leads o control_pagos | Alta |
| 4 | Instalar docx-templates | Media |
| 5 | Crear template Word con placeholders | Media |
| 6 | Server Action para generar documento | Media |
| 7 | Botón "Generar Acuerdo" en Control de Pagos | Media |
| 8 | Conversión a PDF (opcional) | Baja |

---

### Referencias

- **Template original:** `consultas-leo/Modelo - Acuerdo de Separación (VF).docx`
- **Documentación detallada:** `consultas-leo/SESION_64_GENERACION_DOCUMENTOS.md`
- **Módulo oficial:** [docs/modulos/documentos.md](../modulos/documentos.md)
- **Librería recomendada:** https://github.com/guigrpa/docx-templates

---

**Commit:** Pendiente
**Próxima sesión:** Implementación UI configuración proyecto

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
