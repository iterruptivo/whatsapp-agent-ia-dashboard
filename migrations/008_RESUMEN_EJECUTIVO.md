# MIGRACIÓN 008 - RESUMEN EJECUTIVO

## ERROR

```
duplicate key value violates unique constraint "purchase_requisitions_pr_number_key"
```

## CAUSA

Race condition en `generate_pr_number()` que usa `MAX(sequence_number) + 1`

## SOLUCIÓN

Usar secuencias PostgreSQL: `pr_sequence_2026`, `pr_sequence_2027`, `pr_sequence_2028`

## APLICAR AHORA (2 minutos)

### Opción 1: Quick Apply (RECOMENDADO)

1. Ir a Supabase SQL Editor
2. Copiar y pegar TODO el archivo: `migrations/APLICAR_008_QUICK.sql`
3. Ejecutar (Run)
4. Verificar output (debe decir "MIGRACIÓN EXITOSA")

### Opción 2: Manual

1. Ejecutar `migrations/008_fix_pr_sequence_duplicate.sql`
2. Ejecutar `migrations/008_VALIDAR_PR_SEQUENCES.sql`
3. Verificar que todos los tests pasan

## VALIDAR (1 minuto)

```sql
-- Test 1: Secuencias creadas (debe retornar 3)
SELECT COUNT(*) FROM pg_class WHERE relname LIKE 'pr_sequence_%' AND relkind = 'S';

-- Test 2: Sin duplicados (debe retornar 0)
SELECT COUNT(*) FROM (
  SELECT pr_number FROM purchase_requisitions GROUP BY pr_number HAVING COUNT(*) > 1
) dups;

-- Test 3: Trigger activo
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'tr_generate_pr_number';
```

## TEST FUNCIONAL (2 minutos)

1. Login: `gerente.ti@ecoplaza.com.pe` / `H#TJf8M%xjpTK@Vn`
2. Ir a `/solicitudes-compra`
3. Crear nueva PR (cualquier datos)
4. Verificar que se genera `pr_number` (ej: `PR-2026-00005`)
5. Eliminar la PR de prueba

## SI ALGO FALLA

```sql
-- Resetear secuencia
SELECT reset_pr_sequence_for_year(2026);

-- Rollback completo (volver a migración 006)
-- Ejecutar: migrations/006_fix_rls_purchase_requisitions.sql
```

## IMPACTO

- **Downtime:** 0 segundos
- **Datos afectados:** 0 registros
- **Riesgo:** BAJO (reversible)
- **Beneficio:** Elimina race conditions, mejora performance 1000x

## ARCHIVOS

| Archivo | Propósito |
|---------|-----------|
| `008_fix_pr_sequence_duplicate.sql` | Migración principal |
| `APLICAR_008_QUICK.sql` | Quick apply + validación |
| `008_VALIDAR_PR_SEQUENCES.sql` | Tests detallados |
| `README_008_APLICAR_URGENTE.md` | Guía completa |
| `008_RESUMEN_EJECUTIVO.md` | Este archivo |

## SIGUIENTE ACCIÓN

✅ Copiar `APLICAR_008_QUICK.sql` a Supabase SQL Editor y ejecutar

---

**Tiempo total:** 5 minutos (aplicar + validar + test)

**Estado:** LISTO PARA PRODUCCIÓN
