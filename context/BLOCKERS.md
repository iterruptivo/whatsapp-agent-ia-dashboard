# BLOCKERS - EcoPlaza Dashboard

> Bloqueadores actuales y como se resolvieron los pasados.

---

## Bloqueadores Actuales

### 1. Cache en usuarios existentes
**Estado:** RESUELTO (workaround)
**Descripcion:** Usuarios con version antigua no tienen el banner de nueva version
**Solucion temporal:** Notificar una vez por WhatsApp/email para hacer Ctrl+F5
**Solucion permanente:** Despues de esta notificacion, el banner funcionara automaticamente

---

## Bloqueadores Resueltos

### Session Loss (Sesion 28-45)
**Problema:** Usuarios perdian sesion aleatoriamente
**Causa raiz:** getSession() no validaba con servidor
**Solucion:** Usar getUser() en middleware, split useEffects, timeout 30s
**Fecha resolucion:** Sesion 45I

### Limite 1000 Leads (Sesion 33)
**Problema:** Dashboard solo mostraba 1000 leads
**Causa raiz:** Supabase limite por defecto + JOINs
**Solucion:** Keyset pagination sin JOINs, fetch separado
**Fecha resolucion:** Sesion 33C

### Trigger Cascade Comisiones (Sesion 62)
**Problema:** Comisiones no pasaban a "disponible"
**Causa raiz:** PostgreSQL triggers anidados no se disparan consistentemente
**Solucion:** Integrar logica en funcion unica
**Fecha resolucion:** Sesion 62

### RLS Recursion (Sesion 61)
**Problema:** Error 42P17 infinite recursion
**Causa raiz:** Subquery a misma tabla en policy
**Solucion:** Usar tablas diferentes en condiciones
**Fecha resolucion:** Sesion 61

### Build Error auth-server (Sesion 53B)
**Problema:** Build failing por import inexistente
**Causa raiz:** Paginas intentaban importar archivo que no existe
**Solucion:** Convertir a Client Components con useAuth()
**Fecha resolucion:** Sesion 53B

---

## Patrones de Resolucion

1. **Verificar patrones existentes** antes de implementar nuevo codigo
2. **Glob archivos en /lib/** para ver que utilidades existen
3. **Leer paginas existentes** para seguir mismo patron
4. **NO asumir** que archivos existen sin verificar

---

**Ultima Actualizacion:** 23 Diciembre 2025
