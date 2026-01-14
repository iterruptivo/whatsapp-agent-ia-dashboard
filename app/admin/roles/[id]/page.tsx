/**
 * Page: /admin/roles/[id]
 *
 * Detalle y edición de permisos de un rol.
 * Solo accesible por superadmin.
 *
 * @version 1.1
 * @fecha 12 Enero 2026
 */

import { redirect, notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Permission } from '@/lib/permissions/types';
import { updateRolePermissionsAction } from '../actions';
import RoleEditClient from './RoleEditClient';
import RoleDetailWrapper from './RoleDetailWrapper';

// ============================================================================
// SERVER COMPONENT
// ============================================================================

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: roleId } = await params;

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

  // Obtener datos del rol
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select(`
      *,
      usuarios (count)
    `)
    .eq('id', roleId)
    .single();

  if (roleError || !role) {
    notFound();
  }

  // Obtener permisos del rol
  const { data: rolPermisos, error: permisosError } = await supabase
    .from('rol_permisos')
    .select(`
      permisos (
        id,
        modulo,
        accion,
        descripcion
      )
    `)
    .eq('rol_id', roleId);

  if (permisosError) {
    console.error('Error obteniendo permisos:', permisosError);
  }

  // Transformar permisos
  const permissions: Permission[] = (rolPermisos || [])
    .map((rp: any) => rp.permisos)
    .filter(Boolean)
    .map((p: any) => ({
      modulo: p.modulo,
      accion: p.accion,
    }));

  const usuariosCount = role.usuarios?.[0]?.count || 0;

  return (
    <RoleDetailWrapper
      rolNombre={role.nombre}
      rolDescripcion={role.descripcion}
      esSistema={role.es_sistema}
      activo={role.activo}
      usuariosCount={usuariosCount}
    >
      <RoleEditClient
        roleId={roleId}
        initialPermissions={permissions}
        rolNombre={role.nombre}
      />
    </RoleDetailWrapper>
  );
}
