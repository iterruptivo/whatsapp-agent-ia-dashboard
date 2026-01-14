/**
 * Page: /admin/roles
 *
 * Lista de roles del sistema con gestión CRUD.
 * Solo accesible por administradores.
 *
 * @version 1.0
 * @fecha 11 Enero 2026
 */

import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import RolesPageClient from '@/components/admin/RolesPageClient';
import { type Role } from '@/components/admin/RolesTable';
import { deleteRoleAction } from './actions';

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function RolesPage() {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verificar que sea superadmin
  const { data: userData } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (userData?.rol !== 'superadmin') {
    redirect('/');
  }

  // Obtener roles con conteos
  const { data: roles, error } = await supabase
    .from('roles')
    .select(`
      *,
      rol_permisos (count),
      usuarios (count)
    `)
    .order('nombre');

  if (error) {
    console.error('Error obteniendo roles:', error);
  }

  // Transformar datos para el componente
  const rolesFormatted: Role[] = (roles || []).map((role) => ({
    id: role.id,
    nombre: role.nombre,
    descripcion: role.descripcion,
    es_sistema: role.es_sistema,
    activo: role.activo,
    permisos_count: role.rol_permisos?.[0]?.count || 0,
    usuarios_count: role.usuarios?.[0]?.count || 0,
    created_at: role.created_at,
  }));

  return (
    <RolesPageClient roles={rolesFormatted} onDelete={deleteRoleAction} />
  );
}
