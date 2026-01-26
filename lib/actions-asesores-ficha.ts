// ============================================================================
// SERVER ACTIONS: Asesores de Ficha de Inscripción
// ============================================================================
// Descripción: Gestión de múltiples asesores (máx 3) + jefatura por ficha
// Sesión: 108 - 26 Enero 2026
// ============================================================================

'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ============================================================================
// INTERFACES
// ============================================================================

export type RolAsesor = 'asesor_1' | 'asesor_2' | 'asesor_3' | 'jefatura';

export interface AsesorFicha {
  id: string;
  ficha_id: string;
  usuario_id: string;
  rol: RolAsesor;
  created_at: string;
  // Datos del usuario (JOIN)
  usuario_nombre?: string;
  usuario_email?: string;
}

export interface AsesorFichaInput {
  rol: RolAsesor;
  usuario_id: string;
}

// ============================================================================
// HELPER: Crear cliente de Supabase con cookies
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
// OBTENER ASESORES DE UNA FICHA
// ============================================================================

/**
 * Obtener todos los asesores de una ficha de inscripción
 *
 * @param fichaId ID de la ficha
 * @returns Array de asesores con datos del usuario
 */
export async function getAsesoresFicha(fichaId: string): Promise<{
  success: boolean;
  data: AsesorFicha[];
  message?: string;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('asesores_ficha')
      .select(`
        id,
        ficha_id,
        usuario_id,
        rol,
        created_at,
        usuarios!inner (
          nombre,
          email
        )
      `)
      .eq('ficha_id', fichaId)
      .order('rol');

    if (error) {
      console.error('[ASESORES_FICHA] Error obteniendo asesores:', error);
      return { success: false, data: [], message: error.message };
    }

    // Mapear respuesta
    const asesores: AsesorFicha[] = (data || []).map((a: any) => ({
      id: a.id,
      ficha_id: a.ficha_id,
      usuario_id: a.usuario_id,
      rol: a.rol as RolAsesor,
      created_at: a.created_at,
      usuario_nombre: a.usuarios?.nombre,
      usuario_email: a.usuarios?.email,
    }));

    return { success: true, data: asesores };
  } catch (error) {
    console.error('[ASESORES_FICHA] Error inesperado:', error);
    return { success: false, data: [], message: 'Error inesperado al obtener asesores' };
  }
}

// ============================================================================
// GUARDAR/ACTUALIZAR ASESORES DE UNA FICHA
// ============================================================================

/**
 * Guardar o actualizar asesores de una ficha
 * Reemplaza todos los asesores existentes con los nuevos
 *
 * @param fichaId ID de la ficha
 * @param asesores Array de asesores a guardar
 * @returns Success/error con mensaje
 */
export async function saveAsesoresFicha(
  fichaId: string,
  asesores: AsesorFichaInput[]
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const supabase = await createClient();

    // ============================================================================
    // VALIDACIONES
    // ============================================================================

    // Validar que no haya roles duplicados
    const roles = asesores.map(a => a.rol);
    if (new Set(roles).size !== roles.length) {
      return { success: false, message: 'No puede haber roles duplicados' };
    }

    // Validar que haya al menos asesor_1
    if (!asesores.some(a => a.rol === 'asesor_1')) {
      return { success: false, message: 'Debe haber al menos un asesor principal (asesor_1)' };
    }

    // ============================================================================
    // ELIMINAR ASESORES EXISTENTES
    // ============================================================================

    const { error: deleteError } = await supabase
      .from('asesores_ficha')
      .delete()
      .eq('ficha_id', fichaId);

    if (deleteError) {
      console.error('[ASESORES_FICHA] Error eliminando asesores:', deleteError);
      return { success: false, message: 'Error al actualizar asesores' };
    }

    // ============================================================================
    // INSERTAR NUEVOS ASESORES
    // ============================================================================

    if (asesores.length > 0) {
      const toInsert = asesores.map(a => ({
        ficha_id: fichaId,
        usuario_id: a.usuario_id,
        rol: a.rol,
      }));

      const { error: insertError } = await supabase
        .from('asesores_ficha')
        .insert(toInsert);

      if (insertError) {
        console.error('[ASESORES_FICHA] Error insertando asesores:', insertError);
        return { success: false, message: 'Error al guardar asesores' };
      }
    }

    return { success: true, message: 'Asesores guardados correctamente' };
  } catch (error) {
    console.error('[ASESORES_FICHA] Error inesperado:', error);
    return { success: false, message: 'Error inesperado al guardar asesores' };
  }
}

// ============================================================================
// OBTENER ASESORES FORMATEADOS PARA REPORTES
// ============================================================================

/**
 * Obtener asesores formateados para mostrar en reportes
 * Retorna array con nombre y rol de cada asesor
 *
 * @param fichaId ID de la ficha
 * @returns Array de asesores formateados
 */
export async function getAsesoresFichaParaReporte(fichaId: string): Promise<{
  nombre: string;
  rol: RolAsesor;
}[]> {
  const result = await getAsesoresFicha(fichaId);

  if (!result.success) return [];

  return result.data.map(a => ({
    nombre: a.usuario_nombre || 'Sin nombre',
    rol: a.rol,
  }));
}

// ============================================================================
// OBTENER ASESORES DE MÚLTIPLES FICHAS (BATCH)
// ============================================================================

/**
 * Obtener asesores de múltiples fichas en una sola query
 * Optimizado para evitar N+1 queries en reportes
 *
 * @param fichaIds Array de IDs de fichas
 * @returns Map de ficha_id -> array de asesores
 */
export async function getAsesoresFichasBatch(fichaIds: string[]): Promise<Map<string, AsesorFicha[]>> {
  if (fichaIds.length === 0) return new Map();

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('asesores_ficha')
      .select(`
        id,
        ficha_id,
        usuario_id,
        rol,
        created_at,
        usuarios!inner (
          nombre,
          email
        )
      `)
      .in('ficha_id', fichaIds)
      .order('rol');

    if (error) {
      console.error('[ASESORES_FICHA] Error batch:', error);
      return new Map();
    }

    // Agrupar por ficha_id
    const map = new Map<string, AsesorFicha[]>();

    for (const a of data || []) {
      const asesor: AsesorFicha = {
        id: a.id,
        ficha_id: a.ficha_id,
        usuario_id: a.usuario_id,
        rol: a.rol as RolAsesor,
        created_at: a.created_at,
        usuario_nombre: (a.usuarios as any)?.nombre,
        usuario_email: (a.usuarios as any)?.email,
      };

      if (!map.has(a.ficha_id)) {
        map.set(a.ficha_id, []);
      }
      map.get(a.ficha_id)!.push(asesor);
    }

    return map;
  } catch (error) {
    console.error('[ASESORES_FICHA] Error batch inesperado:', error);
    return new Map();
  }
}
