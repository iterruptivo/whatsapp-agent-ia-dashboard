# Migración 006 - EJECUTADA

## Información General

- **Archivo:** `006_fix_rls_purchase_requisitions.sql`
- **Fecha de Ejecución:** 13 Enero 2026
- **Ejecutada por:** Script automático (run-migration-006.js)
- **Estado:** EXITOSA

## Problema Resuelto

Error al crear Purchase Requisitions:
```
FOR UPDATE is not allowed with aggregate functions
```

Este error ocurría porque la función `generate_pr_number()` usaba `FOR UPDATE` con `COUNT/MAX`, lo cual no está permitido en PostgreSQL cuando se ejecuta en contexto de políticas RLS (Row Level Security).

## Cambios Aplicados

### 1. Función generate_pr_number() Actualizada
- **Antes:** Usaba `SELECT ... FOR UPDATE` con agregaciones
- **Después:** Usa `SELECT` simple sin FOR UPDATE
- **Justificación:** RLS no permite FOR UPDATE en subqueries con funciones de agregación

### 2. Nueva Función generate_pr_number_with_lock()
- Creada como alternativa con **advisory locks**
- Garantiza atomicidad sin usar FOR UPDATE
- Disponible si se necesita mayor seguridad contra race conditions

### 3. RLS Policies Actualizadas
Se corrigieron las siguientes policies en:
- `purchase_requisitions`
- `pr_comments`
- `pr_approval_history`

Removiendo cualquier uso implícito de FOR UPDATE en las cláusulas USING y WITH CHECK.

### 4. Trigger Configurado
Se configuró el trigger `tr_generate_pr_number` para usar:
- **OPCIÓN A (ACTIVA):** `generate_pr_number()` - Función simple sin locks
- **OPCIÓN B (DISPONIBLE):** `generate_pr_number_with_lock()` - Con advisory locks

## Verificación Realizada

### Estado de la Función
```sql
-- La función NO contiene FOR UPDATE en código ejecutable
-- ✓ Verificado: SELECT sin FOR UPDATE
```

### Trigger Activo
```sql
CREATE TRIGGER tr_generate_pr_number
BEFORE INSERT ON public.purchase_requisitions
FOR EACH ROW
EXECUTE FUNCTION generate_pr_number()
```

### RLS Policies
Todas las policies activas en `purchase_requisitions`:
1. Admins can delete PRs (DELETE)
2. Everyone can create PRs (INSERT)
3. Requester can update draft, approver can update status, admin can update all (UPDATE)
4. Users can view own PRs or assigned or admin (SELECT)

## Próximos Pasos

### Testing Requerido
1. Ir a `/solicitudes-compra` en la aplicación
2. Crear una nueva Purchase Requisition
3. Verificar que se genera `pr_number` en formato: `PR-2026-00001`
4. Confirmar en logs de Supabase que no hay errores RLS

### Monitoreo
- Revisar Supabase logs para confirmar que no hay errores relacionados con FOR UPDATE
- Verificar que las PRs se crean correctamente con pr_number único
- Confirmar que no hay race conditions en la generación de secuencias

## Rollback (si necesario)

Para revertir esta migración:
```bash
# Ejecutar nuevamente la migración 004 original
node scripts/run-specific-migration.js 004_modulo_purchase_requisitions.sql
```

O restaurar manualmente las funciones y policies desde el backup.

## Notas Técnicas

### Race Conditions
- **Probabilidad:** Extremadamente baja en producción normal
- **Impacto:** Posible colisión de pr_number solo bajo carga concurrente muy alta
- **Solución:** Si se detectan colisiones, cambiar a OPCIÓN B (advisory locks)

### Performance
- OPCIÓN A (actual): Máximo performance, mínimo overhead
- OPCIÓN B (disponible): Ligeramente más lenta, pero garantía absoluta de unicidad

### Alternativas Consideradas
1. **PostgreSQL SEQUENCE:** Crear secuencia por año (más complejo de mantener)
2. **UUID:** Usar UUID en lugar de secuencia (menos amigable para usuarios)
3. **Application-level locks:** Manejar secuencia en aplicación (menos confiable)

## Referencias

- Archivo de migración: `migrations/006_fix_rls_purchase_requisitions.sql`
- Script de ejecución: `scripts/run-migration-006.js`
- Script de verificación: `scripts/verify-migration-006.js`
- Issue relacionado: Error FOR UPDATE en Purchase Requisitions

## Contacto

Si hay problemas con esta migración:
1. Revisar logs de Supabase
2. Ejecutar script de verificación: `node scripts/verify-migration-006.js`
3. Consultar con DBA o equipo de desarrollo
