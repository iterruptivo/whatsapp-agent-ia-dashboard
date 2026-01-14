/**
 * Sistema RBAC - Funciones de Verificación de Permisos
 *
 * Funciones async que consultan BD o cache para verificar permisos.
 * Usadas por Server Actions y Middleware.
 *
 * @version 1.0
 * @fecha 11 Enero 2026
 */

'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Permission, UserPermissions } from './types';
import { isRBACEnabled, formatPermission } from './types';
import {
  getPermisosFromCache,
  setPermisosInCache,
  invalidateUserCache,
} from './cache';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

/**
 * Crear cliente Supabase para Server Actions
 * Compatible con SSR y auth context
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
// FUNCIONES DE VERIFICACIÓN
// ============================================================================

/**
 * Verificar si un usuario tiene un permiso específico
 *
 * Flujo:
 * 1. Verificar feature flag ENABLE_RBAC
 * 2. Consultar cache (< 1ms si hit)
 * 3. Si cache miss, consultar BD (~5ms)
 * 4. Guardar en cache para futuras consultas
 *
 * @param userId ID del usuario
 * @param modulo Módulo del permiso (ej: 'leads')
 * @param accion Acción del permiso (ej: 'read')
 * @returns true si tiene el permiso, false en caso contrario
 */
export async function hasPermission(
  userId: string,
  modulo: string,
  accion: string
): Promise<boolean> {
  try {
    // Feature flag: Si RBAC está deshabilitado, usar validación legacy
    if (!isRBACEnabled()) {
      return await checkPermissionLegacy(userId, modulo, accion);
    }

    // PASO 1: Intentar obtener del cache
    const cachedPermissions = getPermisosFromCache(userId);

    if (cachedPermissions) {
      // SAFETY CHECK: Superadmin SIEMPRE tiene todos los permisos
      if (cachedPermissions.rol === 'superadmin') return true;

      // Cache hit - verificar permiso
      return checkPermissionInMemory(cachedPermissions, modulo, accion);
    }

    // PASO 2: Cache miss - consultar BD
    const permissions = await getUserPermissions(userId);

    if (!permissions) {
      console.warn(`[RBAC] No se encontraron permisos para usuario: ${userId}`);
      return false;
    }

    // PASO 3: Guardar en cache
    setPermisosInCache(userId, permissions);

    // SAFETY CHECK: Superadmin SIEMPRE tiene todos los permisos
    if (permissions.rol === 'superadmin') return true;

    // PASO 4: Verificar permiso
    const hasAccess = checkPermissionInMemory(permissions, modulo, accion);

    // DEBUG: Log si superadmin no tiene un permiso (no debería pasar)
    if (!hasAccess && permissions.rol === 'superadmin') {
      console.error(
        `[RBAC] ⚠️ CRITICAL: Superadmin sin permiso ${modulo}:${accion}`,
        'Ejecutar: migrations/fix_superadmin_permisos_urgent.sql'
      );
    }

    return hasAccess;
  } catch (error) {
    console.error('[RBAC] Error en hasPermission:', error);
    // En caso de error, denegar acceso por seguridad
    return false;
  }
}

/**
 * Verificar si un usuario tiene AL MENOS UNO de los permisos
 *
 * @param userId ID del usuario
 * @param permisos Array de permisos requeridos
 * @returns true si tiene al menos uno de los permisos
 */
export async function hasAnyPermission(
  userId: string,
  permisos: Permission[]
): Promise<boolean> {
  try {
    for (const permiso of permisos) {
      const hasIt = await hasPermission(userId, permiso.modulo, permiso.accion);
      if (hasIt) return true;
    }
    return false;
  } catch (error) {
    console.error('[RBAC] Error en hasAnyPermission:', error);
    return false;
  }
}

/**
 * Verificar si un usuario tiene TODOS los permisos
 *
 * @param userId ID del usuario
 * @param permisos Array de permisos requeridos
 * @returns true si tiene todos los permisos
 */
export async function hasAllPermissions(
  userId: string,
  permisos: Permission[]
): Promise<boolean> {
  try {
    for (const permiso of permisos) {
      const hasIt = await hasPermission(userId, permiso.modulo, permiso.accion);
      if (!hasIt) return false;
    }
    return true;
  } catch (error) {
    console.error('[RBAC] Error en hasAllPermissions:', error);
    return false;
  }
}

/**
 * Obtener TODOS los permisos efectivos de un usuario
 *
 * Consulta la vista user_effective_permissions que combina:
 * - Permisos del rol (tabla rol_permisos)
 * - Permisos extra (tabla usuario_permisos_extra)
 *
 * @param userId ID del usuario
 * @returns UserPermissions o null si no se encuentra
 */
export async function getUserPermissions(
  userId: string
): Promise<UserPermissions | null> {
  try {
    const supabase = await createClient();

    // PASO 1: Obtener datos del usuario (rol legacy y rol_id)
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, rol, rol_id')
      .eq('id', userId)
      .eq('activo', true)
      .single();

    if (userError || !userData) {
      console.error('[RBAC] Usuario no encontrado o inactivo:', userId);
      return null;
    }

    // PASO 2: Obtener permisos del rol
    const { data: rolPermisos, error: rolError } = await supabase
      .from('rol_permisos')
      .select(`
        permisos (
          id,
          modulo,
          accion,
          descripcion
        )
      `)
      .eq('rol_id', userData.rol_id || '');

    if (rolError) {
      console.error('[RBAC] Error obteniendo permisos del rol:', rolError);
    }

    // PASO 3: Obtener permisos extra del usuario
    const { data: permisosExtra, error: extraError } = await supabase
      .from('usuario_permisos_extra')
      .select(`
        permisos (
          id,
          modulo,
          accion,
          descripcion
        )
      `)
      .eq('usuario_id', userId)
      .eq('activo', true)
      .or(`fecha_expiracion.is.null,fecha_expiracion.gt.${new Date().toISOString()}`);

    if (extraError) {
      console.error('[RBAC] Error obteniendo permisos extra:', extraError);
    }

    // PASO 4: Consolidar permisos
    const permisosRol: Permission[] = (rolPermisos || [])
      .map((rp: any) => rp.permisos)
      .filter(Boolean)
      .map((p: any) => ({
        modulo: p.modulo,
        accion: p.accion,
      }));

    const permisosExtraList: Permission[] = (permisosExtra || [])
      .map((pe: any) => pe.permisos)
      .filter(Boolean)
      .map((p: any) => ({
        modulo: p.modulo,
        accion: p.accion,
      }));

    return {
      userId: userData.id,
      rol: userData.rol,
      rolId: userData.rol_id || '',
      permisos: permisosRol,
      permisosExtra: permisosExtraList,
    };
  } catch (error) {
    console.error('[RBAC] Error en getUserPermissions:', error);
    return null;
  }
}

/**
 * Listar todos los permisos de un usuario (formato string)
 *
 * Útil para debugging y UI
 *
 * @param userId ID del usuario
 * @returns Array de strings con formato "modulo:accion"
 */
export async function listUserPermissions(userId: string): Promise<string[]> {
  try {
    const permissions = await getUserPermissions(userId);

    if (!permissions) return [];

    // Combinar permisos del rol y permisos extra
    const allPermisos = [
      ...permissions.permisos,
      ...permissions.permisosExtra,
    ];

    // Convertir a strings y remover duplicados
    const permisosStrings = allPermisos.map(formatPermission);
    return Array.from(new Set(permisosStrings));
  } catch (error) {
    console.error('[RBAC] Error en listUserPermissions:', error);
    return [];
  }
}

// ============================================================================
// FUNCIONES INTERNAS
// ============================================================================

/**
 * Verificar permiso en memoria (sin consulta a BD)
 *
 * @param permissions Permisos del usuario
 * @param modulo Módulo a verificar
 * @param accion Acción a verificar
 * @returns true si tiene el permiso
 */
function checkPermissionInMemory(
  permissions: UserPermissions,
  modulo: string,
  accion: string
): boolean {
  // HOTFIX: leads:assign está habilitado para TODOS los roles EXCEPTO corredor
  // Esto permite asignación de leads para demo y operación normal
  if (modulo === 'leads' && accion === 'assign') {
    return permissions.rol !== 'corredor';
  }

  // RESTRICCIÓN: leads:export solo está habilitado para superadmin
  // Esto es crítico para la demo - solo superadmin puede exportar leads
  if (modulo === 'leads' && accion === 'export') {
    return permissions.rol === 'superadmin';
  }

  // Verificar en permisos del rol
  const hasInRole = permissions.permisos.some(
    (p) => p.modulo === modulo && p.accion === accion
  );

  if (hasInRole) return true;

  // Verificar en permisos extra
  const hasInExtra = permissions.permisosExtra.some(
    (p) => p.modulo === modulo && p.accion === accion
  );

  return hasInExtra;
}

/**
 * Validación legacy basada en roles hardcodeados
 *
 * Usado cuando ENABLE_RBAC === 'false'
 * Mantiene compatibilidad con sistema actual
 *
 * @param userId ID del usuario
 * @param modulo Módulo a verificar
 * @param accion Acción a verificar
 * @returns true si tiene el permiso (según rol legacy)
 */
async function checkPermissionLegacy(
  userId: string,
  modulo: string,
  accion: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: userData, error } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', userId)
      .eq('activo', true)
      .single();

    if (error || !userData) return false;

    const rol = userData.rol;

    // HOTFIX: leads:assign está habilitado para TODOS los roles EXCEPTO corredor
    if (modulo === 'leads' && accion === 'assign' && rol !== 'corredor') {
      return true;
    }

    // RESTRICCIÓN: leads:export solo está habilitado para superadmin
    if (modulo === 'leads' && accion === 'export') {
      return rol === 'superadmin';
    }

    // Superadmin y Admin tienen todos los permisos
    if (rol === 'superadmin' || rol === 'admin') return true;

    // Jefe de ventas y gerencia (legacy) tienen casi todos los permisos
    if (rol === 'jefe_ventas' || rol === 'gerencia') {
      // Excepciones: no pueden modificar usuarios ni configuración
      if (modulo === 'usuarios' && ['write', 'delete', 'change_role'].includes(accion)) {
        return false;
      }
      if (modulo === 'configuracion' && ['write', 'webhooks', 'integraciones'].includes(accion)) {
        return false;
      }
      return true;
    }

    // Vendedores: solo acceso a sus propios leads y locales
    if (rol === 'vendedor' || rol === 'vendedor_caseta') {
      if (modulo === 'leads' && ['read', 'write'].includes(accion)) return true;
      if (modulo === 'locales' && ['read', 'cambiar_estado'].includes(accion)) return true;
      if (modulo === 'reuniones' && ['read', 'write'].includes(accion)) return true;
      return false;
    }

    // Finanzas: acceso a control de pagos y comisiones
    if (rol === 'finanzas') {
      if (modulo === 'control_pagos') return true;
      if (modulo === 'comisiones' && ['read', 'read_all', 'export'].includes(accion)) return true;
      if (modulo === 'locales' && accion === 'read') return true;
      return false;
    }

    // Marketing: acceso a repulse y leads
    if (rol === 'marketing') {
      if (modulo === 'repulse') return true;
      if (modulo === 'leads' && ['read', 'read_all', 'export'].includes(accion)) return true;
      if (modulo === 'insights') return true;
      return false;
    }

    // Coordinador: acceso limitado
    if (rol === 'coordinador') {
      if (modulo === 'leads' && ['read', 'assign'].includes(accion)) return true;
      if (modulo === 'locales' && accion === 'read') return true;
      if (modulo === 'reuniones') return true;
      return false;
    }

    return false;
  } catch (error) {
    console.error('[RBAC] Error en checkPermissionLegacy:', error);
    return false;
  }
}

/**
 * Log de intento de acceso no autorizado
 *
 * Para auditoría y detección de intentos maliciosos
 *
 * @param userId ID del usuario
 * @param modulo Módulo al que intentó acceder
 * @param accion Acción que intentó ejecutar
 * @param context Contexto adicional (IP, user agent, etc.)
 */
export async function logUnauthorizedAccess(
  userId: string,
  modulo: string,
  accion: string,
  context?: {
    ip?: string;
    userAgent?: string;
    route?: string;
  }
): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from('permisos_audit').insert({
      usuario_id: userId,
      accion: 'unauthorized_access_attempt',
      tabla_afectada: modulo,
      registro_id: null,
      valores_antes: null,
      valores_despues: {
        permiso_requerido: `${modulo}:${accion}`,
        ...context,
      },
      realizado_por: userId,
      ip_address: context?.ip || null,
      user_agent: context?.userAgent || null,
    });

    console.warn(
      `[RBAC] ⚠️ Unauthorized access attempt - User: ${userId}, Permission: ${modulo}:${accion}`
    );
  } catch (error) {
    console.error('[RBAC] Error logging unauthorized access:', error);
  }
}
