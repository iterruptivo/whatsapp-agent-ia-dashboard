# Verificación Rápida - Hotfix leads:assign

**Para:** Testing antes de deploy
**Tiempo:** 5 minutos

---

## CHECK 1: Código Modificado

### Archivo: `lib/permissions/check.ts`

**Líneas 307-311** (función `checkPermissionInMemory`):
```typescript
// HOTFIX: leads:assign está habilitado para TODOS los roles EXCEPTO corredor
// Esto permite asignación de leads para demo y operación normal
if (modulo === 'leads' && accion === 'assign') {
  return permissions.rol !== 'corredor';
}
```

**Líneas 358-361** (función `checkPermissionLegacy`):
```typescript
// HOTFIX: leads:assign está habilitado para TODOS los roles EXCEPTO corredor
if (modulo === 'leads' && accion === 'assign' && rol !== 'corredor') {
  return true;
}
```

✅ Verificar que estos cambios existen en el archivo

---

## CHECK 2: TypeScript Compila

```bash
cd E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard
npx tsc --noEmit
```

✅ Sin errores = LISTO

---

## CHECK 3: Testing Manual (MÍNIMO)

### Credenciales (Proyecto Pruebas - ver CLAUDE.md)

| Rol | Email | Password |
|-----|-------|----------|
| superadmin | gerente.ti@ecoplaza.com.pe | H#TJf8M%xjpTK@Vn |
| admin | gerencia@ecoplaza.com | q0#CsgL8my3$ |
| vendedor | alonso@ecoplaza.com | Q0KlC36J4M_y |

### Pasos por Rol

1. **Login**
2. **Ir a dashboard** (/)
3. **Ver LeadsTable**
4. **Buscar lead sin asignar** (columna "Vendedor" = vacío)
5. **Click en botón "Asignar"**
6. **Seleccionar vendedor**
7. **Confirmar**
8. **Verificar SUCCESS** (toast verde + columna actualizada)

### Testing Negativo (OPCIONAL)

**No existe usuario corredor en proyecto pruebas**
- Si existe, verificar que botón "Asignar" NO aparece o da error

---

## CHECK 4: Git Status

```bash
git status
```

**Archivos modificados esperados:**
```
M lib/permissions/check.ts
M context/CURRENT_STATE.md
M context/DECISIONS.md
M context/NEXT_STEPS.md
?? docs/sesiones/SESION_95_Hotfix_Leads_Assign_Permiso.md
?? HOTFIX_LEADS_ASSIGN_RESUMEN.md
?? VERIFICACION_RAPIDA_HOTFIX.md
```

✅ Verificar que todos estos archivos están listos

---

## CHECK 5: Commit y Push

```bash
# Commit
git add lib/permissions/check.ts context/ docs/sesiones/SESION_95* *.md

git commit -m "hotfix: enable leads:assign for all roles except corredor

- Add bypass in checkPermissionInMemory() and checkPermissionLegacy()
- Enables leads:assign for all roles EXCEPT corredor
- Critical demo blocker fix
- Full documentation in SESION_95 and DECISIONS.md"

# Push
git push origin main
```

✅ Sin conflictos = LISTO

---

## CHECK 6: Vercel Deploy

1. **Ir a:** https://vercel.com/dashboard
2. **Buscar proyecto:** whatsapp-agent-ia-dashboard
3. **Ver último deploy** (debe aparecer en ~30 segundos)
4. **Status:** Building → Ready (~2 minutos)

✅ Deploy Ready = LISTO para testing en producción

---

## CHECK 7: Testing en Producción

```
URL: https://dashboard.ecoplaza.com (o URL de producción)
```

1. **Login con admin** (gerencia@ecoplaza.com)
2. **Ir a LeadsTable**
3. **Asignar lead**
4. **Verificar SUCCESS**

✅ Asignación exitosa = HOTFIX COMPLETO

---

## Rollback (si falla)

```bash
git revert HEAD
git push origin main
# Esperar deploy de Vercel (~2 min)
```

---

## Resumen Visual

```
┌─────────────────────────────────────────────────┐
│  ANTES                    DESPUÉS                │
├─────────────────────────────────────────────────┤
│  superadmin    ✅         superadmin    ✅       │
│  admin         ❌         admin         ✅       │
│  jefe_ventas   ❌         jefe_ventas   ✅       │
│  vendedor      ❌         vendedor      ✅       │
│  caseta        ❌         caseta        ✅       │
│  finanzas      ❌         finanzas      ✅       │
│  legal         ❌         legal         ✅       │
│  coordinador   ✅         coordinador   ✅       │
│  corredor      ❌         corredor      ❌       │
└─────────────────────────────────────────────────┘
```

**7 roles habilitados** (todos excepto corredor)

---

**LISTO PARA DEPLOY** ✅
