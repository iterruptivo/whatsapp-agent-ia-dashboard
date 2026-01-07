# Test Plan: Upload de Reuniones de 2GB

## Pre-requisitos

### 1. Variables de Entorno
```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
```

### 2. Bucket de Storage Configurado
```bash
npx tsx scripts/verify-storage-bucket.ts
```

**Debe mostrar:**
```
✅ El bucket 'reuniones-media' existe.
✅ Presigned URL generada correctamente.
✅ Permisos de lectura OK.
```

### 3. Usuario de Testing
```
Email: gerencia@ecoplaza.com
Password: q0#CsgL8my3$
Rol: admin
```

---

## Test 1: Archivo Pequeño (10MB)

### Objetivo
Verificar que el flujo básico funciona con archivos pequeños.

### Pasos
1. Login como admin
2. Ir a módulo Reuniones
3. Click "Nueva Reunión"
4. Completar:
   - Título: "Test Upload 10MB"
   - Fecha: Hoy
   - Archivo: Audio/video de ~10MB
5. Click "Subir Reunión"

### Esperado
✅ Barra de progreso se muestra
✅ Progreso avanza rápidamente (0% → 100%)
✅ Estado cambia a "Procesando"
✅ Modal muestra "Reunión Subida Exitosamente"
✅ Click "Entendido" cierra el modal
✅ Tabla se actualiza con la nueva reunión

### Verificación en Supabase
1. **Storage:**
   - Ir a Storage → `reuniones-media`
   - Buscar carpeta `reuniones/{proyecto_id}/`
   - Verificar que el archivo existe

2. **Database:**
   - Ir a Table Editor → `reuniones`
   - Buscar el registro con título "Test Upload 10MB"
   - Verificar campos:
     - `estado`: "procesando" o "completado"
     - `media_storage_path`: "reuniones/{proyecto_id}/..."
     - `media_size_bytes`: ~10,000,000

---

## Test 2: Archivo Mediano (100MB)

### Objetivo
Verificar progreso en tiempo real con archivos medianos.

### Pasos
1. Repetir Test 1 con archivo de **~100MB**
2. Título: "Test Upload 100MB"

### Esperado
✅ Progreso avanza gradualmente (observable)
✅ Se puede ver el porcentaje aumentando (1%, 2%, 3%...)
✅ Tarda ~10-30 segundos (dependiendo de conexión)
✅ Completado exitosamente

### Verificación Adicional
- Abrir DevTools → Network
- Buscar request PUT a `supabase.co/storage`
- Verificar:
  - Status: 200
  - Request Method: PUT
  - Content-Type: audio/* o video/*
  - Content-Length: ~100MB

---

## Test 3: Archivo Grande (500MB)

### Objetivo
Verificar que el sistema soporta archivos grandes sin problemas.

### Pasos
1. Repetir Test 1 con archivo de **~500MB**
2. Título: "Test Upload 500MB"

### Esperado
✅ Upload inicia correctamente
✅ Progreso es estable (no se congela)
✅ Tarda varios minutos
✅ Completado exitosamente

### Verificación en DevTools
1. Network tab → Request PUT a Storage
2. Verificar que NO hay request a `/api/reuniones/upload`
3. Solo debe haber:
   - POST `/api/reuniones/presigned-url`
   - PUT `supabase.co/storage` (el archivo)
   - POST `/api/reuniones/{id}/upload-complete`
   - POST `/api/reuniones/{id}/process`

---

## Test 4: Archivo Muy Grande (2GB)

### Objetivo
Verificar el límite máximo de 2GB.

### Pasos
1. Repetir Test 1 con archivo de **~2GB**
2. Título: "Test Upload 2GB MAX"

### Esperado
✅ Upload inicia correctamente
✅ Progreso es estable
✅ Tarda 10-30 minutos (dependiendo de conexión)
✅ Completado exitosamente

### Notas
- Este test puede tardar mucho tiempo
- No cerrar el navegador durante el upload
- Verificar que la conexión a internet sea estable

---

## Test 5: Archivo Demasiado Grande (>2GB)

### Objetivo
Verificar que el sistema rechaza archivos >2GB.

### Pasos
1. Intentar subir archivo de **>2GB**
2. Título: "Test Upload >2GB (debe fallar)"

### Esperado
❌ Error antes de iniciar el upload
❌ Mensaje: "El archivo es demasiado grande (XXXMB). Máximo permitido: 2GB"
❌ Modal NO permite continuar

---

## Test 6: Tipo de Archivo Inválido

### Objetivo
Verificar validación de tipo de archivo.

### Pasos
1. Intentar subir archivo `.txt`, `.pdf`, `.docx`
2. Título: "Test Archivo Inválido"

### Esperado
❌ Error al seleccionar el archivo
❌ Mensaje: "Formato no soportado. Use: mp3, mp4, wav, m4a, webm"
❌ Archivo no se selecciona

---

## Test 7: Cancelar Upload

### Objetivo
Verificar que se puede cancelar un upload en progreso.

### Pasos
1. Iniciar upload de archivo **grande** (500MB)
2. Al llegar a **30%** de progreso, click "Cancelar"

### Esperado
✅ Upload se detiene inmediatamente
✅ Modal se cierra
✅ Tabla de reuniones NO muestra la reunión cancelada

### Verificación en Supabase
- **Storage:** Archivo puede existir parcialmente (normal)
- **Database:** El registro puede existir con estado "subiendo" (se puede limpiar manualmente)

---

## Test 8: Usuario sin Permisos

### Objetivo
Verificar que usuarios sin permisos no pueden subir reuniones.

### Pasos
1. Login como **vendedor**:
   ```
   Email: alonso@ecoplaza.com
   Password: Q0KlC36J4M_y
   ```
2. Intentar acceder a módulo Reuniones

### Esperado
❌ Módulo no aparece en el menú (no tiene acceso)

---

## Test 9: Procesamiento en Background

### Objetivo
Verificar que la transcripción y análisis se ejecutan correctamente.

### Pasos
1. Subir archivo de audio **corto** (2-3 minutos, ~10MB)
2. Título: "Test Procesamiento Background"
3. Esperar 5-10 minutos

### Esperado
✅ Estado inicial: "procesando"
✅ Después de 5-10 min: "completado"
✅ Click en la reunión muestra:
  - Transcripción completa
  - Resumen
  - Puntos clave
  - Decisiones
  - Action items

### Verificación en Supabase
1. **Database:** Tabla `reuniones`
   - `estado`: "completado"
   - `transcripcion_completa`: Texto largo
   - `resumen`: Texto resumen
   - `puntos_clave`: Array JSON
   - `processed_at`: Timestamp

2. **Database:** Tabla `reunion_action_items`
   - Registros con `reunion_id` = ID de esta reunión

---

## Test 10: Error Handling

### Objetivo
Verificar que los errores se manejan correctamente.

### Escenario 1: Sin Conexión a Internet
1. Desactivar WiFi
2. Intentar subir archivo
3. **Esperado:** Error de red

### Escenario 2: Bucket No Existe
1. Cambiar `BUCKET_NAME` a uno inexistente (en código)
2. Intentar subir archivo
3. **Esperado:** Error al generar presigned URL

### Escenario 3: OpenAI API Key Inválido
1. Cambiar `OPENAI_API_KEY` a valor inválido
2. Subir archivo (debe subir OK)
3. **Esperado:** Estado cambia a "error" durante procesamiento

---

## Checklist Final

Antes de marcar como LISTO:

- [ ] Test 1 (10MB) pasa ✅
- [ ] Test 2 (100MB) pasa ✅
- [ ] Test 3 (500MB) pasa ✅
- [ ] Test 4 (2GB) pasa ✅
- [ ] Test 5 (>2GB) rechaza ✅
- [ ] Test 6 (tipo inválido) rechaza ✅
- [ ] Test 7 (cancelar) funciona ✅
- [ ] Test 8 (sin permisos) bloquea ✅
- [ ] Test 9 (procesamiento) completa ✅
- [ ] Test 10 (errores) se manejan ✅

---

## Métricas de Performance

| Tamaño | Tiempo Upload (WiFi 100Mbps) | Tiempo Procesamiento |
|--------|------------------------------|---------------------|
| 10MB   | ~5 segundos                  | ~30 segundos        |
| 100MB  | ~10-30 segundos              | ~1-2 minutos        |
| 500MB  | ~1-3 minutos                 | ~5-10 minutos       |
| 2GB    | ~5-15 minutos                | ~20-40 minutos      |

**Nota:** Tiempos aproximados. Dependen de:
- Velocidad de conexión a internet
- Carga del servidor Supabase
- Duración del audio (para Whisper)

---

## Troubleshooting Durante Testing

### Upload se queda en 0%
**Causa:** No se generó la presigned URL.
**Solución:**
1. Abrir DevTools → Console
2. Buscar error en `/api/reuniones/presigned-url`
3. Verificar bucket existe

### Upload llega a 100% pero no completa
**Causa:** `/upload-complete` falló.
**Solución:**
1. Abrir DevTools → Network
2. Buscar POST a `/upload-complete`
3. Ver respuesta de error

### Estado "procesando" nunca cambia
**Causa:** Procesamiento en background falló.
**Solución:**
1. Verificar logs del servidor (Vercel)
2. Revisar `OPENAI_API_KEY`
3. Verificar que el archivo es válido (audio/video reproducible)

---

**Última actualización:** 6 Enero 2026
