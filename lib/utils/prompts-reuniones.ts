// ============================================================================
// PROMPTS DE GPT-4 PARA REUNIONES
// ============================================================================
// Prompts optimizados para extraer resúmenes y action items de transcripciones
// ============================================================================

export function generateSummaryPrompt(transcripcion: string): string {
  return `Eres un asistente experto en resumir reuniones de trabajo.

Dada la siguiente transcripción de una reunión, genera:

1. RESUMEN: 2-3 oraciones que capturen la esencia de la reunión
2. PUNTOS_CLAVE: Lista de 3-5 puntos importantes discutidos
3. DECISIONES: Lista de decisiones tomadas (si las hay)
4. PREGUNTAS_ABIERTAS: Preguntas que quedaron sin responder (si las hay)
5. PARTICIPANTES: Nombres de personas mencionadas en la reunión

Responde SOLO en formato JSON válido:
{
  "resumen": "...",
  "puntos_clave": ["...", "..."],
  "decisiones": ["...", "..."],
  "preguntas_abiertas": ["...", "..."],
  "participantes": ["...", "..."]
}

TRANSCRIPCIÓN:
${transcripcion}`;
}

export function extractActionItemsPrompt(transcripcion: string): string {
  return `Eres un asistente experto en identificar tareas y compromisos en reuniones de trabajo.

Analiza la siguiente transcripción e identifica TODOS los action items, tareas, compromisos o pendientes mencionados.

IMPORTANTE - Sé MUY exhaustivo. Busca cualquier mención de:
- Algo que alguien VA A HACER: "voy a...", "me encargo...", "yo hago...", "te mando...", "te envío..."
- Algo que alguien DEBE HACER: "tienes que...", "necesitas...", "hay que...", "deberías..."
- COMPROMISOS: "queda pendiente...", "se compromete a...", "quedamos en..."
- REVISIONES: "revisar...", "evaluar...", "analizar...", "verificar..."
- ENTREGAS: "para el [fecha]...", "antes del...", "entregar..."
- SEGUIMIENTOS: "dar seguimiento...", "confirmar...", "coordinar..."

Para cada action item extrae:
- descripcion: Qué se debe hacer (claro y específico, máximo 200 caracteres)
- asignado_nombre: A quién se asignó. Si no está claro, usa "Por asignar"
- deadline: Fecha límite en formato YYYY-MM-DD. IMPORTANTE: Si no hay fecha, usa null (NO uses la palabra "null" como texto)
- prioridad: "alta" si es urgente/importante, "media" si es normal, "baja" si puede esperar
- contexto_quote: Fragmento textual de donde se mencionó (máximo 300 caracteres)

REGLAS DE FORMATO JSON:
1. deadline DEBE ser null (sin comillas) si no hay fecha, NO "null" como string
2. Todos los campos son obligatorios
3. prioridad solo puede ser: "alta", "media" o "baja"

Responde SOLO en formato JSON válido:
{
  "action_items": [
    {
      "descripcion": "Preparar presentación de ventas",
      "asignado_nombre": "Juan Pérez",
      "deadline": "2026-01-15",
      "prioridad": "alta",
      "contexto_quote": "Juan, necesito que prepares la presentación para el 15"
    },
    {
      "descripcion": "Revisar propuesta del cliente",
      "asignado_nombre": "Por asignar",
      "deadline": null,
      "prioridad": "media",
      "contexto_quote": "Hay que revisar la propuesta que nos enviaron"
    }
  ]
}

Si NO hay action items, retorna: {"action_items": []}

TRANSCRIPCIÓN:
${transcripcion}`;
}
