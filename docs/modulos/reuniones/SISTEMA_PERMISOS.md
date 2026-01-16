# Sistema de Permisos Compartidos - Módulo Reuniones

## Descripción

Sistema avanzado de permisos que permite compartir reuniones de forma granular mediante:
- **Links públicos** (acceso anónimo con token)
- **Usuarios específicos** (por UUID)
- **Roles** (todos los usuarios de un rol)

## Migración

**Archivo:** `migrations/010_reuniones_permisos_compartir.sql`
**Fecha:** 15 Enero 2026

## Nuevos Campos en `reuniones`

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `es_publico` | BOOLEAN | FALSE | Si la reunión tiene link compartido activo |
| `link_token` | UUID | gen_random_uuid() | Token único para compartir (UNIQUE) |
| `usuarios_permitidos` | UUID[] | '{}' | Array de UUIDs de usuarios específicos |
| `roles_permitidos` | TEXT[] | '{}' | Array de roles permitidos |

## Lógica de Permisos

### PUEDE VER una reunión SI:

```sql
-- Es superadmin/admin/gerencia (ven TODO)
rol IN ('superadmin', 'admin', 'gerencia')

-- O es el creador
created_by = auth.uid()

-- O está en la lista de usuarios permitidos
auth.uid() = ANY(usuarios_permitidos)

-- O su rol está en la lista de roles permitidos
rol = ANY(roles_permitidos)

-- O tiene acceso público activo
es_publico = TRUE
```

### PUEDE CREAR una reunión SI:

```sql
-- Solo estos 3 roles
rol IN ('superadmin', 'admin', 'gerencia')
```

## Funciones Helper

### 1. Regenerar Link Token

```sql
SELECT regenerar_link_token_reunion('reunion-uuid');
-- Retorna: nuevo UUID
```

**Uso:** Cuando se compromete un link compartido.

### 2. Agregar Usuario Permitido

```sql
SELECT agregar_usuario_permitido('reunion-uuid', 'usuario-uuid');
-- Retorna: TRUE
```

**Validaciones:**
- Verifica que el usuario exista
- Evita duplicados automáticamente

### 3. Remover Usuario Permitido

```sql
SELECT remover_usuario_permitido('reunion-uuid', 'usuario-uuid');
-- Retorna: TRUE
```

### 4. Agregar Rol Permitido

```sql
SELECT agregar_rol_permitido('reunion-uuid', 'vendedor');
-- Retorna: TRUE
```

**Validaciones:**
- Valida que el rol sea válido según usuarios.rol
- Evita duplicados automáticamente

**Roles válidos:**
- admin
- gerencia
- vendedor
- jefe_ventas
- vendedor_caseta
- coordinador
- finanzas
- marketing
- superadmin
- corredor
- legal

### 5. Remover Rol Permitido

```sql
SELECT remover_rol_permitido('reunion-uuid', 'vendedor');
-- Retorna: TRUE
```

### 6. Activar/Desactivar Acceso Público

```sql
-- Activar link compartido
SELECT toggle_acceso_publico_reunion('reunion-uuid', TRUE);

-- Desactivar link compartido
SELECT toggle_acceso_publico_reunion('reunion-uuid', FALSE);
-- Retorna: el valor de activar
```

### 7. Verificar Permisos

```sql
SELECT usuario_puede_ver_reunion('reunion-uuid', 'usuario-uuid');
-- Retorna: TRUE/FALSE
```

**Uso:** Para validaciones en el backend antes de mostrar datos sensibles.

### 8. Obtener Reunión por Link Token

```sql
SELECT * FROM get_reunion_por_link_token('link-token-uuid');
```

**Importante:**
- Esta función está disponible para `anon` (acceso público)
- Solo retorna reuniones donde `es_publico = TRUE`
- Ideal para páginas públicas `/reuniones/compartido/[token]`

## Índices Creados

Para optimizar las queries de permisos:

| Índice | Tipo | Campo | Condición |
|--------|------|-------|-----------|
| `idx_reuniones_link_token` | B-tree | link_token | WHERE link_token IS NOT NULL |
| `idx_reuniones_es_publico` | B-tree | es_publico | WHERE es_publico = TRUE |
| `idx_reuniones_usuarios_permitidos` | GIN | usuarios_permitidos | - |
| `idx_reuniones_roles_permitidos` | GIN | roles_permitidos | - |

**Nota:** Los índices GIN son ideales para búsquedas en arrays (operador `= ANY`).

## Función `get_user_reuniones` Actualizada

La función ahora incluye la lógica de permisos compartidos:

```sql
SELECT * FROM get_user_reuniones('usuario-uuid');
```

**Retorna:** Todas las reuniones que el usuario puede ver según:
- Su rol (superadmin/admin/gerencia ven todo)
- Es creador
- Está en usuarios_permitidos
- Su rol está en roles_permitidos
- Reunión es pública

**Nuevos campos en response:**
- `es_publico`
- `link_token`

## Casos de Uso

### 1. Compartir con Todo el Equipo de Ventas

```typescript
// API Route o Server Action
await supabase.rpc('agregar_rol_permitido', {
  reunion_id: 'reunion-uuid',
  rol_nombre: 'vendedor'
});
```

Ahora todos los usuarios con rol `vendedor` podrán ver esta reunión.

### 2. Compartir con Usuario Específico

```typescript
// Compartir con un coordinador específico
await supabase.rpc('agregar_usuario_permitido', {
  reunion_id: 'reunion-uuid',
  usuario_id: 'uuid-del-coordinador'
});
```

### 3. Generar Link Público

```typescript
// Activar acceso público
await supabase.rpc('toggle_acceso_publico_reunion', {
  reunion_id: 'reunion-uuid',
  activar: true
});

// Obtener el link_token
const { data } = await supabase
  .from('reuniones')
  .select('link_token')
  .eq('id', 'reunion-uuid')
  .single();

// Construir URL pública
const publicUrl = `https://dashboard.ecoplaza.com/reuniones/compartido/${data.link_token}`;
```

### 4. Revocar Link Público

```typescript
// Desactivar acceso público
await supabase.rpc('toggle_acceso_publico_reunion', {
  reunion_id: 'reunion-uuid',
  activar: false
});

// O regenerar el token (invalida el link anterior)
await supabase.rpc('regenerar_link_token_reunion', {
  reunion_id: 'reunion-uuid'
});
```

### 5. Verificar Antes de Mostrar Datos

```typescript
// En un API route protegido
const { data: puedeVer } = await supabase.rpc('usuario_puede_ver_reunion', {
  reunion_id: params.reunionId,
  usuario_id: session.user.id
});

if (!puedeVer) {
  return new Response('Forbidden', { status: 403 });
}
```

## Interfaces TypeScript

```typescript
export interface Reunion {
  id: string;
  proyecto_id: string;
  created_by: string | null;

  // ... otros campos ...

  // Permisos compartidos
  es_publico: boolean;
  link_token: string | null;
  usuarios_permitidos: string[]; // Array de UUIDs
  roles_permitidos: ('admin' | 'gerencia' | 'vendedor' | ...)[];

  created_at: string;
  updated_at: string;
}
```

## Seguridad

### RLS Policies

- **SELECT:** Incluye todas las condiciones de permisos compartidos
- **INSERT:** Solo superadmin/admin/gerencia
- **UPDATE:** Admin/gerencia o creador (sin cambios)
- **DELETE:** Solo admin (sin cambios)

### Validaciones

- Los roles se validan contra el enum de `usuarios.rol`
- Los usuarios se validan que existan antes de agregar
- Los duplicados se previenen automáticamente
- Los links públicos solo funcionan si `es_publico = TRUE`

## Próximos Pasos

1. Crear UI para gestionar permisos en el detalle de reunión
2. Implementar página pública `/reuniones/compartido/[token]`
3. Agregar notificaciones cuando se comparte una reunión
4. Dashboard de "Reuniones Compartidas Conmigo"
5. Logs de acceso a reuniones compartidas (auditoría)

## Testing

### Test Manual en Supabase SQL Editor

```sql
-- 1. Crear reunión de prueba
INSERT INTO reuniones (proyecto_id, titulo, created_by)
VALUES (
  (SELECT id FROM proyectos LIMIT 1),
  'Reunión de Prueba - Permisos',
  (SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1)
)
RETURNING id, link_token;

-- 2. Activar link público
SELECT toggle_acceso_publico_reunion(
  'reunion-uuid-del-paso-1',
  TRUE
);

-- 3. Agregar rol
SELECT agregar_rol_permitido(
  'reunion-uuid-del-paso-1',
  'vendedor'
);

-- 4. Verificar permisos
SELECT usuario_puede_ver_reunion(
  'reunion-uuid-del-paso-1',
  'uuid-de-un-vendedor'
);

-- 5. Obtener por link token
SELECT * FROM get_reunion_por_link_token('link-token-del-paso-1');
```

## Rendimiento

### Estimaciones con 10,000 reuniones

| Query | Tiempo Estimado | Índice Usado |
|-------|----------------|--------------|
| Buscar por link_token | ~1ms | idx_reuniones_link_token |
| Filtrar públicas | ~2ms | idx_reuniones_es_publico |
| Buscar por usuario permitido | ~5ms | idx_reuniones_usuarios_permitidos (GIN) |
| Buscar por rol permitido | ~5ms | idx_reuniones_roles_permitidos (GIN) |
| get_user_reuniones | ~10ms | Combinación de índices |

**Nota:** Los índices GIN hacen que las búsquedas en arrays sean casi tan rápidas como búsquedas en columnas normales.

## Migración de Datos

La migración automáticamente:
- Genera `link_token` para todas las reuniones existentes
- Inicializa `usuarios_permitidos` como array vacío
- Inicializa `roles_permitidos` como array vacío
- Establece `es_publico = FALSE` para todas las existentes

**No se requiere migración manual de datos.**

## Rollback

Si necesitas revertir la migración:

```sql
-- CUIDADO: Esto eliminará los campos agregados
ALTER TABLE reuniones DROP COLUMN IF EXISTS es_publico;
ALTER TABLE reuniones DROP COLUMN IF EXISTS link_token;
ALTER TABLE reuniones DROP COLUMN IF EXISTS usuarios_permitidos;
ALTER TABLE reuniones DROP COLUMN IF EXISTS roles_permitidos;

-- Restaurar RLS policy original
-- (Copiar del archivo 20260106_create_reuniones_tables.sql)
```

## Soporte

**Documentación completa:** `migrations/010_reuniones_permisos_compartir.sql`
**Issues:** Reportar en Slack #ecoplaza-dashboard
**PM:** Claude (Database Architect)
