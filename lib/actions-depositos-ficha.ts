// =============================================================================
// SERVER ACTIONS: Depósitos de Fichas de Inscripción
// =============================================================================
// Descripción: CRUD para depósitos en tabla normalizada depositos_ficha
//              Incluye lectura dual (tabla + fallback JSONB) para migración gradual
//              Y validación por Finanzas
// =============================================================================

'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper para crear cliente Supabase
async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

// =============================================================================
// INTERFACES
// =============================================================================

export interface DepositoFicha {
  id: string;
  ficha_id: string | null;
  local_id: string;
  proyecto_id: string;
  indice_original: number | null;

  // Datos del depósito
  monto: number | null;
  moneda: 'USD' | 'PEN' | null;
  fecha_comprobante: string | null;
  hora_comprobante: string | null;
  banco: string | null;
  numero_operacion: string | null;
  depositante: string | null;
  tipo_operacion: string | null;
  confianza: number;

  // Imagen
  imagen_url: string | null;
  uploaded_at: string | null;
  uploaded_by: string | null;

  // Validación
  validado_finanzas: boolean;
  validado_finanzas_por: string | null;
  validado_finanzas_at: string | null;
  validado_finanzas_nombre: string | null;
  notas_validacion: string | null;

  // Vínculo con Control de Pagos
  abono_pago_id: string | null;
  vinculado_at: string | null;

  created_at: string;
  updated_at: string;
}

// Interface legacy para compatibilidad con JSONB
interface DepositoOCRLegacy {
  monto: number | null;
  moneda: 'PEN' | 'USD' | null;
  fecha: string | null;
  hora: string | null;
  banco: string | null;
  numero_operacion: string | null;
  depositante: string | null;
  tipo_operacion?: string | null;
  confianza: number;
  uploaded_at: string | null;
}

export interface DepositoParaReporte {
  id: string;
  ficha_id: string;
  local_id: string;
  proyecto_id: string;
  codigo_local: string;
  proyecto_nombre: string;
  cliente_nombre: string;
  cliente_telefono: string | null;

  monto: number | null;
  moneda: string | null;
  fecha_comprobante: string | null;
  hora_comprobante: string | null;
  banco: string | null;
  numero_operacion: string | null;
  depositante: string | null;

  imagen_url: string | null;
  uploaded_at: string | null;

  validado_finanzas: boolean;
  validado_finanzas_por: string | null;
  validado_finanzas_at: string | null;
  validado_finanzas_nombre: string | null;
}

// =============================================================================
// OBTENER DEPÓSITOS DE UNA FICHA (lectura dual)
// =============================================================================

export async function getDepositosFicha(
  fichaId: string
): Promise<{ success: boolean; data: DepositoFicha[]; source: 'table' | 'jsonb' }> {
  try {
    const supabase = await createClient();

    // 1. Intentar leer de tabla nueva
    const { data: depositos, error } = await supabase
      .from('depositos_ficha')
      .select('*')
      .eq('ficha_id', fichaId)
      .order('indice_original', { ascending: true });

    if (!error && depositos && depositos.length > 0) {
      return { success: true, data: depositos, source: 'table' };
    }

    // 2. Fallback: leer de JSONB
    const { data: ficha, error: fichaError } = await supabase
      .from('clientes_ficha')
      .select(`
        id,
        local_id,
        comprobante_deposito_fotos,
        comprobante_deposito_ocr,
        locales!inner(proyecto_id)
      `)
      .eq('id', fichaId)
      .single();

    if (fichaError || !ficha) {
      return { success: true, data: [], source: 'jsonb' };
    }

    const ocrData = ficha.comprobante_deposito_ocr as DepositoOCRLegacy[] | null;
    const fotos = ficha.comprobante_deposito_fotos as string[] | null;
    const proyectoId = Array.isArray(ficha.locales)
      ? (ficha.locales[0] as { proyecto_id: string })?.proyecto_id
      : (ficha.locales as { proyecto_id: string })?.proyecto_id;

    if (!ocrData || ocrData.length === 0) {
      return { success: true, data: [], source: 'jsonb' };
    }

    // Transformar JSONB a formato de tabla
    const depositosTransformados: DepositoFicha[] = ocrData.map((d, index) => ({
      id: `jsonb-${fichaId}-${index}`, // ID temporal para JSONB
      ficha_id: fichaId,
      local_id: ficha.local_id,
      proyecto_id: proyectoId || '',
      indice_original: index,
      monto: d.monto,
      moneda: d.moneda as 'USD' | 'PEN' | null,
      fecha_comprobante: d.fecha,
      hora_comprobante: d.hora,
      banco: d.banco,
      numero_operacion: d.numero_operacion,
      depositante: d.depositante,
      tipo_operacion: d.tipo_operacion || null,
      confianza: d.confianza || 0,
      imagen_url: fotos && fotos[index] ? fotos[index] : null,
      uploaded_at: d.uploaded_at,
      uploaded_by: null,
      validado_finanzas: false, // JSONB no tiene validación
      validado_finanzas_por: null,
      validado_finanzas_at: null,
      validado_finanzas_nombre: null,
      notas_validacion: null,
      abono_pago_id: null,
      vinculado_at: null,
      created_at: d.uploaded_at || new Date().toISOString(),
      updated_at: d.uploaded_at || new Date().toISOString(),
    }));

    return { success: true, data: depositosTransformados, source: 'jsonb' };
  } catch (error) {
    console.error('Error obteniendo depósitos:', error);
    return { success: false, data: [], source: 'table' };
  }
}

// =============================================================================
// OBTENER DEPÓSITOS PARA REPORTE DIARIO
// =============================================================================

export async function getDepositosParaReporte(params: {
  proyectoId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  soloNoValidados?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<{
  success: boolean;
  data: DepositoParaReporte[];
  total: number;
  source: 'table' | 'mixed';
}> {
  try {
    const supabase = await createClient();
    const { proyectoId, fechaDesde, fechaHasta, soloNoValidados, page = 1, pageSize = 50 } = params;

    // Primero intentamos leer de la tabla nueva
    let query = supabase
      .from('depositos_ficha')
      .select(`
        *,
        clientes_ficha!inner(
          id,
          cliente_nombre,
          cliente_telefono,
          locales!inner(
            codigo,
            proyectos!inner(nombre)
          )
        )
      `, { count: 'exact' });

    if (proyectoId) {
      query = query.eq('proyecto_id', proyectoId);
    }

    if (fechaDesde) {
      query = query.gte('fecha_comprobante', fechaDesde);
    }

    if (fechaHasta) {
      query = query.lte('fecha_comprobante', fechaHasta);
    }

    if (soloNoValidados) {
      query = query.eq('validado_finanzas', false);
    }

    // Paginación
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query
      .order('fecha_comprobante', { ascending: false })
      .order('hora_comprobante', { ascending: false, nullsFirst: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (!error && data && data.length > 0) {
      const depositos: DepositoParaReporte[] = data.map((d) => {
        const ficha = d.clientes_ficha as {
          id: string;
          cliente_nombre: string;
          cliente_telefono: string | null;
          locales: {
            codigo: string;
            proyectos: { nombre: string };
          };
        };

        return {
          id: d.id,
          ficha_id: d.ficha_id,
          local_id: d.local_id,
          proyecto_id: d.proyecto_id,
          codigo_local: ficha.locales.codigo,
          proyecto_nombre: ficha.locales.proyectos.nombre,
          cliente_nombre: ficha.cliente_nombre,
          cliente_telefono: ficha.cliente_telefono,
          monto: d.monto,
          moneda: d.moneda,
          fecha_comprobante: d.fecha_comprobante,
          hora_comprobante: d.hora_comprobante,
          banco: d.banco,
          numero_operacion: d.numero_operacion,
          depositante: d.depositante,
          imagen_url: d.imagen_url,
          uploaded_at: d.uploaded_at,
          validado_finanzas: d.validado_finanzas,
          validado_finanzas_por: d.validado_finanzas_por,
          validado_finanzas_at: d.validado_finanzas_at,
          validado_finanzas_nombre: d.validado_finanzas_nombre,
        };
      });

      return { success: true, data: depositos, total: count || 0, source: 'table' };
    }

    // Fallback: No hay datos en tabla, la función legacy se usará desde el componente
    return { success: true, data: [], total: 0, source: 'mixed' };
  } catch (error) {
    console.error('Error obteniendo depósitos para reporte:', error);
    return { success: false, data: [], total: 0, source: 'table' };
  }
}

// =============================================================================
// CREAR DEPÓSITO (escribe a tabla Y JSONB para compatibilidad)
// =============================================================================

export async function crearDeposito(params: {
  fichaId: string;
  localId: string;
  proyectoId: string;
  monto: number | null;
  moneda: 'USD' | 'PEN';
  fechaComprobante: string | null;
  horaComprobante: string | null;
  banco: string | null;
  numeroOperacion: string | null;
  depositante: string | null;
  tipoOperacion: string | null;
  confianza: number;
  imagenUrl: string | null;
}): Promise<{ success: boolean; message: string; depositoId?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: 'No autenticado' };
    }

    // Convertir fecha de DD-MM-YYYY a YYYY-MM-DD para el campo DATE de PostgreSQL
    let fechaParaDB: string | null = params.fechaComprobante;
    if (params.fechaComprobante) {
      const parts = params.fechaComprobante.split('-');
      if (parts.length === 3 && parts[0].length === 2) {
        // Es formato DD-MM-YYYY, convertir a YYYY-MM-DD
        fechaParaDB = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // 1. Insertar en tabla nueva
    const { data: deposito, error: insertError } = await supabase
      .from('depositos_ficha')
      .insert({
        ficha_id: params.fichaId,
        local_id: params.localId,
        proyecto_id: params.proyectoId,
        monto: params.monto,
        moneda: params.moneda,
        fecha_comprobante: fechaParaDB,
        hora_comprobante: params.horaComprobante,
        banco: params.banco,
        numero_operacion: params.numeroOperacion,
        depositante: params.depositante,
        tipo_operacion: params.tipoOperacion,
        confianza: params.confianza,
        imagen_url: params.imagenUrl,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user.id,
        validado_finanzas: false,
      })
      .select('id, indice_original')
      .single();

    if (insertError) {
      console.error('Error insertando depósito:', insertError);
      return { success: false, message: 'Error al guardar depósito' };
    }

    // =========================================================================
    // DEPRECADO: Escritura dual a JSONB
    // =========================================================================
    // La tabla depositos_ficha es ahora la ÚNICA fuente de verdad
    // El JSONB comprobante_deposito_ocr ya NO se actualiza
    // Solo se mantiene para compatibilidad con código legacy
    // =========================================================================
    /*
    // 2. También actualizar JSONB para compatibilidad (escritura dual)
    const { data: ficha } = await supabase
      .from('clientes_ficha')
      .select('comprobante_deposito_fotos, comprobante_deposito_ocr')
      .eq('id', params.fichaId)
      .single();

    const fotosActuales = (ficha?.comprobante_deposito_fotos as string[] | null) || [];
    const ocrActual = (ficha?.comprobante_deposito_ocr as DepositoOCRLegacy[] | null) || [];

    // Agregar nuevo depósito al JSONB
    const nuevoOcr: DepositoOCRLegacy = {
      monto: params.monto,
      moneda: params.moneda,
      fecha: params.fechaComprobante,
      hora: params.horaComprobante,
      banco: params.banco,
      numero_operacion: params.numeroOperacion,
      depositante: params.depositante,
      tipo_operacion: params.tipoOperacion,
      confianza: params.confianza,
      uploaded_at: new Date().toISOString(),
    };

    const { error: jsonbError } = await supabase
      .from('clientes_ficha')
      .update({
        comprobante_deposito_fotos: [...fotosActuales, params.imagenUrl],
        comprobante_deposito_ocr: [...ocrActual, nuevoOcr],
      })
      .eq('id', params.fichaId);

    if (jsonbError) {
      console.error('[DEPOSITOS_FICHA] Error actualizando JSONB, haciendo rollback:', jsonbError);
      // Rollback: eliminar el depósito insertado para evitar datos huérfanos
      await supabase
        .from('depositos_ficha')
        .delete()
        .eq('id', deposito.id);
      return { success: false, message: 'Error al sincronizar depósito con ficha' };
    }

    // 3. Actualizar indice_original en tabla
    const { error: indexError } = await supabase
      .from('depositos_ficha')
      .update({ indice_original: ocrActual.length })
      .eq('id', deposito.id);

    if (indexError) {
      console.error('[DEPOSITOS_FICHA] Error actualizando indice_original:', indexError);
      // El depósito ya existe, pero sin índice correcto - no es crítico, continuar
    }
    */

    return {
      success: true,
      message: 'Depósito guardado correctamente',
      depositoId: deposito.id,
    };
  } catch (error) {
    console.error('Error creando depósito:', error);
    return { success: false, message: 'Error interno' };
  }
}

// =============================================================================
// ACTUALIZAR CAMPOS EDITABLES DE UN DEPÓSITO
// =============================================================================

export async function updateDepositoFicha(params: {
  depositoId: string;
  monto?: number | null;
  moneda?: 'USD' | 'PEN' | null;
  fechaComprobante?: string | null;
  horaComprobante?: string | null;
  banco?: string | null;
  numeroOperacion?: string | null;
  depositante?: string | null;
}): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: 'No autenticado' };
    }

    // 1. Obtener el depósito actual para verificar que existe y obtener ficha_id
    const { data: depositoActual, error: fetchError } = await supabase
      .from('depositos_ficha')
      .select('id, ficha_id, indice_original')
      .eq('id', params.depositoId)
      .single();

    if (fetchError || !depositoActual) {
      console.error('Error obteniendo depósito:', fetchError);
      return { success: false, message: 'Depósito no encontrado' };
    }

    // 2. Construir objeto de actualización (solo campos proporcionados)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (params.monto !== undefined) updateData.monto = params.monto;
    if (params.moneda !== undefined) updateData.moneda = params.moneda;
    // IMPORTANTE: Solo actualizar fecha_comprobante si hay un valor real (no null/undefined)
    // Esto evita sobrescribir fechas existentes cuando el JSONB no tiene el valor
    if (params.fechaComprobante !== undefined && params.fechaComprobante !== null) {
      // Convertir fecha de DD-MM-YYYY a YYYY-MM-DD para el campo DATE de PostgreSQL
      let fechaParaDB = params.fechaComprobante;
      const parts = params.fechaComprobante.split('-');
      if (parts.length === 3 && parts[0].length === 2) {
        fechaParaDB = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      updateData.fecha_comprobante = fechaParaDB;
    }
    // IMPORTANTE: Solo actualizar hora_comprobante si hay un valor real
    if (params.horaComprobante !== undefined && params.horaComprobante !== null) {
      updateData.hora_comprobante = params.horaComprobante;
    }
    if (params.banco !== undefined) updateData.banco = params.banco;
    if (params.numeroOperacion !== undefined) updateData.numero_operacion = params.numeroOperacion;
    if (params.depositante !== undefined) updateData.depositante = params.depositante;

    // 3. Actualizar en tabla depositos_ficha
    const { error: updateError } = await supabase
      .from('depositos_ficha')
      .update(updateData)
      .eq('id', params.depositoId);

    if (updateError) {
      console.error('Error actualizando depósito:', updateError);
      return { success: false, message: 'Error al actualizar depósito' };
    }

    // =========================================================================
    // DEPRECADO: Sincronización a JSONB
    // =========================================================================
    // La tabla depositos_ficha es la ÚNICA fuente de verdad
    // Ya NO sincronizamos cambios al JSONB comprobante_deposito_ocr
    // El JSONB puede tener datos desactualizados - esto es intencional
    // =========================================================================
    /*
    // 4. También actualizar JSONB en clientes_ficha para compatibilidad
    if (depositoActual.ficha_id && depositoActual.indice_original !== null) {
      const { data: ficha } = await supabase
        .from('clientes_ficha')
        .select('comprobante_deposito_ocr')
        .eq('id', depositoActual.ficha_id)
        .single();

      if (ficha?.comprobante_deposito_ocr) {
        const ocrArray = ficha.comprobante_deposito_ocr as Array<{
          monto: number | null;
          moneda: string | null;
          fecha: string | null;
          hora: string | null;
          banco: string | null;
          numero_operacion: string | null;
          depositante: string | null;
          confianza: number;
          uploaded_at: string | null;
        }>;

        const idx = depositoActual.indice_original;
        if (idx >= 0 && idx < ocrArray.length) {
          // Actualizar solo los campos proporcionados en el JSONB
          if (params.monto !== undefined) ocrArray[idx].monto = params.monto;
          if (params.moneda !== undefined) ocrArray[idx].moneda = params.moneda;
          if (params.fechaComprobante !== undefined) ocrArray[idx].fecha = params.fechaComprobante;
          if (params.horaComprobante !== undefined) ocrArray[idx].hora = params.horaComprobante;
          if (params.banco !== undefined) ocrArray[idx].banco = params.banco;
          if (params.numeroOperacion !== undefined) ocrArray[idx].numero_operacion = params.numeroOperacion;
          if (params.depositante !== undefined) ocrArray[idx].depositante = params.depositante;

          await supabase
            .from('clientes_ficha')
            .update({ comprobante_deposito_ocr: ocrArray })
            .eq('id', depositoActual.ficha_id);
        }
      }
    }
    */

    return { success: true, message: 'Depósito actualizado correctamente' };
  } catch (error) {
    console.error('Error actualizando depósito:', error);
    return { success: false, message: 'Error interno' };
  }
}

// =============================================================================
// VALIDAR DEPÓSITO POR FINANZAS
// =============================================================================

export async function validarDepositoFinanzas(
  depositoId: string,
  notas?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, message: 'No autenticado' };
    }

    // Obtener datos del usuario (rol y nombre)
    const { data: userData } = await supabase
      .from('usuarios')
      .select('id, nombre, rol')
      .eq('id', authUser.id)
      .single();

    if (!userData) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    // Solo finanzas puede validar
    if (userData.rol !== 'finanzas' && userData.rol !== 'admin' && userData.rol !== 'superadmin') {
      return { success: false, message: 'Solo Finanzas puede validar depósitos' };
    }

    // Verificar que no esté ya validado
    const { data: deposito } = await supabase
      .from('depositos_ficha')
      .select('validado_finanzas')
      .eq('id', depositoId)
      .single();

    if (!deposito) {
      return { success: false, message: 'Depósito no encontrado' };
    }

    if (deposito.validado_finanzas) {
      return { success: false, message: 'Este depósito ya está validado' };
    }

    // Obtener hora de Lima
    const limaTime = new Date().toLocaleString('en-US', {
      timeZone: 'America/Lima',
    });
    const validadoAt = new Date(limaTime).toISOString();

    // Actualizar
    const { error } = await supabase
      .from('depositos_ficha')
      .update({
        validado_finanzas: true,
        validado_finanzas_por: userData.id,
        validado_finanzas_at: validadoAt,
        validado_finanzas_nombre: userData.nombre,
        notas_validacion: notas || null,
      })
      .eq('id', depositoId);

    if (error) {
      console.error('Error validando depósito:', error);
      return { success: false, message: 'Error al validar' };
    }

    return { success: true, message: 'Depósito validado correctamente' };
  } catch (error) {
    console.error('Error validando depósito:', error);
    return { success: false, message: 'Error interno' };
  }
}

// =============================================================================
// VALIDAR MÚLTIPLES DEPÓSITOS (bulk)
// =============================================================================

export async function validarDepositosBulk(
  depositoIds: string[]
): Promise<{ success: boolean; message: string; validados: number }> {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, message: 'No autenticado', validados: 0 };
    }

    // Obtener datos del usuario
    const { data: userData } = await supabase
      .from('usuarios')
      .select('id, nombre, rol')
      .eq('id', authUser.id)
      .single();

    if (!userData) {
      return { success: false, message: 'Usuario no encontrado', validados: 0 };
    }

    if (userData.rol !== 'finanzas' && userData.rol !== 'admin' && userData.rol !== 'superadmin') {
      return { success: false, message: 'Solo Finanzas puede validar', validados: 0 };
    }

    const limaTime = new Date().toLocaleString('en-US', {
      timeZone: 'America/Lima',
    });
    const validadoAt = new Date(limaTime).toISOString();

    // Actualizar solo los no validados
    const { data, error } = await supabase
      .from('depositos_ficha')
      .update({
        validado_finanzas: true,
        validado_finanzas_por: userData.id,
        validado_finanzas_at: validadoAt,
        validado_finanzas_nombre: userData.nombre,
      })
      .in('id', depositoIds)
      .eq('validado_finanzas', false)
      .select('id');

    if (error) {
      console.error('Error validando depósitos:', error);
      return { success: false, message: 'Error al validar', validados: 0 };
    }

    return {
      success: true,
      message: `${data?.length || 0} depósitos validados`,
      validados: data?.length || 0,
    };
  } catch (error) {
    console.error('Error validando depósitos:', error);
    return { success: false, message: 'Error interno', validados: 0 };
  }
}

// =============================================================================
// CONTAR DEPÓSITOS PENDIENTES DE VALIDACIÓN
// =============================================================================

export async function contarDepositosPendientes(
  proyectoId?: string
): Promise<{ success: boolean; count: number }> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('depositos_ficha')
      .select('*', { count: 'exact', head: true })
      .eq('validado_finanzas', false);

    if (proyectoId) {
      query = query.eq('proyecto_id', proyectoId);
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error contando pendientes:', error);
      return { success: false, count: 0 };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Error contando pendientes:', error);
    return { success: false, count: 0 };
  }
}

// =============================================================================
// SYNC: Sincronizar depósitos de JSONB a tabla
// Esta función se llama después de guardar la ficha para mantener ambos en sync
// =============================================================================

export interface DepositoOCRInput {
  monto: number | null;
  moneda: 'PEN' | 'USD' | null;
  fecha: string | null;
  hora?: string | null;
  banco: string | null;
  numero_operacion: string | null;
  depositante: string | null;
  tipo_operacion?: string | null;
  confianza: number;
  uploaded_at?: string | null;
}

export async function syncDepositosFromFicha(params: {
  fichaId: string;
  localId: string;
  depositos: DepositoOCRInput[];
  fotos: string[];
}): Promise<{ success: boolean; synced: number; message?: string }> {
  // =============================================================================
  // DEPRECADO: Esta función ya no debe usarse
  // =============================================================================
  // RAZÓN: La tabla depositos_ficha es ahora la única fuente de verdad
  // El JSONB comprobante_deposito_ocr se mantiene solo para compatibilidad
  // pero NO debe usarse para actualizar la tabla normalizada
  //
  // FLUJO CORRECTO:
  // 1. Frontend llama a crearDeposito() directamente
  // 2. crearDeposito() escribe a tabla Y JSONB (escritura dual)
  // 3. La tabla es la fuente de verdad para todas las lecturas
  // =============================================================================
  console.warn('[DEPRECATED] syncDepositosFromFicha() ya no debe usarse. Usar crearDeposito() directamente.');
  return { success: true, synced: 0, message: 'Función deprecada - tabla es fuente de verdad' };

  /* CÓDIGO ORIGINAL COMENTADO
  try {
    const supabase = await createClient();

    // Obtener proyecto_id del local
    const { data: local } = await supabase
      .from('locales')
      .select('proyecto_id')
      .eq('id', params.localId)
      .single();

    if (!local?.proyecto_id) {
      console.error('[SYNC_DEPOSITOS] Local sin proyecto_id');
      return { success: false, synced: 0, message: 'Local sin proyecto' };
    }

    const proyectoId = local.proyecto_id;

    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    let synced = 0;

    for (let i = 0; i < params.depositos.length; i++) {
      const deposito = params.depositos[i];
      const imagenUrl = params.fotos[i] || null;

      // Verificar si ya existe este depósito en la tabla
      // Si existe, NO lo actualizamos (la tabla es fuente de verdad)
      const { data: existing } = await supabase
        .from('depositos_ficha')
        .select('id, imagen_url')
        .eq('ficha_id', params.fichaId)
        .eq('indice_original', i)
        .maybeSingle();

      // Parsear fecha
      let fechaComprobante: string | null = null;
      if (deposito.fecha && deposito.fecha !== 'null' && deposito.fecha !== 'undefined') {
        if (deposito.fecha.includes('/')) {
          const parts = deposito.fecha.split('/');
          if (parts.length === 3) {
            const [d, m, y] = parts;
            fechaComprobante = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
        } else if (deposito.fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
          fechaComprobante = deposito.fecha;
        }
      }

      // Parsear hora
      let horaComprobante: string | null = null;
      if (deposito.hora && deposito.hora !== 'null' && deposito.hora !== 'N/A') {
        const partes = deposito.hora.split(':');
        if (partes.length >= 2) {
          horaComprobante = `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}:00`;
        }
      }

      const depositoData = {
        ficha_id: params.fichaId,
        local_id: params.localId,
        proyecto_id: proyectoId,
        indice_original: i,
        monto: deposito.monto,
        moneda: deposito.moneda || 'USD',
        fecha_comprobante: fechaComprobante,
        hora_comprobante: horaComprobante,
        banco: deposito.banco,
        numero_operacion: deposito.numero_operacion,
        depositante: deposito.depositante,
        tipo_operacion: deposito.tipo_operacion || null,
        confianza: deposito.confianza || 0,
        imagen_url: imagenUrl,
        uploaded_at: deposito.uploaded_at || new Date().toISOString(),
        uploaded_by: userId,
        ocr_raw: deposito,
      };

      if (existing) {
        // =====================================================================
        // DEPÓSITO YA EXISTE EN TABLA - NO SOBRESCRIBIR DATOS
        // =====================================================================
        // La tabla normalizada es la fuente de verdad. Los datos que tiene
        // fueron editados por el usuario (via updateDepositoFicha) y son correctos.
        // El JSONB puede tener datos desactualizados, NO usarlos para update.
        //
        // Solo actualizamos imagen_url si hay una nueva (por si subió nueva imagen)
        // =====================================================================
        if (imagenUrl && imagenUrl !== existing.imagen_url) {
          const { error } = await supabase
            .from('depositos_ficha')
            .update({
              imagen_url: imagenUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (!error) synced++;
        } else {
          // Depósito existe y no hay nueva imagen, no hacer nada
          synced++;
        }
      } else {
        // Insertar nuevo
        const { error } = await supabase
          .from('depositos_ficha')
          .insert({
            ...depositoData,
            validado_finanzas: false,
          });

        if (!error) synced++;
      }
    }

    return { success: true, synced };
  } catch (error) {
    console.error('[SYNC_DEPOSITOS] Error:', error);
    return { success: false, synced: 0, message: 'Error sincronizando' };
  }
  */
}

// =============================================================================
// VALIDAR DEPÓSITO CON MOVIMIENTO BANCARIO
// =============================================================================

/**
 * Validar depósito con movimiento bancario adjunto
 * Usado en el popup de validación de Reporte Diario
 */
export async function validarDepositoConMovimientoBancario(
  depositoId: string,
  data: {
    imagenMovimientoBancarioUrl?: string;
    numeroOperacionBanco?: string;
    numeroOperacionBancoEditado?: boolean;
    numeroOperacionBancoConfianza?: number;
    notas?: string;
  }
): Promise<{ success: boolean; message: string }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  try {
    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'Usuario no autenticado' };
    }

    // Obtener datos del usuario para el snapshot
    const { data: userData } = await supabase
      .from('usuarios')
      .select('nombre, rol')
      .eq('id', user.id)
      .single();

    // Verificar rol (solo finanzas, admin, superadmin)
    const rolesPermitidos = ['finanzas', 'admin', 'superadmin'];
    if (!userData || !rolesPermitidos.includes(userData.rol)) {
      return { success: false, message: 'No tienes permiso para validar depósitos' };
    }

    // Obtener hora de Lima
    const limaTime = new Date().toLocaleString('en-US', {
      timeZone: 'America/Lima',
    });
    const validadoAt = new Date(limaTime).toISOString();

    // Actualizar depósito
    const updateData: Record<string, any> = {
      validado_finanzas: true,
      validado_finanzas_por: user.id,
      validado_finanzas_at: validadoAt,
      validado_finanzas_nombre: userData.nombre,
    };

    // Agregar datos del movimiento bancario si se proporcionan
    if (data.imagenMovimientoBancarioUrl) {
      updateData.imagen_movimiento_bancario_url = data.imagenMovimientoBancarioUrl;
    }
    if (data.numeroOperacionBanco) {
      updateData.numero_operacion_banco = data.numeroOperacionBanco;
    }
    if (data.numeroOperacionBancoEditado !== undefined) {
      updateData.numero_operacion_banco_editado = data.numeroOperacionBancoEditado;
    }
    if (data.numeroOperacionBancoConfianza !== undefined) {
      updateData.numero_operacion_banco_confianza = data.numeroOperacionBancoConfianza;
    }
    if (data.notas) {
      updateData.notas_validacion = data.notas;
    }

    const { error } = await supabase
      .from('depositos_ficha')
      .update(updateData)
      .eq('id', depositoId);

    if (error) {
      console.error('[DEPOSITOS_FICHA] Error validando con movimiento:', error);
      return { success: false, message: 'Error al validar depósito' };
    }

    console.log('[DEPOSITOS_FICHA] Depósito validado con movimiento bancario:', depositoId);
    return { success: true, message: 'Depósito validado correctamente' };
  } catch (error) {
    console.error('[DEPOSITOS_FICHA] Error inesperado:', error);
    return { success: false, message: 'Error inesperado al validar depósito' };
  }
}

// =============================================================================
// GUARDAR BOLETA CON OCR
// =============================================================================

/**
 * Guardar imagen de boleta y datos OCR
 * Usado en el popup de vincular boleta
 */
export async function guardarBoletaConOCR(
  depositoId: string,
  data: {
    boletaImagenUrl?: string;
    numeroBoleta: string;
    tipoBoleta?: 'boleta' | 'factura';
    numeroBoletaEditado?: boolean;
    numeroBoletaConfianza?: number;
  }
): Promise<{ success: boolean; message: string }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  try {
    const updateData: Record<string, any> = {
      numero_boleta: data.numeroBoleta,
    };

    if (data.boletaImagenUrl) {
      updateData.boleta_imagen_url = data.boletaImagenUrl;
    }
    if (data.tipoBoleta) {
      updateData.boleta_tipo = data.tipoBoleta;
    }
    if (data.numeroBoletaEditado !== undefined) {
      updateData.numero_boleta_editado = data.numeroBoletaEditado;
    }
    if (data.numeroBoletaConfianza !== undefined) {
      updateData.numero_boleta_confianza = data.numeroBoletaConfianza;
    }

    const { error } = await supabase
      .from('depositos_ficha')
      .update(updateData)
      .eq('id', depositoId);

    if (error) {
      console.error('[DEPOSITOS_FICHA] Error guardando boleta:', error);
      return { success: false, message: 'Error al guardar boleta' };
    }

    console.log('[DEPOSITOS_FICHA] Boleta guardada:', depositoId);
    return { success: true, message: 'Boleta vinculada correctamente' };
  } catch (error) {
    console.error('[DEPOSITOS_FICHA] Error inesperado:', error);
    return { success: false, message: 'Error inesperado' };
  }
}
