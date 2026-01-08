import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { generateSummaryPrompt } from '@/lib/utils/prompts-reuniones';
import {
  GPTResumenResult,
  GPTActionItemsResult,
} from '@/types/reuniones';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Path al binario de ffmpeg - usar path absoluto del proyecto
// En Windows con Turbopack, process.cwd() puede no funcionar correctamente
// Usamos la ruta absoluta del proyecto como fallback
const projectRoot = 'E:\\Projects\\ECOPLAZA_PROJECTS\\whatsapp-agent-ia-dashboard';
const ffmpegPath = path.join(projectRoot, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
console.log('[FFmpeg] Path:', ffmpegPath);
console.log('[FFmpeg] Exists:', fs.existsSync(ffmpegPath));

// ============================================================================
// POST /api/reuniones/[id]/process - Procesar transcripción con IA
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

    // Obtener reunión
    const { data: reunion, error: reunionError } = await supabase
      .from('reuniones')
      .select('*')
      .eq('id', reunionId)
      .single();

    if (reunionError || !reunion) {
      return NextResponse.json(
        { error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    if (!reunion.media_storage_path) {
      return NextResponse.json(
        { error: 'No hay archivo multimedia para procesar' },
        { status: 400 }
      );
    }

    // Actualizar estado a 'procesando'
    await supabase
      .from('reuniones')
      .update({ estado: 'procesando' })
      .eq('id', reunionId);

    // IMPORTANTE: Retornar inmediatamente para no bloquear al usuario
    // El procesamiento continúa en background
    const processingPromise = processReunionInBackground(
      reunionId,
      reunion.media_storage_path,
      supabase,
      openai
    );

    // No esperamos la promesa, continúa en background
    processingPromise.catch((error) => {
      console.error('[Process] Error en background:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Procesamiento iniciado en segundo plano',
    });
  } catch (error: any) {
    console.error('[POST /api/reuniones/[id]/process] Error:', error);

    // Actualizar estado a error
    await supabase
      .from('reuniones')
      .update({
        estado: 'error',
        error_mensaje: error.message || 'Error desconocido',
      })
      .eq('id', reunionId);

    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// ============================================================================
// FUNCIÓN DE PROCESAMIENTO EN BACKGROUND
// ============================================================================

async function processReunionInBackground(
  reunionId: string,
  storagePath: string,
  supabase: any,
  openai: OpenAI
) {
  // Directorio temporal único para esta reunión
  const tempDir = path.join(os.tmpdir(), `reunion-${reunionId}`);

  try {
    console.log(`[Background] Iniciando procesamiento de reunión ${reunionId}`);

    // Crear directorio temporal
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 1. Descargar archivo de Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('reuniones-media')
      .download(storagePath);

    if (downloadError) {
      throw new Error(`Error al descargar archivo: ${downloadError.message}`);
    }

    console.log(`[Background] Archivo descargado, tamaño: ${fileData.size} bytes`);

    // Guardar el archivo temporalmente
    const originalExtension = path.extname(storagePath) || '.m4a';
    const inputFilePath = path.join(tempDir, `original${originalExtension}`);
    const arrayBuffer = await fileData.arrayBuffer();
    fs.writeFileSync(inputFilePath, Buffer.from(arrayBuffer));
    console.log(`[Background] Archivo guardado en: ${inputFilePath}`);

    // 2. Obtener duración del audio
    const duracionSegundos = await getAudioDuration(inputFilePath);
    console.log(`[Background] Duración del audio: ${Math.round(duracionSegundos / 60)} minutos`);

    // 3. Transcribir con Whisper (con segmentación automática si es necesario)
    const transcription = await transcribeAudioWithChunking(
      inputFilePath,
      fileData.size,
      tempDir,
      openai
    );
    console.log(
      `[Background] Transcripción completada, longitud: ${transcription.length} caracteres`
    );

    // 3. Generar resumen y extraer action items EN PARALELO (más rápido)
    console.log('[Background] Iniciando extracción de resumen y action items en paralelo...');
    const [resumen, actionItems] = await Promise.all([
      generateSummary(transcription, openai),
      extractActionItems(transcription, openai),
    ]);
    console.log('[Background] Resumen generado');
    console.log(`[Background] Action items extraídos: ${actionItems.action_items.length}`);

    // 5. Guardar en base de datos
    await supabase
      .from('reuniones')
      .update({
        transcripcion_completa: transcription,
        resumen: resumen.resumen,
        puntos_clave: resumen.puntos_clave,
        decisiones: resumen.decisiones,
        preguntas_abiertas: resumen.preguntas_abiertas,
        participantes: resumen.participantes,
        duracion_segundos: Math.round(duracionSegundos),
        estado: 'completado',
        processed_at: new Date().toISOString(),
      })
      .eq('id', reunionId);

    // 6. Insertar action items
    if (actionItems.action_items.length > 0) {
      const actionItemsToInsert = actionItems.action_items.map((item) => ({
        reunion_id: reunionId,
        descripcion: item.descripcion,
        asignado_nombre: item.asignado_nombre || 'No especificado',
        // GPT-4 a veces retorna "null" como string en lugar de null
        deadline: (item.deadline && item.deadline !== 'null') ? item.deadline : null,
        prioridad: item.prioridad || 'media',
        contexto_quote: item.contexto_quote || null,
      }));

      await supabase
        .from('reunion_action_items')
        .insert(actionItemsToInsert);
    }

    console.log(`[Background] Reunión ${reunionId} procesada correctamente`);
  } catch (error: any) {
    console.error(`[Background] Error procesando reunión ${reunionId}:`, error);

    // Actualizar estado a error
    await supabase
      .from('reuniones')
      .update({
        estado: 'error',
        error_mensaje: error.message || 'Error durante el procesamiento',
      })
      .eq('id', reunionId);
  } finally {
    // Limpiar archivos temporales
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`[Background] Directorio temporal limpiado: ${tempDir}`);
      }
    } catch (cleanupError) {
      console.warn('[Background] Error al limpiar archivos temporales:', cleanupError);
    }
  }
}

// ============================================================================
// FUNCIÓN: Transcribir audio con chunking automático
// ============================================================================

async function transcribeAudioWithChunking(
  inputFilePath: string,
  fileSize: number,
  tempDir: string,
  openai: OpenAI
): Promise<string> {
  const MAX_WHISPER_SIZE = 24 * 1024 * 1024; // 24MB (dejando margen del límite de 25MB)

  // Si el archivo es pequeño, transcribir directamente
  if (fileSize <= MAX_WHISPER_SIZE) {
    console.log('[Transcribe] Archivo pequeño, transcripción directa');
    return await transcribeSingleFile(inputFilePath, openai);
  }

  console.log(`[Transcribe] Archivo grande (${Math.round(fileSize / 1024 / 1024)}MB), iniciando segmentación...`);

  // Obtener duración del audio
  const duration = await getAudioDuration(inputFilePath);
  console.log(`[Transcribe] Duración del audio: ${Math.round(duration / 60)} minutos`);

  // Calcular cuántos segmentos necesitamos
  // Estimamos ~1MB por minuto de audio MP3 a 128kbps
  // Para m4a/aac podría ser diferente, usamos un enfoque basado en tiempo
  const segmentDuration = 10 * 60; // 10 minutos por segmento (debería ser ~10-15MB)
  const numSegments = Math.ceil(duration / segmentDuration);

  console.log(`[Transcribe] Dividiendo en ${numSegments} segmentos de ${segmentDuration / 60} minutos`);

  // Crear segmentos de audio
  const segmentPaths = await splitAudioIntoSegments(
    inputFilePath,
    tempDir,
    segmentDuration,
    numSegments
  );

  console.log(`[Transcribe] ${segmentPaths.length} segmentos creados`);

  // Transcribir cada segmento
  const transcriptions: string[] = [];

  for (let i = 0; i < segmentPaths.length; i++) {
    const segmentPath = segmentPaths[i];
    console.log(`[Transcribe] Transcribiendo segmento ${i + 1}/${segmentPaths.length}...`);

    try {
      const segmentTranscription = await transcribeSingleFile(segmentPath, openai);
      transcriptions.push(segmentTranscription);
      console.log(`[Transcribe] Segmento ${i + 1} completado (${segmentTranscription.length} chars)`);
    } catch (error: any) {
      console.error(`[Transcribe] Error en segmento ${i + 1}:`, error.message);
      transcriptions.push(`[Error en segmento ${i + 1}: ${error.message}]`);
    }
  }

  // Concatenar todas las transcripciones
  const fullTranscription = transcriptions.join('\n\n');
  console.log(`[Transcribe] Transcripción completa: ${fullTranscription.length} caracteres`);

  return fullTranscription;
}

// ============================================================================
// FUNCIÓN: Obtener duración del audio
// ============================================================================

async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe');
    const { stdout } = await execAsync(
      `"${ffmpegPath}" -i "${filePath}" 2>&1 | findstr "Duration"`
    );

    // Parse duration from output like "Duration: 01:23:45.67"
    const match = stdout.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = parseFloat(match[3]);
      return hours * 3600 + minutes * 60 + seconds;
    }

    // Fallback: estimar basado en tamaño (aprox 1MB por minuto)
    const stats = fs.statSync(filePath);
    return (stats.size / (1024 * 1024)) * 60;
  } catch (error) {
    console.warn('[getAudioDuration] Error obteniendo duración, usando estimación', error);
    const stats = fs.statSync(filePath);
    return (stats.size / (1024 * 1024)) * 60; // Estimación: 1MB = 1 minuto
  }
}

// ============================================================================
// FUNCIÓN: Dividir audio en segmentos
// ============================================================================

async function splitAudioIntoSegments(
  inputFilePath: string,
  tempDir: string,
  segmentDuration: number,
  numSegments: number
): Promise<string[]> {
  const segmentPaths: string[] = [];
  const extension = path.extname(inputFilePath);

  for (let i = 0; i < numSegments; i++) {
    const startTime = i * segmentDuration;
    const segmentPath = path.join(tempDir, `segment_${i}${extension}`);

    // Usar ffmpeg para extraer el segmento
    const command = `"${ffmpegPath}" -i "${inputFilePath}" -ss ${startTime} -t ${segmentDuration} -c copy -y "${segmentPath}"`;

    try {
      await execAsync(command);

      // Verificar que el archivo se creó
      if (fs.existsSync(segmentPath)) {
        const stats = fs.statSync(segmentPath);
        console.log(`[Split] Segmento ${i} creado: ${Math.round(stats.size / 1024 / 1024)}MB`);
        segmentPaths.push(segmentPath);
      }
    } catch (error: any) {
      console.error(`[Split] Error creando segmento ${i}:`, error.message);
      // Continuar con los demás segmentos
    }
  }

  return segmentPaths;
}

// ============================================================================
// FUNCIÓN: Transcribir un archivo de audio individual
// ============================================================================

async function transcribeSingleFile(
  filePath: string,
  openai: OpenAI
): Promise<string> {
  try {
    // Leer el archivo
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    // Verificar tamaño
    if (fileBuffer.length > 25 * 1024 * 1024) {
      throw new Error(`Archivo muy grande para Whisper: ${Math.round(fileBuffer.length / 1024 / 1024)}MB`);
    }

    // Crear File object para la API
    const file = new File([fileBuffer], fileName, {
      type: 'audio/mpeg',
    });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'es', // Optimizar para español
      response_format: 'text',
      temperature: 0, // Mayor precisión
    });

    return transcription;
  } catch (error: any) {
    console.error('[transcribeSingleFile] Error:', error);
    throw new Error(`Error en transcripción: ${error.message}`);
  }
}

// ============================================================================
// FUNCIÓN: Generar resumen con GPT-4
// ============================================================================

async function generateSummary(
  transcription: string,
  openai: OpenAI
): Promise<GPTResumenResult> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente que solo responde en JSON válido.',
        },
        {
          role: 'user',
          content: generateSummaryPrompt(transcription),
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(
      completion.choices[0].message.content || '{}'
    ) as GPTResumenResult;

    // Validar que tenga las keys esperadas
    if (!result.resumen || !result.puntos_clave) {
      throw new Error('Respuesta GPT-4 inválida para resumen');
    }

    return result;
  } catch (error: any) {
    console.error('[generateSummary] Error:', error);

    // Fallback si falla GPT-4
    return {
      resumen: 'Error al generar resumen. Revise la transcripción completa.',
      puntos_clave: [],
      decisiones: [],
      preguntas_abiertas: [],
      participantes: [],
    };
  }
}

// ============================================================================
// FUNCIÓN: Limpiar transcripción de repeticiones (bug de Whisper)
// ============================================================================

function cleanTranscriptionText(text: string): string {
  // Dividir en frases y eliminar duplicados
  const phrases = text.split(/[.!?]+/).filter(p => p.trim().length > 10);
  const uniquePhrases: string[] = [];
  const seen = new Set<string>();

  for (const phrase of phrases) {
    const normalized = phrase.trim().toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniquePhrases.push(phrase.trim());
    }
  }

  return uniquePhrases.join('. ');
}

// ============================================================================
// FUNCIÓN: Extraer action items con GPT-4 (COMPLETO - sin truncar)
// ============================================================================
// Procesa TODA la transcripción, dividiendo en chunks si es necesario
// para no perder ningún action item
// ============================================================================

async function extractActionItems(
  transcription: string,
  openai: OpenAI
): Promise<GPTActionItemsResult> {
  // GPT-4-turbo tiene 128k tokens. ~4 chars = 1 token
  // Usamos chunks de 80k chars (~20k tokens) para dejar espacio al prompt y respuesta
  const MAX_CHUNK_SIZE = 80000;
  const OVERLAP_SIZE = 2000; // Overlap para no perder contexto en los bordes

  console.log(`[extractActionItems] Transcripción total: ${transcription.length} caracteres`);

  // Si cabe en un solo chunk, procesar directamente
  if (transcription.length <= MAX_CHUNK_SIZE) {
    console.log('[extractActionItems] Procesando en un solo chunk...');
    return await extractActionItemsFromChunk(transcription, openai, 1, 1);
  }

  // Dividir en chunks con overlap
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < transcription.length) {
    const endIndex = Math.min(startIndex + MAX_CHUNK_SIZE, transcription.length);
    chunks.push(transcription.substring(startIndex, endIndex));
    startIndex = endIndex - OVERLAP_SIZE; // Overlap para no perder contexto

    // Evitar loop infinito si el overlap es mayor que lo que queda
    if (startIndex >= transcription.length - OVERLAP_SIZE) {
      break;
    }
  }

  console.log(`[extractActionItems] Transcripción dividida en ${chunks.length} chunks`);

  // Procesar todos los chunks en paralelo para velocidad
  const chunkPromises = chunks.map((chunk, index) =>
    extractActionItemsFromChunk(chunk, openai, index + 1, chunks.length)
  );

  const results = await Promise.all(chunkPromises);

  // Combinar todos los action items
  const allActionItems: any[] = [];
  const seenDescriptions = new Set<string>();

  for (const result of results) {
    for (const item of result.action_items) {
      // Evitar duplicados por descripción similar (del overlap)
      const normalizedDesc = item.descripcion.toLowerCase().trim();
      if (!seenDescriptions.has(normalizedDesc)) {
        seenDescriptions.add(normalizedDesc);
        allActionItems.push(item);
      }
    }
  }

  console.log(`[extractActionItems] ✅ Total: ${allActionItems.length} action items únicos de ${chunks.length} chunks`);
  return { action_items: allActionItems };
}

// ============================================================================
// FUNCIÓN: Extraer action items de un chunk individual
// ============================================================================

async function extractActionItemsFromChunk(
  chunk: string,
  openai: OpenAI,
  chunkNum: number,
  totalChunks: number
): Promise<GPTActionItemsResult> {
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
    console.log(`[extractActionItems] Chunk ${chunkNum}/${totalChunks}: Llamando a GPT-4...`);

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

    const rawContent = completion.choices[0].message.content || '{"action_items": []}';
    const result = JSON.parse(rawContent);

    // Validar y limpiar cada action item
    if (result.action_items && Array.isArray(result.action_items)) {
      const validatedItems = result.action_items.map((item: any) => ({
        descripcion: item.descripcion || 'Sin descripción',
        asignado_nombre: item.asignado_nombre || 'No especificado',
        deadline: (item.deadline && item.deadline !== 'null' && item.deadline !== '') ? item.deadline : null,
        prioridad: ['alta', 'media', 'baja'].includes(item.prioridad) ? item.prioridad : 'media',
        contexto_quote: item.contexto_quote || null,
      }));

      console.log(`[extractActionItems] Chunk ${chunkNum}/${totalChunks}: ✅ ${validatedItems.length} items`);
      return { action_items: validatedItems };
    }

    console.warn(`[extractActionItems] Chunk ${chunkNum}/${totalChunks}: Sin action_items válidos`);
    return { action_items: [] };
  } catch (error: any) {
    console.error(`[extractActionItems] Chunk ${chunkNum}/${totalChunks}: ❌ Error:`, error.message);
    return { action_items: [] };
  }
}

// Configuración para timeout largo (máximo permitido en Vercel)
export const maxDuration = 300; // 5 minutos para Pro plan
