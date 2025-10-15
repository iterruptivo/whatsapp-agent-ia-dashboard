# ANALISIS: DUPLICACION DE MENSAJES EN HISTORIAL
**Fecha:** 13 Octubre 2025
**Problema:** Los mensajes se duplican dentro de los campos `historial_conversacion` y `historial_reciente` de un MISMO lead (no son registros duplicados)

---

## RESUMEN EJECUTIVO

**Problema Identificado:** Cuando un usuario envía un mensaje por WhatsApp, el contenido del mensaje aparece DUPLICADO dentro de los campos de texto `historial_conversacion` y `historial_reciente` de un solo registro de lead.

**Root Cause:** Hay TRES (3) nodos "Supabase - Upsert Lead" en el flujo que ejecutan en diferentes rutas, y todos están concatenando mensajes a los historiales SIN verificar si ya fueron añadidos previamente.

---

## FLUJO DE DATOS ACTUAL

### 1. RECEPCION DE MENSAJE (Webhook)
```
Webhook: Recibir WhatsApp
    ↓
Switch (text/audio/verification)
    ↓
Code in JavaScript → Extract telefono, message_id, body
    ↓
HTTP Request - Mark Message as Read
    ↓
HTTP Request (GitHub) → Get knowledge base
    ↓
Supabase - Get Lead → Obtiene lead existente de BD
```

### 2. CONSTRUCCION DE HISTORIAL - PRIMERA VEZ (Code1)
**Nodo:** Code1 (líneas 240-249)
**Ubicación:** Después de obtener lead de BD

**Código crítico:**
```javascript
// Obtener historial previo de la BD
const historialPrevio = leadData.historial_conversacion ?? "";

// CONCATENAR mensaje del usuario
const historial = (historialPrevio ? historialPrevio + "\n" : "") + "Usuario: " + userMessage;

return [{
  json: {
    telefono,
    userMessage,
    historial,  // ← PRIMER APPEND del mensaje
    ...
  }
}];
```

**Salida de Code1:**
- `historial`: Contiene historial previo + "Usuario: [mensaje]"
- Este campo se pasa a "Message a model" (GPT-4o-mini)

### 3. RESPUESTA DEL BOT Y CONSTRUCCION FINAL (Code2)
**Nodo:** Code2 (líneas 228-236)
**Ubicación:** Después de recibir respuesta de GPT

**Código crítico:**
```javascript
// Obtener datos previos de Code1
const historialPrevio = $node["Code1"].json.historial || "";
const userMessage = $node["Code1"].json.userMessage || "";

// Obtener respuesta del bot
const botResponse = $node["Message a model"].json?.message?.content || "";

let mensajeBot = botResponse;

// Construir historial completo
const historial_conversacion =
  (historialPrevio ? historialPrevio + "\n" : "") +
  "Usuario: " + userMessage +           // ← SEGUNDO APPEND del mensaje usuario
  "\nNoa: " + mensajeBot;

// Últimos 5 mensajes
const lines = historial_conversacion.split(/\r?\n/).filter(Boolean);
const historial_reciente = lines.slice(-10).join("\n");

return [{
  json: {
    historial_conversacion,
    historial_reciente,
    ultimo_mensaje: userMessage,
    ...
  }
}];
```

**PROBLEMA DETECTADO:**
1. `historialPrevio` YA CONTIENE "Usuario: [mensaje]" (añadido en Code1)
2. Luego Code2 VUELVE A CONCATENAR "Usuario: " + userMessage
3. Resultado: El mensaje del usuario aparece DOS VECES

**Ejemplo de duplicación:**
```
[Historial previo de BD]
Usuario: Hola               ← Añadido en Code1
Usuario: Hola               ← Añadido en Code2
Noa: Hola, ¿en qué puedo ayudarte?
```

### 4. TRES RUTAS DE UPSERT

El flujo tiene 3 nodos "Supabase - Upsert Lead" en diferentes rutas:

#### Ruta 1: IF Conversacion Cerrada (TRUE) → Supabase Get Lead1 → If1 (TRUE) → Supabase - Get Vendedores → Notifications → Code - Get First Item → **Supabase - Upsert Lead** (líneas 720-815)

#### Ruta 2: IF Conversacion Cerrada (TRUE) → Supabase Get Lead1 → If1 (FALSE) → **Supabase - Upsert Lead** (líneas 720-815)

#### Ruta 3: IF Conversacion Cerrada (FALSE) → **Supabase - Upsert Lead** (líneas 720-815)

**Todos los nodos Upsert son el MISMO NODO reutilizado** (id: 777b467d-d3fb-4180-b320-b5df0f41ccec)

**Datos enviados al Upsert:**
```javascript
{
  telefono: $json.telefono,
  nombre: $json.nombre,
  rubro: $json.rubro,
  horario_visita: $json.horario_visita,
  estado: $json.estado,
  historial_conversacion: $json.historial_conversacion,  // ← Ya contiene duplicados
  historial_reciente: $json.historial_reciente,          // ← Ya contiene duplicados
  resumen_historial: $json.resumen_historial,
  ultimo_mensaje: $json.ultimo_mensaje,
  intentos_bot: $json.intentos_bot,
  fecha_captura: $json.fecha_captura,
  notificacion_enviada: $json.notificacion_enviada
}
```

Todos usan header: `Prefer: resolution=merge-duplicates`

---

## ROOT CAUSE ANALYSIS

### Causa Raíz: DOBLE CONCATENACION EN Code1 y Code2

**Code1 (línea 241):**
```javascript
const historial = (historialPrevio ? historialPrevio + "\n" : "") + "Usuario: " + userMessage;
```
Añade: "Usuario: [mensaje]"

**Code2 (línea 253-255):**
```javascript
const historial_conversacion =
  (historialPrevio ? historialPrevio + "\n" : "") +
  "Usuario: " + userMessage +           // ← DUPLICACION AQUÍ
  "\nNoa: " + mensajeBot;
```
Vuelve a añadir: "Usuario: [mensaje]"

### Por qué ocurre:

1. **Code1** obtiene `historialPrevio` de la BD
2. **Code1** concatena "Usuario: [mensaje]" y lo guarda en `historial`
3. **Code1** pasa `historial` al siguiente nodo (Message a model)
4. **Code2** obtiene `historialPrevio` de Code1.json.historial (que YA tiene "Usuario: [mensaje]")
5. **Code2** concatena NUEVAMENTE "Usuario: [mensaje]"
6. Resultado: El mensaje aparece 2 veces

### Flujo de datos:
```
BD: "Historial antiguo"
    ↓
Code1: "Historial antiguo\nUsuario: Hola"  ← PRIMER APPEND
    ↓
Code2 recibe: historialPrevio = "Historial antiguo\nUsuario: Hola"
    ↓
Code2: "Historial antiguo\nUsuario: Hola\nUsuario: Hola\nNoa: Respuesta"  ← SEGUNDO APPEND
```

---

## SOLUCION PROPUESTA

### Opción 1: ELIMINAR concatenación en Code2 (RECOMENDADA)

**Cambio en Code2 (línea 253-255):**

**ANTES (con bug):**
```javascript
const historialPrevio = $node["Code1"].json.historial || "";
const userMessage = $node["Code1"].json.userMessage || "";

// Construir historial completo
const historial_conversacion =
  (historialPrevio ? historialPrevio + "\n" : "") +
  "Usuario: " + userMessage +           // ← ELIMINAR ESTA LINEA
  "\nNoa: " + mensajeBot;
```

**DESPUES (corregido):**
```javascript
const historialPrevio = $node["Code1"].json.historial || "";
const userMessage = $node["Code1"].json.userMessage || "";

// Construir historial completo
const historial_conversacion =
  (historialPrevio ? historialPrevio + "\n" : "") +
  "Noa: " + mensajeBot;
```

**Razón:**
- Code1 YA añadió "Usuario: [mensaje]" a historial
- Code2 solo debe añadir la respuesta del bot "Noa: [mensaje]"
- NO debe volver a añadir el mensaje del usuario

**Resultado esperado:**
```
[Historial previo]
Usuario: Hola               ← Añadido en Code1
Noa: Respuesta              ← Añadido en Code2
```

---

### Opción 2: NO concatenar en Code1, solo en Code2

**Cambio en Code1 (línea 241):**

**ANTES:**
```javascript
const historial = (historialPrevio ? historialPrevio + "\n" : "") + "Usuario: " + userMessage;
```

**DESPUES:**
```javascript
const historial = historialPrevio;  // NO concatenar, solo pasar el historial previo
```

**Cambio en Code2: MANTENER concatenación completa**

**Razón:**
- Code1 NO modifica el historial, solo lo pasa
- Code2 se encarga de añadir AMBOS mensajes (usuario + bot)
- Un solo punto de concatenación = menos riesgo de duplicados

**Desventaja:**
- Message a model (GPT) recibirá historial SIN el mensaje actual del usuario
- Podría afectar el contexto del bot

**NO RECOMENDADA** porque afecta la calidad de las respuestas del bot.

---

### Opción 3: Verificar duplicados antes de concatenar (Defensiva)

**Cambio en Code2:**

```javascript
const historialPrevio = $node["Code1"].json.historial || "";
const userMessage = $node["Code1"].json.userMessage || "";
const botResponse = $node["Message a model"].json?.message?.content || "";

// Verificar si el mensaje del usuario YA está en historialPrevio
const ultimaLineaUsuario = "Usuario: " + userMessage;
const yaIncluidoUsuario = historialPrevio.includes(ultimaLineaUsuario);

// Construir historial completo
let historial_conversacion = historialPrevio;

// Solo añadir mensaje usuario si NO está ya incluido
if (!yaIncluidoUsuario) {
  historial_conversacion += (historial_conversacion ? "\n" : "") + ultimaLineaUsuario;
}

// Añadir respuesta bot
historial_conversacion += "\nNoa: " + mensajeBot;

// Últimos 10 mensajes
const lines = historial_conversacion.split(/\r?\n/).filter(Boolean);
const historial_reciente = lines.slice(-10).join("\n");
```

**Razón:**
- Código defensivo: verifica antes de concatenar
- Previene duplicados incluso si hay cambios futuros en Code1
- Más robusto

**Desventaja:**
- Más complejo
- Si el usuario envía el mismo mensaje legítimamente dos veces, no se registrará la segunda

---

## RECOMENDACION FINAL

### SOLUCION: Opción 1 (Más Simple y Correcta)

**Modificar Code2 para eliminar la concatenación duplicada del mensaje del usuario.**

**Pasos:**
1. Editar nodo "Code2" en n8n
2. Localizar líneas 253-255:
   ```javascript
   const historial_conversacion =
     (historialPrevio ? historialPrevio + "\n" : "") +
     "Usuario: " + userMessage +           // ← ELIMINAR ESTA LINEA
     "\nNoa: " + mensajeBot;
   ```
3. Cambiar a:
   ```javascript
   const historial_conversacion =
     (historialPrevio ? historialPrevio + "\n" : "") +
     "Noa: " + mensajeBot;
   ```
4. Guardar workflow
5. Probar con mensaje de WhatsApp
6. Verificar que `historial_conversacion` y `historial_reciente` en Supabase NO tengan duplicados

### Validación Post-Fix:

**Test Case:**
1. Usuario envía: "Hola"
2. Bot responde: "Hola, ¿en qué puedo ayudarte?"
3. Verificar en Supabase campo `historial_conversacion`:
   ```
   Usuario: Hola
   Noa: Hola, ¿en qué puedo ayudarte?
   ```
   (Sin "Usuario: Hola" duplicado)

4. Usuario envía: "Necesito información"
5. Verificar en Supabase:
   ```
   Usuario: Hola
   Noa: Hola, ¿en qué puedo ayudarte?
   Usuario: Necesito información
   Noa: [Respuesta del bot]
   ```
   (Sin duplicados)

---

## PREGUNTAS FRECUENTES

**Q: ¿Por qué no afecta UNIQUE constraint en telefono?**
A: Porque el problema NO son registros duplicados. Es el CONTENIDO del campo de texto que tiene mensajes repetidos dentro del mismo registro.

**Q: ¿Por qué hay 3 nodos Supabase - Upsert Lead?**
A: En realidad es el MISMO nodo (id: 777b467d-d3fb-4180-b320-b5df0f41ccec) usado en 3 rutas diferentes del flujo (conversación cerrada con/sin notificación, conversación activa).

**Q: ¿Afecta esto a historial_reciente también?**
A: SÍ, porque `historial_reciente` se genera a partir de `historial_conversacion` con `.slice(-10)`. Si el completo tiene duplicados, el reciente también.

**Q: ¿Necesitamos limpiar datos antiguos con duplicados?**
A: Depende. Después del fix, nuevos mensajes estarán correctos. Datos históricos pueden limpiarse con script SQL si es necesario.

**Q: ¿Hay otros nodos que modifiquen historial?**
A: NO. Solo Code1 y Code2 tocan los campos de historial. Los nodos Upsert solo guardan lo que reciben.

---

## ARCHIVOS AFECTADOS

**n8n Workflow:**
- V5B - Supabase - EcoPlaza Agente IA Whatsapp (Githup) (1).json

**Nodos a modificar:**
- Code2 (id: 9a322253-cbf0-4db4-92e3-8b1dce0609cf) - Líneas 253-255

**Nodos sin cambios:**
- Code1 (id: 5362d0fc-d804-4644-8a5d-7f1b8c06b753) - Mantener como está
- Supabase - Upsert Lead (id: 777b467d-d3fb-4180-b320-b5df0f41ccec) - Sin cambios
- Todos los demás nodos - Sin cambios

---

## IMPACTO ESTIMADO

**Complejidad del Fix:** Baja (cambiar 1-2 líneas de código)
**Tiempo estimado:** 5 minutos para editar + 10 minutos para probar
**Riesgo:** Muy bajo (cambio simple y bien localizado)
**Beneficio:** Alto (elimina duplicación de mensajes completamente)

---

## SIGUIENTE PASO

Editar el nodo Code2 en n8n siguiendo la solución propuesta y probar con mensajes reales de WhatsApp.
