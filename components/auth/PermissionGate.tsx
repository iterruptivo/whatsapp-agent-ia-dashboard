/**
 * PermissionGate Component
 *
 * Componente para condicionar renderizado basado en permisos.
 * Usa el contexto de permisos para verificaciones ligeras.
 *
 * @version 1.0
 * @fecha 11 Enero 2026
 */

'use client';

import { ReactNode } from 'react';
import type { Permission } from '@/lib/permissions/types';
import { usePermissions } from '@/lib/permissions/context';

// ============================================================================
// TYPES
// ============================================================================

interface PermissionGateProps {
  children: ReactNode;

  // Permiso único
  permission?: Permission;

  // Múltiples permisos (OR)
  anyOf?: Permission[];

  // Múltiples permisos (AND)
  allOf?: Permission[];

  // Fallback cuando NO tiene permiso
  fallback?: ReactNode;

  // Loading state
  loadingFallback?: ReactNode;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Gate que solo renderiza children si el usuario tiene el/los permiso(s)
 *
 * Uso:
 * ```tsx
 * // Permiso único
 * <PermissionGate permission={{ modulo: 'leads', accion: 'delete' }}>
 *   <DeleteButton />
 * </PermissionGate>
 *
 * // Múltiples permisos (OR)
 * <PermissionGate anyOf={[
 *   { modulo: 'leads', accion: 'read' },
 *   { modulo: 'ventas', accion: 'read' },
 * ]}>
 *   <DataTable />
 * </PermissionGate>
 *
 * // Múltiples permisos (AND)
 * <PermissionGate allOf={[
 *   { modulo: 'ventas', accion: 'approve' },
 *   { modulo: 'control_pagos', accion: 'verify' },
 * ]}>
 *   <ApproveButton />
 * </PermissionGate>
 *
 * // Con fallback
 * <PermissionGate
 *   permission={{ modulo: 'usuarios', accion: 'write' }}
 *   fallback={<div>No tienes permiso para editar usuarios</div>}
 * >
 *   <UserEditForm />
 * </PermissionGate>
 * ```
 */
export default function PermissionGate({
  children,
  permission,
  anyOf,
  allOf,
  fallback = null,
  loadingFallback = null,
}: PermissionGateProps) {
  const { can, canAny, canAll, loading } = usePermissions();

  // Estado de carga
  if (loading) {
    return <>{loadingFallback}</>;
  }

  // Validar que se pasó al menos una prop de permiso
  if (!permission && !anyOf && !allOf) {
    console.warn('[PermissionGate] No se especificó ningún permiso');
    return <>{fallback}</>;
  }

  // Verificar permiso único
  if (permission) {
    const hasPermission = can(permission.modulo, permission.accion);
    return hasPermission ? <>{children}</> : <>{fallback}</>;
  }

  // Verificar múltiples permisos (OR)
  if (anyOf && anyOf.length > 0) {
    const hasAnyPermission = canAny(anyOf);
    return hasAnyPermission ? <>{children}</> : <>{fallback}</>;
  }

  // Verificar múltiples permisos (AND)
  if (allOf && allOf.length > 0) {
    const hasAllPermissions = canAll(allOf);
    return hasAllPermissions ? <>{children}</> : <>{fallback}</>;
  }

  // Fallback (no debería llegar aquí)
  return <>{fallback}</>;
}

// ============================================================================
// EJEMPLOS DE USO
// ============================================================================

/**
 * EJEMPLOS PRÁCTICOS
 *
 * 1. Botón de eliminar (solo si tiene permiso)
 * ```tsx
 * <PermissionGate permission={{ modulo: 'leads', accion: 'delete' }}>
 *   <button onClick={handleDelete}>Eliminar Lead</button>
 * </PermissionGate>
 * ```
 *
 * 2. Menú de acciones (con múltiples opciones)
 * ```tsx
 * <div className="flex gap-2">
 *   <PermissionGate permission={{ modulo: 'leads', accion: 'write' }}>
 *     <EditButton />
 *   </PermissionGate>
 *
 *   <PermissionGate permission={{ modulo: 'leads', accion: 'delete' }}>
 *     <DeleteButton />
 *   </PermissionGate>
 *
 *   <PermissionGate permission={{ modulo: 'leads', accion: 'export' }}>
 *     <ExportButton />
 *   </PermissionGate>
 * </div>
 * ```
 *
 * 3. Sección completa con fallback
 * ```tsx
 * <PermissionGate
 *   permission={{ modulo: 'insights', accion: 'read' }}
 *   fallback={
 *     <div className="bg-yellow-50 p-4 rounded-lg">
 *       <p>No tienes acceso a este reporte.</p>
 *       <p className="text-sm">Contacta a tu administrador.</p>
 *     </div>
 *   }
 * >
 *   <InsightsDashboard />
 * </PermissionGate>
 * ```
 *
 * 4. Mostrar sección SI tiene al menos uno de varios permisos
 * ```tsx
 * <PermissionGate
 *   anyOf={[
 *     { modulo: 'control_pagos', accion: 'read' },
 *     { modulo: 'comisiones', accion: 'read' },
 *   ]}
 * >
 *   <FinancialReports />
 * </PermissionGate>
 * ```
 *
 * 5. Mostrar sección SOLO si tiene todos los permisos
 * ```tsx
 * <PermissionGate
 *   allOf={[
 *     { modulo: 'usuarios', accion: 'write' },
 *     { modulo: 'usuarios', accion: 'change_role' },
 *   ]}
 * >
 *   <RoleManagementPanel />
 * </PermissionGate>
 * ```
 *
 * 6. Con loading state personalizado
 * ```tsx
 * <PermissionGate
 *   permission={{ modulo: 'reuniones', accion: 'read' }}
 *   loadingFallback={<Spinner />}
 * >
 *   <ReunionesTable />
 * </PermissionGate>
 * ```
 */
