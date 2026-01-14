# CHECKLIST DE TESTING - MIGRACIÓN 006

```
═══════════════════════════════════════════════════════════
    MIGRACIÓN 006: FIX RLS PURCHASE REQUISITIONS
    Estado: EJECUTADA ✅ | Testing: PENDIENTE
═══════════════════════════════════════════════════════════
```

## VERIFICACIÓN DE BASE DE DATOS ✅ COMPLETADA

- [x] Migración SQL ejecutada sin errores
- [x] Función `generate_pr_number()` sin FOR UPDATE
- [x] Función `generate_pr_number_with_lock()` creada
- [x] Trigger `tr_generate_pr_number` activo
- [x] 4 RLS policies en `purchase_requisitions`
- [x] 6 RLS policies en `pr_comments`
- [x] 2 RLS policies en `pr_approval_history`
- [x] Script de verificación ejecutado: PASS

---

## TESTING FUNCIONAL - PENDIENTE

### Preparación

- [ ] Abrir navegador en modo incógnito (para sesión limpia)
- [ ] Abrir DevTools → Console (para ver errores)
- [ ] Abrir DevTools → Network (para ver requests)
- [ ] Tener Supabase Dashboard abierto → Logs

### Paso 1: Login

- [ ] Ir a `https://[tu-dominio]/login`
- [ ] Usar credenciales admin:
  - Email: `gerencia@ecoplaza.com`
  - Password: `q0#CsgL8my3$`
- [ ] Verificar login exitoso
- [ ] Verificar que no hay errores en consola

### Paso 2: Navegar a Purchase Requisitions

- [ ] Click en sidebar → "Solicitudes de Compra"
- [ ] URL debe ser: `/solicitudes-compra`
- [ ] Página debe cargar en < 1 segundo
- [ ] No debe haber errores en consola
- [ ] Verificar que se ven PRs existentes (si hay)

### Paso 3: Crear Nueva PR

- [ ] Click en botón "Nueva Solicitud" (o similar)
- [ ] Llenar formulario:
  - **Título:** "Test Migración 006 - [Fecha]"
  - **Categoría:** Seleccionar cualquiera
  - **Descripción:** "Testing función generate_pr_number() sin FOR UPDATE"
  - **Monto estimado:** 1000 (opcional)
- [ ] Click en "Crear Solicitud" (o "Guardar")

### Paso 4: Verificar Resultado

**Comportamiento Esperado:**
- [ ] Modal/formulario se cierra
- [ ] Mensaje de éxito aparece
- [ ] Nueva PR aparece en la lista
- [ ] **CRÍTICO:** PR tiene `pr_number` generado automáticamente
  - Formato esperado: `PR-2026-00001` (o número siguiente)
- [ ] No hay errores en consola
- [ ] No hay errores en DevTools → Network

**Si algo falla:**
- [ ] Capturar screenshot del error
- [ ] Copiar mensaje de error completo
- [ ] Revisar logs de Supabase (paso 5)

### Paso 5: Verificar Logs de Supabase

- [ ] Ir a Supabase Dashboard
- [ ] Click en "Logs" → "PostgreSQL"
- [ ] Filtrar por últimos 5 minutos
- [ ] **Verificar que NO hay:**
  - [ ] Errores de RLS
  - [ ] Errores de "FOR UPDATE"
  - [ ] Errores de "aggregate functions"
  - [ ] Errores de unique constraint en `pr_number`

**Verificar que SÍ hay:**
- [ ] INSERT exitoso en `purchase_requisitions`
- [ ] Tiempo de query < 100ms
- [ ] pr_number generado correctamente

### Paso 6: Crear Segunda PR (Test de Secuencia)

- [ ] Repetir Paso 3 con datos diferentes:
  - **Título:** "Test Secuencia PR - [Fecha]"
  - **Categoría:** Diferente a la anterior
- [ ] Click en "Crear Solicitud"
- [ ] **Verificar:** pr_number incrementa correctamente
  - Si primera fue `PR-2026-00001`, segunda debe ser `PR-2026-00002`
- [ ] No hay errores

### Paso 7: Test de Concurrencia (Opcional pero Recomendado)

**Objetivo:** Verificar que no hay race conditions

- [ ] Abrir dos pestañas del navegador
- [ ] Login en ambas con mismo usuario
- [ ] Navegar a `/solicitudes-compra` en ambas
- [ ] Click en "Nueva Solicitud" en AMBAS pestañas simultáneamente
- [ ] Llenar formularios rápidamente en ambas
- [ ] Click en "Crear" en ambas casi al mismo tiempo (< 1 segundo de diferencia)

**Resultado Esperado:**
- [ ] Ambas PRs se crean exitosamente
- [ ] Ambas tienen pr_number único (no duplicado)
- [ ] No hay errores de unique constraint

**Si hay error de unique constraint:**
- [ ] Esto indica race condition
- [ ] **ACCIÓN:** Activar OPCIÓN B (advisory locks)
- [ ] Ver sección "Activar OPCIÓN B" abajo

---

## VERIFICACIÓN DE PERFORMANCE

### Métricas Objetivo

| Métrica | Target | Cómo Medir |
|---------|--------|------------|
| Tiempo de creación de PR | < 500ms | DevTools → Network → request duration |
| Tiempo de generación de pr_number | < 50ms | Supabase Logs → query time |
| Tasa de éxito | > 99.9% | Supabase Logs → errores vs éxitos |

### Checklist de Performance

- [ ] Creación de PR toma < 500ms (end-to-end en UI)
- [ ] Query INSERT en Supabase toma < 100ms
- [ ] Generación de pr_number toma < 50ms
- [ ] No hay timeouts
- [ ] No hay degradación con múltiples PRs

---

## MONITOREO POST-TESTING (24 HORAS)

### Día 1 (Hoy - 13 Enero 2026)

**Revisar cada 4 horas:**
- [ ] 10:00 AM - Logs de Supabase → Sin errores
- [ ] 2:00 PM - Logs de Supabase → Sin errores
- [ ] 6:00 PM - Logs de Supabase → Sin errores
- [ ] 10:00 PM - Logs de Supabase → Sin errores

**Métricas a observar:**
- [ ] Total de PRs creadas hoy: ___
- [ ] Errores detectados: ___
- [ ] Race conditions detectadas: ___

### Día 2 (Mañana - 14 Enero 2026)

**Revisión matutina:**
- [ ] 8:00 AM - Revisión completa de logs de 24h
- [ ] Verificar estadísticas:
  - Total PRs creadas: ___
  - Errores: ___
  - Tasa de éxito: ____%
  - Performance promedio: ___ms

---

## ACTIVAR OPCIÓN B (SI ES NECESARIO)

**Cuándo activar:**
- Se detectan race conditions (errores de unique constraint en pr_number)
- Performance es crítico y se requiere garantía absoluta

**Cómo activar:**

1. **Conectar a Supabase:**
```bash
node scripts/switch-to-option-b.js
```

2. **O ejecutar SQL manualmente:**
```sql
-- Cambiar trigger a función con advisory locks
DROP TRIGGER IF EXISTS tr_generate_pr_number ON purchase_requisitions;

CREATE TRIGGER tr_generate_pr_number
  BEFORE INSERT ON purchase_requisitions
  FOR EACH ROW
  EXECUTE FUNCTION generate_pr_number_with_lock();
```

3. **Verificar cambio:**
```bash
node scripts/verify-migration-006.js
# Debe mostrar: "Usando OPCIÓN B: generate_pr_number_with_lock()"
```

4. **Re-testear:**
- [ ] Crear nueva PR
- [ ] Verificar que funciona
- [ ] Medir performance (esperado: < 60ms)

---

## ROLLBACK (SI TODO FALLA)

**Síntomas que requieren rollback:**
- PRs no se crean en absoluto
- pr_number no se genera
- Errores críticos en producción

**Cómo hacer rollback:**

1. **Ejecutar rollback automático:**
```bash
node scripts/rollback-migration-006.js
```

2. **O ejecutar SQL manual:**
```sql
-- Revertir a migración 004 original
-- (SQL específico en scripts/rollback-migration-006.js)
```

3. **Verificar rollback:**
```bash
node scripts/verify-rollback-006.js
```

4. **Reportar problema:**
- [ ] Capturar logs de Supabase
- [ ] Capturar screenshots de errores
- [ ] Documentar en `migrations/ROLLBACK_006_REPORT.md`
- [ ] Contactar DBA

---

## CHECKLIST DE APROBACIÓN FINAL

**Completar después de 24h de monitoreo:**

### Criterios de Aprobación

- [ ] Testing funcional: PASS (todos los pasos completados)
- [ ] Performance: PASS (< 500ms)
- [ ] Estabilidad: PASS (sin errores en 24h)
- [ ] Race conditions: PASS (0 detectadas) o OPCIÓN B activada
- [ ] Monitoreo: PASS (logs revisados, sin issues)

### Documentación Final

- [ ] Actualizar `CURRENT_STATE.md` con resultado de testing
- [ ] Marcar migración como "COMPLETADA Y VALIDADA"
- [ ] Archivar logs de testing en `docs/testing/`
- [ ] Notificar al equipo del éxito

### Firma de Aprobación

```
APROBADO POR: ____________________
ROL: ____________________
FECHA: ____________________
COMENTARIOS: ____________________
```

---

## CONTACTOS DE EMERGENCIA

### Si hay problemas durante testing:

1. **Revisar documentación:**
   - `docs/sesiones/SESION_94_Migracion_006_Fix_RLS_PR.md`
   - `migrations/EJECUTADA_006_13_ENE_2026.md`

2. **Ejecutar diagnóstico:**
```bash
node scripts/verify-migration-006.js
node scripts/diagnose-pr-creation.js
```

3. **Revisar logs:**
   - Supabase Dashboard → Logs → PostgreSQL
   - Buscar: "purchase_requisitions", "generate_pr_number", "FOR UPDATE"

4. **Contactar:**
   - DBA / Database Architect
   - Project Manager
   - Development Team

---

```
═══════════════════════════════════════════════════════════
    IMPORTANTE: Completar TODO el testing antes de
    marcar la migración como "VALIDADA EN PRODUCCIÓN"
═══════════════════════════════════════════════════════════
```

**Última Actualización:** 13 Enero 2026
**Próxima Revisión:** 14 Enero 2026 (después de 24h)
