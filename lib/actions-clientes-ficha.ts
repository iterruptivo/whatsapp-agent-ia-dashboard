'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { syncDepositosFromFicha } from './actions-depositos-ficha';

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
    hora: string | null;
    banco: string | null;
    numero_operacion: string | null;
    depositante: string | null;
    confianza: number;
    uploaded_at: string | null; // Fecha/hora en que se subió a la plataforma
  }> | null;

  // Boletas vinculadas a comprobantes
  boletas_vinculadas: Array<{
    voucher_index: number;
    boleta_url: string;
    numero_boleta: string;
    tipo: 'boleta' | 'factura';
    uploaded_at: string;
    uploaded_by_id: string;
    uploaded_by_nombre: string;
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
    hora?: string | null;
    banco: string | null;
    numero_operacion: string | null;
    depositante: string | null;
    confianza: number;
    uploaded_at?: string | null; // Fecha/hora en que se subió a la plataforma
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

    // ========================================================================
    // VALIDACIONES: Verificar que el local existe y no tiene otra ficha
    // ========================================================================

    // 1. Verificar que el local existe
    const { data: localExiste, error: errorLocal } = await supabase
      .from('locales')
      .select('id, codigo')
      .eq('id', input.local_id)
      .maybeSingle();

    if (errorLocal) {
      console.error('[CLIENTES_FICHA] Error verificando local:', errorLocal);
      return {
        success: false,
        message: 'Error al verificar el local'
      };
    }

    if (!localExiste) {
      return {
        success: false,
        message: `El local con ID ${input.local_id} no existe`
      };
    }

    // 2. Verificar que el local no tiene otra ficha (excepto si es la misma)
    const { data: fichaExistente } = await supabase
      .from('clientes_ficha')
      .select('id, local_id')
      .eq('local_id', input.local_id)
      .maybeSingle();

    // Si existe ficha para este local Y no es la que estamos editando
    if (fichaExistente && fichaExistente.id !== existing?.id) {
      return {
        success: false,
        message: `El local ${localExiste.codigo} ya tiene una ficha de inscripción asignada`
      };
    }

    // ========================================================================

    let fichaData: ClienteFicha;

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

      fichaData = data as ClienteFicha;
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

      fichaData = data as ClienteFicha;
    }

    // Sincronizar depósitos a tabla depositos_ficha (escritura dual)
    if (input.comprobante_deposito_ocr && input.comprobante_deposito_ocr.length > 0) {
      await syncDepositosFromFicha({
        fichaId: fichaData.id,
        localId: input.local_id,
        depositos: input.comprobante_deposito_ocr,
        fotos: input.comprobante_deposito_fotos || [],
      });
    }

    return {
      success: true,
      message: existing ? 'Ficha actualizada' : 'Ficha creada',
      data: fichaData,
    };
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

// ============================================================================
// HELPER: Obtener abonos de control_pagos por local_id
// ============================================================================

export interface AbonoControlPago {
  id: string;
  monto: number;
  moneda: 'USD' | 'PEN';
  metodo_pago: string | null;
  fecha_abono: string;
  banco: string | null;
  numero_operacion: string | null;
  comprobante_url: string | null;
  notas: string | null;
  created_at: string;
  // Info del pago asociado
  pago_concepto: string | null;
  pago_numero_cuota: number | null;
}

/**
 * Obtiene todos los abonos de control_pagos para un local específico
 * Flujo: local_id → control_pagos → pagos_local → abonos_pago
 */
export async function getAbonosByLocalId(localId: string): Promise<AbonoControlPago[]> {
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
    // Primero obtener el control_pago del local
    const { data: controlPago, error: cpError } = await supabase
      .from('control_pagos')
      .select('id')
      .eq('local_id', localId)
      .maybeSingle();

    if (cpError || !controlPago) {
      console.log('[CLIENTES_FICHA] No hay control_pago para local:', localId);
      return [];
    }

    // Obtener todos los pagos_local del control_pago
    const { data: pagosLocal, error: plError } = await supabase
      .from('pagos_local')
      .select('id, concepto, numero_cuota')
      .eq('control_pago_id', controlPago.id);

    if (plError || !pagosLocal || pagosLocal.length === 0) {
      console.log('[CLIENTES_FICHA] No hay pagos_local para control_pago:', controlPago.id);
      return [];
    }

    const pagoIds = pagosLocal.map(p => p.id);

    // Crear mapa de pago_id -> info del pago
    const pagoInfoMap = new Map(
      pagosLocal.map(p => [p.id, { concepto: p.concepto, numero_cuota: p.numero_cuota }])
    );

    // Obtener todos los abonos de esos pagos
    const { data: abonos, error: abonosError } = await supabase
      .from('abonos_pago')
      .select('*')
      .in('pago_id', pagoIds)
      .order('fecha_abono', { ascending: false });

    if (abonosError) {
      console.error('[CLIENTES_FICHA] Error obteniendo abonos:', abonosError);
      return [];
    }

    if (!abonos || abonos.length === 0) {
      return [];
    }

    // Mapear a la estructura esperada
    const result: AbonoControlPago[] = abonos.map((abono: any) => {
      const pagoInfo = pagoInfoMap.get(abono.pago_id);
      return {
        id: abono.id,
        monto: Number(abono.monto),
        moneda: abono.moneda || 'USD',
        metodo_pago: abono.metodo_pago,
        fecha_abono: abono.fecha_abono,
        banco: abono.banco,
        numero_operacion: abono.numero_operacion,
        comprobante_url: abono.comprobante_url,
        notas: abono.notas,
        created_at: abono.created_at,
        pago_concepto: pagoInfo?.concepto || null,
        pago_numero_cuota: pagoInfo?.numero_cuota || null,
      };
    });

    return result;
  } catch (error) {
    console.error('[CLIENTES_FICHA] Error in getAbonosByLocalId:', error);
    return [];
  }
}
