/**
 * Page: /expansion/[id]
 *
 * Detalle de solicitud de corredor con acciones.
 * Accesible por admin, legal y superadmin.
 *
 * @version 1.0
 * @fecha 12 Enero 2026
 */

import { redirect, notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import SolicitudDetalleClient from './SolicitudDetalleClient';

export default async function SolicitudDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  // Obtener registro
  const { data: registro, error } = await supabase
    .from('corredores_registro')
    .select(`
      *,
      usuario:usuarios!corredores_registro_usuario_id_fkey(nombre, email),
      documentos:corredores_documentos(*),
      historial:corredores_historial(*, usuario:usuarios!corredores_historial_realizado_por_fkey(nombre))
    `)
    .eq('id', id)
    .single();

  if (error || !registro) {
    notFound();
  }

  return (
    <SolicitudDetalleClient
      registro={registro}
      usuario={{
        id: user.id,
        nombre: userData.nombre,
        rol: userData.rol,
      }}
    />
  );
}
