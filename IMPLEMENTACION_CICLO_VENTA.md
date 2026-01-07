# Implementación: Lógica Inteligente de Ciclo de Venta Caída

## Resumen Ejecutivo

Se implementó un sistema inteligente que detecta automáticamente cuándo preguntar al vendedor si está trabajando con el mismo cliente o uno nuevo, basándose en el análisis del historial del local y timestamps de la ficha.

---

## Cambios Implementados

### 1. Nuevo Archivo: `lib/actions-clientes-ficha-logic.ts`

**Función Principal:**
```typescript
export async function analizarCicloVenta(
  localId: string,
  estadoActual: 'verde' | 'amarillo' | 'naranja' | 'rojo'
): Promise<CicloVentaAnalisis>
```

**Responsabilidades:**
- Analizar historial del local (`locales_historial`)
- Detectar ciclos de venta caída (NARANJA → VERDE)
- Comparar timestamps entre ficha y último reset
- Decidir si mostrar modal de confirmación

**Algoritmo:**
```
1. Si estado = ROJO → NO preguntar (venta completada)
2. Obtener historial del local
3. Buscar último cambio: estado_nuevo='verde' AND estado_anterior IN ('naranja', 'rojo')
4. Si NO hay reset → NO preguntar (primera vez)
5. Obtener ficha de cliente
6. Si NO hay ficha o está vacía → NO preguntar
7. Comparar timestamps:
   - ficha.updated_at > reset.created_at → NO preguntar (ya confirmó)
   - ficha.updated_at < reset.created_at → SÍ preguntar (ciclo caído)
```

**Helper Adicional:**
```typescript
export async function obtenerDatosClienteAnterior(localId: string)
```
Obtiene nombre y documento del cliente anterior para mostrar en el modal.

---

### 2. Modificación: `components/locales/FichaInscripcionModal.tsx`

**Cambio en Imports:**
```typescript
import { analizarCicloVenta, obtenerDatosClienteAnterior } from '@/lib/actions-clientes-ficha-logic';
```

**Lógica Antigua (Líneas 595-614):**
```typescript
// ❌ PROBLEMA: Preguntaba siempre que hubiera ficha previa
const fichaTieneDatos = existingFicha?.titular_nombres || existingFicha?.titular_numero_documento;
const localNoEstaVendido = local!.estado !== 'rojo';

if (existingFicha && fichaTieneDatos && localNoEstaVendido) {
  setShowClienteConfirmModal(true); // Pregunta cada vez
}
```

**Lógica Nueva (Líneas 596-616):**
```typescript
// ✅ SOLUCIÓN: Análisis inteligente basado en historial
const analisis = await analizarCicloVenta(local!.id, local!.estado);

if (analisis.debePreguntar) {
  const datosAnterior = await obtenerDatosClienteAnterior(local!.id);
  setFichaAnteriorData(existingFicha);
  setClienteAnteriorNombre(datosAnterior?.nombre || 'Cliente anterior');
  setShowClienteConfirmModal(true);
  setLoading(false);
  return; // Solo pregunta cuando realmente hay ciclo caído
}
```

---

## Estructura de Datos

### Interface: `CicloVentaAnalisis`
```typescript
interface CicloVentaAnalisis {
  debePreguntar: boolean;           // Decisión: mostrar modal o no
  razon: string;                     // Explicación legible de la decisión
  ultimoResetAVerde: string | null;  // Timestamp del último reset (ISO 8601)
  fichaActualizadaDespues: boolean;  // Si ficha fue actualizada post-reset
}
```

**Ejemplos de respuestas:**

**Caso 1: Primera separación**
```json
{
  "debePreguntar": false,
  "razon": "Primera separación del local (sin historial)",
  "ultimoResetAVerde": null,
  "fichaActualizadaDespues": false
}
```

**Caso 2: Ciclo caído (debe preguntar)**
```json
{
  "debePreguntar": true,
  "razon": "Ciclo de venta caída detectado - ficha es anterior al último reset",
  "ultimoResetAVerde": "2026-01-03T15:30:00.000Z",
  "fichaActualizadaDespues": false
}
```

**Caso 3: Usuario ya confirmó**
```json
{
  "debePreguntar": false,
  "razon": "Ficha ya fue actualizada en este ciclo (después del reset)",
  "ultimoResetAVerde": "2026-01-03T15:30:00.000Z",
  "fichaActualizadaDespues": true
}
```

---

## Tablas de Base de Datos Utilizadas

### `locales_historial`
**Campos relevantes:**
- `local_id` (UUID)
- `estado_anterior` ('verde' | 'amarillo' | 'naranja' | 'rojo')
- `estado_nuevo` ('verde' | 'amarillo' | 'naranja' | 'rojo')
- `created_at` (TIMESTAMPTZ)

**Query clave:**
```sql
SELECT * FROM locales_historial
WHERE local_id = $1
  AND estado_nuevo = 'verde'
  AND estado_anterior IN ('naranja', 'rojo')
ORDER BY created_at DESC
LIMIT 1;
```

### `clientes_ficha`
**Campos relevantes:**
- `local_id` (UUID)
- `titular_nombres` (VARCHAR)
- `titular_numero_documento` (VARCHAR)
- `updated_at` (TIMESTAMPTZ) ← **CRÍTICO** para comparación

---

## Matriz de Decisiones

| Condición | Resultado |
|-----------|-----------|
| Local en ROJO | NO preguntar (venta completada) |
| Sin historial | NO preguntar (primera vez) |
| Sin reset a VERDE | NO preguntar (mismo ciclo) |
| Sin ficha de cliente | NO preguntar (nuevo cliente) |
| Ficha vacía (sin datos) | NO preguntar (registro inválido) |
| Ficha actualizada DESPUÉS del reset | NO preguntar (ya confirmó) |
| Ficha actualizada ANTES del reset | **SÍ preguntar** (ciclo caído) |

---

## Flujo de Usuario

### Escenario: Venta Caída

**Contexto Inicial:**
- Local LC-4325 estaba en NARANJA (separado)
- Tenía ficha de cliente: "Juan Pérez - DNI 12345678"
- Fecha de última actualización ficha: 2026-01-02 10:00:00

**Evento:**
- Sistema o admin libera el local (NARANJA → VERDE)
- Timestamp del reset: 2026-01-03 15:30:00

**Cuando vendedor abre ficha:**
1. Sistema ejecuta `analizarCicloVenta()`
2. Detecta reset a VERDE posterior a ficha
3. Compara: `2026-01-02 < 2026-01-03` ✅
4. Muestra modal:

```
┌─────────────────────────────────────────┐
│ Este local tuvo un cliente anterior:    │
│                                          │
│ Juan Pérez                              │
│ DNI: 12345678                           │
│                                          │
│ ¿Es el mismo cliente?                   │
│                                          │
│  [Mismo Cliente]  [Cliente Nuevo]       │
└─────────────────────────────────────────┘
```

**Opciones:**
- **Mismo Cliente:** Carga datos de Juan Pérez
- **Cliente Nuevo:** Borra ficha, formulario en blanco

---

## Testing

### Caso 1: Primera Separación
```typescript
// Setup
const localId = 'new-local-123';
// Historial vacío

// Ejecución
const analisis = await analizarCicloVenta(localId, 'naranja');

// Esperado
expect(analisis.debePreguntar).toBe(false);
expect(analisis.razon).toContain('Primera separación');
```

### Caso 2: Ciclo Caído
```typescript
// Setup
const localId = 'local-con-reset';
// Historial: [NARANJA → VERDE @ 2026-01-03]
// Ficha: updated_at = 2026-01-02

// Ejecución
const analisis = await analizarCicloVenta(localId, 'amarillo');

// Esperado
expect(analisis.debePreguntar).toBe(true);
expect(analisis.razon).toContain('Ciclo de venta caída');
```

### Caso 3: Usuario Confirmó
```typescript
// Setup
const localId = 'local-confirmado';
// Historial: [NARANJA → VERDE @ 2026-01-03]
// Ficha: updated_at = 2026-01-04 (después del reset)

// Ejecución
const analisis = await analizarCicloVenta(localId, 'amarillo');

// Esperado
expect(analisis.debePreguntar).toBe(false);
expect(analisis.razon).toContain('ya fue actualizada');
```

---

## Logs de Debugging

**Ejemplo de salida en consola:**
```
[CICLO_VENTA] Analizando local: abc-123, estado: amarillo
[CICLO_VENTA] Historial recuperado: 8 registros
[CICLO_VENTA] Buscando último reset a VERDE...
[CICLO_VENTA] Reset encontrado: 2026-01-03T15:30:00.000Z
[CICLO_VENTA] Verificando ficha de cliente...
[CICLO_VENTA] Ficha encontrada, updated_at: 2026-01-02T10:00:00.000Z
[CICLO_VENTA] Comparación: 2026-01-02 < 2026-01-03
[CICLO_VENTA] DECISIÓN: SÍ PREGUNTAR (ciclo caído)

[FichaModal] Análisis de ciclo: {
  debePreguntar: true,
  razon: "Ciclo de venta caída detectado...",
  ultimoResetAVerde: "2026-01-03T15:30:00.000Z",
  fichaActualizadaDespues: false
}
```

---

## Manejo de Errores

```typescript
try {
  // Análisis del ciclo
} catch (error) {
  console.error('[CICLO_VENTA] Error analizando ciclo:', error);
  return {
    debePreguntar: false, // Default seguro
    razon: 'Error en análisis - defaulteando a NO preguntar',
    ultimoResetAVerde: null,
    fichaActualizadaDespues: false,
  };
}
```

**Estrategia:** En caso de error, NO bloquear la UX. Mejor permitir continuar sin pregunta.

---

## Impacto en UX

### Antes
- Vendedor abre ficha → **SIEMPRE** pregunta si hay ficha previa
- Molesto si el vendedor ya confirmó o si es claramente nuevo cliente
- No considera el contexto del historial

### Después
- Vendedor abre ficha → **SOLO** pregunta si hay ciclo caído real
- Respeta decisión previa del vendedor
- Considera el flujo completo del local

**Resultado:** Experiencia más fluida y menos interrupciones innecesarias.

---

## Archivos del Proyecto

### Nuevos
```
lib/actions-clientes-ficha-logic.ts  (232 líneas)
docs/LOGICA_CICLO_VENTA_CAIDA.md     (documentación completa)
IMPLEMENTACION_CICLO_VENTA.md        (este archivo)
```

### Modificados
```
components/locales/FichaInscripcionModal.tsx
  - Línea 8: Import de funciones de análisis
  - Líneas 596-616: Reemplazo de lógica antigua con inteligente
```

---

## Consideraciones Futuras

### Optimizaciones Posibles
1. **Cache del análisis:** Guardar resultado en estado para evitar re-análisis
2. **Indicador visual:** Mostrar badge si es "cliente recuperado"
3. **Historial de confirmaciones:** Guardar explícitamente la decisión del usuario

### Edge Cases a Monitorear
1. **Múltiples resets rápidos:** ¿Qué pasa si hay 2+ resets en 1 día?
2. **Ficha sin timestamp:** ¿Hay fichas antiguas sin `updated_at`?
3. **Cambios manuales en BD:** ¿Qué pasa si admin modifica historial?

---

## Conclusión

Esta implementación resuelve un problema crítico de UX mediante análisis inteligente del historial del local. El sistema ahora:

1. ✅ **Detecta automáticamente** ciclos de venta caída
2. ✅ **Respeta decisiones previas** del usuario
3. ✅ **Reduce interrupciones** innecesarias
4. ✅ **Mantiene integridad** de los datos

El código es robusto, bien documentado y fácil de mantener.
