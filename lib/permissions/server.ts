/**
 * Sistema RBAC - Server Actions de Permisos
 *
 * Server Actions para verificar permisos desde componentes cliente.
 * Para HOFs (withPermission, etc.), usar @/lib/permissions/hof
 *
 * @version 1.1
 * @fecha 12 Enero 2026
 */

'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  hasPermission,
  logUnauthorizedAccess,
} from './check';
import type { PermissionCheckResult } from './types';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

/**
 * Crear cliente Supabase para Server Actions
 */
async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
}

// ============================================================================
// SERVER ACTIONS - VALIDACIÓN DE PERMISOS
// ============================================================================

/**
 * Validar permiso y lanzar error si no tiene acceso
 *
 * Uso dentro de server actions existentes:
 * ```typescript
 * export async function deleteLeadAction(leadId: string) {
 *   await requirePermission('leads', 'delete');
 *
 *   // Continuar con lógica...
 *   const supabase = await createClient();
 *   return await supabase.from('leads').delete().eq('id', leadId);
 * }
 * ```
 *
 * @param modulo Módulo del permiso requerido
 * @param accion Acción del permiso requerido
 * @throws Error si no tiene permiso o no está autenticado
 */
export async function requirePermission(
  modulo: string,
  accion: string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('No autenticado');
  }

  const hasAccess = await hasPermission(user.id, modulo, accion);

  if (!hasAccess) {
    await logUnauthorizedAccess(user.id, modulo, accion);
    throw new Error(
      `No tienes permiso para ejecutar esta acción (${modulo}:${accion})`
    );
  }
}

/**
 * Verificar permiso y retornar resultado (sin lanzar error)
 *
 * Uso:
 * ```typescript
 * const result = await checkPermission('leads', 'delete');
 * if (!result.ok) {
 *   return { error: result.error };
 * }
 * // Continuar con lógica...
 * ```
 *
 * @param modulo Módulo del permiso
 * @param accion Acción del permiso
 * @returns Resultado con ok: true/false y error opcional
 */
export async function checkPermission(
  modulo: string,
  accion: string
): Promise<PermissionCheckResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { ok: false, error: 'No autenticado' };
    }

    const hasAccess = await hasPermission(user.id, modulo, accion);

    if (!hasAccess) {
      await logUnauthorizedAccess(user.id, modulo, accion);
      return {
        ok: false,
        error: `No tienes permiso (${modulo}:${accion})`,
      };
    }

    return { ok: true };
  } catch (error) {
    console.error('[RBAC] Error en checkPermission:', error);
    return { ok: false, error: 'Error interno del servidor' };
  }
}

/**
 * Verificar si el usuario actual tiene un permiso (sin lanzar error)
 *
 * @param modulo Módulo del permiso
 * @param accion Acción del permiso
 * @returns true si tiene el permiso, false en caso contrario
 */
export async function canCurrentUser(
  modulo: string,
  accion: string
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return false;
    }

    return await hasPermission(user.id, modulo, accion);
  } catch (error) {
    console.error('[RBAC] Error en canCurrentUser:', error);
    return false;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Obtener el ID del usuario autenticado actual
 *
 * @returns ID del usuario o null si no está autenticado
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id || null;
  } catch (error) {
    console.error('[RBAC] Error en getCurrentUserId:', error);
    return null;
  }
}

/**
 * Verificar si el usuario actual es admin
 *
 * @returns true si es admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', userId)
      .single();

    if (error || !data) return false;

    return data.rol === 'admin';
  } catch (error) {
    console.error('[RBAC] Error en isCurrentUserAdmin:', error);
    return false;
  }
}
