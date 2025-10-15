'use server';

import { supabase } from './supabase';
import { revalidatePath } from 'next/cache';

/**
 * Server Action: Assign a lead to a vendedor
 *
 * Business Rules:
 * - Lead must exist and be available (vendedor_asignado_id IS NULL)
 * - Vendedor must exist and be active (activo = true)
 * - Assignment is permanent (no reassignment allowed)
 * - Race condition protection: only first request succeeds
 *
 * @param leadId - UUID of the lead to assign
 * @param vendedorId - UUID of the vendedor to assign to
 * @returns Success/error response with vendedor name on success
 */
export async function assignLeadToVendedor(leadId: string, vendedorId: string) {
  try {
    // Step 1: Validate vendedor exists and is active
    const { data: vendedor, error: vendedorError } = await supabase
      .from('vendedores')
      .select('id, nombre, activo')
      .eq('id', vendedorId)
      .single();

    if (vendedorError || !vendedor) {
      console.error('Vendedor not found:', vendedorError);
      return {
        success: false,
        message: 'Vendedor no encontrado',
      };
    }

    if (!vendedor.activo) {
      return {
        success: false,
        message: 'Vendedor no está activo',
      };
    }

    // Step 2: Check if lead exists and is available (vendedor_asignado_id IS NULL)
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, vendedor_asignado_id, nombre, telefono')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('Lead not found:', leadError);
      return {
        success: false,
        message: 'Lead no encontrado',
      };
    }

    // Race condition protection: check if already assigned
    if (lead.vendedor_asignado_id !== null) {
      return {
        success: false,
        message: 'Lead ya fue tomado por otro vendedor',
      };
    }

    // Step 3: Assign lead to vendedor (atomic update with RLS protection)
    // Using UPDATE with WHERE condition to ensure lead is still available
    const { error: updateError } = await supabase
      .from('leads')
      .update({ vendedor_asignado_id: vendedorId })
      .eq('id', leadId)
      .is('vendedor_asignado_id', null); // Critical: only update if still NULL

    if (updateError) {
      console.error('Error assigning lead:', updateError);
      return {
        success: false,
        message: 'Error al asignar lead. Por favor intenta nuevamente.',
      };
    }

    // Step 4: Verify assignment was successful (double-check for race conditions)
    const { data: verifiedLead, error: verifyError } = await supabase
      .from('leads')
      .select('vendedor_asignado_id')
      .eq('id', leadId)
      .single();

    if (verifyError || !verifiedLead || verifiedLead.vendedor_asignado_id !== vendedorId) {
      console.error('Assignment verification failed:', verifyError);
      return {
        success: false,
        message: 'Lead ya fue tomado por otro vendedor (verificación fallida)',
      };
    }

    // Step 5: Revalidate page to refresh data
    revalidatePath('/operativo');

    // Success
    return {
      success: true,
      vendedorNombre: vendedor.nombre,
      leadNombre: lead.nombre || lead.telefono,
    };
  } catch (error) {
    console.error('Unexpected error in assignLeadToVendedor:', error);
    return {
      success: false,
      message: 'Error inesperado. Por favor intenta nuevamente.',
    };
  }
}
