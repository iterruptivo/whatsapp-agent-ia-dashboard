# EJECUTAR AHORA - Fix RLS Corredor

## Problema
La política de RLS está bloqueando la transición de estado de `borrador` a `pendiente` en `corredores_registro`.

## Solución
Actualizar la política "Corredor edita su registro" para permitir el estado `pendiente` en el `WITH CHECK`.

---

## OPCIÓN 1: SQL Editor de Supabase (MÁS RÁPIDO)

1. **Ir a Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/qssefegfzxxurqbzndrs
   - Iniciar sesión

2. **Abrir SQL Editor**
   - En el menú lateral izquierdo, hacer clic en "SQL Editor"
   - Hacer clic en "New query"

3. **Copiar y pegar este SQL:**

```sql
-- FIX URGENTE: Permitir a corredores enviar solicitud (borrador → pendiente)

-- 1. Eliminar política restrictiva actual
DROP POLICY IF EXISTS "Corredor edita su registro" ON corredores_registro;

-- 2. Crear política que permite transición a 'pendiente'
CREATE POLICY "Corredor edita su registro"
  ON corredores_registro
  FOR UPDATE
  USING (
    usuario_id = auth.uid()
    AND estado IN ('borrador', 'observado')
  )
  WITH CHECK (
    usuario_id = auth.uid()
    AND estado IN ('borrador', 'observado', 'pendiente')
  );

-- 3. Verificar que la política se creó correctamente
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'corredores_registro'
  AND policyname = 'Corredor edita su registro';
```

4. **Ejecutar**
   - Hacer clic en "Run" (F5)
   - Verificar que no hay errores
   - Revisar el resultado del SELECT final

5. **Resultado esperado:**
   ```
   DROP POLICY
   CREATE POLICY
   1 row returned (mostrando la nueva política)
   ```

---

## OPCIÓN 2: Supabase CLI

Si tienes Supabase CLI instalado:

```bash
cd E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard
supabase db execute --file migrations/URGENTE_fix_rls_corredor_transicion_pendiente.sql --project-ref qssefegfzxxurqbzndrs
```

---

## OPCIÓN 3: psql (si está instalado)

```bash
psql "postgresql://postgres:1T3rrupt1v02025$@db.qssefegfzxxurqbzndrs.supabase.co:5432/postgres" -f migrations/URGENTE_fix_rls_corredor_transicion_pendiente.sql
```

---

## Verificación Post-Ejecución

1. **Probar en la aplicación:**
   - Ir a `/registro-corredor`
   - Completar el formulario
   - Hacer clic en "Enviar Solicitud"
   - Debe cambiar de estado a "Pendiente" sin errores

2. **Verificar en Supabase:**
   ```sql
   SELECT id, nombres, apellidos, estado, created_at
   FROM corredores_registro
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **Verificar políticas:**
   ```sql
   SELECT policyname, cmd, with_check
   FROM pg_policies
   WHERE tablename = 'corredores_registro';
   ```

---

## Si algo sale mal

**Rollback:**
```sql
-- Restaurar política anterior (más restrictiva)
DROP POLICY IF EXISTS "Corredor edita su registro" ON corredores_registro;

CREATE POLICY "Corredor edita su registro"
  ON corredores_registro
  FOR UPDATE
  USING (
    usuario_id = auth.uid()
    AND estado IN ('borrador', 'observado')
  )
  WITH CHECK (
    usuario_id = auth.uid()
    AND estado IN ('borrador', 'observado')
  );
```

---

## Archivos Relacionados

- **Migración SQL:** `migrations/URGENTE_fix_rls_corredor_transicion_pendiente.sql`
- **Documentación módulo:** `docs/modulos/expansion/README.md`
- **Server action afectado:** `lib/actions-expansion.ts` (updateCorredorRegistro)

---

**Fecha:** 2026-01-13
**Prioridad:** URGENTE
**Impacto:** Alto (bloquea funcionalidad crítica de registro de corredores)
