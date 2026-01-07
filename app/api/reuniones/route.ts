import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper para crear cliente Supabase
async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

// ============================================================================
// GET /api/reuniones - Obtener lista de reuniones
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener parámetros de query
    const searchParams = request.nextUrl.searchParams;
    const proyectoId = searchParams.get('proyecto_id');
    const estado = searchParams.get('estado');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construir query
    let query = supabase
      .from('reuniones')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (proyectoId) {
      query = query.eq('proyecto_id', proyectoId);
    }

    if (estado) {
      query = query.eq('estado', estado);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[GET /api/reuniones] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reuniones: data || [],
      total: count || 0,
      hasMore: count ? offset + limit < count : false,
    });
  } catch (error: any) {
    console.error('[GET /api/reuniones] Error inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
