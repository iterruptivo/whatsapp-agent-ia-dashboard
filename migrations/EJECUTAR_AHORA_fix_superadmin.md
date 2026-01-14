# FIX URGENTE: Permisos Superadmin

> **Fecha:** 14 Enero 2026
> **Problema:** Superadmin no puede asignar leads (permiso `leads:assign` faltante)
> **Solución:** Ejecutar migración `fix_superadmin_permisos_urgent.sql`
> **Tiempo:** < 1 minuto

---

## DIAGNÓSTICO

**Error reportado:**
```
No tienes permiso (leads:assign)
```

**Usuario afectado:**
- Email: gerente.ti@ecoplaza.com.pe
- Rol: superadmin
- Acción: Intentando asignar lead desde dropdown "-- Tomar Lead --"

**Causa raíz:**
El rol `superadmin` no tiene el permiso `leads:assign` (y probablemente otros) en la tabla `rol_permisos` de la base de datos.

**Contexto:**
- ENABLE_RBAC=true está activo
- El sistema RBAC está validando permisos desde BD
- Sin el permiso en BD, el sistema bloquea la acción

---

## SOLUCIÓN

### Paso 1: Conectarse a Supabase SQL Editor

1. Abrir: https://supabase.com/dashboard/project/qssefegfzxxurqbzndrs/sql/new
2. Usuario: `postgres.qssefegfzxxurqbzndrs` (auto-login desde dashboard)

### Paso 2: Ejecutar Migración

Copiar y pegar el contenido de `fix_superadmin_permisos_urgent.sql` en el SQL Editor y ejecutar.

**Alternativamente, ejecutar este query directo:**

```sql
-- Agregar TODOS los permisos a superadmin
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'superadmin'
  AND r.activo = true
  AND p.activo = true
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Verificar leads:assign
SELECT
  'leads:assign' AS permiso,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM rol_permisos rp
      JOIN roles r ON rp.rol_id = r.id
      JOIN permisos p ON rp.permiso_id = p.id
      WHERE r.nombre = 'superadmin'
        AND p.modulo = 'leads'
        AND p.accion = 'assign'
    ) THEN 'TIENE PERMISO ✓'
    ELSE 'NO TIENE PERMISO ✗'
  END AS estado;
```

### Paso 3: Verificar

**Expected output:**
```
permiso         | estado
----------------|-------------------
leads:assign    | TIENE PERMISO ✓
```

### Paso 4: Probar en la UI

1. Refresh del browser (F5)
2. Login como superadmin (gerente.ti@ecoplaza.com.pe)
3. Ir a Dashboard
4. Intentar asignar un lead desde dropdown
5. **Debe funcionar sin error**

---

## VERIFICACIÓN ADICIONAL

### Ver todos los permisos de superadmin

```sql
SELECT
  p.modulo,
  p.accion,
  p.modulo || ':' || p.accion AS permiso_completo
FROM rol_permisos rp
JOIN roles r ON rp.rol_id = r.id
JOIN permisos p ON rp.permiso_id = p.id
WHERE r.nombre = 'superadmin'
ORDER BY p.modulo, p.accion;
```

### Contar permisos

```sql
-- Total permisos en sistema
SELECT COUNT(*) AS total_permisos FROM permisos WHERE activo = true;

-- Permisos de superadmin
SELECT COUNT(*) AS permisos_superadmin
FROM rol_permisos rp
JOIN roles r ON rp.rol_id = r.id
WHERE r.nombre = 'superadmin';
```

**Deben ser iguales** (superadmin debe tener TODOS los permisos)

---

## ROLLBACK (SI ES NECESARIO)

Si la migración causa problemas:

```sql
-- Remover permisos agregados (NO RECOMENDADO)
DELETE FROM rol_permisos
WHERE rol_id = (SELECT id FROM roles WHERE nombre = 'superadmin')
  AND permiso_id IN (
    SELECT id FROM permisos WHERE modulo = 'leads' AND accion = 'assign'
  );
```

**Mejor opción:** Desactivar RBAC temporalmente

```env
# En .env.local
ENABLE_RBAC=false
```

Restart del dev server: `npm run dev`

---

## PREVENCIÓN FUTURA

### Agregar test de verificación

En `lib/permissions/check.ts`, agregar log de permisos faltantes:

```typescript
if (!hasAccess && user.rol === 'superadmin') {
  console.error('[RBAC] ⚠️ SUPERADMIN sin permiso:', `${modulo}:${accion}`);
  // Superadmin SIEMPRE debe tener todos los permisos
}
```

### Migración automática en startup

Considerar agregar un endpoint `/api/setup/rbac` que:
1. Verifique que superadmin tenga todos los permisos
2. Agregue los faltantes automáticamente
3. Log de warning si falta alguno

---

## IMPACT ANALYSIS

### Roles afectados
- `superadmin` (1 usuario: gerente.ti@ecoplaza.com.pe)
- Posiblemente `admin` también (revisar)

### Funciones afectadas
- Asignar leads desde dashboard
- Liberar leads
- Reasignar leads

### Usuarios impactados
- 1 usuario (superadmin)
- Posiblemente otros admins si tienen el mismo problema

### Severidad
- **CRÍTICA** - Bloquea operación core del sistema

### Downtime
- 0 minutos (fix en caliente)

---

## TIMELINE

| Hora | Acción | Status |
|------|--------|--------|
| 14:30 | Reportado error "No tienes permiso" | ⚠️ |
| 14:35 | Diagnóstico: RBAC habilitado, permiso faltante | 🔍 |
| 14:40 | Migración creada | ✅ |
| 14:45 | **EJECUTAR MIGRACIÓN** | ⏳ |
| 14:46 | Verificar en UI | ⏳ |
| 14:47 | Confirmar fix | ⏳ |

---

## NOTAS

1. Este fix es **idempotente** - se puede ejecutar múltiples veces sin error
2. `ON CONFLICT DO NOTHING` previene duplicados
3. No afecta otros roles ni usuarios
4. No requiere restart de servidor
5. Cambios toman efecto inmediatamente

---

## CONTACTO

Si hay problemas ejecutando la migración:
- Alonso (CTO) - alonso@ecoplaza.com
- Canal: #tech-support
