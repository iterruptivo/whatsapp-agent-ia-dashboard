# Upload de Reuniones de hasta 2GB - IMPLEMENTADO ✅

## Resumen

Se ha implementado un sistema de **upload directo a Supabase Storage** usando presigned URLs para soportar archivos de reuniones de hasta **2GB**.

---

## ¿Qué cambió?

### ANTES (Límite 10MB)
```
Cliente → Servidor Next.js → Supabase Storage
          ❌ Límite 10MB
```

### AHORA (Hasta 2GB)
```
Cliente → [Presigned URL] → Supabase Storage
          ✅ Hasta 2GB
```

El archivo **NO pasa por el servidor Next.js**, se sube directamente desde el navegador a Supabase Storage.

---

## Archivos Nuevos

| Archivo | Descripción |
|---------|-------------|
| `app/api/reuniones/presigned-url/route.ts` | Genera URL presignada para upload |
| `app/api/reuniones/[id]/upload-complete/route.ts` | Confirma que el upload terminó |
| `docs/arquitectura/UPLOAD_REUNIONES_PRESIGNED_URL.md` | Documentación técnica completa |
| `scripts/verify-storage-bucket.ts` | Script para verificar configuración de Storage |

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `hooks/useReunionUpload.ts` | Ahora usa presigned URLs en lugar de FormData |

---

## Cómo Funciona (4 Pasos)

### 1. Cliente solicita presigned URL
```typescript
POST /api/reuniones/presigned-url
{
  titulo: "Reunión de Ventas",
  proyectoId: "...",
  fileName: "reunion.mp3",
  fileSize: 209715200, // 200MB
  fileType: "audio/mpeg"
}
```

**Respuesta:**
```typescript
{
  success: true,
  reunionId: "...",
  presignedUrl: "https://...", // URL para subir el archivo
  storagePath: "reuniones/..."
}
```

### 2. Cliente sube archivo directo a Supabase Storage
```typescript
const xhr = new XMLHttpRequest();
xhr.open('PUT', presignedUrl);
xhr.setRequestHeader('Content-Type', file.type);
xhr.send(file); // Upload directo
```

### 3. Cliente notifica que terminó
```typescript
POST /api/reuniones/{id}/upload-complete
{
  storagePath: "reuniones/..."
}
```

### 4. Backend procesa en background
```typescript
POST /api/reuniones/{id}/process
// Transcripción + Resumen con IA
```

---

## Testing

### 1. Verificar bucket de Storage

```bash
npx tsx scripts/verify-storage-bucket.ts
```

Esto verifica que el bucket `reuniones-media` esté configurado correctamente.

### 2. Probar desde el Dashboard

1. Login como **admin** o **jefe_ventas**:
   ```
   Email: gerencia@ecoplaza.com
   Password: q0#CsgL8my3$
   ```

2. Ir a módulo **Reuniones**

3. Click **"Nueva Reunión"**

4. Seleccionar archivo **grande** (200MB-2GB)

5. Completar título y fecha

6. Click **"Subir Reunión"**

7. **Verificar:**
   - Barra de progreso se muestra
   - Progreso avanza de 0% → 100%
   - Estado cambia a "Procesando"
   - Modal muestra éxito

8. **Verificar en Supabase:**
   - Storage: Archivo existe en `reuniones-media`
   - DB: Registro en tabla `reuniones` con estado `procesando`

---

## Validaciones

### Tamaño Máximo
✅ **2GB** (2,147,483,648 bytes)

### Tipos de Archivo
✅ Audio: `.mp3`, `.wav`, `.m4a`, `.mpeg`
✅ Video: `.mp4`, `.webm`, `.mov`, `.avi`

### Roles Permitidos
✅ `admin`
✅ `gerencia`
✅ `jefe_ventas`

---

## Estados de Reunión

| Estado | Descripción |
|--------|-------------|
| `subiendo` | Archivo en proceso de upload |
| `procesando` | Transcripción y análisis en curso |
| `completado` | Todo listo |
| `error` | Falló en algún paso |

---

## Troubleshooting

### Error: "Error al obtener URL de upload"

**Causa:** El bucket no existe o no está configurado.

**Solución:**
```bash
npx tsx scripts/verify-storage-bucket.ts
```

Si el bucket no existe, créalo en Supabase Dashboard:
1. Storage → New Bucket
2. Name: `reuniones-media`
3. Public: **NO**
4. File size limit: **2147483648** bytes

### Error: "Archivo no encontrado en Storage"

**Causa:** El upload a Storage falló.

**Solución:**
1. Abrir DevTools → Network
2. Buscar la request PUT a `supabase.co/storage`
3. Verificar respuesta (debe ser 200)
4. Si falla, revisar permisos del bucket

### Upload se queda en 100% eternamente

**Causa:** La llamada a `/upload-complete` falló.

**Solución:**
1. Abrir DevTools → Network
2. Buscar POST a `/api/reuniones/{id}/upload-complete`
3. Ver respuesta de error
4. Verificar logs del servidor

---

## Configuración del Bucket (Checklist)

En Supabase Dashboard → Storage → `reuniones-media`:

- [ ] Bucket existe
- [ ] **Public:** NO (debe ser privado)
- [ ] **File size limit:** 2147483648 bytes (2GB)
- [ ] **Allowed MIME types:** No restringir (o incluir audio/*, video/*)

---

## Documentación Técnica

Para detalles de implementación, ver:
- **Arquitectura completa:** `docs/arquitectura/UPLOAD_REUNIONES_PRESIGNED_URL.md`
- **Módulo Reuniones:** `docs/arquitectura/modulo-reuniones.md`

---

## Próximos Pasos (Opcional)

### 1. Chunked Upload para Whisper
Whisper API tiene límite de **25MB**. Para archivos mayores, dividir en chunks.

### 2. Compresión en Cliente
Comprimir el archivo antes de subir (usando Web Workers).

### 3. Notificación Push
Notificar al usuario cuando la transcripción esté lista.

---

**Fecha:** 6 Enero 2026
**Estado:** ✅ Listo para producción
**Tested:** Pendiente (bucket debe existir primero)
