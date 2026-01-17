import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    // Validar tipo de archivo según categoría
    const allowedTypes: Record<string, string[]> = {
      fotos: ['image/jpeg', 'image/png', 'image/webp'],
      videos: ['video/mp4', 'video/quicktime', 'video/webm'],
      planos: ['image/jpeg', 'image/png', 'application/pdf'],
      documentos: ['application/pdf', 'image/jpeg', 'image/png'],
    };

    if (!allowedTypes[tipo].includes(file.type)) {
      return NextResponse.json({
        error: `Tipo de archivo no permitido para ${tipo}. Permitidos: ${allowedTypes[tipo].join(', ')}`,
      }, { status: 400 });
    }

    // Validar tamaño (fotos/planos/docs: 10MB, videos: 100MB)
    const maxSizes: Record<string, number> = {
      fotos: 10 * 1024 * 1024,      // 10MB
      videos: 100 * 1024 * 1024,     // 100MB
      planos: 10 * 1024 * 1024,      // 10MB
      documentos: 10 * 1024 * 1024,  // 10MB
    };

    if (file.size > maxSizes[tipo]) {
      const maxMB = maxSizes[tipo] / (1024 * 1024);
      return NextResponse.json({
        error: `El archivo excede el tamaño máximo de ${maxMB}MB`,
      }, { status: 400 });
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

    // Generar path único
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'bin';
    const storagePath = `terrenos/${terrenoId}/${tipo}/${timestamp}.${ext}`;

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

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: storagePath,
      tipo,
    });
  } catch (error) {
    console.error('Error en upload:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

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
