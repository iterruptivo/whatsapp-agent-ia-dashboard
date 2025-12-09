'use server';

import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// ============================================================================
// MÓDULO: Administración de Usuarios
// Versión: 1.0.3 - Add service role client for admin operations
// ============================================================================

// ============================================================================
// HELPER: Crear cliente Supabase para Server Actions (con auth del usuario)
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
        setAll(cookiesToSet) {
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
// Usar SOLO para operaciones administrativas después de validar permisos
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
// INTERFACES
// ============================================================================

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'jefe_ventas' | 'vendedor' | 'vendedor_caseta' | 'finanzas';
  activo: boolean;
  vendedor_id: string | null;
  created_at: string;
  // Datos adicionales según rol
  telefono?: string | null;
  email_alternativo?: string | null;
}

export interface UsuarioConDatos extends Usuario {
  telefono: string | null;
  email_alternativo: string | null;
}

export interface CreateUsuarioData {
  nombre: string;
  email: string;
  password: string;
  rol: Usuario['rol'];
  telefono?: string;
  email_alternativo?: string;
}

export interface UpdateUsuarioData {
  id: string;
  nombre?: string;
  rol?: Usuario['rol'];
  activo?: boolean;
  telefono?: string;
  email_alternativo?: string;
}

// ============================================================================
// NOTA: La verificación de admin se hace en el middleware y en la página
// Las funciones asumen que el usuario ya fue validado como admin
// ============================================================================

// ============================================================================
// GET: Obtener todos los usuarios con sus datos adicionales
// ============================================================================

export async function getAllUsuarios(): Promise<UsuarioConDatos[]> {
  // NOTA: La verificación de admin se hace en el middleware y en la página
  const supabase = await createClient();

  // 1. Obtener todos los usuarios
  const { data: usuarios, error: errorUsuarios } = await supabase
    .from('usuarios')
    .select('*')
    .order('created_at', { ascending: false });

  if (errorUsuarios) {
    console.error('Error obteniendo usuarios:', errorUsuarios);
    return [];
  }

  if (!usuarios || usuarios.length === 0) return [];

  // 2. Obtener datos de vendedores (para roles vendedor/vendedor_caseta)
  const vendedorIds = usuarios
    .filter(u => u.vendedor_id)
    .map(u => u.vendedor_id);

  let vendedoresMap: Record<string, { telefono: string; email?: string }> = {};

  if (vendedorIds.length > 0) {
    const { data: vendedores } = await supabase
      .from('vendedores')
      .select('id, telefono, email')
      .in('id', vendedorIds);

    if (vendedores) {
      vendedoresMap = vendedores.reduce((acc, v) => {
        acc[v.id] = { telefono: v.telefono, email: v.email };
        return acc;
      }, {} as Record<string, { telefono: string; email?: string }>);
    }
  }

  // 3. Obtener datos de no-vendedores
  const noVendedorIds = usuarios
    .filter(u => !u.vendedor_id && ['admin', 'jefe_ventas', 'finanzas'].includes(u.rol))
    .map(u => u.id);

  let noVendedoresMap: Record<string, { telefono: string | null; email_alternativo: string | null }> = {};

  if (noVendedorIds.length > 0) {
    const { data: datosNoVendedores } = await supabase
      .from('usuarios_datos_no_vendedores')
      .select('usuario_id, telefono, email_alternativo')
      .in('usuario_id', noVendedorIds);

    if (datosNoVendedores) {
      noVendedoresMap = datosNoVendedores.reduce((acc, d) => {
        acc[d.usuario_id] = {
          telefono: d.telefono,
          email_alternativo: d.email_alternativo
        };
        return acc;
      }, {} as Record<string, { telefono: string | null; email_alternativo: string | null }>);
    }
  }

  // 4. Combinar datos
  const usuariosConDatos: UsuarioConDatos[] = usuarios.map(u => {
    let telefono: string | null = null;
    let email_alternativo: string | null = null;

    if (u.vendedor_id && vendedoresMap[u.vendedor_id]) {
      telefono = vendedoresMap[u.vendedor_id].telefono || null;
      email_alternativo = vendedoresMap[u.vendedor_id].email || null;
    } else if (noVendedoresMap[u.id]) {
      telefono = noVendedoresMap[u.id].telefono;
      email_alternativo = noVendedoresMap[u.id].email_alternativo;
    }

    return {
      ...u,
      telefono,
      email_alternativo
    };
  });

  return usuariosConDatos;
}

// ============================================================================
// GET: Obtener un usuario por ID
// ============================================================================

export async function getUsuarioById(id: string): Promise<UsuarioConDatos | null> {
  // NOTA: La verificación de admin se hace en el middleware y en la página
  const supabase = await createClient();

  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !usuario) return null;

  let telefono: string | null = null;
  let email_alternativo: string | null = null;

  // Obtener datos según rol
  if (usuario.vendedor_id) {
    const { data: vendedor } = await supabase
      .from('vendedores')
      .select('telefono, email')
      .eq('id', usuario.vendedor_id)
      .single();

    if (vendedor) {
      telefono = vendedor.telefono || null;
      email_alternativo = vendedor.email || null;
    }
  } else if (['admin', 'jefe_ventas', 'finanzas'].includes(usuario.rol)) {
    const { data: datos } = await supabase
      .from('usuarios_datos_no_vendedores')
      .select('telefono, email_alternativo')
      .eq('usuario_id', id)
      .single();

    if (datos) {
      telefono = datos.telefono;
      email_alternativo = datos.email_alternativo;
    }
  }

  return {
    ...usuario,
    telefono,
    email_alternativo
  };
}

// ============================================================================
// CREATE: Crear nuevo usuario
// ============================================================================

export async function createUsuario(data: CreateUsuarioData): Promise<{
  success: boolean;
  message: string;
  userId?: string;
}> {
  // NOTA: La verificación de admin se hace en el middleware y en la página
  // Usamos cliente admin (service role) para bypasear RLS en operaciones de creación
  const supabaseAdmin = createAdminClient();

  // 1. Validar email único
  const { data: existingEmail } = await supabaseAdmin
    .from('usuarios')
    .select('id')
    .eq('email', data.email)
    .single();

  if (existingEmail) {
    return { success: false, message: 'Ya existe un usuario con ese email' };
  }

  // 2. Validar teléfono único (si se proporciona)
  if (data.telefono) {
    // Buscar en vendedores
    const { data: existingVendedor } = await supabaseAdmin
      .from('vendedores')
      .select('id')
      .eq('telefono', data.telefono)
      .single();

    if (existingVendedor) {
      return { success: false, message: 'Ya existe un usuario con ese teléfono' };
    }

    // Buscar en usuarios_datos_no_vendedores
    const { data: existingNoVendedor } = await supabaseAdmin
      .from('usuarios_datos_no_vendedores')
      .select('id')
      .eq('telefono', data.telefono)
      .single();

    if (existingNoVendedor) {
      return { success: false, message: 'Ya existe un usuario con ese teléfono' };
    }
  }

  // 3. Crear usuario en auth.users usando Admin API (no requiere confirmación email)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true, // Usuario ya confirmado, puede hacer login inmediatamente
    user_metadata: {
      nombre: data.nombre,
      rol: data.rol
    }
  });

  if (authError || !authData.user) {
    console.error('Error creando auth user:', authError);
    return {
      success: false,
      message: authError?.message || 'Error al crear usuario en autenticación'
    };
  }

  const userId = authData.user.id;

  // 4. Crear registro en tabla usuarios
  let vendedor_id: string | null = null;

  // Si es vendedor, crear en tabla vendedores primero
  if (['vendedor', 'vendedor_caseta'].includes(data.rol)) {
    const { data: nuevoVendedor, error: vendedorError } = await supabaseAdmin
      .from('vendedores')
      .insert({
        nombre: data.nombre,
        telefono: data.telefono || '',
        email: data.email_alternativo || data.email
      })
      .select('id')
      .single();

    if (vendedorError) {
      console.error('Error creando vendedor:', vendedorError);
      // Intentar eliminar auth user creado
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { success: false, message: 'Error al crear datos de vendedor' };
    }

    vendedor_id = nuevoVendedor.id;
  }

  // Insertar en usuarios
  const { error: usuarioError } = await supabaseAdmin
    .from('usuarios')
    .insert({
      id: userId,
      nombre: data.nombre,
      email: data.email,
      rol: data.rol,
      activo: true,
      vendedor_id
    });

  if (usuarioError) {
    console.error('Error insertando usuario:', usuarioError);
    // Rollback: eliminar auth user
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { success: false, message: 'Error al crear registro de usuario' };
  }

  // 5. Si es NO vendedor, crear en usuarios_datos_no_vendedores
  if (['admin', 'jefe_ventas', 'finanzas'].includes(data.rol)) {
    const { error: datosError } = await supabaseAdmin
      .from('usuarios_datos_no_vendedores')
      .insert({
        usuario_id: userId,
        telefono: data.telefono || null,
        email_alternativo: data.email_alternativo || null
      });

    if (datosError) {
      console.error('Error insertando datos no vendedor:', datosError);
      // No es crítico, el usuario ya está creado
    }
  }

  revalidatePath('/admin/usuarios');
  return { success: true, message: 'Usuario creado correctamente', userId };
}

// ============================================================================
// UPDATE: Actualizar usuario
// ============================================================================

export async function updateUsuario(data: UpdateUsuarioData): Promise<{
  success: boolean;
  message: string;
}> {
  // NOTA: La verificación de admin se hace en el middleware y en la página
  const supabase = await createClient();

  // 1. Obtener usuario actual
  const { data: usuarioActual, error: fetchError } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', data.id)
    .single();

  if (fetchError || !usuarioActual) {
    return { success: false, message: 'Usuario no encontrado' };
  }

  // 2. Validar teléfono único si cambió
  if (data.telefono) {
    // Buscar en vendedores (excluyendo el actual si tiene vendedor_id)
    const vendedorQuery = supabase
      .from('vendedores')
      .select('id')
      .eq('telefono', data.telefono);

    if (usuarioActual.vendedor_id) {
      vendedorQuery.neq('id', usuarioActual.vendedor_id);
    }

    const { data: existingVendedor } = await vendedorQuery.single();
    if (existingVendedor) {
      return { success: false, message: 'Ya existe otro usuario con ese teléfono' };
    }

    // Buscar en usuarios_datos_no_vendedores (excluyendo el actual)
    const { data: existingNoVendedor } = await supabase
      .from('usuarios_datos_no_vendedores')
      .select('id')
      .eq('telefono', data.telefono)
      .neq('usuario_id', data.id)
      .single();

    if (existingNoVendedor) {
      return { success: false, message: 'Ya existe otro usuario con ese teléfono' };
    }
  }

  // 3. Actualizar tabla usuarios
  const updateUsuarioData: Record<string, unknown> = {};
  if (data.nombre !== undefined) updateUsuarioData.nombre = data.nombre;
  if (data.rol !== undefined) updateUsuarioData.rol = data.rol;
  if (data.activo !== undefined) updateUsuarioData.activo = data.activo;

  if (Object.keys(updateUsuarioData).length > 0) {
    const { error: updateError } = await supabase
      .from('usuarios')
      .update(updateUsuarioData)
      .eq('id', data.id);

    if (updateError) {
      console.error('Error actualizando usuario:', updateError);
      return { success: false, message: 'Error al actualizar usuario' };
    }
  }

  // 4. Actualizar datos según rol
  const rolActual = data.rol || usuarioActual.rol;

  if (['vendedor', 'vendedor_caseta'].includes(rolActual) && usuarioActual.vendedor_id) {
    // Actualizar vendedores
    const updateVendedorData: Record<string, unknown> = {};
    if (data.nombre !== undefined) updateVendedorData.nombre = data.nombre;
    if (data.telefono !== undefined) updateVendedorData.telefono = data.telefono;
    if (data.email_alternativo !== undefined) updateVendedorData.email = data.email_alternativo;

    if (Object.keys(updateVendedorData).length > 0) {
      await supabase
        .from('vendedores')
        .update(updateVendedorData)
        .eq('id', usuarioActual.vendedor_id);
    }
  } else if (['admin', 'jefe_ventas', 'finanzas'].includes(rolActual)) {
    // Actualizar o insertar en usuarios_datos_no_vendedores
    const { data: existingDatos } = await supabase
      .from('usuarios_datos_no_vendedores')
      .select('id')
      .eq('usuario_id', data.id)
      .single();

    if (existingDatos) {
      // Update
      const updateDatosData: Record<string, unknown> = {};
      if (data.telefono !== undefined) updateDatosData.telefono = data.telefono;
      if (data.email_alternativo !== undefined) updateDatosData.email_alternativo = data.email_alternativo;

      if (Object.keys(updateDatosData).length > 0) {
        await supabase
          .from('usuarios_datos_no_vendedores')
          .update(updateDatosData)
          .eq('usuario_id', data.id);
      }
    } else {
      // Insert (primer vez que se agregan datos)
      await supabase
        .from('usuarios_datos_no_vendedores')
        .insert({
          usuario_id: data.id,
          telefono: data.telefono || null,
          email_alternativo: data.email_alternativo || null
        });
    }
  }

  revalidatePath('/admin/usuarios');
  return { success: true, message: 'Usuario actualizado correctamente' };
}

// ============================================================================
// TOGGLE: Activar/Desactivar usuario
// ============================================================================

export async function toggleUsuarioActivo(id: string): Promise<{
  success: boolean;
  message: string;
  nuevoEstado?: boolean;
}> {
  // NOTA: La verificación de admin se hace en el middleware y en la página
  // TODO: Agregar validación para evitar desactivarse a sí mismo cuando tengamos el userId del contexto
  const supabase = await createClient();

  // Obtener estado actual
  const { data: usuario, error: fetchError } = await supabase
    .from('usuarios')
    .select('activo')
    .eq('id', id)
    .single();

  if (fetchError || !usuario) {
    return { success: false, message: 'Usuario no encontrado' };
  }

  const nuevoEstado = !usuario.activo;

  // Actualizar
  const { error: updateError } = await supabase
    .from('usuarios')
    .update({ activo: nuevoEstado })
    .eq('id', id);

  if (updateError) {
    return { success: false, message: 'Error al cambiar estado del usuario' };
  }

  revalidatePath('/admin/usuarios');
  return {
    success: true,
    message: nuevoEstado ? 'Usuario activado' : 'Usuario desactivado',
    nuevoEstado
  };
}

// ============================================================================
// RESET PASSWORD: Enviar email para restablecer contraseña
// ============================================================================

export async function resetUsuarioPassword(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  // NOTA: La verificación de admin se hace en el middleware y en la página
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`
  });

  if (error) {
    console.error('Error enviando reset password:', error);
    return {
      success: false,
      message: error.message || 'Error al enviar email de restablecimiento'
    };
  }

  return {
    success: true,
    message: 'Se ha enviado un email para restablecer la contraseña'
  };
}

// ============================================================================
// STATS: Obtener estadísticas de usuarios
// ============================================================================

export async function getUsuariosStats(): Promise<{
  total: number;
  activos: number;
  inactivos: number;
  porRol: Record<string, number>;
}> {
  // NOTA: La verificación de admin se hace en el middleware y en la página
  const supabase = await createClient();

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('rol, activo');

  if (!usuarios) {
    return { total: 0, activos: 0, inactivos: 0, porRol: {} };
  }

  const stats = {
    total: usuarios.length,
    activos: usuarios.filter(u => u.activo).length,
    inactivos: usuarios.filter(u => !u.activo).length,
    porRol: usuarios.reduce((acc, u) => {
      acc[u.rol] = (acc[u.rol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  return stats;
}
