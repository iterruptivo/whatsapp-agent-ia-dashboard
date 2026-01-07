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
  return `Eres un asistente experto en identificar tareas y compromisos en reuniones.

Dada la siguiente transcripción, identifica TODOS los action items (tareas, compromisos, pendientes).

Para cada action item extrae:
- descripcion: Qué se debe hacer (máximo 200 caracteres)
- asignado_nombre: A quién se asignó (nombre mencionado, o "No especificado")
- deadline: Fecha límite si se mencionó (formato YYYY-MM-DD, o null)
- prioridad: "alta" si es urgente, "media" si es normal, "baja" si no es urgente
- contexto_quote: Cita textual de donde se mencionó (máximo 300 caracteres)

Responde SOLO en formato JSON válido:
{
  "action_items": [
    {
      "descripcion": "...",
      "asignado_nombre": "...",
      "deadline": "YYYY-MM-DD o null",
      "prioridad": "alta|media|baja",
      "contexto_quote": "..."
    }
  ]
}

Keywords para detectar action items:
- "voy a", "me encargo", "yo hago", "yo me ocupo"
- "tienes que", "necesitas", "deberías", "hay que"
- "para el [fecha]", "antes del [fecha]", "hasta el [fecha]"
- "pendiente", "tarea", "compromiso", "acción"
- "queda en", "se compromete a"

Si NO hay action items, retorna array vacío: {"action_items": []}

TRANSCRIPCIÓN:
${transcripcion}`;
}
