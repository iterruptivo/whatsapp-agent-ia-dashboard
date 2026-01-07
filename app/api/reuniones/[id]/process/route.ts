import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
  generateSummaryPrompt,
  extractActionItemsPrompt,
} from '@/lib/utils/prompts-reuniones';
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

    // 2. Transcribir con Whisper (con segmentación automática si es necesario)
    const transcription = await transcribeAudioWithChunking(
      inputFilePath,
      fileData.size,
      tempDir,
      openai
    );
    console.log(
      `[Background] Transcripción completada, longitud: ${transcription.length} caracteres`
    );

    // 3. Generar resumen con GPT-4
    const resumen = await generateSummary(transcription, openai);
    console.log('[Background] Resumen generado');

    // 4. Extraer action items con GPT-4
    const actionItems = await extractActionItems(transcription, openai);
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
        estado: 'completado',
        processed_at: new Date().toISOString(),
      })
      .eq('id', reunionId);

    // 6. Insertar action items
    if (actionItems.action_items.length > 0) {
      const actionItemsToInsert = actionItems.action_items.map((item) => ({
        reunion_id: reunionId,
        descripcion: item.descripcion,
        asignado_nombre: item.asignado_nombre,
        deadline: item.deadline,
        prioridad: item.prioridad,
        contexto_quote: item.contexto_quote,
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
// FUNCIÓN: Extraer action items con GPT-4
// ============================================================================

async function extractActionItems(
  transcription: string,
  openai: OpenAI
): Promise<GPTActionItemsResult> {
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
          content: extractActionItemsPrompt(transcription),
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(
      completion.choices[0].message.content || '{"action_items": []}'
    ) as GPTActionItemsResult;

    return result;
  } catch (error: any) {
    console.error('[extractActionItems] Error:', error);

    // Fallback: retornar array vacío
    return { action_items: [] };
  }
}

// Configuración para timeout largo (máximo permitido en Vercel)
export const maxDuration = 300; // 5 minutos para Pro plan
