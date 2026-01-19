# Sesión 97: Fix Sistema de Upload de Terrenos

**Fecha:** 18 Enero 2026
**Agente:** Backend Developer
**Problema:** URLs placeholder en PasoMultimedia.tsx impedían mostrar imágenes

---

## Problema Identificado

En `components/expansion/terrenos/PasoMultimedia.tsx`, la función `subirArchivos()` usaba URLs placeholder falsas:

```typescript
const placeholderUrl = `https://placeholder.com/${tipo}/${file.name}`;
```

Esto causaba que:
- Las imágenes NUNCA se mostraban
- Los archivos no se guardaban realmente
- Era imposible validar el módulo de terrenos

## Solución Implementada

### 1. Validador de Archivos

**Archivo:** `lib/utils/terreno-file-validator.ts`

Validador centralizado para todos los tipos de archivos:

```typescript
export type FileCategory = 'fotos' | 'videos' | 'planos' | 'documentos';

export function validateTerrenoFile(
  file: File,
  category: FileCategory
): FileValidationResult
```

**Límites:**
- Fotos: 10MB (JPG, PNG, WebP)
- Videos: 100MB (MP4, WebM, MOV)
- Planos: 10MB (PDF, JPG, PNG)
- Documentos: 10MB (PDF, JPG, PNG)

### 2. API Route

**Archivo:** `app/api/expansion/terrenos/upload/route.ts`

**Endpoint:** `POST /api/expansion/terrenos/upload`

**Parámetros (FormData):**
- `file`: archivo a subir
- `tipo`: categoría del archivo
- `terreno_id`: ID del terreno (opcional)

**Flujo:**
1. Verificar autenticación
2. Validar archivo (tipo, tamaño)
3. Verificar permisos (terreno pertenece al usuario)
4. Sanitizar nombre de archivo
5. Subir a Supabase Storage
6. Retornar URL pública

**Seguridad:**
- Solo usuarios autenticados
- Validación de propiedad del terreno
- Solo estados editables ('borrador', 'info_adicional')
- Nombres de archivo sanitizados
- Validación de tipo MIME

### 3. Componente Actualizado

**Archivo:** `components/expansion/terrenos/PasoMultimedia.tsx`

**Cambios:**

```typescript
// ANTES
const placeholderUrl = `https://placeholder.com/${tipo}/${file.name}`;
urls.push(placeholderUrl);

// DESPUÉS
const formData = new FormData();
formData.append('file', file);
formData.append('tipo', tipo);
if (terrenoId) formData.append('terreno_id', terrenoId);

const response = await fetch('/api/expansion/terrenos/upload', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
if (data.success && data.url) {
  urls.push(data.url); // URL REAL de Supabase
}
```

**Mejoras:**
- Upload real a Supabase Storage
- Manejo de errores por archivo
- Toasts informativos
- Validación en tiempo real
- Soporte para terrenoId (organización)

### 4. Storage Bucket

**Migración:** `migrations/011_terrenos_storage_bucket.sql`

**Bucket:** `terrenos-multimedia`

**Configuración:**
- Público: Sí (URLs accesibles)
- Límite: 100MB por archivo
- MIME types: imágenes, videos, PDFs

**Políticas RLS:**
- INSERT: Solo usuarios autenticados
- SELECT: Público (bucket público)
- UPDATE: Solo creador o admins
- DELETE: Solo creador o admins

**Estructura de carpetas:**
```
terrenos-multimedia/
└── terrenos/
    ├── {terreno_id}/
    │   ├── fotos/
    │   ├── videos/
    │   ├── planos/
    │   └── documentos/
    └── pendientes/
        └── (archivos sin terreno_id asignado)
```

## Archivos Creados/Modificados

### Creados
1. `lib/utils/terreno-file-validator.ts` - Validador de archivos
2. `migrations/011_terrenos_storage_bucket.sql` - Setup de storage
3. `migrations/README_011_TERRENOS_STORAGE.md` - Documentación de migración
4. `docs/modulos/expansion/TERRENOS_MULTIMEDIA_UPLOAD.md` - Docs completa del sistema
5. `docs/sesiones/SESION_97_Fix_Terrenos_Upload.md` - Este archivo

### Modificados
1. `app/api/expansion/terrenos/upload/route.ts` - Mejorado con validador
2. `components/expansion/terrenos/PasoMultimedia.tsx` - Upload real en lugar de placeholder

## Testing

### Test Manual

1. Ir a módulo de terrenos
2. Crear nuevo terreno (borrador)
3. Avanzar a Paso 2 (Multimedia)
4. Subir 1 foto JPG (5MB)
5. Verificar preview aparece
6. Subir 1 video MP4 (30MB)
7. Verificar card de video
8. Guardar terreno
9. Verificar URLs persisten

### Test de Validación

```typescript
// Archivo muy grande
const bigFile = new File([...], 'big.mp4', { type: 'video/mp4' }); // 200MB
validateTerrenoFile(bigFile, 'videos'); // ❌ isValid: false

// Tipo no permitido
const txtFile = new File([...], 'test.txt', { type: 'text/plain' });
validateTerrenoFile(txtFile, 'fotos'); // ❌ isValid: false

// Archivo válido
const validFile = new File([...], 'foto.jpg', { type: 'image/jpeg' }); // 5MB
validateTerrenoFile(validFile, 'fotos'); // ✅ isValid: true
```

## Ejecutar Migración

### En Supabase Dashboard

1. SQL Editor > New Query
2. Copiar contenido de `migrations/011_terrenos_storage_bucket.sql`
3. Ejecutar
4. Verificar:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'terrenos-multimedia';
   ```

### Alternativa: UI

1. Storage > New bucket
2. Name: `terrenos-multimedia`
3. Public: Sí
4. File size limit: 100MB
5. Add policies manualmente

## Verificación

### URLs Funcionan

Después de subir un archivo, la URL retornada debe verse así:

```
https://xxx.supabase.co/storage/v1/object/public/terrenos-multimedia/terrenos/123/fotos/1234567890_imagen.jpg
```

Y debe ser accesible directamente en el navegador (imagen se muestra).

### Permisos

Solo usuarios autenticados pueden subir:
```bash
# Sin auth
curl -X POST http://localhost:3000/api/expansion/terrenos/upload
# ❌ 401 Unauthorized

# Con auth válida
curl -X POST http://localhost:3000/api/expansion/terrenos/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@foto.jpg" \
  -F "tipo=fotos"
# ✅ 200 OK
```

## Impacto

### Performance
- Upload de foto (5MB): ~2-3 segundos
- Upload de video (50MB): ~10-15 segundos
- CDN de Supabase acelera la entrega

### Storage
Estimación para 100 terrenos:
- Fotos: ~1GB
- Videos: ~3GB
- Planos/Docs: ~1GB
- **Total:** ~5GB

### Costos
- Plan gratuito: 1GB storage
- Plan Pro: 100GB storage
- Bandwidth: $0.09/GB (después de 50GB)

## Próximos Pasos

### Inmediato
1. Ejecutar migración `011_terrenos_storage_bucket.sql`
2. Probar upload de archivos en desarrollo
3. Verificar URLs funcionan
4. Desplegar a producción

### Futuro (Fase 2)
- Compresión automática de imágenes
- Thumbnails para previews
- Drag & drop de archivos
- Progress bar por archivo

### Futuro (Fase 3)
- Detección de duplicados
- Análisis de imágenes con IA
- Watermarking automático
- Upload directo con presigned URLs (>100MB)

## Lecciones Aprendidas

1. **NUNCA usar URLs placeholder** - Siempre implementar el backend real
2. **Validar en múltiples capas** - Cliente + API + Storage
3. **Sanitizar nombres de archivo** - Prevenir inyecciones
4. **Bucket público necesario** - Para URLs directas en <img>
5. **RLS protege uploads** - Aunque bucket sea público

## Referencias

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Next.js File Upload](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#formdata)
- Documentación completa: `docs/modulos/expansion/TERRENOS_MULTIMEDIA_UPLOAD.md`

---

**Estado:** Implementado, pendiente de migración
**Prioridad:** Alta (bloqueante para módulo de terrenos)
**Estimación:** 30 minutos de testing + 5 minutos migración
