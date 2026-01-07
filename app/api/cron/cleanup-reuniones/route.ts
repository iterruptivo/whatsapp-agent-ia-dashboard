import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CleanupResult } from '@/types/reuniones';

// ============================================================================
// GET /api/cron/cleanup-reuniones - Limpiar archivos >30 días
// ============================================================================
// Este endpoint es ejecutado por Vercel Cron diariamente a las 3 AM
// Configuración en vercel.json
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verificar que la request viene de Vercel Cron
    const authHeader = request.headers.get('authorization');

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cleanup] Iniciando limpieza de archivos antiguos...');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscar reuniones con archivo y >30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: reunionesAntiguas, error: queryError } = await supabase
      .from('reuniones')
      .select('id, media_storage_path, titulo, created_at')
      .not('media_storage_path', 'is', null)
      .is('media_deleted_at', null)
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (queryError) {
      console.error('[Cleanup] Error al buscar reuniones:', queryError);
      return NextResponse.json(
        { error: queryError.message },
        { status: 500 }
      );
    }

    console.log(
      `[Cleanup] Encontradas ${reunionesAntiguas?.length || 0} reuniones para limpiar`
    );

    let cleaned = 0;
    let errors = 0;
    const successIds: string[] = [];
    const errorDetails: Array<{
      reunion_id: string;
      titulo: string;
      error: string;
    }> = [];

    // Procesar cada reunión
    for (const reunion of reunionesAntiguas || []) {
      try {
        // Eliminar archivo de Storage
        if (reunion.media_storage_path) {
          const { error: deleteError } = await supabase.storage
            .from('reuniones-media')
            .remove([reunion.media_storage_path]);

          if (deleteError) {
            throw new Error(
              `Error al eliminar archivo: ${deleteError.message}`
            );
          }
        }

        // Actualizar registro en DB
        const { error: updateError } = await supabase
          .from('reuniones')
          .update({
            media_storage_path: null,
            media_deleted_at: new Date().toISOString(),
          })
          .eq('id', reunion.id);

        if (updateError) {
          throw new Error(`Error al actualizar DB: ${updateError.message}`);
        }

        cleaned++;
        successIds.push(reunion.id);

        console.log(
          `[Cleanup] ✅ Limpiado: ${reunion.titulo} (${new Date(reunion.created_at).toLocaleDateString()})`
        );
      } catch (error: any) {
        errors++;
        errorDetails.push({
          reunion_id: reunion.id,
          titulo: reunion.titulo,
          error: error.message,
        });

        console.error(
          `[Cleanup] ❌ Error en ${reunion.titulo}:`,
          error.message
        );
      }
    }

    const result: CleanupResult = {
      cleaned_count: cleaned,
      error_count: errors,
      details: {
        success_ids: successIds,
        errors: errorDetails,
        timestamp: new Date().toISOString(),
      },
    };

    console.log(
      `[Cleanup] Finalizado. Limpiados: ${cleaned}, Errores: ${errors}`
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Cleanup] Error fatal:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Configuración para timeout largo
export const maxDuration = 60;
