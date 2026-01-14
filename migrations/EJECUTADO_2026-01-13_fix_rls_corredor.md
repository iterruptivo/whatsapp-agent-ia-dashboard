# FIX RLS EJECUTADO - 2026-01-13

## Estado: COMPLETADO ✅

### Problema Identificado
La política de RLS "Corredor edita su registro" en la tabla `corredores_registro` bloqueaba la transición de estado de `borrador` a `pendiente`.

**Error original:**
```
new row violates row-level security policy for table "corredores_registro"
```

### Causa Raíz
El `WITH CHECK` de la política solo permitía los estados `'borrador'` y `'observado'`, pero no `'pendiente'`. Esto impedía que un corredor enviara su solicitud (transición borrador → pendiente).

### Solución Implementada
Se actualizó la política para incluir `'pendiente'` en el `WITH CHECK`.

**Política ANTES:**
```sql
CREATE POLICY "Corredor edita su registro"
  ON corredores_registro
  FOR UPDATE
  USING (
    usuario_id = auth.uid()
    AND estado IN ('borrador', 'observado')
  )
  WITH CHECK (
    usuario_id = auth.uid()
    AND estado IN ('borrador', 'observado')  -- ❌ No permite 'pendiente'
  );
```

**Política DESPUÉS:**
```sql
CREATE POLICY "Corredor edita su registro"
  ON corredores_registro
  FOR UPDATE
  USING (
    usuario_id = auth.uid()
    AND estado IN ('borrador', 'observado')
  )
  WITH CHECK (
    usuario_id = auth.uid()
    AND estado IN ('borrador', 'observado', 'pendiente')  -- ✅ Permite 'pendiente'
  );
```

### Método de Ejecución
- **Fecha:** 2026-01-13
- **Hora:** Inmediata (urgente)
- **Herramienta:** Node.js script con biblioteca `pg`
- **Script:** `scripts/fix-rls-corredor.js`
- **Verificación:** `scripts/verify-rls-corredor.js`

### Comandos Ejecutados
```bash
# 1. Ejecutar fix
node scripts/fix-rls-corredor.js

# 2. Verificar política
node scripts/verify-rls-corredor.js
```

### Resultado de Verificación
```
✅ VERIFICACIÓN EXITOSA:
   La política "Corredor edita su registro" existe
   Comando: UPDATE
   ✅ Permite transición a estado "pendiente"
```

### Políticas RLS Actuales en corredores_registro

| # | Política | Comando | USING | WITH CHECK |
|---|----------|---------|-------|------------|
| 1 | Admin actualiza registros | UPDATE | rol IN ('superadmin', 'admin', 'legal') | null |
| 2 | Admin ve todos los registros | SELECT | rol IN ('superadmin', 'admin', 'legal') | null |
| 3 | Corredor crea su registro | INSERT | null | usuario_id = auth.uid() |
| 4 | **Corredor edita su registro** | **UPDATE** | usuario_id = auth.uid() AND estado IN ('borrador', 'observado') | **usuario_id = auth.uid() AND estado IN ('borrador', 'observado', 'pendiente')** |
| 5 | Corredor ve su registro | SELECT | usuario_id = auth.uid() | null |

### Impacto
- **Funcionalidad desbloqueada:** Envío de solicitud de registro de corredor
- **Usuarios afectados:** Corredores en proceso de registro
- **Estado de transición permitido:** borrador → pendiente
- **Seguridad:** Mantiene RLS intacto, solo permite la transición necesaria

### Testing Post-Fix
Verificar que funciona correctamente:

1. **Ir a:** `/registro-corredor`
2. **Llenar formulario** con todos los datos requeridos
3. **Hacer clic en:** "Enviar Solicitud"
4. **Resultado esperado:** Estado cambia a "Pendiente" sin errores

### Archivos Relacionados
- **Migración SQL:** `migrations/URGENTE_fix_rls_corredor_transicion_pendiente.sql`
- **Script ejecutor:** `scripts/fix-rls-corredor.js`
- **Script verificador:** `scripts/verify-rls-corredor.js`
- **Instrucciones:** `migrations/EJECUTAR_AHORA_fix_rls.md`
- **Server action:** `lib/actions-expansion.ts` (updateCorredorRegistro)
- **Componente UI:** `app/registro-corredor/page.tsx`

### Rollback
Si se necesita revertir (no recomendado):
```sql
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
    AND estado IN ('borrador', 'observado')  -- Sin 'pendiente'
  );
```

### Notas Adicionales
- Este fix es **crítico** para el flujo de registro de corredores
- La política mantiene la seguridad: solo el propietario puede editar su registro
- La transición solo se permite desde estados válidos (borrador/observado)
- El estado 'pendiente' es el resultado esperado al enviar la solicitud

---

**Ejecutado por:** DataDev (Database Architect)
**Fecha:** 2026-01-13
**Prioridad:** URGENTE
**Estado:** COMPLETADO ✅
