# Componentes Wizard de Terrenos - Módulo Expansión

## Descripción

Sistema de registro de terrenos para corredores externos usando un wizard de 5 pasos.

## Arquitectura

```
components/expansion/terrenos/
├── WizardTerreno.tsx           # Componente principal del wizard
├── PasoUbicacion.tsx           # Paso 1: Ubicación del terreno
├── PasoCaracteristicas.tsx     # Paso 2: Características físicas
├── PasoDocumentacion.tsx       # Paso 3: Documentación legal
├── PasoValorizacion.tsx        # Paso 4: Precio y urgencia
├── PasoMultimedia.tsx          # Paso 5: Fotos, videos, planos
├── TerrenoCard.tsx             # Card para lista de terrenos
└── index.ts                     # Exports
```

## Componentes

### 1. WizardTerreno (Principal)

Componente orquestador del wizard.

**Props:**
```typescript
interface WizardTerrenoProps {
  terrenoId?: string;                          // ID si es edición
  datosIniciales?: Partial<TerrenoCreateInput>; // Datos precargados
}
```

**Features:**
- Progress bar visual con 5 pasos
- Navegación Anterior/Siguiente
- Validación por paso
- Guardar borrador en cualquier momento
- Enviar para revisión al final
- Estado local del wizard

**Uso:**
```tsx
import { WizardTerreno } from '@/components/expansion/terrenos';

// Nuevo terreno
<WizardTerreno />

// Editar terreno
<WizardTerreno terrenoId="123" datosIniciales={terreno} />
```

### 2. PasoUbicacion

**Features:**
- Selects cascada: Departamento → Provincia → Distrito
- Carga dinámica desde `ubigeo_peru`
- Input dirección y referencia
- Inputs para coordenadas GPS (opcional)
- Placeholder para mapa interactivo

**Validación:**
- Departamento (requerido)
- Provincia (requerido)
- Distrito (requerido)
- Dirección (requerido)

### 3. PasoCaracteristicas

**Features:**
- Área total (m²) - requerido
- Área construida (m²) - opcional
- Frente y fondo (metros lineales)
- Select tipo de terreno (urbano, rural, eriaza, agrícola, industrial)
- Input zonificación
- Input uso actual
- Checkboxes servicios: agua, luz, desagüe, internet, acceso pavimentado

**Validación:**
- Área total > 0 (requerido)
- Tipo de terreno (requerido)

### 4. PasoDocumentacion

**Features:**
- Select tipo de propiedad (inscrito, posesión, herencia, comunidad, otro)
- Input partida registral
- Checkbox "tiene cargas" con textarea condicional
- Sección propietario:
  - Nombre
  - DNI
  - Teléfono
- Checkbox "Soy el propietario"

**Validación:**
- Todos los campos son opcionales

### 5. PasoValorizacion

**Features:**
- Input precio solicitado
- Select moneda (USD/PEN)
- Checkbox precio negociable (default: true)
- Input tasación referencial (opcional)
- Input fuente tasación
- Select urgencia de venta
- Indicador precio por m² (calculado)

**Validación:**
- Moneda (requerido)

### 6. PasoMultimedia

**Features:**
- Upload múltiple de fotos (REQUERIDO)
- Upload videos (opcional)
- Upload planos (opcional)
- Upload documentos adicionales (opcional)
- Preview de archivos subidos
- Botón eliminar por archivo
- Estados de loading por tipo

**Validación:**
- Al menos 1 foto (requerido para enviar)

**Tipos de archivo:**
- Fotos: PNG, JPG, WebP (máx. 5MB)
- Videos: MP4, MOV (máx. 50MB)
- Planos: PDF, PNG, JPG (máx. 10MB)
- Documentos: PDF, DOC, DOCX, PNG, JPG (máx. 10MB)

### 7. TerrenoCard

Card para mostrar terreno en lista.

**Props:**
```typescript
interface TerrenoCardProps {
  terreno: Terreno;
}
```

**Features:**
- Badge de estado con colores
- Ubicación completa
- Área total y tipo
- Precio (si disponible)
- Fecha de creación
- Botón contextual:
  - "Continuar Edición" si es borrador/info_adicional
  - "Ver Detalle" si ya fue enviado

## Flujo de Uso

### Crear Nuevo Terreno

1. Usuario accede al wizard
2. Completa paso 1 (Ubicación) → Valida → Guarda borrador automáticamente → Siguiente
3. Completa paso 2 (Características) → Valida → Guarda → Siguiente
4. Completa paso 3 (Documentación) → Guarda → Siguiente
5. Completa paso 4 (Valorización) → Guarda → Siguiente
6. Completa paso 5 (Multimedia) → Valida fotos → Guarda
7. Click "Enviar para Revisión" → Valida todos los pasos → Cambia estado a "enviado"

### Editar Borrador

1. Usuario ve lista de terrenos
2. Click en terreno con estado "borrador"
3. Se abre wizard con datos precargados
4. Puede navegar entre pasos y editar
5. Guardar borrador en cualquier momento
6. Enviar cuando esté listo

## Server Actions Usadas

```typescript
// Crear/Actualizar
crearTerreno(input: Partial<TerrenoCreateInput>): Promise<ExpansionActionResult>
actualizarTerreno(terreno_id: string, datos: Partial<TerrenoCreateInput>): Promise<ExpansionActionResult>

// Enviar
enviarTerreno(terreno_id: string): Promise<ExpansionActionResult>

// Listar
getMisTerrenos(): Promise<ExpansionActionResult>

// Ubigeo
getDepartamentos(): Promise<ExpansionActionResult>
getProvincias(departamento: string): Promise<ExpansionActionResult>
getDistritos(departamento: string, provincia: string): Promise<ExpansionActionResult>
```

## Tipos TypeScript

```typescript
import type {
  TerrenoCreateInput,
  TerrenoTipo,
  TerrenoPropiedad,
  TerrenoMoneda,
  TerrenoUrgencia,
  Terreno,
} from '@/lib/types/expansion';

import {
  WIZARD_STEPS,
  TIPO_TERRENO_LABELS,
  TIPO_PROPIEDAD_LABELS,
  URGENCIA_LABELS,
  TERRENO_ESTADO_LABELS,
  TERRENO_ESTADO_COLORS,
} from '@/lib/types/expansion';
```

## Estilos

- Colores EcoPlaza:
  - Verde primario: `#1b967a`
  - Azul navy: `#192c4d`
  - Amarillo: `#fbde17` (no usado aquí)
- Inputs con `onWheel={(e) => e.currentTarget.blur()}` para números
- Responsive: grid cols-1 md:cols-2 lg:cols-3
- Tailwind CSS
- Estados hover/focus con ring-[#1b967a]

## Estados del Terreno

```
borrador → enviado → en_revision → evaluacion →
visita_programada → visitado → negociacion → aprobado/rechazado
```

Los corredores solo pueden editar en estados:
- `borrador`
- `info_adicional`

## TODO / Mejoras Futuras

- [ ] Implementar endpoint de upload real `/api/expansion/terrenos/upload`
- [ ] Integrar mapa interactivo (Google Maps / Leaflet)
- [ ] Auto-completar dirección desde coordenadas
- [ ] Validación de DNI con API RENIEC
- [ ] Preview de imágenes antes de subir
- [ ] Compresión de imágenes en frontend
- [ ] OCR para extraer datos de partida registral
- [ ] Geolocalización automática (GPS del dispositivo)

## Notas

- El wizard guarda automáticamente antes de avanzar de paso
- Se puede guardar borrador en cualquier momento sin validar
- Solo se valida estrictamente al enviar para revisión
- Los campos opcionales tienen placeholders informativos
- El estado del wizard es local (no persiste en URL)

## Ejemplo de Integración

```tsx
// app/expansion/terrenos/nuevo/page.tsx
import { WizardTerreno } from '@/components/expansion/terrenos';

export default function NuevoTerrenoPage() {
  return (
    <div className="container mx-auto py-8">
      <WizardTerreno />
    </div>
  );
}
```

```tsx
// app/expansion/terrenos/editar/[id]/page.tsx
import { WizardTerreno } from '@/components/expansion/terrenos';
import { getTerrenoById } from '@/lib/actions-expansion';

export default async function EditarTerrenoPage({ params }: { params: { id: string } }) {
  const result = await getTerrenoById(params.id);

  if (!result.success) {
    return <div>Error: {result.error}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <WizardTerreno terrenoId={params.id} datosIniciales={result.data} />
    </div>
  );
}
```

## Changelog

- **v1.0.0** (17 Enero 2026) - Componentes iniciales del wizard creados
