/**
 * Sistema RBAC - Exports Públicos
 *
 * Punto de entrada único para el sistema de permisos.
 * Exporta todas las funciones, tipos y constantes necesarias.
 *
 * @version 1.0
 * @fecha 11 Enero 2026
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  Permission,
  UserPermissions,
  PermissionsCacheEntry,
  PermissionCheckResult,
  Modulo,
  Accion,
} from './types';

export {
  MODULOS,
  ACCIONES,
  PERMISOS_LEADS,
  PERMISOS_LOCALES,
  PERMISOS_VENTAS,
  PERMISOS_CONTROL_PAGOS,
  PERMISOS_COMISIONES,
  PERMISOS_REPULSE,
  PERMISOS_APROBACIONES,
  PERMISOS_USUARIOS,
  PERMISOS_PROYECTOS,
  PERMISOS_INSIGHTS,
  PERMISOS_REUNIONES,
  PERMISOS_CONFIGURACION,
  isRBACEnabled,
  formatPermission,
  parsePermission,
  isValidPermission,
} from './types';

// ============================================================================
// CACHE
// ============================================================================

export {
  getPermisosFromCache,
  setPermisosInCache,
  invalidateUserCache,
  invalidateAllCache,
  getCacheStats,
  isUserInCache,
  warmCache,
} from './cache';

// Default export para cache
export { default as permissionsCache } from './cache';

// ============================================================================
// CHECK FUNCTIONS
// ============================================================================

export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  listUserPermissions,
  logUnauthorizedAccess,
} from './check';

// ============================================================================
// SERVER WRAPPERS
// ============================================================================

export {
  withPermission,
  withAnyPermission,
  withAllPermissions,
  requirePermission,
  checkPermission,
  canCurrentUser,
  getCurrentUserId,
  isCurrentUserAdmin,
} from './server';

// ============================================================================
// CLIENT FUNCTIONS
// ============================================================================

export {
  fetchUserPermissions,
  clientHasPermission,
  clientHasAnyPermission,
  clientHasAllPermissions,
  formatPermissionsForDisplay,
  groupPermissionsByModule,
  countTotalPermissions,
} from './client';

// ============================================================================
// CONTEXT & HOOKS
// ============================================================================

export { PermissionsProvider, usePermissions } from './context';

// ============================================================================
// DOCUMENTATION
// ============================================================================

/**
 * GUÍA DE USO RÁPIDO
 *
 * 1. En Server Actions (Nuevo código):
 * ```typescript
 * import { withPermission } from '@/lib/permissions';
 *
 * export const deleteLeadAction = withPermission(
 *   'leads',
 *   'delete',
 *   async (leadId: string) => {
 *     // Lógica aquí
 *   }
 * );
 * ```
 *
 * 2. En Server Actions (Código existente):
 * ```typescript
 * import { requirePermission } from '@/lib/permissions';
 *
 * export async function deleteLeadAction(leadId: string) {
 *   await requirePermission('leads', 'delete');
 *   // Lógica aquí
 * }
 * ```
 *
 * 3. Verificar permiso sin lanzar error:
 * ```typescript
 * import { canCurrentUser } from '@/lib/permissions';
 *
 * const canDelete = await canCurrentUser('leads', 'delete');
 * if (!canDelete) {
 *   return { error: 'No autorizado' };
 * }
 * ```
 *
 * 4. Obtener todos los permisos de un usuario:
 * ```typescript
 * import { getUserPermissions, listUserPermissions } from '@/lib/permissions';
 *
 * const permisos = await getUserPermissions(userId);
 * const permisosStrings = await listUserPermissions(userId);
 * // ['leads:read', 'leads:write', 'ventas:approve', ...]
 * ```
 *
 * 5. Múltiples permisos (OR):
 * ```typescript
 * import { withAnyPermission, PERMISOS_LEADS, PERMISOS_VENTAS } from '@/lib/permissions';
 *
 * export const viewDataAction = withAnyPermission(
 *   [PERMISOS_LEADS.READ, PERMISOS_VENTAS.READ],
 *   async () => {
 *     // Se ejecuta si tiene leads:read O ventas:read
 *   }
 * );
 * ```
 *
 * 6. Múltiples permisos (AND):
 * ```typescript
 * import { withAllPermissions } from '@/lib/permissions';
 *
 * export const complexAction = withAllPermissions(
 *   [
 *     { modulo: 'leads', accion: 'write' },
 *     { modulo: 'ventas', accion: 'approve' }
 *   ],
 *   async (data) => {
 *     // Se ejecuta solo si tiene ambos permisos
 *   }
 * );
 * ```
 *
 * 7. Cache management:
 * ```typescript
 * import { invalidateUserCache, invalidateAllCache, getCacheStats } from '@/lib/permissions';
 *
 * // Invalidar cache de usuario específico (cuando cambian sus permisos)
 * invalidateUserCache(userId);
 *
 * // Invalidar todo el cache (cuando cambian permisos de un rol)
 * invalidateAllCache();
 *
 * // Ver estadísticas del cache
 * const stats = getCacheStats();
 * // {
 * //   totalEntries: 24,
 * //   validEntries: 24,
 * //   expiredEntries: 0,
 * //   cacheTTL: 300000,
 * //   lastCleanup: "2026-01-11T10:30:00.000Z"
 * // }
 * ```
 *
 * 8. Feature flag (activar/desactivar RBAC):
 * ```typescript
 * import { isRBACEnabled } from '@/lib/permissions';
 *
 * if (isRBACEnabled()) {
 *   // Usar sistema RBAC granular
 * } else {
 *   // Usar validación legacy (hardcoded roles)
 * }
 * ```
 *
 * 9. Uso en Client Components:
 * ```tsx
 * import { usePermissions } from '@/lib/permissions';
 * import { PERMISOS_LEADS } from '@/lib/permissions';
 *
 * export default function MyComponent() {
 *   const { can, loading } = usePermissions();
 *
 *   if (loading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       {can('leads', 'write') && <EditButton />}
 *       {can('leads', 'delete') && <DeleteButton />}
 *     </div>
 *   );
 * }
 * ```
 *
 * 10. PermissionGate Component:
 * ```tsx
 * import PermissionGate from '@/components/auth/PermissionGate';
 *
 * <PermissionGate permission={{ modulo: 'leads', accion: 'delete' }}>
 *   <DeleteButton />
 * </PermissionGate>
 *
 * <PermissionGate
 *   anyOf={[
 *     { modulo: 'leads', accion: 'read' },
 *     { modulo: 'ventas', accion: 'read' }
 *   ]}
 * >
 *   <DataTable />
 * </PermissionGate>
 * ```
 */
