/**
 * Sistema RBAC - React Context
 *
 * Provider para compartir permisos del usuario en toda la app.
 * Los permisos se cargan una vez al montar y se cachean en memoria.
 *
 * @version 1.0
 * @fecha 11 Enero 2026
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import type { Permission, UserPermissions } from './types';
import { isRBACEnabled } from './types';
import {
  fetchUserPermissions,
  clientHasPermission,
  clientHasAnyPermission,
  clientHasAllPermissions,
} from './client';

// ============================================================================
// TYPES
// ============================================================================

interface PermissionsContextValue {
  // Estado
  permissions: UserPermissions | null;
  loading: boolean;
  error: string | null;

  // Métodos de verificación
  can: (modulo: string, accion: string) => boolean;
  canAny: (permisos: Permission[]) => boolean;
  canAll: (permisos: Permission[]) => boolean;

  // Helpers
  isAdmin: boolean;
  isRBACEnabled: boolean;
  allPermissions: Permission[]; // permisos + permisosExtra consolidados
  refresh: () => Promise<void>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const PermissionsContext = createContext<PermissionsContextValue | undefined>(
  undefined
);

// ============================================================================
// PROVIDER
// ============================================================================

interface PermissionsProviderProps {
  children: ReactNode;
}

/**
 * Provider de permisos
 *
 * Uso:
 * ```tsx
 * // En layout.tsx o _app.tsx
 * <PermissionsProvider>
 *   <YourApp />
 * </PermissionsProvider>
 * ```
 */
export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar permisos al montar
  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchUserPermissions();

      if (!data) {
        setError('No se pudieron cargar los permisos');
        setPermissions(null);
      } else {
        setPermissions(data);
      }
    } catch (err) {
      console.error('[RBAC Context] Error cargando permisos:', err);
      setError('Error cargando permisos');
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar permisos al montar
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Consolidar permisos (rol + extra)
  const allPermissions: Permission[] = permissions
    ? [...permissions.permisos, ...permissions.permisosExtra]
    : [];

  // Método de verificación simple: can('leads', 'read')
  const can = useCallback(
    (modulo: string, accion: string): boolean => {
      if (!permissions) return false;
      return clientHasPermission(allPermissions, modulo, accion);
    },
    [permissions, allPermissions]
  );

  // Método para verificar múltiples permisos (OR)
  const canAny = useCallback(
    (permisos: Permission[]): boolean => {
      if (!permissions) return false;
      return clientHasAnyPermission(allPermissions, permisos);
    },
    [permissions, allPermissions]
  );

  // Método para verificar múltiples permisos (AND)
  const canAll = useCallback(
    (permisos: Permission[]): boolean => {
      if (!permissions) return false;
      return clientHasAllPermissions(allPermissions, permisos);
    },
    [permissions, allPermissions]
  );

  // Detectar si es admin (legacy)
  const isAdmin = permissions?.rol === 'admin';

  // Feature flag
  const rbacEnabled = isRBACEnabled();

  const value: PermissionsContextValue = {
    permissions,
    loading,
    error,
    can,
    canAny,
    canAll,
    isAdmin,
    isRBACEnabled: rbacEnabled,
    allPermissions,
    refresh: loadPermissions,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook para acceder a permisos
 *
 * Uso:
 * ```tsx
 * function MyComponent() {
 *   const { can, canAny, canAll, loading, isAdmin } = usePermissions();
 *
 *   if (loading) return <div>Cargando...</div>;
 *
 *   if (!can('leads', 'delete')) {
 *     return <div>No tienes permiso</div>;
 *   }
 *
 *   return <button onClick={deleteLead}>Eliminar Lead</button>;
 * }
 * ```
 */
export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext);

  if (context === undefined) {
    throw new Error(
      'usePermissions debe usarse dentro de <PermissionsProvider>'
    );
  }

  return context;
}

// ============================================================================
// DOCUMENTATION
// ============================================================================

/**
 * GUÍA DE USO RÁPIDO
 *
 * 1. Envolver la app con el Provider (en layout.tsx):
 * ```tsx
 * import { PermissionsProvider } from '@/lib/permissions/context';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <PermissionsProvider>
 *           {children}
 *         </PermissionsProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * 2. Usar el hook en componentes:
 * ```tsx
 * import { usePermissions } from '@/lib/permissions/context';
 *
 * export default function LeadActions() {
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
 * 3. Verificar múltiples permisos:
 * ```tsx
 * import { usePermissions } from '@/lib/permissions/context';
 * import { PERMISOS_LEADS, PERMISOS_VENTAS } from '@/lib/permissions';
 *
 * export default function ComplexComponent() {
 *   const { canAny, canAll } = usePermissions();
 *
 *   // Usuario necesita AL MENOS uno de estos permisos
 *   const canViewData = canAny([
 *     PERMISOS_LEADS.READ,
 *     PERMISOS_VENTAS.READ,
 *   ]);
 *
 *   // Usuario necesita TODOS estos permisos
 *   const canApprove = canAll([
 *     PERMISOS_VENTAS.APPROVE,
 *     PERMISOS_CONTROL_PAGOS.VERIFY,
 *   ]);
 *
 *   return (
 *     <div>
 *       {canViewData && <DataTable />}
 *       {canApprove && <ApproveButton />}
 *     </div>
 *   );
 * }
 * ```
 *
 * 4. Acceder a información del usuario:
 * ```tsx
 * const { permissions, isAdmin, allPermissions } = usePermissions();
 *
 * console.log('User ID:', permissions?.userId);
 * console.log('Rol:', permissions?.rol);
 * console.log('Total permisos:', allPermissions.length);
 * console.log('Es admin:', isAdmin);
 * ```
 */
