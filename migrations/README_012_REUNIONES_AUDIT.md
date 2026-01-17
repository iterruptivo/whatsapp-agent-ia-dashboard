# MIGRACIÓN 012 - Tabla de Auditoría para Eliminación de Reuniones

**Fecha:** 16 Enero 2026
**Sesión:** 99
**Estado:** ✅ EJECUTADA

---

## Resumen

Esta migración crea la tabla `reuniones_audit` para registrar eliminaciones de reuniones con un log de auditoría mínimo.

---

## Contexto

- **Decisión del usuario:** Hard delete de reuniones (eliminación permanente)
- **Requisito:** Guardar log de auditoría mínimo con motivo obligatorio
- **Impacto:** BAJO - Solo crea tabla nueva, no modifica existentes

---

## Cambios Aplicados

### 1. Tabla `reuniones_audit`

```sql
CREATE TABLE IF NOT EXISTS reuniones_audit (
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

### 2. Índices

- `idx_reuniones_audit_reunion_id` - Buscar por reunión eliminada
- `idx_reuniones_audit_deleted_by` - Buscar por quien eliminó
- `idx_reuniones_audit_proyecto_id` - Buscar por proyecto
- `idx_reuniones_audit_deleted_at` - Buscar por fecha (DESC)

### 3. RLS Policies

- **"Administradores ven auditoría"** - Solo superadmin/admin/gerencia
- **"Sistema inserta auditoría"** - Usuarios autenticados pueden insertar

---

## Ejecución

```bash
node scripts/run-migration-generic.js migrations/012_reuniones_audit.sql
```

**Resultado:** ✅ EJECUTADA EXITOSAMENTE - 16 Enero 2026

---

## Verificación

```sql
-- Verificar tabla creada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reuniones_audit'
ORDER BY ordinal_position;

-- Verificar índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'reuniones_audit';

-- Verificar policies
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'reuniones_audit';
```

---

## Cambios Relacionados

### Backend
- **Archivo:** `lib/actions-reuniones.ts`
- **Función modificada:** `deleteReunion(reunionId, motivo)`
- **Cambio:** Agregado parámetro `motivo` obligatorio
- **Lógica:** Guarda registro en `reuniones_audit` ANTES de eliminar

### Frontend
- **Archivo creado:** `components/reuniones/EliminarReunionModal.tsx`
- **Descripción:** Modal de confirmación con textarea obligatorio para motivo
- **Validación:** Mínimo 10 caracteres

- **Archivo modificado:** `components/reuniones/ReunionesTable.tsx`
- **Cambio:** Agregado botón de eliminar (icono Trash2) solo visible para creador
- **Ubicación:** Columna "Acciones" junto a botón compartir

---

## Seguridad

- **Restricción:** Solo el creador de la reunión puede eliminarla
- **Validación en capas:**
  1. Frontend: Botón solo visible si `created_by === user.id`
  2. Backend: Server Action valida `created_by`
  3. Base de datos: RLS policy (heredada de tabla `reuniones`)

- **Auditoría completa:**
  - Guarda: reunion_id, titulo, created_by, deleted_by, motivo, proyecto_id
  - Timestamp automático con `deleted_at`

---

## Notas Importantes

1. **No hay soft delete:** La reunión se elimina completamente
2. **Eliminación en cascada:**
   - Archivo de audio/video del storage
   - Action items asociados (via CASCADE en FK)
   - Transcripción y resumen
3. **Solo queda:** Registro en `reuniones_audit`
4. **Motivo obligatorio:** Mínimo 10 caracteres

---

## Testing Recomendado

1. Login como creador de reunión
2. Ir a `/reuniones`
3. Click en botón de eliminar (icono Trash2)
4. Intentar eliminar sin motivo → Debe mostrar error
5. Escribir motivo corto (< 10 chars) → Debe mostrar error
6. Escribir motivo válido → Debe eliminar exitosamente
7. Verificar que la reunión desapareció de la lista
8. Verificar registro en `reuniones_audit`:
   ```sql
   SELECT * FROM reuniones_audit
   ORDER BY deleted_at DESC
   LIMIT 5;
   ```

---

## Rollback (Si es necesario)

```sql
DROP TABLE IF EXISTS reuniones_audit CASCADE;
```

**⚠️ ADVERTENCIA:** Esto eliminará todos los registros de auditoría.

---

**Documentado por:** Backend Developer Agent
**Revisado por:** PM
