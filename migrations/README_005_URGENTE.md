# MIGRACIÓN 005 - URGENTE: Fix RLS Envío Solicitud Corredor

## Problema
Error `42501` al enviar solicitud de registro de corredor.

```
code: '42501'
message: 'new row violates row-level security policy for table "corredores_registro"'
```

## Causa Raíz
La política RLS `"Corredor edita su registro"` solo permitía UPDATE cuando el estado era 'borrador' o 'observado', pero bloqueaba el cambio a 'pendiente'.

La política evaluaba:
- USING: Verifica estado ACTUAL (OK si es 'borrador')
- WITH CHECK: Verifica estado NUEVO (FALLA porque 'pendiente' no estaba permitido)

## Solución
Nueva política RLS que permite explícitamente la transición de estado:
- Editar datos mientras está en 'borrador' o 'observado'
- Cambiar estado a 'pendiente' (envío de solicitud)

## Aplicar Migración

### Opción 1: Supabase Dashboard (RECOMENDADO)
1. Ir a: https://supabase.com/dashboard/project/YOUR_PROJECT/editor
2. Abrir SQL Editor
3. Copiar y pegar todo el contenido de `005_fix_rls_corredores_envio_solicitud.sql`
4. Ejecutar

### Opción 2: Supabase CLI
```bash
cd E:\Projects\ECOPLAZA_PROJECTS\whatsapp-agent-ia-dashboard
supabase db push --file migrations/005_fix_rls_corredores_envio_solicitud.sql
```

### Opción 3: SQL Directo (para emergencias)
```sql
-- 1. Eliminar política actual
DROP POLICY IF EXISTS "Corredor edita su registro" ON corredores_registro;

-- 2. Crear nueva política
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
```

## Validación

### 1. Verificar política creada
```sql
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

### 2. Test funcional
1. Login como corredor: `yajuppoucevi-3372@yopmail.com`
2. Ir a `/registro-corredor`
3. Completar formulario
4. Click "Enviar Solicitud"
5. Verificar que cambia a "Pendiente" sin error

## Impacto
- **Afecta:** Solo tabla `corredores_registro`
- **Riesgo:** BAJO - Solo modifica permisos RLS
- **Reversible:** Sí (re-ejecutar migración 001)
- **Downtime:** 0 segundos

## Rollback (si es necesario)
```sql
DROP POLICY IF EXISTS "Corredor edita su registro" ON corredores_registro;

CREATE POLICY "Corredor edita su registro"
  ON corredores_registro
  FOR UPDATE
  USING (usuario_id = auth.uid() AND estado IN ('borrador', 'observado'));
```

---

**Aplicada:** ❌ Pendiente
**Fecha aplicación:** _________
**Aplicada por:** _________
