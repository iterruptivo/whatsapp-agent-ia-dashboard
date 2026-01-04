# DocumentoOCRUploader - Changelog Multi-Imagen

## Fecha: 2026-01-02

## Cambios Implementados

### 1. Componente DocumentoOCRUploader.tsx

#### ANTES (Single Image):
```typescript
interface DocumentoOCRUploaderProps {
  initialImageUrl?: string;
  onDocumentoChange: (result: DocumentoResult | null) => void;
}
```

#### AHORA (Multi Image):
```typescript
interface DocumentoOCRUploaderProps {
  maxImages: number;                              // NUEVO: limite de imagenes
  initialImageUrls?: string[];                    // CAMBIO: array de URLs
  onDocumentosChange: (urls: string[]) => void;   // CAMBIO: callback con array
}
```

#### Nuevas Features:
- Soporte para multiples imagenes (hasta `maxImages`)
- OCR inteligente: solo primera imagen ejecuta OCR automaticamente
- Galeria de previews con grid responsive
- Boton "Agregar otra imagen" con contador
- Eliminar imagenes individuales
- Drag & drop multiple
- Indicador visual de cual imagen tiene OCR procesado
- Badge "Principal" en primera imagen
- Estado de procesamiento individual por imagen

#### Estructura de Datos:
```typescript
interface DocumentoItem {
  id: string;           // ID unico para tracking
  imageUrl: string;     // URL en Supabase Storage
  previewUrl: string;   // URL local o publica para preview
  ocrData: OCRData | null;
  estado: EstadoDocumento;
  error?: string;
  hasOCR: boolean;      // True si se ejecuto OCR
}
```

---

### 2. FichaInscripcionModal.tsx

#### Cambios en Imports:
```typescript
// ANTES
import DocumentoOCRUploader, { DNIOCRData, VoucherOCRData, DocumentoResult } from '@/components/shared/DocumentoOCRUploader';

// AHORA
import DocumentoOCRUploader, { DNIOCRData, VoucherOCRData } from '@/components/shared/DocumentoOCRUploader';
```

#### Cambios en Estados:
```typescript
// ANTES
const [dniDocumento, setDniDocumento] = useState<DocumentoResult | null>(null);
const [comprobanteDocumento, setComprobanteDocumento] = useState<DocumentoResult | null>(null);

// AHORA (eliminados, datos van directo a formData)
// Los estados ya no son necesarios
```

#### Cambios en Handlers:
```typescript
// ANTES
const handleDniDocumentoChange = (result: DocumentoResult | null) => {
  setDniDocumento(result);
  if (result?.imageUrl) {
    const currentFotos = formData.dni_fotos || [];
    if (!currentFotos.includes(result.imageUrl)) {
      handleChange('dni_fotos', [result.imageUrl, ...currentFotos]);
    }
  }
};

// AHORA
const handleDniDocumentoChange = (urls: string[]) => {
  handleChange('dni_fotos', urls);
};
```

#### Cambios en Componente JSX:
```typescript
// ANTES
<DocumentoOCRUploader
  tipo="dni"
  title="Foto de DNI (Principal)"
  description="Sube el anverso del DNI para extraer datos automaticamente"
  localId={local?.id || ''}
  required={true}
  disabled={loading}
  initialImageUrl={formData.dni_fotos?.[0]}
  onDocumentoChange={handleDniDocumentoChange}
  onDatosExtraidos={(data) => handleDniDatosExtraidos(data as DNIOCRData)}
/>

// AHORA
<DocumentoOCRUploader
  tipo="dni"
  title="Fotos de DNI"
  description="Sube el DNI (anverso, reverso, del conyuge, copropietarios)"
  localId={local?.id || ''}
  maxImages={10}                                    // NUEVO
  required={true}
  disabled={loading}
  initialImageUrls={formData.dni_fotos || []}      // CAMBIO
  onDocumentosChange={handleDniDocumentoChange}    // CAMBIO
  onDatosExtraidos={(data) => handleDniDatosExtraidos(data as DNIOCRData)}
/>
```

---

## Configuracion por Tipo de Documento

### DNI:
- **maxImages**: 10
- **required**: true
- **OCR**: Primera imagen auto-llena campos del titular
- **Uso**: Anverso, reverso, DNI conyuge, DNI copropietarios

### Comprobantes:
- **maxImages**: 5
- **required**: false
- **OCR**: Primera imagen extrae datos del voucher
- **Uso**: Multiples depositos/transferencias

---

## UX/UI Mejorada

### Estados Visuales:
- **Vacio**: Dropzone con drag & drop
- **Subiendo**: Spinner sobre preview
- **Procesando**: "Analizando documento con IA..."
- **Valido**: Check verde + badge "OCR" si aplica
- **Revision**: Warning amarillo + mensaje
- **Error**: X rojo + descripcion del error

### Contador:
- Header muestra: "3/10 imagenes"
- Boton agregar: "Agregar otra imagen (3/10)"

### Galeria:
- Grid responsive: 2 cols mobile, 3 sm, 4 md
- Aspect ratio cuadrado
- Hover overlay con botones Ver/Eliminar
- Badge superior derecho con estado + "Principal" en primera

### Preview Modal:
- Click en cualquier imagen abre modal fullscreen
- Fondo negro 80% opacidad
- Boton X para cerrar

---

## Breaking Changes

SI usas DocumentoOCRUploader en otros archivos, debes actualizar:

1. Agregar prop `maxImages`
2. Cambiar `initialImageUrl` por `initialImageUrls` (array)
3. Cambiar `onDocumentoChange` por `onDocumentosChange`
4. El callback ahora recibe `string[]` en vez de `DocumentoResult | null`

---

## Testing Checklist

- [ ] Subir primera imagen DNI → OCR ejecuta → campos se llenan
- [ ] Agregar segunda imagen DNI → NO ejecuta OCR → se agrega a galeria
- [ ] Eliminar imagen individual
- [ ] Maximo 10 imagenes DNI
- [ ] Maximo 5 imagenes voucher
- [ ] Drag & drop multiple
- [ ] Preview modal fullscreen
- [ ] Responsive mobile/tablet/desktop
- [ ] Guardar y recargar → imagenes persisten

---

## Archivos Modificados

1. `components/shared/DocumentoOCRUploader.tsx` - REESCRITO COMPLETO
2. `components/locales/FichaInscripcionModal.tsx` - ACTUALIZADO
   - Imports
   - Estados (comentados)
   - Handlers
   - Props del componente

---

## Proximos Pasos

- Validar en staging
- Probar con usuarios reales
- Considerar agregar re-ordenar imagenes (drag & drop en galeria)
- Agregar opcion "Re-escanear con OCR" para cualquier imagen
