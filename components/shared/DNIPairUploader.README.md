# DNIPairUploader - Componente de Upload DNI en Pares con OCR Dual

## Descripcion

Componente React premium para subir DNI peruano en pares obligatorios (frente + reverso) con procesamiento OCR inteligente en ambas caras usando GPT-4 Vision.

## Caracteristicas Premium

### 1. Pares Obligatorios
- DNI SIEMPRE en pares: frente + reverso
- No permite pares incompletos
- Validacion visual clara del estado de cada cara

### 2. OCR Dual Inteligente
- **Frente**: Extrae DNI, nombres, apellidos, fecha de nacimiento, sexo
- **Reverso**: Extrae departamento, provincia, distrito, direccion, ubigeo
- Procesamiento asincronico con indicadores de progreso
- Niveles de confianza (0-100%) con barras visuales

### 3. Multipersonas
- **Titular**: Siempre presente, no se puede eliminar
- **Conyuge**: Controlado por prop `tieneConyuge`
- **Copropietarios**: Hasta 5, con indice numerado

### 4. UX de Clase Mundial
- Cards elegantes con colores corporativos
- Zonas de drop lado a lado (frente/reverso)
- Estados visuales claros:
  - Vacio: Zona de upload con icono
  - Subiendo: Spinner + overlay
  - Procesando: "Analizando OCR..."
  - Listo: Checkmark verde
  - Error: X roja con mensaje
- Paneles expandibles con datos extraidos
- Preview modal de imagenes en pantalla completa

## Interfaces TypeScript

```typescript
export interface DNIOCRData {
  numero_dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: string;
  sexo: 'M' | 'F';
  confianza: number;
}

export interface DNIReversoOCRData {
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  direccion: string | null;
  ubigeo: string | null;
  confianza: number;
}

export interface DNIPair {
  id: string;
  persona: 'titular' | 'conyuge' | 'copropietario';
  personaIndex?: number;
  frente: DNISide | null;
  reverso: DNISide | null;
}

export interface DNIPairUploaderProps {
  localId: string;
  onPairsChange: (pairs: DNIPair[]) => void;
  onDatosExtraidos?: (datos: {
    frente: DNIOCRData;
    reverso: DNIReversoOCRData;
    persona: string;
  }) => void;
  initialPairs?: DNIPair[];
  disabled?: boolean;
  tieneConyuge?: boolean;
  numeroCopropietarios?: number;
}
```

## Uso

### Basico (solo titular)

```tsx
import DNIPairUploader from '@/components/shared/DNIPairUploader';

function MiFormulario() {
  const [pairs, setPairs] = useState([]);

  return (
    <DNIPairUploader
      localId="local-123"
      onPairsChange={setPairs}
      onDatosExtraidos={(datos) => {
        console.log('Datos extraidos:', datos);
        // datos.frente -> DNIOCRData
        // datos.reverso -> DNIReversoOCRData
        // datos.persona -> "titular" | "conyuge" | "copropietario-1"
      }}
    />
  );
}
```

### Con Conyuge y Copropietarios

```tsx
<DNIPairUploader
  localId="local-123"
  onPairsChange={setPairs}
  onDatosExtraidos={handleDatosExtraidos}
  tieneConyuge={true}
  numeroCopropietarios={2}
/>
```

### Con Estado Inicial

```tsx
<DNIPairUploader
  localId="local-123"
  onPairsChange={setPairs}
  initialPairs={[
    {
      id: 'titular-1',
      persona: 'titular',
      frente: {
        url: 'https://...',
        previewUrl: 'https://...',
        ocrData: null,
        estado: 'listo',
      },
      reverso: null,
    },
  ]}
/>
```

## Flujo de Procesamiento

1. Usuario selecciona imagen (drag & drop o click)
2. Validacion de tipo (JPG, PNG, WEBP) y tamano (max 10MB)
3. Compresion automatica (max 1MB, 1200px)
4. Upload a Supabase Storage (`documentos-ficha/{localId}/dni/{persona}-{lado}-{timestamp}.jpg`)
5. Conversion a base64
6. Llamada a `/api/ocr/extract` con type `dni` o `dni_reverso`
7. GPT-4 Vision extrae datos
8. Actualizacion de estado con datos OCR
9. Notificacion a padre via `onDatosExtraidos` cuando ambos lados estan listos

## API OCR

### Endpoint

```
POST /api/ocr/extract
```

### Request

```json
{
  "image": "base64-string",
  "type": "dni" | "dni_reverso",
  "mimeType": "image/jpeg"
}
```

### Response (Frente)

```json
{
  "success": true,
  "data": {
    "numero_dni": "12345678",
    "nombres": "JUAN CARLOS",
    "apellido_paterno": "PEREZ",
    "apellido_materno": "GARCIA",
    "fecha_nacimiento": "1985-03-15",
    "sexo": "M",
    "confianza": 95
  }
}
```

### Response (Reverso)

```json
{
  "success": true,
  "data": {
    "departamento": "LIMA",
    "provincia": "LIMA",
    "distrito": "MIRAFLORES",
    "direccion": "AV. LARCO 123 URB. AURORA",
    "ubigeo": "150122",
    "confianza": 90
  }
}
```

## Colores Corporativos

- Verde primario: `#1b967a` - Acciones principales, titular
- Azul navy: `#192c4d` - Titulos, headers
- Amarillo: `#fbde17` - Warnings (no usado en este componente)
- Verde frente: `text-green-700`, `border-green-300`
- Azul reverso: `text-blue-700`, `border-blue-300`

## Estados Visuales

| Estado | Color | Icono | Descripcion |
|--------|-------|-------|-------------|
| `vacio` | Gray | Upload | Zona de drop activa |
| `subiendo` | Gray | Spinner | Subiendo a Supabase |
| `procesando` | Blue | Spinner | Ejecutando OCR |
| `listo` | Green | CheckCircle | OCR exitoso |
| `error` | Red | XCircle | Error en upload/OCR |

## Validaciones

- Tipo de archivo: JPG, PNG, WEBP solamente
- Tamano maximo: 10MB por imagen
- Compresion automatica a 1MB si es mas grande
- DNI debe tener 8 digitos (validado por OCR)
- Fecha de nacimiento en formato YYYY-MM-DD

## Testing

### Pagina de Prueba

```
http://localhost:3000/test-dni-pair-uploader
```

### Test Assets

Usar imagenes de prueba en `docs/test-assets/dni/`:

```
dni-frente-01.jpg
dni-reverso-01.jpg
```

### Test Manual

1. Abrir pagina de prueba
2. Activar "Tiene Conyuge"
3. Ajustar numero de copropietarios
4. Subir DNI frente para titular
5. Subir DNI reverso para titular
6. Verificar panel OCR se expande automaticamente
7. Verificar datos extraidos en panel de debug
8. Agregar copropietario
9. Verificar puede eliminar copropietarios
10. Verificar NO puede eliminar titular/conyuge

## Dependencias

- `react`: ^19.0.0
- `lucide-react`: ^0.468.0
- `browser-image-compression`: ^2.0.2
- `@supabase/supabase-js`: ^2.x
- OpenAI API (GPT-4 Vision) via server action

## Arquitectura

```
DNIPairUploader (Componente raiz)
  ├── DNIPairCard (Card por persona)
  │   ├── DNISideUploadZone (Frente)
  │   │   └── Modal Preview
  │   ├── DNISideUploadZone (Reverso)
  │   │   └── Modal Preview
  │   ├── PanelDatosFrente (Datos OCR frente)
  │   │   ├── BarraConfianza
  │   │   └── CampoExtraido (x6)
  │   └── PanelDatosReverso (Datos OCR reverso)
  │       ├── BarraConfianza
  │       └── CampoExtraido (x5)
  └── Boton "Agregar Copropietario"
```

## Performance

- Compresion de imagenes en cliente (Web Worker)
- Upload asincronico a Supabase
- OCR en paralelo (no bloquea UI)
- Optimizacion de re-renders con `useCallback`
- Limpieza de object URLs al eliminar

## Seguridad

- Validacion de tipos MIME
- Limite de tamano de archivo
- Sanitizacion de nombres de archivo
- OCR ejecutado en servidor (API key segura)
- RLS de Supabase para control de acceso

## Roadmap

- [ ] Auto-rotacion de imagenes
- [ ] Crop manual antes de OCR
- [ ] Re-ejecutar OCR si falla
- [ ] Soporte para DNI digital (PDF)
- [ ] Validacion con RENIEC API

## Soporte

- Browsers: Chrome 90+, Firefox 88+, Safari 14+
- Mobile: Responsive, touch-friendly
- Accesibilidad: ARIA labels, keyboard navigation

## Autor

ITERRUPTIVO - Frontend Developer
Fecha: 2 Enero 2026
Version: 1.0.0
