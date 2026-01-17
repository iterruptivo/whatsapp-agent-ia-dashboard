# Eliminación y Auditoría de Reuniones

**Fecha implementación:** 16 Enero 2026
**Sesión:** 99
**Tipo:** Hard delete con log de auditoría

---

## Resumen

Sistema de eliminación permanente de reuniones con confirmación obligatoria y registro de auditoría mínimo.

---

## Características

### Hard Delete

- **Eliminación permanente** de la reunión y todos sus datos
- **No hay soft delete** (no se marca como eliminado, se borra de la BD)
- **Cascada automática** elimina:
  - Action items relacionados
  - Archivo de audio/video del storage
  - Transcripción y resumen

### Auditoría

- **Registro obligatorio** en tabla `reuniones_audit`
- **Motivo obligatorio** proporcionado por el usuario (mínimo 10 caracteres)
- **Datos guardados:**
  - ID de la reunión eliminada
  - Título (para identificación)
  - Creador original (`created_by`)
  - Usuario que eliminó (`deleted_by`)
  - Motivo de eliminación
  - Proyecto al que pertenecía
  - Timestamp de eliminación

---

## Control de Acceso

### Restricciones

**Solo el creador** de una reunión puede eliminarla.

### Validación en 3 capas

1. **Frontend (UI):**
   - Botón de eliminar solo visible si `reunion.created_by === user.id`
   - Función `puedeEliminar()` valida antes de mostrar botón

2. **Backend (Server Action):**
   - `deleteReunion()` valida que `user.id === reunion.created_by`
   - Error retornado: "Solo el creador puede eliminar esta reunión"

3. **Base de Datos (RLS):**
   - Política RLS en tabla `reuniones` valida permisos
   - Solo usuarios autenticados pueden insertar en `reuniones_audit`

---

## Flujo de Usuario

### Paso a Paso

1. **Usuario navega a `/reuniones`**
   - Ve lista de reuniones disponibles

2. **Identifica reunión a eliminar**
   - Solo ve botón Trash2 en reuniones que creó

3. **Click en botón Trash2**
   - Se abre modal de confirmación `EliminarReunionModal`

4. **Modal muestra:**
   - Advertencia en rojo sobre eliminación permanente
   - Lista de elementos que se eliminarán
   - Título de la reunión
   - Textarea para motivo (obligatorio)

5. **Usuario escribe motivo**
   - Mínimo 10 caracteres requeridos
   - Botón se habilita cuando hay motivo válido

6. **Click en "Eliminar Permanentemente"**
   - Loading state se muestra
   - Backend ejecuta proceso de eliminación

7. **Backend ejecuta:**
   - Guarda registro en `reuniones_audit`
   - Elimina archivo del storage
   - Elimina reunión de la BD

8. **Resultado:**
   - Modal se cierra
   - Lista de reuniones se recarga
   - Reunión ya no aparece

---

## Componentes

### `EliminarReunionModal.tsx`

**Ubicación:** `components/reuniones/EliminarReunionModal.tsx`

**Props:**
```typescript
interface EliminarReunionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reunion: {
    id: string;
    titulo: string;
  };
  onSuccess: () => void;
}
```

**Características:**
- Modal responsive con fondo semitransparente
- Header rojo con warning de acción irreversible
- Lista de elementos que se eliminarán
- Card mostrando título de la reunión
- Textarea obligatorio para motivo
- Validaciones:
  - Motivo no vacío
  - Mínimo 10 caracteres
- Botones:
  - "Cancelar" (gris)
  - "Eliminar Permanentemente" (rojo)
- Loading state durante eliminación
- Manejo de errores con banner rojo

---

## Server Actions

### `deleteReunion()`

**Ubicación:** `lib/actions-reuniones.ts`

**Firma:**
```typescript
export async function deleteReunion(
  reunionId: string,
  motivo: string
): Promise<{ success: boolean; error?: string }>
```

**Parámetros:**
- `reunionId`: UUID de la reunión a eliminar
- `motivo`: Texto del motivo (obligatorio, mínimo 10 caracteres)

**Proceso:**

1. **Validar autenticación**
   - Verifica que hay usuario autenticado

2. **Validar motivo**
   - No vacío
   - Mínimo 10 caracteres

3. **Obtener datos de reunión**
   - Verificar que existe
   - Obtener: titulo, proyecto_id, created_by, media_storage_path

4. **Validar permisos**
   - Verificar que `user.id === reunion.created_by`

5. **Guardar auditoría (PASO 1)**
   - Insert en `reuniones_audit`
   - Si falla, retornar error SIN eliminar nada

6. **Eliminar archivo (PASO 2)**
   - Remove de bucket `reuniones-media`
   - Si falla, no es crítico (continúa)

7. **Eliminar reunión (PASO 3)**
   - Delete de tabla `reuniones`
   - Cascade elimina action items

8. **Retornar éxito**

**Errores posibles:**
- "No autorizado" - Usuario no autenticado
- "El motivo de eliminación es obligatorio" - Motivo vacío
- "Reunión no encontrada" - ID inválido
- "Solo el creador puede eliminar esta reunión" - Sin permisos
- "Error al registrar auditoría de eliminación" - Fallo en insert
- Error genérico de BD

---

## Base de Datos

### Tabla `reuniones_audit`

**Creada por:** Migración `012_reuniones_audit.sql`

**Estructura:**
```sql
CREATE TABLE reuniones_audit (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reunion_id UUID NOT NULL,       -- ID de reunión eliminada
  titulo TEXT NOT NULL,            -- Título para identificación
  created_by UUID NOT NULL,        -- Quien creó la reunión
  deleted_by UUID NOT NULL,        -- Quien eliminó la reunión
  motivo TEXT NOT NULL,            -- Motivo obligatorio
  proyecto_id UUID NOT NULL,       -- Proyecto de la reunión
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices:**
- `idx_reuniones_audit_reunion_id` - Buscar por reunión
- `idx_reuniones_audit_deleted_by` - Buscar por quien eliminó
- `idx_reuniones_audit_proyecto_id` - Buscar por proyecto
- `idx_reuniones_audit_deleted_at` - Buscar por fecha (DESC)

**RLS Policies:**

1. **"Administradores ven auditoría"**
   - Tipo: SELECT
   - Usuarios: superadmin, admin, gerencia
   - Permite leer registros de auditoría

2. **"Sistema inserta auditoría"**
   - Tipo: INSERT
   - Usuarios: authenticated
   - Permite insertar registros

---

## Consultas Útiles

### Ver registros de auditoría recientes

```sql
SELECT
  ra.id,
  ra.titulo AS reunion_titulo,
  ra.motivo,
  u1.nombre AS creado_por,
  u2.nombre AS eliminado_por,
  p.nombre AS proyecto,
  ra.deleted_at
FROM reuniones_audit ra
LEFT JOIN usuarios u1 ON ra.created_by = u1.id
LEFT JOIN usuarios u2 ON ra.deleted_by = u2.id
LEFT JOIN proyectos p ON ra.proyecto_id = p.id
ORDER BY ra.deleted_at DESC
LIMIT 20;
```

### Contar eliminaciones por usuario

```sql
SELECT
  u.nombre AS usuario,
  u.rol,
  COUNT(*) AS total_eliminaciones
FROM reuniones_audit ra
JOIN usuarios u ON ra.deleted_by = u.id
GROUP BY u.id, u.nombre, u.rol
ORDER BY total_eliminaciones DESC;
```

### Eliminaciones por proyecto

```sql
SELECT
  p.nombre AS proyecto,
  COUNT(*) AS total_eliminaciones
FROM reuniones_audit ra
JOIN proyectos p ON ra.proyecto_id = p.id
GROUP BY p.id, p.nombre
ORDER BY total_eliminaciones DESC;
```

### Buscar por motivo (keyword search)

```sql
SELECT
  ra.titulo AS reunion,
  ra.motivo,
  u.nombre AS eliminado_por,
  ra.deleted_at
FROM reuniones_audit ra
JOIN usuarios u ON ra.deleted_by = u.id
WHERE ra.motivo ILIKE '%duplicada%'
ORDER BY ra.deleted_at DESC;
```

---

## Testing

### Testing Manual

**Caso 1: Eliminar como creador**

```
✅ Login con usuario creador de reunión
✅ Navegar a /reuniones
✅ Ver botón Trash2 en reunión propia
✅ Click en Trash2
✅ Modal se abre
✅ Intentar eliminar sin motivo → Error
✅ Motivo < 10 chars → Error
✅ Motivo válido → Eliminación exitosa
✅ Reunión desaparece de lista
✅ Verificar registro en reuniones_audit
```

**Caso 2: Intentar eliminar reunión ajena**

```
✅ Login con cualquier usuario
✅ Navegar a /reuniones
✅ Ver filtro "Todas las reuniones"
✅ Reuniones de otros usuarios NO muestran botón Trash2
```

**Caso 3: Verificar auditoría**

```sql
SELECT * FROM reuniones_audit
WHERE deleted_by = 'user-uuid'
ORDER BY deleted_at DESC
LIMIT 5;
```

---

## Seguridad

### Restricciones de Acceso

- Solo creadores pueden eliminar sus reuniones
- No hay bypass para administradores (decisión de diseño)
- Auditoría inmutable (solo INSERT, no UPDATE/DELETE)

### Validaciones

- Motivo obligatorio (previene eliminaciones accidentales)
- Mínimo 10 caracteres (asegura motivo significativo)
- Registro de auditoría antes de eliminar (previene pérdida de trazabilidad)

### Trazabilidad

Cada eliminación registra:
- Qué se eliminó (titulo, reunion_id)
- Quién lo creó (created_by)
- Quién lo eliminó (deleted_by)
- Por qué (motivo)
- Cuándo (deleted_at)
- Contexto (proyecto_id)

---

## Mejoras Futuras

### Posibles Features

1. **Página de auditoría** (`/admin/auditoria`)
   - Vista completa de registros
   - Filtros por fecha, usuario, proyecto
   - Export a Excel

2. **Soft delete opcional**
   - Feature flag para cambiar de hard a soft delete
   - Campo `deleted_at` en tabla `reuniones`
   - Restaurar reuniones eliminadas

3. **Notificaciones**
   - Email/WhatsApp a admin cuando se elimina reunión
   - Resumen diario de eliminaciones

4. **Políticas de retención**
   - Auto-eliminar registros de auditoría antiguos (> 1 año)
   - Archive a tabla de histórico

5. **Búsqueda avanzada**
   - Full-text search en motivo
   - Filtros combinados (fecha + usuario + proyecto)

---

## Referencias

- **Migración SQL:** `migrations/012_reuniones_audit.sql`
- **Documentación migración:** `migrations/README_012_REUNIONES_AUDIT.md`
- **Sesión:** `docs/sesiones/SESION_99_Sistema_Eliminacion_Reuniones_Auditoria.md`
- **Server Action:** `lib/actions-reuniones.ts` (función `deleteReunion()`)
- **Modal:** `components/reuniones/EliminarReunionModal.tsx`
- **Tabla:** `components/reuniones/ReunionesTable.tsx`

---

**Documentado por:** Backend Developer Agent
**Fecha:** 16 Enero 2026
