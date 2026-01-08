import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ============================================================================
// POST /api/reuniones/[id]/reextract-actions - Re-extraer action items
// ============================================================================
// Útil cuando la extracción inicial falló o se quiere re-procesar
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  const { id: reunionId } = await params;

  try {
    // Verificar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener reunión con transcripción
    const { data: reunion, error: reunionError } = await supabase
      .from('reuniones')
      .select('id, titulo, transcripcion_completa, estado')
      .eq('id', reunionId)
      .single();

    if (reunionError || !reunion) {
      return NextResponse.json(
        { error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    if (!reunion.transcripcion_completa) {
      return NextResponse.json(
        { error: 'La reunión no tiene transcripción aún' },
        { status: 400 }
      );
    }

    console.log(`[ReExtract] Extrayendo action items de reunión ${reunionId}`);

    // Extraer action items con GPT-4 (procesa TODA la transcripción)
    const actionItems = await extractActionItems(reunion.transcripcion_completa, openai);

    console.log(`[ReExtract] Encontrados ${actionItems.length} action items`);

    // Eliminar action items anteriores
    await supabase
      .from('reunion_action_items')
      .delete()
      .eq('reunion_id', reunionId);

    // Insertar nuevos action items
    if (actionItems.length > 0) {
      const actionItemsToInsert = actionItems.map((item: any) => ({
        reunion_id: reunionId,
        descripcion: item.descripcion,
        asignado_nombre: item.asignado_nombre || 'No especificado',
        // GPT-4 a veces retorna "null" como string en lugar de null
        deadline: (item.deadline && item.deadline !== 'null') ? item.deadline : null,
        prioridad: item.prioridad || 'media',
        contexto_quote: item.contexto_quote || null,
      }));

      const { error: insertError } = await supabase
        .from('reunion_action_items')
        .insert(actionItemsToInsert);

      if (insertError) {
        console.error('[ReExtract] Error insertando action items:', insertError);
        return NextResponse.json(
          { error: 'Error guardando action items' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      actionItemsCount: actionItems.length,
      message: `Se extrajeron ${actionItems.length} action items`,
    });
  } catch (error: any) {
    console.error('[ReExtract] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Extraer action items con GPT-4 (COMPLETO - sin truncar)
// ============================================================================
// Procesa TODA la transcripción, dividiendo en chunks si es necesario
// ============================================================================

async function extractActionItems(
  transcription: string,
  openai: OpenAI
): Promise<any[]> {
  // GPT-4-turbo tiene 128k tokens. ~4 chars = 1 token
  // Usamos chunks de 80k chars (~20k tokens) para dejar espacio al prompt y respuesta
  const MAX_CHUNK_SIZE = 80000;
  const OVERLAP_SIZE = 2000;

  console.log(`[ReExtract] Transcripción total: ${transcription.length} caracteres`);

  // Si cabe en un solo chunk, procesar directamente
  if (transcription.length <= MAX_CHUNK_SIZE) {
    console.log('[ReExtract] Procesando en un solo chunk...');
    return await extractActionItemsFromChunk(transcription, openai, 1, 1);
  }

  // Dividir en chunks con overlap
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < transcription.length) {
    const endIndex = Math.min(startIndex + MAX_CHUNK_SIZE, transcription.length);
    chunks.push(transcription.substring(startIndex, endIndex));
    startIndex = endIndex - OVERLAP_SIZE;

    if (startIndex >= transcription.length - OVERLAP_SIZE) {
      break;
    }
  }

  console.log(`[ReExtract] Transcripción dividida en ${chunks.length} chunks`);

  // Procesar todos los chunks en paralelo
  const chunkPromises = chunks.map((chunk, index) =>
    extractActionItemsFromChunk(chunk, openai, index + 1, chunks.length)
  );

  const results = await Promise.all(chunkPromises);

  // Combinar y deduplicar action items
  const allActionItems: any[] = [];
  const seenDescriptions = new Set<string>();

  for (const items of results) {
    for (const item of items) {
      const normalizedDesc = item.descripcion.toLowerCase().trim();
      if (!seenDescriptions.has(normalizedDesc)) {
        seenDescriptions.add(normalizedDesc);
        allActionItems.push(item);
      }
    }
  }

  console.log(`[ReExtract] ✅ Total: ${allActionItems.length} action items únicos`);
  return allActionItems;
}

async function extractActionItemsFromChunk(
  chunk: string,
  openai: OpenAI,
  chunkNum: number,
  totalChunks: number
): Promise<any[]> {
  const chunkInfo = totalChunks > 1 ? ` (Parte ${chunkNum}/${totalChunks})` : '';

  const prompt = `Eres un asistente experto en identificar tareas y compromisos en reuniones de trabajo.

Analiza cuidadosamente la siguiente transcripción${chunkInfo} e identifica TODOS los action items, tareas, compromisos o pendientes mencionados.

IMPORTANTE: Sé MUY exhaustivo. Busca cualquier mención de:
- Algo que alguien va a hacer ("voy a...", "me encargo de...", "yo hago...")
- Algo que alguien debe hacer ("tienes que...", "necesitas...", "hay que...")
- Compromisos ("queda pendiente...", "se compromete a...")
- Envíos o entregas ("te mando...", "te envío...", "enviar...")
- Revisiones ("revisar...", "evaluar...", "analizar...")
- Seguimientos ("dar seguimiento...", "verificar...", "confirmar...")
- Coordinaciones ("coordinar con...", "hablar con...", "reunirse con...")

Para cada action item extrae:
- descripcion: Qué se debe hacer (claro y específico)
- asignado_nombre: A quién se asignó (si no está claro, pon "Por asignar")
- deadline: Fecha límite si se mencionó (formato YYYY-MM-DD), o null si no hay fecha
- prioridad: "alta", "media" o "baja"
- contexto_quote: Fragmento de donde se mencionó

Responde SOLO en JSON válido:
{
  "action_items": [
    {
      "descripcion": "...",
      "asignado_nombre": "...",
      "deadline": null,
      "prioridad": "media",
      "contexto_quote": "..."
    }
  ]
}

TRANSCRIPCIÓN${chunkInfo}:
${chunk}`;

  try {
    console.log(`[ReExtract] Chunk ${chunkNum}/${totalChunks}: Llamando a GPT-4...`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente que solo responde en JSON válido. Eres muy exhaustivo identificando tareas y compromisos.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(
      completion.choices[0].message.content || '{"action_items": []}'
    );

    const items = result.action_items || [];
    console.log(`[ReExtract] Chunk ${chunkNum}/${totalChunks}: ✅ ${items.length} items`);
    return items;
  } catch (error: any) {
    console.error(`[ReExtract] Chunk ${chunkNum}/${totalChunks}: ❌ Error:`, error.message);
    return [];
  }
}

export const maxDuration = 120; // 2 minutos para reextract (puede tener múltiples chunks)
