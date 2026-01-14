'use server';

import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type {
  RegistroCorredor,
  DocumentoCorredor,
  HistorialCambio,
  CreateRegistroDTO,
  UpdateRegistroDTO,
  ExpansionActionResult,
  EstadoRegistro,
  TipoDocumento,
  TipoPersona,
  RegistroListItem,
  RegistrosFiltros,
  InboxStats,
} from './types/expansion';

// ============================================================================
// MÓDULO: Expansión - Sistema de Corredores
// Versión: 1.0.0
// Fecha: 12 Enero 2026
// ============================================================================

// ============================================================================
// HELPER: Crear cliente Supabase (con auth del usuario)
// ============================================================================

async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignorar errores en Server Components
          }
        },
      },
    }
  );
}

// ============================================================================
// HELPER: Crear cliente Admin (service role) - BYPASA RLS
// ============================================================================

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada');
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// ============================================================================
// HELPER: Obtener usuario actual
// ============================================================================

async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userData } = await supabase
    .from('usuarios')
    .select('id, nombre, email, rol')
    .eq('id', user.id)
    .single();

  return userData;
}

// ============================================================================
// HELPER: Verificar si usuario tiene permiso para acción en expansion
// ============================================================================

async function checkExpansionPermission(
  userId: string,
  accion: 'read' | 'read_all' | 'write' | 'approve' | 'reject' | 'observe'
): Promise<boolean> {
  const adminClient = createAdminClient();

  // Obtener rol del usuario
  const { data: usuario } = await adminClient
    .from('usuarios')
    .select('rol')
    .eq('id', userId)
    .single();

  if (!usuario) return false;

  // Roles con acceso completo al módulo
  const adminRoles = ['superadmin', 'admin', 'legal'];
  if (adminRoles.includes(usuario.rol)) {
    return true;
  }

  // Corredor solo puede read y write su propio registro
  if (usuario.rol === 'corredor' && ['read', 'write'].includes(accion)) {
    return true;
  }

  return false;
}

// ============================================================================
// REGISTRO: Obtener registro del corredor actual
// ============================================================================

export async function getMyRegistro(): Promise<ExpansionActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const supabase = await createClient();

    const { data: registro, error } = await supabase
      .from('corredores_registro')
      .select(`
        *,
        documentos:corredores_documentos(*),
        historial:corredores_historial(*, usuario:usuarios!corredores_historial_realizado_por_fkey(nombre))
      `)
      .eq('usuario_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error obteniendo registro:', error);
      return { success: false, error: 'Error obteniendo registro' };
    }

    return { success: true, data: registro || null };
  } catch (error) {
    console.error('Error en getMyRegistro:', error);
    return { success: false, error: 'Error interno' };
  }
}

// ============================================================================
// REGISTRO: Crear registro de corredor (borrador)
// ============================================================================

export async function createRegistroCorredor(
  data: CreateRegistroDTO
): Promise<ExpansionActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Verificar que el usuario es corredor
    if (user.rol !== 'corredor') {
      return { success: false, error: 'Solo corredores pueden crear registro' };
    }

    const supabase = await createClient();

    // Verificar que no tenga registro existente
    // Usar maybeSingle() para evitar error cuando no hay registros
    const { data: existing, error: existingError } = await supabase
      .from('corredores_registro')
      .select('id')
      .eq('usuario_id', user.id)
      .maybeSingle();

    // Si hay error (que no sea "no rows"), loguear
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error verificando registro existente:', existingError);
    }

    if (existing) {
      return { success: false, error: 'Ya tienes un registro existente' };
    }

    // Crear registro en borrador
    const { data: registro, error } = await supabase
      .from('corredores_registro')
      .insert({
        usuario_id: user.id,
        tipo_persona: data.tipo_persona,
        email: data.email,
        telefono: data.telefono,
        estado: 'borrador',
        // Campos según tipo de persona
        ...(data.tipo_persona === 'natural' && {
          dni: data.dni,
          nombres: data.nombres,
          apellido_paterno: data.apellido_paterno,
          apellido_materno: data.apellido_materno,
          // fecha_nacimiento: enviar null si está vacío para evitar error de PostgreSQL
          fecha_nacimiento: data.fecha_nacimiento || null,
          direccion_declarada: data.direccion_declarada,
        }),
        ...(data.tipo_persona === 'juridica' && {
          razon_social: data.razon_social,
          ruc: data.ruc,
          representante_legal: data.representante_legal,
          dni_representante: data.dni_representante,
          direccion_declarada: data.direccion_declarada,
          es_pep: data.es_pep,
        }),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando registro:', error);
      // Mostrar error más específico para debugging
      const errorMsg = error.message || error.code || 'Error creando registro';
      return { success: false, error: `Error: ${errorMsg}` };
    }

    // Registrar en historial
    await supabase.from('corredores_historial').insert({
      registro_id: registro.id,
      accion: 'creado',
      comentario: 'Registro creado como borrador',
      realizado_por: user.id,
    });

    revalidatePath('/expansion');
    return { success: true, data: registro };
  } catch (error) {
    console.error('Error en createRegistroCorredor:', error);
    return { success: false, error: 'Error interno' };
  }
}

// ============================================================================
// REGISTRO: Actualizar registro (solo si está en borrador u observado)
// ============================================================================

export async function updateRegistroCorredor(
  registroId: string,
  data: UpdateRegistroDTO
): Promise<ExpansionActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const supabase = await createClient();

    // Verificar que el registro pertenece al usuario y está editable
    const { data: existing } = await supabase
      .from('corredores_registro')
      .select('id, usuario_id, estado')
      .eq('id', registroId)
      .single();

    if (!existing) {
      return { success: false, error: 'Registro no encontrado' };
    }

    if (existing.usuario_id !== user.id) {
      return { success: false, error: 'No tienes permiso para editar este registro' };
    }

    if (!['borrador', 'observado'].includes(existing.estado)) {
      return { success: false, error: 'El registro no se puede editar en su estado actual' };
    }

    // Sanitizar datos: convertir strings vacíos en null para evitar error de PostgreSQL
    const sanitizedData: any = { ...data };
    Object.keys(sanitizedData).forEach((key) => {
      if (sanitizedData[key] === '') {
        sanitizedData[key] = null;
      }
    });

    // Actualizar registro
    const { data: registro, error } = await supabase
      .from('corredores_registro')
      .update({
        ...sanitizedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', registroId)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando registro:', error);
      return { success: false, error: 'Error actualizando registro' };
    }

    revalidatePath('/expansion');
    return { success: true, data: registro };
  } catch (error) {
    console.error('Error en updateRegistroCorredor:', error);
    return { success: false, error: 'Error interno' };
  }
}

// ============================================================================
// REGISTRO: Enviar para revisión (borrador/observado → pendiente)
// ============================================================================

export async function submitRegistro(registroId: string): Promise<ExpansionActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const supabase = await createClient();

    // Verificar registro
    const { data: existing } = await supabase
      .from('corredores_registro')
      .select('*, documentos:corredores_documentos(tipo_documento)')
      .eq('id', registroId)
      .single();

    if (!existing) {
      return { success: false, error: 'Registro no encontrado' };
    }

    if (existing.usuario_id !== user.id) {
      return { success: false, error: 'No tienes permiso' };
    }

    if (!['borrador', 'observado'].includes(existing.estado)) {
      return { success: false, error: 'El registro no se puede enviar en su estado actual' };
    }

    // Validar documentos requeridos según tipo de persona
    const docsTipos = existing.documentos?.map((d: any) => d.tipo_documento) || [];

    const requiredDocs = existing.tipo_persona === 'natural'
      ? ['dni_frente', 'dni_reverso', 'recibo_luz', 'declaracion_jurada_direccion']
      : ['ficha_ruc', 'vigencia_poder', 'dni_frente', 'dni_reverso', 'declaracion_jurada_direccion', 'declaracion_pep'];

    const missingDocs = requiredDocs.filter((d) => !docsTipos.includes(d));

    if (missingDocs.length > 0) {
      return {
        success: false,
        error: `Faltan documentos requeridos: ${missingDocs.join(', ')}`,
      };
    }

    // Actualizar estado a pendiente
    const accion = existing.estado === 'observado' ? 'corregido' : 'enviado';

    const { data: registro, error } = await supabase
      .from('corredores_registro')
      .update({
        estado: 'pendiente',
        enviado_at: new Date().toISOString(),
        observaciones: null, // Limpiar observaciones anteriores
      })
      .eq('id', registroId)
      .select()
      .single();

    if (error) {
      console.error('Error enviando registro:', error);
      return { success: false, error: 'Error enviando registro' };
    }

    // Registrar en historial
    await supabase.from('corredores_historial').insert({
      registro_id: registroId,
      accion,
      comentario: existing.estado === 'observado'
        ? 'Correcciones enviadas para nueva revisión'
        : 'Registro enviado para revisión',
      realizado_por: user.id,
    });

    revalidatePath('/expansion');
    return { success: true, data: registro };
  } catch (error) {
    console.error('Error en submitRegistro:', error);
    return { success: false, error: 'Error interno' };
  }
}

// ============================================================================
// ADMIN: Obtener todos los registros (para inbox)
// ============================================================================

export async function getAllRegistros(
  filtros?: RegistrosFiltros
): Promise<ExpansionActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Verificar permiso
    const hasPermission = await checkExpansionPermission(user.id, 'read_all');
    if (!hasPermission) {
      return { success: false, error: 'Sin permiso para ver registros' };
    }

    const adminClient = createAdminClient();

    let query = adminClient
      .from('corredores_registro')
      .select(`
        id,
        tipo_persona,
        email,
        telefono,
        estado,
        created_at,
        enviado_at,
        nombres,
        apellido_paterno,
        apellido_materno,
        razon_social,
        usuario:usuarios!corredores_registro_usuario_id_fkey(nombre, email),
        documentos:corredores_documentos(id)
      `)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filtros?.estado) {
      query = query.eq('estado', filtros.estado);
    }
    if (filtros?.tipo_persona) {
      query = query.eq('tipo_persona', filtros.tipo_persona);
    }
    if (filtros?.busqueda) {
      // Búsqueda en múltiples campos
      query = query.or(
        `email.ilike.%${filtros.busqueda}%,nombres.ilike.%${filtros.busqueda}%,razon_social.ilike.%${filtros.busqueda}%`
      );
    }

    const { data: registros, error } = await query;

    if (error) {
      console.error('Error obteniendo registros:', error);
      return { success: false, error: 'Error obteniendo registros' };
    }

    // Transformar a RegistroListItem
    const items: RegistroListItem[] = (registros || []).map((r: any) => ({
      id: r.id,
      tipo_persona: r.tipo_persona,
      nombre_completo: r.tipo_persona === 'natural'
        ? `${r.nombres || ''} ${r.apellido_paterno || ''} ${r.apellido_materno || ''}`.trim()
        : r.razon_social || 'Sin nombre',
      email: r.email,
      telefono: r.telefono,
      estado: r.estado,
      created_at: r.created_at,
      enviado_at: r.enviado_at,
      documentos_count: r.documentos?.length || 0,
    }));

    return { success: true, data: items };
  } catch (error) {
    console.error('Error en getAllRegistros:', error);
    return { success: false, error: 'Error interno' };
  }
}

// ============================================================================
// ADMIN: Obtener estadísticas del inbox
// ============================================================================

export async function getInboxStats(): Promise<ExpansionActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const hasPermission = await checkExpansionPermission(user.id, 'read_all');
    if (!hasPermission) {
      return { success: false, error: 'Sin permiso' };
    }

    const adminClient = createAdminClient();

    // Contar por estado
    const { data, error } = await adminClient
      .from('corredores_registro')
      .select('estado');

    if (error) {
      console.error('Error obteniendo stats:', error);
      return { success: false, error: 'Error obteniendo estadísticas' };
    }

    const stats: InboxStats = {
      total: data?.length || 0,
      pendientes: data?.filter((r) => r.estado === 'pendiente').length || 0,
      observados: data?.filter((r) => r.estado === 'observado').length || 0,
      aprobados: data?.filter((r) => r.estado === 'aprobado').length || 0,
      rechazados: data?.filter((r) => r.estado === 'rechazado').length || 0,
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error en getInboxStats:', error);
    return { success: false, error: 'Error interno' };
  }
}

// ============================================================================
// ADMIN: Obtener detalle de un registro
// ============================================================================

export async function getRegistroDetalle(registroId: string): Promise<ExpansionActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const hasPermission = await checkExpansionPermission(user.id, 'read_all');
    if (!hasPermission) {
      return { success: false, error: 'Sin permiso' };
    }

    const adminClient = createAdminClient();

    const { data: registro, error } = await adminClient
      .from('corredores_registro')
      .select(`
        *,
        usuario:usuarios!corredores_registro_usuario_id_fkey(nombre, email),
        aprobador:usuarios!corredores_registro_aprobado_por_fkey(nombre),
        documentos:corredores_documentos(*),
        historial:corredores_historial(*, usuario:usuarios!corredores_historial_realizado_por_fkey(nombre))
      `)
      .eq('id', registroId)
      .single();

    if (error) {
      console.error('Error obteniendo detalle:', error);
      return { success: false, error: 'Registro no encontrado' };
    }

    return { success: true, data: registro };
  } catch (error) {
    console.error('Error en getRegistroDetalle:', error);
    return { success: false, error: 'Error interno' };
  }
}

// ============================================================================
// ADMIN: Aprobar registro
// ============================================================================

export async function aprobarRegistro(registroId: string): Promise<ExpansionActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const hasPermission = await checkExpansionPermission(user.id, 'approve');
    if (!hasPermission) {
      return { success: false, error: 'Sin permiso para aprobar' };
    }

    const adminClient = createAdminClient();

    // Verificar estado actual
    const { data: existing } = await adminClient
      .from('corredores_registro')
      .select('estado')
      .eq('id', registroId)
      .single();

    if (!existing || existing.estado !== 'pendiente') {
      return { success: false, error: 'Solo se pueden aprobar registros pendientes' };
    }

    // Aprobar
    const { data: registro, error } = await adminClient
      .from('corredores_registro')
      .update({
        estado: 'aprobado',
        aprobado_por: user.id,
        aprobado_at: new Date().toISOString(),
      })
      .eq('id', registroId)
      .select()
      .single();

    if (error) {
      console.error('Error aprobando registro:', error);
      return { success: false, error: 'Error aprobando registro' };
    }

    // Registrar en historial
    await adminClient.from('corredores_historial').insert({
      registro_id: registroId,
      accion: 'aprobado',
      comentario: 'Registro aprobado',
      realizado_por: user.id,
    });

    revalidatePath('/expansion');
    return { success: true, data: registro };
  } catch (error) {
    console.error('Error en aprobarRegistro:', error);
    return { success: false, error: 'Error interno' };
  }
}

// ============================================================================
// ADMIN: Rechazar registro
// ============================================================================

export async function rechazarRegistro(
  registroId: string,
  motivo: string
): Promise<ExpansionActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const hasPermission = await checkExpansionPermission(user.id, 'reject');
    if (!hasPermission) {
      return { success: false, error: 'Sin permiso para rechazar' };
    }

    if (!motivo.trim()) {
      return { success: false, error: 'Debe indicar el motivo del rechazo' };
    }

    const adminClient = createAdminClient();

    // Verificar estado actual
    const { data: existing } = await adminClient
      .from('corredores_registro')
      .select('estado')
      .eq('id', registroId)
      .single();

    if (!existing || existing.estado !== 'pendiente') {
      return { success: false, error: 'Solo se pueden rechazar registros pendientes' };
    }

    // Rechazar
    const { data: registro, error } = await adminClient
      .from('corredores_registro')
      .update({
        estado: 'rechazado',
        observaciones: motivo,
      })
      .eq('id', registroId)
      .select()
      .single();

    if (error) {
      console.error('Error rechazando registro:', error);
      return { success: false, error: 'Error rechazando registro' };
    }

    // Registrar en historial
    await adminClient.from('corredores_historial').insert({
      registro_id: registroId,
      accion: 'rechazado',
      comentario: motivo,
      realizado_por: user.id,
    });

    revalidatePath('/expansion');
    return { success: true, data: registro };
  } catch (error) {
    console.error('Error en rechazarRegistro:', error);
    return { success: false, error: 'Error interno' };
  }
}

// ============================================================================
// ADMIN: Observar registro (solicitar correcciones)
// ============================================================================

export async function observarRegistro(
  registroId: string,
  observaciones: string
): Promise<ExpansionActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const hasPermission = await checkExpansionPermission(user.id, 'observe');
    if (!hasPermission) {
      return { success: false, error: 'Sin permiso para observar' };
    }

    if (!observaciones.trim()) {
      return { success: false, error: 'Debe indicar las observaciones' };
    }

    const adminClient = createAdminClient();

    // Verificar estado actual
    const { data: existing } = await adminClient
      .from('corredores_registro')
      .select('estado')
      .eq('id', registroId)
      .single();

    if (!existing || existing.estado !== 'pendiente') {
      return { success: false, error: 'Solo se pueden observar registros pendientes' };
    }

    // Observar
    const { data: registro, error } = await adminClient
      .from('corredores_registro')
      .update({
        estado: 'observado',
        observaciones,
      })
      .eq('id', registroId)
      .select()
      .single();

    if (error) {
      console.error('Error observando registro:', error);
      return { success: false, error: 'Error observando registro' };
    }

    // Registrar en historial
    await adminClient.from('corredores_historial').insert({
      registro_id: registroId,
      accion: 'observado',
      comentario: observaciones,
      realizado_por: user.id,
    });

    revalidatePath('/expansion');
    return { success: true, data: registro };
  } catch (error) {
    console.error('Error en observarRegistro:', error);
    return { success: false, error: 'Error interno' };
  }
}

// ============================================================================
// DOCUMENTOS: Guardar múltiples documentos desde URLs existentes
// ============================================================================

/**
 * Guarda documentos que ya fueron subidos a Storage.
 * Se usa cuando el usuario hace "Guardar Borrador" y tiene documentos en estado local.
 *
 * @param registroId - ID del registro de corredor
 * @param documentos - Array de documentos con tipo, URL y storagePath
 */
export async function saveDocumentosCorredor(
  registroId: string,
  documentos: { tipo: TipoDocumento; url: string; storagePath: string; ocrData?: any }[]
): Promise<ExpansionActionResult> {
  try {
    console.log('[saveDocumentosCorredor] Iniciando guardado de documentos:', { registroId, documentos });

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const supabase = await createClient();

    // Verificar que el registro pertenece al usuario y está editable
    const { data: registro } = await supabase
      .from('corredores_registro')
      .select('id, usuario_id, estado')
      .eq('id', registroId)
      .single();

    if (!registro) {
      console.log('[saveDocumentosCorredor] Registro no encontrado:', registroId);
      return { success: false, error: 'Registro no encontrado' };
    }

    if (registro.usuario_id !== user.id) {
      return { success: false, error: 'No tienes permiso' };
    }

    if (!['borrador', 'observado'].includes(registro.estado)) {
      console.log('[saveDocumentosCorredor] Estado no editable:', registro.estado);
      return { success: false, error: 'No se pueden guardar documentos en el estado actual' };
    }

    console.log('[saveDocumentosCorredor] Guardando', documentos.length, 'documentos');

    // ESTRATEGIA: DELETE + INSERT para evitar conflictos de unique constraint
    // El upsert de Supabase no funciona correctamente con constraints multi-columna
    const promises = documentos.map(async (doc) => {
      console.log('[saveDocumentosCorredor] Procesando documento:', doc.tipo);

      // PASO 1: Eliminar documento existente del mismo tipo (si existe)
      const { error: deleteError } = await supabase
        .from('corredores_documentos')
        .delete()
        .eq('registro_id', registroId)
        .eq('tipo_documento', doc.tipo);

      if (deleteError) {
        console.error('[saveDocumentosCorredor] Error eliminando documento existente:', deleteError);
        // No retornamos error, continuamos con el insert
      }

      // PASO 2: Preparar datos para insertar
      const docData: any = {
        registro_id: registroId,
        tipo_documento: doc.tipo,
        storage_path: doc.storagePath,
        public_url: doc.url,
        nombre_original: null,
        content_type: null,
      };

      // Solo agregar campos opcionales si tienen valores válidos
      if (doc.ocrData) {
        docData.ocr_data = doc.ocrData;

        // ocr_confianza debe ser un entero entre 0-100, o no incluirlo
        if (doc.ocrData.confianza !== undefined && doc.ocrData.confianza !== null) {
          const confianza = Number(doc.ocrData.confianza);
          if (!isNaN(confianza) && confianza >= 0 && confianza <= 100) {
            docData.ocr_confianza = Math.round(confianza);
          }
        }
      }

      // PASO 3: Insertar nuevo documento
      return supabase
        .from('corredores_documentos')
        .insert(docData)
        .select()
        .single();
    });

    const results = await Promise.all(promises);

    // Verificar errores
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error('[saveDocumentosCorredor] Errores al guardar:', errors);
      // Mostrar el primer error para debugging
      const firstError = errors[0].error;
      const errorMsg = firstError?.message || firstError?.code || 'Error guardando algunos documentos';
      console.error('[saveDocumentosCorredor] Primer error:', errorMsg);
      return { success: false, error: `Error guardando documentos: ${errorMsg}` };
    }

    const savedDocs = results.map((r) => r.data).filter(Boolean);

    console.log('[saveDocumentosCorredor] Documentos guardados exitosamente:', savedDocs.length);

    revalidatePath('/expansion');
    return { success: true, data: savedDocs };
  } catch (error) {
    console.error('[saveDocumentosCorredor] Error en saveDocumentosCorredor:', error);
    return { success: false, error: 'Error interno' };
  }
}

// ============================================================================
// DOCUMENTOS: Subir documento de corredor
// ============================================================================

export async function uploadDocumentoCorredor(
  registroId: string,
  tipoDocumento: TipoDocumento,
  formData: FormData
): Promise<ExpansionActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const supabase = await createClient();

    // Verificar que el registro pertenece al usuario y está editable
    const { data: registro } = await supabase
      .from('corredores_registro')
      .select('id, usuario_id, estado')
      .eq('id', registroId)
      .single();

    if (!registro) {
      return { success: false, error: 'Registro no encontrado' };
    }

    if (registro.usuario_id !== user.id) {
      return { success: false, error: 'No tienes permiso' };
    }

    if (!['borrador', 'observado'].includes(registro.estado)) {
      return { success: false, error: 'No se pueden subir documentos en el estado actual' };
    }

    // Obtener archivo
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No se proporcionó archivo' };
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Tipo de archivo no permitido' };
    }

    // Validar tamaño (máx 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return { success: false, error: 'El archivo excede el tamaño máximo (5MB)' };
    }

    // Generar path único
    const ext = file.name.split('.').pop() || 'jpg';
    const storagePath = `corredores/${registroId}/${tipoDocumento}_${Date.now()}.${ext}`;

    // Subir a storage
    const { error: uploadError } = await supabase.storage
      .from('documentos-ficha')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error subiendo archivo:', uploadError);
      return { success: false, error: 'Error subiendo archivo' };
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('documentos-ficha')
      .getPublicUrl(storagePath);

    // Eliminar documento anterior del mismo tipo si existe
    await supabase
      .from('corredores_documentos')
      .delete()
      .eq('registro_id', registroId)
      .eq('tipo_documento', tipoDocumento);

    // Insertar nuevo documento
    const { data: documento, error: insertError } = await supabase
      .from('corredores_documentos')
      .insert({
        registro_id: registroId,
        tipo_documento: tipoDocumento,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        nombre_original: file.name,
        content_type: file.type,
        size_bytes: file.size,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error registrando documento:', insertError);
      return { success: false, error: 'Error registrando documento' };
    }

    revalidatePath('/expansion');
    return { success: true, data: documento };
  } catch (error) {
    console.error('Error en uploadDocumentoCorredor:', error);
    return { success: false, error: 'Error interno' };
  }
}

// ============================================================================
// DOCUMENTOS: Actualizar datos OCR de documento
// ============================================================================

export async function updateDocumentoOCR(
  documentoId: string,
  ocrData: Record<string, any>,
  confianza: number
): Promise<ExpansionActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const supabase = await createClient();

    // Verificar que el documento pertenece a un registro del usuario
    const { data: documento } = await supabase
      .from('corredores_documentos')
      .select('registro_id, registro:corredores_registro(usuario_id)')
      .eq('id', documentoId)
      .single();

    if (!documento) {
      return { success: false, error: 'Documento no encontrado' };
    }

    // @ts-ignore - TypeScript issue with nested select
    if (documento.registro?.usuario_id !== user.id) {
      return { success: false, error: 'No tienes permiso' };
    }

    // Actualizar OCR data
    const { data: updated, error } = await supabase
      .from('corredores_documentos')
      .update({
        ocr_data: ocrData,
        ocr_confianza: confianza,
      })
      .eq('id', documentoId)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando OCR:', error);
      return { success: false, error: 'Error actualizando OCR' };
    }

    return { success: true, data: updated };
  } catch (error) {
    console.error('Error en updateDocumentoOCR:', error);
    return { success: false, error: 'Error interno' };
  }
}

// ============================================================================
// DOCUMENTOS: Eliminar documento por URL
// ============================================================================

export async function deleteDocumentoByUrl(
  registroId: string,
  tipoDocumento: TipoDocumento,
  publicUrl: string
): Promise<ExpansionActionResult> {
  console.log('[deleteDocumentoByUrl] Inicio:', { registroId, tipoDocumento, publicUrl: publicUrl.substring(0, 80) });

  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('[deleteDocumentoByUrl] No autenticado');
      return { success: false, error: 'No autenticado' };
    }
    console.log('[deleteDocumentoByUrl] Usuario:', user.id);

    const supabase = await createClient();

    // Verificar que el registro pertenece al usuario
    const { data: registro, error: regError } = await supabase
      .from('corredores_registro')
      .select('id, usuario_id, estado')
      .eq('id', registroId)
      .single();

    console.log('[deleteDocumentoByUrl] Registro:', registro, 'Error:', regError);

    if (!registro || registro.usuario_id !== user.id) {
      console.log('[deleteDocumentoByUrl] Sin permiso - usuario_id:', registro?.usuario_id, 'user.id:', user.id);
      return { success: false, error: 'No tienes permiso' };
    }

    if (!['borrador', 'observado'].includes(registro.estado)) {
      console.log('[deleteDocumentoByUrl] Estado no permitido:', registro.estado);
      return { success: false, error: 'No se pueden eliminar documentos en el estado actual' };
    }

    // Buscar el documento por URL y tipo
    const { data: documento, error: docError } = await supabase
      .from('corredores_documentos')
      .select('id, storage_path, public_url')
      .eq('registro_id', registroId)
      .eq('tipo_documento', tipoDocumento)
      .eq('public_url', publicUrl)
      .single();

    console.log('[deleteDocumentoByUrl] Documento encontrado:', documento, 'Error:', docError);

    if (!documento) {
      // Intentar buscar sin el filtro de URL para debuggear
      const { data: allDocs } = await supabase
        .from('corredores_documentos')
        .select('id, tipo_documento, public_url')
        .eq('registro_id', registroId)
        .eq('tipo_documento', tipoDocumento);
      console.log('[deleteDocumentoByUrl] Documentos del mismo tipo:', allDocs);
      return { success: false, error: 'Documento no encontrado' };
    }

    // Eliminar de storage
    if (documento.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('documentos-ficha')
        .remove([documento.storage_path]);
      console.log('[deleteDocumentoByUrl] Storage eliminado:', documento.storage_path, 'Error:', storageError);
    }

    // Eliminar registro
    const { error } = await supabase
      .from('corredores_documentos')
      .delete()
      .eq('id', documento.id);

    console.log('[deleteDocumentoByUrl] Delete ejecutado, error:', error);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/expansion');
    console.log('[deleteDocumentoByUrl] ✅ Éxito');
    return { success: true };
  } catch (error) {
    console.error('[deleteDocumentoByUrl] Error:', error);
    return { success: false, error: 'Error interno' };
  }
}

// ============================================================================
// DOCUMENTOS: Eliminar documento
// ============================================================================

export async function deleteDocumentoCorredor(documentoId: string): Promise<ExpansionActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const supabase = await createClient();

    // Obtener documento y verificar permisos
    const { data: documento } = await supabase
      .from('corredores_documentos')
      .select('storage_path, registro:corredores_registro(usuario_id, estado)')
      .eq('id', documentoId)
      .single();

    if (!documento) {
      return { success: false, error: 'Documento no encontrado' };
    }

    // @ts-ignore
    if (documento.registro?.usuario_id !== user.id) {
      return { success: false, error: 'No tienes permiso' };
    }

    // @ts-ignore
    if (!['borrador', 'observado'].includes(documento.registro?.estado)) {
      return { success: false, error: 'No se puede eliminar en el estado actual' };
    }

    // Eliminar de storage
    await supabase.storage
      .from('documentos-ficha')
      .remove([documento.storage_path]);

    // Eliminar registro
    const { error } = await supabase
      .from('corredores_documentos')
      .delete()
      .eq('id', documentoId);

    if (error) {
      console.error('Error eliminando documento:', error);
      return { success: false, error: 'Error eliminando documento' };
    }

    revalidatePath('/expansion');
    return { success: true };
  } catch (error) {
    console.error('Error en deleteDocumentoCorredor:', error);
    return { success: false, error: 'Error interno' };
  }
}
