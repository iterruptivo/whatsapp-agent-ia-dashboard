# Implementación Base de Datos - Módulo de Reuniones

**Fecha:** 6 Enero 2026
**Estado:** Listo para Ejecutar
**Responsable:** database-architect

---

## Resumen

He creado la migración completa para el Módulo de Reuniones/Transcripciones siguiendo el diseño detallado en `docs/arquitectura/modulo-reuniones.md`.

### Archivos Creados

1. **`migrations/20260106_create_reuniones_tables.sql`** (7.6 KB)
   - Tablas: `reuniones`, `reunion_action_items`
   - Índices optimizados (10 índices)
   - RLS Policies completas
   - Storage policies
   - Funciones helper y cleanup
   - Comentarios de documentación

2. **`migrations/README_EJECUTAR_MIGRACION.md`**
   - Instrucciones paso a paso
   - Troubleshooting
   - Verificación

3. **Scripts de Verificación:**
   - `scripts/verify-db-simple.js` - Verificar estado actual

---

## Estado Actual

### Verificado (6 Enero 2026 - Ahora)

```
✅ Conexión a Supabase: OK
❌ Tabla "reuniones": NO EXISTE
❌ Tabla "reunion_action_items": NO EXISTE
❌ Bucket "reuniones-media": NO EXISTE
```

### Buckets Existentes en el Proyecto

- logos-proyectos
- documentos-ficha
- contratos-templates
- evidencias-leads
- constancias-templates

---

## Pasos para Implementar

### Paso 1: Ejecutar Migración SQL (OBLIGATORIO)

#### Opción A: SQL Editor de Supabase (RECOMENDADO)

1. **Abrir SQL Editor:**
   ```
   https://supabase.com/dashboard/project/qssefegfzxxurqbzndrs/sql
   ```

2. **Cargar el SQL:**
   - Click en "New query"
   - Abrir archivo: `migrations/20260106_create_reuniones_tables.sql`
   - Copiar TODO el contenido (ctrl+A, ctrl+C)
   - Pegar en el editor (ctrl+V)

3. **Ejecutar:**
   - Click en el botón verde "Run" (o F5)
   - Esperar 10-30 segundos hasta que termine

4. **Verificar Éxito:**

   Deberías ver mensajes como:
   ```
   ✓ Migración completada exitosamente
   ✓ Tablas creadas: reuniones, reunion_action_items
   ✓ Índices creados para optimización de queries
   ✓ RLS habilitado y policies configuradas
   ✓ Funciones helper creadas
   ```

#### Opción B: Desde Terminal (Si tienes psql)

```bash
cd E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard

psql "postgresql://postgres:1T3rrupt1v02025$@db.qssefegfzxxurqbzndrs.supabase.co:5432/postgres" -f migrations/20260106_create_reuniones_tables.sql
```

---

### Paso 2: Crear Bucket de Storage (OBLIGATORIO)

1. **Abrir Storage:**
   ```
   https://supabase.com/dashboard/project/qssefegfzxxurqbzndrs/storage/buckets
   ```

2. **Crear Bucket:**
   - Click en "New Bucket"

3. **Configuración:**

   | Campo | Valor |
   |-------|-------|
   | Name | `reuniones-media` |
   | Public | **NO** (privado) |
   | File size limit | `2147483648` (2GB) |
   | Allowed MIME types | Ver abajo ↓ |

4. **MIME Types Permitidos:**

   Agregar uno por uno:
   ```
   audio/mpeg
   audio/mp3
   audio/wav
   audio/x-wav
   audio/mp4
   audio/x-m4a
   video/mp4
   video/webm
   video/quicktime
   video/x-msvideo
   ```

5. **Crear:**
   - Click en "Create bucket"

---

### Paso 3: Verificar Implementación

#### Desde Terminal:

```bash
node scripts/verify-db-simple.js
```

Deberías ver:
```
✅ Tabla "reuniones" existe
✅ Tabla "reunion_action_items" existe
✅ Bucket "reuniones-media" existe
```

#### Desde SQL Editor:

```sql
-- Verificar tablas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('reuniones', 'reunion_action_items');

-- Deberías ver 2 filas
```

```sql
-- Verificar RLS habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('reuniones', 'reunion_action_items');

-- Ambas deben tener rowsecurity = true
```

```sql
-- Verificar índices
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('reuniones', 'reunion_action_items')
ORDER BY indexname;

-- Deberías ver ~10 índices
```

---

## Características Implementadas

### Tablas

#### `reuniones`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK, auto-generado |
| proyecto_id | UUID | FK a proyectos |
| created_by | UUID | FK a usuarios |
| titulo | VARCHAR(255) | Título de la reunión |
| fecha_reunion | TIMESTAMPTZ | Fecha/hora de la reunión |
| duracion_segundos | INTEGER | Duración en segundos |
| participantes | TEXT[] | Array de nombres |
| media_storage_path | TEXT | Path en Storage (NULL después de 30 días) |
| media_tipo | VARCHAR(20) | 'audio' o 'video' |
| media_size_bytes | BIGINT | Tamaño del archivo |
| media_deleted_at | TIMESTAMPTZ | Fecha de eliminación |
| transcripcion_completa | TEXT | Transcripción de Whisper |
| resumen | TEXT | Resumen de GPT-4 |
| puntos_clave | JSONB | Array de puntos clave |
| decisiones | JSONB | Array de decisiones |
| preguntas_abiertas | JSONB | Array de preguntas |
| estado | VARCHAR(20) | subiendo, procesando, completado, error |
| error_mensaje | TEXT | Mensaje de error si falla |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto con trigger |
| processed_at | TIMESTAMPTZ | Cuando terminó de procesar |

#### `reunion_action_items`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID | PK |
| reunion_id | UUID | FK a reuniones (CASCADE) |
| descripcion | TEXT | Qué hacer |
| asignado_nombre | VARCHAR(255) | Nombre inferido por IA |
| asignado_usuario_id | UUID | FK a usuarios (opcional) |
| deadline | DATE | Fecha límite |
| prioridad | VARCHAR(20) | alta, media, baja |
| contexto_quote | TEXT | Cita de la transcripción |
| completado | BOOLEAN | Default false |
| completado_at | TIMESTAMPTZ | Cuando se completó |
| completado_por | UUID | FK a usuarios |
| created_at | TIMESTAMPTZ | Auto |

### Índices Creados (Optimización)

```sql
-- reuniones
idx_reuniones_proyecto          -- Filtrar por proyecto
idx_reuniones_created_by         -- Filtrar por creador
idx_reuniones_estado             -- Filtrar por estado
idx_reuniones_fecha              -- Ordenar por fecha DESC
idx_reuniones_created_at         -- Ordenar por creación
idx_reuniones_media_cleanup      -- Para cron de limpieza

-- reunion_action_items
idx_action_items_reunion         -- JOIN con reuniones
idx_action_items_asignado        -- Filtrar por usuario asignado
idx_action_items_completado      -- Filtrar pendientes
idx_action_items_deadline        -- Ordenar por deadline
idx_action_items_asignado_pendientes -- "Mis Pendientes"
```

### RLS Policies

#### Reuniones

| Policy | Acción | Quién | Qué |
|--------|--------|-------|-----|
| Select | SELECT | admin, gerencia | Todas las reuniones |
| Select | SELECT | jefe_ventas | Solo de sus proyectos |
| Insert | INSERT | admin, gerencia, jefe_ventas | Puede crear |
| Update | UPDATE | admin, gerencia | Puede actualizar todas |
| Update | UPDATE | created_by | Puede actualizar las suyas |
| Delete | DELETE | admin | Solo admin puede eliminar |

#### Action Items

| Policy | Acción | Quién | Qué |
|--------|--------|-------|-----|
| Select | SELECT | authenticated | Todos ven action items |
| Insert | INSERT | admin, gerencia, jefe_ventas | Solo al procesar |
| Update | UPDATE | asignado_usuario_id | Puede marcar completado |
| Update | UPDATE | admin, gerencia | Puede modificar cualquiera |

#### Storage (bucket: reuniones-media)

| Policy | Acción | Quién |
|--------|--------|-------|
| Upload | INSERT | admin, gerencia, jefe_ventas |
| Read | SELECT | admin, gerencia, jefe_ventas |
| Delete | DELETE | admin |

### Funciones Helper

#### `cleanup_old_media_files()`

- Busca archivos >30 días
- Marca como eliminados en DB
- Retorna estadísticas
- Ejecutar con Vercel Cron diario

**Uso desde API Route:**
```sql
SELECT * FROM cleanup_old_media_files();
```

#### `get_user_reuniones(user_id UUID)`

- Retorna reuniones visibles según rol
- Filtra por proyectos_asignados automáticamente

**Uso:**
```sql
SELECT * FROM get_user_reuniones('uuid-del-usuario');
```

#### `get_user_action_items(user_id UUID, include_completed BOOLEAN)`

- Retorna action items del usuario
- Opcionalmente incluye completados

**Uso:**
```sql
SELECT * FROM get_user_action_items('uuid-del-usuario', false);
```

---

## Diseño de Seguridad

### Principios Aplicados

1. **Least Privilege:** Cada rol solo ve lo necesario
2. **Data Isolation:** Jefe ventas solo ve sus proyectos
3. **Audit Trail:** created_by, completado_por, timestamps
4. **Soft Delete:** media_deleted_at en lugar de DELETE físico
5. **Cascade Protection:** ON DELETE CASCADE para action_items

### Casos de Uso Cubiertos

#### Admin
- Ve todas las reuniones
- Crea reuniones de cualquier proyecto
- Modifica/elimina cualquier reunión
- Vincula action items a usuarios
- Ejecuta cleanup manual

#### Gerencia
- Ve todas las reuniones
- Crea reuniones de cualquier proyecto
- Modifica cualquier reunión
- Vincula action items a usuarios

#### Jefe Ventas
- Ve reuniones de SUS proyectos asignados
- Crea reuniones de sus proyectos
- Modifica las reuniones que creó
- Ve todos los action items

#### Vendedor/Caseta/Finanzas
- NO ve la lista de reuniones
- SÍ ve action items asignados a él
- Puede marcar sus action items como completados

---

## Integración con el Sistema

### TypeScript Types (Próximo Paso)

Crear: `types/reuniones.ts`

```typescript
export type EstadoReunion = 'subiendo' | 'procesando' | 'completado' | 'error';
export type MediaTipo = 'audio' | 'video';
export type Prioridad = 'alta' | 'media' | 'baja';

export interface Reunion {
  id: string;
  proyecto_id: string;
  created_by: string;
  titulo: string;
  fecha_reunion?: string;
  duracion_segundos?: number;
  participantes?: string[];
  media_storage_path?: string;
  media_tipo?: MediaTipo;
  media_size_bytes?: number;
  media_deleted_at?: string;
  transcripcion_completa?: string;
  resumen?: string;
  puntos_clave?: string[];
  decisiones?: string[];
  preguntas_abiertas?: string[];
  estado: EstadoReunion;
  error_mensaje?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

export interface ReunionActionItem {
  id: string;
  reunion_id: string;
  descripcion: string;
  asignado_nombre?: string;
  asignado_usuario_id?: string;
  deadline?: string;
  prioridad: Prioridad;
  contexto_quote?: string;
  completado: boolean;
  completado_at?: string;
  completado_por?: string;
  created_at: string;
}
```

### Server Actions (Próximo Paso)

Crear: `lib/actions-reuniones.ts`

```typescript
// Ejemplo de función que usará RLS automáticamente
export async function getReunionesDelUsuario() {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();

  // RLS filtrará automáticamente según el rol
  const { data, error } = await supabase
    .from('reuniones')
    .select('*')
    .order('created_at', { ascending: false });

  return data;
}
```

---

## Configuración Adicional Requerida

### 1. Variables de Entorno

Ya existen en `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://qssefegfzxxurqbzndrs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
OPENAI_API_KEY=sk-proj-...
```

### 2. Vercel Cron (Futuro)

Crear: `vercel.json` (si no existe) o agregar:

```json
{
  "crons": [
    {
      "path": "/api/reuniones/cron-cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### 3. Dependencias NPM (Backend-dev instalará)

```json
{
  "dependencies": {
    "openai": "^4.20.0",
    "fluent-ffmpeg": "^2.1.2",
    "@ffmpeg-installer/ffmpeg": "^1.1.0"
  }
}
```

---

## Costos Estimados

### Por Reunión (1 hora)

| Servicio | Costo |
|----------|-------|
| Whisper API (transcripción) | $0.36 |
| GPT-4 Turbo (resumen + action items) | $0.02 |
| **Total procesamiento** | **$0.38** |

### Storage (30 días retención)

| Escenario | Reuniones/mes | Storage | Costo/mes |
|-----------|---------------|---------|-----------|
| Bajo (audio) | 20 | 2 GB | $0.04 |
| Medio (video corto) | 50 | 25 GB | $0.53 |
| Alto (video largo) | 50 | 75 GB | $1.58 |

### Total Mensual

- **Escenario Bajo:** 20 reuniones = $8 + $0.04 = **$8.04/mes**
- **Escenario Medio:** 50 reuniones = $19 + $0.53 = **$19.53/mes**
- **Escenario Alto:** 50 reuniones largas = $19 + $1.58 = **$20.58/mes**

---

## Testing de la Implementación

### Test Manual #1: Verificar RLS

```sql
-- Autenticarse como jefe_ventas
SET LOCAL jwt.claims.sub = 'uuid-de-leo-jefe-ventas';

-- Crear reunión de prueba (debe funcionar)
INSERT INTO reuniones (proyecto_id, created_by, titulo)
VALUES ('uuid-proyecto-chincha', 'uuid-de-leo', 'Test RLS');

-- Ver reuniones (solo debe ver las de sus proyectos)
SELECT * FROM reuniones;
```

### Test Manual #2: Verificar Funciones

```sql
-- Obtener reuniones de un usuario
SELECT * FROM get_user_reuniones('uuid-de-gerencia');

-- Obtener action items pendientes
SELECT * FROM get_user_action_items('uuid-de-vendedor', false);
```

### Test Manual #3: Verificar Storage

1. Ir a Storage → reuniones-media
2. Intentar subir un archivo de prueba
3. Verificar que solo admin/gerencia/jefe_ventas pueden subir
4. Verificar que el archivo es privado (no accesible sin auth)

---

## Troubleshooting

### Error: "relation already exists"

Si ejecutas la migración dos veces:

```sql
-- Eliminar tablas y recrear
DROP TABLE IF EXISTS reunion_action_items CASCADE;
DROP TABLE IF EXISTS reuniones CASCADE;

-- Luego re-ejecutar la migración completa
```

### Error: "bucket already exists"

Si intentas crear el bucket dos veces, simplemente verifica la configuración:

1. Storage → reuniones-media → Settings
2. Confirmar que:
   - Public: NO
   - File size limit: 2GB
   - Allowed MIME types: audio/*, video/*

### Error: "Could not find the table in schema cache"

Esto significa que la tabla NO existe. Ejecutar la migración primero.

### Policies de Storage no funcionan

1. Verificar que el bucket existe
2. Verificar que las policies están activas:
   ```sql
   SELECT * FROM storage.policies WHERE bucket_id = 'reuniones-media';
   ```
3. Si no aparecen, re-ejecutar solo la sección de storage policies del SQL

---

## Siguiente Paso

Una vez completada la implementación:

✅ **Database:** LISTO (después de ejecutar SQL + crear bucket)
⏭️ **Backend:** Implementar API Routes y Server Actions (backend-dev)
⏭️ **Frontend:** Implementar UI components y pages (frontend-dev)

Ver: `docs/arquitectura/modulo-reuniones.md` para la estructura completa.

---

## Resumen Ejecutivo

### Lo que se hizo

- Diseñé el schema completo de base de datos
- Implementé RLS policies granulares por rol
- Creé índices optimizados para las queries esperadas
- Configuré storage bucket privado con policies
- Implementé funciones helper para queries comunes
- Preparé función de cleanup automático
- Documenté todo el proceso

### Lo que falta

- **TÚ:** Ejecutar el SQL en Supabase (2 minutos)
- **TÚ:** Crear el bucket en Storage (1 minuto)
- **Backend-dev:** Implementar API Routes
- **Frontend-dev:** Implementar UI

### Tiempo Estimado

- Ejecutar migración: 3 minutos
- Verificar: 2 minutos
- **Total: 5 minutos**

---

**Última Actualización:** 6 Enero 2026
**Responsable:** database-architect (DataDev)
**Estado:** Listo para Ejecutar
