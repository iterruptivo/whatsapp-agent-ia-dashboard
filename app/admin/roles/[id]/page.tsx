/**
 * Page: /admin/roles/[id]
 *
 * Detalle y edición de permisos de un rol.
 *
 * @version 1.0
 * @fecha 11 Enero 2026
 */

import { redirect, notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Shield, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import PermissionsMatrix from '@/components/admin/PermissionsMatrix';
import type { Permission } from '@/lib/permissions/types';
import { updateRolePermissionsAction } from '../actions';
import RoleEditClient from './RoleEditClient';

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

  // Verificar que sea admin
  const { data: userData } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (userData?.rol !== 'admin') {
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/roles"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Roles
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#192c4d]">
                {role.nombre}
              </h1>
              <p className="text-gray-600 mt-1">
                {role.descripcion || 'Sin descripción'}
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-6 mt-4">
            {role.es_sistema && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                Rol de Sistema
              </span>
            )}
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                role.activo
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {role.activo ? 'Activo' : 'Inactivo'}
            </span>
            <span className="text-sm text-gray-600">
              <strong>{usuariosCount}</strong> usuario(s) asignado(s)
            </span>
          </div>
        </div>

        {/* Client Component - Editable Permissions Matrix */}
        <RoleEditClient
          roleId={roleId}
          initialPermissions={permissions}
          rolNombre={role.nombre}
        />

        {/* Info */}
        {role.es_sistema && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Este es un rol de sistema. Puedes modificar sus permisos,
              pero no puedes eliminarlo ni cambiar su nombre.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
