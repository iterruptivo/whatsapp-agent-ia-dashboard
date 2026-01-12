/**
 * Sistema RBAC - Tipos TypeScript
 *
 * Define interfaces y constantes para permisos granulares.
 * Basado en PLAN_MAESTRO_RBAC.md
 *
 * @version 1.0
 * @fecha 11 Enero 2026
 */

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Permiso individual - formato módulo:acción
 * Ejemplo: leads:read, ventas:approve, usuarios:delete
 */
export interface Permission {
  modulo: string;
  accion: string;
}

/**
 * Permisos efectivos de un usuario (rol + permisos extra)
 */
export interface UserPermissions {
  userId: string;
  rol: string; // Legacy: 'admin', 'jefe_ventas', etc.
  rolId: string; // UUID del rol en tabla roles
  permisos: Permission[]; // Permisos del rol
  permisosExtra: Permission[]; // Permisos adicionales (Permission Sets)
}

/**
 * Entrada del cache de permisos
 */
export interface PermissionsCacheEntry {
  data: UserPermissions;
  timestamp: number;
}

/**
 * Resultado de verificación de permiso
 */
export interface PermissionCheckResult {
  ok: boolean;
  error?: string;
}

// ============================================================================
// CONSTANTES - MÓDULOS DEL SISTEMA
// ============================================================================

/**
 * Módulos del sistema EcoPlaza Dashboard
 * Alineados con la arquitectura actual del Command Center
 */
export const MODULOS = {
  // Core - Gestión de Leads
  LEADS: 'leads',

  // Inventario
  LOCALES: 'locales',

  // Ventas y Pagos
  VENTAS: 'ventas',
  CONTROL_PAGOS: 'control_pagos',
  COMISIONES: 'comisiones',

  // Marketing
  REPULSE: 'repulse',

  // Workflows
  APROBACIONES: 'aprobaciones',

  // Administración
  USUARIOS: 'usuarios',
  PROYECTOS: 'proyectos',

  // Analytics
  INSIGHTS: 'insights',

  // Otros
  REUNIONES: 'reuniones',
  CONFIGURACION: 'configuracion',
} as const;

export type Modulo = typeof MODULOS[keyof typeof MODULOS];

// ============================================================================
// CONSTANTES - ACCIONES GENÉRICAS
// ============================================================================

/**
 * Acciones aplicables a múltiples módulos
 * Cada módulo puede implementar subconjunto de estas acciones
 */
export const ACCIONES = {
  // CRUD básico
  READ: 'read',               // Ver registros propios (filtrados por RLS)
  READ_ALL: 'read_all',       // Ver TODOS los registros sin filtro
  WRITE: 'write',             // Crear y editar registros
  DELETE: 'delete',           // Eliminar registros

  // Operaciones masivas
  EXPORT: 'export',           // Exportar a Excel/PDF
  IMPORT: 'import',           // Importar desde Excel
  BULK_ACTIONS: 'bulk_actions', // Acciones masivas

  // Asignaciones y flujos
  ASSIGN: 'assign',           // Asignar recursos (ej: leads a vendedores)
  APPROVE: 'approve',         // Aprobar acciones sensibles
  REJECT: 'reject',           // Rechazar aprobaciones
  VERIFY: 'verify',           // Verificar/validar registros

  // Configuración
  CONFIG: 'config',           // Configurar parámetros del módulo
  ADMIN: 'admin',             // Administración completa

  // Específicas por módulo
  CAMBIAR_ESTADO: 'cambiar_estado',       // Locales: semáforo
  CAMBIAR_PRECIO: 'cambiar_precio',       // Ventas: precio de venta
  GENERAR_CONSTANCIAS: 'generar_constancias', // Control Pagos
  GENERAR_CONTRATOS: 'generar_contratos',     // Control Pagos
  EXPEDIENTE: 'expediente',               // Control Pagos: ver expediente
  VALIDACION_BANCARIA: 'validacion_bancaria', // Control Pagos: validar vouchers
  CHANGE_ROLE: 'change_role',             // Usuarios: cambiar rol
  ASSIGN_PERMISSIONS: 'assign_permissions', // Usuarios: otorgar permisos
  VIEW_AUDIT: 'view_audit',               // Usuarios: ver auditoría
  WEBHOOKS: 'webhooks',                   // Configuración: webhooks
  INTEGRACIONES: 'integraciones',         // Configuración: APIs externas
  EXCLUDE: 'exclude',                     // Repulse: excluir leads
} as const;

export type Accion = typeof ACCIONES[keyof typeof ACCIONES];

// ============================================================================
// CATÁLOGO DE PERMISOS (62 permisos totales)
// ============================================================================

/**
 * Permisos del módulo LEADS (8 permisos)
 */
export const PERMISOS_LEADS = {
  READ: { modulo: MODULOS.LEADS, accion: ACCIONES.READ },
  READ_ALL: { modulo: MODULOS.LEADS, accion: ACCIONES.READ_ALL },
  WRITE: { modulo: MODULOS.LEADS, accion: ACCIONES.WRITE },
  DELETE: { modulo: MODULOS.LEADS, accion: ACCIONES.DELETE },
  ASSIGN: { modulo: MODULOS.LEADS, accion: ACCIONES.ASSIGN },
  EXPORT: { modulo: MODULOS.LEADS, accion: ACCIONES.EXPORT },
  IMPORT: { modulo: MODULOS.LEADS, accion: ACCIONES.IMPORT },
  BULK_ACTIONS: { modulo: MODULOS.LEADS, accion: ACCIONES.BULK_ACTIONS },
} as const;

/**
 * Permisos del módulo LOCALES (7 permisos)
 */
export const PERMISOS_LOCALES = {
  READ: { modulo: MODULOS.LOCALES, accion: ACCIONES.READ },
  READ_ALL: { modulo: MODULOS.LOCALES, accion: ACCIONES.READ_ALL },
  WRITE: { modulo: MODULOS.LOCALES, accion: ACCIONES.WRITE },
  DELETE: { modulo: MODULOS.LOCALES, accion: ACCIONES.DELETE },
  CAMBIAR_ESTADO: { modulo: MODULOS.LOCALES, accion: ACCIONES.CAMBIAR_ESTADO },
  EXPORT: { modulo: MODULOS.LOCALES, accion: ACCIONES.EXPORT },
  ADMIN: { modulo: MODULOS.LOCALES, accion: ACCIONES.ADMIN },
} as const;

/**
 * Permisos del módulo VENTAS (4 permisos)
 */
export const PERMISOS_VENTAS = {
  READ: { modulo: MODULOS.VENTAS, accion: ACCIONES.READ },
  WRITE: { modulo: MODULOS.VENTAS, accion: ACCIONES.WRITE },
  DELETE: { modulo: MODULOS.VENTAS, accion: ACCIONES.DELETE },
  CAMBIAR_PRECIO: { modulo: MODULOS.VENTAS, accion: ACCIONES.CAMBIAR_PRECIO },
  APPROVE: { modulo: MODULOS.VENTAS, accion: ACCIONES.APPROVE },
} as const;

/**
 * Permisos del módulo CONTROL_PAGOS (6 permisos)
 */
export const PERMISOS_CONTROL_PAGOS = {
  READ: { modulo: MODULOS.CONTROL_PAGOS, accion: ACCIONES.READ },
  WRITE: { modulo: MODULOS.CONTROL_PAGOS, accion: ACCIONES.WRITE },
  VERIFY: { modulo: MODULOS.CONTROL_PAGOS, accion: ACCIONES.VERIFY },
  GENERAR_CONSTANCIAS: { modulo: MODULOS.CONTROL_PAGOS, accion: ACCIONES.GENERAR_CONSTANCIAS },
  GENERAR_CONTRATOS: { modulo: MODULOS.CONTROL_PAGOS, accion: ACCIONES.GENERAR_CONTRATOS },
  EXPEDIENTE: { modulo: MODULOS.CONTROL_PAGOS, accion: ACCIONES.EXPEDIENTE },
  VALIDACION_BANCARIA: { modulo: MODULOS.CONTROL_PAGOS, accion: ACCIONES.VALIDACION_BANCARIA },
} as const;

/**
 * Permisos del módulo COMISIONES (3 permisos)
 */
export const PERMISOS_COMISIONES = {
  READ: { modulo: MODULOS.COMISIONES, accion: ACCIONES.READ },
  READ_ALL: { modulo: MODULOS.COMISIONES, accion: ACCIONES.READ_ALL },
  EXPORT: { modulo: MODULOS.COMISIONES, accion: ACCIONES.EXPORT },
} as const;

/**
 * Permisos del módulo REPULSE (4 permisos)
 */
export const PERMISOS_REPULSE = {
  READ: { modulo: MODULOS.REPULSE, accion: ACCIONES.READ },
  WRITE: { modulo: MODULOS.REPULSE, accion: ACCIONES.WRITE },
  CONFIG: { modulo: MODULOS.REPULSE, accion: ACCIONES.CONFIG },
  EXCLUDE: { modulo: MODULOS.REPULSE, accion: ACCIONES.EXCLUDE },
} as const;

/**
 * Permisos del módulo APROBACIONES (4 permisos)
 */
export const PERMISOS_APROBACIONES = {
  READ: { modulo: MODULOS.APROBACIONES, accion: ACCIONES.READ },
  APPROVE: { modulo: MODULOS.APROBACIONES, accion: ACCIONES.APPROVE },
  REJECT: { modulo: MODULOS.APROBACIONES, accion: ACCIONES.REJECT },
  CONFIG: { modulo: MODULOS.APROBACIONES, accion: ACCIONES.CONFIG },
} as const;

/**
 * Permisos del módulo USUARIOS (6 permisos)
 */
export const PERMISOS_USUARIOS = {
  READ: { modulo: MODULOS.USUARIOS, accion: ACCIONES.READ },
  WRITE: { modulo: MODULOS.USUARIOS, accion: ACCIONES.WRITE },
  DELETE: { modulo: MODULOS.USUARIOS, accion: ACCIONES.DELETE },
  CHANGE_ROLE: { modulo: MODULOS.USUARIOS, accion: ACCIONES.CHANGE_ROLE },
  ASSIGN_PERMISSIONS: { modulo: MODULOS.USUARIOS, accion: ACCIONES.ASSIGN_PERMISSIONS },
  VIEW_AUDIT: { modulo: MODULOS.USUARIOS, accion: ACCIONES.VIEW_AUDIT },
} as const;

/**
 * Permisos del módulo PROYECTOS (4 permisos)
 */
export const PERMISOS_PROYECTOS = {
  READ: { modulo: MODULOS.PROYECTOS, accion: ACCIONES.READ },
  WRITE: { modulo: MODULOS.PROYECTOS, accion: ACCIONES.WRITE },
  DELETE: { modulo: MODULOS.PROYECTOS, accion: ACCIONES.DELETE },
  CONFIG: { modulo: MODULOS.PROYECTOS, accion: ACCIONES.CONFIG },
} as const;

/**
 * Permisos del módulo INSIGHTS (2 permisos)
 */
export const PERMISOS_INSIGHTS = {
  READ: { modulo: MODULOS.INSIGHTS, accion: ACCIONES.READ },
  EXPORT: { modulo: MODULOS.INSIGHTS, accion: ACCIONES.EXPORT },
} as const;

/**
 * Permisos del módulo REUNIONES (4 permisos)
 */
export const PERMISOS_REUNIONES = {
  READ: { modulo: MODULOS.REUNIONES, accion: ACCIONES.READ },
  READ_ALL: { modulo: MODULOS.REUNIONES, accion: ACCIONES.READ_ALL },
  WRITE: { modulo: MODULOS.REUNIONES, accion: ACCIONES.WRITE },
  DELETE: { modulo: MODULOS.REUNIONES, accion: ACCIONES.DELETE },
} as const;

/**
 * Permisos del módulo CONFIGURACION (4 permisos)
 */
export const PERMISOS_CONFIGURACION = {
  READ: { modulo: MODULOS.CONFIGURACION, accion: ACCIONES.READ },
  WRITE: { modulo: MODULOS.CONFIGURACION, accion: ACCIONES.WRITE },
  WEBHOOKS: { modulo: MODULOS.CONFIGURACION, accion: ACCIONES.WEBHOOKS },
  INTEGRACIONES: { modulo: MODULOS.CONFIGURACION, accion: ACCIONES.INTEGRACIONES },
} as const;

// ============================================================================
// FEATURE FLAG
// ============================================================================

/**
 * Feature flag para activar/desactivar RBAC
 * - true: Usar sistema RBAC granular
 * - false: Usar validación legacy (hardcoded roles)
 */
export function isRBACEnabled(): boolean {
  return process.env.ENABLE_RBAC === 'true';
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Crear string de permiso (módulo:acción)
 */
export function formatPermission(permission: Permission): string {
  return `${permission.modulo}:${permission.accion}`;
}

/**
 * Parsear string de permiso a objeto
 */
export function parsePermission(permissionString: string): Permission | null {
  const parts = permissionString.split(':');
  if (parts.length !== 2) return null;

  return {
    modulo: parts[0],
    accion: parts[1],
  };
}

/**
 * Validar formato de permiso
 */
export function isValidPermission(permission: Permission): boolean {
  return (
    typeof permission.modulo === 'string' &&
    typeof permission.accion === 'string' &&
    permission.modulo.length > 0 &&
    permission.accion.length > 0
  );
}
