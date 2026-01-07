import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// POST /api/reuniones/[id]/upload-complete - Notificar upload completado
// ============================================================================
// El cliente llama a este endpoint después de subir el archivo directamente
// a Supabase Storage usando la presigned URL.
//
// Este endpoint:
// 1. Verifica que el archivo existe en Storage
// 2. Actualiza el estado de 'subiendo' a 'procesando'
// 3. Retorna éxito para que el cliente pueda llamar a /process
// ============================================================================

interface UploadCompleteRequest {
  storagePath: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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

    // Obtener datos del body
    const body: UploadCompleteRequest = await request.json();
    const { storagePath } = body;

    if (!storagePath) {
      return NextResponse.json(
        { error: 'Falta campo requerido: storagePath' },
        { status: 400 }
      );
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

    // Verificar que está en estado 'subiendo'
    if (reunion.estado !== 'subiendo') {
      return NextResponse.json(
        { error: `Reunión no está en estado 'subiendo' (estado actual: ${reunion.estado})` },
        { status: 400 }
      );
    }

    // Verificar que el storagePath coincide
    if (reunion.media_storage_path !== storagePath) {
      return NextResponse.json(
        { error: 'El storagePath no coincide con el registrado' },
        { status: 400 }
      );
    }

    // Verificar que el archivo existe en Storage
    const { data: fileExists, error: fileError } = await supabase.storage
      .from('reuniones-media')
      .list(storagePath.split('/').slice(0, -1).join('/'), {
        search: storagePath.split('/').pop(),
      });

    if (fileError || !fileExists || fileExists.length === 0) {
      console.error('[UploadComplete] Archivo no encontrado en Storage:', fileError);

      // Actualizar estado a error
      await supabase
        .from('reuniones')
        .update({
          estado: 'error',
          error_mensaje: 'Archivo no encontrado en Storage después del upload',
        })
        .eq('id', reunionId);

      return NextResponse.json(
        { error: 'Archivo no encontrado en Storage' },
        { status: 400 }
      );
    }

    // Actualizar estado a 'procesando'
    const { error: updateError } = await supabase
      .from('reuniones')
      .update({
        estado: 'procesando',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reunionId);

    if (updateError) {
      console.error('[UploadComplete] Error al actualizar estado:', updateError);
      return NextResponse.json(
        { error: `Error al actualizar estado: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log(`[UploadComplete] Reunión ${reunionId} marcada como 'procesando'`);

    return NextResponse.json({
      success: true,
      message: 'Upload confirmado, reunión lista para procesamiento',
    });
  } catch (error: any) {
    console.error('[UploadComplete] Error inesperado:', error);

    // Actualizar estado a error
    await supabase
      .from('reuniones')
      .update({
        estado: 'error',
        error_mensaje: error.message || 'Error al confirmar upload',
      })
      .eq('id', reunionId);

    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
