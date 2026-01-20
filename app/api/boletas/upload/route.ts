import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// POST /api/boletas/upload - Upload boleta/factura file to storage
// ============================================================================
// Roles autorizados: finanzas, admin, superadmin
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
      .select('rol, nombre')
      .eq('id', user.id)
      .single();

    if (
      !usuario ||
      !['superadmin', 'admin', 'finanzas'].includes(usuario.rol)
    ) {
      return NextResponse.json(
        { error: 'No tiene permisos para subir boletas' },
        { status: 403 }
      );
    }

    // Obtener FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fichaId = formData.get('fichaId') as string;
    const voucherIndex = formData.get('voucherIndex') as string;

    // Validaciones
    if (!file || !fichaId || voucherIndex === null || voucherIndex === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: file, fichaId, voucherIndex' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo (imagen o PDF)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato no permitido. Use JPG, PNG, WEBP o PDF.' },
        { status: 400 }
      );
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'El archivo no puede superar 5MB' },
        { status: 400 }
      );
    }

    // Generar path único para el archivo
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `boletas/${fichaId}/voucher-${voucherIndex}_${timestamp}.${extension}`;

    // Upload a Supabase Storage (usar bucket documentos-ficha)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documentos-ficha')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Boleta Upload] Error al subir archivo:', uploadError);
      return NextResponse.json(
        { error: `Error al subir archivo: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Obtener URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from('documentos-ficha').getPublicUrl(uploadData.path);

    console.log(`[Boleta Upload] ✅ Archivo subido por ${usuario.nombre}: ${publicUrl}`);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: 'Archivo subido correctamente',
    });
  } catch (error: any) {
    console.error('[Boleta Upload] Error inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
