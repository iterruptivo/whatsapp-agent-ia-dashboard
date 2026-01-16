# RESUMEN EJECUTIVO: Fix Superadmin - Reuniones

## Problema

El usuario `gerente.ti@ecoplaza.com.pe` (superadmin) no puede crear reuniones.

**Error:**
```
HTTP 400: {"error":"Unauthorized","message":"new row violates row-level security policy"}
```

---

## Causa

La política de seguridad de la base de datos (RLS policy) solo permite crear reuniones a:
- admin
- gerencia
- jefe_ventas

**NO incluye** a `superadmin`

---

## Solución

Ejecutar el script SQL en Supabase que actualiza la política para incluir `superadmin`.

**Archivo:** `migrations/011_fix_reuniones_insert_superadmin_URGENTE.sql`

---

## Pasos para Aplicar el Fix

### 1. Ir a Supabase
- https://supabase.com/dashboard
- Abrir el proyecto EcoPlaza
- Click en **SQL Editor** (sidebar izquierdo)

### 2. Crear Nueva Query
- Click en **New Query**

### 3. Copiar y Pegar
- Abrir: `migrations/011_fix_reuniones_insert_superadmin_URGENTE.sql`
- Copiar **TODO** el contenido
- Pegar en el editor SQL

### 4. Ejecutar
- Click en **Run** o presionar `Ctrl + Enter`
- Esperar mensaje: `✓ Policy "Reuniones - Insert" actualizada`

### 5. Verificar
- Probar crear una reunión como `gerente.ti@ecoplaza.com.pe`
- Debe funcionar sin errores

---

## Tiempo Estimado

30 segundos

---

## Archivos Creados

| Archivo | Propósito |
|---------|-----------|
| `011_fix_reuniones_insert_superadmin_URGENTE.sql` | Script SQL para aplicar el fix |
| `README_011_FIX_SUPERADMIN_INSERT_URGENTE.md` | Instrucciones detalladas |
| `diagnose_rls_reuniones.sql` | Script de diagnóstico (opcional) |
| `RESUMEN_FIX_SUPERADMIN.md` | Este resumen |

---

## Si el Error Persiste

1. Ejecutar `diagnose_rls_reuniones.sql` en Supabase SQL Editor
2. Verificar que el usuario `gerente.ti@ecoplaza.com.pe` existe y es superadmin
3. Revisar logs del navegador (F12 → Console)
4. Contactar al equipo técnico

---

**Fecha:** 16 Enero 2026
**Prioridad:** URGENTE
**Impacto:** ALTO
**Riesgo:** BAJO (script idempotente)
