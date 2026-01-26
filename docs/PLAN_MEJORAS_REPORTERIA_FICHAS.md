# PLAN: Mejoras Reportería y Fichas de Inscripción

**Fecha:** 26 Enero 2026
**Solicitado por:** Finanzas
**Sesión:** 108

---

## RESUMEN EJECUTIVO

3 módulos de mejora solicitados:

| # | Módulo | Complejidad | Impacto |
|---|--------|-------------|---------|
| 1 | Validación Pagos con OCR | Alta | Crítico |
| 2 | Múltiples Asesores en Ficha | Media | Alto |
| 3 | Columnas Reporte Fichas | Baja | Alto |

---

## MÓDULO 1: VALIDACIÓN DE PAGOS CON OCR

### Contexto Actual
- ✅ OCR con GPT-4 Vision **YA EXISTE** (`lib/actions-ocr.ts`)
- ✅ Extrae: monto, moneda, fecha, banco, **número operación**
- ✅ Tabla `depositos_ficha` **YA TIENE** campo `numero_operacion`
- ✅ Tabla `depositos_ficha` **YA TIENE** campo `imagen_url`
- ❌ NO hay UI para adjuntar imagen en Reporte Diario
- ❌ NO hay edición de número operación post-OCR
- ❌ NO hay lectura de número de boleta desde imagen

### Requerimiento
```
1. Permitir adjuntar imagen (captura movimiento bancario)
2. IA lee número de operación → mostrar y guardar
3. Permitir editar si IA se equivoca
4. IA lee número de boleta → permitir editar y guardar
```

### Plan de Implementación

#### 1.1 Migración BD - Nuevos campos
```sql
-- Agregar campos para boleta extraída por OCR
ALTER TABLE depositos_ficha ADD COLUMN IF NOT EXISTS
  numero_boleta_ocr VARCHAR(50);  -- Boleta extraída por OCR

ALTER TABLE depositos_ficha ADD COLUMN IF NOT EXISTS
  numero_operacion_editado BOOLEAN DEFAULT false;  -- Flag si fue editado manualmente

ALTER TABLE depositos_ficha ADD COLUMN IF NOT EXISTS
  numero_boleta_editado BOOLEAN DEFAULT false;  -- Flag si fue editado manualmente

-- Para guardar imagen del movimiento bancario (adicional al voucher)
ALTER TABLE depositos_ficha ADD COLUMN IF NOT EXISTS
  imagen_movimiento_url TEXT;  -- Captura del movimiento bancario
```

#### 1.2 Actualizar OCR - Extraer número boleta
**Archivo:** `lib/actions-ocr.ts`

```typescript
// Agregar al prompt de extractVoucherData():
// - numero_boleta: número de boleta/factura visible en el comprobante
```

#### 1.3 Nuevo Componente - AdjuntarMovimientoBancario
**Archivo:** `components/reporteria/AdjuntarMovimientoBancarioModal.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  Adjuntar Movimiento Bancario                           [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [📷 Subir imagen del movimiento bancario]                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Preview de imagen                                   │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│  Datos extraídos por IA:                                    │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  Número Operación: [804263________] ✏️ (editable)          │
│  Confianza OCR:    ████████░░ 85%                          │
│                                                             │
│  Número Boleta:    [B001-00045____] ✏️ (editable)          │
│  Confianza OCR:    ██████░░░░ 60%                          │
│                                                             │
│  ───────────────────────────────────────────────────────   │
│  ⚠️ Si los valores son incorrectos, puede editarlos        │
│  ───────────────────────────────────────────────────────   │
│                                                             │
│           [Cancelar]              [💾 Guardar]              │
└─────────────────────────────────────────────────────────────┘
```

**Funcionalidad:**
1. Upload de imagen → Supabase Storage
2. Llamar `extractVoucherData()` para OCR
3. Mostrar número operación + boleta extraídos
4. Permitir edición manual
5. Guardar en `depositos_ficha` con flags de edición

#### 1.4 Integrar en ReporteDiarioTab
**Archivo:** `components/reporteria/ReporteDiarioTab.tsx`

- Agregar botón "📎 Adjuntar" en cada fila
- Al hacer click, abrir `AdjuntarMovimientoBancarioModal`
- Mostrar ícono 🖼️ si ya tiene imagen adjunta
- Mostrar número operación y boleta en columnas (ya existen)

#### 1.5 Server Action - Guardar datos editados
**Archivo:** `lib/actions-depositos-ficha.ts`

```typescript
export async function adjuntarMovimientoBancario(
  depositoId: string,
  imagenUrl: string,
  numeroOperacion: string,
  numeroBoleta: string,
  fueEditadoOperacion: boolean,
  fueEditadoBoleta: boolean
): Promise<{ success: boolean; message: string }>
```

### Entregables Módulo 1
| # | Entregable | Tipo |
|---|------------|------|
| 1 | `migrations/026_campos_ocr_boleta.sql` | SQL |
| 2 | `lib/actions-ocr.ts` (actualizar prompt) | Backend |
| 3 | `AdjuntarMovimientoBancarioModal.tsx` | Frontend |
| 4 | `lib/actions-depositos-ficha.ts` (nueva función) | Backend |
| 5 | `ReporteDiarioTab.tsx` (integrar botón) | Frontend |

---

## MÓDULO 2: MÚLTIPLES ASESORES EN FICHA

### Contexto Actual
- ✅ Tabla `clientes_ficha` tiene `vendedor_id` (1 solo)
- ✅ UI muestra vendedor, jefe_ventas, caseta
- ❌ NO soporta múltiples asesores (máx 3)
- ❌ NO indica si asesores son de otros proyectos

### Requerimiento
```
1. Agregar hasta 3 asesores que participaron en la venta
2. Agregar jefatura correspondiente
3. Saber si intervienen de otros proyectos
4. Mostrar en: Gestión de Locales, Reporte Diario, Reporte Fichas
```

### Plan de Implementación

#### 2.1 Migración BD - Tabla asesores_ficha
```sql
-- Nueva tabla para asesores participantes (máximo 3)
CREATE TABLE asesores_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID NOT NULL REFERENCES clientes_ficha(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('asesor_principal', 'asesor_2', 'asesor_3', 'jefatura')),
  proyecto_origen_id UUID REFERENCES proyectos(id),  -- Proyecto original del asesor
  es_externo BOOLEAN DEFAULT false,  -- true si es de otro proyecto
  porcentaje_comision NUMERIC(5,2),  -- Porcentaje de comisión (opcional)
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(ficha_id, rol)  -- Solo 1 por rol
);

-- Índices
CREATE INDEX idx_asesores_ficha_ficha ON asesores_ficha(ficha_id);
CREATE INDEX idx_asesores_ficha_usuario ON asesores_ficha(usuario_id);

-- RLS
ALTER TABLE asesores_ficha ENABLE ROW LEVEL SECURITY;
```

#### 2.2 Actualizar FichaInscripcionModal
**Archivo:** `components/locales/FichaInscripcionModal.tsx`

Agregar sección:

```
═══════════════════════════════════════════════════════════════
EQUIPO DE VENTA
═══════════════════════════════════════════════════════════════

Asesor Principal *:  [▼ Seleccionar asesor________]
                     ☑️ Es de otro proyecto  [▼ Proyecto origen]

Asesor 2 (opcional): [▼ Seleccionar asesor________]
                     ☑️ Es de otro proyecto  [▼ Proyecto origen]

Asesor 3 (opcional): [▼ Seleccionar asesor________]
                     ☑️ Es de otro proyecto  [▼ Proyecto origen]

Jefatura:            [▼ Seleccionar jefe ventas___]
                     ☑️ Es de otro proyecto  [▼ Proyecto origen]

───────────────────────────────────────────────────────────────
ℹ️ Indique todos los asesores que participaron en esta venta
───────────────────────────────────────────────────────────────
```

#### 2.3 Server Actions - CRUD asesores
**Archivo:** `lib/actions-asesores-ficha.ts` (nuevo)

```typescript
// Obtener asesores de una ficha
export async function getAsesoresFicha(fichaId: string): Promise<AsesorFicha[]>

// Guardar/actualizar asesores de una ficha
export async function saveAsesoresFicha(
  fichaId: string,
  asesores: {
    rol: 'asesor_principal' | 'asesor_2' | 'asesor_3' | 'jefatura';
    usuario_id: string;
    es_externo: boolean;
    proyecto_origen_id?: string;
  }[]
): Promise<{ success: boolean }>
```

#### 2.4 Actualizar Queries de Reportes

**En `getFichasParaReportePaginado()`:**
```typescript
// Agregar JOIN con asesores_ficha
// Retornar array de asesores con sus datos
asesores: [
  { nombre: "Juan Pérez", rol: "asesor_principal", es_externo: false },
  { nombre: "María López", rol: "asesor_2", es_externo: true, proyecto_origen: "Wilson" },
  { nombre: "Carlos Jefe", rol: "jefatura", es_externo: false }
]
```

**En `getAbonosDiarios()`:**
```typescript
// Agregar asesores al resultado
asesores: AsesorFicha[]
```

#### 2.5 Actualizar UIs

| Componente | Cambio |
|------------|--------|
| `FichaInscripcionModal.tsx` | Agregar selector de asesores |
| `FichasInscripcionTab.tsx` | Mostrar asesores en columna |
| `ReporteDiarioTab.tsx` | Mostrar asesores en columna |
| `LocalesTable.tsx` | Mostrar asesores al ver ficha |

### Entregables Módulo 2
| # | Entregable | Tipo |
|---|------------|------|
| 1 | `migrations/027_asesores_ficha.sql` | SQL |
| 2 | `lib/actions-asesores-ficha.ts` | Backend |
| 3 | `FichaInscripcionModal.tsx` (sección equipo) | Frontend |
| 4 | `lib/actions-fichas-reporte.ts` (actualizar queries) | Backend |
| 5 | `FichasInscripcionTab.tsx` (columna asesores) | Frontend |
| 6 | `ReporteDiarioTab.tsx` (columna asesores) | Frontend |

---

## MÓDULO 3: COLUMNAS REPORTE FICHAS DE INSCRIPCIÓN

### Contexto Actual
Columnas actuales de `FichasInscripcionTab.tsx`:
```
# | Local | Proyecto | Titular | Documento | Vendedor | Jefe | Caseta | Monto USD | Monto PEN | Fecha | Nuevo Abono | Ver
```

### Requerimiento
```
ELIMINAR:
- Caseta
- Nuevo Abono

AGREGAR:
- Fecha separación (primer abono) → entre # y Local
- Metraje del local → después de Local
- Precio venta
- Firma contrato (sí/no) + fecha firma
- Columna CANCELADO/PENDIENTE

MODIFICAR:
- Vendedor → mostrar todos los asesores + jefatura en 1 columna
```

### Plan de Implementación

#### 3.1 Migración BD - Campos contrato
```sql
-- Campos para firma de contrato en clientes_ficha
ALTER TABLE clientes_ficha ADD COLUMN IF NOT EXISTS
  contrato_firmado BOOLEAN DEFAULT false;

ALTER TABLE clientes_ficha ADD COLUMN IF NOT EXISTS
  contrato_fecha_firma DATE;

ALTER TABLE clientes_ficha ADD COLUMN IF NOT EXISTS
  contrato_url TEXT;  -- URL del contrato escaneado

ALTER TABLE clientes_ficha ADD COLUMN IF NOT EXISTS
  contrato_subido_por UUID REFERENCES usuarios(id);

ALTER TABLE clientes_ficha ADD COLUMN IF NOT EXISTS
  contrato_subido_at TIMESTAMPTZ;
```

#### 3.2 Actualizar Query `getFichasParaReportePaginado()`

Agregar campos al resultado:

```typescript
interface FichaReporteRow {
  // ... campos existentes ...

  // NUEVOS CAMPOS
  fecha_separacion: string | null;     // Fecha del primer abono
  local_metraje: number;               // Metraje del local
  precio_venta: number;                // Precio de venta del local
  total_abonado: number;               // Suma de abonos
  estado_pago: 'CANCELADO' | 'PENDIENTE';  // Calculado: precio == abonado

  // Contrato
  contrato_firmado: boolean;
  contrato_fecha_firma: string | null;
  contrato_url: string | null;

  // Asesores (del módulo 2)
  asesores: {
    nombre: string;
    rol: string;
    es_externo: boolean;
    proyecto_origen?: string;
  }[];
  jefatura: {
    nombre: string;
    es_externo: boolean;
    proyecto_origen?: string;
  } | null;
}
```

#### 3.3 Nuevo Layout de Columnas

```
NUEVO ORDEN DE COLUMNAS:
═══════════════════════════════════════════════════════════════════════════════════════════

#  │ F.Separación │ Local │ Metraje │ Proyecto │ Titular │ DNI │ Equipo Venta │ Precio │ Abonado │ Estado │ Contrato │ Ver
───┼──────────────┼───────┼─────────┼──────────┼─────────┼─────┼──────────────┼────────┼─────────┼────────┼──────────┼─────
1  │ 20-Ene-2026  │ A-107 │ 6.00 m² │ Wilson   │ Juan P. │ 123 │ María (Ases) │ $15,000│ $15,000 │CANCELADO│ ✅ 25-Ene│ 👁️
   │              │       │         │          │         │     │ Carlos (Jef) │        │         │        │          │
───┼──────────────┼───────┼─────────┼──────────┼─────────┼─────┼──────────────┼────────┼─────────┼────────┼──────────┼─────
2  │ 19-Ene-2026  │ B-205 │ 8.50 m² │ Wilson   │ Ana G.  │ 456 │ Pedro (Ases) │ $20,000│ $5,000  │PENDIENTE│ ❌       │ 👁️
   │              │       │         │          │         │     │ Luis (Ases)  │        │         │        │          │
   │              │       │         │          │         │     │ ⚠️ Ext: Lima │        │         │        │          │

═══════════════════════════════════════════════════════════════════════════════════════════
```

#### 3.4 Componente Equipo Venta (Cell)

**Nuevo componente:** `EquipoVentaCell.tsx`

```tsx
// Muestra asesores + jefatura en formato compacto
// Con indicador si es externo (de otro proyecto)

<div className="flex flex-col gap-0.5 text-xs">
  {asesores.map(a => (
    <div key={a.rol} className="flex items-center gap-1">
      <span className={a.es_externo ? 'text-orange-600' : 'text-gray-700'}>
        {a.nombre}
      </span>
      <Badge size="xs" color={a.rol === 'jefatura' ? 'purple' : 'blue'}>
        {a.rol === 'jefatura' ? 'Jef' : 'Ases'}
      </Badge>
      {a.es_externo && (
        <span className="text-orange-500 text-[10px]">
          ⚠️ {a.proyecto_origen}
        </span>
      )}
    </div>
  ))}
</div>
```

#### 3.5 Componente Estado Pago (Cell)

```tsx
// CANCELADO = verde, PENDIENTE = amarillo
<Badge color={estado === 'CANCELADO' ? 'green' : 'yellow'}>
  {estado}
</Badge>
```

#### 3.6 Componente Contrato (Cell)

```tsx
// Muestra estado de contrato con fecha
{contrato_firmado ? (
  <div className="flex items-center gap-1">
    <CheckCircle className="w-4 h-4 text-green-500" />
    <span className="text-xs">{fecha_firma}</span>
    {contrato_url && <Download className="w-3 h-3 cursor-pointer" />}
  </div>
) : (
  <XCircle className="w-4 h-4 text-gray-400" />
)}
```

### Entregables Módulo 3
| # | Entregable | Tipo |
|---|------------|------|
| 1 | `migrations/028_campos_contrato_ficha.sql` | SQL |
| 2 | `lib/actions-fichas-reporte.ts` (actualizar query) | Backend |
| 3 | `EquipoVentaCell.tsx` | Frontend |
| 4 | `EstadoPagoCell.tsx` | Frontend |
| 5 | `ContratoCell.tsx` | Frontend |
| 6 | `FichasInscripcionTab.tsx` (nuevo layout) | Frontend |

---

## RESUMEN DE MIGRACIONES SQL

```sql
-- migrations/026_campos_ocr_boleta.sql
ALTER TABLE depositos_ficha ADD COLUMN numero_boleta_ocr VARCHAR(50);
ALTER TABLE depositos_ficha ADD COLUMN numero_operacion_editado BOOLEAN DEFAULT false;
ALTER TABLE depositos_ficha ADD COLUMN numero_boleta_editado BOOLEAN DEFAULT false;
ALTER TABLE depositos_ficha ADD COLUMN imagen_movimiento_url TEXT;

-- migrations/027_asesores_ficha.sql
CREATE TABLE asesores_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID NOT NULL REFERENCES clientes_ficha(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('asesor_principal', 'asesor_2', 'asesor_3', 'jefatura')),
  proyecto_origen_id UUID REFERENCES proyectos(id),
  es_externo BOOLEAN DEFAULT false,
  porcentaje_comision NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ficha_id, rol)
);
CREATE INDEX idx_asesores_ficha_ficha ON asesores_ficha(ficha_id);
ALTER TABLE asesores_ficha ENABLE ROW LEVEL SECURITY;

-- migrations/028_campos_contrato_ficha.sql
ALTER TABLE clientes_ficha ADD COLUMN contrato_firmado BOOLEAN DEFAULT false;
ALTER TABLE clientes_ficha ADD COLUMN contrato_fecha_firma DATE;
ALTER TABLE clientes_ficha ADD COLUMN contrato_url TEXT;
ALTER TABLE clientes_ficha ADD COLUMN contrato_subido_por UUID REFERENCES usuarios(id);
ALTER TABLE clientes_ficha ADD COLUMN contrato_subido_at TIMESTAMPTZ;
```

---

## ORDEN DE EJECUCIÓN

### Fase 1: Base de Datos (Día 1)
1. ✅ Ejecutar migración 026 (OCR boleta)
2. ✅ Ejecutar migración 027 (asesores_ficha)
3. ✅ Ejecutar migración 028 (contrato)

### Fase 2: Backend (Día 1-2)
4. ✅ Actualizar `lib/actions-ocr.ts` (extraer boleta)
5. ✅ Crear `lib/actions-asesores-ficha.ts`
6. ✅ Actualizar `lib/actions-depositos-ficha.ts`
7. ✅ Actualizar `lib/actions-fichas-reporte.ts`

### Fase 3: Frontend - Módulo 1 (Día 2)
8. ✅ Crear `AdjuntarMovimientoBancarioModal.tsx`
9. ✅ Integrar en `ReporteDiarioTab.tsx`

### Fase 4: Frontend - Módulo 2 (Día 2-3)
10. ✅ Actualizar `FichaInscripcionModal.tsx` (equipo venta)
11. ✅ Crear `EquipoVentaCell.tsx`

### Fase 5: Frontend - Módulo 3 (Día 3)
12. ✅ Crear `EstadoPagoCell.tsx`
13. ✅ Crear `ContratoCell.tsx`
14. ✅ Refactorizar `FichasInscripcionTab.tsx`

### Fase 6: Testing (Día 4)
15. ✅ Probar flujo completo con Playwright
16. ✅ Verificar con datos reales

---

## PREGUNTAS DE CLARIFICACIÓN

Antes de implementar, necesito confirmar:

### Módulo 1 - OCR
1. ¿El "movimiento bancario" es diferente al voucher que ya suben? ¿O es el mismo?
2. ¿El número de boleta viene en el voucher o en otro documento?

### Módulo 2 - Asesores
1. ¿Los asesores se asignan al crear la ficha o pueden agregarse después?
2. ¿Se requiere calcular comisiones por asesor?
3. ¿Quién puede modificar los asesores asignados?

### Módulo 3 - Columnas
1. ¿"Fecha separación" = fecha del primer abono o fecha de creación de la ficha?
2. ¿"Precio venta" viene del local (`monto_venta`) o de la ficha?
3. ¿Quién sube el contrato firmado? ¿Legal o Finanzas?
4. ¿El contrato es un solo PDF o pueden ser varios archivos?

---

## RIESGOS Y MITIGACIONES

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| OCR no lee boleta correctamente | Medio | Permitir edición manual siempre |
| Migración rompe fichas existentes | Alto | Usar ADD COLUMN IF NOT EXISTS |
| Performance con JOINs adicionales | Medio | Índices optimizados + lazy loading |
| Conflicto con fichas sin asesores | Medio | Migrar vendedor_id existente a asesor_principal |

---

## ESTIMACIÓN

| Módulo | Complejidad | Estimación |
|--------|-------------|------------|
| Módulo 1: OCR Validación | Alta | 6-8 horas |
| Módulo 2: Múltiples Asesores | Media | 4-6 horas |
| Módulo 3: Columnas Reporte | Baja | 3-4 horas |
| Testing E2E | - | 2-3 horas |
| **TOTAL** | - | **15-21 horas** |

---

## SIGUIENTE PASO

¿Apruebas este plan? Si hay algo que ajustar o aclarar, indícamelo antes de comenzar la implementación.
