/**
 * Sistema RBAC - Wrappers para Server Actions
 *
 * Higher-Order Functions (HOF) que wrappean server actions
 * para validar permisos automáticamente.
 *
 * @version 1.0
 * @fecha 11 Enero 2026
 */

'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  logUnauthorizedAccess,
} from './check';
import type { Permission, PermissionCheckResult } from './types';

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
// HOF - WRAPPERS DE PERMISOS
// ============================================================================

/**
 * Higher-Order Function que wrappea una server action con validación de permiso
 *
 * Uso:
 * ```typescript
 * export const deleteLeadAction = withPermission(
 *   'leads',
 *   'delete',
 *   async (leadId: string) => {
 *     // Lógica de delete - solo se ejecuta si tiene permiso
 *     const supabase = await createClient();
 *     return await supabase.from('leads').delete().eq('id', leadId);
 *   }
 * );
 * ```
 *
 * @param modulo Módulo del permiso requerido
 * @param accion Acción del permiso requerido
 * @param action Server action a ejecutar si tiene permiso
 * @returns Server action wrapeada con validación
 */
export function withPermission<TArgs extends any[], TReturn>(
  modulo: string,
  accion: string,
  action: (...args: TArgs) => Promise<TReturn>
) {
  return async function wrappedAction(
    ...args: TArgs
  ): Promise<TReturn | { error: string }> {
    try {
      // PASO 1: Obtener usuario autenticado
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { error: 'No autenticado' } as any;
      }

      // PASO 2: Verificar permiso
      const hasAccess = await hasPermission(user.id, modulo, accion);

      if (!hasAccess) {
        // Log intento no autorizado
        await logUnauthorizedAccess(user.id, modulo, accion);

        return {
          error: `No tienes permiso para ejecutar esta acción (${modulo}:${accion})`,
        } as any;
      }

      // PASO 3: Ejecutar action
      return await action(...args);
    } catch (error) {
      console.error('[RBAC] Error en withPermission:', error);
      return {
        error: 'Error interno del servidor',
      } as any;
    }
  };
}

/**
 * HOF que wrappea una server action con validación de múltiples permisos (OR)
 *
 * Uso:
 * ```typescript
 * export const viewReportsAction = withAnyPermission(
 *   [
 *     { modulo: 'insights', accion: 'read' },
 *     { modulo: 'control_pagos', accion: 'read' }
 *   ],
 *   async () => {
 *     // Lógica - se ejecuta si tiene AL MENOS uno de los permisos
 *     return await fetchReports();
 *   }
 * );
 * ```
 *
 * @param permisos Array de permisos (requiere al menos uno)
 * @param action Server action a ejecutar
 * @returns Server action wrapeada
 */
export function withAnyPermission<TArgs extends any[], TReturn>(
  permisos: Permission[],
  action: (...args: TArgs) => Promise<TReturn>
) {
  return async function wrappedAction(
    ...args: TArgs
  ): Promise<TReturn | { error: string }> {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { error: 'No autenticado' } as any;
      }

      const hasAccess = await hasAnyPermission(user.id, permisos);

      if (!hasAccess) {
        const permisosStr = permisos
          .map((p) => `${p.modulo}:${p.accion}`)
          .join(', ');

        await logUnauthorizedAccess(user.id, 'multiple', 'any', {
          route: permisosStr,
        });

        return {
          error: `No tienes ninguno de los permisos requeridos (${permisosStr})`,
        } as any;
      }

      return await action(...args);
    } catch (error) {
      console.error('[RBAC] Error en withAnyPermission:', error);
      return { error: 'Error interno del servidor' } as any;
    }
  };
}

/**
 * HOF que wrappea una server action con validación de múltiples permisos (AND)
 *
 * Uso:
 * ```typescript
 * export const complexAction = withAllPermissions(
 *   [
 *     { modulo: 'leads', accion: 'write' },
 *     { modulo: 'ventas', accion: 'approve' }
 *   ],
 *   async (data) => {
 *     // Lógica - se ejecuta solo si tiene TODOS los permisos
 *     return await doComplexOperation(data);
 *   }
 * );
 * ```
 *
 * @param permisos Array de permisos (requiere todos)
 * @param action Server action a ejecutar
 * @returns Server action wrapeada
 */
export function withAllPermissions<TArgs extends any[], TReturn>(
  permisos: Permission[],
  action: (...args: TArgs) => Promise<TReturn>
) {
  return async function wrappedAction(
    ...args: TArgs
  ): Promise<TReturn | { error: string }> {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { error: 'No autenticado' } as any;
      }

      const hasAccess = await hasAllPermissions(user.id, permisos);

      if (!hasAccess) {
        const permisosStr = permisos
          .map((p) => `${p.modulo}:${p.accion}`)
          .join(', ');

        await logUnauthorizedAccess(user.id, 'multiple', 'all', {
          route: permisosStr,
        });

        return {
          error: `No tienes todos los permisos requeridos (${permisosStr})`,
        } as any;
      }

      return await action(...args);
    } catch (error) {
      console.error('[RBAC] Error en withAllPermissions:', error);
      return { error: 'Error interno del servidor' } as any;
    }
  };
}

// ============================================================================
// VALIDACIÓN DIRECTA (SIN HOF)
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
