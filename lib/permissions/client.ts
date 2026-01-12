/**
 * Sistema RBAC - Funciones Cliente
 *
 * Funciones para uso en componentes cliente (Client Components).
 * NO usar en Server Actions - usar funciones de ./server.ts
 *
 * @version 1.0
 * @fecha 11 Enero 2026
 */

'use client';

import type { Permission, UserPermissions } from './types';
import { formatPermission } from './types';

// ============================================================================
// FETCH PERMISOS (API)
// ============================================================================

/**
 * Obtener permisos del usuario actual desde API
 *
 * Uso en Client Component:
 * ```typescript
 * const permissions = await fetchUserPermissions();
 * if (permissions) {
 *   console.log('Permisos:', permissions);
 * }
 * ```
 *
 * @returns UserPermissions o null si hay error
 */
export async function fetchUserPermissions(): Promise<UserPermissions | null> {
  try {
    const response = await fetch('/api/permissions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // No cachear en navegador
    });

    if (!response.ok) {
      console.error('[RBAC Client] Error fetching permissions:', response.statusText);
      return null;
    }

    const data = await response.json();

    if (data.error) {
      console.error('[RBAC Client] API error:', data.error);
      return null;
    }

    return data.permissions || null;
  } catch (error) {
    console.error('[RBAC Client] Error en fetchUserPermissions:', error);
    return null;
  }
}

// ============================================================================
// CHECK PERMISOS EN CLIENTE
// ============================================================================

/**
 * Verificar si el usuario tiene un permiso específico
 *
 * Usa los permisos cacheados en contexto (NO hace fetch).
 * Usar dentro de componentes envueltos en <PermissionsProvider>
 *
 * @param permisos Array de permisos del usuario (desde contexto)
 * @param modulo Módulo del permiso
 * @param accion Acción del permiso
 * @returns true si tiene el permiso
 */
export function clientHasPermission(
  permisos: Permission[],
  modulo: string,
  accion: string
): boolean {
  return permisos.some((p) => p.modulo === modulo && p.accion === accion);
}

/**
 * Verificar si el usuario tiene AL MENOS UNO de los permisos
 *
 * @param permisos Array de permisos del usuario
 * @param permisosRequeridos Array de permisos requeridos
 * @returns true si tiene al menos uno
 */
export function clientHasAnyPermission(
  permisos: Permission[],
  permisosRequeridos: Permission[]
): boolean {
  return permisosRequeridos.some((req) =>
    clientHasPermission(permisos, req.modulo, req.accion)
  );
}

/**
 * Verificar si el usuario tiene TODOS los permisos
 *
 * @param permisos Array de permisos del usuario
 * @param permisosRequeridos Array de permisos requeridos
 * @returns true si tiene todos
 */
export function clientHasAllPermissions(
  permisos: Permission[],
  permisosRequeridos: Permission[]
): boolean {
  return permisosRequeridos.every((req) =>
    clientHasPermission(permisos, req.modulo, req.accion)
  );
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convertir permisos a array de strings para display
 *
 * @param permisos Array de permisos
 * @returns Array de strings con formato "modulo:accion"
 */
export function formatPermissionsForDisplay(permisos: Permission[]): string[] {
  return permisos.map(formatPermission);
}

/**
 * Agrupar permisos por módulo para display en UI
 *
 * @param permisos Array de permisos
 * @returns Objeto con módulos como keys y arrays de acciones como values
 */
export function groupPermissionsByModule(
  permisos: Permission[]
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  permisos.forEach((p) => {
    if (!grouped[p.modulo]) {
      grouped[p.modulo] = [];
    }
    grouped[p.modulo].push(p.accion);
  });

  return grouped;
}

/**
 * Contar permisos totales de un usuario
 *
 * @param permissions UserPermissions del usuario
 * @returns Número total de permisos (rol + extra, sin duplicados)
 */
export function countTotalPermissions(permissions: UserPermissions): number {
  const allPermisos = [
    ...permissions.permisos,
    ...permissions.permisosExtra,
  ];

  // Remover duplicados
  const uniquePermisos = new Set(allPermisos.map(formatPermission));
  return uniquePermisos.size;
}
