// =============================================================================
// SERVER ACTIONS: Depósitos de Fichas de Inscripción
// =============================================================================
// Descripción: CRUD para depósitos en tabla normalizada depositos_ficha
//              Incluye lectura dual (tabla + fallback JSONB) para migración gradual
//              Y verificación por Finanzas
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

  // Verificación
  verificado_finanzas: boolean;
  verificado_finanzas_por: string | null;
  verificado_finanzas_at: string | null;
  verificado_finanzas_nombre: string | null;
  notas_verificacion: string | null;

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

  verificado_finanzas: boolean;
  verificado_finanzas_por: string | null;
  verificado_finanzas_at: string | null;
  verificado_finanzas_nombre: string | null;
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
      verificado_finanzas: false, // JSONB no tiene verificación
      verificado_finanzas_por: null,
      verificado_finanzas_at: null,
      verificado_finanzas_nombre: null,
      notas_verificacion: null,
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
  soloNoverificados?: boolean;
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
    const { proyectoId, fechaDesde, fechaHasta, soloNoverificados, page = 1, pageSize = 50 } = params;

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

    if (soloNoverificados) {
      query = query.eq('verificado_finanzas', false);
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
          verificado_finanzas: d.verificado_finanzas,
          verificado_finanzas_por: d.verificado_finanzas_por,
          verificado_finanzas_at: d.verificado_finanzas_at,
          verificado_finanzas_nombre: d.verificado_finanzas_nombre,
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

    // 1. Insertar en tabla nueva
    const { data: deposito, error: insertError } = await supabase
      .from('depositos_ficha')
      .insert({
        ficha_id: params.fichaId,
        local_id: params.localId,
        proyecto_id: params.proyectoId,
        monto: params.monto,
        moneda: params.moneda,
        fecha_comprobante: params.fechaComprobante,
        hora_comprobante: params.horaComprobante,
        banco: params.banco,
        numero_operacion: params.numeroOperacion,
        depositante: params.depositante,
        tipo_operacion: params.tipoOperacion,
        confianza: params.confianza,
        imagen_url: params.imagenUrl,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user.id,
        verificado_finanzas: false,
      })
      .select('id, indice_original')
      .single();

    if (insertError) {
      console.error('Error insertando depósito:', insertError);
      return { success: false, message: 'Error al guardar depósito' };
    }

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

    await supabase
      .from('clientes_ficha')
      .update({
        comprobante_deposito_fotos: [...fotosActuales, params.imagenUrl],
        comprobante_deposito_ocr: [...ocrActual, nuevoOcr],
      })
      .eq('id', params.fichaId);

    // 3. Actualizar indice_original en tabla
    await supabase
      .from('depositos_ficha')
      .update({ indice_original: ocrActual.length })
      .eq('id', deposito.id);

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
// VERIFICAR DEPÓSITO POR FINANZAS
// =============================================================================

export async function verificarDepositoFinanzas(
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

    // Solo finanzas puede verificar
    if (userData.rol !== 'finanzas' && userData.rol !== 'admin' && userData.rol !== 'superadmin') {
      return { success: false, message: 'Solo Finanzas puede verificar depósitos' };
    }

    // Verificar que no esté ya verificado
    const { data: deposito } = await supabase
      .from('depositos_ficha')
      .select('verificado_finanzas')
      .eq('id', depositoId)
      .single();

    if (!deposito) {
      return { success: false, message: 'Depósito no encontrado' };
    }

    if (deposito.verificado_finanzas) {
      return { success: false, message: 'Este depósito ya está verificado' };
    }

    // Obtener hora de Lima
    const limaTime = new Date().toLocaleString('en-US', {
      timeZone: 'America/Lima',
    });
    const verificadoAt = new Date(limaTime).toISOString();

    // Actualizar
    const { error } = await supabase
      .from('depositos_ficha')
      .update({
        verificado_finanzas: true,
        verificado_finanzas_por: userData.id,
        verificado_finanzas_at: verificadoAt,
        verificado_finanzas_nombre: userData.nombre,
        notas_verificacion: notas || null,
      })
      .eq('id', depositoId);

    if (error) {
      console.error('Error verificando depósito:', error);
      return { success: false, message: 'Error al verificar' };
    }

    return { success: true, message: 'Depósito verificado correctamente' };
  } catch (error) {
    console.error('Error verificando depósito:', error);
    return { success: false, message: 'Error interno' };
  }
}

// =============================================================================
// VERIFICAR MÚLTIPLES DEPÓSITOS (bulk)
// =============================================================================

export async function verificarDepositosBulk(
  depositoIds: string[]
): Promise<{ success: boolean; message: string; verificados: number }> {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return { success: false, message: 'No autenticado', verificados: 0 };
    }

    // Obtener datos del usuario
    const { data: userData } = await supabase
      .from('usuarios')
      .select('id, nombre, rol')
      .eq('id', authUser.id)
      .single();

    if (!userData) {
      return { success: false, message: 'Usuario no encontrado', verificados: 0 };
    }

    if (userData.rol !== 'finanzas' && userData.rol !== 'admin' && userData.rol !== 'superadmin') {
      return { success: false, message: 'Solo Finanzas puede verificar', verificados: 0 };
    }

    const limaTime = new Date().toLocaleString('en-US', {
      timeZone: 'America/Lima',
    });
    const verificadoAt = new Date(limaTime).toISOString();

    // Actualizar solo los no verificados
    const { data, error } = await supabase
      .from('depositos_ficha')
      .update({
        verificado_finanzas: true,
        verificado_finanzas_por: userData.id,
        verificado_finanzas_at: verificadoAt,
        verificado_finanzas_nombre: userData.nombre,
      })
      .in('id', depositoIds)
      .eq('verificado_finanzas', false)
      .select('id');

    if (error) {
      console.error('Error verificando depósitos:', error);
      return { success: false, message: 'Error al verificar', verificados: 0 };
    }

    return {
      success: true,
      message: `${data?.length || 0} depósitos verificados`,
      verificados: data?.length || 0,
    };
  } catch (error) {
    console.error('Error verificando depósitos:', error);
    return { success: false, message: 'Error interno', verificados: 0 };
  }
}

// =============================================================================
// CONTAR DEPÓSITOS PENDIENTES DE VERIFICACIÓN
// =============================================================================

export async function contarDepositosPendientes(
  proyectoId?: string
): Promise<{ success: boolean; count: number }> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('depositos_ficha')
      .select('*', { count: 'exact', head: true })
      .eq('verificado_finanzas', false);

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
      const { data: existing } = await supabase
        .from('depositos_ficha')
        .select('id')
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
        // Actualizar existente (pero NO cambiar verificado_finanzas)
        const { error } = await supabase
          .from('depositos_ficha')
          .update({
            ...depositoData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (!error) synced++;
      } else {
        // Insertar nuevo
        const { error } = await supabase
          .from('depositos_ficha')
          .insert({
            ...depositoData,
            verificado_finanzas: false,
          });

        if (!error) synced++;
      }
    }

    return { success: true, synced };
  } catch (error) {
    console.error('[SYNC_DEPOSITOS] Error:', error);
    return { success: false, synced: 0, message: 'Error sincronizando' };
  }
}
