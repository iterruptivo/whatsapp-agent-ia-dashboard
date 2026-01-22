# Índice de Migración 020: Verificado → Validado

**Fecha:** 2026-01-21
**Estado:** LISTO PARA EJECUTAR

---

## Archivos de la Migración (6 archivos totales)

### 1. Resumen General (EMPIEZA AQUÍ)
**Archivo:** `020_RESUMEN_MIGRACION.md` (6.5K)

Resumen ejecutivo de toda la migración, archivos creados, orden de ejecución, criterios de éxito.

**Leer primero** para entender el scope completo.

---

### 2. Migración SQL Principal
**Archivo:** `020_verificado_a_validado.sql` (11K)

La migración SQL real que ejecuta los cambios:
- Renombra 4 columnas en `depositos_ficha`
- Renombra 2 índices
- Actualiza comentarios
- Maneja triggers

**Ejecutar en base de datos.**

---

### 3. Guía de Ejecución Paso a Paso
**Archivo:** `EJECUTAR_020_VERIFICADO_A_VALIDADO.md` (7.2K)

Guía práctica para ejecutar la migración:
- Checklist pre-ejecución
- Comandos exactos para ejecutar
- Pasos para Staging y Producción
- Plan de rollback
- FAQ

**Usar durante la ejecución.**

---

### 4. Documentación Completa
**Archivo:** `README_020_VERIFICADO_A_VALIDADO.md` (9.3K)

Documentación técnica completa:
- Contexto de negocio
- Cambios detallados
- Impacto en el código
- Testing
- Notas técnicas

**Referencia técnica completa.**

---

### 5. Script de Pre-Check
**Archivo:** `check-020-pre-migration.sql` (9.3K)

Ejecutar ANTES de la migración para ver:
- Estado actual de columnas
- Estadísticas de datos
- Índices existentes
- Recomendación de acción

**Ejecutar primero** para confirmar que la migración es necesaria.

---

### 6. Script de Verificación
**Archivo:** `verify-020-validado.sql` (11K)

Ejecutar DESPUÉS de la migración para verificar:
- 10 tests automatizados
- Verificación de columnas, índices, datos
- Plan de ejecución de queries
- Resumen de resultados

**Ejecutar después** para confirmar éxito.

---

## Workflow Completo

```
┌─────────────────────────────────────────────────────────────────┐
│ FASE 1: PREPARACIÓN                                             │
└─────────────────────────────────────────────────────────────────┘
  1. Leer: 020_RESUMEN_MIGRACION.md
  2. Leer: EJECUTAR_020_VERIFICADO_A_VALIDADO.md
  3. Leer: README_020_VERIFICADO_A_VALIDADO.md

┌─────────────────────────────────────────────────────────────────┐
│ FASE 2: PRE-CHECK (Staging)                                     │
└─────────────────────────────────────────────────────────────────┘
  4. Ejecutar: check-020-pre-migration.sql
  5. Revisar output
  6. Confirmar que migración es necesaria

┌─────────────────────────────────────────────────────────────────┐
│ FASE 3: MIGRACIÓN (Staging)                                     │
└─────────────────────────────────────────────────────────────────┘
  7. Backup de base de datos
  8. Ejecutar: 020_verificado_a_validado.sql
  9. Ejecutar: verify-020-validado.sql
  10. Confirmar todos los tests pasan (OK)

┌─────────────────────────────────────────────────────────────────┐
│ FASE 4: CÓDIGO                                                  │
└─────────────────────────────────────────────────────────────────┘
  11. Actualizar: lib/actions-depositos-ficha.ts
  12. Buscar y reemplazar: verificado_finanzas → validado_finanzas
  13. Commit y push

┌─────────────────────────────────────────────────────────────────┐
│ FASE 5: PRODUCCIÓN                                              │
└─────────────────────────────────────────────────────────────────┘
  14. Pre-check: check-020-pre-migration.sql (Producción)
  15. Backup de producción
  16. Ejecutar: 020_verificado_a_validado.sql (Producción)
  17. Ejecutar: verify-020-validado.sql (Producción)
  18. Desplegar código actualizado
  19. Monitorear por 1 hora
```

---

## Quick Reference

### Para Ejecutar la Migración
1. `check-020-pre-migration.sql` - Pre-check
2. `020_verificado_a_validado.sql` - Migración
3. `verify-020-validado.sql` - Verificación

### Para Entender la Migración
1. `020_RESUMEN_MIGRACION.md` - Resumen
2. `EJECUTAR_020_VERIFICADO_A_VALIDADO.md` - Guía práctica
3. `README_020_VERIFICADO_A_VALIDADO.md` - Documentación completa

---

## Comandos Rápidos

### Pre-Check
```sql
-- En Supabase SQL Editor
\i check-020-pre-migration.sql
```

### Ejecutar Migración
```sql
-- En Supabase SQL Editor
\i 020_verificado_a_validado.sql
```

### Verificar Migración
```sql
-- En Supabase SQL Editor
\i verify-020-validado.sql
```

### Rollback (si es necesario)
```sql
ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas TO verificado_finanzas;
ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas_por TO verificado_finanzas_por;
ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas_at TO verificado_finanzas_at;
ALTER TABLE depositos_ficha RENAME COLUMN validado_finanzas_nombre TO verificado_finanzas_nombre;
ALTER INDEX idx_depositos_ficha_no_validados RENAME TO idx_depositos_ficha_pendientes;
```

---

## Estructura de Archivos

```
migrations/
├── 020_INDEX.md                           # Este archivo
├── 020_RESUMEN_MIGRACION.md               # Resumen ejecutivo
├── 020_verificado_a_validado.sql          # Migración SQL
├── EJECUTAR_020_VERIFICADO_A_VALIDADO.md  # Guía de ejecución
├── README_020_VERIFICADO_A_VALIDADO.md    # Documentación completa
├── check-020-pre-migration.sql            # Pre-check
└── verify-020-validado.sql                # Verificación
```

---

## Checklist Ejecutivo

### Preparación
- [ ] Backup de base de datos realizado
- [ ] Equipo notificado
- [ ] Documentación revisada

### Staging
- [ ] Pre-check ejecutado
- [ ] Migración ejecutada
- [ ] Verificación ejecutada (todos los tests OK)
- [ ] Código actualizado

### Producción
- [ ] Pre-check ejecutado
- [ ] Migración ejecutada (horario de bajo tráfico)
- [ ] Verificación ejecutada (todos los tests OK)
- [ ] Código desplegado
- [ ] Monitoreo por 1 hora

### Post-Ejecución
- [ ] Finanzas confirmó funcionalidad
- [ ] Sin errores en logs
- [ ] Documentación actualizada
- [ ] Migración marcada como ejecutada

---

## Contacto

**Autor:** DataDev (Database Architect)
**Fecha:** 2026-01-21
**Sesión:** 97

Para preguntas o problemas, consultar:
- `README_020_VERIFICADO_A_VALIDADO.md` (FAQ completo)
- `EJECUTAR_020_VERIFICADO_A_VALIDADO.md` (Guía paso a paso)

---

**Versión:** 1.0
**Estado:** LISTO PARA EJECUTAR
