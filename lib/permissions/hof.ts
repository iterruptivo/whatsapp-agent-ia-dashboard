/**
 * Sistema RBAC - Higher-Order Functions (HOF)
 *
 * Utilidades para wrappear server actions con validación de permisos.
 * NOTA: Este archivo NO es un server action module, es una utilidad de server-side.
 *
 * @version 1.0
 * @fecha 12 Enero 2026
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  logUnauthorizedAccess,
} from './check';
import type { Permission } from './types';

// ============================================================================
// SUPABASE CLIENT (interno)
// ============================================================================

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
