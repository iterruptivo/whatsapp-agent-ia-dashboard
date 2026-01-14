/**
 * Page: /expansion/registro
 *
 * Formulario de registro para corredores.
 * Solo accesible por usuarios con rol 'corredor'.
 *
 * @version 1.0
 * @fecha 12 Enero 2026
 */

import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import RegistroCorredorClient from './RegistroCorredorClient';

export default async function RegistroCorredorPage() {
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

  // Verificar que es corredor
  const { data: userData } = await supabase
    .from('usuarios')
    .select('rol, nombre, email')
    .eq('id', user.id)
    .single();

  if (!userData || userData.rol !== 'corredor') {
    redirect('/');
  }

  // Obtener registro existente si hay
  const { data: registro } = await supabase
    .from('corredores_registro')
    .select(`
      *,
      documentos:corredores_documentos(*),
      historial:corredores_historial(*, usuario:usuarios!corredores_historial_realizado_por_fkey(nombre))
    `)
    .eq('usuario_id', user.id)
    .single();

  // Si está aprobado, redirigir a bienvenido
  if (registro?.estado === 'aprobado') {
    redirect('/expansion/bienvenido');
  }

  return (
    <RegistroCorredorClient
      usuario={{
        id: user.id,
        nombre: userData.nombre,
        email: userData.email,
      }}
      registroExistente={registro}
    />
  );
}
