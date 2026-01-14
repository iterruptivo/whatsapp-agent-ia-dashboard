# CHECKLIST: Deploy Migración 005 - Optimización Performance

**Sesión:** 93
**Fecha:** 13 Enero 2026
**Tiempo estimado:** 10 minutos

---

## PRE-DEPLOY

### 1. Verificar Pre-requisitos

- [ ] Migración 004 (Purchase Requisitions) ejecutada
- [ ] Acceso a Supabase Dashboard
- [ ] Código TypeScript con cambios desplegado en Vercel

```bash
# Verificar último commit
git log --oneline -1
```

---

## DEPLOY

### 2. Ejecutar Migración SQL

- [ ] Abrir Supabase Dashboard → SQL Editor
- [ ] Copiar contenido de `migrations/005_optimize_pr_performance.sql`
- [ ] Pegar en editor
- [ ] Click "Run"
- [ ] Verificar mensaje: "Success. No rows returned"

**Tiempo:** 2 minutos

---

## POST-DEPLOY: Verificación Rápida

### 3. Verificar Índice Creado

```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'purchase_requisitions'
  AND indexname = 'idx_pr_requester_status_stats';
```

- [ ] Resultado: 1 fila con el nombre del índice

**Tiempo:** 30 segundos

### 4. Testing Manual en UI

- [ ] Login: `gerencia@ecoplaza.com` / `q0#CsgL8my3$`
- [ ] Navegar a `/solicitudes-compra`
- [ ] Abrir DevTools → Network
- [ ] Refrescar página (F5)
- [ ] Verificar tiempo de carga < 1 segundo
- [ ] Verificar que las estadísticas (Total, Borradores, Pendientes, Aprobadas) se muestran correctamente

**Tiempo:** 2 minutos

---

## POST-DEPLOY: Verificación Completa (Opcional)

### 5. Ejecutar Suite de Verificación

- [ ] Copiar contenido de `migrations/VERIFICAR_005_PERFORMANCE.sql`
- [ ] Pegar en Supabase SQL Editor
- [ ] Ejecutar
- [ ] Revisar output de los 10 pasos de validación
- [ ] Verificar que todos los checks pasan ✅

**Tiempo:** 5 minutos

---

## MONITOREO (Próximas 24h)

### 6. Observar Métricas

- [ ] **Supabase Dashboard → Performance:**
  - Query time de `purchase_requisitions` debe bajar
  - Índice `idx_pr_requester_status_stats` debe mostrar uso

- [ ] **Vercel Analytics:**
  - Time to Interactive (TTI) de `/solicitudes-compra` < 1s

- [ ] **Error Logs:**
  - No debe haber errores nuevos relacionados a purchase_requisitions

- [ ] **User Feedback:**
  - Preguntar a 2-3 usuarios: "¿Notaste mejora en la velocidad de /solicitudes-compra?"

**Tiempo:** 10 minutos (distribuidos en 24h)

---

## ROLLBACK (Solo si hay problemas)

### 7. Plan B: Revertir Cambios

**Si hay errores críticos:**

```sql
-- 1. Eliminar índice
DROP INDEX IF EXISTS idx_pr_requester_status_stats;

-- 2. Reportar issue
-- 3. Contactar Backend Developer Agent
```

**Criterios de rollback:**
- Error rate > 5% en logs
- Queries más lentas después de la migración
- Usuario reporta bug crítico

**Tiempo:** 1 minuto

---

## COMUNICACIÓN

### 8. Notificar al Equipo

- [ ] Mensaje en Slack/WhatsApp:

```
✅ Deploy completado: Optimización de Performance - Purchase Requisitions

Mejoras:
• Tiempo de carga: 2-5s → <1s (70-85% más rápido)
• Stats calculadas en PostgreSQL (no en JavaScript)
• Queries en paralelo

Módulo afectado: /solicitudes-compra
Impacto: Positivo (mejor UX)
Downtime: 0 segundos

Cualquier issue, reportar en #tech-support
```

**Tiempo:** 2 minutos

---

## DOCUMENTACIÓN

### 9. Actualizar Contexto

- [ ] Marcar en `context/NEXT_STEPS.md` como completado:

```markdown
- [x] Ejecutar migración `005_optimize_pr_performance.sql` en Supabase
- [x] Testing QA en producción
- [x] Monitorear performance post-deploy
```

**Tiempo:** 1 minuto

---

## RESUMEN

| Fase | Tiempo | Crítico |
|------|--------|---------|
| Pre-Deploy | 1 min | ⚠️ SÍ |
| Deploy | 2 min | ⚠️ SÍ |
| Verificación Rápida | 2.5 min | ⚠️ SÍ |
| Verificación Completa | 5 min | Opcional |
| Monitoreo | 10 min (24h) | Recomendado |
| Comunicación | 3 min | Recomendado |

**Total Tiempo Crítico:** 5.5 minutos
**Total Tiempo Recomendado:** 23.5 minutos

---

## NOTAS IMPORTANTES

1. ✅ **Sin Downtime**: La creación del índice no bloquea la app
2. ✅ **Idempotente**: Puedes ejecutar la migración múltiples veces sin problemas
3. ✅ **Reversible**: Eliminar el índice no causa errores, solo reduce performance
4. ✅ **Bajo Riesgo**: Solo agrega un índice, no modifica datos existentes

---

## CONTACTO

**Dudas o problemas:** Backend Developer Agent
**Documentación completa:**
- `docs/sesiones/SESION_93_Optimizacion_Performance_Purchase_Requisitions.md`
- `docs/sesiones/RESUMEN_EJECUTIVO_SESION_93.md`
- `migrations/README_005_PERFORMANCE.md`

---

**ESTADO ACTUAL:**

- [ ] Pre-Deploy
- [ ] Deploy
- [ ] Post-Deploy Verificación Rápida
- [ ] Post-Deploy Verificación Completa
- [ ] Monitoreo 24h
- [ ] Comunicación
- [ ] Documentación Actualizada
- [ ] ✅ COMPLETADO

---

**Última actualización:** 13 Enero 2026
