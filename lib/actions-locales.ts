// ============================================================================
// SERVER ACTIONS: Locales en Venta
// ============================================================================
// Descripción: Server Actions para mutaciones de locales
// Uso: Componentes cliente llaman estas funciones para cambios de estado
// ============================================================================

'use server';

import { revalidatePath } from 'next/cache';
import {
  updateLocalEstadoQuery,
  importLocalesQuery,
  deleteLocalQuery,
  updateMontoVentaQuery,
  type LocalImportRow,
} from './locales';

// ============================================================================
// UPDATE ESTADO DE LOCAL
// ============================================================================

/**
 * Cambiar estado de un local (semáforo)
 * @param localId ID del local
 * @param nuevoEstado Nuevo estado (verde, amarillo, naranja, rojo)
 * @param vendedorId ID del vendedor que hace el cambio
 * @returns Success/error con mensaje
 */
export async function updateLocalEstado(
  localId: string,
  nuevoEstado: 'verde' | 'amarillo' | 'naranja' | 'rojo',
  vendedorId?: string,
  usuarioId?: string // ID del usuario que hace el cambio (para historial)
) {
  try {
    const result = await updateLocalEstadoQuery(localId, nuevoEstado, vendedorId, usuarioId);

    if (result.success) {
      // Revalidar página de locales para reflejar cambios
      revalidatePath('/locales');
    }

    return result;
  } catch (error) {
    console.error('Error in updateLocalEstado:', error);
    return { success: false, message: 'Error inesperado al actualizar estado' };
  }
}

// ============================================================================
// IMPORTAR LOCALES DESDE CSV/EXCEL
// ============================================================================

/**
 * Importar múltiples locales desde CSV/Excel
 * @param locales Array de locales a importar
 * @returns Estadísticas de importación (inserted, skipped, errors)
 */
export async function importLocales(locales: LocalImportRow[]) {
  try {
    const result = await importLocalesQuery(locales);

    if (result.success && result.inserted > 0) {
      // Revalidar página de locales
      revalidatePath('/locales');
    }

    return result;
  } catch (error) {
    console.error('Error in importLocales:', error);
    return {
      success: false,
      inserted: 0,
      skipped: 0,
      total: locales.length,
      errors: ['Error inesperado durante importación'],
    };
  }
}

// ============================================================================
// ELIMINAR LOCAL (ADMIN ONLY)
// ============================================================================

/**
 * Eliminar un local (solo admin)
 * @param localId ID del local a eliminar
 * @returns Success/error
 */
export async function deleteLocal(localId: string) {
  try {
    const result = await deleteLocalQuery(localId);

    if (result.success) {
      // Revalidar página de locales
      revalidatePath('/locales');
    }

    return result;
  } catch (error) {
    console.error('Error in deleteLocal:', error);
    return { success: false, message: 'Error inesperado al eliminar local' };
  }
}

// ============================================================================
// DESBLOQUEAR LOCAL (ADMIN ONLY)
// ============================================================================

/**
 * Desbloquear un local bloqueado (solo admin)
 * Setea estado a verde y bloqueado = false
 * @param localId ID del local a desbloquear
 * @param usuarioId ID del usuario (admin) que desbloquea
 * @returns Success/error
 */
export async function desbloquearLocal(localId: string, usuarioId?: string) {
  try {
    // Usar updateLocalEstado con estado verde para desbloquear
    const result = await updateLocalEstadoQuery(localId, 'verde', undefined, usuarioId);

    if (result.success) {
      revalidatePath('/locales');
    }

    return result;
  } catch (error) {
    console.error('Error in desbloquearLocal:', error);
    return { success: false, message: 'Error inesperado al desbloquear local' };
  }
}

// ============================================================================
// UPDATE MONTO DE VENTA
// ============================================================================

/**
 * Actualizar monto de venta de un local (solo vendedor/vendedor_caseta en estado naranja)
 * @param localId ID del local
 * @param monto Monto de venta propuesto
 * @param usuarioId ID del usuario (vendedor) que establece el monto
 * @returns Success/error
 */
export async function updateMontoVenta(
  localId: string,
  monto: number,
  usuarioId?: string
) {
  try {
    const result = await updateMontoVentaQuery(localId, monto, usuarioId);

    if (result.success) {
      revalidatePath('/locales');
    }

    return result;
  } catch (error) {
    console.error('Error in updateMontoVenta:', error);
    return { success: false, message: 'Error inesperado al actualizar monto' };
  }
}
