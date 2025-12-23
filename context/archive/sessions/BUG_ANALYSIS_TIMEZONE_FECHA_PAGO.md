# 🐛 BUG ANALYSIS: Timezone Issue - Fecha de Pago "Un Día Adelante"

**Fecha de Análisis:** 30 Noviembre 2025
**Reportado por:** Usuario (Perú, UTC-5)
**Severidad:** MEDIA (impacta precisión de datos)
**Estado:** ANÁLISIS COMPLETO - PENDIENTE FIX

---

## 📋 DESCRIPCIÓN DEL PROBLEMA

### **Síntoma reportado:**
Al procesar un local (PRUEBA-09) el 30 de noviembre 2025 desde Perú (timezone UTC-5), el sistema está mostrando "01 dic. 2025" como fecha de primer pago en lugar de mantener la fecha seleccionada/esperada (30 noviembre).

### **Evidencia visual:**
1. **Modal de Financiamiento:** Muestra calendario con "01/12/2025" seleccionado
2. **Tabla de Control de Pagos:** Muestra "01 dic. 2025" para PRUEBA-09

### **Impacto:**
- Fecha de primer pago incorrecta en DB y UI
- Calendario de cuotas completo desplazado 1 día adelante
- Confusión para usuarios y clientes

---

## 🔍 ROOT CAUSE ANALYSIS

### **Causa raíz identificada: TIMEZONE SHIFT (UTC vs Local Time)**

El problema ocurre en **UN SOLO PUNTO** crítico:

**FinanciamientoModal.tsx - Línea 261:**
```typescript
const fechaMinima = new Date().toISOString().split('T')[0];
```

#### **¿Por qué esto causa el problema?**

1. **Usuario en Perú (UTC-5) a las 23:00 del 30 nov:**
   - `new Date()` crea objeto fecha con hora local: `2025-11-30T23:00:00-05:00`

2. **`.toISOString()` convierte a UTC:**
   - Suma 5 horas → `2025-12-01T04:00:00Z` (pasa de día!)

3. **`.split('T')[0]` extrae solo fecha:**
   - Resultado: `"2025-12-01"` ❌ (debería ser `2025-11-30`)

4. **Este string se usa como `min` del input date:**
   ```tsx
   <input type="date" min={fechaMinima} value={fechaPago} ... />
   ```

5. **Si el usuario NO cambia el datepicker:**
   - `fechaPago` queda vacío o toma `fechaMinima` como default visual
   - Al procesar, el browser puede interpretar el valor como UTC nuevamente

#### **Flujo completo del bug:**

```
PERÚ (UTC-5): 30 nov 23:00
↓
new Date().toISOString()
↓
UTC: 01 dic 04:00  ← SHIFT DE TIMEZONE
↓
split('T')[0]
↓
"2025-12-01"  ← FECHA INCORRECTA
↓
Input date min="2025-12-01"
↓
Usuario procesa
↓
DB: fecha_primer_pago = "2025-12-01"  ← GUARDADO INCORRECTO
↓
UI muestra: "01 dic. 2025"  ← VISUALIZACIÓN INCORRECTA
```

---

## ✅ COMPONENTES QUE SÍ FUNCIONAN CORRECTAMENTE

### **1. Función `calcularFechaCuota()` - CORRECTA**
**Ubicación:** FinanciamientoModal.tsx, líneas 160-189

```typescript
const calcularFechaCuota = (fechaPagoInicial: string, numeroCuota: number): string => {
  // ✅ Parseo manual para evitar timezone shift
  const [año, mes, dia] = fechaPagoInicial.split('-').map(Number);

  // ✅ Construcción manual de fecha sin conversión UTC
  const mesStr = String(mesDestinoFinal + 1).padStart(2, '0');
  const diaStr = String(diaFinal).padStart(2, '0');
  const fechaResultado = `${añoDestino}-${mesStr}-${diaStr}`;

  return fechaResultado; // Formato: "2025-11-30" (siempre correcto)
}
```

**Por qué funciona:**
- NO usa `new Date()` para parseo
- Manipulación aritmética pura de strings/numbers
- NO hay conversión UTC en ningún punto

---

### **2. Función `formatFecha()` - CORRECTA**
**Ubicación:** ControlPagosClient.tsx, líneas 36-40

```typescript
const formatFecha = (fecha: string): string => {
  // ✅ Agregar T00:00:00 para forzar interpretación como hora local (no UTC)
  const date = new Date(fecha + 'T00:00:00');
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};
```

**Por qué funciona:**
- Agrega `T00:00:00` (sin sufijo 'Z') para forzar interpretación local
- `toLocaleDateString('es-PE')` respeta timezone del browser
- Display visual siempre correcto

**Evidencia en código:**
- Líneas 674-684 (tabla sin financiamiento)
- Líneas 722-733 (tabla con financiamiento)
- Ambas usan `new Date(cuota.fecha + 'T00:00:00')` ✅

---

### **3. Almacenamiento en DB - CORRECTO (si input es correcto)**
**Ubicación:** actions-control-pagos.ts, línea 184

```typescript
fecha_primer_pago: data.fechaPrimerPago, // Solo guarda el string recibido
```

**Por qué funciona:**
- NO hace ninguna conversión
- Guarda el valor exacto que viene del modal
- El problema está en el ORIGEN del dato, no en el almacenamiento

---

## 🎯 ÚNICO PUNTO DE FALLO

### **Variable problemática: `fechaMinima`**

**Archivo:** FinanciamientoModal.tsx
**Línea:** 261

**Código actual (INCORRECTO):**
```typescript
const fechaMinima = new Date().toISOString().split('T')[0];
```

**Usado en:**
```tsx
<input
  type="date"
  value={fechaPago}
  onChange={(e) => setFechaPago(e.target.value)}
  min={fechaMinima}  ← AQUÍ se usa
  className="..."
/>
```

---

## 💡 SOLUCIÓN PROPUESTA (NO IMPLEMENTADA)

### **Opción 1: Construcción manual de fecha (RECOMENDADA)**

```typescript
// Obtener fecha local sin conversión UTC
const hoy = new Date();
const año = hoy.getFullYear();
const mes = String(hoy.getMonth() + 1).padStart(2, '0');
const dia = String(hoy.getDate()).padStart(2, '0');
const fechaMinima = `${año}-${mes}-${dia}`;
```

**Ventajas:**
- ✅ NO usa `.toISOString()` (no hay conversión UTC)
- ✅ Usa valores locales directamente (`getFullYear`, `getMonth`, `getDate`)
- ✅ Siempre retorna fecha correcta del timezone del usuario
- ✅ Consistente con patrón usado en `calcularFechaCuota()`

---

### **Opción 2: Offset manual de timezone (ALTERNATIVA)**

```typescript
const hoy = new Date();
const offset = hoy.getTimezoneOffset() * 60000; // Convertir minutos a ms
const fechaLocal = new Date(hoy.getTime() - offset);
const fechaMinima = fechaLocal.toISOString().split('T')[0];
```

**Ventajas:**
- ✅ Corrige el desplazamiento UTC
- ✅ Funciona para cualquier timezone

**Desventajas:**
- ⚠️ Más complejo (requiere entender offsets)
- ⚠️ Dependiente de la configuración del browser

---

### **Opción 3: Librería date-fns o dayjs (OVERKILL)**

```typescript
import { format } from 'date-fns';

const fechaMinima = format(new Date(), 'yyyy-MM-dd');
```

**Ventajas:**
- ✅ Abstrae la complejidad
- ✅ Maneja timezones automáticamente

**Desventajas:**
- ❌ Requiere nueva dependencia
- ❌ Overkill para un caso tan simple
- ❌ Aumenta bundle size

---

## 📦 ARCHIVOS AFECTADOS

### **Archivos que NECESITAN cambio:**
1. **components/locales/FinanciamientoModal.tsx**
   - Línea 261: `const fechaMinima = ...`
   - **Cambio:** Reemplazar con Opción 1 (construcción manual)

### **Archivos que NO necesitan cambio:**
- ❌ lib/actions-control-pagos.ts (almacenamiento es correcto)
- ❌ components/control-pagos/ControlPagosClient.tsx (formateo es correcto)
- ❌ Función `calcularFechaCuota()` (ya es correcta)

---

## 🧪 ESCENARIOS DE TESTING

### **Test Case 1: Usuario en Perú (UTC-5) a las 23:00**
**Input:** 30 nov 2025, 23:00 hora local
**Expected:** `fechaMinima = "2025-11-30"`
**Current (bug):** `fechaMinima = "2025-12-01"` ❌

### **Test Case 2: Usuario en España (UTC+1) a las 23:59**
**Input:** 30 nov 2025, 23:59 hora local
**Expected:** `fechaMinima = "2025-11-30"`
**Current (bug):** `fechaMinima = "2025-12-01"` ❌

### **Test Case 3: Usuario en UTC a las 00:00**
**Input:** 30 nov 2025, 00:00 UTC
**Expected:** `fechaMinima = "2025-11-30"`
**Current:** `fechaMinima = "2025-11-30"` ✅ (funciona por coincidencia)

**Conclusión:** El bug se manifiesta en **CUALQUIER timezone != UTC** durante ciertas horas del día.

---

## 🚨 CONSIDERACIONES IMPORTANTES

### **1. ¿Por qué no afecta a otros componentes?**
Porque SOLO `fechaMinima` usa `.toISOString()` con `new Date()` actual.
- `calcularFechaCuota()` NO usa `new Date()` para parseo
- `formatFecha()` usa `T00:00:00` para forzar local
- Backend solo guarda strings recibidos

### **2. ¿Por qué no se detectó antes?**
- Si el usuario está en timezone UTC-0 a UTC+X, el bug puede NO manifestarse en ciertos rangos horarios
- Si el usuario SIEMPRE cambia la fecha manualmente en el datepicker, el bug queda oculto
- El bug solo es visible cuando `new Date()` + conversión UTC cruza medianoche

### **3. ¿Impacta datos históricos?**
**SÍ** - Si hay registros en `control_pagos` con `fecha_primer_pago` incorrecta:
- La fecha guardada en DB es incorrecta
- El calendario de cuotas completo está desplazado 1 día
- **Requiere corrección manual en DB** después del fix de código

---

## 📊 IMPACTO ESTIMADO

### **Usuarios afectados:**
- ✅ Todos los usuarios en timezone != UTC
- ✅ Solo durante rangos horarios específicos (depende del offset)

### **Datos afectados:**
- ✅ `control_pagos.fecha_primer_pago` (puede tener fechas incorrectas)
- ✅ `control_pagos.calendario_cuotas` (todas las fechas desplazadas)

### **Funcionalidad NO afectada:**
- ❌ Visualización de fechas YA guardadas (formateo es correcto)
- ❌ Cálculo de cuotas a partir de fecha dada (lógica es correcta)

---

## 🔧 PLAN DE FIX (PROPUESTO)

### **FASE 1: Fix del código (1 línea)**
```typescript
// ANTES (línea 261):
const fechaMinima = new Date().toISOString().split('T')[0];

// DESPUÉS:
const hoy = new Date();
const fechaMinima = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
```

### **FASE 2: Testing (3 escenarios)**
1. Probar en browser con timezone UTC-5 (Perú)
2. Probar con DevTools cambiando timezone a UTC+1 (España)
3. Verificar que `fechaMinima` siempre retorna fecha local correcta

### **FASE 3: Verificación de datos históricos (SQL)**
```sql
-- Verificar registros con posible fecha incorrecta
SELECT id, codigo_local, fecha_primer_pago, created_at
FROM control_pagos
WHERE DATE(fecha_primer_pago) != DATE(created_at)
ORDER BY created_at DESC;
```

Si hay registros afectados:
- Analizar caso por caso
- Corrección manual (requiere conocer fecha REAL esperada)

### **FASE 4: Deploy y monitoreo**
- Commit: "fix(financiamiento): Timezone issue in fechaMinima (UTC shift)"
- Deploy a staging
- Verificar con usuario en Perú
- Deploy a production

---

## 📚 LECCIONES APRENDIDAS

### **❌ Anti-patrón detectado:**
```typescript
// NUNCA hacer esto para obtener fecha local:
const fecha = new Date().toISOString().split('T')[0]; // ❌ Convierte a UTC!
```

### **✅ Patrón correcto:**
```typescript
// SIEMPRE construir manualmente para fecha local:
const hoy = new Date();
const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
```

### **✅ Patrón correcto para parseo:**
```typescript
// Al recibir string "YYYY-MM-DD", agregar T00:00:00 para forzar local:
const fecha = new Date(fechaString + 'T00:00:00'); // ✅ No convierte a UTC
```

---

## 🔗 REFERENCIAS

### **Archivos revisados:**
1. `components/locales/FinanciamientoModal.tsx` (860 líneas)
2. `lib/actions-control-pagos.ts` (405 líneas)
3. `components/control-pagos/ControlPagosClient.tsx` (223 líneas)

### **Sesiones relacionadas:**
- Sesión 52F: Fecha de pago + Calendario de cuotas (primera implementación)
- Sesión 52G: Calendario CON financiamiento
- Sesión 54: Sistema completo de Control de Pagos

### **MDN References:**
- [Date.toISOString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString) - "Returns a string in ISO 8601 format in UTC"
- [Date.getDate()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getDate) - "Returns the day of the month (1-31) for the specified date according to local time"

---

**Análisis completado por:** Claude Code - Project Leader
**Fecha:** 30 Noviembre 2025
**Status:** READY FOR FIX IMPLEMENTATION

---

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
