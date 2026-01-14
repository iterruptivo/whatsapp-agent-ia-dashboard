# HOTFIX: leads:assign - Resumen Ejecutivo

**Fecha:** 14 Enero 2026
**Urgencia:** CRÍTICA - Demo Blocker
**Estado:** ✅ IMPLEMENTADO - Listo para Deploy

---

## PROBLEMA

Solo el rol `coordinador` podía asignar leads. Roles como `admin`, `jefe_ventas`, `vendedor`, etc. recibían error:

```
"No tienes permiso (leads:assign)"
```

Esto bloqueaba la demo programada HOY.

---

## SOLUCIÓN

Agregamos un **bypass en código** en 2 funciones de `lib/permissions/check.ts`:

```typescript
// HOTFIX: leads:assign para TODOS los roles EXCEPTO corredor
if (modulo === 'leads' && accion === 'assign') {
  return permissions.rol !== 'corredor';
}
```

### Ubicaciones:
1. `checkPermissionInMemory()` - líneas 307-311
2. `checkPermissionLegacy()` - líneas 358-361

---

## IMPACTO

| Rol | Antes | Ahora |
|-----|-------|-------|
| superadmin | ✅ | ✅ |
| admin | ❌ | ✅ **HABILITADO** |
| jefe_ventas | ❌ | ✅ **HABILITADO** |
| vendedor | ❌ | ✅ **HABILITADO** |
| caseta | ❌ | ✅ **HABILITADO** |
| finanzas | ❌ | ✅ **HABILITADO** |
| legal | ❌ | ✅ **HABILITADO** |
| coordinador | ✅ | ✅ |
| corredor | ❌ | ❌ **CORRECTO** |

**Total:** 7 roles ahora pueden asignar leads (todos excepto corredor)

---

## VENTAJAS DE ESTA SOLUCIÓN

1. **Velocidad:** Implementado en 5 minutos
2. **Seguridad:** Bypass explícito y auditable
3. **Compatibilidad:** Funciona con RBAC enabled/disabled
4. **Sin riesgo:** No toca BD ni RLS policies
5. **Reversible:** Git revert en caso de problema

---

## ARCHIVOS MODIFICADOS

```
lib/permissions/check.ts          (2 funciones modificadas)
context/CURRENT_STATE.md          (nueva sección)
context/DECISIONS.md              (nueva decisión)
docs/sesiones/SESION_95*.md       (documentación completa)
```

---

## TESTING REQUERIDO

### Pre-Deploy
- [x] TypeScript compila sin errores
- [ ] Testing manual con 3 roles mínimo:
  - superadmin
  - admin
  - vendedor

### Checklist de Testing
Para cada rol:
1. Login
2. Ir a LeadsTable
3. Verificar botón "Asignar" visible
4. Asignar lead a vendedor
5. Verificar SUCCESS

### Testing Negativo
- [ ] Crear usuario con rol `corredor`
- [ ] Verificar que NO puede asignar leads
- [ ] Error esperado: "No tienes permiso"

---

## DEPLOYMENT

### Pasos
```bash
# 1. Commit
git add .
git commit -m "hotfix: enable leads:assign for all roles except corredor"

# 2. Push
git push origin main

# 3. Vercel auto-deploy (~2 min)
# Verificar en: https://vercel.com/dashboard

# 4. Testing en Producción
# Login con admin → asignar lead → SUCCESS
```

### Rollback (si necesario)
```bash
git revert HEAD
git push origin main
# Vercel auto-deploya versión anterior
```

---

## PLAN FUTURO

### Próxima Semana: Migración BD
1. Crear SQL: INSERT permisos en `rol_permisos`
2. Ejecutar en Supabase
3. Testing con permisos desde BD
4. **Remover este bypass del código**
5. Validación final

**Motivo:** Este bypass es temporal. Los permisos deben estar en BD para:
- Auditabilidad completa
- Gestión desde UI de admin
- Consistencia del sistema RBAC

---

## DOCUMENTACIÓN

**Completa en:**
- `docs/sesiones/SESION_95_Hotfix_Leads_Assign_Permiso.md`
- `context/DECISIONS.md` - Sección "HOTFIX: leads:assign"
- `context/CURRENT_STATE.md` - Sección "HOTFIX URGENTE"

**Decisión técnica justificada en:**
- Por qué bypass en código vs migración BD
- Por qué solo excluir corredor
- Plan de migración futuro

---

## RESULTADO ESPERADO

✅ Admin puede asignar leads
✅ Jefe de ventas puede asignar leads
✅ Vendedores pueden auto-asignarse leads disponibles
✅ Corredor NO puede asignar leads (correcto)
✅ Demo procede sin bloqueadores
✅ Sistema sigue seguro (RLS intacto)

---

**LISTO PARA DEPLOY** 🚀

**Riesgo:** BAJO
**Tiempo estimado:** 5 minutos
**Reversible:** SÍ (git revert)
