'use server';

/**
 * Server Actions para el sistema de historial de leads (Audit Trail)
 * Solo accesible para superadmin y admin
 * Sesión 107 - Sistema de Auditoría de Leads
 *
 * NOTA: Los helpers de formateo están en lib/leads-historial-helpers.ts
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper para crear cliente Supabase con contexto de servidor
async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', options);
        },
      },
    }
  );
}

// ============================================================================
// TYPES
// ============================================================================

export interface LeadHistorialEntry {
  id: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE';
  campo: string | null;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  usuario_nombre: string | null;
  origen: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface GetLeadHistorialResult {
  success: boolean;
  data: LeadHistorialEntry[];
  error?: string;
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Obtiene el historial de cambios de un lead
 * Solo accesible para superadmin y admin
 */
export async function getLeadHistorial(
  leadId: string,
  limit: number = 50
): Promise<GetLeadHistorialResult> {
  try {
    const supabase = await createSupabaseServer();

    // Verificar autenticación y rol
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, data: [], error: 'No autenticado' };
    }

    // Verificar que el usuario sea superadmin o admin
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return { success: false, data: [], error: 'Usuario no encontrado' };
    }

    if (userData.rol !== 'superadmin' && userData.rol !== 'admin') {
      return { success: false, data: [], error: 'Acceso denegado' };
    }

    // Consultar historial
    const { data, error } = await supabase
      .from('leads_historial')
      .select('id, accion, campo, valor_anterior, valor_nuevo, usuario_nombre, origen, metadata, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getLeadHistorial] Error:', error);
      return { success: false, data: [], error: error.message };
    }

    return {
      success: true,
      data: (data || []) as LeadHistorialEntry[],
    };
  } catch (error: any) {
    console.error('[getLeadHistorial] Error inesperado:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Registra un cambio manualmente en el historial
 * Útil para operaciones especiales como liberación masiva
 */
export async function registrarCambioHistorial(params: {
  leadId: string;
  campo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
  usuarioId?: string;
  usuarioNombre?: string;
  origen?: string;
  metadata?: Record<string, any>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServer();

    const { error } = await supabase.from('leads_historial').insert({
      lead_id: params.leadId,
      accion: 'UPDATE',
      campo: params.campo,
      valor_anterior: params.valorAnterior,
      valor_nuevo: params.valorNuevo,
      usuario_id: params.usuarioId || null,
      usuario_nombre: params.usuarioNombre || 'Sistema',
      origen: params.origen || 'sistema',
      metadata: params.metadata || {},
    });

    if (error) {
      console.error('[registrarCambioHistorial] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[registrarCambioHistorial] Error inesperado:', error);
    return { success: false, error: error.message };
  }
}
