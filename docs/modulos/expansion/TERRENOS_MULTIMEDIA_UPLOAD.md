# Sistema de Upload de Archivos Multimedia - Terrenos

## Resumen

Sistema completo de upload de archivos (fotos, videos, planos, documentos) para el módulo de terrenos de expansión, usando Supabase Storage como backend.

## Arquitectura

```
Cliente (PasoMultimedia.tsx)
   ↓
   | FormData (file + tipo + terreno_id)
   ↓
API Route (/api/expansion/terrenos/upload)
   ↓
   | 1. Validar auth
   | 2. Validar archivo (tipo, tamaño)
   | 3. Validar permisos (terreno pertenece al usuario)
   ↓
Supabase Storage (bucket: terrenos-multimedia)
   ↓
   | Upload exitoso
   ↓
Retorna URL pública
   ↓
Cliente actualiza estado
```

## Componentes

### 1. Validador de Archivos

**Ubicación:** `lib/utils/terreno-file-validator.ts`

**Función:** Validar tipo y tamaño de archivos antes de upload

**Límites:**
- Fotos: 10MB (JPG, PNG, WebP)
- Videos: 100MB (MP4, WebM, MOV)
- Planos: 10MB (PDF, JPG, PNG)
- Documentos: 10MB (PDF, JPG, PNG)

**Ejemplo:**
```typescript
import { validateTerrenoFile } from '@/lib/utils/terreno-file-validator';

const validation = validateTerrenoFile(file, 'fotos');
if (!validation.isValid) {
  console.error(validation.error);
}
```

### 2. API Route

**Ubicación:** `app/api/expansion/terrenos/upload/route.ts`

**Endpoint:** `POST /api/expansion/terrenos/upload`

**Parámetros (FormData):**
- `file`: File (requerido)
- `tipo`: 'fotos' | 'videos' | 'planos' | 'documentos' (requerido)
- `terreno_id`: string (opcional, para organización)

**Respuesta exitosa:**
```json
{
  "success": true,
  "url": "https://xxx.supabase.co/storage/v1/object/public/terrenos-multimedia/...",
  "path": "terrenos/123/fotos/1234567890_imagen.jpg",
  "tipo": "fotos",
  "message": "Archivo subido correctamente"
}
```

**Respuesta de error:**
```json
{
  "error": "El archivo es demasiado grande (15MB). Máximo permitido: 10MB"
}
```

**Validaciones:**
1. Usuario autenticado
2. Archivo válido (tipo y tamaño)
3. Terreno existe y pertenece al usuario
4. Terreno en estado editable ('borrador' o 'info_adicional')

**Seguridad:**
- Usa Service Role Key para bypass de RLS en storage
- Valida permisos a nivel de aplicación
- Sanitiza nombres de archivo

### 3. Componente Cliente

**Ubicación:** `components/expansion/terrenos/PasoMultimedia.tsx`

**Función:** Interfaz de usuario para subir archivos multimedia

**Características:**
- Upload de múltiples archivos simultáneos
- Preview de imágenes subidas
- Soporte para URLs de YouTube (videos)
- Estados de carga por categoría
- Manejo de errores con toasts
- Validación en tiempo real

**Ejemplo de uso:**
```typescript
const subirArchivos = async (files: FileList, tipo: FileCategory) => {
  for (const file of Array.from(files)) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', tipo);

    if (terrenoId) {
      formData.append('terreno_id', terrenoId);
    }

    const response = await fetch('/api/expansion/terrenos/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    // Agregar URL al estado
  }
};
```

## Supabase Storage

### Bucket: terrenos-multimedia

**Configuración:**
- Público: Sí (URLs accesibles directamente)
- Límite: 100MB por archivo
- Tipos permitidos: JPG, PNG, WebP, MP4, WebM, MOV, PDF

**Estructura de carpetas:**
```
terrenos-multimedia/
├── terrenos/
│   ├── {terreno_id}/
│   │   ├── fotos/
│   │   │   └── 1234567890_foto1.jpg
│   │   ├── videos/
│   │   │   └── 1234567890_video1.mp4
│   │   ├── planos/
│   │   │   └── 1234567890_plano.pdf
│   │   └── documentos/
│   │       └── 1234567890_doc.pdf
│   └── pendientes/
│       └── fotos/
│           └── 1234567890_temp.jpg
```

**Políticas RLS:**
1. INSERT: Solo usuarios autenticados
2. SELECT: Público (bucket público)
3. UPDATE: Solo el creador o admins
4. DELETE: Solo el creador o admins

## Migración

**Archivo:** `migrations/011_terrenos_storage_bucket.sql`

**Ejecutar:**
```sql
-- En Supabase SQL Editor
-- Copiar y pegar el contenido de la migración
```

**Crea:**
- Bucket `terrenos-multimedia`
- 4 políticas RLS para control de acceso

## Casos de Uso

### 1. Corredor sube fotos de terreno nuevo

```
1. Corredor completa Paso 1 (Información Básica)
2. Avanza a Paso 2 (Multimedia)
3. Hace clic en "Subir fotos"
4. Selecciona 5 fotos del terreno
5. Sistema sube una por una
6. Muestra preview de cada foto
7. Corredor continúa al siguiente paso
```

### 2. Admin solicita información adicional

```
1. Admin revisa terreno en estado "en_revision"
2. Marca como "info_adicional"
3. Corredor recibe notificación
4. Corredor abre el terreno (estado editable)
5. Sube fotos/documentos adicionales
6. Envía nuevamente a revisión
```

### 3. Error de upload por tamaño

```
1. Corredor intenta subir video de 150MB
2. Validador rechaza el archivo
3. Toast muestra: "El video es demasiado grande (150MB). Máximo: 100MB"
4. Corredor comprime el video
5. Reintenta con archivo de 80MB
6. Upload exitoso
```

## Troubleshooting

### El bucket no existe

**Síntoma:** Error "Bucket not found"

**Solución:**
1. Ejecutar migración `011_terrenos_storage_bucket.sql`
2. O crear manualmente en Supabase Dashboard:
   - Storage > New bucket
   - Name: `terrenos-multimedia`
   - Public: Sí
   - File size limit: 100MB

### Las imágenes no se muestran

**Síntoma:** URLs retornadas pero imágenes no cargan

**Causas posibles:**
1. Bucket no es público
2. Políticas RLS bloquean acceso
3. URL incorrecta

**Solución:**
```sql
-- Verificar que bucket es público
SELECT * FROM storage.buckets WHERE id = 'terrenos-multimedia';

-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

### Error de permisos en upload

**Síntoma:** 403 Forbidden

**Causas:**
1. Usuario no autenticado
2. Terreno no pertenece al usuario
3. Terreno en estado no editable

**Solución:**
- Verificar auth del usuario
- Verificar relación terreno-corredor
- Verificar estado del terreno

## Performance

### Optimizaciones

1. **Upload paralelo limitado:** Subir archivos de uno en uno para evitar saturar conexión
2. **Compresión en cliente:** TODO - Implementar compresión de imágenes antes de upload
3. **Lazy loading:** Cargar previews solo cuando son visibles
4. **CDN:** Supabase Storage usa CDN automáticamente

### Métricas esperadas

- Upload de foto (2MB): ~2-3 segundos
- Upload de video (50MB): ~10-15 segundos
- Generación de URL pública: <100ms

## Testing

### Test manual

1. Crear terreno en borrador
2. Subir 1 foto (JPG, 5MB)
3. Verificar preview aparece
4. Subir 1 video (MP4, 30MB)
5. Verificar card de video
6. Subir URL de YouTube
7. Verificar embed de YouTube
8. Guardar terreno
9. Verificar URLs persisten en DB

### Test de validación

```typescript
// Test 1: Archivo muy grande
const bigFile = new File([new ArrayBuffer(200 * 1024 * 1024)], 'big.mp4', { type: 'video/mp4' });
const result = validateTerrenoFile(bigFile, 'videos');
expect(result.isValid).toBe(false);

// Test 2: Tipo no permitido
const txtFile = new File(['hello'], 'test.txt', { type: 'text/plain' });
const result2 = validateTerrenoFile(txtFile, 'fotos');
expect(result2.isValid).toBe(false);

// Test 3: Archivo válido
const validFile = new File([new ArrayBuffer(5 * 1024 * 1024)], 'foto.jpg', { type: 'image/jpeg' });
const result3 = validateTerrenoFile(validFile, 'fotos');
expect(result3.isValid).toBe(true);
```

## Roadmap

### Fase 1 (Completada)
- [x] Validador de archivos
- [x] API Route básica
- [x] Integración en componente
- [x] Storage bucket
- [x] Políticas RLS

### Fase 2 (Futuro)
- [ ] Compresión automática de imágenes
- [ ] Thumbnails para previews
- [ ] Upload directo con presigned URLs (>100MB)
- [ ] Drag & drop de archivos
- [ ] Progress bar por archivo

### Fase 3 (Futuro)
- [ ] Detección de duplicados
- [ ] Backup automático
- [ ] Análisis de imágenes con IA
- [ ] Watermarking automático

## Referencias

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Next.js File Upload](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#formdata)
- [HTML File API](https://developer.mozilla.org/en-US/docs/Web/API/File)

---

**Autor:** Backend Developer Agent
**Fecha:** 18 Enero 2026
**Versión:** 1.0.0
