/**
 * Page: /expansion/inbox
 *
 * Bandeja de solicitudes de corredores para revisión.
 * Accesible por admin, legal y superadmin.
 *
 * @version 1.0
 * @fecha 12 Enero 2026
 */

import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import InboxCorredoresClient from './InboxCorredoresClient';

export default async function InboxCorredoresPage() {
  // Verificar autenticación
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

  // Verificar rol
  const { data: userData } = await supabase
    .from('usuarios')
    .select('rol, nombre')
    .eq('id', user.id)
    .single();

  if (!userData || !['superadmin', 'admin', 'legal'].includes(userData.rol)) {
    redirect('/');
  }

  return (
    <InboxCorredoresClient
      usuario={{
        id: user.id,
        nombre: userData.nombre,
        rol: userData.rol,
      }}
    />
  );
}
