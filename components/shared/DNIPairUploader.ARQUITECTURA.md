# DNIPairUploader - Arquitectura Visual

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DNIPairUploader                                │
│  Props: localId, tieneConyuge, numeroCopropietarios                     │
│  State: pairs[], expandedFrente, expandedReverso                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ├─ useCallback: processFile()
                                    ├─ useCallback: handleDeleteSide()
                                    ├─ useCallback: handleDeletePair()
                                    ├─ useCallback: handleAddCopropietario()
                                    ├─ useEffect: onPairsChange
                                    └─ useEffect: sync conyuge/copropietarios
                                    │
        ┌───────────────────────────┴──────────────────────────┐
        │                                                       │
        ▼                                                       ▼
┌────────────────┐                                    ┌─────────────────┐
│  DNIPairCard   │                                    │ Boton Agregar   │
│  (TITULAR)     │                                    │ Copropietario   │
│  canDelete:    │                                    └─────────────────┘
│    false       │
└────────────────┘
        │
        ├─ Header (icono User, titulo "TITULAR", boton eliminar disabled)
        │
        ├─ Grid 2 columnas
        │   │
        │   ├───────────────────────────────┬─────────────────────────────────┐
        │   │                               │                                 │
        │   ▼                               ▼                                 │
        │ ┌──────────────────────┐    ┌───────────────────────┐              │
        │ │ DNISideUploadZone    │    │ DNISideUploadZone     │              │
        │ │ lado: "frente"       │    │ lado: "reverso"       │              │
        │ │ color: verde         │    │ color: azul           │              │
        │ └──────────────────────┘    └───────────────────────┘              │
        │   │                               │                                 │
        │   ├─ Titulo "FRENTE"              ├─ Titulo "REVERSO"               │
        │   ├─ Boton X (eliminar)           ├─ Boton X (eliminar)             │
        │   │                               │                                 │
        │   ├─ SI vacio:                    ├─ SI vacio:                      │
        │   │   └─ Dropzone                 │   └─ Dropzone                   │
        │   │       ├─ Icono Upload         │       ├─ Icono Upload           │
        │   │       ├─ "Sube frente"        │       ├─ "Sube reverso"         │
        │   │       └─ Drag & drop         │       └─ Drag & drop            │
        │   │                               │                                 │
        │   ├─ SI imagen:                   ├─ SI imagen:                     │
        │   │   └─ Preview                  │   └─ Preview                    │
        │   │       ├─ <img>                │       ├─ <img>                  │
        │   │       ├─ Badge estado         │       ├─ Badge estado           │
        │   │       ├─ Loading overlay      │       ├─ Loading overlay        │
        │   │       ├─ Hover overlay        │       ├─ Hover overlay          │
        │   │       │   └─ Boton Eye        │       │   └─ Boton Eye          │
        │   │       └─ Modal preview        │       └─ Modal preview          │
        │   │                               │                                 │
        │   └─ Error message (si aplica)    └─ Error message (si aplica)     │
        │                                                                     │
        ├─ PanelDatosFrente (si frente.ocrData existe)                       │
        │   │                                                                 │
        │   ├─ Header expandible                                              │
        │   │   ├─ Icono BadgeCheck                                           │
        │   │   ├─ "Frente DNI - 4/4 campos"                                 │
        │   │   ├─ Confianza: 95%                                             │
        │   │   └─ Chevron Up/Down                                            │
        │   │                                                                 │
        │   └─ SI expanded:                                                   │
        │       ├─ BarraConfianza (95%)                                       │
        │       └─ Grid 2 columnas                                            │
        │           ├─ CampoExtraido: DNI                                     │
        │           ├─ CampoExtraido: Nombres                                 │
        │           ├─ CampoExtraido: Ap. Paterno                             │
        │           ├─ CampoExtraido: Ap. Materno                             │
        │           ├─ CampoExtraido: F. Nacimiento                           │
        │           └─ CampoExtraido: Sexo                                    │
        │                                                                     │
        ├─ PanelDatosReverso (si reverso.ocrData existe)                     │
        │   │                                                                 │
        │   ├─ Header expandible                                              │
        │   │   ├─ Icono MapPin                                               │
        │   │   ├─ "Reverso DNI - 4/4 campos"                                │
        │   │   ├─ Confianza: 90%                                             │
        │   │   └─ Chevron Up/Down                                            │
        │   │                                                                 │
        │   └─ SI expanded:                                                   │
        │       ├─ BarraConfianza (90%)                                       │
        │       └─ Grid 2 columnas                                            │
        │           ├─ CampoExtraido: Departamento                            │
        │           ├─ CampoExtraido: Provincia                               │
        │           ├─ CampoExtraido: Distrito                                │
        │           ├─ CampoExtraido: Direccion                               │
        │           └─ CampoExtraido: Ubigeo (opcional)                       │
        │                                                                     │
        └─ Warning/Success message                                            │
            ├─ SI incompleto: Warning amarillo                                │
            └─ SI completo: Success verde                                     │
```

## Flujo de Datos

```
┌─────────────┐
│   Usuario   │
│  selecciona │
│   imagen    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│  processFile()          │
│  ├─ Validar tipo/size   │
│  ├─ Crear preview local │
│  └─ setState: subiendo  │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│  compressImage()        │
│  (Web Worker)           │
│  max 1MB, 1200px        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│  uploadToStorage()      │
│  Supabase Storage       │
│  bucket: documentos-    │
│         ficha           │
└──────┬──────────────────┘
       │
       ├─ Success ────────┐
       │                  │
       ▼                  ▼
setState: procesando   setState: error
       │
       ▼
┌─────────────────────────┐
│  fileToBase64()         │
│  FileReader API         │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│  runOCR()               │
│  POST /api/ocr/extract  │
│  {                      │
│    image: base64,       │
│    type: "dni" |        │
│          "dni_reverso", │
│    mimeType: "..."      │
│  }                      │
└──────┬──────────────────┘
       │
       ├─ Success ────────┬─ Error
       │                  │
       ▼                  ▼
setState: listo        setState: error
  + ocrData
       │
       ▼
┌─────────────────────────┐
│  SI frente && reverso   │
│     ambos listos        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│  onDatosExtraidos({     │
│    frente: OCRData,     │
│    reverso: OCRData,    │
│    persona: string      │
│  })                     │
└─────────────────────────┘
```

## Estados del DNISide

```
┌─────────┐
│  vacio  │  (inicial)
└────┬────┘
     │ Selecciona archivo
     ▼
┌──────────┐
│ subiendo │  (comprimir + upload a Supabase)
└────┬─────┘
     │
     ├─ Error upload ──► ┌───────┐
     │                   │ error │
     │                   └───────┘
     ▼
┌─────────────┐
│ procesando  │  (ejecutando OCR)
└──────┬──────┘
       │
       ├─ OCR falla ──► ┌───────┐
       │                │ error │
       │                └───────┘
       ▼
    ┌──────┐
    │ listo│  (OCR exitoso, datos extraidos)
    └──────┘
```

## Paleta de Colores por Lado

### Frente (Verde)
```
border-green-300    #86efac
bg-green-50         #f0fdf4
bg-green-100        #dcfce7
text-green-700      #15803d
text-green-600      #16a34a
text-green-800      #166534
```

### Reverso (Azul)
```
border-blue-300     #93c5fd
bg-blue-50          #eff6ff
bg-blue-100         #dbeafe
text-blue-700       #1d4ed8
text-blue-600       #2563eb
text-blue-800       #1e40af
```

### Corporativos
```
#1b967a  - Verde primario (botones, titular)
#192c4d  - Azul navy (titulos)
#fbde17  - Amarillo (warnings)
```

## Jerarquia de Componentes (Arbol)

```
DNIPairUploader
├── DNIPairCard (titular)
│   ├── Header
│   │   ├── Icon (User)
│   │   ├── Titulo
│   │   └── Boton X (disabled)
│   ├── Grid
│   │   ├── DNISideUploadZone (frente)
│   │   │   ├── Input file (hidden)
│   │   │   ├── Titulo
│   │   │   ├── Boton X
│   │   │   ├── Dropzone | Preview
│   │   │   ├── Error message
│   │   │   └── Modal preview
│   │   └── DNISideUploadZone (reverso)
│   │       └── (misma estructura)
│   ├── PanelDatosFrente
│   │   ├── Header expandible
│   │   └── Contenido
│   │       ├── BarraConfianza
│   │       └── Grid CampoExtraido
│   ├── PanelDatosReverso
│   │   └── (misma estructura)
│   └── Warning/Success
├── DNIPairCard (conyuge) - si tieneConyuge
│   └── (misma estructura)
├── DNIPairCard (copropietario 1) - dinamico
│   └── (misma estructura)
├── DNIPairCard (copropietario N)
│   └── (misma estructura)
└── Boton "Agregar Copropietario"
```

## Props Flow

```
Parent Component
    │
    ├─ localId ────────────► uploadToStorage()
    ├─ tieneConyuge ───────► useEffect (agregar/eliminar conyuge)
    ├─ numeroCopropietarios ► max copropietarios permitidos
    ├─ initialPairs ───────► useState(pairs)
    ├─ disabled ───────────► disable todos los inputs
    │
    ├─ onPairsChange ◄────── useEffect cuando pairs cambia
    │   (pairs: DNIPair[])
    │
    └─ onDatosExtraidos ◄─── cuando frente && reverso listos
        ({
          frente: DNIOCRData,
          reverso: DNIReversoOCRData,
          persona: string
        })
```

## Subcomponentes Utilidades

### BarraConfianza
```tsx
Input:  valor: number (0-100)
Output: Barra visual con colores semanticos
Colors:
  >= 80: verde
  >= 50: amarillo
  < 50:  rojo
```

### CampoExtraido
```tsx
Input:
  icon: React.ElementType
  label: string
  valor: string | number | null
Output:
  Fondo gris si tiene valor
  Fondo rojo + "No detectado" si vacio
```

### PanelDatosFrente
```tsx
Input:
  data: DNIOCRData
  expanded: boolean
  onToggle: () => void
Output:
  Header clickeable con stats
  Contenido expandible con 6 campos
```

### PanelDatosReverso
```tsx
Input:
  data: DNIReversoOCRData
  expanded: boolean
  onToggle: () => void
Output:
  Header clickeable con stats
  Contenido expandible con 5 campos
```

### DNISideUploadZone
```tsx
Input:
  lado: 'frente' | 'reverso'
  side: DNISide | null
  onFileSelect: (file: File) => void
  onDelete: () => void
  disabled: boolean
Output:
  Dropzone (si vacio)
  Preview + overlays (si imagen)
  Modal fullscreen
```

## Hooks Utilizados

```typescript
// Estado principal
const [pairs, setPairs] = useState<DNIPair[]>([])

// Estados UI
const [isDragging, setIsDragging] = useState(false)
const [showPreview, setShowPreview] = useState(false)
const [expandedFrente, setExpandedFrente] = useState(false)
const [expandedReverso, setExpandedReverso] = useState(false)

// Refs
const inputRef = useRef<HTMLInputElement>(null)

// Callbacks optimizados
const processFile = useCallback(async (pairId, lado, file) => {...}, [deps])
const handleDeleteSide = useCallback((pairId, lado) => {...}, [deps])
const handleDeletePair = useCallback((pairId) => {...}, [deps])
const handleAddCopropietario = useCallback(() => {...}, [deps])

// Effects
useEffect(() => onPairsChange(pairs), [pairs])
useEffect(() => { /* sync conyuge */ }, [tieneConyuge])
```

## Metricas del Componente

- **Lineas de codigo:** 1,161
- **Subcomponentes:** 7
- **Hooks:** 9
- **Callbacks:** 6
- **Interfaces:** 5
- **Estados visuales:** 5
- **Iconos Lucide:** 15+
- **Colores unicos:** 12+

## Performance

### Optimizaciones Implementadas
1. `useCallback` para evitar re-renders
2. Compresion en Web Worker (no bloquea UI)
3. Upload asincronico
4. Object URL para preview (no base64)
5. Lazy loading de Supabase
6. Cleanup de object URLs

### Tiempo Estimado por Operacion
- Seleccion archivo: < 50ms
- Compresion: 500-2000ms (segun size)
- Upload Supabase: 1000-3000ms (segun conexion)
- Base64 conversion: 200-500ms
- OCR GPT-4: 2000-5000ms
- **Total por imagen:** ~5-10 segundos

## Casos de Uso

### Caso 1: Solo Titular
```
Pares: 1
Imagenes requeridas: 2 (frente + reverso)
Tiempo total: ~10-20 segundos
```

### Caso 2: Titular + Conyuge
```
Pares: 2
Imagenes requeridas: 4
Tiempo total: ~20-40 segundos
```

### Caso 3: Titular + Conyuge + 2 Copropietarios
```
Pares: 4
Imagenes requeridas: 8
Tiempo total: ~40-80 segundos
```

---

**Nota:** Los tiempos son estimados y dependen de:
- Velocidad de conexion internet
- Tamano original de imagenes
- Respuesta de OpenAI API
- Hardware del cliente
