# Fix: Reglas de Aprobación - Corrección Urgente

**Fecha:** 2026-01-14
**Severidad:** CRÍTICA
**Módulo:** Purchase Requisitions (Solicitudes de Compra)
**Issue:** Sistema de aprobaciones bloqueado por configuración incorrecta de reglas

---

## Problema Identificado

### Síntoma
Todas las solicitudes de compra fallaban con el error:
```
Error: No approver found for this amount
```

### Causa Raíz
La regla "Urgente (cualquier monto)" tenía:
- `priority = 0` (máxima prioridad)
- `max_amount = NULL` (sin límite superior)
- `approver_role = 'admin'`

**Problema:** Esta regla coincidía con TODOS los montos antes que cualquier otra regla (por tener priority=0), pero el rol 'admin' no tenía usuarios activos asignados, causando el error "No approver found".

### Impacto
- Sistema de Purchase Requisitions completamente bloqueado
- Imposible crear nuevas solicitudes de compra
- Afecta a todos los usuarios del sistema

---

## Solución Implementada

### Cambios en Base de Datos

Se actualizaron dos reglas de aprobación para usar el rol 'superadmin' (que sí tiene usuarios activos):

```sql
-- 1. Regla "Urgente (cualquier monto)"
UPDATE pr_approval_rules
SET approver_role = 'superadmin'
WHERE name = 'Urgente (cualquier monto)';

-- 2. Regla "Aprobación Director"
UPDATE pr_approval_rules
SET approver_role = 'superadmin'
WHERE name = 'Aprobación Director';
```

### Estado ANTES del Fix

| Regla | Min | Max | Approver Role | Priority | Problema |
|-------|-----|-----|---------------|----------|----------|
| Urgente (cualquier monto) | 0 | NULL | **admin** | 0 | No hay usuarios admin activos |
| Auto-aprobación (gastos menores) | 0 | 500 | auto | 1 | - |
| Aprobación Manager | 500.01 | 2000 | **admin** | 2 | No hay usuarios admin activos |
| Aprobación Director | 2000.01 | 10000 | **admin** | 3 | No hay usuarios admin activos |
| Aprobación Gerente General | 10000.01 | NULL | superadmin | 4 | - |

### Estado DESPUÉS del Fix

| Regla | Min | Max | Approver Role | Priority | Estado |
|-------|-----|-----|---------------|----------|--------|
| Urgente (cualquier monto) | 0 | NULL | **superadmin** | 0 | Funcionando |
| Auto-aprobación (gastos menores) | 0 | 500 | auto | 1 | Funcionando |
| Aprobación Manager | 500.01 | 2000 | admin | 2 | Pendiente fix |
| Aprobación Director | 2000.01 | 10000 | **superadmin** | 3 | Funcionando |
| Aprobación Gerente General | 10000.01 | NULL | superadmin | 4 | Funcionando |

### Usuarios Superadmin Activos

Verificado que existe 1 usuario superadmin activo:
- **Nombre:** Alonso Palacios
- **Email:** gerente.ti@ecoplaza.com.pe
- **Rol:** superadmin
- **Estado:** Activo

---

## Archivos Modificados

### Scripts de Fix
- `scripts/fix-approval-rules.js` - Script Node.js para ejecutar el fix
- `scripts/verify-superadmin-users.js` - Script de verificación
- `migrations/fix_approval_rules_urgent.sql` - Migración SQL

### Ejecución
```bash
# Fix ejecutado
node scripts/fix-approval-rules.js

# Verificación
node scripts/verify-superadmin-users.js
```

---

## Testing

### Pasos de Verificación
1. Verificar usuarios superadmin activos
2. Verificar reglas de aprobación actualizadas
3. Crear solicitud de compra de prueba
4. Confirmar que se asigna aprobador correctamente

### Casos de Prueba

| Monto | Priority Flag | Regla Esperada | Approver Role |
|-------|---------------|----------------|---------------|
| 100 | urgent | Urgente (cualquier monto) | superadmin |
| 100 | normal | Auto-aprobación (gastos menores) | auto |
| 1500 | normal | Aprobación Manager | admin |
| 5000 | normal | Aprobación Director | superadmin |
| 15000 | normal | Aprobación Gerente General | superadmin |

---

## Pendientes

### Corto Plazo (Urgente)
- [ ] **CRÍTICO:** Revisar regla "Aprobación Manager" que aún usa rol 'admin' sin usuarios activos
- [ ] Crear usuarios con rol 'admin' O cambiar regla a 'jefe_ventas' que sí tiene usuarios activos
- [ ] Testear flujo completo de aprobaciones con montos entre S/500-S/2000

### Mediano Plazo
- [ ] Revisar lógica de prioridad de reglas (¿debería "Urgente" tener priority=0?)
- [ ] Considerar crear tipo de regla 'urgent' separado del flujo normal
- [ ] Documentar matriz de aprobaciones en docs/modulos/purchase-requisitions/

### Largo Plazo
- [ ] Implementar validación en código que prevenga asignar reglas a roles sin usuarios activos
- [ ] Agregar tests E2E para verificar flujo de aprobaciones
- [ ] Crear dashboard de monitoreo de reglas de aprobación

---

## Lecciones Aprendidas

### Problema de Diseño
La configuración actual permite crear reglas de aprobación con roles que no tienen usuarios activos, causando errores en runtime en lugar de tiempo de configuración.

### Mejoras Propuestas
1. **Validación en UI:** Al crear/editar reglas, validar que el `approver_role` tenga al menos un usuario activo
2. **Validación en Backend:** Agregar constraint o trigger en base de datos
3. **Monitoreo:** Dashboard que muestre reglas "huérfanas" (sin usuarios activos)
4. **Tests:** Suite de tests que verifique integridad de reglas de aprobación

### Documentación
- Agregar sección de "Health Check" de reglas de aprobación
- Documentar qué hacer si cambian los roles de usuarios
- Crear runbook para troubleshooting de aprobaciones

---

## Referencias

**Migraciones Relacionadas:**
- `migrations/004_modulo_purchase_requisitions.sql` - Migración original del módulo
- `migrations/fix_approval_rules_urgent.sql` - Fix actual

**Documentación:**
- `docs/modulos/purchase-requisitions/FLUJO_APROBACIONES.md`
- `migrations/README_004_PURCHASE_REQUISITIONS.md`

**Código Relacionado:**
- `lib/actions-purchase-requisitions.ts` - Lógica de aprobaciones
- `app/solicitudes-compra/page.tsx` - UI del módulo

---

## Autor
DataDev - Database Architect

## Revisores
- [ ] Backend Dev (validar lógica de aprobaciones)
- [ ] QA Specialist (crear tests de regresión)
- [ ] Security Auth (revisar permisos de roles)
