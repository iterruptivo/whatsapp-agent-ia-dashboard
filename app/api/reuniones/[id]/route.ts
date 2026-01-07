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
// GET /api/reuniones/[id] - Obtener detalle de reunión
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reunionId } = await params;
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener reunión
    const { data: reunion, error: reunionError } = await supabase
      .from('reuniones')
      .select('*')
      .eq('id', reunionId)
      .single();

    if (reunionError) {
      console.error('[GET /api/reuniones/[id]] Error:', reunionError);
      return NextResponse.json(
        { error: reunionError.message },
        { status: reunionError.code === 'PGRST116' ? 404 : 500 }
      );
    }

    // Obtener action items
    const { data: actionItems, error: actionItemsError } = await supabase
      .from('reunion_action_items')
      .select('*')
      .eq('reunion_id', reunionId)
      .order('created_at', { ascending: true });

    if (actionItemsError) {
      console.error('[GET /api/reuniones/[id]] Error action items:', actionItemsError);
      return NextResponse.json(
        { error: actionItemsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reunion,
      actionItems: actionItems || [],
    });
  } catch (error: any) {
    console.error('[GET /api/reuniones/[id]] Error inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
