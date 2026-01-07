# Upload de Reuniones con Presigned URLs

## Problema Resuelto

Next.js App Router tiene un **límite de 10MB** para el body de las requests. Esto impedía subir reuniones de 200MB-2GB al pasar el archivo por el servidor Next.js.

## Solución: Upload Directo a Supabase Storage

El archivo se sube **directamente desde el cliente al bucket de Supabase Storage** usando presigned URLs, sin pasar por el servidor Next.js.

---

## Flujo de Upload (4 Pasos)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1. POST /api/reuniones/presigned-url
                              │    { titulo, proyectoId, fileName, fileSize, fileType }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API: presigned-url                            │
│  - Valida auth + rol (admin/gerencia/jefe_ventas)              │
│  - Valida tipo de archivo y tamaño (máx 2GB)                   │
│  - Crea registro en DB (estado: 'subiendo')                    │
│  - Genera presigned URL con Supabase Storage API               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Response: { reunionId, presignedUrl, storagePath }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                            │
│  - Usa XMLHttpRequest para subir directo a presignedUrl        │
│  - Tracking de progreso (evento 'progress')                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 2. PUT {presignedUrl}
                              │    Content-Type: {fileType}
                              │    Body: {file binary}
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              SUPABASE STORAGE (reuniones-media)                 │
│  - Recibe el archivo directamente                              │
│  - Almacena en path: reuniones/{proyectoId}/{timestamp}_{file} │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Response: 200 OK
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                            │
│  - Upload completado, notifica al servidor                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 3. POST /api/reuniones/{id}/upload-complete
                              │    { storagePath }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 API: upload-complete                            │
│  - Verifica que el archivo existe en Storage                   │
│  - Actualiza estado de 'subiendo' → 'procesando'               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Response: { success: true }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                            │
│  - Dispara procesamiento en background                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 4. POST /api/reuniones/{id}/process
                              │    (Fire and forget - no espera respuesta)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API: process                                  │
│  - Descarga archivo de Storage                                 │
│  - Transcribe con Whisper (OpenAI)                             │
│  - Genera resumen con GPT-4                                    │
│  - Extrae action items                                         │
│  - Actualiza estado → 'completado'                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementación

### 1. API: POST /api/reuniones/presigned-url

**Archivo:** `app/api/reuniones/presigned-url/route.ts`

**Input:**
```typescript
{
  titulo: string;
  proyectoId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fechaReunion?: string;
}
```

**Output:**
```typescript
{
  success: true;
  reunionId: string;        // UUID del registro creado
  presignedUrl: string;     // URL para PUT request
  storagePath: string;      // Path en Storage
}
```

**Lógica:**
1. Valida autenticación (Bearer token)
2. Verifica rol: `admin`, `gerencia`, `jefe_ventas`
3. Valida tipo de archivo y tamaño (máx 2GB)
4. Genera path único: `reuniones/{proyectoId}/{timestamp}_{fileName}`
5. Crea registro en DB con estado `'subiendo'`
6. Genera presigned URL con:
   ```typescript
   supabase.storage
     .from('reuniones-media')
     .createSignedUploadUrl(storagePath)
   ```
7. Retorna `{ reunionId, presignedUrl, storagePath }`

---

### 2. Cliente: Upload Directo con XMLHttpRequest

**Archivo:** `hooks/useReunionUpload.ts`

**Flujo:**
1. Llama a `/api/reuniones/presigned-url`
2. Recibe `presignedUrl`
3. Crea `XMLHttpRequest` con:
   - Método: `PUT`
   - URL: `presignedUrl`
   - Header: `Content-Type: {fileType}`
   - Body: `file` (binary)
4. Escucha evento `progress` para tracking
5. Al completar (status 200/201), llama a `/api/reuniones/{id}/upload-complete`

**Código clave:**
```typescript
const xhr = new XMLHttpRequest();
xhr.open('PUT', presignedUrl);
xhr.setRequestHeader('Content-Type', file.type);
// NO incluir Authorization - la URL ya tiene auth

xhr.upload.addEventListener('progress', (e) => {
  if (e.lengthComputable) {
    const percent = Math.round((e.loaded / e.total) * 100);
    setProgress(percent);
  }
});

xhr.send(file);
```

---

### 3. API: POST /api/reuniones/[id]/upload-complete

**Archivo:** `app/api/reuniones/[id]/upload-complete/route.ts`

**Input:**
```typescript
{
  storagePath: string;
}
```

**Output:**
```typescript
{
  success: true;
  message: string;
}
```

**Lógica:**
1. Verifica que la reunión existe y está en estado `'subiendo'`
2. Valida que `storagePath` coincide
3. Verifica que el archivo existe en Storage:
   ```typescript
   supabase.storage
     .from('reuniones-media')
     .list(directory, { search: fileName })
   ```
4. Actualiza estado a `'procesando'`
5. Retorna éxito

---

### 4. API: POST /api/reuniones/[id]/process

**Archivo:** `app/api/reuniones/[id]/process/route.ts`

Esta API **ya existía**. Se encarga de:
1. Descargar archivo de Storage
2. Transcribir con Whisper (OpenAI)
3. Generar resumen con GPT-4
4. Extraer action items
5. Actualizar estado a `'completado'`

**Importante:** El procesamiento continúa en background (no bloquea al cliente).

---

## Estados de Reunión

| Estado | Descripción |
|--------|-------------|
| `subiendo` | Archivo en proceso de upload a Storage |
| `procesando` | Upload completado, transcripción y análisis en curso |
| `completado` | Todo listo |
| `error` | Falló en algún paso |

---

## Validaciones

### Tamaño Máximo
- **2GB** (2,147,483,648 bytes)

### Tipos de Archivo Permitidos

**Extensiones:**
- `.mp3`, `.mp4`, `.wav`, `.m4a`, `.webm`, `.mov`, `.avi`, `.mpeg`

**MIME Types:**
- `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/x-wav`, `audio/mp4`, `audio/x-m4a`
- `video/mp4`, `video/webm`, `video/quicktime`, `video/x-msvideo`

### Roles Autorizados
- `admin`
- `gerencia`
- `jefe_ventas`

---

## Bucket de Supabase Storage

**Nombre:** `reuniones-media`

**Configuración requerida:**
- Tamaño máximo de archivo: **2GB** (2,147,483,648 bytes)
- Público: **No** (requiere autenticación)
- Presigned URLs: **Habilitado**

**Path structure:**
```
reuniones-media/
  └── reuniones/
      ├── {proyecto_id_1}/
      │   ├── 1736187263_reunion_ventas.mp3
      │   └── 1736188541_daily_standup.mp4
      └── {proyecto_id_2}/
          └── 1736189012_meeting.wav
```

---

## Ventajas de este Enfoque

### 1. Sin límite de Next.js
El archivo **no pasa por el servidor Next.js**, evitando el límite de 10MB.

### 2. Streaming eficiente
El upload es un **stream directo** cliente → Supabase Storage.

### 3. Progress tracking
XMLHttpRequest permite rastrear el progreso en tiempo real.

### 4. Cancelable
El usuario puede cancelar el upload en cualquier momento.

### 5. Escalable
Funciona con archivos de **200MB-2GB** sin problemas.

### 6. Seguro
- La presigned URL tiene **permisos limitados** (solo PUT en ese path)
- Expira después de un tiempo (configurable)
- Requiere autenticación en los endpoints de la API

---

## Troubleshooting

### Error: "Archivo no encontrado en Storage"

**Causa:** El upload a Storage falló pero el cliente no detectó el error.

**Solución:**
1. Verificar que el bucket `reuniones-media` existe
2. Verificar permisos de Storage (service role key)
3. Revisar logs de Supabase Storage

### Error: "Error al generar URL de upload"

**Causa:** Supabase no puede crear la presigned URL.

**Solución:**
1. Verificar `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`
2. Verificar que el bucket permite presigned URLs
3. Revisar logs del servidor

### Upload se queda en 100% pero nunca completa

**Causa:** La llamada a `/upload-complete` falló.

**Solución:**
1. Abrir DevTools → Network
2. Verificar respuesta de `/upload-complete`
3. Revisar logs del servidor

---

## Testing

### Test Manual (Archivo Grande)

1. Iniciar sesión como admin/gerencia
2. Ir a módulo Reuniones
3. Click "Nueva Reunión"
4. Seleccionar archivo de **200MB** (mp3/mp4)
5. Completar título y fecha
6. Click "Subir Reunión"
7. **Verificar:**
   - Barra de progreso se muestra
   - Progreso avanza de 0% → 100%
   - Estado cambia a "Procesando"
   - Modal muestra mensaje de éxito
8. **Verificar en Supabase:**
   - Archivo existe en Storage (`reuniones-media`)
   - Registro existe en tabla `reuniones` con estado `procesando`
   - Después de unos minutos, estado cambia a `completado`

### Test de Cancelación

1. Iniciar upload de archivo grande (500MB)
2. Al llegar a 30% de progreso, click "Cancelar"
3. **Verificar:**
   - Upload se detiene
   - Modal se cierra
   - Archivo **no** aparece en tabla de reuniones

---

## Archivos Modificados/Creados

| Archivo | Acción |
|---------|--------|
| `app/api/reuniones/presigned-url/route.ts` | **CREADO** |
| `app/api/reuniones/[id]/upload-complete/route.ts` | **CREADO** |
| `hooks/useReunionUpload.ts` | **MODIFICADO** |
| `lib/utils/reunion-file-validator.ts` | Ya existía (sin cambios) |
| `migrations/20260106_create_reuniones_tables.sql` | Ya incluye estado 'subiendo' |

---

## Próximos Pasos (Opcional)

### 1. Chunked Upload para archivos >25MB
Whisper API tiene límite de 25MB. Para archivos mayores, necesitamos:
- Dividir el audio en chunks
- Transcribir cada chunk
- Concatenar transcripciones

### 2. Retry Logic
Si el upload falla a mitad, permitir reanudar desde donde se quedó.

### 3. Compresión en Cliente
Comprimir el archivo antes de subir (usando Web Workers).

### 4. Notificación Push
Cuando la transcripción esté lista, enviar notificación push al usuario.

---

**Última actualización:** 6 Enero 2026
**Autor:** Backend Developer Agent
