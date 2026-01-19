# Migración 011: Configuración de Storage para Terrenos Multimedia

## Objetivo

Configurar Supabase Storage bucket para archivos multimedia del módulo de terrenos de expansión.

## Fecha

18 Enero 2026

## Contexto

El módulo de terrenos requiere almacenamiento de:
- Fotos del terreno (obligatorio)
- Videos (opcional)
- Planos (opcional)
- Documentos adicionales (opcional)

El componente `PasoMultimedia.tsx` estaba usando URLs placeholder que no funcionaban. Esta migración configura el storage real.

## Cambios

### 1. Storage Bucket

**Nombre:** `terrenos-multimedia`

**Configuración:**
- Público: Sí
- Límite de tamaño: 100MB por archivo
- MIME types permitidos:
  - Imágenes: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`
  - Videos: `video/mp4`, `video/webm`, `video/quicktime`
  - Documentos: `application/pdf`

### 2. Políticas RLS

Se crean 4 políticas para controlar acceso:

#### INSERT
```sql
CREATE POLICY "Usuarios autenticados pueden subir archivos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'terrenos-multimedia');
```

Solo usuarios autenticados pueden subir. El endpoint API valida permisos adicionales.

#### SELECT
```sql
CREATE POLICY "Archivos públicos pueden ser leídos por todos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'terrenos-multimedia');
```

Bucket es público, cualquiera puede ver las imágenes/videos.

#### UPDATE
```sql
CREATE POLICY "Solo el creador o admin puede actualizar archivos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'terrenos-multimedia' AND (
    auth.uid() = owner OR
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('superadmin', 'admin'))
  )
);
```

Solo el creador o administradores pueden actualizar metadatos.

#### DELETE
```sql
CREATE POLICY "Solo el creador o admin puede eliminar archivos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'terrenos-multimedia' AND (
    auth.uid() = owner OR
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('superadmin', 'admin'))
  )
);
```

Solo el creador o administradores pueden eliminar archivos.

## Ejecución

### Opción 1: Supabase SQL Editor

1. Ir a Supabase Dashboard
2. SQL Editor > New Query
3. Copiar contenido de `011_terrenos_storage_bucket.sql`
4. Ejecutar
5. Verificar:
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'terrenos-multimedia';
   SELECT * FROM pg_policies WHERE tablename = 'objects';
   ```

### Opción 2: Supabase CLI

```bash
supabase db push --file migrations/011_terrenos_storage_bucket.sql
```

### Opción 3: Dashboard UI

1. Storage > New bucket
2. Name: `terrenos-multimedia`
3. Public: Sí
4. File size limit: 100MB
5. Allowed MIME types: (agregar manualmente)
6. Create bucket
7. Bucket > Policies > New policy (para cada política)

## Verificación

### Test 1: Verificar bucket existe

```sql
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'terrenos-multimedia';
```

**Resultado esperado:**
```
id                      | terrenos-multimedia
name                    | terrenos-multimedia
public                  | true
file_size_limit         | 104857600
allowed_mime_types      | {image/jpeg, image/jpg, ...}
```

### Test 2: Verificar políticas

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%terrenos%';
```

**Resultado esperado:** 4 políticas activas

### Test 3: Upload de prueba

Desde el componente PasoMultimedia.tsx:
1. Subir una foto (5MB JPG)
2. Verificar URL retornada funciona
3. Verificar imagen se ve en el componente

## Rollback

Si es necesario revertir:

```sql
-- Eliminar políticas
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir archivos" ON storage.objects;
DROP POLICY IF EXISTS "Archivos públicos pueden ser leídos por todos" ON storage.objects;
DROP POLICY IF EXISTS "Solo el creador o admin puede actualizar archivos" ON storage.objects;
DROP POLICY IF EXISTS "Solo el creador o admin puede eliminar archivos" ON storage.objects;

-- Eliminar bucket (CUIDADO: elimina todos los archivos)
DELETE FROM storage.buckets WHERE id = 'terrenos-multimedia';
```

## Notas

1. **Bucket público necesario:** Las URLs públicas permiten mostrar imágenes sin autenticación
2. **RLS protege uploads:** Aunque el bucket es público, solo usuarios autenticados pueden subir
3. **Validación en API:** El endpoint `/api/expansion/terrenos/upload` valida permisos adicionales
4. **Límite de 100MB:** Suficiente para videos cortos de demostración. Para videos largos usar presigned URLs
5. **No afecta DB:** Esta migración solo configura Storage, no modifica tablas

## Dependencias

### Requiere

- Tabla `usuarios` con campo `rol`
- Tabla `terrenos_expansion`
- Tabla `corredores_registro`

### Es requerido por

- API Route: `/api/expansion/terrenos/upload`
- Componente: `PasoMultimedia.tsx`

## Impacto

### Performance

- Upload de foto (5MB): ~2-3 segundos
- Upload de video (50MB): ~10-15 segundos
- Supabase Storage usa CDN para servir archivos

### Storage

Estimación de uso:
- 100 terrenos × 5 fotos × 2MB = 1GB
- 100 terrenos × 1 video × 30MB = 3GB
- 100 terrenos × 2 planos × 5MB = 1GB
- **Total estimado:** ~5GB para 100 terrenos

Plan gratuito de Supabase: 1GB
Plan Pro: 100GB

### Costos

- Bandwidth: $0.09/GB después de 50GB (plan Pro)
- Storage: Incluido en plan (100GB)

## Testing en Producción

Después de ejecutar:

1. Crear terreno de prueba
2. Subir 1 foto pequeña (1MB)
3. Verificar URL generada
4. Abrir URL en navegador nuevo
5. Confirmar imagen se ve correctamente
6. Eliminar terreno de prueba

## Referencias

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- Documentación: `docs/modulos/expansion/TERRENOS_MULTIMEDIA_UPLOAD.md`

---

**Autor:** Backend Developer Agent
**Versión:** 1.0.0
