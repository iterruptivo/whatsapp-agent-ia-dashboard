'use server';

// ============================================================================
// SERVER ACTIONS: Reuniones
// ============================================================================
// CRUD de reuniones y filtros
// ============================================================================

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
import {
  Reunion,
  ReunionActionItem,
  GetReunionesParams,
  GetReunionDetalleResponse,
} from '@/types/reuniones';
import { createHash, randomBytes } from 'crypto';

// ============================================================================
// OBTENER LISTA DE REUNIONES
// ============================================================================

export async function getReuniones(params: GetReunionesParams = {}) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autorizado', reuniones: [], total: 0 };
    }

    // Obtener datos del usuario para verificar permisos
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!usuario) {
      return { success: false, error: 'Usuario no encontrado', reuniones: [], total: 0 };
    }

    // Construir query
    let query = supabase
      .from('reuniones')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // LÓGICA DE PERMISOS DE VISIBILIDAD
    // superadmin/admin/gerencia: Pueden ver TODAS las reuniones sin restricción
    // Otros roles: Solo ven reuniones donde:
    //   - Son creadores (created_by = user.id)
    //   - Su rol está en roles_permitidos
    //   - Su user.id está en usuarios_permitidos
    const rolesAdministrativos = ['superadmin', 'admin', 'gerencia'];
    const esRolAdministrativo = rolesAdministrativos.includes(usuario.rol);

    if (!esRolAdministrativo) {
      // Roles no administrativos: aplicar filtros de permisos
      query = query.or(
        `created_by.eq.${user.id},usuarios_permitidos.cs.{${user.id}},roles_permitidos.cs.{${usuario.rol}}`
      );
    }
    // Si es rol administrativo, NO aplicamos ningún filtro de permisos (ve todo)

    // Aplicar filtro de creador
    if (params.created_by_filter) {
      if (params.created_by_filter === 'mine') {
        query = query.eq('created_by', user.id);
      } else if (params.created_by_filter !== 'all') {
        // Filtro por usuario específico
        query = query.eq('created_by', params.created_by_filter);
      }
      // 'all' = no aplicar filtro adicional
    }

    // Aplicar filtros existentes
    if (params.proyecto_id) {
      query = query.eq('proyecto_id', params.proyecto_id);
    }

    if (params.estado) {
      query = query.eq('estado', params.estado);
    }

    if (params.created_by) {
      query = query.eq('created_by', params.created_by);
    }

    if (params.fecha_desde) {
      query = query.gte('fecha_reunion', params.fecha_desde);
    }

    if (params.fecha_hasta) {
      query = query.lte('fecha_reunion', params.fecha_hasta);
    }

    // Paginación
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[getReuniones] Error:', error);
      return { success: false, error: error.message, reuniones: [], total: 0 };
    }

    return {
      success: true,
      reuniones: (data as Reunion[]) || [],
      total: count || 0,
      hasMore: count ? offset + limit < count : false,
    };
  } catch (error: any) {
    console.error('[getReuniones] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener reuniones',
      reuniones: [],
      total: 0,
    };
  }
}

// ============================================================================
// OBTENER DETALLE DE REUNIÓN
// ============================================================================

export async function getReunionDetalle(
  reunionId: string
): Promise<{ success: boolean; data?: GetReunionDetalleResponse; error?: string }> {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autorizado' };
    }

    // Obtener datos del usuario
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!usuario) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // Obtener reunión
    const { data: reunion, error: reunionError } = await supabase
      .from('reuniones')
      .select('*')
      .eq('id', reunionId)
      .single();

    if (reunionError) {
      console.error('[getReunionDetalle] Error:', reunionError);
      return { success: false, error: reunionError.message };
    }

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada' };
    }

    // VERIFICAR PERMISOS DE VISIBILIDAD
    // superadmin/admin/gerencia: Pueden ver TODAS las reuniones sin restricción
    // Otros roles: Solo ven reuniones donde:
    //   - Son creadores (created_by = user.id)
    //   - Su rol está en roles_permitidos
    //   - Su user.id está en usuarios_permitidos
    const rolesAdministrativos = ['superadmin', 'admin', 'gerencia'];
    const esRolAdministrativo = rolesAdministrativos.includes(usuario.rol);

    if (!esRolAdministrativo) {
      // Roles no administrativos: validar permisos
      const esCreador = reunion.created_by === user.id;
      const estaEnUsuariosPermitidos = reunion.usuarios_permitidos?.includes(user.id);
      const estaEnRolesPermitidos = reunion.roles_permitidos?.includes(usuario.rol);

      const tienePermiso = esCreador || estaEnUsuariosPermitidos || estaEnRolesPermitidos;

      if (!tienePermiso) {
        return { success: false, error: 'No tienes permiso para ver esta reunión' };
      }
    }
    // Si es rol administrativo, tiene acceso automático (no validamos permisos)

    // Obtener action items
    const { data: actionItems, error: actionItemsError } = await supabase
      .from('reunion_action_items')
      .select('*')
      .eq('reunion_id', reunionId)
      .order('created_at', { ascending: true });

    if (actionItemsError) {
      console.error('[getReunionDetalle] Error action items:', actionItemsError);
      return {
        success: false,
        error: actionItemsError.message,
      };
    }

    return {
      success: true,
      data: {
        reunion: reunion as Reunion,
        actionItems: (actionItems as ReunionActionItem[]) || [],
      },
    };
  } catch (error: any) {
    console.error('[getReunionDetalle] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener detalle de reunión',
    };
  }
}

// ============================================================================
// ACTUALIZAR ESTADO DE REUNIÓN
// ============================================================================

export async function updateReunionEstado(
  reunionId: string,
  estado: 'procesando' | 'completado' | 'error',
  errorMensaje?: string
) {
  try {
    const supabase = await createClient();

    const updateData: any = {
      estado,
      updated_at: new Date().toISOString(),
    };

    if (estado === 'completado') {
      updateData.processed_at = new Date().toISOString();
    }

    if (estado === 'error' && errorMensaje) {
      updateData.error_mensaje = errorMensaje;
    }

    const { error } = await supabase
      .from('reuniones')
      .update(updateData)
      .eq('id', reunionId);

    if (error) {
      console.error('[updateReunionEstado] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[updateReunionEstado] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al actualizar estado',
    };
  }
}

// ============================================================================
// ELIMINAR REUNIÓN (Solo creador)
// ============================================================================

export async function deleteReunion(reunionId: string) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autorizado' };
    }

    // Obtener reunión para verificar permisos
    const { data: reunion } = await supabase
      .from('reuniones')
      .select('created_by, media_storage_path')
      .eq('id', reunionId)
      .single();

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada' };
    }

    // Verificar que es el creador
    const esCreador = reunion.created_by === user.id;

    if (!esCreador) {
      return {
        success: false,
        error: 'Solo el creador puede eliminar esta reunión',
      };
    }

    // Eliminar archivo del storage si existe
    if (reunion.media_storage_path) {
      await supabase.storage
        .from('reuniones-media')
        .remove([reunion.media_storage_path]);
    }

    // Eliminar reunión (cascade eliminará action items)
    const { error } = await supabase
      .from('reuniones')
      .delete()
      .eq('id', reunionId);

    if (error) {
      console.error('[deleteReunion] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[deleteReunion] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al eliminar reunión',
    };
  }
}

// ============================================================================
// COMPARTIR REUNIÓN (Activar link público)
// ============================================================================

export async function compartirReunion(reunionId: string) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autorizado' };
    }

    // Obtener reunión para verificar permisos
    const { data: reunion } = await supabase
      .from('reuniones')
      .select('created_by')
      .eq('id', reunionId)
      .single();

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada' };
    }

    // Verificar que es el creador
    const esCreador = reunion.created_by === user.id;

    if (!esCreador) {
      return {
        success: false,
        error: 'Solo el creador puede compartir esta reunión',
      };
    }

    // Generar link token único
    const token = randomBytes(32).toString('hex');

    // Activar es_publico y guardar token
    const { error } = await supabase
      .from('reuniones')
      .update({
        es_publico: true,
        link_token: token,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reunionId);

    if (error) {
      console.error('[compartirReunion] Error:', error);
      return { success: false, error: error.message };
    }

    // Generar URL completa
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/reuniones/compartida/${token}`;

    return { success: true, token, shareUrl };
  } catch (error: any) {
    console.error('[compartirReunion] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al compartir reunión',
    };
  }
}

// ============================================================================
// DESACTIVAR COMPARTIR (Desactivar link público)
// ============================================================================

export async function desactivarCompartir(reunionId: string) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autorizado' };
    }

    // Obtener reunión para verificar permisos
    const { data: reunion } = await supabase
      .from('reuniones')
      .select('created_by')
      .eq('id', reunionId)
      .single();

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada' };
    }

    // Verificar que es el creador
    const esCreador = reunion.created_by === user.id;

    if (!esCreador) {
      return {
        success: false,
        error: 'Solo el creador puede desactivar el compartir de esta reunión',
      };
    }

    // Desactivar es_publico
    const { error } = await supabase
      .from('reuniones')
      .update({
        es_publico: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reunionId);

    if (error) {
      console.error('[desactivarCompartir] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[desactivarCompartir] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al desactivar compartir',
    };
  }
}

// ============================================================================
// REGENERAR LINK TOKEN (Invalidar link anterior y crear nuevo)
// ============================================================================

export async function regenerarLinkToken(reunionId: string) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autorizado' };
    }

    // Obtener reunión para verificar permisos
    const { data: reunion } = await supabase
      .from('reuniones')
      .select('created_by, es_publico')
      .eq('id', reunionId)
      .single();

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada' };
    }

    // Verificar que es el creador
    const esCreador = reunion.created_by === user.id;

    if (!esCreador) {
      return {
        success: false,
        error: 'Solo el creador puede regenerar el link de esta reunión',
      };
    }

    if (!reunion.es_publico) {
      return {
        success: false,
        error: 'La reunión no está compartida. Activa el compartir primero.',
      };
    }

    // Generar nuevo token
    const newToken = randomBytes(32).toString('hex');

    // Actualizar token
    const { error } = await supabase
      .from('reuniones')
      .update({
        link_token: newToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reunionId);

    if (error) {
      console.error('[regenerarLinkToken] Error:', error);
      return { success: false, error: error.message };
    }

    // Generar nueva URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/reuniones/compartida/${newToken}`;

    return { success: true, token: newToken, shareUrl };
  } catch (error: any) {
    console.error('[regenerarLinkToken] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al regenerar link',
    };
  }
}

// ============================================================================
// ACTUALIZAR PERMISOS DE REUNIÓN (usuarios y roles permitidos)
// ============================================================================

export async function actualizarPermisosReunion(
  reunionId: string,
  params: { usuarios_permitidos?: string[]; roles_permitidos?: string[] }
) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autorizado' };
    }

    // Obtener reunión para verificar permisos
    const { data: reunion } = await supabase
      .from('reuniones')
      .select('created_by')
      .eq('id', reunionId)
      .single();

    if (!reunion) {
      return { success: false, error: 'Reunión no encontrada' };
    }

    // Verificar que es el creador
    const esCreador = reunion.created_by === user.id;

    if (!esCreador) {
      return {
        success: false,
        error: 'Solo el creador puede actualizar permisos de esta reunión',
      };
    }

    // Construir objeto de actualización
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (params.usuarios_permitidos !== undefined) {
      updateData.usuarios_permitidos = params.usuarios_permitidos;
    }

    if (params.roles_permitidos !== undefined) {
      updateData.roles_permitidos = params.roles_permitidos;
    }

    // Actualizar permisos
    const { error } = await supabase
      .from('reuniones')
      .update(updateData)
      .eq('id', reunionId);

    if (error) {
      console.error('[actualizarPermisosReunion] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[actualizarPermisosReunion] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al actualizar permisos',
    };
  }
}

// ============================================================================
// OBTENER REUNIÓN POR TOKEN (Acceso público mediante link)
// ============================================================================

export async function getReunionPorToken(token: string) {
  try {
    const supabase = await createClient();

    // NO se requiere autenticación para acceso por link público

    // Buscar reunión por token
    const { data: reunion, error: reunionError } = await supabase
      .from('reuniones')
      .select('*')
      .eq('link_token', token)
      .eq('es_publico', true)
      .single();

    if (reunionError || !reunion) {
      console.error('[getReunionPorToken] Error:', reunionError);
      return {
        success: false,
        error: 'Link inválido o expirado',
      };
    }

    // Obtener action items
    const { data: actionItems, error: actionItemsError } = await supabase
      .from('reunion_action_items')
      .select('*')
      .eq('reunion_id', reunion.id)
      .order('created_at', { ascending: true });

    if (actionItemsError) {
      console.error('[getReunionPorToken] Error action items:', actionItemsError);
      // No es crítico, podemos retornar la reunión sin action items
    }

    return {
      success: true,
      data: {
        reunion: reunion as Reunion,
        actionItems: (actionItems as ReunionActionItem[]) || [],
      },
    };
  } catch (error: any) {
    console.error('[getReunionPorToken] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al obtener reunión',
    };
  }
}

// ============================================================================
// CREAR REUNIÓN (con validación de permisos)
// ============================================================================

export async function createReunion(data: {
  proyecto_id: string;
  titulo: string;
  fecha_reunion?: string;
}) {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autorizado' };
    }

    // Verificar que tiene permiso para crear reuniones
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!usuario) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // SOLO superadmin/admin/gerencia pueden crear reuniones
    const puedeCrear = ['superadmin', 'admin', 'gerencia'].includes(usuario.rol);

    if (!puedeCrear) {
      return {
        success: false,
        error: 'Solo administradores y gerencia pueden crear reuniones',
      };
    }

    // VALIDACIÓN: Verificar que el proyecto existe y está activo
    const { data: proyecto } = await supabase
      .from('proyectos')
      .select('id')
      .eq('id', data.proyecto_id)
      .eq('activo', true)
      .single();

    if (!proyecto) {
      return {
        success: false,
        error: 'Proyecto no encontrado o inactivo',
      };
    }

    // Roles que tienen acceso por defecto a las reuniones
    const ROLES_ACCESO_DEFECTO = ['superadmin', 'admin', 'gerencia'];

    // Crear reunión con roles por defecto
    const { data: reunion, error } = await supabase
      .from('reuniones')
      .insert({
        proyecto_id: data.proyecto_id,
        titulo: data.titulo,
        fecha_reunion: data.fecha_reunion || null,
        created_by: user.id,
        estado: 'procesando',
        roles_permitidos: ROLES_ACCESO_DEFECTO, // Por defecto: superadmin, admin, gerencia
      })
      .select()
      .single();

    if (error) {
      console.error('[createReunion] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, reunionId: reunion.id };
  } catch (error: any) {
    console.error('[createReunion] Error inesperado:', error);
    return {
      success: false,
      error: error.message || 'Error al crear reunión',
    };
  }
}
