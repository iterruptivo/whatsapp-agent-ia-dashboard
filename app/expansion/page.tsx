/**
 * Page: /expansion
 *
 * Página principal del módulo Expansión.
 * Redirige según el rol del usuario:
 * - corredor: a /expansion/registro o /expansion/bienvenido
 * - admin/legal: a /expansion/inbox
 *
 * @version 1.0
 * @fecha 12 Enero 2026
 */

import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export default async function ExpansionPage() {
  // Obtener usuario actual
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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Obtener rol del usuario
  const { data: userData } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (!userData) {
    redirect('/login');
  }

  const rol = userData.rol;

  // Redirigir según rol
  if (rol === 'corredor') {
    // Verificar estado del registro del corredor
    const { data: registro } = await supabase
      .from('corredores_registro')
      .select('estado')
      .eq('usuario_id', user.id)
      .single();

    if (registro?.estado === 'aprobado') {
      redirect('/expansion/bienvenido');
    } else {
      redirect('/expansion/registro');
    }
  }

  // Admin, legal, superadmin -> inbox
  if (['superadmin', 'admin', 'legal'].includes(rol)) {
    redirect('/expansion/inbox');
  }

  // Otros roles no tienen acceso
  redirect('/');
}
