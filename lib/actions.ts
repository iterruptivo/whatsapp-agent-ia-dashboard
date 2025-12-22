'use server';

import { supabase } from './supabase';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
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
    phoneValidation?: {
      isValid: boolean;
      error?: string;
      country?: string;
    };
  }>
) {
  // Dynamic import to avoid issues with server-side rendering
  const { validatePhoneNumber } = await import('@/lib/utils/phone-validation');

  try {
    // Create server-side Supabase client with cookies (authenticated role)
    const cookieStore = await cookies();
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          }
        }
      }
    );

    let imported = 0;
    const duplicates: Array<{ nombre: string; telefono: string }> = [];
    const invalidVendors: Array<{ email: string; row: number; reason?: string }> = [];
    const missingUtm: Array<{ nombre: string; row: number }> = [];
    const invalidPhones: Array<{ nombre: string; telefono: string; row: number; reason: string }> = [];

    // Validate each lead and collect vendedor IDs
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const rowNum = i + 1;

      // VALIDACIÓN TELÉFONO: Debe tener código de país válido (doble validación backend)
      const phoneValidation = validatePhoneNumber(lead.telefono);
      if (!phoneValidation.isValid) {
        invalidPhones.push({
          nombre: lead.nombre,
          telefono: lead.telefono,
          row: rowNum,
          reason: phoneValidation.error || 'Teléfono inválido',
        });
        continue;
      }

      // VALIDACIÓN UTM: Requerido para leads manuales
      if (!lead.utm || lead.utm.trim() === '') {
        missingUtm.push({ nombre: lead.nombre, row: rowNum });
        continue;
      }

      // Validar que el vendedor existe y tenga rol "vendedor" o "vendedor_caseta"
      // Use server client with cookies (authenticated role) - RLS allows access
      const { data: usuarios, error: usuarioError } = await supabaseServer
        .from('usuarios')
        .select('id, vendedor_id, rol')
        .eq('email', lead.email_vendedor)
        .limit(1);

      const usuario = usuarios?.[0];

      // SESIÓN 74: Agregar 'coordinador' a roles válidos para importar leads
      if (
        usuarioError ||
        !usuario ||
        (usuario.rol !== 'vendedor' && usuario.rol !== 'vendedor_caseta' && usuario.rol !== 'coordinador') ||
        !usuario.vendedor_id
      ) {
        // Determinar razón específica del fallo
        let failReason = 'desconocido';
        if (usuarioError) {
          failReason = `Error DB: ${usuarioError.message}`;
        } else if (!usuario) {
          failReason = 'Usuario no existe en BD';
        } else if (usuario.rol !== 'vendedor' && usuario.rol !== 'vendedor_caseta' && usuario.rol !== 'coordinador') {
          failReason = `Rol inválido: ${usuario.rol}`;
        } else if (!usuario.vendedor_id) {
          failReason = 'Sin vendedor_id';
        }

        console.error(`[IMPORT] Invalid vendor at row ${rowNum}:`, {
          email: lead.email_vendedor,
          reason: failReason,
        });
        invalidVendors.push({ email: lead.email_vendedor, row: rowNum, reason: failReason });
        continue;
      }

      // Verificar si ya existe un lead con ese teléfono en este proyecto
      // Usar .limit(1) en vez de .maybeSingle() para evitar PGRST116 cuando hay duplicados
      const { data: existingLeads, error: checkError } = await supabase
        .from('leads')
        .select('id')
        .eq('proyecto_id', proyectoId)
        .eq('telefono', lead.telefono)
        .limit(1);

      if (existingLeads && existingLeads.length > 0) {
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

      const { error: insertError } = await supabase.from('leads').insert(leadData);

      if (insertError) {
        console.error(`[IMPORT] Error inserting lead at row ${rowNum}:`, insertError);
        continue;
      }

      imported++;
    }

    revalidatePath('/');

    return {
      success: true,
      imported,
      duplicates,
      invalidVendors,
      missingUtm, // Leads sin UTM (REQUERIDO)
      invalidPhones, // Leads sin código de país válido
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
      invalidPhones: [],
      total: leads.length,
    };
  }
}

/**
 * Server Action: Create a single manual lead (from vinculación in NARANJA modal)
 *
 * Business Rules:
 * - Creates lead with estado "lead_manual"
 * - asistio = true (since this is from local vinculación)
 * - Assigned to vendedor who creates it (vendedorId)
 * - Other fields (email, rubro, etc.) are NULL
 *
 * @param nombre - Name of the lead
 * @param telefono - Phone number (should include country code)
 * @param proyectoId - UUID of the project
 * @param vendedorId - UUID of the vendedor creating the lead
 * @returns Success/error response with leadId on success
 */
export async function createManualLead(
  nombre: string,
  telefono: string,
  proyectoId: string,
  vendedorId: string
) {
  try {
    // Validate required fields
    if (!nombre?.trim()) {
      return {
        success: false,
        message: 'El nombre es requerido',
      };
    }

    if (!telefono?.trim()) {
      return {
        success: false,
        message: 'El teléfono es requerido',
      };
    }

    if (!proyectoId) {
      return {
        success: false,
        message: 'El proyecto es requerido',
      };
    }

    if (!vendedorId) {
      return {
        success: false,
        message: 'El vendedor es requerido',
      };
    }

    // Check if lead with this phone already exists IN THIS PROJECT
    // SESIÓN 56: Validación por proyecto (mismo teléfono puede existir en diferentes proyectos)
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, nombre, telefono')
      .eq('telefono', telefono.trim())
      .eq('proyecto_id', proyectoId)
      .limit(1);

    if (existingLead && existingLead.length > 0) {
      return {
        success: false,
        message: `Ya existe un lead con el teléfono ${telefono}`,
        leadId: existingLead[0].id,
      };
    }

    // Validate proyecto exists
    const { data: proyecto, error: proyectoError } = await supabase
      .from('proyectos')
      .select('id, nombre')
      .eq('id', proyectoId)
      .single();

    if (proyectoError || !proyecto) {
      return {
        success: false,
        message: 'Proyecto no encontrado',
      };
    }

    // Validate vendedor exists
    const { data: vendedor, error: vendedorError } = await supabase
      .from('vendedores')
      .select('id, nombre')
      .eq('id', vendedorId)
      .single();

    if (vendedorError || !vendedor) {
      return {
        success: false,
        message: 'Vendedor no encontrado',
      };
    }

    // Create the lead
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        proyecto_id: proyectoId,
        vendedor_asignado_id: vendedorId,
        estado: 'lead_manual',
        asistio: true,
        utm: 'vinculacion_manual',
        email: null,
        rubro: null,
        horario_visita: null,
        horario_visita_timestamp: null,
        estado_al_notificar: null,
        historial_conversacion: null,
        historial_reciente: null,
        resumen_historial: null,
        ultimo_mensaje: null,
        intentos_bot: 0,
        notificacion_enviada: false,
      })
      .select('id, nombre, telefono')
      .single();

    if (insertError) {
      console.error('Error creating manual lead:', insertError);
      return {
        success: false,
        message: 'Error al crear el lead',
      };
    }

    revalidatePath('/');
    revalidatePath('/locales');

    return {
      success: true,
      message: `Lead "${newLead.nombre}" creado correctamente`,
      leadId: newLead.id,
    };
  } catch (error) {
    console.error('Unexpected error in createManualLead:', error);
    return {
      success: false,
      message: 'Error inesperado al crear el lead',
    };
  }
}

/**
 * Server Action: Registrar visita sin local (visitante de proyecto sin interés en local específico)
 *
 * Business Rules:
 * - Si el lead existe (por teléfono): actualizar asistio = true
 * - Si el lead NO existe: crear con utm = "visita_proyecto", asistio = true
 * - NO crear duplicados (mismo teléfono)
 * - Accesible para todos los roles (admin, jefe_ventas, vendedor, vendedor_caseta)
 *
 * @param telefono - Phone number (should include country code)
 * @param nombre - Name of the visitor (solo si es nuevo lead)
 * @param proyectoId - UUID of the project (solo si es nuevo lead)
 * @param vendedorId - UUID of the vendedor registering the visit
 * @returns Success/error response
 */
export async function registrarVisitaSinLocal(
  telefono: string,
  nombre: string,
  proyectoId: string,
  vendedorId: string | null
) {
  try {
    // Validate required fields
    if (!telefono?.trim()) {
      return {
        success: false,
        message: 'El teléfono es requerido',
      };
    }

    // Validar vendedor solo si viene (admin/jefe_ventas pueden crear sin vendedor)
    // vendedor/vendedor_caseta siempre tendrán vendedor_id

    // PASO 1: Verificar si el lead ya existe por teléfono EN ESTE PROYECTO
    // SESIÓN 56: Validación por proyecto (mismo teléfono puede existir en diferentes proyectos)
    const { data: existingLead, error: checkError } = await supabase
      .from('leads')
      .select('id, nombre, email, proyecto_id, asistio')
      .eq('telefono', telefono.trim())
      .eq('proyecto_id', proyectoId)
      .limit(1)
      .single();

    // CASO A: Lead EXISTE → Actualizar asistio = true
    if (existingLead && !checkError) {
      const { error: updateError } = await supabase
        .from('leads')
        .update({ asistio: true })
        .eq('id', existingLead.id);

      if (updateError) {
        console.error('Error updating asistio:', updateError);
        return {
          success: false,
          message: 'Error al actualizar asistencia del lead',
        };
      }

      revalidatePath('/locales');

      return {
        success: true,
        message: `Lead "${existingLead.nombre}" actualizado. Campo "Asistió" marcado como "Sí"`,
        leadId: existingLead.id,
        leadExistia: true,
      };
    }

    // CASO B: Lead NO EXISTE → Crear nuevo
    if (!nombre?.trim()) {
      return {
        success: false,
        message: 'El nombre es requerido para crear un nuevo lead',
      };
    }

    if (!proyectoId) {
      return {
        success: false,
        message: 'El proyecto es requerido para crear un nuevo lead',
      };
    }

    // Validar que el proyecto existe
    const { data: proyecto, error: proyectoError } = await supabase
      .from('proyectos')
      .select('id, nombre')
      .eq('id', proyectoId)
      .single();

    if (proyectoError || !proyecto) {
      return {
        success: false,
        message: 'Proyecto no encontrado',
      };
    }

    // Validar que el vendedor existe (solo si vendedorId viene)
    if (vendedorId) {
      const { data: vendedor, error: vendedorError } = await supabase
        .from('vendedores')
        .select('id, nombre')
        .eq('id', vendedorId)
        .single();

      if (vendedorError || !vendedor) {
        return {
          success: false,
          message: 'Vendedor no encontrado',
        };
      }
    }

    // Crear el nuevo lead con utm = "visita_proyecto" y asistio = true
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        proyecto_id: proyectoId,
        vendedor_asignado_id: vendedorId,
        estado: 'lead_manual',
        asistio: true,
        utm: 'visita_proyecto', // ✅ Identificador especial para visitas sin local
        email: null,
        rubro: null,
        horario_visita: null,
        horario_visita_timestamp: null,
        estado_al_notificar: null,
        historial_conversacion: null,
        historial_reciente: null,
        resumen_historial: null,
        ultimo_mensaje: null,
        intentos_bot: 0,
        notificacion_enviada: false,
      })
      .select('id, nombre, telefono')
      .single();

    if (insertError) {
      console.error('Error creating lead (visita sin local):', insertError);
      console.error('Insert data was:', {
        telefono: telefono.trim(),
        nombre: nombre.trim(),
        proyectoId,
        vendedorId,
      });

      // SESIÓN 56: Detectar si es error de constraint UNIQUE en telefono
      if (insertError.code === '23505') {
        // Si el constraint violado es en telefono, dar mensaje más claro
        if (insertError.message?.includes('telefono') || insertError.message?.includes('leads_telefono')) {
          return {
            success: false,
            message: 'Este teléfono ya existe en la base de datos. Contacte al administrador para actualizar el constraint de la BD.',
          };
        }
      }

      return {
        success: false,
        message: 'Error al crear el lead',
      };
    }

    revalidatePath('/locales');

    return {
      success: true,
      message: `Lead "${newLead.nombre}" creado correctamente (visita sin local)`,
      leadId: newLead.id,
      leadExistia: false,
    };
  } catch (error) {
    console.error('Unexpected error in registrarVisitaSinLocal:', error);
    return {
      success: false,
      message: 'Error inesperado al registrar visita',
    };
  }
}
