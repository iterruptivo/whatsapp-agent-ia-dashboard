# 🚨 MIGRACIÓN 003 - APLICAR AHORA

**Migración:** `003_fix_corredores_documentos_delete_policy.sql`
**Prioridad:** MEDIA (Opcional pero recomendada)
**Tiempo:** < 1 minuto

---

## ¿POR QUÉ APLICAR ESTA MIGRACIÓN?

La migración agrega la política RLS de DELETE faltante en `corredores_documentos`.

**NOTA IMPORTANTE:** Con el fix implementado (uso de UPSERT), esta migración es **opcional**. Sin embargo, es buena práctica aplicarla para tener las políticas RLS completas.

---

## PASOS PARA APLICAR

### 1. Acceder a Supabase Dashboard

1. Ir a https://supabase.com/dashboard
2. Proyecto: **EcoPlaza Dashboard**
3. Click en **SQL Editor** (menú izquierdo)

### 2. Abrir Nueva Query

Click en **New query** (botón superior derecha)

### 3. Copiar SQL

Copiar el contenido del archivo `003_fix_corredores_documentos_delete_policy.sql`:

```sql
-- ============================================================================
-- MIGRACIÓN: Fix - Agregar política DELETE para corredores_documentos
-- ============================================================================
-- Fecha: 13 Enero 2026
-- Descripción: Permite a corredores eliminar sus propios documentos cuando el
--              registro está en estado 'borrador' u 'observado'
-- ============================================================================

-- Política para que corredor pueda eliminar sus documentos
CREATE POLICY "Corredor elimina sus documentos"
  ON corredores_documentos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM corredores_registro
      WHERE id = registro_id
      AND usuario_id = auth.uid()
      AND estado IN ('borrador', 'observado')
    )
  );

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON POLICY "Corredor elimina sus documentos" ON corredores_documentos IS
  'Permite a corredor eliminar documentos solo si el registro está en borrador u observado';
```

### 4. Ejecutar

Click en **Run** (esquina inferior derecha)

### 5. Verificar Resultado

Debe mostrar:

```
✅ Success. No rows returned
```

### 6. Confirmar Política Creada

Ejecutar query de verificación:

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'corredores_documentos'
AND policyname = 'Corredor elimina sus documentos';
```

Debe retornar **1 fila**.

---

## TROUBLESHOOTING

### Error: "policy already exists"

✅ **Solución:** La migración ya fue aplicada. No hacer nada.

### Error: "permission denied"

❌ **Problema:** No tienes permisos de admin.

**Solución:** Usar cuenta con rol `service_role` o contactar al administrador.

### Error: "table does not exist"

❌ **Problema:** La migración 001 no fue aplicada.

**Solución:** Aplicar primero `001_modulo_expansion_corredores.sql`.

---

## VERIFICAR TODAS LAS POLÍTICAS

Después de aplicar, verificar que existan todas las políticas:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'corredores_documentos'
ORDER BY cmd;
```

**Resultado esperado:**

| policyname | cmd |
|------------|-----|
| Corredor elimina sus documentos | DELETE |
| Corredor sube documentos | INSERT |
| Corredor ve sus documentos | SELECT |
| Admin ve todos los documentos | SELECT |

---

## ROLLBACK (si algo sale mal)

Para eliminar la política:

```sql
DROP POLICY IF EXISTS "Corredor elimina sus documentos" ON corredores_documentos;
```

---

## CONTACTO

¿Dudas? Ver:
- `migrations/README_APLICAR_MIGRACIONES.md` (guía completa)
- `docs/sesiones/SESION_90_Fix_Error_Guardar_Documentos.md` (contexto del fix)
