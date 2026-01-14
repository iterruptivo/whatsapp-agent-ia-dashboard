import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateReunionFile } from '@/lib/utils/reunion-file-validator';

// ============================================================================
// POST /api/reuniones/upload - Upload archivo y crear registro
// ============================================================================
// DEPRECADO: Este endpoint está limitado a archivos <10MB por Next.js
// Para archivos grandes (hasta 2GB), usar el flujo de presigned URLs:
// 1. POST /api/reuniones/presigned-url
// 2. PUT directo a Supabase Storage
// 3. POST /api/reuniones/{id}/upload-complete
// Ver: docs/arquitectura/UPLOAD_REUNIONES_PRESIGNED_URL.md
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Usar service role key para bypass RLS en storage
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
      !['superadmin', 'admin', 'jefe_ventas'].includes(usuario.rol)
    ) {
      return NextResponse.json(
        { error: 'No tiene permisos para subir reuniones' },
        { status: 403 }
      );
    }

    // Obtener FormData - proyectoId ya NO es requerido (reuniones globales)
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const titulo = formData.get('titulo') as string;
    const fechaReunion = formData.get('fecha_reunion') as string | null;

    // Validaciones - proyecto_id ya NO es requerido
    if (!file || !titulo) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: file, titulo' },
        { status: 400 }
      );
    }

    // Validar archivo
    const validation = validateReunionFile(file);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Generar path único para el archivo - reuniones son globales
    const timestamp = Date.now();
    const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Usar "global" ya que reuniones no pertenecen a un proyecto específico
    const storagePath = `reuniones/global/${timestamp}_${fileName}`;

    // Upload a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('reuniones-media')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload] Error al subir archivo:', uploadError);
      return NextResponse.json(
        { error: `Error al subir archivo: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Crear registro en DB - SIN proyecto_id (reuniones globales)
    const { data: reunion, error: dbError } = await supabase
      .from('reuniones')
      .insert({
        proyecto_id: null, // Reuniones son globales
        created_by: user.id,
        titulo,
        fecha_reunion: fechaReunion || null,
        media_storage_path: uploadData.path,
        media_tipo: validation.mediaTipo,
        media_size_bytes: file.size,
        estado: 'procesando',
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Upload] Error al crear registro:', dbError);

      // Intentar eliminar archivo del storage si falla el DB
      await supabase.storage.from('reuniones-media').remove([uploadData.path]);

      return NextResponse.json(
        { error: `Error al crear registro: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reunionId: reunion.id,
      message: 'Archivo subido correctamente',
    });
  } catch (error: any) {
    console.error('[Upload] Error inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// En App Router, para archivos >10MB se necesita usar presigned URLs
// o subir directamente a Supabase Storage desde el cliente
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos máximo para Vercel Pro
