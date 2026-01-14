# Sesión 90 - Fix: Guardado de Documentos en Registro de Corredores

**Fecha:** 13 Enero 2026
**Módulo:** Expansión - Registro de Corredores
**Tipo:** Bug Fix Crítico
**Estado:** ✅ IMPLEMENTADO

---

## PROBLEMA IDENTIFICADO

Los documentos subidos por el corredor NO se guardaban en la base de datos:

1. El usuario sube imágenes mediante `DocumentoOCRUploader`
2. Las imágenes se suben correctamente a Supabase Storage
3. Las URLs se guardan en estado local (React state)
4. Al hacer "Guardar Borrador", solo se guardan los datos del formulario en `corredores_registro`
5. **Las URLs de documentos NO se persisten en `corredores_documentos`**
6. Al recargar la página, los documentos desaparecen

### Consecuencias

- Pérdida de documentos subidos
- Usuario tiene que volver a subir todo
- No se puede enviar para revisión (faltan documentos en DB)
- Mala experiencia de usuario

---

## SOLUCIÓN IMPLEMENTADA

### 1. Nuevo Server Action: `saveDocumentosCorredor`

**Archivo:** `lib/actions-expansion.ts`

```typescript
export async function saveDocumentosCorredor(
  registroId: string,
  documentos: { tipo: TipoDocumento; url: string; storagePath: string }[]
): Promise<ExpansionActionResult>
```

**Funcionalidad:**
- Recibe el ID del registro y un array de documentos
- Valida que el usuario tiene permiso para editar el registro
- Para cada documento:
  - Elimina documento anterior del mismo tipo (si existe)
  - Inserta nuevo registro en `corredores_documentos`
- Retorna resultado de la operación

**Seguridad:**
- Verifica autenticación del usuario
- Valida que el registro pertenece al usuario
- Solo permite guardar en estado `borrador` u `observado`

---

### 2. Función Helper: `extractStoragePathFromUrl`

**Archivo:** `app/expansion/registro/RegistroCorredorClient.tsx`

```typescript
function extractStoragePathFromUrl(url: string): string
```

**Propósito:**
- Extrae el `storage_path` de una URL pública de Supabase Storage
- Ejemplo:
  - Input: `https://xxx.supabase.co/storage/v1/object/public/documentos-ficha/corredores/123/dni_frente_123.jpg`
  - Output: `corredores/123/dni_frente_123.jpg`

**Lógica:**
- Parsea la URL usando `URL` constructor
- Extrae el path mediante regex: `/\/public\/documentos-ficha\/(.+)$/`
- Fallback: retorna URL completa si no puede extraer

---

### 3. Modificación de `handleSave`

**Cambios principales:**

1. **Guardar `registroId` en variable temporal:**
```typescript
let currentRegistroId = registroId;

if (!registroId) {
  result = await createRegistroCorredor(data);
  if (result.success && result.data) {
    currentRegistroId = result.data.id;
    setRegistroId(result.data.id);
  }
}
```

2. **Construir array de documentos:**
```typescript
const documentosParaGuardar: { tipo: TipoDocumento; url: string; storagePath: string }[] = [];

if (dniFrenteUrls.length > 0) {
  documentosParaGuardar.push({
    tipo: 'dni_frente',
    url: dniFrenteUrls[0],
    storagePath: extractStoragePathFromUrl(dniFrenteUrls[0]),
  });
}
// ... repetir para dni_reverso, recibo_luz, declaracion_jurada_direccion
```

3. **Guardar documentos en DB:**
```typescript
if (documentosParaGuardar.length > 0) {
  const docsResult = await saveDocumentosCorredor(currentRegistroId, documentosParaGuardar);
  if (!docsResult.success) {
    setError('Datos guardados pero hubo un error al guardar los documentos');
    return;
  }
}
```

4. **Mensaje de éxito actualizado:**
```typescript
setSuccess('Datos y documentos guardados correctamente');
```

---

## FLUJO COMPLETO

### Escenario 1: Primer Guardado (Sin registro previo)

1. Usuario completa formulario y sube documentos
2. Hace clic en "Guardar Borrador"
3. `handleSave`:
   - Crea registro en `corredores_registro` → obtiene `id`
   - Construye array con URLs de documentos
   - Llama `saveDocumentosCorredor(id, documentos)`
   - Inserta registros en `corredores_documentos`
4. Mensaje: "Datos y documentos guardados correctamente"
5. Usuario recarga página → documentos aparecen correctamente

### Escenario 2: Guardado con Registro Existente

1. Usuario ya tiene registro en borrador
2. Modifica datos o cambia documentos
3. Hace clic en "Guardar Borrador"
4. `handleSave`:
   - Actualiza registro en `corredores_registro`
   - Usa `registroId` existente
   - Construye array con URLs de documentos
   - Llama `saveDocumentosCorredor(registroId, documentos)`
   - Elimina documentos anteriores del mismo tipo
   - Inserta nuevos registros
5. Mensaje: "Datos y documentos guardados correctamente"

---

## ESTRUCTURA DE DATOS

### Tabla: `corredores_documentos`

```sql
CREATE TABLE corredores_documentos (
  id UUID PRIMARY KEY,
  registro_id UUID REFERENCES corredores_registro(id),
  tipo_documento TEXT, -- 'dni_frente', 'dni_reverso', etc.
  storage_path TEXT,   -- 'corredores/123/dni_frente_123.jpg'
  public_url TEXT,     -- URL pública completa
  ocr_data JSONB,      -- Datos extraídos por OCR (opcional)
  ocr_confianza FLOAT, -- Score de confianza OCR
  nombre_original TEXT,
  content_type TEXT,
  size_bytes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Mapeo de Tipos de Documento

| Estado del Componente | `tipo_documento` en DB |
|----------------------|------------------------|
| `dniFrenteUrls` | `dni_frente` |
| `dniReversoUrls` | `dni_reverso` |
| `reciboUrls` | `recibo_luz` |
| `declaracionJuradaUrls` | `declaracion_jurada_direccion` |

---

## VALIDACIONES

### Server Action: `saveDocumentosCorredor`

- ✅ Usuario autenticado
- ✅ Registro existe
- ✅ Usuario es dueño del registro
- ✅ Estado es `borrador` u `observado`
- ✅ Array de documentos no vacío

### Cliente: `handleSave`

- ✅ Validación de campos requeridos
- ✅ Construcción correcta del array de documentos
- ✅ Manejo de errores con mensajes claros
- ✅ Feedback visual al usuario

---

## MEJORAS FUTURAS

### 1. Metadata Completa
Actualmente guardamos:
```typescript
nombre_original: null,
content_type: null,
size_bytes: null,
```

**Mejora:** El componente `DocumentoOCRUploader` podría retornar metadata adicional:
```typescript
onDocumentosChange={(urls, metadata) => {
  setDniFrenteUrls(urls);
  setDniFrenteMetadata(metadata); // { fileName, contentType, size }
}}
```

### 2. Optimización de Guardado
Actualmente cada `save` sobrescribe los documentos.

**Mejora:** Detectar cambios reales:
```typescript
// Solo guardar documentos que cambiaron
const documentosCambiados = detectarCambios(
  documentosExistentes,
  documentosNuevos
);
```

### 3. Progreso Visual
Mostrar indicador cuando se están guardando documentos:
```typescript
setSaving(true);
setProgress('Guardando datos...');
// ...guardar registro...
setProgress('Guardando documentos (1/4)...');
// ...guardar documentos...
```

### 4. Retry en Errores
Si falla el guardado de documentos, intentar nuevamente:
```typescript
const maxRetries = 3;
let attempt = 0;
while (attempt < maxRetries) {
  const result = await saveDocumentosCorredor(...);
  if (result.success) break;
  attempt++;
  await sleep(1000 * attempt);
}
```

---

## TESTING REALIZADO

### Manual

1. ✅ Crear registro nuevo → subir documentos → guardar → recargar → documentos presentes
2. ✅ Editar registro existente → cambiar documento → guardar → verificar actualización
3. ✅ Subir documento → NO guardar → recargar → documento NO debe aparecer (comportamiento correcto)
4. ✅ Guardar sin documentos → no debe dar error
5. ✅ Guardar con algunos documentos → solo esos deben guardarse

### Casos de Error

1. ✅ Error en `saveDocumentosCorredor` → mensaje claro al usuario
2. ✅ URL inválida → `extractStoragePathFromUrl` retorna fallback
3. ✅ Registro no encontrado → error descriptivo
4. ✅ Sin permisos → error de autorización

---

## ARCHIVOS MODIFICADOS

| Archivo | Cambios |
|---------|---------|
| `lib/actions-expansion.ts` | ✅ Nuevo Server Action `saveDocumentosCorredor` |
| `app/expansion/registro/RegistroCorredorClient.tsx` | ✅ Import nuevo Server Action<br>✅ Función helper `extractStoragePathFromUrl`<br>✅ Modificación de `handleSave` |
| `lib/types/expansion.ts` | (No requirió cambios) |

---

## IMPACTO

### Usuarios
- ✅ Los documentos ahora se guardan correctamente
- ✅ Pueden salir y volver sin perder su progreso
- ✅ Pueden completar el registro en múltiples sesiones
- ✅ Mejor experiencia de usuario

### Sistema
- ✅ Integridad de datos garantizada
- ✅ Storage y DB sincronizados
- ✅ Posibilidad de auditoría completa
- ✅ Base para futuras validaciones (equipo legal)

---

## CONCLUSIÓN

Fix crítico implementado con éxito. Los documentos ahora se persisten correctamente en la base de datos al hacer "Guardar Borrador". El sistema mantiene sincronía entre Supabase Storage (archivos) y PostgreSQL (metadata y referencias).

**Estado:** ✅ LISTO PARA PRODUCCIÓN

---

**Próximos Pasos:**

1. Testing exhaustivo en entorno de staging
2. Verificar con usuario real (corredor de prueba)
3. Monitorear logs de `saveDocumentosCorredor` en primeras 48h
4. Considerar implementar mejoras futuras listadas
