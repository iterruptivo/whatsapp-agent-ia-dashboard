# ✅ CHECKLIST: Verificación SQL - fecha_disponible

**Ejecutar DESPUÉS de correr el SQL en Supabase**

---

## 1️⃣ Verificar columna creada

Ejecutar en Supabase SQL Editor:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'comisiones' AND column_name = 'fecha_disponible';
```

**Resultado esperado:**
```
column_name       | data_type                   | is_nullable
------------------|-----------------------------|-------------
fecha_disponible  | timestamp with time zone    | YES
```

✅ [ ] Columna existe
✅ [ ] Tipo correcto (timestamp with time zone)
✅ [ ] Permite NULL (YES)

---

## 2️⃣ Verificar trigger actualizado

Ejecutar:

```sql
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_comisiones_inicial_pagado';
```

**Resultado esperado:**
- trigger_name: `trigger_comisiones_inicial_pagado`
- event_manipulation: `UPDATE`
- event_object_table: `pagos_local`
- action_statement: debe contener `fecha_disponible = NOW()`

✅ [ ] Trigger existe
✅ [ ] Se ejecuta en UPDATE de pagos_local
✅ [ ] Incluye lógica de fecha_disponible

---

## 3️⃣ Verificar datos existentes

```sql
SELECT id, estado, fecha_procesado, fecha_disponible, fecha_pago_comision
FROM comisiones
LIMIT 5;
```

**Resultado esperado:**
- Comisiones existentes tienen `fecha_disponible = NULL` (aún no pasaron a disponible)
- Esto es correcto (columna recién agregada)

✅ [ ] Query ejecuta sin errores
✅ [ ] fecha_disponible es NULL en registros existentes

---

## 4️⃣ Test del trigger (OPCIONAL - solo si quieres probar)

**Solo ejecutar si tienes datos de prueba:**

```sql
-- Ver comisiones pendientes de un control_pago
SELECT id, estado, fecha_disponible
FROM comisiones
WHERE control_pago_id = 'TU_ID_AQUI' AND estado = 'pendiente_inicial';

-- Simular que inicial se completó (cambiar estado del pago)
UPDATE pagos_local
SET estado = 'completado'
WHERE control_pago_id = 'TU_ID_AQUI' AND tipo = 'inicial';

-- Verificar que comisiones pasaron a disponible CON FECHA
SELECT id, estado, fecha_disponible
FROM comisiones
WHERE control_pago_id = 'TU_ID_AQUI';
```

**Resultado esperado:**
- estado cambió de `pendiente_inicial` → `disponible`
- fecha_disponible ahora tiene valor (timestamp actual)

✅ [ ] Trigger funciona correctamente (OPCIONAL)

---

## ✅ APROBACIÓN FINAL

Si los 3 checks principales pasaron:
- ✅ Columna existe
- ✅ Trigger actualizado
- ✅ Query de datos funciona

**ESTÁS LISTO PARA LANZAR PROJECT LEADER**

---

## 🚨 Si algo falló

**Columna no existe:**
- Re-ejecutar: `ALTER TABLE comisiones ADD COLUMN fecha_disponible TIMESTAMP WITH TIME ZONE;`

**Trigger no aparece:**
- Re-ejecutar la función `CREATE OR REPLACE FUNCTION...` y `DROP TRIGGER... CREATE TRIGGER...`

**Errores en queries:**
- Verificar que estás en la base de datos correcta
- Verificar permisos de usuario
