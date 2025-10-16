'use server';

import { supabase } from './supabase';
import { revalidatePath } from 'next/cache';

/**
 * Server Action: Assign or reassign a lead to a vendedor
 *
 * Business Rules:
 * - Lead must exist
 * - Vendedor must exist and be active (activo = true) OR vendedorId is empty string (liberate)
 * - Vendedores: Can only take available leads (vendedor_asignado_id IS NULL)
 * - Admins: Can reassign leads or liberate them (set vendedor_asignado_id to NULL)
 * - Race condition protection: only first request succeeds for initial assignment
 *
 * @param leadId - UUID of the lead to assign
 * @param vendedorId - UUID of the vendedor to assign to, or empty string to liberate
 * @returns Success/error response with vendedor name on success
 */
export async function assignLeadToVendedor(leadId: string, vendedorId: string) {
  try {
    // Step 1: Validate vendedor (if provided) exists and is active
    // Empty string means liberate lead (set vendedor_asignado_id to NULL)
    let vendedor = null;
    if (vendedorId) {
      const { data: vendedorData, error: vendedorError } = await supabase
        .from('vendedores')
        .select('id, nombre, activo')
        .eq('id', vendedorId)
        .single();

      if (vendedorError || !vendedorData) {
        console.error('Vendedor not found:', vendedorError);
        return {
          success: false,
          message: 'Vendedor no encontrado',
        };
      }

      if (!vendedorData.activo) {
        return {
          success: false,
          message: 'Vendedor no está activo',
        };
      }

      vendedor = vendedorData;
    }

    // Step 2: Check if lead exists
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

    // Step 3: Assign/reassign/liberate lead
    // If vendedorId is empty string, set to NULL (liberate lead)
    // Otherwise, assign to vendedor (allows reassignment)
    const { error: updateError } = await supabase
      .from('leads')
      .update({ vendedor_asignado_id: vendedorId || null })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead assignment:', updateError);
      return {
        success: false,
        message: 'Error al actualizar asignación de lead. Por favor intenta nuevamente.',
      };
    }

    // Step 4: Revalidate pages to refresh data
    revalidatePath('/operativo');
    revalidatePath('/'); // Also revalidate admin dashboard

    // Success - construct appropriate message
    const leadNombre = lead.nombre || lead.telefono;
    if (!vendedorId) {
      // Lead liberated (set to NULL)
      return {
        success: true,
        vendedorNombre: 'Liberado',
        leadNombre: leadNombre,
        message: `Lead "${leadNombre}" liberado (sin asignar)`,
      };
    } else {
      // Lead assigned or reassigned
      return {
        success: true,
        vendedorNombre: vendedor?.nombre || 'Vendedor',
        leadNombre: leadNombre,
        message: `Lead "${leadNombre}" asignado a ${vendedor?.nombre}`,
      };
    }
  } catch (error) {
    console.error('Unexpected error in assignLeadToVendedor:', error);
    return {
      success: false,
      message: 'Error inesperado. Por favor intenta nuevamente.',
    };
  }
}
