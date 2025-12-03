# 📄 MÓDULO DE GENERACIÓN DE DOCUMENTOS

## 📋 Índice
- [Estado Actual](#-estado-actual)
- [Sesiones Relacionadas](#-sesiones-relacionadas)
- [Arquitectura](#-arquitectura)
- [Template Acuerdo de Separación](#-template-acuerdo-de-separación)
- [Campos Dinámicos](#-campos-dinámicos)
- [Base de Datos](#-base-de-datos)
- [Implementación Técnica](#-implementación-técnica)
- [Próximos Pasos](#-próximos-pasos)
- [Referencias](#-referencias)

---

## 🔄 Estado Actual

**EN DESARROLLO** - Última actualización: Sesión 64 (2 Dic 2025)

### Progreso:
| Fase | Descripción | Estado |
|------|-------------|--------|
| 1. Análisis | Analizar template Word y extraer campos | ✅ Completado |
| 2. Database | Migración con nuevos campos en `proyectos` | ✅ Completado |
| 3. UI Config | Formulario para editar configuración proyecto | ⏳ Pendiente |
| 4. TypeScript | Actualizar interfaces con nuevos campos | ⏳ Pendiente |
| 5. Template | Crear template Word con placeholders | ⏳ Pendiente |
| 6. Backend | Server Action para generar documento | ⏳ Pendiente |
| 7. Frontend | Botón "Generar Acuerdo" en Control de Pagos | ⏳ Pendiente |

---

## 📝 Sesiones Relacionadas

### **Sesión 64** (2 Dic 2025) - Análisis + Migración DB
**Objetivo:** Implementar generación automática de documentos legales (Acuerdo de Separación)

**Trabajo realizado:**
1. Instalación de Python 3.13.9 + python-docx para leer archivos Word
2. Extracción y análisis del template `Modelo - Acuerdo de Separación (VF).docx`
3. Identificación de todos los campos dinámicos necesarios
4. Diseño de esquema de base de datos (decisión: todo en tabla `proyectos`)
5. Migración SQL ejecutada con 10 nuevos campos
6. Documentación completa en `consultas-leo/SESION_64_GENERACION_DOCUMENTOS.md`

**Decisiones técnicas:**
- **JSONB para multi-valor:** `representantes_legales` y `cuentas_bancarias` como arrays JSON
- **Todo en proyectos:** Cada proyecto puede tener diferente RUC/empresa/representantes
- **Moneda default:** USD (dólares)

---

## 🏗️ Arquitectura

### Flujo de Generación de Documentos

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE GENERACIÓN                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Usuario en /control-pagos                                       │
│     └── Click "Generar Acuerdo" en local específico                │
│                                                                     │
│  2. Server Action: generarAcuerdoSeparacion(controlPagoId)         │
│     ├── Fetch datos de control_pagos (local, cliente, montos)      │
│     ├── Fetch datos de proyectos (empresa, RUC, representantes)    │
│     └── Preparar objeto con todos los campos                       │
│                                                                     │
│  3. docx-templates procesa template                                 │
│     ├── Lee template Word con placeholders {campo}                 │
│     ├── Reemplaza placeholders con datos reales                    │
│     └── Genera nuevo archivo .docx                                 │
│                                                                     │
│  4. Retorno al cliente                                              │
│     ├── Opción A: Descarga directa del .docx                       │
│     └── Opción B: Conversión a PDF (requiere servicio externo)     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Tecnología Elegida: docx-templates

```bash
npm install docx-templates
```

**Ventajas:**
- ✅ Mantiene formato exacto del Word original
- ✅ Placeholders simples: `{nombre}`, `{monto}`, `{fecha}`
- ✅ Soporta tablas dinámicas, loops, condicionales
- ✅ Ampliamente usado y documentado

**Alternativas evaluadas:**
| Opción | Pros | Contras | Decisión |
|--------|------|---------|----------|
| docx-templates | Mantiene formato Word | Requiere PDF externo | ✅ Elegida |
| HTML → PDF (jsPDF) | 100% client-side | No mantiene formato | ❌ |
| react-pdf | 100% client-side | Rediseño desde cero | ❌ |

---

## 📋 Template Acuerdo de Separación

### Documento Original
**Archivo:** `consultas-leo/Modelo - Acuerdo de Separación (VF).docx`

### Estructura del Documento

| Sección | Contenido |
|---------|-----------|
| **Título** | ACUERDO DE SEPARACIÓN |
| **Introducción** | Datos de comprador(es) y vendedor |
| **PRIMERA** | Datos del vendedor (empresa), RUC, proyecto, ubicación, partida electrónica |
| **SEGUNDA** | Monto de separación, cuenta bancaria, datos del local (número, área, precio) |
| **TERCERO** | Plazo (5 días) y penalidades |
| **CUARTO** | Información mínima (INDECOPI) |
| **Firmas** | Fecha, firmas de comprador(es) y vendedor |
| **Tabla** | Datos de compradores (nombre, DNI, dirección) |

### Contenido Extraído (via python-docx)

```
ACUERDO DE SEPARACIÓN

Conste por el presente documento el Acuerdo de Separación de bien Inmueble/Inmuebles
para la celebración de Contrato de Compraventa de Bien Inmueble Futuro, que celebran
EL/LOS COMPRADOR(ES) y EL VENDEDOR cuyos datos figuran en la parte final del presente documento.

PRIMERA: ____________________________, con registro R.U.C. N° ___________________ y
domiciliado en ______________________________, (en adelante, EL VENDEDOR), se encuentra
desarrollando el Proyecto _______________________, en el Terreno ubicado en
____________________________, cuyas medidas perimétricas constan inscrito en la Partida
Electrónica Nro. ___________________ del Registro de Predios de _____________.
(en adelante EL PROYECTO)

SEGUNDA:
A la fecha del presente acuerdo, el/los COMPRADOR(ES) entrega(n) mediante depósito en
Cuenta Corriente N° __________________ del Banco ______________ la suma de ___________,
a favor del VENDEDOR por concepto de derecho de separación del/los siguiente(s) local(es)
comercial(es):

Local Comercial N° ____, con un área de ______ metros cuadrados, ubicado en EL PROYECTO
a un precio de venta de ____________ (_____________ con 00/100 ______________),
en adelante, el "BIEN INMUEBLE"

Las partes acuerdan que el monto de derecho de separación será aplicado como cuota inicial
al precio del valor de venta del Local(es) Comercial(es) cuando las partes formalicen la
firma del contrato de compra venta. Este monto no generará intereses.

El VENDEDOR declara recibir la suma antes indicada a su total satisfacción, sin mayor
constancia que la firma incluida en la parte final del presente contrato.

TERCERO: PLAZO Y PENALIDAD
El plazo para la firma del Contrato de Compraventa de Bien Inmueble Futuro, es de 5 días
calendarios, contados a partir de la firma del presente documento.

El COMPRADOR declara conocer que el valor de venta del Local(es) Comercial(es) antes
mencionado, es el detallado en la cláusula segunda del presente documento.

Sí, el COMPRADOR desistiera unilateralmente del presente acuerdo, o no cumpliera con
suscribir la minuta de compraventa pertinente en el plazo establecido, será aplicable una
penalidad equivalente al 100% de la suma entregada por concepto de derecho de separación,
por lo que, el COMPRADOR autoriza expresamente al VENDEDOR a hacerse pago con la suma
entregada por concepto de lucro cesante.

Por su parte, el VENDEDOR se obliga a no ofrecer en venta o bajo cualquier otra forma de
enajenación el/los Local(es) Comercial(es), señalado(s) en el presente documento, durante
el plazo de separación, y en caso de incumplimiento deberá pagar como penalidad el monto
entregado en calidad de separación.

CUARTO: INFORMACIÓN MÍNIMA
Las partes dejan establecido que el VENDEDOR ha brindado toda la información mínima al
COMPRADOR acorde a lo establecido en el Artículo 77° del Código de Protección y Defensa
de Consumidor del Instituto Nacional de Defensa de la Competencia y de la Propiedad
Intelectual (INDECOPI) aprobado por Ley 29571.

Las Partes suscriben el presente documento, en dos (02) ejemplares, a los [__] días del
mes de [__________] del 202[_].

EL/LOS COMPRADOR(ES):
EL VENDEDOR:
_________________________________
[_______________________]
Gerente General
[_________Empresa_________]

--- TABLA DE FIRMANTES ---
________________________________           ________________________________
[_______________________]                  [_______________________]
DNI N° [________]                          DNI N° [________]
[_____Dirección_______]                    [_____Dirección_______]
```

---

## 📊 Campos Dinámicos

### Datos del Proyecto/Empresa (desde tabla `proyectos`)

| Campo en Documento | Campo en DB | Ejemplo |
|--------------------|-------------|---------|
| Razón social empresa | `razon_social` | "ECO PLAZA S.A.C." |
| RUC | `ruc` | "20612345678" |
| Domicilio fiscal | `domicilio_fiscal` | "Av. Javier Prado 4567, Lima" |
| Nombre del proyecto | `nombre` | "Urb. San Gabriel" |
| Ubicación terreno | `ubicacion_terreno` | "Mz. A Lt. 1, Carabayllo" |
| Partida electrónica | `partida_electronica` | "P12345678" |
| Zona registral | `zona_registral` | "Lima" |
| Cuenta bancaria | `cuentas_bancarias[0].numero` | "194-123456789-0-12" |
| Banco | `cuentas_bancarias[0].banco` | "BCP" |
| Plazo firma (días) | `plazo_firma_dias` | 5 |
| Penalidad % | `penalidad_porcentaje` | 100 |
| Nombre representante | `representantes_legales[0].nombre` | "Juan Pérez" |
| DNI representante | `representantes_legales[0].dni` | "12345678" |
| Cargo representante | `representantes_legales[0].cargo` | "Gerente General" |

### Datos del Local (desde `control_pagos`)

| Campo en Documento | Campo en DB | Tabla |
|--------------------|-------------|-------|
| Número de local | `codigo_local` | control_pagos |
| Área (m²) | `metraje` | control_pagos |
| Precio de venta | `monto_venta` | control_pagos |
| Monto separación | `monto_separacion` | control_pagos |

### Datos del Cliente (desde `leads` / `control_pagos`)

| Campo en Documento | Campo en DB | Tabla | Estado |
|--------------------|-------------|-------|--------|
| Nombre cliente | `lead_nombre` | control_pagos | ✅ Existe |
| Teléfono cliente | `lead_telefono` | control_pagos | ✅ Existe |
| DNI cliente | `dni` | leads | ❌ **PENDIENTE** |
| Dirección cliente | `direccion` | leads | ❌ **PENDIENTE** |

### Datos de Fecha (generados dinámicamente)

| Campo en Documento | Fuente |
|--------------------|--------|
| Día | `new Date().getDate()` |
| Mes | `new Date().toLocaleDateString('es-PE', {month: 'long'})` |
| Año | `new Date().getFullYear()` |

---

## 🗄️ Base de Datos

### Migración Ejecutada (Sesión 64)

```sql
-- ============================================================================
-- MIGRATION: Agregar campos de configuración de documentos a proyectos
-- Sesión: 64
-- Fecha: 2 Diciembre 2025
-- ============================================================================

-- Campos simples (datos de la empresa/proyecto)
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS razon_social VARCHAR(200);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS ruc VARCHAR(11);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS domicilio_fiscal TEXT;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS ubicacion_terreno TEXT;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS partida_electronica VARCHAR(50);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS zona_registral VARCHAR(100);
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS plazo_firma_dias INTEGER DEFAULT 5;
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS penalidad_porcentaje INTEGER DEFAULT 100;

-- Campos JSONB para datos múltiples
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS representantes_legales JSONB DEFAULT '[]';
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS cuentas_bancarias JSONB DEFAULT '[]';

-- Comentarios para documentación
COMMENT ON COLUMN proyectos.razon_social IS 'Razón social de la empresa vendedora';
COMMENT ON COLUMN proyectos.ruc IS 'RUC de la empresa (11 dígitos)';
COMMENT ON COLUMN proyectos.domicilio_fiscal IS 'Dirección legal de la empresa';
COMMENT ON COLUMN proyectos.ubicacion_terreno IS 'Dirección física del proyecto/terreno';
COMMENT ON COLUMN proyectos.partida_electronica IS 'Número de partida registral del terreno';
COMMENT ON COLUMN proyectos.zona_registral IS 'Zona del registro de predios (Lima, Callao, etc.)';
COMMENT ON COLUMN proyectos.plazo_firma_dias IS 'Días para firmar contrato de compraventa (default 5)';
COMMENT ON COLUMN proyectos.penalidad_porcentaje IS 'Porcentaje de penalidad por desistimiento (default 100)';
COMMENT ON COLUMN proyectos.representantes_legales IS 'Array JSON de representantes: [{nombre, dni, cargo}]';
COMMENT ON COLUMN proyectos.cuentas_bancarias IS 'Array JSON de cuentas: [{banco, numero, tipo, moneda}] - moneda default USD';
```

### Estructura Final de `proyectos`

```sql
-- Campos originales
id                      uuid            DEFAULT uuid_generate_v4()
nombre                  varchar
slug                    varchar
color                   varchar
activo                  boolean         DEFAULT true
created_at              timestamptz     DEFAULT now()

-- Campos nuevos (Sesión 64)
razon_social            varchar(200)    NULL
ruc                     varchar(11)     NULL
domicilio_fiscal        text            NULL
ubicacion_terreno       text            NULL
partida_electronica     varchar(50)     NULL
zona_registral          varchar(100)    NULL
plazo_firma_dias        integer         DEFAULT 5
penalidad_porcentaje    integer         DEFAULT 100
representantes_legales  jsonb           DEFAULT '[]'
cuentas_bancarias       jsonb           DEFAULT '[]'
```

### Estructura de Campos JSONB

#### `representantes_legales`
```json
[
  {
    "nombre": "Juan Carlos Pérez López",
    "dni": "12345678",
    "cargo": "Gerente General"
  },
  {
    "nombre": "María García Torres",
    "dni": "87654321",
    "cargo": "Apoderada"
  }
]
```

#### `cuentas_bancarias`
```json
[
  {
    "banco": "Banco de Crédito del Perú",
    "numero": "194-123456789-0-12",
    "tipo": "Corriente",
    "moneda": "USD"
  }
]
```

**Nota:** La moneda por defecto es USD (dólares).

---

## 💻 Implementación Técnica

### Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `lib/types/proyecto.ts` | Modificar | Agregar nuevos campos a interface `Proyecto` |
| `app/configuracion-proyectos/page.tsx` | Modificar | Agregar formulario de configuración de documentos |
| `components/proyectos/ConfigDocumentosForm.tsx` | Crear | Formulario para editar campos de documentos |
| `lib/actions-documentos.ts` | Crear | Server Actions para generación de documentos |
| `templates/acuerdo-separacion.docx` | Crear | Template Word con placeholders |
| `components/control-pagos/GenerarAcuerdoButton.tsx` | Crear | Botón para generar documento |

### Interface TypeScript Actualizada

```typescript
// lib/types/proyecto.ts

interface RepresentanteLegal {
  nombre: string;
  dni: string;
  cargo: string;
}

interface CuentaBancaria {
  banco: string;
  numero: string;
  tipo: 'Corriente' | 'Ahorros';
  moneda: 'USD' | 'PEN';
}

interface Proyecto {
  // Campos existentes
  id: string;
  nombre: string;
  slug: string;
  color: string;
  activo: boolean;
  created_at: string;

  // Campos nuevos (Sesión 64)
  razon_social?: string;
  ruc?: string;
  domicilio_fiscal?: string;
  ubicacion_terreno?: string;
  partida_electronica?: string;
  zona_registral?: string;
  plazo_firma_dias: number; // default 5
  penalidad_porcentaje: number; // default 100
  representantes_legales: RepresentanteLegal[];
  cuentas_bancarias: CuentaBancaria[];
}
```

### Ejemplo de Server Action

```typescript
// lib/actions-documentos.ts (borrador)

'use server';

import createReport from 'docx-templates';
import { getControlPagoById } from './actions-control-pagos';
import { getProyectoById } from './db';

export async function generarAcuerdoSeparacion(controlPagoId: string) {
  // 1. Obtener datos del control de pago
  const controlPago = await getControlPagoById(controlPagoId);
  if (!controlPago) {
    return { success: false, message: 'Control de pago no encontrado' };
  }

  // 2. Obtener datos del proyecto
  const proyecto = await getProyectoById(controlPago.proyecto_id);
  if (!proyecto) {
    return { success: false, message: 'Proyecto no encontrado' };
  }

  // 3. Preparar datos para template
  const data = {
    // Empresa/Proyecto
    razon_social: proyecto.razon_social,
    ruc: proyecto.ruc,
    domicilio_fiscal: proyecto.domicilio_fiscal,
    nombre_proyecto: proyecto.nombre,
    ubicacion_terreno: proyecto.ubicacion_terreno,
    partida_electronica: proyecto.partida_electronica,
    zona_registral: proyecto.zona_registral,
    plazo_dias: proyecto.plazo_firma_dias,
    penalidad: proyecto.penalidad_porcentaje,

    // Representante legal (primero)
    representante_nombre: proyecto.representantes_legales[0]?.nombre,
    representante_cargo: proyecto.representantes_legales[0]?.cargo,

    // Cuenta bancaria (primera)
    banco: proyecto.cuentas_bancarias[0]?.banco,
    cuenta_numero: proyecto.cuentas_bancarias[0]?.numero,

    // Local
    codigo_local: controlPago.codigo_local,
    metraje: controlPago.metraje,
    monto_venta: controlPago.monto_venta,
    monto_separacion: controlPago.monto_separacion,

    // Cliente
    cliente_nombre: controlPago.lead_nombre,
    // TODO: cliente_dni y cliente_direccion (pendiente agregar a leads)

    // Fecha actual
    dia: new Date().getDate(),
    mes: new Date().toLocaleDateString('es-PE', { month: 'long' }),
    anio: new Date().getFullYear(),
  };

  // 4. Leer template y generar documento
  const template = await fs.readFile('templates/acuerdo-separacion.docx');
  const buffer = await createReport({
    template,
    data,
    cmdDelimiter: ['{', '}'],
  });

  // 5. Retornar buffer para descarga
  return {
    success: true,
    buffer: buffer.toString('base64'),
    filename: `Acuerdo_Separacion_${controlPago.codigo_local}_${Date.now()}.docx`,
  };
}
```

---

## ⏳ Próximos Pasos

| # | Tarea | Prioridad | Descripción |
|---|-------|-----------|-------------|
| 1 | **UI Configuración Proyecto** | Alta | Crear formulario en `/configuracion-proyectos` para editar campos de documentos |
| 2 | **Actualizar Interface Proyecto** | Alta | Agregar nuevos campos a TypeScript interface |
| 3 | **Agregar campos al cliente** | Alta | DNI y dirección en tabla `leads` o `control_pagos` |
| 4 | **Instalar docx-templates** | Media | `npm install docx-templates` |
| 5 | **Crear template con placeholders** | Media | Template Word con `{campo}` syntax |
| 6 | **Server Action generación** | Media | Implementar `generarAcuerdoSeparacion()` |
| 7 | **Botón en Control de Pagos** | Media | Agregar botón "Generar Acuerdo" en cada fila |
| 8 | **Conversión a PDF** | Baja | Opcional - requiere servicio externo |

### SQL Pendiente (Campos del Cliente)

```sql
-- PENDIENTE: Ejecutar cuando se implemente generación de documentos
ALTER TABLE leads ADD COLUMN IF NOT EXISTS dni VARCHAR(20);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS direccion TEXT;
```

**Alternativa:** Agregar estos campos a `control_pagos` como snapshot inmutable al procesar la venta.

---

## 📚 Referencias

- **Template original:** `consultas-leo/Modelo - Acuerdo de Separación (VF).docx`
- **Documentación sesión:** `consultas-leo/SESION_64_GENERACION_DOCUMENTOS.md`
- **Librería:** https://github.com/guigrpa/docx-templates
- **Supabase JSONB:** https://supabase.com/docs/guides/database/json

---

## 🛠️ Herramientas de Desarrollo

### Python + python-docx (Sesión 64)

Instalado para extraer contenido de archivos Word:

```bash
python --version  # Python 3.13.9
pip install python-docx
```

**Script de extracción:**
```python
from docx import Document

doc = Document('archivo.docx')
for para in doc.paragraphs:
    print(para.text)

for table in doc.tables:
    for row in table.rows:
        for cell in row.cells:
            print(cell.text)
```

---

**Última Actualización:** 2 Diciembre 2025 (Sesión 64)
**Estado:** EN DESARROLLO ⏳
**Progreso:** 2/8 fases completadas

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
