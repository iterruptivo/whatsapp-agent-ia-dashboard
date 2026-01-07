# Lógica Inteligente: Detección de Ciclos de Venta Caída

## Problema Resuelto

Cuando un local pasa por un ciclo de venta que no prospera (NARANJA → VERDE), el sistema ahora detecta inteligentemente si debe preguntar al usuario "¿Es el mismo cliente o uno nuevo?".

## Flujo de Estados del Local

```
VERDE (disponible)
  ↓
AMARILLO (negociando)
  ↓
NARANJA (separado/confirmado)
  ↓
  ├─→ ROJO (vendido) ✅ Venta exitosa
  └─→ VERDE (libre) ⚠️ Venta caída (se liberó el local)
```

## Casos de Uso

### 1. Primera Separación del Local
**Situación:** El local nunca ha tenido una ficha de cliente.

**Decisión:** NO preguntar (es cliente nuevo obviamente)

**Flujo:**
- Historial vacío o sin reset a VERDE
- Se carga formulario en blanco

---

### 2. Venta Caída (NARANJA → VERDE)
**Situación:** El local tuvo una separación previa que no prosperó y volvió a VERDE.

**Decisión:** SÍ preguntar si es el mismo cliente o uno nuevo

**Flujo:**
- Se detecta en historial: `estado_nuevo = 'verde' AND estado_anterior = 'naranja'`
- La ficha fue creada ANTES del reset a VERDE (`ficha.updated_at < historial.created_at`)
- Se muestra modal: "Este local tuvo un cliente anterior: [nombre]. ¿Es el mismo cliente?"

**Opciones:**
- **Mismo Cliente:** Carga los datos de la ficha anterior
- **Cliente Nuevo:** Borra la ficha y carga formulario en blanco

---

### 3. Usuario Ya Confirmó en Este Ciclo
**Situación:** El usuario ya actualizó la ficha después del último reset a VERDE.

**Decisión:** NO volver a preguntar

**Flujo:**
- `ficha.updated_at > historial.created_at` (del último reset)
- Se carga la ficha directamente (el usuario ya tomó la decisión)

---

### 4. Local Vendido (ROJO)
**Situación:** El local está en estado ROJO (venta completada).

**Decisión:** NO preguntar, cargar ficha directamente

**Flujo:**
- Estado ROJO es definitivo
- Se carga la ficha del cliente que compró

---

## Implementación Técnica

### Archivo Principal
`lib/actions-clientes-ficha-logic.ts`

```typescript
export async function analizarCicloVenta(
  localId: string,
  estadoActual: 'verde' | 'amarillo' | 'naranja' | 'rojo'
): Promise<CicloVentaAnalisis>
```

**Algoritmo:**

1. **Validar estado ROJO** → NO preguntar
2. **Obtener historial** del local (desde `locales_historial`)
3. **Buscar último reset** a VERDE desde NARANJA/ROJO
4. **Obtener ficha** de cliente (`clientes_ficha`)
5. **Comparar timestamps:**
   - Si `ficha.updated_at > reset.created_at` → NO preguntar (ya confirmó)
   - Si `ficha.updated_at < reset.created_at` → SÍ preguntar (ciclo caído)

### Estructura de Respuesta

```typescript
interface CicloVentaAnalisis {
  debePreguntar: boolean;
  razon: string;
  ultimoResetAVerde: string | null;
  fichaActualizadaDespues: boolean;
}
```

**Ejemplo de respuesta:**
```json
{
  "debePreguntar": true,
  "razon": "Ciclo de venta caída detectado - ficha es anterior al último reset",
  "ultimoResetAVerde": "2026-01-03T15:30:00Z",
  "fichaActualizadaDespues": false
}
```

---

## Integración en FichaInscripcionModal

### Antes (Lógica Antigua)

```typescript
// PROBLEMA: Preguntaba SIEMPRE que hubiera ficha previa (sin considerar ciclos)
const fichaTieneDatos = existingFicha?.titular_nombres || existingFicha?.titular_numero_documento;
const localNoEstaVendido = local!.estado !== 'rojo';

if (existingFicha && fichaTieneDatos && localNoEstaVendido) {
  setShowClienteConfirmModal(true); // ❌ Pregunta cada vez
}
```

### Después (Lógica Inteligente)

```typescript
// ✅ Análisis inteligente basado en historial + timestamps
const analisis = await analizarCicloVenta(local!.id, local!.estado);

if (analisis.debePreguntar) {
  const datosAnterior = await obtenerDatosClienteAnterior(local!.id);
  setShowClienteConfirmModal(true);
  // Solo pregunta cuando realmente hay un ciclo caído
}
```

---

## Tablas Involucradas

### `locales_historial`
```sql
CREATE TABLE locales_historial (
  id UUID PRIMARY KEY,
  local_id UUID NOT NULL,
  usuario_id UUID,
  estado_anterior VARCHAR(20), -- 'verde', 'amarillo', 'naranja', 'rojo'
  estado_nuevo VARCHAR(20),
  accion VARCHAR(2000),
  created_at TIMESTAMPTZ NOT NULL
);
```

**Registro clave para detección:**
```sql
-- Ciclo caído: NARANJA → VERDE
SELECT * FROM locales_historial
WHERE local_id = 'abc-123'
  AND estado_nuevo = 'verde'
  AND estado_anterior IN ('naranja', 'rojo')
ORDER BY created_at DESC
LIMIT 1;
```

### `clientes_ficha`
```sql
-- Campo crítico: updated_at
SELECT updated_at FROM clientes_ficha WHERE local_id = 'abc-123';
```

**Comparación:**
```typescript
if (ficha.updated_at > historial.created_at) {
  // Ficha actualizada DESPUÉS del reset → Usuario ya confirmó
  return { debePreguntar: false };
}
```

---

## Logs de Debugging

El sistema registra logs en consola para debugging:

```
[CICLO_VENTA] Analizando local: abc-123
[CICLO_VENTA] Historial encontrado: 15 registros
[CICLO_VENTA] Último reset a VERDE: 2026-01-03T15:30:00Z
[CICLO_VENTA] Ficha updated_at: 2026-01-02T10:00:00Z
[CICLO_VENTA] Decisión: SÍ PREGUNTAR (ficha anterior al reset)
```

---

## Casos Edge

### 1. Error en la BD
**Decisión:** NO preguntar (mejor UX, evitar bloqueo)

```typescript
catch (error) {
  return {
    debePreguntar: false,
    razon: 'Error en análisis - defaulteando a NO preguntar',
  };
}
```

### 2. Ficha sin Datos (registro vacío)
**Decisión:** NO preguntar

```typescript
const fichaTieneDatos = ficha.titular_nombres || ficha.titular_numero_documento;
if (!fichaTieneDatos) {
  return { debePreguntar: false };
}
```

### 3. Local sin Historial
**Decisión:** NO preguntar (primera vez)

```typescript
if (historial.length === 0) {
  return {
    debePreguntar: false,
    razon: 'Primera separación del local (sin historial)',
  };
}
```

---

## Beneficios

### Antes
- ❌ Preguntaba SIEMPRE (molesto para vendedores)
- ❌ No consideraba si el usuario ya confirmó
- ❌ No detectaba ciclos caídos

### Después
- ✅ Solo pregunta cuando es necesario (ciclo caído)
- ✅ Respeta la decisión del usuario (no vuelve a preguntar)
- ✅ Detecta automáticamente patrones en el historial
- ✅ Mejor UX para vendedores

---

## Testing

### Caso 1: Primera Separación
```typescript
// Dado: Local sin historial
// Cuando: Se abre FichaInscripcionModal
// Entonces: NO debe preguntar, formulario en blanco
```

### Caso 2: Ciclo Caído
```typescript
// Dado: Local con historial NARANJA → VERDE
// Y: ficha.updated_at < reset.created_at
// Cuando: Se abre FichaInscripcionModal
// Entonces: Debe mostrar modal "¿Es el mismo cliente?"
```

### Caso 3: Usuario Ya Confirmó
```typescript
// Dado: Local con historial NARANJA → VERDE
// Y: ficha.updated_at > reset.created_at
// Cuando: Se abre FichaInscripcionModal
// Entonces: NO debe preguntar, cargar ficha directamente
```

### Caso 4: Local Vendido
```typescript
// Dado: Local en estado ROJO
// Cuando: Se abre FichaInscripcionModal
// Entonces: NO debe preguntar, cargar ficha del comprador
```

---

## Archivos Modificados

### Nuevos Archivos
- `lib/actions-clientes-ficha-logic.ts` (Server Actions con lógica de análisis)
- `docs/LOGICA_CICLO_VENTA_CAIDA.md` (esta documentación)

### Archivos Modificados
- `components/locales/FichaInscripcionModal.tsx` (integración de lógica inteligente)

---

## Conclusión

Esta implementación resuelve el problema de UX donde el sistema preguntaba innecesariamente por el cliente anterior. Ahora:

1. **Detecta ciclos caídos** analizando el historial
2. **Respeta decisiones previas** comparando timestamps
3. **Solo pregunta cuando es necesario** (venta caída no confirmada)
4. **Mantiene la integridad** de los datos del cliente

El vendedor tiene una experiencia más fluida y el sistema es más inteligente.
