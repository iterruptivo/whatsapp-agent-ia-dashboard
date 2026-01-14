# SESIÓN 92: Restricción Exportación Leads SOLO Superadmin

**Fecha:** 14 Enero 2026
**Tipo:** HOTFIX URGENTE - Seguridad de Datos
**Estado:** ✅ IMPLEMENTADO - LISTO PARA TESTING
**Prioridad:** CRÍTICA (Para demo y seguridad)

---

## PROBLEMA

Exportación de leads a Excel estaba disponible para múltiples roles:
- admin ❌
- jefe_ventas ❌

Esto representa un riesgo de seguridad de datos para la demo.

---

## REQUERIMIENTO DEL CLIENTE

> RESTRICCIÓN: Solo el rol "superadmin" puede exportar leads a Excel

**Roles que PUEDEN exportar:**
- superadmin ✅

**Roles que NO PUEDEN exportar:**
- admin ❌
- jefe_ventas ❌
- vendedor ❌
- caseta ❌
- finanzas ❌
- legal ❌
- corredor ❌
- coordinador ❌
- marketing ❌

---

## SOLUCIÓN IMPLEMENTADA

### 1. Backend - Sistema de Permisos

Agregado check especial en `lib/permissions/check.ts` para `leads:export`:

**Función checkPermissionInMemory() (líneas 313-317):**
```typescript
// RESTRICCIÓN: leads:export solo está habilitado para superadmin
// Esto es crítico para la demo - solo superadmin puede exportar leads
if (modulo === 'leads' && accion === 'export') {
  return permissions.rol === 'superadmin';
}
```

**Función checkPermissionLegacy() (líneas 369-372):**
```typescript
// RESTRICCIÓN: leads:export solo está habilitado para superadmin
if (modulo === 'leads' && accion === 'export') {
  return rol === 'superadmin';
}
```

### 2. Frontend - Componentes UI

**OperativoClient.tsx (línea 820):**
```typescript
{/* Export Button - SOLO SUPERADMIN */}
{user?.rol === 'superadmin' && (
  <button onClick={handleExportToExcel} ...>
    <Download className="w-5 h-5" />
    <span>Exportar</span>
  </button>
)}
```

**ReporteriaClient.tsx (línea 390):**
```typescript
{/* Botón exportar a la derecha - SOLO SUPERADMIN */}
{user.rol === 'superadmin' && (
  <button onClick={handleExportExcel} ...>
    <Download className="w-4 h-4" />
    {isExporting ? 'Exportando...' : 'Exportar Excel'}
  </button>
)}
```

**VendedoresMiniTable.tsx (línea 114):**
```typescript
{/* Botón exportar - SOLO SUPERADMIN */}
{sortedData.length > 0 && userRole === 'superadmin' && (
  <button onClick={handleExportToExcel} ...>
    <Download className="w-4 h-4" />
    Excel
  </button>
)}
```

**DashboardClient.tsx (línea 325):**
```typescript
<VendedoresMiniTable
  data={vendedoresLeadsData}
  title="Leads por Vendedor"
  userRole={user?.rol}  // Pasar rol para control de permisos
/>
```

---

## ARCHIVOS MODIFICADOS

### Backend
- `lib/permissions/check.ts`
  - Líneas 313-317: checkPermissionInMemory()
  - Líneas 369-372: checkPermissionLegacy()

### Frontend
- `components/dashboard/OperativoClient.tsx`
  - Línea 820: Condicional solo superadmin
- `components/reporteria/ReporteriaClient.tsx`
  - Línea 390: Condicional solo superadmin
- `components/dashboard/VendedoresMiniTable.tsx`
  - Línea 30: Agregar prop userRole
  - Línea 37: Recibir userRole
  - Línea 114: Condicional solo superadmin
- `components/dashboard/DashboardClient.tsx`
  - Línea 325: Pasar userRole al componente

### Documentación
- `context/DECISIONS.md`
  - Líneas 7-81: Nueva decisión con justificación completa
- `context/CURRENT_STATE.md`
  - Líneas 7-60: Estado actualizado con implementación

---

## IMPACTO POR ROL

| Rol | Antes | Ahora | Cambio |
|-----|-------|-------|--------|
| **superadmin** | ✅ Exportar | ✅ Exportar | Sin cambio |
| **admin** | ✅ Exportar | ❌ Bloqueado | **RESTRINGIDO** |
| **jefe_ventas** | ✅ Exportar | ❌ Bloqueado | **RESTRINGIDO** |
| **vendedor** | ❌ Sin acceso | ❌ Sin acceso | Sin cambio |
| **caseta** | ❌ Sin acceso | ❌ Sin acceso | Sin cambio |
| **otros** | ❌ Sin acceso | ❌ Sin acceso | Sin cambio |

---

## COMPONENTES AFECTADOS

### 1. Página /operativo
- **Función:** Exportar leads filtrados a Excel
- **Botón:** "Exportar" (con icono Download)
- **Ubicación:** Header de la tabla de leads
- **Archivo:** `components/dashboard/OperativoClient.tsx`

### 2. Página /reporteria
- **Función:** Exportar reporte de vendedores a Excel
- **Botón:** "Exportar Excel" (verde)
- **Ubicación:** Header de reportes
- **Archivo:** `components/reporteria/ReporteriaClient.tsx`

### 3. Dashboard Principal
- **Función:** Exportar mini tabla de vendedores
- **Botón:** "Excel" (compacto)
- **Ubicación:** Mini tabla "Leads por Vendedor"
- **Archivo:** `components/dashboard/VendedoresMiniTable.tsx`

---

## PLAN DE TESTING

### Credenciales de Testing

**PROYECTO DE PRUEBAS** (SIEMPRE USAR ESTE):

| Rol | Email | Password |
|-----|-------|----------|
| **Superadmin** | gerente.ti@ecoplaza.com.pe | H#TJf8M%xjpTK@Vn |
| Admin | gerencia@ecoplaza.com | q0#CsgL8my3$ |
| Jefe Ventas | leojefeventas@ecoplaza.com | 67hgs53899# |

### Test Case 1: Admin NO puede exportar

**Pasos:**
1. Login como admin (gerencia@ecoplaza.com)
2. Seleccionar PROYECTO PRUEBAS
3. Ir a /operativo
4. **Verificar:** Botón "Exportar" NO aparece ❌
5. Ir a /reporteria
6. **Verificar:** Botón "Exportar Excel" NO aparece ❌
7. Ir a dashboard principal (/)
8. **Verificar:** Botón "Excel" en mini tabla NO aparece ❌

**Resultado esperado:** ✅ Admin NO ve ningún botón de exportación

### Test Case 2: Jefe Ventas NO puede exportar

**Pasos:**
1. Login como jefe_ventas (leojefeventas@ecoplaza.com)
2. Seleccionar PROYECTO PRUEBAS
3. Ir a /operativo
4. **Verificar:** Botón "Exportar" NO aparece ❌
5. (Jefe ventas no tiene acceso a /reporteria ni dashboard principal)

**Resultado esperado:** ✅ Jefe ventas NO ve botón de exportación

### Test Case 3: Superadmin SÍ puede exportar

**Pasos:**
1. Login como superadmin (gerente.ti@ecoplaza.com.pe)
2. Seleccionar PROYECTO PRUEBAS
3. Ir a /operativo
4. **Verificar:** Botón "Exportar" SÍ aparece ✅
5. Click en "Exportar"
6. **Verificar:** Archivo Excel se descarga correctamente ✅
7. Ir a /reporteria
8. **Verificar:** Botón "Exportar Excel" SÍ aparece ✅
9. Click en "Exportar Excel"
10. **Verificar:** Archivo Excel se descarga correctamente ✅
11. Ir a dashboard principal (/)
12. **Verificar:** Botón "Excel" en mini tabla SÍ aparece ✅
13. Click en "Excel"
14. **Verificar:** Archivo Excel se descarga correctamente ✅

**Resultado esperado:** ✅ Superadmin ve y puede usar todos los botones de exportación

---

## VALIDACIÓN DE SEGURIDAD

### Verificar Backend

Si alguien intenta forzar la exportación mediante la función directa:

```typescript
// Esto debería fallar para admin o jefe_ventas
const canExport = await hasPermission(userId, 'leads', 'export');
// canExport === false (para admin/jefe_ventas)
// canExport === true (solo para superadmin)
```

### Verificar Frontend

Los botones NO deben aparecer en el HTML para roles sin permiso:

```bash
# Como admin, inspeccionar elemento
# Buscar: "Exportar" o "Excel"
# Resultado esperado: NO encontrado
```

---

## ROLLBACK (Si es necesario)

### Revertir Backend

En `lib/permissions/check.ts`, remover líneas:

```typescript
// REMOVER líneas 313-317 en checkPermissionInMemory()
// REMOVER líneas 369-372 en checkPermissionLegacy()
```

### Revertir Frontend

Cambiar condicionales de:
```typescript
{user?.rol === 'superadmin' && ...}
```

A:
```typescript
{(user?.rol === 'admin' || user?.rol === 'jefe_ventas') && ...}
```

---

## CONSIDERACIONES DE SEGURIDAD

### ¿Por qué esta restricción es importante?

1. **Control de datos:** Solo superadmin tiene visibilidad completa de todos los leads
2. **Auditabilidad:** Exportaciones limitadas a un solo rol facilita auditoría
3. **Prevención de fugas:** Reduce riesgo de exportación masiva no autorizada
4. **Compliance:** Alineado con mejores prácticas de seguridad de datos

### ¿Qué pasa si admin necesita exportar?

**Opciones:**
1. Solicitar al superadmin que haga la exportación
2. Crear rol temporal de "auditor" con permisos específicos
3. Usar sistema de solicitudes formales para exportaciones

---

## DECISIONES TÉCNICAS

### ¿Por qué doble capa (Backend + Frontend)?

1. **Backend (check.ts):** Seguridad real - previene bypass
2. **Frontend (componentes):** UX - no mostrar opciones no disponibles

### ¿Por qué no usar tabla de permisos?

- Simplicidad y velocidad de implementación
- No requiere migración de BD
- Fácil de auditar y modificar
- Funciona con RBAC enabled o disabled

### ¿Por qué hardcodear en lugar de configurar?

- Requerimiento específico y crítico del cliente
- No necesita ser configurable (siempre solo superadmin)
- Reduce superficie de ataque (no se puede modificar por UI)

---

## PRÓXIMOS PASOS

1. ✅ Implementación completa
2. ⏳ Testing manual (3 casos de prueba)
3. ⏳ Validación con cliente
4. ⏳ Deploy a producción (si aprueba)

---

## RECURSOS

**Documentación relacionada:**
- `context/DECISIONS.md` - Justificación de la decisión
- `context/CURRENT_STATE.md` - Estado actual del proyecto
- `docs/rbac/MIGRACION_SERVER_ACTIONS.md` - Sistema RBAC completo

**Archivos clave:**
- `lib/permissions/check.ts` - Sistema de permisos
- `lib/permissions/types.ts` - Tipos y configuración RBAC

**Credenciales de testing:**
- Ver `CLAUDE.md` sección "CREDENCIALES DE TESTING"

---

**Sesión completada:** ✅
**Tiempo estimado:** 15 minutos
**Complejidad:** Media (modificación en múltiples capas)
**Riesgo:** Bajo (solo afecta exportaciones, no funcionalidad core)
