# Instrucciones: Ejecutar Migración del Módulo de Reuniones

**Fecha:** 6 Enero 2026
**Archivo:** `20260106_create_reuniones_tables.sql`

---

## Opción 1: SQL Editor de Supabase (RECOMENDADO)

### Paso 1: Abrir SQL Editor

1. Ir a: https://supabase.com/dashboard/project/qssefegfzxxurqbzndrs
2. Click en "SQL Editor" en el menú lateral
3. Click en "New query"

### Paso 2: Copiar y Ejecutar SQL

1. Abrir el archivo: `migrations/20260106_create_reuniones_tables.sql`
2. Copiar TODO el contenido del archivo
3. Pegarlo en el SQL Editor
4. Click en "Run" (botón verde)

### Paso 3: Verificar Resultado

Deberías ver mensajes como:

```
✓ Migración completada exitosamente
✓ Tablas creadas: reuniones, reunion_action_items
✓ Índices creados para optimización de queries
✓ RLS habilitado y policies configuradas
✓ Funciones helper creadas
```

---

## Opción 2: CLI de Supabase (Avanzado)

Si tienes Supabase CLI instalado:

```bash
cd E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard
supabase db push --db-url "postgresql://postgres:1T3rrupt1v02025$@db.qssefegfzxxurqbzndrs.supabase.co:5432/postgres" --file migrations/20260106_create_reuniones_tables.sql
```

---

## Paso Crítico: Crear el Bucket de Storage

**IMPORTANTE:** Las tablas se crean con el SQL, pero el bucket debe crearse manualmente.

### Pasos:

1. Ir a: https://supabase.com/dashboard/project/qssefegfzxxurqbzndrs/storage/buckets
2. Click en "New Bucket"
3. Configurar:
   - **Name:** `reuniones-media`
   - **Public:** NO (debe estar DESMARCADO)
   - **File size limit:** 2GB (2147483648 bytes)
   - **Allowed MIME types:** Agregar uno por uno:
     - `audio/mpeg`
     - `audio/mp3`
     - `audio/wav`
     - `audio/x-wav`
     - `audio/mp4`
     - `audio/x-m4a`
     - `video/mp4`
     - `video/webm`
     - `video/quicktime`
     - `video/x-msvideo`
4. Click en "Create bucket"

### RLS Policies del Storage

Las policies del storage YA están incluidas en el SQL y se aplicarán automáticamente al bucket `reuniones-media`.

---

## Verificar que Todo Funciona

### 1. Verificar Tablas

Ejecutar en SQL Editor:

```sql
-- Verificar que las tablas existen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('reuniones', 'reunion_action_items');
```

Deberías ver 2 filas.

### 2. Verificar Índices

```sql
-- Verificar índices creados
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('reuniones', 'reunion_action_items');
```

Deberías ver ~10 índices.

### 3. Verificar RLS

```sql
-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('reuniones', 'reunion_action_items');
```

Ambas tablas deben tener `rowsecurity = true`.

### 4. Verificar Bucket

Ir a: Storage → Buckets → Debería aparecer `reuniones-media`

---

## Troubleshooting

### Error: "relation already exists"

Si ya ejecutaste la migración antes, algunas tablas pueden existir. Puedes:

1. **Opción segura:** DROP las tablas manualmente primero
2. **Opción destructiva:** Ejecutar esto ANTES del SQL principal:

```sql
DROP TABLE IF EXISTS reunion_action_items CASCADE;
DROP TABLE IF EXISTS reuniones CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_media_files() CASCADE;
DROP FUNCTION IF EXISTS get_user_reuniones(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_action_items(UUID, BOOLEAN) CASCADE;
```

### Error en Storage Policies

Si las policies del storage fallan, es porque el bucket no existe. Crear el bucket primero (ver arriba) y luego re-ejecutar solo la sección de policies:

```sql
-- Policy: INSERT
CREATE POLICY "Usuarios permitidos pueden subir"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reuniones-media'
  AND EXISTS (
    SELECT 1 FROM usuarios
    WHERE id = auth.uid()
    AND rol IN ('admin', 'gerencia', 'jefe_ventas')
  )
);

-- (... resto de policies)
```

---

## Siguiente Paso

Una vez completada la migración y creado el bucket:

✅ Base de datos lista
✅ Storage configurado
⏭️ Siguiente: Implementar las API Routes (backend-dev)

---

**Notas:**

- La migración usa `IF NOT EXISTS` para evitar errores si se ejecuta múltiples veces
- Las funciones helper están listas para usar desde el frontend
- Los comentarios en las tablas sirven como documentación
- Todas las policies de RLS están optimizadas para el esquema de roles del proyecto
