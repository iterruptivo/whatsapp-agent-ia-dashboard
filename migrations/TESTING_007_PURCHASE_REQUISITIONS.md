# Testing - Migración 007: Approval Rules Fixed

## Objetivo
Verificar que el flujo completo de Purchase Requisitions funciona correctamente después de corregir el rol 'gerencia' a 'admin' en las reglas de aprobación.

---

## Pre-requisitos

### 1. Credenciales de Testing

| Rol | Email | Password | Puede Aprobar |
|-----|-------|----------|---------------|
| **Admin** | `gerencia@ecoplaza.com` | `q0#CsgL8my3$` | ✅ Hasta $10,000 |
| **Superadmin** | `gerente.ti@ecoplaza.com.pe` | `H#TJf8M%xjpTK@Vn` | ✅ Montos mayores a $10,000 |
| Jefe Ventas | `leojefeventas@ecoplaza.com` | `67hgs53899#` | ❌ Solo crear PRs |
| Vendedor | `alonso@ecoplaza.com` | `Q0KlC36J4M_y` | ❌ Solo crear PRs |

### 2. Proyecto de Testing
**IMPORTANTE:** Usar siempre **"Proyecto Pruebas"** al iniciar sesión

### 3. URL del Módulo
`/solicitudes-compra`

---

## Suite de Testing

### Test 1: Auto-aprobación (Monto < $500)

**Objetivo:** Verificar que gastos menores se auto-aprueban

**Pasos:**
1. Login como `alonso@ecoplaza.com` (vendedor)
2. Ir a `/solicitudes-compra`
3. Click "Nueva Solicitud"
4. Llenar formulario:
   - Título: `Test Auto-aprobación - Monto bajo`
   - Descripción: `Compra de útiles de oficina`
   - Categoría: `Suministros de Oficina`
   - Monto: `$250.00`
   - Urgente: No
5. Click "Crear Solicitud"

**Resultado Esperado:**
- ✅ PR creada con número `PR-2026-XXXXX`
- ✅ Estado: `approved` (auto-aprobado)
- ✅ Registro en `pr_approval_history` con approver_id = requester_id
- ✅ Mensaje: "Solicitud creada exitosamente (auto-aprobada)"

**Verificación en BD:**
```sql
SELECT
  pr_number,
  status,
  total_amount,
  (SELECT approver_role FROM pr_approval_rules WHERE id = (
    SELECT rule_id FROM pr_approvals WHERE pr_id = purchase_requisitions.id LIMIT 1
  )) as rule_used
FROM purchase_requisitions
WHERE pr_number = 'PR-2026-XXXXX';
```

---

### Test 2: Aprobación Manager ($500 - $2,000)

**Objetivo:** Verificar que montos medios requieren aprobación de admin

**Pasos:**
1. Login como `alonso@ecoplaza.com` (vendedor)
2. Crear nueva PR:
   - Título: `Test Aprobación Manager`
   - Descripción: `Compra de laptop para equipo`
   - Categoría: `Tecnología e Informática`
   - Monto: `$1,500.00`
   - Urgente: No
3. Click "Crear Solicitud"

**Resultado Esperado:**
- ✅ PR creada con estado `pending`
- ✅ Registro en `pr_approvals` con:
  - `approver_id` = (un usuario con rol `admin`)
  - `status` = `pending`
- ✅ Mensaje: "Solicitud creada, en espera de aprobación"

**Pasos de Aprobación:**
4. Logout y login como `gerencia@ecoplaza.com` (admin)
5. Ir a `/solicitudes-compra`
6. Click en tab "Pendientes de Aprobación"
7. Debe aparecer la PR creada
8. Click "Aprobar"
9. Agregar comentario: `Aprobado - Compra necesaria`
10. Confirmar

**Resultado Esperado:**
- ✅ PR pasa a estado `approved`
- ✅ Registro en `pr_approval_history` con decision `approved`
- ✅ Timestamp `approved_at` actualizado

---

### Test 3: Aprobación Director ($2,000 - $10,000)

**Objetivo:** Verificar aprobación de montos altos por admin

**Pasos:**
1. Login como `leojefeventas@ecoplaza.com` (jefe_ventas)
2. Crear nueva PR:
   - Título: `Test Aprobación Director - Monto alto`
   - Descripción: `Renovación de equipos de oficina`
   - Categoría: `Tecnología e Informática`
   - Monto: `$5,000.00`
   - Urgente: No
3. Verificar estado `pending`
4. Logout y login como `gerencia@ecoplaza.com` (admin)
5. Aprobar la solicitud

**Resultado Esperado:**
- ✅ Aprobador asignado: usuario con rol `admin`
- ✅ Flujo de aprobación completo funciona
- ✅ Estado final: `approved`

---

### Test 4: Aprobación Gerente General (> $10,000)

**Objetivo:** Verificar que montos muy altos requieren superadmin

**Pasos:**
1. Login como `gerencia@ecoplaza.com` (admin)
2. Crear nueva PR:
   - Título: `Test Aprobación Gerente General`
   - Descripción: `Compra de servidor enterprise`
   - Categoría: `Tecnología e Informática`
   - Monto: `$15,000.00`
   - Urgente: No
3. Verificar estado `pending`

**Resultado Esperado:**
- ✅ Aprobador asignado: usuario con rol `superadmin`
- ✅ **IMPORTANTE:** Admin NO puede aprobar esta PR

**Pasos de Aprobación:**
4. Logout y login como `gerente.ti@ecoplaza.com.pe` (superadmin)
5. Ir a `/solicitudes-compra` → "Pendientes de Aprobación"
6. Aprobar la solicitud

**Resultado Esperado:**
- ✅ Solo superadmin puede aprobar
- ✅ Estado final: `approved`

---

### Test 5: Solicitud Urgente (cualquier monto)

**Objetivo:** Verificar que flag "Urgente" funciona correctamente

**Pasos:**
1. Login como `alonso@ecoplaza.com` (vendedor)
2. Crear nueva PR:
   - Título: `Test Urgente - Reparación crítica`
   - Descripción: `Reparación urgente de sistema eléctrico`
   - Categoría: `Mantenimiento y Reparaciones`
   - Monto: `$800.00`
   - **Urgente: SÍ** ← Marcar checkbox
3. Verificar estado

**Resultado Esperado:**
- ✅ PR creada con `is_urgent = true`
- ✅ Regla aplicada: "Urgente (cualquier monto)" (priority 0)
- ✅ Aprobador asignado: usuario con rol `admin`
- ✅ Estado: `pending` (requiere aprobación de admin)

**Nota:** La regla "Urgente" tiene prioridad 0, lo que significa que se ejecuta
ANTES que las otras reglas si el flag `is_urgent` está activo.

---

### Test 6: Rechazo de Solicitud

**Objetivo:** Verificar flujo de rechazo

**Pasos:**
1. Login como `alonso@ecoplaza.com` (vendedor)
2. Crear nueva PR con monto `$1,200.00`
3. Logout y login como `gerencia@ecoplaza.com` (admin)
4. Ir a "Pendientes de Aprobación"
5. Click "Rechazar"
6. Agregar comentario: `Monto excesivo, reducir presupuesto`
7. Confirmar

**Resultado Esperado:**
- ✅ PR pasa a estado `rejected`
- ✅ Registro en `pr_approval_history` con decision `rejected`
- ✅ Timestamp `rejected_at` actualizado
- ✅ Comentario visible en timeline

---

## Verificación de Errores Corregidos

### Error Original
```
"No se encontró aprobador disponible con rol: gerencia"
```

### Verificación
Después de ejecutar TODOS los tests anteriores, verificar que:

- ✅ Ninguna PR generó el error de "aprobador no encontrado"
- ✅ Todas las reglas asignaron aprobadores correctamente
- ✅ Los roles `admin` y `superadmin` funcionan como esperado
- ✅ No hay referencias al rol `gerencia` en ninguna parte

---

## Queries de Verificación Rápida

### 1. Ver todas las PRs creadas en testing
```sql
SELECT
  pr_number,
  title,
  total_amount,
  status,
  is_urgent,
  created_at,
  (SELECT email FROM usuarios WHERE id = requester_id) as requester_email
FROM purchase_requisitions
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### 2. Ver aprobaciones pendientes
```sql
SELECT
  pr.pr_number,
  pr.total_amount,
  pa.status,
  u.email as approver_email,
  u.rol as approver_role,
  r.name as rule_name
FROM pr_approvals pa
JOIN purchase_requisitions pr ON pa.pr_id = pr.id
JOIN usuarios u ON pa.approver_id = u.id
JOIN pr_approval_rules r ON pa.rule_id = r.id
WHERE pa.status = 'pending'
ORDER BY pr.created_at DESC;
```

### 3. Ver historial de aprobaciones
```sql
SELECT
  pr.pr_number,
  pah.decision,
  u.email as approver_email,
  pah.comments,
  pah.approved_at,
  pah.rejected_at
FROM pr_approval_history pah
JOIN purchase_requisitions pr ON pah.pr_id = pr.id
JOIN usuarios u ON pah.approver_id = u.id
WHERE pah.created_at > NOW() - INTERVAL '1 hour'
ORDER BY pah.created_at DESC;
```

---

## Checklist de Completitud

- [ ] Test 1: Auto-aprobación (< $500) - PASS
- [ ] Test 2: Aprobación Manager ($500-$2,000) - PASS
- [ ] Test 3: Aprobación Director ($2,000-$10,000) - PASS
- [ ] Test 4: Aprobación Gerente General (> $10,000) - PASS
- [ ] Test 5: Solicitud Urgente - PASS
- [ ] Test 6: Rechazo de Solicitud - PASS
- [ ] Sin errores de "aprobador no encontrado" - PASS
- [ ] Reglas asignan aprobadores correctos - PASS
- [ ] Roles admin/superadmin funcionan - PASS

---

## Resumen de Resultados

| Test | Monto | Regla Esperada | Aprobador | Estado Final | Resultado |
|------|-------|----------------|-----------|--------------|-----------|
| 1 | $250 | Auto-aprobación | auto | approved | ⬜ |
| 2 | $1,500 | Aprobación Manager | admin | approved | ⬜ |
| 3 | $5,000 | Aprobación Director | admin | approved | ⬜ |
| 4 | $15,000 | Aprobación Gerente General | superadmin | approved | ⬜ |
| 5 | $800 (urgente) | Urgente | admin | approved | ⬜ |
| 6 | $1,200 | Aprobación Manager | admin | rejected | ⬜ |

**Fecha de Testing:** _______________
**Tester:** _______________
**Resultado Global:** ⬜ PASS / ⬜ FAIL

---

## Notas Adicionales

- Todos los tests deben ejecutarse en **Proyecto Pruebas**
- Usar las credenciales oficiales de testing (ver Pre-requisitos)
- Verificar que cada PR genere su número único (PR-2026-XXXXX)
- Revisar que los timestamps se actualicen correctamente
- Confirmar que las notificaciones (si están activas) se envían

---

**Última Actualización:** 13 Enero 2026
**Versión:** 1.0
**Relacionado con:** Migración 007 - Fix Approval Rules
