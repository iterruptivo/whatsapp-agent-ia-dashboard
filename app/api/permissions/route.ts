/**
 * API Route - GET /api/permissions
 *
 * Endpoint para obtener permisos del usuario autenticado.
 * Usado por el PermissionsProvider en cliente.
 *
 * @version 1.0
 * @fecha 11 Enero 2026
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getUserPermissions } from '@/lib/permissions/check';

/**
 * GET /api/permissions
 *
 * Retorna los permisos efectivos del usuario autenticado.
 *
 * Response:
 * - 200: { permissions: UserPermissions }
 * - 401: { error: 'No autenticado' }
 * - 500: { error: 'Error interno' }
 */
export async function GET() {
  try {
    // PASO 1: Crear cliente Supabase
    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    // PASO 2: Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // PASO 3: Obtener permisos del usuario
    const permissions = await getUserPermissions(user.id);

    if (!permissions) {
      return NextResponse.json(
        {
          error: 'No se encontraron permisos para el usuario',
          permissions: null,
        },
        { status: 200 } // 200 porque el usuario existe, solo no tiene permisos configurados
      );
    }

    // PASO 4: Retornar permisos
    return NextResponse.json(
      {
        permissions,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('[API /api/permissions] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
