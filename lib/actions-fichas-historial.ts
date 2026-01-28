'use server';

/**
 * Server Actions para el sistema de historial de fichas (Audit Trail)
 * Sistema de Auditoría de Fichas de Inscripción
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

export interface FichaHistorialEntry {
  id: string;
  ficha_id: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE' | 'CAMBIO_TITULAR' | 'CAMBIO_LOCAL';
  campo: string | null;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  titular_anterior: Record<string, any> | null;
  titular_nuevo: Record<string, any> | null;
  local_anterior_id: string | null;
  local_anterior_codigo: string | null;
  local_nuevo_id: string | null;
  local_nuevo_codigo: string | null;
  usuario_id: string | null;
  usuario_nombre: string | null;
  usuario_rol: string | null;
  autorizado_por_nombre: string | null;
  motivo_cambio: string | null;
  origen: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface GetFichaHistorialResult {
  success: boolean;
  data: FichaHistorialEntry[];
  error?: string;
}

export interface NuevoTitularData {
  nombres: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  tipo_documento: string;
  numero_documento: string;
  celular: string;
  email?: string | null;
  fecha_nacimiento?: string | null;
  direccion?: string | null;
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
}

export interface LocalDisponible {
  id: string;
  codigo: string;
  piso: string | null;
  metraje: number | null;
  precio_base: number | null;
  estado: string;
}

// Roles permitidos para ver historial y hacer cambios
const ROLES_PERMITIDOS = [
  'superadmin',
  'admin',
  'finanzas',
  'gerencia',
  'jefe_ventas',
  'coordinador',
  'vendedor',
  'vendedor_caseta',
];

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Obtiene el historial de cambios de una ficha
 */
export async function getFichaHistorial(
  fichaId: string,
  limit: number = 50
): Promise<GetFichaHistorialResult> {
  try {
    const supabase = await createSupabaseServer();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, data: [], error: 'No autenticado' };
    }

    // Verificar que el usuario tiene rol permitido
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return { success: false, data: [], error: 'Usuario no encontrado' };
    }

    if (!ROLES_PERMITIDOS.includes(userData.rol)) {
      return { success: false, data: [], error: 'Acceso denegado' };
    }

    // Consultar historial
    const { data, error } = await supabase
      .from('fichas_historial')
      .select(`
        id,
        ficha_id,
        accion,
        campo,
        valor_anterior,
        valor_nuevo,
        titular_anterior,
        titular_nuevo,
        local_anterior_id,
        local_anterior_codigo,
        local_nuevo_id,
        local_nuevo_codigo,
        usuario_id,
        usuario_nombre,
        usuario_rol,
        autorizado_por_nombre,
        motivo_cambio,
        origen,
        metadata,
        created_at
      `)
      .eq('ficha_id', fichaId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getFichaHistorial] Error:', error);
      return { success: false, data: [], error: error.message };
    }

    return {
      success: true,
      data: (data || []) as FichaHistorialEntry[],
    };
  } catch (error: any) {
    console.error('[getFichaHistorial] Error inesperado:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Cambiar titular de una ficha con snapshot completo
 */
export async function cambiarTitularFicha(params: {
  fichaId: string;
  nuevoTitular: NuevoTitularData;
  motivo: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createSupabaseServer();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: 'No autenticado' };
    }

    // Obtener datos del usuario
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, nombre, rol')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    if (!ROLES_PERMITIDOS.includes(userData.rol)) {
      return { success: false, message: 'No tiene permisos para cambiar titularidad' };
    }

    // Validar motivo
    if (!params.motivo || params.motivo.trim().length < 10) {
      return { success: false, message: 'El motivo debe tener al menos 10 caracteres' };
    }

    // Obtener ficha actual
    const { data: fichaActual, error: fichaError } = await supabase
      .from('clientes_ficha')
      .select(`
        id,
        titular_nombres,
        titular_apellido_paterno,
        titular_apellido_materno,
        titular_tipo_documento,
        titular_numero_documento,
        titular_celular,
        titular_email,
        titular_fecha_nacimiento,
        titular_direccion,
        titular_distrito,
        titular_provincia,
        titular_departamento
      `)
      .eq('id', params.fichaId)
      .single();

    if (fichaError || !fichaActual) {
      return { success: false, message: 'Ficha no encontrada' };
    }

    // Crear snapshot del titular anterior
    const titularAnterior = {
      nombres: fichaActual.titular_nombres,
      apellido_paterno: fichaActual.titular_apellido_paterno,
      apellido_materno: fichaActual.titular_apellido_materno,
      tipo_documento: fichaActual.titular_tipo_documento,
      numero_documento: fichaActual.titular_numero_documento,
      celular: fichaActual.titular_celular,
      email: fichaActual.titular_email,
      fecha_nacimiento: fichaActual.titular_fecha_nacimiento,
      direccion: fichaActual.titular_direccion,
      distrito: fichaActual.titular_distrito,
      provincia: fichaActual.titular_provincia,
      departamento: fichaActual.titular_departamento,
    };

    // Crear snapshot del titular nuevo
    const titularNuevo = {
      nombres: params.nuevoTitular.nombres,
      apellido_paterno: params.nuevoTitular.apellido_paterno,
      apellido_materno: params.nuevoTitular.apellido_materno || null,
      tipo_documento: params.nuevoTitular.tipo_documento,
      numero_documento: params.nuevoTitular.numero_documento,
      celular: params.nuevoTitular.celular,
      email: params.nuevoTitular.email || null,
      fecha_nacimiento: params.nuevoTitular.fecha_nacimiento || null,
      direccion: params.nuevoTitular.direccion || null,
      distrito: params.nuevoTitular.distrito || null,
      provincia: params.nuevoTitular.provincia || null,
      departamento: params.nuevoTitular.departamento || null,
    };

    // Actualizar ficha con nuevos datos del titular
    const { error: updateError } = await supabase
      .from('clientes_ficha')
      .update({
        titular_nombres: titularNuevo.nombres,
        titular_apellido_paterno: titularNuevo.apellido_paterno,
        titular_apellido_materno: titularNuevo.apellido_materno,
        titular_tipo_documento: titularNuevo.tipo_documento,
        titular_numero_documento: titularNuevo.numero_documento,
        titular_celular: titularNuevo.celular,
        titular_email: titularNuevo.email,
        titular_fecha_nacimiento: titularNuevo.fecha_nacimiento,
        titular_direccion: titularNuevo.direccion,
        titular_distrito: titularNuevo.distrito,
        titular_provincia: titularNuevo.provincia,
        titular_departamento: titularNuevo.departamento,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.fichaId);

    if (updateError) {
      console.error('[cambiarTitularFicha] Error actualizando ficha:', updateError);
      return { success: false, message: 'Error al actualizar la ficha' };
    }

    // Registrar en historial con acción CAMBIO_TITULAR
    const { error: historialError } = await supabase
      .from('fichas_historial')
      .insert({
        ficha_id: params.fichaId,
        accion: 'CAMBIO_TITULAR',
        campo: null,
        valor_anterior: null,
        valor_nuevo: null,
        titular_anterior: titularAnterior,
        titular_nuevo: titularNuevo,
        usuario_id: userData.id,
        usuario_nombre: userData.nombre,
        usuario_rol: userData.rol,
        motivo_cambio: params.motivo.trim(),
        origen: 'dashboard',
        metadata: {
          documento_anterior: titularAnterior.numero_documento,
          documento_nuevo: titularNuevo.numero_documento,
        },
      });

    if (historialError) {
      console.error('[cambiarTitularFicha] Error registrando historial:', historialError);
      // No fallar si el historial falla, la ficha ya fue actualizada
    }

    return { success: true, message: 'Titularidad actualizada correctamente' };
  } catch (error: any) {
    console.error('[cambiarTitularFicha] Error inesperado:', error);
    return { success: false, message: error.message || 'Error inesperado' };
  }
}

/**
 * Cambiar local de una ficha
 */
export async function cambiarLocalFicha(params: {
  fichaId: string;
  nuevoLocalId: string;
  motivo: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createSupabaseServer();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: 'No autenticado' };
    }

    // Obtener datos del usuario
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, nombre, rol')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    if (!ROLES_PERMITIDOS.includes(userData.rol)) {
      return { success: false, message: 'No tiene permisos para cambiar local' };
    }

    // Validar motivo
    if (!params.motivo || params.motivo.trim().length < 10) {
      return { success: false, message: 'El motivo debe tener al menos 10 caracteres' };
    }

    // Obtener ficha actual con local
    const { data: fichaActual, error: fichaError } = await supabase
      .from('clientes_ficha')
      .select('id, local_id')
      .eq('id', params.fichaId)
      .single();

    if (fichaError || !fichaActual) {
      return { success: false, message: 'Ficha no encontrada' };
    }

    // Obtener código del local anterior (incluye piso)
    const { data: localAnterior, error: localAntError } = await supabase
      .from('locales')
      .select('id, codigo, piso, estado')
      .eq('id', fichaActual.local_id)
      .single();

    if (localAntError || !localAnterior) {
      return { success: false, message: 'Local anterior no encontrado' };
    }

    // Verificar que el nuevo local existe y está disponible (incluye piso)
    const { data: localNuevo, error: localNuevoError } = await supabase
      .from('locales')
      .select('id, codigo, piso, estado')
      .eq('id', params.nuevoLocalId)
      .single();

    if (localNuevoError || !localNuevo) {
      return { success: false, message: 'Nuevo local no encontrado' };
    }

    if (localNuevo.estado !== 'verde') {
      return { success: false, message: `El local ${localNuevo.codigo} no está disponible (estado: ${localNuevo.estado})` };
    }

    // Actualizar ficha con nuevo local_id
    const { error: updateFichaError } = await supabase
      .from('clientes_ficha')
      .update({
        local_id: params.nuevoLocalId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.fichaId);

    if (updateFichaError) {
      console.error('[cambiarLocalFicha] Error actualizando ficha:', updateFichaError);
      return { success: false, message: 'Error al actualizar la ficha' };
    }

    // IMPORTANTE: Actualizar depositos_ficha para que apunten al nuevo local
    // Esto es necesario para que Reporte Diario muestre el local correcto
    const { error: updateDepositosError } = await supabase
      .from('depositos_ficha')
      .update({ local_id: params.nuevoLocalId })
      .eq('ficha_id', params.fichaId);

    if (updateDepositosError) {
      console.error('[cambiarLocalFicha] Error actualizando depositos_ficha:', updateDepositosError);
      // No fallar, el cambio principal ya se hizo
    }

    // Liberar local anterior (volver a verde = disponible)
    const { error: liberarError } = await supabase
      .from('locales')
      .update({ estado: 'verde' })
      .eq('id', fichaActual.local_id);

    if (liberarError) {
      console.error('[cambiarLocalFicha] Error liberando local anterior:', liberarError);
    }

    // Ocupar nuevo local (estado naranja = tiene ficha de inscripción)
    const { error: ocuparError } = await supabase
      .from('locales')
      .update({ estado: 'naranja' })
      .eq('id', params.nuevoLocalId);

    if (ocuparError) {
      console.error('[cambiarLocalFicha] Error ocupando nuevo local:', ocuparError);
    }

    // Formatear códigos con piso si existe (formato: D-101 P3)
    const codigoAnteriorConPiso = localAnterior.piso
      ? `${localAnterior.codigo} ${localAnterior.piso}`
      : localAnterior.codigo;
    const codigoNuevoConPiso = localNuevo.piso
      ? `${localNuevo.codigo} ${localNuevo.piso}`
      : localNuevo.codigo;

    // Registrar en historial con acción CAMBIO_LOCAL
    const { error: historialError } = await supabase
      .from('fichas_historial')
      .insert({
        ficha_id: params.fichaId,
        accion: 'CAMBIO_LOCAL',
        campo: 'local_id',
        valor_anterior: codigoAnteriorConPiso,
        valor_nuevo: codigoNuevoConPiso,
        local_anterior_id: localAnterior.id,
        local_anterior_codigo: codigoAnteriorConPiso,
        local_nuevo_id: localNuevo.id,
        local_nuevo_codigo: codigoNuevoConPiso,
        usuario_id: userData.id,
        usuario_nombre: userData.nombre,
        usuario_rol: userData.rol,
        motivo_cambio: params.motivo.trim(),
        origen: 'dashboard',
        metadata: {
          estado_local_anterior: localAnterior.estado,
          piso_anterior: localAnterior.piso,
          piso_nuevo: localNuevo.piso,
        },
      });

    if (historialError) {
      console.error('[cambiarLocalFicha] Error registrando historial:', historialError);
    }

    return {
      success: true,
      message: `Local cambiado de ${codigoAnteriorConPiso} a ${codigoNuevoConPiso}`,
    };
  } catch (error: any) {
    console.error('[cambiarLocalFicha] Error inesperado:', error);
    return { success: false, message: error.message || 'Error inesperado' };
  }
}

/**
 * Obtener locales disponibles de un proyecto
 */
export async function getLocalesDisponiblesByProyecto(
  proyectoId: string,
  excludeLocalId?: string
): Promise<{ success: boolean; data: LocalDisponible[]; error?: string }> {
  try {
    const supabase = await createSupabaseServer();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, data: [], error: 'No autenticado' };
    }

    // Consultar locales disponibles (estado 'verde' = disponible)
    let query = supabase
      .from('locales')
      .select('id, codigo, piso, metraje, precio_base, estado')
      .eq('proyecto_id', proyectoId)
      .eq('estado', 'verde')
      .order('codigo');

    if (excludeLocalId) {
      query = query.neq('id', excludeLocalId);
    }

    const { data, error } = await query;

    console.log('[getLocalesDisponiblesByProyecto] proyectoId:', proyectoId, 'excludeLocalId:', excludeLocalId);
    console.log('[getLocalesDisponiblesByProyecto] Found:', data?.length || 0, 'locales disponibles');

    if (error) {
      console.error('[getLocalesDisponiblesByProyecto] Error:', error);
      return { success: false, data: [], error: error.message };
    }

    return {
      success: true,
      data: (data || []) as LocalDisponible[],
    };
  } catch (error: any) {
    console.error('[getLocalesDisponiblesByProyecto] Error inesperado:', error);
    return { success: false, data: [], error: error.message };
  }
}
