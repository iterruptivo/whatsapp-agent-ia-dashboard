/**
 * Funciones client-side para obtener tipificaciones
 * Usa el browser client de Supabase directamente
 * Para uso en componentes 'use client'
 */

import { supabase } from './supabase';

// ============================================================================
// TIPOS
// ============================================================================

export interface TipificacionOption {
  value: string;
  label: string;
}

// ============================================================================
// FUNCIONES DE LECTURA (CLIENT-SIDE)
// ============================================================================

/**
 * Obtener tipificaciones N1 activas (para dropdowns)
 */
export async function getTipificacionesN1Client(): Promise<TipificacionOption[]> {
  try {
    const { data, error } = await supabase
      .from('tipificaciones_nivel_1')
      .select('codigo, label')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('[getTipificacionesN1Client] Error o vacío, usando fallback');
      return [];
    }

    return data.map(t => ({ value: t.codigo, label: t.label }));
  } catch (error) {
    console.error('[getTipificacionesN1Client] Exception:', error);
    return [];
  }
}

/**
 * Obtener tipificaciones N2 por código de N1 (para dropdowns)
 */
export async function getTipificacionesN2Client(nivel1Codigo: string): Promise<TipificacionOption[]> {
  try {
    const { data, error } = await supabase
      .from('tipificaciones_nivel_2')
      .select('codigo, label')
      .eq('nivel_1_codigo', nivel1Codigo)
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map(t => ({ value: t.codigo, label: t.label }));
  } catch (error) {
    console.error('[getTipificacionesN2Client] Exception:', error);
    return [];
  }
}

/**
 * Obtener tipificaciones N3 activas (para dropdowns)
 */
export async function getTipificacionesN3Client(): Promise<TipificacionOption[]> {
  try {
    const { data, error } = await supabase
      .from('tipificaciones_nivel_3')
      .select('codigo, label')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('[getTipificacionesN3Client] Error o vacío, usando fallback');
      return [];
    }

    return data.map(t => ({ value: t.codigo, label: t.label }));
  } catch (error) {
    console.error('[getTipificacionesN3Client] Exception:', error);
    return [];
  }
}

/**
 * Obtener mapa de N2 agrupado por N1 (para dropdowns dependientes)
 */
export async function getTipificacionesN2MapClient(): Promise<Record<string, TipificacionOption[]>> {
  try {
    const { data, error } = await supabase
      .from('tipificaciones_nivel_2')
      .select('nivel_1_codigo, codigo, label')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error || !data || data.length === 0) {
      return {};
    }

    const map: Record<string, TipificacionOption[]> = {};
    data.forEach(t => {
      if (!map[t.nivel_1_codigo]) {
        map[t.nivel_1_codigo] = [];
      }
      map[t.nivel_1_codigo].push({ value: t.codigo, label: t.label });
    });

    return map;
  } catch (error) {
    console.error('[getTipificacionesN2MapClient] Exception:', error);
    return {};
  }
}
