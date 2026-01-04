# PLAN DE IMPLEMENTACION: Procesos Contabilidad-Finanzas-Ventas

**Fecha:** 01 Enero 2025
**Reunion base:** Meet 30 Diciembre 2024
**Objetivo:** Mapear procesos actuales al sistema existente de forma quirurgica
**Estado:** SOLO PLAN - NO EJECUTAR SIN APROBACION

---

## RESUMEN EJECUTIVO

Este plan presenta el mapeo detallado entre los procesos documentados de EcoPlaza (AS-IS/TO-BE) y las funcionalidades del dashboard, incorporando las observaciones especificas del usuario y el analisis profundo del sistema actual.

### Estado Actual del Sistema

| Funcionalidad | Estado | Cobertura |
|--------------|--------|-----------|
| Control de Pagos | COMPLETO | Separacion, Inicial, Cuotas, Abonos |
| Gestion Locales | COMPLETO | Estados, Timer 120h, Historial |
| Ficha Inscripcion | COMPLETO | Todos los campos requeridos |
| Generacion Contratos | COMPLETO | Word con docx-templates |
| Roles y Permisos | COMPLETO | 7 roles implementados |
| Verificacion Finanzas | COMPLETO | Irreversible por rol |
| **Pago Multiples Locales** | NO EXISTE | 1 voucher = N locales |
| **Aprobacion Descuentos** | NO EXISTE | Configurable por proyecto |
| **Constancias** | NO EXISTE | 3 tipos requeridos |
| **Validacion Bancaria** | PARCIAL | Solo manual, sin matching |
| **Expediente Digital** | PARCIAL | Storage existe, UI falta |
| **Boletas/Facturas** | NO EXISTE | SmartClic/OCR requerido |

---

## SECCION 1: ANALISIS DETALLADO POR ETAPA

### 1.1 Registro de Venta (Etapa 1 - TO-BE)

#### REQUERIMIENTO USUARIO:
> "A veces pago para el local 001, 002 y 003 con un solo voucher de $5,000 USD. Si el local 001 dice que su separacion es $2,000 USD, preguntar al usuario donde van los otros $3,000 USD."

#### ESTADO ACTUAL:
- Cada local tiene su propio `control_pagos` independiente
- Un cliente compra 2 locales = 2 registros separados
- **NO existe** forma de registrar un abono consolidado
- **NO existe** forma de distribuir automaticamente el pago

#### SOLUCION PROPUESTA: Sistema de Pago Consolidado

**Escenario A: Cliente YA tiene multiples locales en sistema**

```
1. Usuario sube voucher de $5,000 USD
2. Sistema detecta monto con OCR (ver seccion OCR abajo)
3. Sistema muestra locales CONOCIDOS del cliente:

   ┌─────────────────────────────────────────────────────┐
   │  DISTRIBUIR PAGO: $5,000.00 USD                     │
   │  Voucher: IMG_20250101.jpg (OCR: $5,000.00)        │
   ├─────────────────────────────────────────────────────┤
   │                                                     │
   │  LOCALES DEL CLIENTE (3 encontrados):              │
   │                                                     │
   │  ☑ Local 001 - Separacion pendiente: $2,000.00     │
   │    [_____$2,000.00_____] ← Auto-sugerido           │
   │                                                     │
   │  ☑ Local 002 - Separacion pendiente: $1,500.00     │
   │    [_____$1,500.00_____] ← Auto-sugerido           │
   │                                                     │
   │  ☑ Local 003 - Separacion pendiente: $1,500.00     │
   │    [_____$1,500.00_____] ← Auto-sugerido           │
   │                                                     │
   │  ─────────────────────────────────────────────     │
   │  Total asignado:  $5,000.00 / $5,000.00  ✓         │
   │  Restante:        $0.00                             │
   │                                                     │
   │  [Cancelar]                    [Confirmar Pago]    │
   └─────────────────────────────────────────────────────┘
```

**Escenario B: Es el PRIMER local del cliente (o tiene monto sobrante)**

```
1. Usuario registra pago para Local 001 (primer local del cliente)
2. Sistema detecta: Separacion = $2,000 pero voucher = $5,000
3. Sistema pregunta que hacer con el restante:

   ┌─────────────────────────────────────────────────────┐
   │  DISTRIBUIR PAGO: $5,000.00 USD                     │
   │  Voucher: IMG_20250101.jpg (OCR: $5,000.00)        │
   ├─────────────────────────────────────────────────────┤
   │                                                     │
   │  LOCAL ACTUAL:                                      │
   │  ☑ Local 001 - Separacion: $2,000.00               │
   │    [_____$2,000.00_____] ✓                         │
   │                                                     │
   │  ─────────────────────────────────────────────     │
   │  ⚠️ MONTO RESTANTE: $3,000.00 USD                  │
   │                                                     │
   │  ¿Que deseas hacer con el restante?                │
   │                                                     │
   │  ○ Agregar otro local de este cliente              │
   │    └── Buscar: [________________] 🔍               │
   │        Resultados:                                  │
   │        • Local 002 - Disponible ($1,500 sep)       │
   │        • Local 003 - Disponible ($1,500 sep)       │
   │                                                     │
   │  ○ Abonar a cuota siguiente del Local 001          │
   │                                                     │
   │  ○ Dejar como saldo a favor del cliente            │
   │                                                     │
   │  [Cancelar]              [Continuar Distribucion]  │
   └─────────────────────────────────────────────────────┘

4. Si elige "Agregar otro local":
   - Busca por codigo de local
   - Lo agrega a la lista de distribucion
   - Repite hasta que monto restante = 0

   ┌─────────────────────────────────────────────────────┐
   │  DISTRIBUIR PAGO: $5,000.00 USD                     │
   ├─────────────────────────────────────────────────────┤
   │                                                     │
   │  LOCALES SELECCIONADOS:                            │
   │                                                     │
   │  ☑ Local 001 - Separacion    [___$2,000.00___] ✓   │
   │  ☑ Local 002 - Separacion    [___$1,500.00___] ✓   │
   │  ☑ Local 003 - Separacion    [___$1,500.00___] ✓   │
   │                                   [+ Agregar otro] │
   │                                                     │
   │  ─────────────────────────────────────────────     │
   │  Total:     $5,000.00 / $5,000.00  ✓ Cuadra        │
   │  Restante:  $0.00                                   │
   │                                                     │
   │  [Cancelar]                    [Confirmar Pago]    │
   └─────────────────────────────────────────────────────┘
```

**Resumen del Flujo:**
1. Usuario sube voucher → OCR detecta monto
2. Sistema muestra local actual con monto auto-sugerido
3. Si hay monto restante → Pregunta: ¿Agregar otro local? ¿Abonar a cuota? ¿Saldo a favor?
4. Usuario puede buscar y agregar locales adicionales
5. Validacion: Total asignado debe = Monto del voucher
6. Confirmar → Crear registros en todas las tablas

---

#### UX PARA CAPTURA OCR DE DOCUMENTOS

Cada vez que el usuario sube un documento (voucher, DNI, boleta), el sistema extrae datos automaticamente con GPT-4 Vision y los muestra de forma clara para validacion:

**Componente: DocumentoOCRCard**

```
┌─────────────────────────────────────────────────────────┐
│  DOCUMENTO SUBIDO                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐   TIPO: [Voucher ▼]                  │
│  │              │                                       │
│  │   📷         │   DATOS DETECTADOS (OCR):            │
│  │  Preview     │   ┌─────────────────────────────┐    │
│  │  voucher.jpg │   │ Monto:    [$5,000.00 USD  ] │    │
│  │              │   │ Fecha:    [14/11/2025     ] │    │
│  │              │   │ Banco:    [Interbank      ] │    │
│  │  [Ver full]  │   │ Nro Op:   [804263         ] │    │
│  └──────────────┘   │ Nombre:   [SALINAS MATTA  ] │    │
│                     └─────────────────────────────┘    │
│                                                         │
│  ✓ Datos extraidos automaticamente                     │
│  ⚠️ Verifica que los datos sean correctos              │
│                                                         │
│  [🔄 Re-escanear]  [✏️ Editar]  [🗑️ Eliminar]          │
└─────────────────────────────────────────────────────────┘
```

**Para DNI:**

```
┌─────────────────────────────────────────────────────────┐
│  DOCUMENTO SUBIDO                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐   TIPO: DNI (detectado auto)         │
│  │              │                                       │
│  │   📷         │   DATOS DETECTADOS (OCR):            │
│  │  Preview     │   ┌─────────────────────────────┐    │
│  │  dni.jpg     │   │ DNI:      [40558435       ] │    │
│  │              │   │ Nombres:  [DAVID          ] │    │
│  │              │   │ Apellidos:[SALINAS MATTA  ] │    │
│  │  [Ver full]  │   │ F.Nac:    [15/03/1985     ] │    │
│  └──────────────┘   └─────────────────────────────┘    │
│                                                         │
│  ✓ Coincide con cliente: DAVID SALINAS MATTA          │
│                                                         │
│  [🔄 Re-escanear]  [✏️ Editar]  [🗑️ Eliminar]          │
└─────────────────────────────────────────────────────────┘
```

**Para Boleta/Factura:**

```
┌─────────────────────────────────────────────────────────┐
│  DOCUMENTO SUBIDO                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐   TIPO: Boleta (detectado auto)      │
│  │              │                                       │
│  │   📷         │   DATOS DETECTADOS (OCR):            │
│  │  Preview     │   ┌─────────────────────────────┐    │
│  │  boleta.pdf  │   │ Tipo:     [Boleta    ▼    ] │    │
│  │              │   │ Serie:    [B001           ] │    │
│  │              │   │ Numero:   [00001234       ] │    │
│  │  [Ver full]  │   │ Fecha:    [14/11/2025     ] │    │
│  └──────────────┘   │ Monto:    [$2,000.00      ] │    │
│                     │ RUC:      [20600695771    ] │    │
│                     │ Cliente:  [SALINAS MATTA  ] │    │
│                     └─────────────────────────────┘    │
│                                                         │
│  ✓ Datos extraidos automaticamente                     │
│                                                         │
│  [🔄 Re-escanear]  [✏️ Editar]  [🗑️ Eliminar]          │
└─────────────────────────────────────────────────────────┘
```

**Vista Multiple (cuando suben varios documentos):**

```
┌─────────────────────────────────────────────────────────┐
│  DOCUMENTOS ADJUNTOS (3)                    [+ Subir]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                │
│  │ 📷      │  │ 📷      │  │ 📄      │                │
│  │ DNI     │  │ Voucher │  │ Boleta  │                │
│  │         │  │         │  │         │                │
│  │ ✓ OK    │  │ ✓ OK    │  │ ⚠️ Rev  │                │
│  └─────────┘  └─────────┘  └─────────┘                │
│                                                         │
│  Haz click en cada documento para ver/editar datos     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  DOCUMENTO SELECCIONADO: Voucher                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Monto:  $5,000.00 USD  │  Banco: Interbank      │   │
│  │ Fecha:  14/11/2025     │  Nro Op: 804263        │   │
│  │ Nombre: SALINAS MATTA DAVID                     │   │
│  └─────────────────────────────────────────────────┘   │
│  [🔄 Re-escanear]  [✏️ Editar campos]                  │
└─────────────────────────────────────────────────────────┘
```

**Estados visuales de cada documento:**

| Estado | Icono | Significado |
|--------|-------|-------------|
| ✓ OK | Verde | Datos extraidos correctamente |
| ⚠️ Rev | Amarillo | Requiere revision manual (OCR con baja confianza) |
| ❌ Error | Rojo | No se pudo leer, subir otra imagen |
| ⏳ Procesando | Gris | OCR en progreso |

**Archivos adicionales a crear:**

```
components/shared/DocumentoOCRCard.tsx (NUEVO)
  - Preview de imagen/PDF
  - Campos editables con datos OCR
  - Botones: Re-escanear, Editar, Eliminar
  - Estados visuales (OK, Rev, Error)

components/shared/DocumentosOCRGrid.tsx (NUEVO)
  - Grid de multiples documentos
  - Click para expandir detalle
  - Indicadores de estado por documento
```

**Modelo de Datos:**

```sql
-- Nueva tabla para agrupar pagos
CREATE TABLE pagos_consolidados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id),
  cliente_id UUID, -- opcional, puede ser lead_id
  monto_total DECIMAL(10,2) NOT NULL,
  moneda VARCHAR(3) DEFAULT 'USD',
  fecha_pago DATE NOT NULL,
  comprobante_url TEXT,
  comprobante_ocr_data JSONB, -- datos extraidos por OCR
  numero_operacion VARCHAR(50),
  banco_origen VARCHAR(100),
  estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, verificado, rechazado
  verificado_por UUID REFERENCES usuarios(id),
  fecha_verificacion TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

-- Tabla de distribucion
CREATE TABLE pagos_consolidados_distribucion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_consolidado_id UUID REFERENCES pagos_consolidados(id),
  control_pago_id UUID REFERENCES control_pagos(id),
  pago_id UUID REFERENCES pagos_local(id),
  monto_asignado DECIMAL(10,2) NOT NULL,
  concepto VARCHAR(50), -- separacion, inicial, cuota, abono
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Archivos a crear/modificar:**

```
lib/actions-pagos-consolidados.ts (NUEVO)
  - createPagoConsolidado()
  - distribuirPago()
  - getPagosConsolidadosByCliente()

components/control-pagos/PagoConsolidadoModal.tsx (NUEVO)
  - UI para distribuir pago entre locales
  - Auto-sugerencia de montos
  - Validacion de totales

components/control-pagos/VoucherOCRUploader.tsx (NUEVO)
  - Upload con OCR automatico
  - Extraccion de monto, fecha, banco
  - Preview y edicion manual
```

---

### 1.2 Validacion de Reglas - Aprobacion de Descuentos (Etapa 2 - TO-BE)

#### REQUERIMIENTO USUARIO:
> "Si el vendedor quiere vender por debajo del precio de lista necesita aprobacion del jefe de ventas. Si el descuento es muy alto requiere aprobacion de gerencia. Estos rangos deben ser configurables por proyecto."

#### ESTADO ACTUAL:
- `locales.precio_base` existe (precio de lista)
- `control_pagos.monto_venta` existe (precio negociado)
- **NO existe** sistema de aprobaciones
- **NO existe** configuracion de rangos por proyecto

#### SOLUCION PROPUESTA: Sistema de Aprobacion Configurable

**Configuracion por Proyecto:**

```
┌─────────────────────────────────────────────────────────┐
│  CONFIGURACION DE APROBACIONES - Proyecto Chincha      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  RANGOS DE DESCUENTO:                                  │
│                                                         │
│  Descuento 0% - 5%:     [Sin aprobacion]          ▼    │
│  Descuento 5% - 10%:    [Jefe de Ventas]          ▼    │
│  Descuento 10% - 15%:   [Jefe de Ventas + Gerencia] ▼  │
│  Descuento > 15%:       [Solo Gerencia]           ▼    │
│                                                         │
│  □ Notificar por WhatsApp cuando hay pendientes        │
│  □ Bloquear venta hasta aprobacion                     │
│  □ Permitir venta provisional (pendiente aprobacion)   │
│                                                         │
│  [Guardar Configuracion]                               │
└─────────────────────────────────────────────────────────┘
```

**Flujo de Aprobacion:**

```
1. Vendedor registra venta: Local 001 a $45,000 (lista: $50,000 = 10% descuento)
2. Sistema detecta descuento > 5%
3. Crear solicitud de aprobacion automatica
4. Notificar a aprobadores (webhook n8n → WhatsApp)
5. Aprobador ve lista de pendientes en dashboard
6. Aprobador aprueba/rechaza con comentario
7. Si aprueba → venta continua
8. Si rechaza → notificar vendedor, venta bloqueada
```

**Modelo de Datos:**

```sql
-- Configuracion de aprobaciones por proyecto
CREATE TABLE config_aprobaciones_descuento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id) UNIQUE,
  rangos JSONB NOT NULL DEFAULT '[
    {"min": 0, "max": 5, "aprobadores": []},
    {"min": 5, "max": 10, "aprobadores": ["jefe_ventas"]},
    {"min": 10, "max": 15, "aprobadores": ["jefe_ventas", "gerencia"]},
    {"min": 15, "max": 100, "aprobadores": ["gerencia"]}
  ]',
  notificar_whatsapp BOOLEAN DEFAULT true,
  bloquear_hasta_aprobacion BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Solicitudes de aprobacion
CREATE TABLE aprobaciones_descuento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id),
  control_pago_id UUID REFERENCES control_pagos(id),
  local_id UUID REFERENCES locales(id),
  precio_lista DECIMAL(10,2) NOT NULL,
  precio_negociado DECIMAL(10,2) NOT NULL,
  descuento_porcentaje DECIMAL(5,2) NOT NULL,
  vendedor_id UUID REFERENCES usuarios(id),
  estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, aprobado, rechazado
  aprobadores_requeridos TEXT[], -- ['jefe_ventas', 'gerencia']
  aprobaciones JSONB DEFAULT '[]', -- [{rol, usuario_id, fecha, decision, comentario}]
  fecha_solicitud TIMESTAMP DEFAULT NOW(),
  fecha_resolucion TIMESTAMP,
  comentario_resolucion TEXT
);
```

**Archivos a crear/modificar:**

```
lib/actions-aprobaciones.ts (NUEVO)
  - crearSolicitudAprobacion()
  - aprobarDescuento()
  - rechazarDescuento()
  - getAprobacionesPendientes()

components/configuracion/AprobacionesConfigPanel.tsx (NUEVO)
  - UI para configurar rangos por proyecto

components/aprobaciones/AprobacionesPendientesPanel.tsx (NUEVO)
  - Vista de solicitudes pendientes
  - Aprobar/Rechazar con comentario

app/api/webhooks/notificar-aprobacion/route.ts (NUEVO)
  - Webhook para n8n → WhatsApp
```

---

### 1.3 Emision Boleta/Factura (Etapa 3 - TO-BE)

#### REQUERIMIENTO USUARIO:
> "SmartClic todavia no tengo su integracion. Por ahora que suban la imagen o PDF de la boleta/factura y por OCR leemos los datos inteligentemente. Debe ser una experiencia de usuario genial."

#### INVESTIGACION REALIZADA:

**SmartClic:**
- NO tiene API publica documentada
- Requiere contacto directo para integracion

**Alternativas con API (para futuro):**
- **NubeFact** - API gratuita, bien documentada, mas popular en Peru
- **Lucode** - Especializada en API, autenticacion con tokens
- **Factura Peru** - Incluye APIs adicionales (WhatsApp, RUC/DNI)

#### SOLUCION PROPUESTA: Captura OCR de Boletas

**Flujo UX:**

```
┌─────────────────────────────────────────────────────────┐
│  REGISTRAR BOLETA/FACTURA                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Arrastrar imagen/PDF aqui o click para seleccionar]  │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │                 │  │  DATOS DETECTADOS (OCR)     │  │
│  │   Preview de    │  │                             │  │
│  │   boleta.pdf    │  │  Tipo:    [Boleta     ▼]   │  │
│  │                 │  │  Serie:   [B001-_____]     │  │
│  │                 │  │  Numero:  [_________]      │  │
│  │                 │  │  Fecha:   [01/01/2025]     │  │
│  │                 │  │  Monto:   [$_2,000.00_]    │  │
│  │                 │  │  RUC:     [__________]     │  │
│  │                 │  │  Cliente: [____________]   │  │
│  │                 │  │                             │  │
│  │                 │  │  ⚠️ Verificar datos antes   │  │
│  │                 │  │     de guardar              │  │
│  └─────────────────┘  └─────────────────────────────┘  │
│                                                         │
│  [Cancelar]           [Re-escanear]    [Guardar]       │
└─────────────────────────────────────────────────────────┘
```

**Modelo de Datos:**

```sql
-- Agregar campos a abonos_pago
ALTER TABLE abonos_pago ADD COLUMN IF NOT EXISTS
  boleta_tipo VARCHAR(20), -- 'boleta', 'factura'
  boleta_serie VARCHAR(10),
  boleta_numero VARCHAR(20),
  boleta_fecha DATE,
  boleta_ruc_emisor VARCHAR(11),
  boleta_imagen_url TEXT,
  boleta_ocr_data JSONB, -- datos raw del OCR
  boleta_verificada BOOLEAN DEFAULT false;
```

**Archivos a crear:**

```
lib/actions-boletas.ts (NUEVO)
  - uploadBoletaConOCR()
  - extraerDatosBoletaOCR() -- usando GPT-4 Vision
  - vincularBoletaAbono()

components/control-pagos/BoletaOCRUploader.tsx (NUEVO)
  - Upload con preview
  - Extraccion OCR automatica
  - Edicion manual de campos
  - Vinculacion con abono
```

**Integracion OCR con GPT-4 Vision:**

```typescript
// Prompt para GPT-4 Vision
const prompt = `
Analiza esta imagen de boleta/factura peruana y extrae:
1. Tipo de documento (boleta o factura)
2. Serie y numero (ej: B001-00001234)
3. Fecha de emision
4. Monto total
5. RUC del emisor
6. Nombre del cliente

Responde en JSON con este formato:
{
  "tipo": "boleta",
  "serie": "B001",
  "numero": "00001234",
  "fecha": "2025-01-01",
  "monto": 2000.00,
  "ruc_emisor": "20600695771",
  "cliente": "JUAN PEREZ"
}
`;
```

---

### 1.4 Validacion Bancaria (Etapa 4 - TO-BE)

#### REQUERIMIENTO USUARIO:
> "Todo sera manual porque lo automatizado requiere integracion con el banco. Necesitamos cargar el estado de cuenta bancario para hacer match. La ficha de inscripcion tiene los vouchers, boletas, etc. Hay que validar contra las transacciones. Revisar como lo hace Interbank, BCP, BBVA."

#### INVESTIGACION REALIZADA:

**Formato Interbank (Excel analizado):**
```
Columnas Reporte Original:
- Fecha de operacion
- Fecha de proceso
- Nro. de operacion
- Movimiento
- Descripcion
- Canal
- Cargo
- Abono

Columnas Consolidado (despues del match manual):
+ TIPO (BV = Boleta de Venta)
+ COMPROBANTE (B001-63)
+ DNI
+ NOMBRE
+ ESTADO (IDENTIFICADO)
```

**Hallazgos de Investigacion:**
- NO existe formato estandar entre bancos peruanos
- Todos comparten: Fecha, Descripcion, Monto
- Cada banco tiene orden y campos diferentes
- Se requiere mapeo configurable por banco

#### SOLUCION PROPUESTA: Sistema de Matching Bancario

**Flujo Principal:**

```
1. IMPORTAR ESTADO DE CUENTA
   ┌─────────────────────────────────────────────────────────┐
   │  IMPORTAR TRANSACCIONES BANCARIAS                       │
   ├─────────────────────────────────────────────────────────┤
   │                                                         │
   │  Banco: [Interbank ▼] [BCP] [BBVA] [Otro...]           │
   │                                                         │
   │  [Arrastrar Excel/CSV aqui]                            │
   │                                                         │
   │  Cuenta: [Dolares ▼] [Soles]                           │
   │  Rango:  [01/10/2025] a [31/12/2025]                   │
   │                                                         │
   │  [Importar]                                             │
   └─────────────────────────────────────────────────────────┘

2. VISTA DE MATCHING
   ┌─────────────────────────────────────────────────────────┐
   │  CONCILIACION BANCARIA - Interbank USD Oct-Dic 2025    │
   ├─────────────────────────────────────────────────────────┤
   │  [Matched: 25] [Pendientes: 5] [Sin match: 3]          │
   ├─────────────────────────────────────────────────────────┤
   │                                                         │
   │  TRANSACCION BANCARIA          PAGO EN SISTEMA         │
   │  ─────────────────────         ───────────────         │
   │  14/11 | $14,250 | DEP   ←→   Local 001 | Separacion  │
   │  SALINAS MATTA DAVID           DNI: 40558435           │
   │  Nro: 804263                   Match: 98% ✓            │
   │                                [Confirmar] [Rechazar]   │
   │  ─────────────────────────────────────────────────     │
   │  14/11 | $5,100 | DEP    ←→   Local 002 | Separacion  │
   │  Nro: 370609                   DNI: 25714641           │
   │                                Match: 95% ✓            │
   │                                [Confirmar] [Rechazar]   │
   │  ─────────────────────────────────────────────────     │
   │  18/11 | $14,500 | TRANSF ←→  ??? SIN MATCH           │
   │  ROJAS ROGGERO LETICIA         Buscar: [___________]   │
   │  Nro: 572012                   [Asignar Manual]        │
   │                                                         │
   └─────────────────────────────────────────────────────────┘
```

**Algoritmo de Matching:**

```
REGLA 1 (100% certeza):
  - Monto exacto + Fecha exacta + Numero operacion coincide

REGLA 2 (95%):
  - Monto exacto + Fecha ±1 dia + Nombre cliente en descripcion

REGLA 3 (90%):
  - Monto exacto + Fecha ±2 dias + DNI en sistema

REGLA 4 (85%):
  - Monto ±0.5% + Fecha ±3 dias + Nombre similar (>80%)

REGLA 5 (80%):
  - Monto exacto + Fecha ±5 dias

REGLA 6 (Manual):
  - Todo lo demas requiere asignacion manual
```

**Modelo de Datos:**

```sql
-- Configuracion de mapeo por banco
CREATE TABLE config_bancos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) UNIQUE NOT NULL, -- 'INTERBANK', 'BCP', 'BBVA'
  mapeo_columnas JSONB NOT NULL,
  -- Ejemplo para Interbank:
  -- {
  --   "fecha_operacion": "Fecha de operacion",
  --   "fecha_proceso": "Fecha de proceso",
  --   "numero_operacion": "Nro. de operacion",
  --   "tipo_movimiento": "Movimiento",
  --   "descripcion": "Descripcion",
  --   "canal": "Canal",
  --   "cargo": "Cargo",
  --   "abono": "Abono"
  -- }
  filas_encabezado INT DEFAULT 8, -- filas a saltar
  formato_fecha VARCHAR(20) DEFAULT 'YYYY-MM-DD',
  formato_monto VARCHAR(20) DEFAULT '$ #,##0.00',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transacciones importadas
CREATE TABLE transacciones_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id),
  banco_id UUID REFERENCES config_bancos(id),
  cuenta VARCHAR(50),
  moneda VARCHAR(3), -- USD, PEN
  fecha_operacion DATE NOT NULL,
  fecha_proceso DATE,
  numero_operacion VARCHAR(50),
  tipo_movimiento VARCHAR(50),
  descripcion TEXT,
  canal VARCHAR(50),
  monto DECIMAL(12,2) NOT NULL,
  es_cargo BOOLEAN, -- true = salida, false = entrada
  archivo_origen VARCHAR(255),
  fila_origen INT,
  estado_matching VARCHAR(20) DEFAULT 'pendiente',
  -- pendiente, matched, manual, ignorado
  match_confianza INT, -- 0-100
  abono_id UUID REFERENCES abonos_pago(id), -- vinculo al pago
  matched_at TIMESTAMP,
  matched_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Historial de importaciones
CREATE TABLE importaciones_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id),
  banco_id UUID REFERENCES config_bancos(id),
  archivo_nombre VARCHAR(255),
  archivo_url TEXT,
  fecha_desde DATE,
  fecha_hasta DATE,
  total_transacciones INT,
  transacciones_matched INT DEFAULT 0,
  transacciones_pendientes INT DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'procesando',
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);
```

**Archivos a crear:**

```
app/validacion-bancaria/page.tsx (NUEVO)
  - Vista principal de conciliacion

lib/actions-validacion-bancaria.ts (NUEVO)
  - importarEstadoCuenta()
  - parseExcelBancario()
  - ejecutarMatching()
  - confirmarMatch()
  - asignarManual()

components/validacion-bancaria/ImportarEstadoCuentaModal.tsx (NUEVO)
  - Upload de Excel
  - Seleccion de banco
  - Preview de datos

components/validacion-bancaria/MatchingPanel.tsx (NUEVO)
  - Vista de transacciones vs pagos
  - Filtros por estado
  - Confirmacion masiva

components/validacion-bancaria/AsignacionManualModal.tsx (NUEVO)
  - Busqueda de pagos
  - Asignacion manual
```

---

### 1.5 Constancias (Etapa 5 - TO-BE) - PRIORIDAD ALTA

#### REQUERIMIENTO USUARIO:
> "La fecha de vencimiento calculada quiere decir que hemos puesto 5 dias maximo que te dura la separacion. Eso es lo que se tiene que calcular."

#### SOLUCION: Generacion Automatica de Constancias

**Tipos de Constancia:**

| Tipo | Trigger | Datos Clave |
|------|---------|-------------|
| Separacion | `separacion_pagada = true` | Plazo 5 dias, fecha vencimiento calculada |
| Abono | Verificar abono (no separacion) | Monto abonado, numero operacion |
| Cancelacion | `saldo_pendiente = 0` | Historial completo de depositos |

**Calculo de Fecha Vencimiento (Separacion):**

```typescript
// En config del proyecto
const DIAS_VIGENCIA_SEPARACION = 5; // configurable por proyecto

// Calculo
const fechaEmision = new Date();
const fechaVencimiento = addDays(fechaEmision, DIAS_VIGENCIA_SEPARACION);
```

**Plantillas Word (.docx):**

```
templates/constancias/
├── constancia-separacion.docx
├── constancia-abono.docx
└── constancia-cancelacion.docx
```

**Variables para Constancia Separacion:**

```
{logo}
{razon_social}
{ruc}
{direccion_empresa}
{cliente_nombre}
{cliente_dni}
{conyuge_nombre} (opcional)
{conyuge_dni} (opcional)
{monto_pen}
{monto_pen_letras}
{tipo_cambio}
{monto_usd}
{monto_usd_letras}
{local_codigo}
{local_rubro}
{local_area}
{local_nivel}
{proyecto_nombre}
{depositos} (array: fecha, monto, operacion)
{plazo_dias} -- 5 dias por defecto
{fecha_vencimiento} -- calculada
{penalidad_porcentaje} -- 100%
{fecha_emision}
{firma_nombre}
{firma_cargo}
```

**Archivos a crear:**

```
lib/actions-constancias.ts (NUEVO)
  - generateConstanciaSeparacion()
  - generateConstanciaAbono()
  - generateConstanciaCancelacion()

components/control-pagos/GenerarConstanciaButton.tsx (NUEVO)
  - Boton contextual segun estado del pago
  - Descarga automatica
```

---

### 1.6 Expediente Digital (Etapa 6 - TO-BE)

#### REQUERIMIENTO USUARIO:
> "Desde que se crea la ficha de inscripcion comienza el historial y eso deberia seguir agrandándose. Todos los documentos que van generandose se agrandan al historial."

#### SOLUCION: Timeline de Expediente

**Vista Propuesta:**

```
┌─────────────────────────────────────────────────────────┐
│  EXPEDIENTE DIGITAL - Local 001 | Cliente: Juan Perez  │
├─────────────────────────────────────────────────────────┤
│  [Descargar Todo PDF]  [Ver Timeline]  [Ver Carpetas]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  TIMELINE DEL EXPEDIENTE                               │
│  ──────────────────────                                │
│                                                         │
│  📅 01/01/2025 - FICHA DE INSCRIPCION                  │
│     └── Ficha creada por vendedor@ecoplaza.com         │
│     └── DNI Titular: IMG_001.jpg                       │
│     └── DNI Conyuge: IMG_002.jpg                       │
│                                                         │
│  📅 02/01/2025 - SEPARACION                            │
│     └── Voucher: voucher_001.jpg ($2,000 USD)          │
│     └── Constancia Separacion: CONST-SEP-001.pdf       │
│                                                         │
│  📅 05/01/2025 - ABONO INICIAL                         │
│     └── Voucher: voucher_002.jpg ($10,000 USD)         │
│     └── Boleta: B001-00123.pdf                         │
│     └── Constancia Abono: CONST-ABO-001.pdf            │
│     └── Verificado por finanzas@ecoplaza.com           │
│                                                         │
│  📅 10/01/2025 - CONTRATO                              │
│     └── Contrato generado: CONTRATO-001.docx           │
│     └── Template usado: template_chincha_v2.docx       │
│                                                         │
│  📅 15/01/2025 - CUOTA 1                               │
│     └── Voucher: voucher_003.jpg ($5,000 USD)          │
│     └── Boleta: B001-00156.pdf                         │
│     └── Verificado por finanzas@ecoplaza.com           │
│                                                         │
│  📅 15/02/2025 - CANCELACION                           │
│     └── Ultimo pago: voucher_004.jpg ($3,000 USD)      │
│     └── Boleta: B001-00189.pdf                         │
│     └── Constancia Cancelacion: CONST-CAN-001.pdf      │
│     └── EXPEDIENTE COMPLETO ✓                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Modelo de Datos:**

```sql
-- Eventos del expediente (timeline)
CREATE TABLE expediente_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_pago_id UUID REFERENCES control_pagos(id),
  tipo_evento VARCHAR(50) NOT NULL,
  -- 'ficha_creada', 'documento_subido', 'pago_verificado',
  -- 'constancia_generada', 'contrato_generado', 'expediente_completo'
  descripcion TEXT,
  documento_tipo VARCHAR(50), -- 'dni', 'voucher', 'boleta', 'constancia', 'contrato'
  documento_url TEXT,
  documento_nombre VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

-- Estado del expediente
ALTER TABLE control_pagos ADD COLUMN IF NOT EXISTS
  expediente_completo BOOLEAN DEFAULT false,
  checklist_documentos JSONB DEFAULT '{
    "dni_titular": false,
    "dni_conyuge": false,
    "voucher_separacion": false,
    "constancia_separacion": false,
    "voucher_inicial": false,
    "boleta_inicial": false,
    "contrato": false,
    "constancia_cancelacion": false
  }';
```

**Archivos a crear:**

```
components/control-pagos/ExpedienteDigitalPanel.tsx (NUEVO)
  - Vista timeline
  - Vista carpetas
  - Boton descargar todo

lib/actions-expediente.ts (NUEVO)
  - getExpedienteTimeline()
  - registrarEventoExpediente()
  - descargarExpedienteCompleto() -- PDF merge
  - verificarChecklistCompleto()
```

---

### 1.7 Contratos Legal (Etapa 6 - TO-BE)

#### REQUERIMIENTO USUARIO:
> "Ya tenemos una plantilla por proyecto. Pero debe permitir que para ese solo contrato pueda modificar esa plantilla o subirle otra. Por defecto viene la del proyecto pero puedes descargarla, editarla si deseas o mantener la misma."

#### SOLUCION: Plantilla Flexible por Contrato

**UI Propuesta:**

```
┌─────────────────────────────────────────────────────────┐
│  GENERAR CONTRATO - Local 001                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  PLANTILLA A USAR:                                     │
│                                                         │
│  ◉ Usar plantilla del proyecto (Recomendado)           │
│    └── template_chincha_v2.docx                        │
│    └── [Descargar para revisar]                        │
│                                                         │
│  ○ Usar plantilla personalizada                        │
│    └── [Subir nueva plantilla .docx]                   │
│    └── ⚠️ Solo para este contrato                      │
│                                                         │
│  ─────────────────────────────────────────────────     │
│                                                         │
│  PREVIEW DE DATOS:                                     │
│  • Cliente: JUAN PEREZ GARCIA                          │
│  • DNI: 12345678                                       │
│  • Local: 001                                          │
│  • Monto: $50,000 USD                                  │
│  • Cuotas: 12                                          │
│                                                         │
│  [Cancelar]                    [Generar Contrato]      │
└─────────────────────────────────────────────────────────┘
```

**Modelo de Datos:**

```sql
-- Agregar campos a control_pagos
ALTER TABLE control_pagos ADD COLUMN IF NOT EXISTS
  contrato_template_personalizado_url TEXT, -- si se uso template custom
  contrato_template_usado VARCHAR(255), -- nombre del template usado
  contrato_generado_url TEXT,
  contrato_generado_at TIMESTAMP;
```

**Modificar:**

```
lib/actions-contratos.ts
  - Agregar parametro templateUrl opcional
  - Registrar que template se uso
  - Permitir subir template personalizado

components/control-pagos/GenerarContratoModal.tsx
  - Opcion de usar template proyecto vs personalizado
  - Boton descargar template para revisar
  - Upload de template personalizado
```

---

### 1.8 Contabilidad - Exportacion a Concard (Etapa 7 - TO-BE)

#### REQUERIMIENTO USUARIO:
> "El consolidado es el que necesitas para exportarlo a Concard. Necesitamos buena interfaz porque esto solo es para Interbank, como lo haran los demas bancos?"

#### ANALISIS DEL CONSOLIDADO:

```
Columnas del Consolidado Interbank:
1. Fecha de operacion
2. Fecha de proceso
3. Nro. de operacion
4. Movimiento
5. Descripcion
6. Canal
7. Cargo
8. Abono
9. TIPO (BV = Boleta de Venta)
10. COMPROBANTE (B001-63)
11. DNI
12. NOMBRE
13. ESTADO (IDENTIFICADO)
```

#### SOLUCION: Exportacion Multi-Banco a Concard

**Flujo:**

```
1. Usuario hace matching en Validacion Bancaria
2. Sistema genera automaticamente el "consolidado"
3. Usuario exporta en formato Concard

┌─────────────────────────────────────────────────────────┐
│  EXPORTAR A CONCARD                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Banco:    [Interbank ▼]                               │
│  Cuenta:   [Dolares ▼]                                 │
│  Periodo:  [01/10/2025] a [31/12/2025]                 │
│                                                         │
│  RESUMEN:                                              │
│  • Transacciones totales: 30                           │
│  • Matched (identificados): 25                         │
│  • Pendientes: 5                                       │
│                                                         │
│  ⚠️ Hay 5 transacciones sin identificar.              │
│     [Exportar solo identificados]                      │
│     [Ir a completar matching]                          │
│                                                         │
│  Formato: [Excel Concard ▼]                            │
│                                                         │
│  [Cancelar]                    [Exportar]              │
└─────────────────────────────────────────────────────────┘
```

**Archivos a crear:**

```
lib/exportToConcard.ts (NUEVO)
  - generateConcardExcel()
  - Formato con columnas del consolidado

components/validacion-bancaria/ExportarConcardModal.tsx (NUEVO)
  - Seleccion de banco y periodo
  - Preview de datos
  - Exportacion
```

---

## SECCION 2: FASES DE IMPLEMENTACION

### FASE 1: CONSTANCIAS (PRIORIDAD MAXIMA) - Viernes 03 Enero

**Objetivo:** Mostrar a Victoria las 3 constancias funcionando.

**Entregables:**
- [ ] Template `constancia-separacion.docx` con variables
- [ ] Template `constancia-abono.docx` con variables
- [ ] Template `constancia-cancelacion.docx` con variables
- [ ] `lib/actions-constancias.ts` con las 3 funciones
- [ ] `GenerarConstanciaButton.tsx` en panel de pagos
- [ ] Calculo automatico de fecha vencimiento (5 dias)

**Archivos:**
```
templates/constancias/constancia-separacion.docx
templates/constancias/constancia-abono.docx
templates/constancias/constancia-cancelacion.docx
lib/actions-constancias.ts
components/control-pagos/GenerarConstanciaButton.tsx
```

---

### FASE 2: CAPTURA INTELIGENTE (OCR) - Semana 06-10 Enero

**Objetivo:** OCR para vouchers y boletas con GPT-4 Vision.

**Entregables:**
- [ ] Componente `VoucherOCRUploader.tsx`
- [ ] Componente `BoletaOCRUploader.tsx`
- [ ] Integracion GPT-4 Vision para extraccion
- [ ] Almacenamiento de datos OCR en DB
- [ ] Validacion visual de datos extraidos

**Archivos:**
```
lib/actions-ocr.ts
components/shared/VoucherOCRUploader.tsx
components/control-pagos/BoletaOCRUploader.tsx
app/api/ocr/extract/route.ts
```

---

### FASE 3: VALIDACION BANCARIA - Semana 06-10 Enero

**Objetivo:** Importar estado de cuenta y hacer matching.

**Entregables:**
- [ ] Configuracion de mapeo por banco (Interbank, BCP, BBVA)
- [ ] `ImportarEstadoCuentaModal.tsx`
- [ ] Vista de matching con niveles de confianza
- [ ] Asignacion manual para casos sin match
- [ ] Exportacion a formato Concard

**Archivos:**
```
app/validacion-bancaria/page.tsx
lib/actions-validacion-bancaria.ts
components/validacion-bancaria/ImportarEstadoCuentaModal.tsx
components/validacion-bancaria/MatchingPanel.tsx
components/validacion-bancaria/ExportarConcardModal.tsx
supabase/migrations/YYYYMMDD_validacion_bancaria.sql
```

---

### FASE 4: PAGOS MULTIPLES LOCALES - Semana 13-17 Enero

**Objetivo:** 1 voucher = N locales con UX excelente.

**Entregables:**
- [ ] `PagoConsolidadoModal.tsx` con distribucion inteligente
- [ ] Tabla `pagos_consolidados` y `pagos_consolidados_distribucion`
- [ ] Auto-sugerencia de montos basada en pendientes
- [ ] Vinculacion con OCR de voucher

**Archivos:**
```
lib/actions-pagos-consolidados.ts
components/control-pagos/PagoConsolidadoModal.tsx
supabase/migrations/YYYYMMDD_pagos_consolidados.sql
```

---

### FASE 5: APROBACION DE DESCUENTOS - Semana 13-17 Enero

**Objetivo:** Sistema configurable de aprobaciones por proyecto.

**Entregables:**
- [ ] Configuracion de rangos por proyecto
- [ ] Vista de aprobaciones pendientes
- [ ] Notificaciones WhatsApp via webhook n8n
- [ ] Flujo de aprobacion/rechazo con comentarios

**Archivos:**
```
lib/actions-aprobaciones.ts
components/configuracion/AprobacionesConfigPanel.tsx
components/aprobaciones/AprobacionesPendientesPanel.tsx
app/api/webhooks/notificar-aprobacion/route.ts
supabase/migrations/YYYYMMDD_aprobaciones_descuento.sql
```

---

### FASE 6: EXPEDIENTE DIGITAL - Semana 20-24 Enero

**Objetivo:** Timeline unificado de todos los documentos.

**Entregables:**
- [ ] Vista timeline del expediente
- [ ] Vista por carpetas
- [ ] Checklist de documentos completos
- [ ] Boton "Descargar Expediente Completo" (PDF merge)
- [ ] Registro automatico de eventos

**Archivos:**
```
lib/actions-expediente.ts
components/control-pagos/ExpedienteDigitalPanel.tsx
lib/pdf-merge.ts
```

---

### FASE 7: CONTRATOS FLEXIBLES - Semana 20-24 Enero

**Objetivo:** Plantilla por defecto o personalizada.

**Entregables:**
- [ ] Opcion de usar template del proyecto o personalizado
- [ ] Registro de template usado en cada contrato
- [ ] Boton descargar template para revisar

**Archivos:**
```
components/control-pagos/GenerarContratoModal.tsx (modificar)
lib/actions-contratos.ts (modificar)
```

---

### FASE 8 (FUTURO): INTEGRACION FACTURACION ELECTRONICA

**Estado:** Pendiente API key de proveedor

**Opciones investigadas:**
1. **NubeFact** - API gratuita, bien documentada (RECOMENDADO)
2. **Lucode** - Especializada en API
3. **Factura Peru** - Incluye APIs adicionales
4. **SmartClic** - NO tiene API publica documentada

**Accion:** Solicitar a cliente que escoja proveedor y obtenga API key.

---

## SECCION 3: MODELO DE DATOS COMPLETO

### Nuevas Tablas

```sql
-- 1. Pagos consolidados (1 voucher = N locales)
CREATE TABLE pagos_consolidados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id),
  cliente_id UUID,
  monto_total DECIMAL(10,2) NOT NULL,
  moneda VARCHAR(3) DEFAULT 'USD',
  fecha_pago DATE NOT NULL,
  comprobante_url TEXT,
  comprobante_ocr_data JSONB,
  numero_operacion VARCHAR(50),
  banco_origen VARCHAR(100),
  estado VARCHAR(20) DEFAULT 'pendiente',
  verificado_por UUID REFERENCES usuarios(id),
  fecha_verificacion TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

CREATE TABLE pagos_consolidados_distribucion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pago_consolidado_id UUID REFERENCES pagos_consolidados(id),
  control_pago_id UUID REFERENCES control_pagos(id),
  pago_id UUID REFERENCES pagos_local(id),
  monto_asignado DECIMAL(10,2) NOT NULL,
  concepto VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Aprobaciones de descuento
CREATE TABLE config_aprobaciones_descuento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id) UNIQUE,
  rangos JSONB NOT NULL,
  notificar_whatsapp BOOLEAN DEFAULT true,
  bloquear_hasta_aprobacion BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE aprobaciones_descuento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id),
  control_pago_id UUID REFERENCES control_pagos(id),
  local_id UUID REFERENCES locales(id),
  precio_lista DECIMAL(10,2) NOT NULL,
  precio_negociado DECIMAL(10,2) NOT NULL,
  descuento_porcentaje DECIMAL(5,2) NOT NULL,
  vendedor_id UUID REFERENCES usuarios(id),
  estado VARCHAR(20) DEFAULT 'pendiente',
  aprobadores_requeridos TEXT[],
  aprobaciones JSONB DEFAULT '[]',
  fecha_solicitud TIMESTAMP DEFAULT NOW(),
  fecha_resolucion TIMESTAMP,
  comentario_resolucion TEXT
);

-- 3. Validacion bancaria
CREATE TABLE config_bancos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) UNIQUE NOT NULL,
  mapeo_columnas JSONB NOT NULL,
  filas_encabezado INT DEFAULT 8,
  formato_fecha VARCHAR(20) DEFAULT 'YYYY-MM-DD',
  formato_monto VARCHAR(20) DEFAULT '$ #,##0.00',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transacciones_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id),
  banco_id UUID REFERENCES config_bancos(id),
  cuenta VARCHAR(50),
  moneda VARCHAR(3),
  fecha_operacion DATE NOT NULL,
  fecha_proceso DATE,
  numero_operacion VARCHAR(50),
  tipo_movimiento VARCHAR(50),
  descripcion TEXT,
  canal VARCHAR(50),
  monto DECIMAL(12,2) NOT NULL,
  es_cargo BOOLEAN,
  archivo_origen VARCHAR(255),
  fila_origen INT,
  estado_matching VARCHAR(20) DEFAULT 'pendiente',
  match_confianza INT,
  abono_id UUID REFERENCES abonos_pago(id),
  matched_at TIMESTAMP,
  matched_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE importaciones_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID REFERENCES proyectos(id),
  banco_id UUID REFERENCES config_bancos(id),
  archivo_nombre VARCHAR(255),
  archivo_url TEXT,
  fecha_desde DATE,
  fecha_hasta DATE,
  total_transacciones INT,
  transacciones_matched INT DEFAULT 0,
  transacciones_pendientes INT DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'procesando',
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);

-- 4. Expediente digital
CREATE TABLE expediente_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_pago_id UUID REFERENCES control_pagos(id),
  tipo_evento VARCHAR(50) NOT NULL,
  descripcion TEXT,
  documento_tipo VARCHAR(50),
  documento_url TEXT,
  documento_nombre VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id)
);
```

### Modificaciones a Tablas Existentes

```sql
-- abonos_pago
ALTER TABLE abonos_pago ADD COLUMN IF NOT EXISTS
  numero_operacion VARCHAR(50),
  banco_origen VARCHAR(100),
  comprobante_ocr_data JSONB,
  boleta_tipo VARCHAR(20),
  boleta_serie VARCHAR(10),
  boleta_numero VARCHAR(20),
  boleta_fecha DATE,
  boleta_ruc_emisor VARCHAR(11),
  boleta_imagen_url TEXT,
  boleta_ocr_data JSONB,
  boleta_verificada BOOLEAN DEFAULT false,
  constancia_generada BOOLEAN DEFAULT FALSE,
  constancia_tipo VARCHAR(20),
  constancia_url TEXT;

-- control_pagos
ALTER TABLE control_pagos ADD COLUMN IF NOT EXISTS
  constancia_cancelacion_url TEXT,
  expediente_completo BOOLEAN DEFAULT FALSE,
  checklist_documentos JSONB DEFAULT '{}',
  contrato_template_personalizado_url TEXT,
  contrato_template_usado VARCHAR(255),
  contrato_generado_url TEXT,
  contrato_generado_at TIMESTAMP;

-- proyectos (para config de dias vigencia separacion)
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS
  dias_vigencia_separacion INT DEFAULT 5;
```

---

## SECCION 4: CRONOGRAMA RESUMEN

| Fase | Semana | Entregables Clave |
|------|--------|-------------------|
| **1. Constancias** | 03 Ene | 3 constancias funcionando |
| **2. OCR** | 06-10 Ene | Vouchers y boletas con GPT-4 Vision |
| **3. Validacion Bancaria** | 06-10 Ene | Matching Interbank, BCP, BBVA |
| **4. Pagos Consolidados** | 13-17 Ene | 1 voucher = N locales |
| **5. Aprobaciones** | 13-17 Ene | Descuentos configurables |
| **6. Expediente** | 20-24 Ene | Timeline + PDF merge |
| **7. Contratos** | 20-24 Ene | Template flexible |
| **8. Facturacion** | Futuro | Integracion NubeFact/otro |

---

## SECCION 5: REDUCCION DE CARGA OPERATIVA

Con estas implementaciones se estima:

| Area | Actual | Despues | Reduccion |
|------|--------|---------|-----------|
| Finanzas operativas | Alta | Baja | -60% |
| Validadores manuales | Manual | Semi-auto | -70% |
| Contabilidad operativa | Alta | Media | -50% |
| Legal operativo | Media | Baja | -40% |

**Impacto estimado:** 4-8 personas menos en tareas repetitivas.

---

*Documento generado para planificacion. NO EJECUTAR sin aprobacion.*
*Ultima actualizacion: 01 Enero 2025*

**ITERRUPTIVO**
*Iterativamente Disruptivo*
