import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { validateTerrenoFile, type FileCategory } from '@/lib/utils/terreno-file-validator';

// ============================================================================
// POST /api/expansion/terrenos/upload - Upload archivos multimedia de terrenos
// ============================================================================
// Sube archivos a Supabase Storage y retorna URLs públicas
// Bucket: terrenos-multimedia (público)
// Validaciones: tipo, tamaño, permisos
// ============================================================================

// Crear cliente admin para storage
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Crear cliente con auth del usuario
async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignorar errores en Server Components
          }
        },
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const terrenoId = formData.get('terreno_id') as string;
    const tipo = formData.get('tipo') as string; // fotos, videos, planos, documentos

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    if (!terrenoId) {
      return NextResponse.json({ error: 'No se proporcionó terreno_id' }, { status: 400 });
    }

    if (!tipo || !['fotos', 'videos', 'planos', 'documentos'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de archivo inválido' }, { status: 400 });
    }

    // Validar archivo con el validador centralizado
    const validation = validateTerrenoFile(file, tipo as FileCategory);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Verificar que el terreno pertenece al usuario
    const { data: registro } = await authClient
      .from('corredores_registro')
      .select('id')
      .eq('usuario_id', user.id)
      .single();

    if (!registro) {
      return NextResponse.json({ error: 'Registro de corredor no encontrado' }, { status: 403 });
    }

    const { data: terreno } = await authClient
      .from('terrenos_expansion')
      .select('id, corredor_id, estado')
      .eq('id', terrenoId)
      .single();

    if (!terreno) {
      return NextResponse.json({ error: 'Terreno no encontrado' }, { status: 404 });
    }

    if (terreno.corredor_id !== registro.id) {
      return NextResponse.json({ error: 'No tienes permiso para este terreno' }, { status: 403 });
    }

    if (!['borrador', 'info_adicional'].includes(terreno.estado)) {
      return NextResponse.json({ error: 'No se pueden subir archivos en este estado' }, { status: 400 });
    }

    // Generar path único y sanitizado
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `terrenos/${terrenoId}/${tipo}/${timestamp}_${sanitizedFileName}`;

    // Subir a Supabase Storage usando admin client
    const adminClient = createAdminClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await adminClient.storage
      .from('terrenos-multimedia')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error subiendo archivo:', uploadError);

      // Si el bucket no existe, intentar crearlo
      if (uploadError.message?.includes('Bucket not found')) {
        // Crear bucket
        await adminClient.storage.createBucket('terrenos-multimedia', {
          public: true,
          fileSizeLimit: 104857600, // 100MB
        });

        // Reintentar upload
        const { error: retryError } = await adminClient.storage
          .from('terrenos-multimedia')
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (retryError) {
          console.error('Error en reintento:', retryError);
          return NextResponse.json({ error: 'Error subiendo archivo' }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: 'Error subiendo archivo' }, { status: 500 });
      }
    }

    // Obtener URL pública
    const { data: urlData } = adminClient.storage
      .from('terrenos-multimedia')
      .getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      console.error('[Terrenos Upload] No se pudo generar URL pública');
      return NextResponse.json(
        { error: 'Error al generar URL pública del archivo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: storagePath,
      tipo,
      message: 'Archivo subido correctamente',
    });
  } catch (error: any) {
    console.error('[Terrenos Upload] Error inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos máximo

// DELETE para eliminar archivo
export async function DELETE(request: NextRequest) {
  try {
    const authClient = await createAuthClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const terrenoId = searchParams.get('terreno_id');

    if (!path || !terrenoId) {
      return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 });
    }

    // Verificar permisos
    const { data: registro } = await authClient
      .from('corredores_registro')
      .select('id')
      .eq('usuario_id', user.id)
      .single();

    if (!registro) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { data: terreno } = await authClient
      .from('terrenos_expansion')
      .select('id, corredor_id, estado')
      .eq('id', terrenoId)
      .single();

    if (!terreno || terreno.corredor_id !== registro.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!['borrador', 'info_adicional'].includes(terreno.estado)) {
      return NextResponse.json({ error: 'No se pueden eliminar archivos en este estado' }, { status: 400 });
    }

    // Eliminar de storage
    const adminClient = createAdminClient();
    const { error } = await adminClient.storage
      .from('terrenos-multimedia')
      .remove([path]);

    if (error) {
      console.error('Error eliminando archivo:', error);
      return NextResponse.json({ error: 'Error eliminando archivo' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en delete:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
