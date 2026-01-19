# Diagrama de Flujo: Upload de Archivos en Terrenos

## Flujo Completo (Happy Path)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO                                 │
│                                                                 │
│  1. Selecciona archivos (input file)                            │
│     - Fotos: JPG, PNG, WebP (máx 10MB c/u)                      │
│     - Videos: MP4, MOV, WebM (máx 100MB c/u)                    │
│     - Planos: PDF, JPG, PNG (máx 10MB c/u)                      │
│     - Documentos: PDF, JPG, PNG (máx 10MB c/u)                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              COMPONENTE: PasoMultimedia.tsx                     │
│                                                                 │
│  2. Handler detecta archivos                                    │
│     handleUploadFotos(e) → subirArchivos(files, 'fotos')        │
│                                                                 │
│  3. Loop: Para cada archivo                                     │
│     ┌────────────────────────────────────────────────┐          │
│     │ const formData = new FormData()                │          │
│     │ formData.append('file', file)                  │          │
│     │ formData.append('tipo', tipo)                  │          │
│     │ formData.append('terreno_id', terrenoId)       │          │
│     └────────────────────────────────────────────────┘          │
│                                                                 │
│  4. Fetch al endpoint                                           │
│     fetch('/api/expansion/terrenos/upload', {                   │
│       method: 'POST',                                           │
│       body: formData                                            │
│     })                                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│        API ROUTE: /api/expansion/terrenos/upload/route.ts       │
│                                                                 │
│  5. Verificar autenticación                                     │
│     ┌────────────────────────────────────────────────┐          │
│     │ authClient.auth.getUser()                      │          │
│     │ ❌ No user? → 401 Unauthorized                  │          │
│     │ ✅ User OK? → Continuar                         │          │
│     └────────────────────────────────────────────────┘          │
│                                                                 │
│  6. Extraer datos del FormData                                  │
│     - file: File                                                │
│     - tipo: 'fotos' | 'videos' | 'planos' | 'documentos'        │
│     - terreno_id: string                                        │
│                                                                 │
│  7. Validar archivo                                             │
│     ┌────────────────────────────────────────────────┐          │
│     │ validateTerrenoFile(file, tipo)                │          │
│     │ ❌ Inválido? → 400 Bad Request                  │          │
│     │ ✅ Válido? → Continuar                          │          │
│     └────────────────────────────────────────────────┘          │
│                                                                 │
│  8. Verificar permisos                                          │
│     ┌────────────────────────────────────────────────┐          │
│     │ a) Obtener registro del corredor               │          │
│     │    SELECT id FROM corredores_registro          │          │
│     │    WHERE usuario_id = user.id                  │          │
│     │                                                │          │
│     │ b) Obtener terreno                             │          │
│     │    SELECT * FROM terrenos_expansion            │          │
│     │    WHERE id = terreno_id                       │          │
│     │                                                │          │
│     │ c) Verificar propiedad                         │          │
│     │    terreno.corredor_id === registro.id?        │          │
│     │    ❌ No match? → 403 Forbidden                 │          │
│     │    ✅ Match? → Continuar                        │          │
│     │                                                │          │
│     │ d) Verificar estado editable                   │          │
│     │    estado IN ('borrador', 'info_adicional')?   │          │
│     │    ❌ No? → 400 Bad Request                     │          │
│     │    ✅ Sí? → Continuar                           │          │
│     └────────────────────────────────────────────────┘          │
│                                                                 │
│  9. Preparar upload                                             │
│     ┌────────────────────────────────────────────────┐          │
│     │ timestamp = Date.now()                         │          │
│     │ sanitizedName = file.name                      │          │
│     │   .replace(/[^a-zA-Z0-9._-]/g, '_')            │          │
│     │                                                │          │
│     │ storagePath =                                  │          │
│     │   `terrenos/${terrenoId}/${tipo}/`             │          │
│     │   + `${timestamp}_${sanitizedName}`            │          │
│     │                                                │          │
│     │ Ejemplo:                                       │          │
│     │ terrenos/uuid123/fotos/1234567890_casa.jpg     │          │
│     └────────────────────────────────────────────────┘          │
│                                                                 │
│  10. Subir a Supabase Storage                                   │
│     ┌────────────────────────────────────────────────┐          │
│     │ adminClient.storage                            │          │
│     │   .from('terrenos-multimedia')                 │          │
│     │   .upload(storagePath, file)                   │          │
│     │                                                │          │
│     │ ❌ Error? → 500 Internal Server Error           │          │
│     │ ✅ OK? → Continuar                              │          │
│     └────────────────────────────────────────────────┘          │
│                                                                 │
│  11. Obtener URL pública                                        │
│     ┌────────────────────────────────────────────────┐          │
│     │ const { data } = adminClient.storage           │          │
│     │   .from('terrenos-multimedia')                 │          │
│     │   .getPublicUrl(storagePath)                   │          │
│     │                                                │          │
│     │ URL generada:                                  │          │
│     │ https://xxx.supabase.co/storage/v1/object/     │          │
│     │ public/terrenos-multimedia/terrenos/...        │          │
│     └────────────────────────────────────────────────┘          │
│                                                                 │
│  12. Retornar respuesta                                         │
│     {                                                           │
│       success: true,                                            │
│       url: "https://...",                                       │
│       path: "terrenos/...",                                     │
│       tipo: "fotos",                                            │
│       message: "Archivo subido correctamente"                   │
│     }                                                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SUPABASE STORAGE                              │
│                                                                 │
│  Bucket: terrenos-multimedia                                    │
│  ├── terrenos/                                                  │
│  │   ├── uuid-123/                                              │
│  │   │   ├── fotos/                                             │
│  │   │   │   ├── 1234567890_frente.jpg ✅                        │
│  │   │   │   └── 1234567891_lateral.jpg                         │
│  │   │   ├── videos/                                            │
│  │   │   │   └── 1234567892_recorrido.mp4                       │
│  │   │   ├── planos/                                            │
│  │   │   │   └── 1234567893_plano.pdf                           │
│  │   │   └── documentos/                                        │
│  │   │       └── 1234567894_certificado.pdf                     │
│  │   └── ...                                                    │
│  └── pendientes/                                                │
│                                                                 │
│  Políticas RLS:                                                 │
│  ✅ INSERT: authenticated                                        │
│  ✅ SELECT: public                                               │
│  ✅ UPDATE: owner OR admin                                       │
│  ✅ DELETE: owner OR admin                                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              COMPONENTE: PasoMultimedia.tsx                     │
│                                                                 │
│  13. Recibe respuesta                                           │
│     const data = await response.json()                          │
│                                                                 │
│  14. Actualiza estado                                           │
│     if (data.success && data.url) {                             │
│       urls.push(data.url)                                       │
│     }                                                           │
│                                                                 │
│  15. Actualiza UI                                               │
│     actualizarDatos({                                           │
│       fotos_urls: [...datos.fotos_urls, ...urls]               │
│     })                                                          │
│                                                                 │
│  16. Toast de éxito                                             │
│     toast.success("3 foto(s) agregada(s)")                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       USUARIO VE                                │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │              │  │              │  │              │          │
│  │   [FOTO 1]   │  │   [FOTO 2]   │  │   [FOTO 3]   │          │
│  │              │  │              │  │              │          │
│  │     [X]      │  │     [X]      │  │     [X]      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ✅ Previews funcionan (URLs reales de Supabase)                │
│  ✅ Puede eliminar si es necesario                              │
│  ✅ URLs persisten en base de datos                             │
└─────────────────────────────────────────────────────────────────┘
```

## Flujos de Error

### Error 1: Archivo muy grande

```
Usuario selecciona video de 150MB
    │
    ▼
validateTerrenoFile(file, 'videos')
    │
    ├─ file.size > 100MB
    │
    ▼
return { isValid: false, error: "..." }
    │
    ▼
API retorna 400 Bad Request
    │
    ▼
Toast muestra: "El video es demasiado grande (150MB). Máximo: 100MB"
    │
    ▼
Usuario comprime el video y reintenta ✅
```

### Error 2: Terreno no pertenece al usuario

```
Usuario intenta subir a terreno de otro corredor
    │
    ▼
API verifica: terreno.corredor_id === registro.id
    │
    ├─ No match
    │
    ▼
API retorna 403 Forbidden
    │
    ▼
Toast muestra: "No tienes permiso para este terreno"
    │
    ▼
Usuario ve solo sus propios terrenos ✅
```

### Error 3: Terreno en revisión (no editable)

```
Usuario intenta subir a terreno en estado "aprobado"
    │
    ▼
API verifica: estado IN ('borrador', 'info_adicional')
    │
    ├─ Estado = 'aprobado' (no editable)
    │
    ▼
API retorna 400 Bad Request
    │
    ▼
Toast muestra: "No se pueden subir archivos en este estado"
    │
    ▼
Usuario solo puede editar borradores o terrenos con info_adicional ✅
```

### Error 4: Bucket no existe

```
Primera vez usando el sistema (bucket no creado)
    │
    ▼
API intenta upload
    │
    ├─ uploadError: "Bucket not found"
    │
    ▼
API crea bucket automáticamente
    │
    ▼
API reintenta upload
    │
    ▼
Upload exitoso ✅
```

## Diagrama de Seguridad

```
┌────────────────────────────────────────────────────────────┐
│                    CAPAS DE SEGURIDAD                      │
└────────────────────────────────────────────────────────────┘

Capa 1: Cliente (PasoMultimedia.tsx)
├─ Validación básica de tipos de archivo (accept="image/*")
└─ Feedback inmediato al usuario

Capa 2: Validador (terreno-file-validator.ts)
├─ Validación de tipo MIME
├─ Validación de tamaño
└─ Prevención de archivos corruptos

Capa 3: API Route (route.ts)
├─ Autenticación (token JWT)
├─ Autorización (verificar propiedad)
├─ Validación de estado (editable?)
└─ Sanitización de nombres de archivo

Capa 4: Supabase Storage (RLS Policies)
├─ INSERT: Solo authenticated
├─ SELECT: Public (bucket público)
├─ UPDATE/DELETE: Solo owner o admin
└─ Límite de tamaño a nivel de bucket (100MB)

Capa 5: Supabase Backend
├─ MIME type validation
├─ Virus scanning (en plan Pro)
└─ Rate limiting
```

## Timing Esperado

```
Upload de 1 foto (5MB):
├─ Validación: <10ms
├─ Upload a Supabase: ~2-3 segundos
├─ Generación URL: <100ms
└─ TOTAL: ~2-3 segundos

Upload de 1 video (50MB):
├─ Validación: <10ms
├─ Upload a Supabase: ~10-15 segundos
├─ Generación URL: <100ms
└─ TOTAL: ~10-15 segundos

Upload de 5 fotos (25MB total):
├─ Loop secuencial (no paralelo)
├─ Foto 1: 2-3s
├─ Foto 2: 2-3s
├─ Foto 3: 2-3s
├─ Foto 4: 2-3s
├─ Foto 5: 2-3s
└─ TOTAL: ~10-15 segundos
```

---

**Nota:** Este diagrama muestra el flujo completo desde que el usuario selecciona archivos hasta que ve las previews en pantalla. Cada paso incluye validaciones de seguridad y manejo de errores.
