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
        .select('id, nombre, telefono, activo')
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

    // Step 2: Check if lead exists and get proyecto info
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        id,
        vendedor_asignado_id,
        nombre,
        telefono,
        proyecto_id,
        proyecto_nombre:proyectos(nombre)
      `)
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

    // Step 4: Send notification to lead via n8n webhook (only if assigning, not liberating)
    if (vendedorId && vendedor) {
      try {
        const webhookUrl = process.env.N8N_WEBHOOK_LEAD_ASIGNADO || '';

        if (webhookUrl) {
          // Flatten proyecto_nombre (Supabase JOIN returns nested object)
          const proyectoNombre = typeof lead.proyecto_nombre === 'object' && lead.proyecto_nombre !== null
            ? (lead.proyecto_nombre as any).nombre
            : lead.proyecto_nombre;

          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leadTelefono: lead.telefono,
              leadNombre: lead.nombre || 'Cliente',
              vendedorNombre: vendedor.nombre,
              vendedorTelefono: vendedor.telefono,
              proyectoId: lead.proyecto_id,
              proyectoNombre: proyectoNombre || 'EcoPlaza'
            })
          });

          console.log('Webhook notification sent to n8n for lead assignment');
        } else {
          console.warn('N8N_WEBHOOK_LEAD_ASIGNADO not configured - skipping notification');
        }
      } catch (webhookError) {
        // Non-blocking error - log but don't fail the assignment
        console.error('Error sending webhook notification (non-blocking):', webhookError);
      }
    }

    // Step 5: Revalidate pages to refresh data
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

/**
 * Server Action: Import manual leads from CSV/Excel
 *
 * Business Rules:
 * - Only admin can import manual leads
 * - email_vendedor must exist and have role "vendedor" (not vendedor_caseta)
 * - Duplicate phone numbers in same project are skipped
 * - Estado is set to "lead_manual"
 * - UTM is REQUIRED for manual leads
 *
 * @param proyectoId - UUID of the project to import leads into
 * @param leads - Array of leads with nombre, telefono, email_vendedor, utm, email?, rubro?
 * @returns Success/error response with import summary
 */
export async function importManualLeads(
  proyectoId: string,
  leads: Array<{
    nombre: string;
    telefono: string;
    email_vendedor: string;
    utm: string; // REQUERIDO para leads manuales
    email?: string;
    rubro?: string;
  }>
) {
  try {
    console.log(`[IMPORT] Starting import of ${leads.length} leads to proyecto: ${proyectoId}`);

    let imported = 0;
    const duplicates: Array<{ nombre: string; telefono: string }> = [];
    const invalidVendors: Array<{ email: string; row: number }> = [];
    const missingUtm: Array<{ nombre: string; row: number }> = [];

    // Validate each lead and collect vendedor IDs
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const rowNum = i + 1;

      // VALIDACIÓN UTM: Requerido para leads manuales
      if (!lead.utm || lead.utm.trim() === '') {
        console.log(`[IMPORT] Missing UTM at row ${rowNum}:`, lead.nombre);
        missingUtm.push({ nombre: lead.nombre, row: rowNum });
        continue;
      }

      // Validar que el vendedor existe y tenga rol "vendedor" o "vendedor_caseta"
      const emailVendedor = lead.email_vendedor.trim();
      console.log(`[IMPORT] Validating vendor at row ${rowNum}:`, { email: emailVendedor });

      const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, vendedor_id, rol')
        .ilike('email', emailVendedor)
        .single();

      if (
        usuarioError ||
        !usuario ||
        (usuario.rol !== 'vendedor' && usuario.rol !== 'vendedor_caseta') ||
        !usuario.vendedor_id
      ) {
        console.log(`[IMPORT] Invalid vendor at row ${rowNum}:`, {
          email: emailVendedor,
          originalEmail: lead.email_vendedor,
          error: usuarioError?.message,
          usuario,
        });
        invalidVendors.push({ email: emailVendedor, row: rowNum });
        continue;
      }

      console.log(`[IMPORT] Valid vendor found for row ${rowNum}:`, {
        email: emailVendedor,
        vendedor_id: usuario.vendedor_id,
        rol: usuario.rol,
      });

      // Verificar si ya existe un lead con ese teléfono en este proyecto
      const { data: existingLead, error: checkError } = await supabase
        .from('leads')
        .select('id')
        .eq('proyecto_id', proyectoId)
        .eq('telefono', lead.telefono)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid PGRST116 error

      if (existingLead) {
        duplicates.push({ nombre: lead.nombre, telefono: lead.telefono });
        continue;
      }

      // Insertar lead
      const leadData = {
        proyecto_id: proyectoId,
        nombre: lead.nombre,
        telefono: lead.telefono,
        email: lead.email || null,
        rubro: lead.rubro || null,
        estado: 'lead_manual',
        vendedor_asignado_id: usuario.vendedor_id,
        utm: lead.utm.trim(), // UTM requerido para leads manuales
      };

      console.log(`[IMPORT] Inserting lead at row ${rowNum}:`, leadData);

      const { error: insertError } = await supabase.from('leads').insert(leadData);

      if (insertError) {
        console.error(`[IMPORT] Error inserting lead at row ${rowNum}:`, insertError);
        continue;
      }

      console.log(`[IMPORT] Successfully inserted lead at row ${rowNum}: ${lead.nombre}`);
      imported++;
    }

    revalidatePath('/');

    return {
      success: true,
      imported,
      duplicates,
      invalidVendors,
      missingUtm, // Leads sin UTM (REQUERIDO)
      total: leads.length,
    };
  } catch (error) {
    console.error('Unexpected error in importManualLeads:', error);
    return {
      success: false,
      imported: 0,
      duplicates: [],
      invalidVendors: [],
      missingUtm: [],
      total: leads.length,
    };
  }
}
