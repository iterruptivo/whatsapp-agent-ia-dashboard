'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ============================================================================
// INTERFACES
// ============================================================================

export interface Copropietario {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  tipo_documento: string;
  numero_documento: string;
  telefono: string;
  email: string;
  parentesco: string;
}

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
  titular_genero: string | null;
  titular_edad: string | null;
  titular_ingresos_salariales: string | null;
  titular_nivel_estudios: string | null;
  titular_tipo_trabajador: string | null;
  titular_puesto_trabajo: string | null;
  titular_cantidad_hijos: string | null;
  titular_cuenta_propiedades: string | null;
  titular_cuenta_tarjeta_credito: string | null;
  titular_motivo_compra: string | null;

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
  conyuge_genero: string | null;
  conyuge_direccion: string | null;
  conyuge_distrito: string | null;
  conyuge_provincia: string | null;
  conyuge_departamento: string | null;
  conyuge_referencia: string | null;

  copropietarios: Copropietario[] | null;

  // UIN (Unidad de Inscripción)
  rubro: string | null;
  modalidad_pago: string | null;
  tipo_cambio: number | null;
  monto_separacion_usd: number | null;
  fecha_separacion: string | null;
  porcentaje_inicial: number | null;
  cuota_inicial_usd: number | null;
  inicial_restante_usd: number | null;
  saldo_financiar_usd: number | null;
  numero_cuotas: number | null;
  cuota_mensual_usd: number | null;
  tea: number | null;
  entidad_bancaria: string | null;
  fecha_inicio_pago: string | null;
  compromiso_pago: string | null;

  utm_source: string | null;
  utm_detalle: string | null;
  observaciones: string | null;

  // Documentos adjuntos
  dni_fotos: string[] | null;
  comprobante_deposito_fotos: string[] | null;
  comprobante_deposito_ocr: Array<{
    monto: number | null;
    moneda: 'PEN' | 'USD' | null;
    fecha: string | null;
    banco: string | null;
    numero_operacion: string | null;
    depositante: string | null;
    confianza: number;
  }> | null;

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
  titular_genero?: string | null;
  titular_edad?: string | null;
  titular_ingresos_salariales?: string | null;
  titular_nivel_estudios?: string | null;
  titular_tipo_trabajador?: string | null;
  titular_puesto_trabajo?: string | null;
  titular_cantidad_hijos?: string | null;
  titular_cuenta_propiedades?: string | null;
  titular_cuenta_tarjeta_credito?: string | null;
  titular_motivo_compra?: string | null;

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
  conyuge_genero?: string | null;
  conyuge_direccion?: string | null;
  conyuge_distrito?: string | null;
  conyuge_provincia?: string | null;
  conyuge_departamento?: string | null;
  conyuge_referencia?: string | null;

  copropietarios?: Copropietario[] | null;

  // UIN (Unidad de Inscripción)
  rubro?: string | null;
  modalidad_pago?: string | null;
  tipo_cambio?: number | null;
  monto_separacion_usd?: number | null;
  fecha_separacion?: string | null;
  porcentaje_inicial?: number | null;
  cuota_inicial_usd?: number | null;
  inicial_restante_usd?: number | null;
  saldo_financiar_usd?: number | null;
  numero_cuotas?: number | null;
  cuota_mensual_usd?: number | null;
  tea?: number | null;
  entidad_bancaria?: string | null;
  fecha_inicio_pago?: string | null;
  compromiso_pago?: string | null;

  utm_source?: string | null;
  utm_detalle?: string | null;
  observaciones?: string | null;

  // Documentos adjuntos
  dni_fotos?: string[] | null;
  comprobante_deposito_fotos?: string[] | null;
  comprobante_deposito_ocr?: Array<{
    monto: number | null;
    moneda: 'PEN' | 'USD' | null;
    fecha: string | null;
    banco: string | null;
    numero_operacion: string | null;
    depositante: string | null;
    confianza: number;
  }> | null;

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

// ============================================================================
// HELPER: Obtener datos del usuario (asesor) por ID
// ============================================================================

export interface UsuarioAsesor {
  id: string;
  nombre: string;
  email: string;
}

export async function getUsuarioById(usuarioId: string): Promise<UsuarioAsesor | null> {
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
      .from('usuarios')
      .select('id, nombre, email')
      .eq('id', usuarioId)
      .maybeSingle();

    if (error) {
      console.error('[CLIENTES_FICHA] Error obteniendo usuario:', error);
      return null;
    }

    return data as UsuarioAsesor | null;
  } catch (error) {
    console.error('[CLIENTES_FICHA] Error in getUsuarioById:', error);
    return null;
  }
}
