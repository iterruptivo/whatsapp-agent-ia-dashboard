# PLAN V2: Mejoras Reportería y Fichas de Inscripción

**Fecha:** 26 Enero 2026
**Sesión:** 108
**Versión:** 2.0 (Corregido según feedback)

---

## RESUMEN EJECUTIVO

| # | Módulo | Ubicación | Complejidad |
|---|--------|-----------|-------------|
| 1 | OCR Movimiento Bancario | Popup Validación (ReporteDiario) | Media |
| 2 | OCR Número Boleta | Popup Vincular Boleta | Media |
| 3 | Múltiples Asesores | Ficha Inscripción | Media |
| 4 | Nuevas Columnas | Reporte Fichas Inscripción | Baja |

---

## MÓDULO 1: OCR EN POPUP DE VALIDACIÓN

### Contexto
Cuando Finanzas valida un depósito en **Reporte Diario**, actualmente solo marca como validado.

**NUEVO:** Deben poder adjuntar imagen del movimiento bancario (captura del reporte del banco) y el sistema lee el número de operación con OCR.

### Flujo Actual vs Nuevo

```
ACTUAL:
═══════════════════════════════════════════════════════════════
Reporte Diario → Click "Validar" → Confirmar → ✅ Validado


NUEVO:
═══════════════════════════════════════════════════════════════
Reporte Diario → Click "Validar" → Popup Expandido:

┌─────────────────────────────────────────────────────────────┐
│  Validar Depósito                                       [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📋 DATOS DEL VOUCHER (ya capturado)                        │
│  ─────────────────────────────────────────────────────────  │
│  Cliente:    Juan Pérez                                     │
│  Monto:      $5,000.00 USD                                  │
│  Banco:      Interbank                                      │
│  N° Op (voucher): 804263                                    │
│                                                             │
│  ═══════════════════════════════════════════════════════    │
│  📎 ADJUNTAR MOVIMIENTO BANCARIO (del reporte del banco)    │
│  ═══════════════════════════════════════════════════════    │
│                                                             │
│  [📷 Subir captura del movimiento bancario]                 │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │        (Preview de imagen subida)                     │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  N° Operación (banco): [804263________] ✏️                  │
│  Confianza OCR:        ████████░░ 85%                       │
│  ⚠️ Edite si el valor es incorrecto                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Notas (opcional):                                          │
│  [________________________________]                         │
│                                                             │
│           [Cancelar]              [✅ Validar Depósito]     │
└─────────────────────────────────────────────────────────────┘
```

### Implementación

#### 1.1 Migración BD
```sql
-- migrations/026_validacion_movimiento_bancario.sql

-- Imagen del movimiento bancario (captura del reporte del banco)
ALTER TABLE depositos_ficha
ADD COLUMN IF NOT EXISTS imagen_movimiento_bancario_url TEXT;

-- Número de operación extraído del movimiento bancario (OCR)
ALTER TABLE depositos_ficha
ADD COLUMN IF NOT EXISTS numero_operacion_banco VARCHAR(100);

-- Flag si fue editado manualmente
ALTER TABLE depositos_ficha
ADD COLUMN IF NOT EXISTS numero_operacion_banco_editado BOOLEAN DEFAULT false;

-- Confianza del OCR (0-100)
ALTER TABLE depositos_ficha
ADD COLUMN IF NOT EXISTS numero_operacion_banco_confianza INTEGER;
```

#### 1.2 Actualizar Popup de Validación
**Archivo:** `components/reporteria/ValidarDepositoModal.tsx` (crear o modificar existente)

**Funcionalidades:**
1. Mostrar datos del voucher existente
2. Sección para subir imagen del movimiento bancario
3. Llamar OCR al subir imagen → extraer número operación
4. Mostrar número extraído con barra de confianza
5. Input editable para corregir si OCR falla
6. Campo de notas (ya existe)
7. Botón validar

#### 1.3 Server Action
```typescript
// lib/actions-depositos-ficha.ts

export async function validarDepositoConMovimiento(
  depositoId: string,
  data: {
    imagenMovimientoUrl?: string;
    numeroOperacionBanco?: string;
    numeroOperacionBancoEditado?: boolean;
    numeroOperacionBancoConfianza?: number;
    notas?: string;
  }
): Promise<{ success: boolean; message: string }>
```

### Entregables Módulo 1
| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `migrations/026_validacion_movimiento_bancario.sql` | Nuevos campos |
| 2 | `ValidarDepositoModal.tsx` | Popup expandido |
| 3 | `lib/actions-depositos-ficha.ts` | Función actualizada |

---

## MÓDULO 2: OCR EN POPUP DE VINCULAR BOLETA

### Contexto
Ya existe el popup para vincular boleta a un depósito.

**NUEVO:** Permitir subir imagen de la boleta y que OCR lea el número automáticamente.

### Flujo Actual vs Nuevo

```
ACTUAL:
═══════════════════════════════════════════════════════════════
Click "Vincular Boleta" → Popup → Escribir número manualmente → Guardar


NUEVO:
═══════════════════════════════════════════════════════════════
Click "Vincular Boleta" → Popup Expandido:

┌─────────────────────────────────────────────────────────────┐
│  Vincular Boleta                                        [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📎 SUBIR IMAGEN DE LA BOLETA (opcional)                    │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [📷 Subir imagen de la boleta]                             │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │        (Preview de imagen subida)                     │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ═══════════════════════════════════════════════════════    │
│  DATOS DE LA BOLETA                                         │
│  ═══════════════════════════════════════════════════════    │
│                                                             │
│  Tipo:     (●) Boleta  ( ) Factura                          │
│                                                             │
│  Número:   [B001-00045678____] ✏️                           │
│  Confianza OCR: ██████░░░░ 60%                              │
│  ⚠️ Edite si el valor es incorrecto                         │
│                                                             │
│           [Cancelar]              [💾 Vincular]             │
└─────────────────────────────────────────────────────────────┘
```

### Implementación

#### 2.1 Migración BD
```sql
-- migrations/027_boleta_ocr.sql

-- Imagen de la boleta
ALTER TABLE depositos_ficha
ADD COLUMN IF NOT EXISTS boleta_imagen_url TEXT;

-- Flag si número boleta fue editado
ALTER TABLE depositos_ficha
ADD COLUMN IF NOT EXISTS numero_boleta_editado BOOLEAN DEFAULT false;

-- Confianza OCR de la boleta
ALTER TABLE depositos_ficha
ADD COLUMN IF NOT EXISTS numero_boleta_confianza INTEGER;
```

#### 2.2 Actualizar OCR - Extraer número boleta
**Archivo:** `lib/actions-ocr.ts`

Agregar función o actualizar prompt para extraer número de boleta/factura de una imagen.

```typescript
export async function extractBoletaData(imageBase64: string): Promise<{
  numero_boleta: string;
  tipo: 'boleta' | 'factura';
  confianza: number;
}>
```

#### 2.3 Actualizar Popup Vincular Boleta
**Archivo:** `components/reporteria/VincularBoletaModal.tsx` (modificar existente)

**Funcionalidades:**
1. Sección para subir imagen (opcional)
2. Si sube imagen → llamar OCR → extraer número
3. Mostrar número con barra de confianza
4. Input editable para corregir
5. Selector tipo (boleta/factura)
6. Guardar todo

### Entregables Módulo 2
| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `migrations/027_boleta_ocr.sql` | Nuevos campos |
| 2 | `lib/actions-ocr.ts` | Nueva función extractBoletaData |
| 3 | `VincularBoletaModal.tsx` | Popup actualizado |

---

## MÓDULO 3: MÚLTIPLES ASESORES EN FICHA

### Contexto
Actualmente la ficha tiene un solo `vendedor_id`. Se necesita registrar hasta 3 asesores + jefatura.

**SIMPLIFICADO:** Sin distinción de "externo", todos pueden vender cualquier proyecto.

### Implementación

#### 3.1 Migración BD
```sql
-- migrations/028_asesores_ficha.sql

CREATE TABLE asesores_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID NOT NULL REFERENCES clientes_ficha(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('asesor_1', 'asesor_2', 'asesor_3', 'jefatura')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(ficha_id, rol)  -- Solo 1 por rol
);

-- Índices
CREATE INDEX idx_asesores_ficha_ficha ON asesores_ficha(ficha_id);
CREATE INDEX idx_asesores_ficha_usuario ON asesores_ficha(usuario_id);

-- RLS
ALTER TABLE asesores_ficha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Asesores visibles para usuarios autenticados"
ON asesores_ficha FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Asesores insertables por roles permitidos"
ON asesores_ficha FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Asesores actualizables por roles permitidos"
ON asesores_ficha FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Asesores eliminables por roles permitidos"
ON asesores_ficha FOR DELETE
TO authenticated
USING (true);
```

#### 3.2 UI en Ficha de Inscripción
**Archivo:** `components/locales/FichaInscripcionModal.tsx`

Nueva sección:
```
═══════════════════════════════════════════════════════════════
EQUIPO DE VENTA
═══════════════════════════════════════════════════════════════

Asesor 1 (principal) *: [▼ Seleccionar asesor________________]

Asesor 2 (opcional):    [▼ Seleccionar asesor________________]

Asesor 3 (opcional):    [▼ Seleccionar asesor________________]

Jefatura *:             [▼ Seleccionar jefe de ventas________]

───────────────────────────────────────────────────────────────
ℹ️ Registre todos los asesores que participaron en esta venta
───────────────────────────────────────────────────────────────
```

#### 3.3 Server Actions
```typescript
// lib/actions-asesores-ficha.ts (nuevo)

export async function getAsesoresFicha(fichaId: string): Promise<AsesorFicha[]>

export async function saveAsesoresFicha(
  fichaId: string,
  asesores: {
    rol: 'asesor_1' | 'asesor_2' | 'asesor_3' | 'jefatura';
    usuario_id: string;
  }[]
): Promise<{ success: boolean }>
```

#### 3.4 Migrar datos existentes
```sql
-- Migrar vendedor_id actual a asesor_1
INSERT INTO asesores_ficha (ficha_id, usuario_id, rol)
SELECT id, vendedor_id, 'asesor_1'
FROM clientes_ficha
WHERE vendedor_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

### Entregables Módulo 3
| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `migrations/028_asesores_ficha.sql` | Nueva tabla |
| 2 | `lib/actions-asesores-ficha.ts` | CRUD asesores |
| 3 | `FichaInscripcionModal.tsx` | Sección equipo venta |
| 4 | Script migración datos existentes | Migrar vendedor_id |

---

## MÓDULO 4: NUEVAS COLUMNAS REPORTE FICHAS

### Layout Actual vs Nuevo

```
ACTUAL:
═══════════════════════════════════════════════════════════════════════════════
# │ Local │ Proyecto │ Titular │ DNI │ Vendedor │ Jefe │ Caseta │ USD │ PEN │ Fecha │ Nuevo Abono │ Ver


NUEVO:
═══════════════════════════════════════════════════════════════════════════════
# │ F.Separación │ Local │ Metraje │ Proyecto │ Titular │ DNI │ Equipo │ Precio │ Abonado │ Estado │ Contrato │ Ver
```

### Cambios Detallados

| Columna | Acción | Descripción |
|---------|--------|-------------|
| **#** | Mantener | Número de fila |
| **F.Separación** | AGREGAR | Fecha del primer abono (no fecha creación) |
| **Local** | Mantener | Código del local |
| **Metraje** | AGREGAR | m² del local |
| **Proyecto** | Mantener | Nombre proyecto |
| **Titular** | Mantener | Nombre cliente |
| **DNI** | Mantener | Documento |
| **Vendedor** | MODIFICAR → **Equipo** | Todos los asesores + jefatura en 1 columna |
| **Jefe** | ELIMINAR | Se fusiona en Equipo |
| **Caseta** | ELIMINAR | Ya no se usa |
| **USD / PEN** | MODIFICAR | Fusionar en **Abonado** (mostrar moneda) |
| **Precio** | AGREGAR | Precio de venta del local |
| **Estado** | AGREGAR | CANCELADO (precio=abonado) o PENDIENTE |
| **Fecha** | ELIMINAR | Se reemplaza por F.Separación |
| **Nuevo Abono** | ELIMINAR | Ya no necesario |
| **Contrato** | AGREGAR | ✅ + fecha firma o ❌ |
| **Ver** | Mantener | Botón ver ficha |

### Implementación

#### 4.1 Migración BD - Campos contrato
```sql
-- migrations/029_campos_contrato.sql

ALTER TABLE clientes_ficha
ADD COLUMN IF NOT EXISTS contrato_firmado BOOLEAN DEFAULT false;

ALTER TABLE clientes_ficha
ADD COLUMN IF NOT EXISTS contrato_fecha_firma DATE;

ALTER TABLE clientes_ficha
ADD COLUMN IF NOT EXISTS contrato_url TEXT;

ALTER TABLE clientes_ficha
ADD COLUMN IF NOT EXISTS contrato_subido_por UUID REFERENCES usuarios(id);

ALTER TABLE clientes_ficha
ADD COLUMN IF NOT EXISTS contrato_subido_at TIMESTAMPTZ;
```

#### 4.2 Actualizar Query
**Archivo:** `lib/actions-fichas-reporte.ts`

Agregar al `FichaReporteRow`:
```typescript
interface FichaReporteRow {
  // Existentes...

  // NUEVOS
  fecha_separacion: string | null;      // MIN(fecha) de abonos
  local_metraje: number;                // locales.metraje
  precio_venta: number;                 // locales.monto_venta o precio_base
  estado_pago: 'CANCELADO' | 'PENDIENTE';

  // Contrato
  contrato_firmado: boolean;
  contrato_fecha_firma: string | null;

  // Asesores (array)
  asesores: {
    nombre: string;
    rol: 'asesor_1' | 'asesor_2' | 'asesor_3' | 'jefatura';
  }[];
}
```

#### 4.3 Componente EquipoVentaCell
```tsx
// components/reporteria/EquipoVentaCell.tsx

export function EquipoVentaCell({ asesores }: { asesores: Asesor[] }) {
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      {asesores.map(a => (
        <div key={a.rol} className="flex items-center gap-1">
          <span className="text-gray-700">{a.nombre}</span>
          <span className={`px-1 rounded text-[10px] ${
            a.rol === 'jefatura'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {a.rol === 'jefatura' ? 'Jef' : 'Ases'}
          </span>
        </div>
      ))}
    </div>
  );
}
```

#### 4.4 Componente EstadoPagoCell
```tsx
// components/reporteria/EstadoPagoCell.tsx

export function EstadoPagoCell({ precio, abonado }: { precio: number; abonado: number }) {
  const cancelado = abonado >= precio;
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${
      cancelado
        ? 'bg-green-100 text-green-700'
        : 'bg-yellow-100 text-yellow-700'
    }`}>
      {cancelado ? 'CANCELADO' : 'PENDIENTE'}
    </span>
  );
}
```

#### 4.5 Componente ContratoCell
```tsx
// components/reporteria/ContratoCell.tsx

export function ContratoCell({ firmado, fecha }: { firmado: boolean; fecha?: string }) {
  if (!firmado) {
    return <XCircle className="w-4 h-4 text-gray-400" />;
  }
  return (
    <div className="flex items-center gap-1">
      <CheckCircle className="w-4 h-4 text-green-500" />
      <span className="text-xs text-gray-600">{fecha}</span>
    </div>
  );
}
```

### Entregables Módulo 4
| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `migrations/029_campos_contrato.sql` | Campos contrato |
| 2 | `lib/actions-fichas-reporte.ts` | Query actualizada |
| 3 | `EquipoVentaCell.tsx` | Componente asesores |
| 4 | `EstadoPagoCell.tsx` | Componente estado |
| 5 | `ContratoCell.tsx` | Componente contrato |
| 6 | `FichasInscripcionTab.tsx` | Nuevo layout tabla |

---

## DÓNDE SE MUESTRA CADA COSA

| Dato | Gestión Locales | Reporte Diario | Fichas Inscripción |
|------|-----------------|----------------|-------------------|
| Equipo de venta (asesores) | ✅ En ficha | ✅ Columna | ✅ Columna |
| Jefatura | ✅ En ficha | ✅ Columna | ✅ Columna |
| Fecha separación | - | - | ✅ Columna |
| Metraje | ✅ Ya existe | - | ✅ Columna |
| Precio venta | ✅ Ya existe | - | ✅ Columna |
| Estado (CANCELADO/PENDIENTE) | - | - | ✅ Columna |
| Contrato firmado | ✅ En ficha | - | ✅ Columna |
| N° Op. Banco (OCR) | - | ✅ En validación | - |
| N° Boleta (OCR) | - | ✅ En vincular | - |

---

## MIGRACIONES SQL CONSOLIDADAS

```sql
-- ========================================
-- 026_validacion_movimiento_bancario.sql
-- ========================================
ALTER TABLE depositos_ficha ADD COLUMN IF NOT EXISTS imagen_movimiento_bancario_url TEXT;
ALTER TABLE depositos_ficha ADD COLUMN IF NOT EXISTS numero_operacion_banco VARCHAR(100);
ALTER TABLE depositos_ficha ADD COLUMN IF NOT EXISTS numero_operacion_banco_editado BOOLEAN DEFAULT false;
ALTER TABLE depositos_ficha ADD COLUMN IF NOT EXISTS numero_operacion_banco_confianza INTEGER;

-- ========================================
-- 027_boleta_ocr.sql
-- ========================================
ALTER TABLE depositos_ficha ADD COLUMN IF NOT EXISTS boleta_imagen_url TEXT;
ALTER TABLE depositos_ficha ADD COLUMN IF NOT EXISTS numero_boleta_editado BOOLEAN DEFAULT false;
ALTER TABLE depositos_ficha ADD COLUMN IF NOT EXISTS numero_boleta_confianza INTEGER;

-- ========================================
-- 028_asesores_ficha.sql
-- ========================================
CREATE TABLE IF NOT EXISTS asesores_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID NOT NULL REFERENCES clientes_ficha(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('asesor_1', 'asesor_2', 'asesor_3', 'jefatura')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ficha_id, rol)
);

CREATE INDEX IF NOT EXISTS idx_asesores_ficha_ficha ON asesores_ficha(ficha_id);
CREATE INDEX IF NOT EXISTS idx_asesores_ficha_usuario ON asesores_ficha(usuario_id);

ALTER TABLE asesores_ficha ENABLE ROW LEVEL SECURITY;

-- Migrar vendedor_id existente a asesor_1
INSERT INTO asesores_ficha (ficha_id, usuario_id, rol)
SELECT id, vendedor_id, 'asesor_1'
FROM clientes_ficha
WHERE vendedor_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ========================================
-- 029_campos_contrato.sql
-- ========================================
ALTER TABLE clientes_ficha ADD COLUMN IF NOT EXISTS contrato_firmado BOOLEAN DEFAULT false;
ALTER TABLE clientes_ficha ADD COLUMN IF NOT EXISTS contrato_fecha_firma DATE;
ALTER TABLE clientes_ficha ADD COLUMN IF NOT EXISTS contrato_url TEXT;
ALTER TABLE clientes_ficha ADD COLUMN IF NOT EXISTS contrato_subido_por UUID REFERENCES usuarios(id);
ALTER TABLE clientes_ficha ADD COLUMN IF NOT EXISTS contrato_subido_at TIMESTAMPTZ;
```

---

## ORDEN DE EJECUCIÓN

```
DÍA 1 - Base de Datos + Backend
═══════════════════════════════════════════════════════════════
□ Ejecutar migración 026 (movimiento bancario)
□ Ejecutar migración 027 (boleta OCR)
□ Ejecutar migración 028 (asesores_ficha)
□ Ejecutar migración 029 (campos contrato)
□ Crear lib/actions-asesores-ficha.ts
□ Actualizar lib/actions-ocr.ts (extractBoletaData)
□ Actualizar lib/actions-depositos-ficha.ts
□ Actualizar lib/actions-fichas-reporte.ts

DÍA 2 - Frontend Módulos 1 y 2
═══════════════════════════════════════════════════════════════
□ Crear/Actualizar ValidarDepositoModal.tsx
□ Actualizar VincularBoletaModal.tsx
□ Integrar en ReporteDiarioTab.tsx

DÍA 3 - Frontend Módulos 3 y 4
═══════════════════════════════════════════════════════════════
□ Actualizar FichaInscripcionModal.tsx (equipo venta)
□ Crear EquipoVentaCell.tsx
□ Crear EstadoPagoCell.tsx
□ Crear ContratoCell.tsx
□ Refactorizar FichasInscripcionTab.tsx

DÍA 4 - Testing
═══════════════════════════════════════════════════════════════
□ Probar OCR movimiento bancario
□ Probar OCR boleta
□ Probar agregar múltiples asesores
□ Verificar nuevo layout de columnas
□ Testing con Playwright
```

---

## ESTIMACIÓN REVISADA

| Módulo | Horas |
|--------|-------|
| Módulo 1: OCR Movimiento Bancario | 4-5h |
| Módulo 2: OCR Boleta | 3-4h |
| Módulo 3: Múltiples Asesores | 4-5h |
| Módulo 4: Columnas Reporte | 3-4h |
| Testing | 2h |
| **TOTAL** | **16-20h** |

---

## RESUMEN VISUAL

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REPORTERÍA                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ REPORTE DIARIO                                                      │   │
│  │                                                                     │   │
│  │  [Validar] → Popup con:                                             │   │
│  │              • Subir imagen movimiento bancario                     │   │
│  │              • OCR lee N° operación                                 │   │
│  │              • Editable si falla                                    │   │
│  │                                                                     │   │
│  │  [Vincular Boleta] → Popup con:                                     │   │
│  │              • Subir imagen boleta                                  │   │
│  │              • OCR lee N° boleta                                    │   │
│  │              • Editable si falla                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ FICHAS INSCRIPCIÓN                                                  │   │
│  │                                                                     │   │
│  │  NUEVAS COLUMNAS:                                                   │   │
│  │  • F.Separación (fecha primer abono)                                │   │
│  │  • Metraje                                                          │   │
│  │  • Equipo (asesores + jefatura)                                     │   │
│  │  • Precio                                                           │   │
│  │  • Estado (CANCELADO/PENDIENTE)                                     │   │
│  │  • Contrato (✅/❌ + fecha)                                          │   │
│  │                                                                     │   │
│  │  ELIMINAR: Caseta, Nuevo Abono, columnas separadas Jefe/Vendedor    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         GESTIÓN DE LOCALES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ FICHA DE INSCRIPCIÓN                                                │   │
│  │                                                                     │   │
│  │  NUEVA SECCIÓN "EQUIPO DE VENTA":                                   │   │
│  │  • Asesor 1 (principal) *                                           │   │
│  │  • Asesor 2 (opcional)                                              │   │
│  │  • Asesor 3 (opcional)                                              │   │
│  │  • Jefatura *                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

**¿Apruebas este plan V2?**
