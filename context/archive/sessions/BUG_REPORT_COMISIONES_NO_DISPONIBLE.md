# BUG REPORT: Comisiones no pasan a "Disponible" tras completar inicial

**Fecha:** 30 Noviembre 2025
**Reportado por:** Usuario
**Severidad:** CRÍTICA
**Estado:** ANÁLISIS COMPLETO

---

## RESUMEN EJECUTIVO

**Problema:** Al pagar la inicial completa de 3 locales (PRUEBA-11, PRUEBA-14, PRUEBA-15), solo PRUEBA-11 pasó las comisiones a estado "Disponible". PRUEBA-14 y PRUEBA-15 siguen en "Pendiente" a pesar de tener inicial completada.

**Impacto:** Los vendedores no pueden ver comisiones disponibles para cobro cuando ya cumplieron con el requisito de pago inicial completo.

**Root Cause:** El trigger `actualizar_comisiones_inicial_pagado()` se dispara SOLO cuando el campo `estado` de la tabla `pagos_local` cambia a `'completado'`. Sin embargo, hay un escenario donde la inicial puede estar completada pero el trigger NO se ejecuta.

---

## ANÁLISIS TÉCNICO

### 1. FLUJO ACTUAL DEL SISTEMA

**Cuando se registra un abono:**

```
1. Usuario ejecuta registrarAbono() en lib/actions-pagos.ts
   ↓
2. Se inserta registro en tabla abonos_pago
   ↓
3. TRIGGER: update_monto_abonado_and_estado() se dispara (20251123_create_pagos_system.sql)
   ↓
4. Calcula: SUM(monto) de abonos_pago WHERE pago_id = NEW.pago_id
   ↓
5. UPDATE pagos_local SET:
   - monto_abonado = total_abonado
   - estado = CASE
       WHEN total_abonado = 0 THEN 'pendiente'
       WHEN total_abonado < monto_esperado THEN 'parcial'
       ELSE 'completado'  ← AQUÍ SE DEBE ACTIVAR
     END
   ↓
6. Si estado pasó a 'completado', SE DISPARA:
   TRIGGER: actualizar_comisiones_inicial_pagado() (20251128_trigger_comisiones_disponible.sql)
   ↓
7. UPDATE comisiones SET estado = 'disponible', fecha_disponible = NOW()
   WHERE control_pago_id = NEW.control_pago_id AND estado = 'pendiente_inicial'
```

**Condición del trigger actualizar_comisiones_inicial_pagado():**

```sql
IF NEW.tipo = 'inicial'
   AND NEW.estado = 'completado'
   AND (OLD.estado IS NULL OR OLD.estado != 'completado')
THEN
```

**Significa:**
- Solo se ejecuta si `tipo = 'inicial'`
- Solo se ejecuta si el estado CAMBIÓ a `'completado'` (no estaba completado antes)
- Se ejecuta en UPDATE de la tabla `pagos_local`

---

### 2. ESCENARIOS IDENTIFICADOS

#### ESCENARIO A: Funcionamiento correcto (PRUEBA-11)

1. Inicial esperado: $4,250.00
2. Usuario registra abono #1: $2,000 → Estado: `'parcial'`
3. Usuario registra abono #2: $2,250 → Estado: `'completado'` ✅
4. Trigger se dispara: `OLD.estado = 'parcial'`, `NEW.estado = 'completado'`
5. ✅ Comisiones pasan a `'disponible'`

#### ESCENARIO B: Bug (PRUEBA-14 y PRUEBA-15)

**Hipótesis 1: Abono único que completa inicial**
1. Inicial esperado: $4,000.00
2. Usuario registra abono #1: $4,000 → Estado: `'completado'` directamente
3. ❌ `OLD.estado = 'pendiente'`, `NEW.estado = 'completado'`
4. **PROBLEMA:** ¿El trigger se dispara en este caso?

**Verificación del código del trigger:**
```sql
IF NEW.tipo = 'inicial'
   AND NEW.estado = 'completado'
   AND (OLD.estado IS NULL OR OLD.estado != 'completado')
```

✅ **Condición se cumple:**
- `NEW.tipo = 'inicial'` → TRUE
- `NEW.estado = 'completado'` → TRUE
- `OLD.estado != 'completado'` → TRUE (era 'pendiente')

**Conclusión:** El trigger SÍ debería dispararse en este escenario.

---

**Hipótesis 2: Problemas de timing con transactions**

1. Usuario registra abono que completa inicial
2. INSERT en `abonos_pago` se ejecuta
3. Trigger `update_monto_abonado_and_estado()` intenta ejecutarse
4. ❓ ¿Hay un error silencioso en el UPDATE de `pagos_local`?
5. ❓ ¿El estado no se actualiza por alguna razón?

---

**Hipótesis 3: RLS Policy bloqueando UPDATE**

Revisar si hay políticas RLS en `pagos_local` que puedan bloquear el UPDATE del trigger:

```sql
-- De 20251123_create_pagos_system.sql:
DROP POLICY IF EXISTS pagos_local_update_authenticated ON pagos_local;
CREATE POLICY pagos_local_update_authenticated
  ON pagos_local FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

✅ **Policy permite todos los UPDATEs para usuarios autenticados.**

---

**Hipótesis 4: Diferencia en monto_esperado**

¿Es posible que haya un redondeo que haga que `total_abonado < monto_esperado` por centavos?

**Verificación en código:**
```typescript
// lib/actions-pagos.ts línea 256-259
const montoCentavos = Math.round(data.monto * 100);
const restanteCentavos = Math.round(montoRestante * 100);

if (montoCentavos > restanteCentavos) {
  return { success: false, message: '...' };
}
```

**Validación existe:** No permite registrar un abono que exceda el monto restante.

**En el trigger SQL:**
```sql
-- 20251123_create_pagos_system.sql línea 98-102
estado = CASE
  WHEN COALESCE(total_abonado, 0) = 0 THEN 'pendiente'
  WHEN COALESCE(total_abonado, 0) < pago_record.monto_esperado THEN 'parcial'
  ELSE 'completado'
END
```

⚠️ **PROBLEMA POTENCIAL:** Comparación de NUMERIC puede fallar por precisión decimal.

**Ejemplo:**
- `monto_esperado = 4000.00`
- `abono_1 = 2000.00`
- `abono_2 = 2000.00`
- `SUM(monto) = 4000.0000000001` (error de punto flotante)
- `4000.0000000001 < 4000.00` → TRUE → Estado: `'parcial'` ❌

---

### 3. QUERIES DE VERIFICACIÓN

Para identificar la causa exacta, ejecutar en Supabase SQL Editor:

```sql
-- 1. Ver estado actual de pagos de inicial en los 3 locales
SELECT
  cp.local_codigo,
  pl.tipo,
  pl.monto_esperado,
  pl.monto_abonado,
  pl.estado,
  pl.updated_at,
  (pl.monto_esperado - pl.monto_abonado) AS diferencia
FROM control_pagos cp
INNER JOIN pagos_local pl ON pl.control_pago_id = cp.id
WHERE cp.local_codigo IN ('PRUEBA-11', 'PRUEBA-14', 'PRUEBA-15')
  AND pl.tipo = 'inicial'
ORDER BY cp.local_codigo;

-- 2. Ver abonos registrados para cada pago inicial
SELECT
  cp.local_codigo,
  pl.tipo,
  pl.monto_esperado,
  COUNT(ap.id) AS num_abonos,
  SUM(ap.monto) AS total_abonado,
  (pl.monto_esperado - COALESCE(SUM(ap.monto), 0)) AS diferencia_exacta
FROM control_pagos cp
INNER JOIN pagos_local pl ON pl.control_pago_id = cp.id
LEFT JOIN abonos_pago ap ON ap.pago_id = pl.id
WHERE cp.local_codigo IN ('PRUEBA-11', 'PRUEBA-14', 'PRUEBA-15')
  AND pl.tipo = 'inicial'
GROUP BY cp.local_codigo, pl.tipo, pl.monto_esperado, pl.id
ORDER BY cp.local_codigo;

-- 3. Ver estado de comisiones de los 3 locales
SELECT
  cp.local_codigo,
  c.usuario_id,
  u.nombre AS usuario_nombre,
  c.fase,
  c.monto_comision,
  c.estado,
  c.fecha_procesado,
  c.fecha_disponible,
  c.fecha_inicial_completa
FROM control_pagos cp
INNER JOIN comisiones c ON c.control_pago_id = cp.id
LEFT JOIN usuarios u ON u.id = c.usuario_id
WHERE cp.local_codigo IN ('PRUEBA-11', 'PRUEBA-14', 'PRUEBA-15')
ORDER BY cp.local_codigo, c.fase;

-- 4. Verificar si hay diferencia de precisión decimal
SELECT
  cp.local_codigo,
  pl.monto_esperado,
  pl.monto_abonado,
  pl.estado,
  (pl.monto_esperado = pl.monto_abonado) AS montos_iguales,
  (pl.monto_esperado - pl.monto_abonado) AS diferencia,
  CASE
    WHEN pl.monto_esperado = pl.monto_abonado THEN 'EXACTO'
    WHEN ABS(pl.monto_esperado - pl.monto_abonado) < 0.01 THEN 'CENTAVOS'
    ELSE 'DIFERENCIA'
  END AS tipo_diferencia
FROM control_pagos cp
INNER JOIN pagos_local pl ON pl.control_pago_id = cp.id
WHERE cp.local_codigo IN ('PRUEBA-11', 'PRUEBA-14', 'PRUEBA-15')
  AND pl.tipo = 'inicial';
```

---

### 4. CAUSA RAÍZ MÁS PROBABLE

Basado en el análisis del código, las causas más probables son:

**1. Precisión decimal en comparación (70% probabilidad)**
- El trigger compara `total_abonado < monto_esperado` con NUMERIC
- Posible acumulación de decimales extras en SUM()
- Estado queda en `'parcial'` en vez de `'completado'`
- Trigger de comisiones NO se dispara

**2. Error silencioso en UPDATE de pagos_local (20% probabilidad)**
- El trigger `update_monto_abonado_and_estado()` falla por alguna razón
- No hay logging de errores en los triggers
- Estado no se actualiza

**3. Problema de transacción (10% probabilidad)**
- Race condition entre INSERT en abonos_pago y UPDATE en pagos_local
- Trigger se ejecuta antes de que transaction commit complete

---

## SOLUCIÓN PROPUESTA

### SOLUCIÓN 1: Fix de precisión decimal en trigger (RECOMENDADO)

**Modificar trigger:** `update_monto_abonado_and_estado()`

**Cambio:**
```sql
CREATE OR REPLACE FUNCTION update_monto_abonado_and_estado()
RETURNS TRIGGER AS $$
DECLARE
  total_abonado NUMERIC(12,2);
  pago_record RECORD;
  diferencia NUMERIC(12,2);
BEGIN
  SELECT SUM(monto) INTO total_abonado
  FROM abonos_pago
  WHERE pago_id = NEW.pago_id;

  SELECT * INTO pago_record
  FROM pagos_local
  WHERE id = NEW.pago_id;

  -- CAMBIO: Calcular diferencia y redondear a 2 decimales
  diferencia := ROUND(pago_record.monto_esperado - COALESCE(total_abonado, 0), 2);

  UPDATE pagos_local
  SET
    monto_abonado = COALESCE(total_abonado, 0),
    estado = CASE
      WHEN COALESCE(total_abonado, 0) = 0 THEN 'pendiente'
      WHEN diferencia > 0.01 THEN 'parcial'  -- ← CAMBIO: tolerancia de 1 centavo
      ELSE 'completado'
    END
  WHERE id = NEW.pago_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Beneficios:**
- ✅ Tolerancia de 1 centavo previene errores de precisión
- ✅ No rompe funcionalidad existente
- ✅ Fix quirúrgico (1 archivo SQL)

**Riesgos:**
- ⚠️ Podría marcar como completado un pago con $0.01 de diferencia real

---

### SOLUCIÓN 2: Agregar fecha_disponible al trigger de abonos

**Modificar trigger:** `actualizar_comisiones_inicial_pagado()`

**Agregar campo:**
```sql
CREATE OR REPLACE FUNCTION actualizar_comisiones_inicial_pagado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'inicial' AND NEW.estado = 'completado' AND (OLD.estado IS NULL OR OLD.estado != 'completado') THEN
    UPDATE comisiones
    SET
      estado = 'disponible',
      fecha_disponible = NOW(),         -- ← Ya existe
      fecha_inicial_completa = NOW()    -- ← AGREGAR este campo
    WHERE control_pago_id = NEW.control_pago_id
      AND estado = 'pendiente_inicial';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Beneficio:** Mejor trazabilidad de cuándo se completó la inicial.

---

### SOLUCIÓN 3: Agregar logging a triggers

**Crear tabla de logs:**
```sql
CREATE TABLE IF NOT EXISTS trigger_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  mensaje TEXT,
  datos JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Modificar trigger para loggear:**
```sql
CREATE OR REPLACE FUNCTION update_monto_abonado_and_estado()
RETURNS TRIGGER AS $$
DECLARE
  total_abonado NUMERIC(12,2);
  pago_record RECORD;
  nuevo_estado TEXT;
BEGIN
  SELECT SUM(monto) INTO total_abonado
  FROM abonos_pago
  WHERE pago_id = NEW.pago_id;

  SELECT * INTO pago_record
  FROM pagos_local
  WHERE id = NEW.pago_id;

  -- Calcular nuevo estado
  IF COALESCE(total_abonado, 0) = 0 THEN
    nuevo_estado := 'pendiente';
  ELSIF COALESCE(total_abonado, 0) < pago_record.monto_esperado THEN
    nuevo_estado := 'parcial';
  ELSE
    nuevo_estado := 'completado';
  END IF;

  -- LOG: Registrar antes de UPDATE
  INSERT INTO trigger_logs (trigger_name, table_name, record_id, mensaje, datos)
  VALUES (
    'update_monto_abonado_and_estado',
    'pagos_local',
    NEW.pago_id,
    'Actualizando estado de pago',
    jsonb_build_object(
      'total_abonado', total_abonado,
      'monto_esperado', pago_record.monto_esperado,
      'estado_anterior', pago_record.estado,
      'estado_nuevo', nuevo_estado
    )
  );

  UPDATE pagos_local
  SET
    monto_abonado = COALESCE(total_abonado, 0),
    estado = nuevo_estado
  WHERE id = NEW.pago_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Beneficio:** Debugging más fácil de problemas futuros.

---

## PLAN DE ACCIÓN INMEDIATO

### FASE 1: DIAGNÓSTICO (15 minutos)

1. ✅ Ejecutar queries de verificación en Supabase SQL Editor
2. ✅ Identificar valores exactos de `monto_esperado` vs `monto_abonado`
3. ✅ Verificar si hay diferencia de centavos
4. ✅ Ver logs de Supabase (si existen)

### FASE 2: FIX TEMPORAL (10 minutos)

Si se confirma que el problema es precisión decimal:

**Opción A: Fix manual en DB**
```sql
-- Forzar cambio de estado para PRUEBA-14 y PRUEBA-15
UPDATE pagos_local
SET estado = 'completado'
WHERE id IN (
  SELECT pl.id
  FROM control_pagos cp
  INNER JOIN pagos_local pl ON pl.control_pago_id = cp.id
  WHERE cp.local_codigo IN ('PRUEBA-14', 'PRUEBA-15')
    AND pl.tipo = 'inicial'
    AND ABS(pl.monto_esperado - pl.monto_abonado) < 0.01
);

-- Esto debería disparar el trigger y cambiar comisiones a 'disponible'
```

**Opción B: Fix manual de comisiones**
```sql
-- Actualizar comisiones directamente
UPDATE comisiones
SET
  estado = 'disponible',
  fecha_disponible = NOW(),
  fecha_inicial_completa = NOW()
WHERE control_pago_id IN (
  SELECT cp.id
  FROM control_pagos cp
  WHERE cp.local_codigo IN ('PRUEBA-14', 'PRUEBA-15')
)
AND estado = 'pendiente_inicial';
```

### FASE 3: FIX PERMANENTE (30 minutos)

1. Crear nueva migration: `20251130_fix_precision_trigger_pagos.sql`
2. Implementar SOLUCIÓN 1 (tolerancia de centavo)
3. Testing con 3 casos:
   - Pago con múltiples abonos (como PRUEBA-11)
   - Pago con abono único que completa (como PRUEBA-14/15)
   - Pago con abono parcial
4. Deploy a staging
5. Verificar que comisiones se actualizan correctamente

### FASE 4: VALIDACIÓN (10 minutos)

1. ✅ PRUEBA-14 y PRUEBA-15 deben tener comisiones en `'disponible'`
2. ✅ Nuevos pagos iniciales completados deben funcionar
3. ✅ No se rompe funcionalidad existente

---

## TESTING ADICIONAL REQUERIDO

Después del fix, probar estos casos:

1. **Pago inicial con abono único exacto**
   - Monto esperado: $5,000
   - Abono: $5,000
   - Resultado esperado: Estado `'completado'`, comisiones `'disponible'`

2. **Pago inicial con múltiples abonos**
   - Monto esperado: $5,000
   - Abono 1: $2,500
   - Abono 2: $2,500
   - Resultado esperado: Estado `'completado'`, comisiones `'disponible'`

3. **Pago inicial con decimales**
   - Monto esperado: $4,327.89
   - Abono 1: $2,000.00
   - Abono 2: $2,327.89
   - Resultado esperado: Estado `'completado'`, comisiones `'disponible'`

4. **Pago inicial con redondeo extremo**
   - Monto esperado: $3,333.33
   - Abono 1: $1,111.11
   - Abono 2: $1,111.11
   - Abono 3: $1,111.11
   - Resultado esperado: Estado `'completado'`, comisiones `'disponible'`

---

## IMPACTO EN PRODUCCIÓN

**Locales afectados actualmente:** 2 (PRUEBA-14, PRUEBA-15)

**Vendedores afectados:** Desconocido (requiere query)

**Monto de comisiones bloqueadas:** Desconocido (requiere query)

**Urgencia:** ALTA (afecta compensación de vendedores)

---

## ARCHIVOS RELEVANTES

### Triggers SQL:
- `supabase/migrations/20251123_create_pagos_system.sql` - Trigger `update_monto_abonado_and_estado()`
- `supabase/migrations/20251128_trigger_comisiones_disponible.sql` - Trigger `actualizar_comisiones_inicial_pagado()`

### Backend:
- `lib/actions-pagos.ts` - Función `registrarAbono()`
- `lib/actions-comisiones.ts` - Queries de comisiones

### Frontend:
- `components/control-pagos/RegistrarAbonoModal.tsx` - Modal de registro de abonos
- `components/control-pagos/PagosPanel.tsx` - Panel de pagos

---

## PRÓXIMOS PASOS

1. ⏳ Usuario ejecuta queries de verificación (FASE 1)
2. ⏳ Compartir resultados de queries
3. ⏳ Confirmar causa raíz
4. ⏳ Implementar fix temporal si es urgente
5. ⏳ Desarrollar fix permanente
6. ⏳ Testing completo
7. ⏳ Deploy a producción

---

**Documento generado:** 30 Noviembre 2025
**Autor:** Project Leader Claude Code
**Sesión:** Bug Report - Comisiones no disponible
