/**
 * Server Actions - Gestión de Roles
 *
 * Actions para CRUD de roles y permisos.
 *
 * @version 1.0
 * @fecha 11 Enero 2026
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Permission } from '@/lib/permissions/types';

// ============================================================================
// DELETE ROLE
// ============================================================================

/**
 * Eliminar un rol
 */
export async function deleteRoleAction(roleId: string): Promise<void> {
  try {
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

    // Verificar auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('No autenticado');
    }

    // Verificar que sea admin
    const { data: userData } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (userData?.rol !== 'admin') {
      throw new Error('No autorizado');
    }

    // Verificar que no sea rol de sistema
    const { data: role } = await supabase
      .from('roles')
      .select('es_sistema, nombre')
      .eq('id', roleId)
      .single();

    if (role?.es_sistema) {
      throw new Error('No se puede eliminar un rol de sistema');
    }

    // Verificar que no tenga usuarios asignados
    const { count } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('rol_id', roleId);

    if (count && count > 0) {
      throw new Error(
        `No se puede eliminar el rol "${role?.nombre}" porque tiene ${count} usuario(s) asignado(s)`
      );
    }

    // Eliminar rol (CASCADE eliminará permisos asociados)
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId);

    if (error) {
      throw error;
    }

    revalidatePath('/admin/roles');
  } catch (error) {
    console.error('Error eliminando rol:', error);
    throw error;
  }
}

// ============================================================================
// UPDATE ROLE PERMISSIONS
// ============================================================================

/**
 * Actualizar permisos de un rol
 */
export async function updateRolePermissionsAction(
  roleId: string,
  permissions: Permission[]
): Promise<{ success: boolean; error?: string }> {
  try {
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

    // Verificar auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Verificar que sea admin
    const { data: userData } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (userData?.rol !== 'admin') {
      return { success: false, error: 'No autorizado' };
    }

    // PASO 1: Eliminar permisos actuales del rol
    await supabase.from('rol_permisos').delete().eq('rol_id', roleId);

    // PASO 2: Obtener IDs de los permisos
    const { data: permisosData, error: permisosError } = await supabase
      .from('permisos')
      .select('id, modulo, accion');

    if (permisosError) {
      return { success: false, error: 'Error obteniendo permisos' };
    }

    // Crear mapa de permisos
    const permisosMap = new Map<string, string>();
    (permisosData || []).forEach((p: any) => {
      permisosMap.set(`${p.modulo}:${p.accion}`, p.id);
    });

    // PASO 3: Insertar nuevos permisos
    const rolPermisosToInsert = permissions
      .map((p) => {
        const permisoId = permisosMap.get(`${p.modulo}:${p.accion}`);
        if (!permisoId) {
          console.warn(`Permiso no encontrado: ${p.modulo}:${p.accion}`);
          return null;
        }
        return {
          rol_id: roleId,
          permiso_id: permisoId,
        };
      })
      .filter(Boolean);

    if (rolPermisosToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('rol_permisos')
        .insert(rolPermisosToInsert);

      if (insertError) {
        console.error('Error insertando permisos:', insertError);
        return { success: false, error: 'Error actualizando permisos' };
      }
    }

    revalidatePath('/admin/roles');
    revalidatePath(`/admin/roles/${roleId}`);

    return { success: true };
  } catch (error) {
    console.error('Error actualizando permisos:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}

// ============================================================================
// CREATE ROLE
// ============================================================================

/**
 * Crear un nuevo rol
 */
export async function createRoleAction(
  nombre: string,
  descripcion: string
): Promise<{ success: boolean; roleId?: string; error?: string }> {
  try {
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

    // Verificar auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Verificar que sea admin
    const { data: userData } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (userData?.rol !== 'admin') {
      return { success: false, error: 'No autorizado' };
    }

    // Crear rol
    const { data: newRole, error } = await supabase
      .from('roles')
      .insert({
        nombre,
        descripcion,
        es_sistema: false,
        activo: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando rol:', error);
      return { success: false, error: 'Error creando rol' };
    }

    revalidatePath('/admin/roles');

    return { success: true, roleId: newRole.id };
  } catch (error) {
    console.error('Error creando rol:', error);
    return { success: false, error: 'Error interno del servidor' };
  }
}
