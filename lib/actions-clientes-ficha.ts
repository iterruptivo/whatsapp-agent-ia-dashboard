'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ClienteFicha {
  id: string;
  local_id: string;
  lead_id: string | null;

  titular_nombres: string | null;
  titular_apellido_paterno: string | null;
  titular_apellido_materno: string | null;
  titular_tipo_documento: string | null;
  titular_numero_documento: string | null;
  titular_fecha_nacimiento: string | null;
  titular_lugar_nacimiento: string | null;
  titular_estado_civil: string | null;
  titular_nacionalidad: string | null;
  titular_direccion: string | null;
  titular_distrito: string | null;
  titular_provincia: string | null;
  titular_departamento: string | null;
  titular_referencia: string | null;
  titular_celular: string | null;
  titular_telefono_fijo: string | null;
  titular_email: string | null;
  titular_ocupacion: string | null;
  titular_centro_trabajo: string | null;
  titular_ruc: string | null;

  tiene_conyuge: boolean;
  conyuge_nombres: string | null;
  conyuge_apellido_paterno: string | null;
  conyuge_apellido_materno: string | null;
  conyuge_tipo_documento: string | null;
  conyuge_numero_documento: string | null;
  conyuge_fecha_nacimiento: string | null;
  conyuge_lugar_nacimiento: string | null;
  conyuge_nacionalidad: string | null;
  conyuge_ocupacion: string | null;
  conyuge_celular: string | null;
  conyuge_email: string | null;

  utm_source: string | null;
  utm_detalle: string | null;
  observaciones: string | null;

  vendedor_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClienteFichaInput {
  local_id: string;
  lead_id?: string | null;

  titular_nombres?: string | null;
  titular_apellido_paterno?: string | null;
  titular_apellido_materno?: string | null;
  titular_tipo_documento?: string | null;
  titular_numero_documento?: string | null;
  titular_fecha_nacimiento?: string | null;
  titular_lugar_nacimiento?: string | null;
  titular_estado_civil?: string | null;
  titular_nacionalidad?: string | null;
  titular_direccion?: string | null;
  titular_distrito?: string | null;
  titular_provincia?: string | null;
  titular_departamento?: string | null;
  titular_referencia?: string | null;
  titular_celular?: string | null;
  titular_telefono_fijo?: string | null;
  titular_email?: string | null;
  titular_ocupacion?: string | null;
  titular_centro_trabajo?: string | null;
  titular_ruc?: string | null;

  tiene_conyuge?: boolean;
  conyuge_nombres?: string | null;
  conyuge_apellido_paterno?: string | null;
  conyuge_apellido_materno?: string | null;
  conyuge_tipo_documento?: string | null;
  conyuge_numero_documento?: string | null;
  conyuge_fecha_nacimiento?: string | null;
  conyuge_lugar_nacimiento?: string | null;
  conyuge_nacionalidad?: string | null;
  conyuge_ocupacion?: string | null;
  conyuge_celular?: string | null;
  conyuge_email?: string | null;

  utm_source?: string | null;
  utm_detalle?: string | null;
  observaciones?: string | null;

  vendedor_id?: string | null;
}

// ============================================================================
// QUERIES
// ============================================================================

export async function getClienteFichaByLocalId(localId: string): Promise<ClienteFicha | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  try {
    const { data, error } = await supabase
      .from('clientes_ficha')
      .select('*')
      .eq('local_id', localId)
      .maybeSingle();

    if (error) {
      console.error('[CLIENTES_FICHA] Error obteniendo ficha:', error);
      return null;
    }

    return data as ClienteFicha | null;
  } catch (error) {
    console.error('[CLIENTES_FICHA] Error in getClienteFichaByLocalId:', error);
    return null;
  }
}

// ============================================================================
// MUTATIONS
// ============================================================================

export async function upsertClienteFicha(input: ClienteFichaInput): Promise<{ success: boolean; message: string; data?: ClienteFicha }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'No autenticado' };
    }

    const existing = await getClienteFichaByLocalId(input.local_id);

    if (existing) {
      const { data, error } = await supabase
        .from('clientes_ficha')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq('local_id', input.local_id)
        .select()
        .single();

      if (error) {
        console.error('[CLIENTES_FICHA] Error actualizando:', error);
        return { success: false, message: 'Error al actualizar ficha' };
      }

      return { success: true, message: 'Ficha actualizada', data: data as ClienteFicha };
    } else {
      const { data, error } = await supabase
        .from('clientes_ficha')
        .insert(input)
        .select()
        .single();

      if (error) {
        console.error('[CLIENTES_FICHA] Error insertando:', error);
        return { success: false, message: 'Error al crear ficha' };
      }

      return { success: true, message: 'Ficha creada', data: data as ClienteFicha };
    }
  } catch (error) {
    console.error('[CLIENTES_FICHA] Error in upsertClienteFicha:', error);
    return { success: false, message: 'Error inesperado' };
  }
}
