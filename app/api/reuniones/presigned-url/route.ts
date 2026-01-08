import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateReunionFile } from '@/lib/utils/reunion-file-validator';

// ============================================================================
// POST /api/reuniones/presigned-url - Generar URL presignada para upload
// ============================================================================
// Este endpoint:
// 1. Valida autenticación y permisos
// 2. Valida tipo y tamaño de archivo (máx 2GB)
// 3. Crea registro en DB con estado 'subiendo'
// 4. Genera presigned URL para upload directo a Supabase Storage
// ============================================================================

// Reuniones son GLOBALES - proyectoId es opcional (legacy)
interface PresignedUrlRequest {
  titulo: string;
  proyectoId?: string; // OPCIONAL - reuniones son globales
  fileName: string;
  fileSize: number;
  fileType: string;
  fechaReunion?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Usar service role key para bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verificar autenticación desde header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verificar token con Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar rol del usuario
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (
      !usuario ||
      !['admin', 'gerencia', 'jefe_ventas'].includes(usuario.rol)
    ) {
      return NextResponse.json(
        { error: 'No tiene permisos para subir reuniones' },
        { status: 403 }
      );
    }

    // Obtener datos del body
    const body: PresignedUrlRequest = await request.json();
    const { titulo, proyectoId, fileName, fileSize, fileType, fechaReunion } = body;

    // Validaciones básicas - proyectoId ya NO es requerido (reuniones globales)
    if (!titulo || !fileName || !fileSize || !fileType) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: titulo, fileName, fileSize, fileType' },
        { status: 400 }
      );
    }

    // Crear un File mock para validación
    const mockFile = new File([], fileName, { type: fileType });
    Object.defineProperty(mockFile, 'size', { value: fileSize });

    // Validar archivo usando el validador existente
    const validation = validateReunionFile(mockFile);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Generar path único para el archivo - reuniones son globales
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Usar "global" en lugar de proyectoId ya que reuniones no pertenecen a un proyecto
    const storagePath = `reuniones/global/${timestamp}_${sanitizedFileName}`;

    // Crear registro en DB con estado 'subiendo' - SIN proyecto_id (reuniones globales)
    const { data: reunion, error: dbError } = await supabase
      .from('reuniones')
      .insert({
        proyecto_id: null, // Reuniones son globales, no pertenecen a un proyecto
        created_by: user.id,
        titulo,
        fecha_reunion: fechaReunion || null,
        media_storage_path: storagePath,
        media_tipo: validation.mediaTipo,
        media_size_bytes: fileSize,
        estado: 'subiendo', // Estado inicial
      })
      .select()
      .single();

    if (dbError) {
      console.error('[PresignedURL] Error al crear registro:', dbError);
      return NextResponse.json(
        { error: `Error al crear registro: ${dbError.message}` },
        { status: 500 }
      );
    }

    // Generar presigned upload URL
    const { data: presignedData, error: presignedError } = await supabase.storage
      .from('reuniones-media')
      .createSignedUploadUrl(storagePath);

    if (presignedError || !presignedData) {
      console.error('[PresignedURL] Error al generar URL:', presignedError);

      // Eliminar registro si falla la generación de URL
      await supabase.from('reuniones').delete().eq('id', reunion.id);

      return NextResponse.json(
        { error: `Error al generar URL de upload: ${presignedError?.message}` },
        { status: 500 }
      );
    }

    console.log(`[PresignedURL] URL generada para reunión ${reunion.id}`);

    return NextResponse.json({
      success: true,
      reunionId: reunion.id,
      presignedUrl: presignedData.signedUrl,
      storagePath,
      message: 'URL presignada generada correctamente',
    });
  } catch (error: any) {
    console.error('[PresignedURL] Error inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
