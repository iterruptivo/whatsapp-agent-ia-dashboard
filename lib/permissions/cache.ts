/**
 * Sistema RBAC - Cache de Permisos en Memoria
 *
 * Cache con TTL de 5 minutos para permisos de usuarios.
 * Reduce queries a BD de ~5ms a <1ms (95%+ hit rate esperado).
 *
 * @version 1.0
 * @fecha 11 Enero 2026
 */

import type { UserPermissions, PermissionsCacheEntry } from './types';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

/**
 * TTL del cache: 5 minutos (300,000ms)
 * Balance entre freshness y performance
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Intervalo de limpieza de entradas expiradas: cada 2 minutos
 */
const CLEANUP_INTERVAL = 2 * 60 * 1000;

// ============================================================================
// CACHE EN MEMORIA
// ============================================================================

/**
 * Cache de permisos por userId
 * Map<userId, CacheEntry>
 */
const permissionsCache = new Map<string, PermissionsCacheEntry>();

/**
 * Última vez que se limpió el cache
 */
let lastCleanup = Date.now();

// ============================================================================
// FUNCIONES PÚBLICAS
// ============================================================================

/**
 * Obtener permisos del cache
 *
 * @param userId ID del usuario
 * @returns Permisos si están en cache y no han expirado, null en caso contrario
 */
export function getPermisosFromCache(userId: string): UserPermissions | null {
  const entry = permissionsCache.get(userId);

  if (!entry) {
    return null;
  }

  // Verificar si la entrada ha expirado
  const now = Date.now();
  const age = now - entry.timestamp;

  if (age > CACHE_TTL) {
    // Entrada expirada, remover del cache
    permissionsCache.delete(userId);
    return null;
  }

  return entry.data;
}

/**
 * Guardar permisos en cache
 *
 * @param userId ID del usuario
 * @param permisos Permisos del usuario
 */
export function setPermisosInCache(
  userId: string,
  permisos: UserPermissions
): void {
  const entry: PermissionsCacheEntry = {
    data: permisos,
    timestamp: Date.now(),
  };

  permissionsCache.set(userId, entry);

  // Limpieza periódica (cada 2 minutos)
  cleanupExpiredEntries();
}

/**
 * Invalidar cache de un usuario específico
 *
 * Usar cuando:
 * - Admin modifica permisos del usuario
 * - Usuario cambia de rol
 * - Se otorgan/revocan Permission Sets
 *
 * @param userId ID del usuario
 * @returns true si se eliminó entrada, false si no existía
 */
export function invalidateUserCache(userId: string): boolean {
  const deleted = permissionsCache.delete(userId);

  if (deleted) {
    console.log(`[RBAC Cache] Invalidated cache for user: ${userId}`);
  }

  return deleted;
}

/**
 * Invalidar todo el cache
 *
 * Usar cuando:
 * - Se modifican permisos de un rol (afecta a múltiples usuarios)
 * - Se crean/eliminan permisos del sistema
 * - Deployment de nueva versión
 *
 * @returns Número de entradas eliminadas
 */
export function invalidateAllCache(): number {
  const size = permissionsCache.size;
  permissionsCache.clear();

  console.log(`[RBAC Cache] Cleared all cache (${size} entries)`);

  return size;
}

/**
 * Obtener estadísticas del cache
 *
 * Útil para monitoring y debugging
 *
 * @returns Estadísticas del cache
 */
export function getCacheStats() {
  const now = Date.now();
  let expiredCount = 0;
  let validCount = 0;

  // Convert to array to avoid iterator issues
  const entries = Array.from(permissionsCache.values());
  for (const entry of entries) {
    const age = now - entry.timestamp;
    if (age > CACHE_TTL) {
      expiredCount++;
    } else {
      validCount++;
    }
  }

  return {
    totalEntries: permissionsCache.size,
    validEntries: validCount,
    expiredEntries: expiredCount,
    cacheTTL: CACHE_TTL,
    lastCleanup: new Date(lastCleanup).toISOString(),
  };
}

/**
 * Verificar si un usuario está en cache (sin importar si expiró)
 *
 * @param userId ID del usuario
 * @returns true si el usuario está en cache
 */
export function isUserInCache(userId: string): boolean {
  return permissionsCache.has(userId);
}

/**
 * Pre-calentar cache con permisos de múltiples usuarios
 *
 * Útil al inicio del servidor o después de deploy
 *
 * @param usersPermissions Array de permisos de usuarios
 * @returns Número de entradas agregadas
 */
export function warmCache(usersPermissions: UserPermissions[]): number {
  let count = 0;

  for (const permisos of usersPermissions) {
    setPermisosInCache(permisos.userId, permisos);
    count++;
  }

  console.log(`[RBAC Cache] Warmed cache with ${count} users`);

  return count;
}

// ============================================================================
// FUNCIONES INTERNAS
// ============================================================================

/**
 * Limpiar entradas expiradas del cache
 *
 * Se ejecuta automáticamente cada CLEANUP_INTERVAL
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();

  // Solo ejecutar cada CLEANUP_INTERVAL
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return;
  }

  let removedCount = 0;

  // Convert to array to avoid iterator issues
  const entries = Array.from(permissionsCache.entries());
  for (const [userId, entry] of entries) {
    const age = now - entry.timestamp;

    if (age > CACHE_TTL) {
      permissionsCache.delete(userId);
      removedCount++;
    }
  }

  lastCleanup = now;

  if (removedCount > 0) {
    console.log(
      `[RBAC Cache] Cleaned up ${removedCount} expired entries at ${new Date(now).toISOString()}`
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  get: getPermisosFromCache,
  set: setPermisosInCache,
  invalidateUser: invalidateUserCache,
  invalidateAll: invalidateAllCache,
  stats: getCacheStats,
  isInCache: isUserInCache,
  warm: warmCache,
};
