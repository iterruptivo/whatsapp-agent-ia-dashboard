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
import { Shield, Plus } from 'lucide-react';
import Link from 'next/link';
import RolesTable, { type Role } from '@/components/admin/RolesTable';
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#192c4d]">
                Gestión de Roles
              </h1>
              <p className="text-gray-600 mt-1">
                Administra roles y permisos del sistema
              </p>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{rolesFormatted.length}</span> roles configurados
          </div>

          <Link
            href="/admin/roles/nuevo"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Crear Rol
          </Link>
        </div>

        {/* Table */}
        <RolesTable roles={rolesFormatted} onDelete={deleteRoleAction} />

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Los roles de sistema (Admin, Jefe Ventas, etc.) no pueden ser eliminados.
            Solo puedes modificar sus permisos.
          </p>
        </div>
      </div>
    </div>
  );
}
