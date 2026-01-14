# SESION 89 - Rediseño Formulario Registro de Corredor

**Fecha:** 13 Enero 2026
**Modulo:** Expansion (Corredores)
**Tipo:** Frontend Redesign + OCR Integration

---

## OBJETIVO

Rediseñar el formulario de registro de corredor con las siguientes mejoras:
1. Reordenar secciones: Documentos PRIMERO, datos personales después
2. Cambiar "Recibo de Luz" a "Recibo de Luz O Agua"
3. Integrar componente `DocumentoOCRUploader` con preview y OCR
4. Extracción automática de datos que llene el formulario
5. UI consistente con el resto del dashboard

---

## CAMBIOS IMPLEMENTADOS

### Archivo Modificado

```
app/expansion/registro/RegistroCorredorClient.tsx
```

### 1. Nuevo Orden de Secciones

**Antes:**
```
Tipo → Datos Personales → Documentos
```

**Ahora:**
```
Tipo → DOCUMENTOS → Datos Personales
```

**Razón:** Los usuarios primero quieren saber qué documentos necesitan. Después completarán datos (que se autocompletan).

---

### 2. Integración de DocumentoOCRUploader

Reemplazado el sistema manual de subida por el componente compartido `DocumentoOCRUploader`.

**Características:**
- Preview de imágenes con estados visuales
- Upload a Supabase Storage
- Compresión automática
- OCR con GPT-4 Vision
- Panel expandible con datos extraídos
- Barra de confianza (%)
- Soporte multi-imagen

**Estados visuales:**
- Subiendo → Spinner azul
- Procesando → Spinner con "Analizando..."
- Válido → Check verde
- Error → X roja

---

### 3. Documentos Requeridos

| Documento | OCR | Extrae |
|-----------|-----|--------|
| DNI Frente | Sí | DNI, nombres, apellidos, fecha nacimiento |
| DNI Reverso | Sí | Dirección domiciliaria |
| Recibo Luz/Agua | Sí | Dirección |
| Declaración Jurada | No | - |

**Cambio importante:** Ahora acepta **recibo de luz O agua** (antes solo luz).

---

### 4. Extracción Automática de Datos

#### Handler DNI Frente

```typescript
const handleDNIFrenteExtractedData = (data: OCRData) => {
  const dniData = data as DNIOCRData;
  setFormData(prev => ({
    ...prev,
    dni: dniData.numero_dni || prev.dni,
    nombres: dniData.nombres || prev.nombres,
    apellido_paterno: dniData.apellido_paterno || prev.apellido_paterno,
    apellido_materno: dniData.apellido_materno || prev.apellido_materno,
    fecha_nacimiento: dniData.fecha_nacimiento || prev.fecha_nacimiento,
  }));
  setSuccess('Datos del DNI extraídos correctamente');
};
```

**Flujo:**
1. Usuario sube DNI frente
2. Componente comprime imagen
3. Sube a Supabase Storage
4. Llama a `/api/ocr/extract` con tipo "dni"
5. GPT-4 Vision extrae datos
6. Datos se llenan automáticamente en formulario
7. Usuario puede editarlos si es necesario

#### Handler Recibo

```typescript
const handleReciboExtractedData = (data: OCRData) => {
  const reciboData = data as ReciboOCRData;
  if (reciboData.direccion) {
    setFormData(prev => ({
      ...prev,
      direccion_declarada: reciboData.direccion || prev.direccion_declarada,
    }));
    setSuccess('Dirección extraída del recibo correctamente');
  }
};
```

---

### 5. Estados Agregados

```typescript
// URLs de imágenes para DocumentoOCRUploader
const [dniFrenteUrls, setDniFrenteUrls] = useState<string[]>([]);
const [dniReversoUrls, setDniReversoUrls] = useState<string[]>([]);
const [reciboUrls, setReciboUrls] = useState<string[]>([]);
const [declaracionJuradaUrls, setDeclaracionJuradaUrls] = useState<string[]>([]);
```

**Nota:** Se usan arrays de URLs para soportar multi-imagen (el componente acepta hasta `maxImages` imágenes).

---

### 6. Validación de Documentos Completos

```typescript
const documentosCompletos =
  dniFrenteUrls.length > 0 &&
  dniReversoUrls.length > 0 &&
  reciboUrls.length > 0 &&
  declaracionJuradaUrls.length > 0;
```

El botón "Enviar para Revisión" solo se habilita cuando todos los documentos están subidos.

---

### 7. UI Mejorada

#### Colores Corporativos
- Verde primario: `#1b967a`
- Hover verde: `#156b5a`

#### Iconos Descriptivos
```tsx
<FileCheck className="w-5 h-5 text-[#1b967a]" /> // Documentos
<User className="w-5 h-5 text-[#1b967a]" />      // Datos personales
<Home className="w-4 h-4" />                      // Dirección
```

#### Mensajes de Ayuda
```tsx
<p className="text-xs text-gray-500 mt-2">
  <AlertCircle className="w-3 h-3" />
  Puedes subir un recibo de luz O un recibo de agua. Con cualquiera de los dos es suficiente.
</p>
```

---

## COMPONENTE DocumentoOCRUploader

### Props Principales

| Prop | Tipo | Descripción |
|------|------|-------------|
| tipo | 'dni' \| 'voucher' | Tipo de documento para OCR |
| title | string | Título del componente |
| description | string | Descripción del documento |
| localId | string | ID del local/registro para storage |
| maxImages | number | Máximo de imágenes permitidas |
| required | boolean | Si el documento es obligatorio |
| disabled | boolean | Si el componente está deshabilitado |
| initialImageUrls | string[] | URLs existentes para cargar |
| onDocumentosChange | (urls: string[]) => void | Callback cuando cambian las URLs |
| onDatosExtraidos | (data: OCRData) => void | Callback con datos del OCR |

### Ejemplo de Uso

```tsx
<DocumentoOCRUploader
  tipo="dni"
  title="DNI (Frente)"
  description="Foto clara del lado frontal de tu DNI"
  localId={registroId || 'temp'}
  maxImages={2}
  required
  disabled={!canEdit}
  initialImageUrls={dniFrenteUrls}
  onDocumentosChange={setDniFrenteUrls}
  onDatosExtraidos={handleDNIFrenteExtractedData}
/>
```

---

## FLUJO DE USUARIO

### Registro Nuevo

1. Usuario navega a `/expansion/registro`
2. Ve formulario con 3 secciones:
   - Tipo de Registro (Natural/Jurídica)
   - **Documentos Requeridos** (prominente)
   - Datos Personales (gris, después)

3. Selecciona tipo de persona

4. **Sube DNI Frente:**
   - Drag & drop o clic
   - Ve preview de imagen
   - Ve spinner "Analizando..."
   - Panel verde se expande con datos extraídos
   - Campos del formulario se llenan automáticamente

5. **Sube DNI Reverso:**
   - Mismo proceso
   - Extrae dirección domiciliaria

6. **Sube Recibo de Luz O Agua:**
   - Acepta cualquiera de los dos
   - Extrae dirección
   - Campo "Dirección Declarada" se llena

7. **Sube Declaración Jurada:**
   - PDF o Word
   - Sin OCR (solo almacenamiento)

8. **Verifica Datos Personales:**
   - Revisa datos extraídos
   - Edita si es necesario
   - Completa campos faltantes (teléfono, email)

9. **Guarda Borrador:**
   - Botón "Guardar Borrador"
   - Mensaje verde de éxito

10. **Envía para Revisión:**
    - Botón verde "Enviar"
    - Solo habilitado si todos los docs están completos
    - Estado cambia a "Pendiente"

---

## VENTAJAS DEL NUEVO DISEÑO

### 1. Documentos Primero
- Usuario ve inmediatamente qué necesita subir
- Reduce abandono del formulario
- Expectativas claras desde el inicio

### 2. Autocompletado
- Menos errores de tipeo
- Más rápido (no escribir DNI, nombres, etc.)
- Mayor confianza en los datos

### 3. Experiencia Visual
- Estados claros (subiendo, procesando, listo)
- Preview de imágenes
- Panel expandible con datos extraídos
- Barra de confianza (% de certeza del OCR)

### 4. Flexibilidad
- Acepta recibo de luz O agua
- Multi-imagen (hasta 2-3 por documento)
- Datos editables después de extracción

### 5. Consistencia
- Mismo componente que en gestión de locales
- Misma UI que el resto del dashboard
- Colores corporativos

---

## COMPATIBILIDAD

### Registros Existentes
- Se cargan las URLs existentes en `initialImageUrls`
- Se respeta el estado actual (borrador, pendiente, etc.)
- No se pierde información

### Tipos de Persona
- Soporta Persona Natural y Jurídica
- Documentos se ajustan según tipo
- Flujo OCR funciona para ambos

---

## ARCHIVOS RELACIONADOS

```
app/expansion/registro/RegistroCorredorClient.tsx    (MODIFICADO)
components/shared/DocumentoOCRUploader.tsx           (USADO)
lib/actions-ocr.ts                                  (USADO)
lib/types/expansion.ts                              (USADO)
app/api/ocr/extract/route.ts                        (USADO)
```

---

## TESTING RECOMENDADO

### Checklist Manual

- [ ] Login como usuario corredor
- [ ] Navegar a `/expansion/registro`
- [ ] Verificar orden: Tipo → Documentos → Datos
- [ ] Subir DNI frente con imagen de prueba
- [ ] Verificar extracción de datos (DNI, nombres, apellidos)
- [ ] Verificar autocompletado de campos
- [ ] Editar campo autocompletado
- [ ] Subir recibo de luz
- [ ] Verificar extracción de dirección
- [ ] Subir declaración jurada
- [ ] Verificar botón "Enviar" se habilita
- [ ] Guardar borrador
- [ ] Enviar para revisión

### Testing con Playwright MCP

```typescript
// Navegar
await mcp__playwright__browser_navigate('http://localhost:3000/expansion/registro');

// Snapshot inicial
await mcp__playwright__browser_snapshot();

// Screenshot
await mcp__playwright__browser_take_screenshot('registro-corredor-inicial.png');

// Verificar elementos
await mcp__playwright__browser_snapshot(); // Buscar "DNI (Frente)"

// Verificar errores de consola
await mcp__playwright__browser_console_messages();
```

### Imágenes de Prueba

Usar assets en `docs/test-assets/`:
- `docs/test-assets/dni/dni-frente-01.jpg`
- `docs/test-assets/dni/dni-reverso-01.jpg`
- (Para recibos, usar cualquier voucher de prueba temporalmente)

---

## NOTAS TÉCNICAS

### OCR Recibo de Luz/Agua

Actualmente el tipo de OCR usado es "voucher" (para recibos), pero GPT-4 Vision puede detectar direcciones en recibos de servicios.

Si la extracción de dirección no es precisa, se puede:
1. Crear un tipo específico `recibo_servicio` en `lib/actions-ocr.ts`
2. Agregar prompt optimizado para recibos de luz/agua
3. Actualizar API route `/api/ocr/extract`

### Multi-imagen

El componente soporta multi-imagen para casos donde:
- DNI está en 2 fotos (frente y reverso en la misma llamada)
- Recibo tiene 2 páginas
- Usuario quiere subir backup

Solo la primera imagen ejecuta OCR. Las siguientes se almacenan sin procesar.

### Performance

- Compresión automática a 1MB max
- Formato JPEG para menor tamaño
- Upload directo a Supabase Storage (no pasa por API)
- OCR asíncrono (usuario ve estados)

---

## PROXIMOS PASOS

1. **Testing Visual:** Validar con Playwright MCP
2. **Ajustar OCR Recibo:** Si es necesario, crear tipo específico
3. **Documentar Usuario Final:** Crear guía en PDF para corredores
4. **Template Declaración Jurada:** Agregar link de descarga
5. **Notificaciones:** Email cuando estado cambia a "Observado" o "Aprobado"

---

## RESULTADO

**Estado:** Implementación completa
**Branch:** main
**Deploy:** Pendiente testing
**Breaking Changes:** No

**Resumen:** Formulario de registro de corredor rediseñado con documentos primero, integración de DocumentoOCRUploader para extracción automática de datos, soporte para recibo de luz O agua, y UI consistente con colores corporativos. La experiencia del usuario mejora significativamente al ver el proceso de extracción OCR en tiempo real y tener autocompletado de campos.

---

**Fin de Sesión 89**
