'use server';

import { supabase } from './supabase';

export async function updateLeadTipificacion(
  leadId: string,
  nivel1: string | null,
  nivel2: string | null,
  nivel3: string | null
) {
  try {
    const { error } = await supabase
      .from('leads')
      .update({
        tipificacion_nivel_1: nivel1 || null,
        tipificacion_nivel_2: nivel2 || null,
        tipificacion_nivel_3: nivel3 || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (error) {
      console.error('Error updating tipificacion:', error);
      return { success: false, message: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception updating tipificacion:', err);
    return { success: false, message: 'Error inesperado' };
  }
}

/**
 * Actualiza las observaciones del vendedor para un lead
 * Campo de "wrap-up" post-conversación similar a marcadores predictivos
 */
export async function updateLeadObservaciones(
  leadId: string,
  observaciones: string | null
) {
  try {
    const { error } = await supabase
      .from('leads')
      .update({
        observaciones_vendedor: observaciones || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (error) {
      console.error('Error updating observaciones:', error);
      return { success: false, message: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception updating observaciones:', err);
    return { success: false, message: 'Error inesperado' };
  }
}
