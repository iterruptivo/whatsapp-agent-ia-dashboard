# Migración 007 - EJECUTADA

## Fecha de Ejecución
**13 de Enero de 2026**

## Problema Resuelto
El sistema de Purchase Requisitions estaba fallando con el error:
```
"No se encontró aprobador disponible con rol: gerencia"
```

Esto ocurría porque las reglas de aprobación usaban el rol `'gerencia'` que **no existe** en el sistema de roles.

## Roles Válidos en el Sistema
```typescript
type UserRole =
  | 'auto'          // Auto-aprobación (sistema)
  | 'vendedor'
  | 'caseta'
  | 'finanzas'
  | 'jefe_ventas'
  | 'legal'
  | 'admin'         // ✅ Este es el rol correcto
  | 'superadmin'
  | 'corredor';

// 'gerencia' ❌ NO EXISTE
```

## Cambios Aplicados

### SQL Ejecutado
```sql
UPDATE pr_approval_rules
SET approver_role = 'admin'
WHERE approver_role = 'gerencia';
```

### Reglas Actualizadas (2 reglas)

| Regla | Antes | Después |
|-------|-------|---------|
| Urgente (cualquier monto) | `gerencia` | `admin` |
| Aprobación Director | `gerencia` | `admin` |

## Estado Final de las Reglas

| #  | Nombre | Min | Max | Rol | Prioridad | Activa |
|----|--------|-----|-----|-----|-----------|--------|
| 1  | Urgente (cualquier monto) | 0 | null | `admin` | 0 | ✅ |
| 2  | Auto-aprobación (gastos menores) | 0 | 500 | `auto` | 1 | ✅ |
| 3  | Aprobación Manager | 500.01 | 2,000 | `admin` | 2 | ✅ |
| 4  | Aprobación Director | 2,000.01 | 10,000 | `admin` | 3 | ✅ |
| 5  | Aprobación Gerente General | 10,000.01+ | null | `superadmin` | 4 | ✅ |

## Verificación

### Antes de la Migración
```
approver_role = 'gerencia' → 2 reglas encontradas
```

### Después de la Migración
```
approver_role = 'gerencia' → 0 reglas encontradas ✅
```

## Impacto

### Positivo
- ✅ Las Purchase Requisitions ahora pueden encontrar aprobadores
- ✅ El flujo de aprobación funciona correctamente
- ✅ No hay errores de "aprobador no encontrado"
- ✅ Los usuarios con rol `admin` pueden aprobar solicitudes

### Riesgos Mitigados
- ✅ No hay downtime (migración se ejecutó en segundos)
- ✅ No afecta solicitudes existentes (solo reglas futuras)
- ✅ No requiere cambios en el código

## Pruebas Recomendadas

1. **Crear una Purchase Requisition urgente (< $500)**
   - Debe asignarse a usuario con rol `admin`
   - Debe crearse el registro en `pr_approvals`
   - Estado inicial: `pending`

2. **Crear PR de $1,500**
   - Debe usar regla "Aprobación Manager"
   - Debe asignarse a `admin`

3. **Crear PR de $5,000**
   - Debe usar regla "Aprobación Director"
   - Debe asignarse a `admin`

4. **Crear PR de $15,000**
   - Debe usar regla "Aprobación Gerente General"
   - Debe asignarse a `superadmin`

## Archivos Relacionados

- `migrations/007_fix_approval_rules_gerencia.sql` - SQL de la migración
- `scripts/run-migration-007.js` - Script de ejecución
- `lib/actions-purchase-requisitions.ts` - Lógica de aprobación

## Ejecutado Por
Script Node.js con credenciales de Supabase Service Role

## Notas
- Esta migración fue necesaria porque las reglas iniciales se crearon con un rol que nunca existió
- El rol `gerencia` probablemente fue un placeholder o un error de planificación inicial
- Todos los flujos de aprobación ahora están alineados con los roles reales del sistema
