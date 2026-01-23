'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Sesión 64: Interfaces para datos legales de documentos
export interface RepresentanteLegal {
  nombre: string;
  dni: string;
  cargo: string;
}

export interface CuentaBancaria {
  banco: string;
  numero: string;
  tipo: 'Corriente' | 'Ahorros';
  moneda: 'USD' | 'PEN';
}

// Types
export interface Proyecto {
  id: string;
  nombre: string;
  slug: string;
  color: string | null;
  activo: boolean;
  created_at: string | null;
  // Sesión 64: Campos para generación de documentos legales
  razon_social?: string | null;
  ruc?: string | null;
  domicilio_fiscal?: string | null;
  ubicacion_terreno?: string | null;
  denominacion_proyecto?: string | null;
  partida_electronica?: string | null;
  partida_electronica_predio?: string | null;
  zona_registral?: string | null;
  plazo_firma_dias?: number;
  penalidad_porcentaje?: number;
  representantes_legales?: RepresentanteLegal[];
  cuentas_bancarias?: CuentaBancaria[];
  // Sesión 66: Logo del proyecto
  logo_url?: string | null;
  // Sesión 66: Template de contrato Word
  contrato_template_url?: string | null;
}

export interface PorcentajeInicial {
  value: number;
  order: number;
}

export interface CuotaMeses {
  value: number;
  order: number;
}

// SESIÓN 54: Configuración de comisiones por rol
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'gerencia' | 'jefe_ventas' | 'vendedor' | 'vendedor_caseta' | 'coordinador' | 'finanzas' | 'marketing' | 'superadmin' | 'corredor' | 'legal' | 'vendedor_externo' | 'postventa';
  vendedor_id: string | null;
  activo: boolean;
}

export interface ComisionRol {
  rol: 'admin' | 'jefe_ventas' | 'vendedor' | 'vendedor_caseta' | 'coordinador' | 'finanzas';
  usuarios_ids: string[]; // IDs de usuarios seleccionados
  porcentaje: number; // Puede ser decimal (10.5)
  order: number;
}

export interface ProyectoConfiguracion {
  id: string;
  proyecto_id: string;
  tea: number | null;
  configuraciones_extra: {
    porcentajes_inicial?: PorcentajeInicial[];
    cuotas_sin_interes?: CuotaMeses[];
    cuotas_con_interes?: CuotaMeses[];
    comisiones?: ComisionRol[]; // SESIÓN 54
  };
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface ProyectoWithConfig {
  proyecto: Proyecto;
  configuracion: ProyectoConfiguracion | null;
}

// SESIÓN 54: Obtener usuarios activos filtrados por rol
export async function getUsuariosActivosPorRol(
  rol?: 'admin' | 'jefe_ventas' | 'vendedor' | 'vendedor_caseta'
): Promise<{
  success: boolean;
  data?: Usuario[];
  message?: string;
}> {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
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

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: 'Usuario no autenticado',
      };
    }

    // Build query
    let query = supabaseAuth
      .from('usuarios')
      .select('id, nombre, email, rol, vendedor_id, activo')
      .eq('activo', true); // Solo usuarios activos

    // Filter by rol if provided
    if (rol) {
      query = query.eq('rol', rol);
    }

    const { data: usuarios, error: usuariosError } = await query.order('nombre', { ascending: true });

    if (usuariosError) {
      console.error('Error fetching usuarios:', usuariosError);
      return {
        success: false,
        message: 'Error al cargar usuarios',
      };
    }

    return {
      success: true,
      data: usuarios || [],
    };
  } catch (error) {
    console.error('Error in getUsuariosActivosPorRol:', error);
    return {
      success: false,
      message: 'Error inesperado al cargar usuarios',
    };
  }
}

export async function getProyectosWithConfigurations(): Promise<{
  success: boolean;
  data?: ProyectoWithConfig[];
  message?: string;
}> {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
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

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: 'Usuario no autenticado',
      };
    }

    // Fetch all proyectos (incluye campos legales - Sesión 64, logo y contrato_template_url - Sesión 66)
    const { data: proyectos, error: proyectosError } = await supabaseAuth
      .from('proyectos')
      .select('id, nombre, slug, color, activo, created_at, razon_social, ruc, domicilio_fiscal, ubicacion_terreno, denominacion_proyecto, partida_electronica, partida_electronica_predio, zona_registral, plazo_firma_dias, penalidad_porcentaje, representantes_legales, cuentas_bancarias, logo_url, contrato_template_url')
      .order('created_at', { ascending: true });

    if (proyectosError) {
      console.error('Error fetching proyectos:', proyectosError);
      return {
        success: false,
        message: 'Error al cargar proyectos',
      };
    }

    // Fetch all configuraciones
    const { data: configuraciones, error: configError } = await supabaseAuth
      .from('proyecto_configuraciones')
      .select('*');

    if (configError) {
      console.error('Error fetching configuraciones:', configError);
      return {
        success: false,
        message: 'Error al cargar configuraciones',
      };
    }

    // Map proyectos with their configurations
    const proyectosWithConfig: ProyectoWithConfig[] = proyectos.map((proyecto) => ({
      proyecto,
      configuracion: configuraciones?.find((c) => c.proyecto_id === proyecto.id) || null,
    }));

    return {
      success: true,
      data: proyectosWithConfig,
    };
  } catch (error) {
    console.error('Error in getProyectosWithConfigurations:', error);
    return {
      success: false,
      message: 'Error inesperado al cargar proyectos',
    };
  }
}

export async function saveProyectoConfiguracion(
  proyectoId: string,
  data: {
    tea: number | null;
    color: string;
    activo: boolean;
    porcentajes_inicial?: PorcentajeInicial[];
    cuotas_sin_interes?: CuotaMeses[];
    cuotas_con_interes?: CuotaMeses[];
    comisiones?: ComisionRol[]; // SESIÓN 54
    // SESIÓN 64: Datos para trámites legales
    razon_social?: string;
    ruc?: string;
    domicilio_fiscal?: string;
    ubicacion_terreno?: string;
    denominacion_proyecto?: string;
    partida_electronica?: string;
    partida_electronica_predio?: string;
    zona_registral?: string;
    plazo_firma_dias?: number;
    penalidad_porcentaje?: number;
    representantes_legales?: RepresentanteLegal[];
    cuentas_bancarias?: CuentaBancaria[];
  }
) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
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

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        message: 'Usuario no autenticado',
      };
    }

    if (data.tea !== null && (data.tea <= 0 || data.tea > 100)) {
      return {
        success: false,
        message: 'TEA debe ser mayor a 0 y menor o igual a 100',
      };
    }

    if (!data.color || !/^#[0-9A-F]{6}$/i.test(data.color)) {
      return {
        success: false,
        message: 'Color debe ser un código hexadecimal válido (ej: #1b967a)',
      };
    }

    // Query existing config directly with supabaseAuth (authenticated context)
    const { data: existingConfig } = await supabaseAuth
      .from('proyecto_configuraciones')
      .select('*')
      .eq('proyecto_id', proyectoId)
      .maybeSingle();

    // SESIÓN 54: Validaciones de comisiones
    if (data.comisiones && data.comisiones.length > 0) {
      // Validar que porcentajes sean válidos
      for (const comision of data.comisiones) {
        if (comision.porcentaje <= 0 || comision.porcentaje > 100) {
          return {
            success: false,
            message: `Porcentaje de comisión debe ser mayor a 0 y menor o igual a 100 (rol: ${comision.rol})`,
          };
        }

        // Validar que al menos haya un usuario seleccionado
        if (comision.usuarios_ids.length === 0) {
          return {
            success: false,
            message: `Debe seleccionar al menos un usuario para la comisión (rol: ${comision.rol})`,
          };
        }

        // Validar que usuarios existan y pertenezcan al rol especificado
        const { data: usuarios, error: usuariosError } = await supabaseAuth
          .from('usuarios')
          .select('id, rol')
          .in('id', comision.usuarios_ids);

        if (usuariosError || !usuarios) {
          return {
            success: false,
            message: `Error al validar usuarios de la comisión (rol: ${comision.rol})`,
          };
        }

        // Verificar que todos los usuarios pertenecen al rol
        const usuariosInvalidos = usuarios.filter(u => u.rol !== comision.rol);
        if (usuariosInvalidos.length > 0) {
          return {
            success: false,
            message: `Algunos usuarios no pertenecen al rol ${comision.rol}`,
          };
        }

        // Verificar que todos los IDs fueron encontrados
        if (usuarios.length !== comision.usuarios_ids.length) {
          return {
            success: false,
            message: `Algunos usuarios no fueron encontrados (rol: ${comision.rol})`,
          };
        }
      }
    }

    // Build configuraciones_extra with all arrays
    const configuraciones_extra = {
      ...(existingConfig?.configuraciones_extra || {}),
      porcentajes_inicial: data.porcentajes_inicial || [],
      cuotas_sin_interes: data.cuotas_sin_interes || [],
      cuotas_con_interes: data.cuotas_con_interes || [],
      comisiones: data.comisiones || [] // SESIÓN 54
    };

    let teaResult;
    if (existingConfig) {
      // Update existing config
      const { error: updateError } = await supabaseAuth
        .from('proyecto_configuraciones')
        .update({
          tea: data.tea,
          configuraciones_extra,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('proyecto_id', proyectoId);

      if (updateError) {
        console.error('Error updating proyecto configuracion:', updateError);
        teaResult = { success: false, error: updateError.message };
      } else {
        teaResult = { success: true };
      }
    } else {
      // Insert new config
      const { error: insertError } = await supabaseAuth
        .from('proyecto_configuraciones')
        .insert({
          proyecto_id: proyectoId,
          tea: data.tea,
          configuraciones_extra,
          updated_by: user.id,
        });

      if (insertError) {
        console.error('Error creating proyecto configuracion:', insertError);
        teaResult = { success: false, error: insertError.message };
      } else {
        teaResult = { success: true };
      }
    }

    if (!teaResult.success) {
      return {
        success: false,
        message: teaResult.error || 'Error al guardar TEA',
      };
    }

    // Update proyecto table with supabaseAuth (authenticated context)
    // SESIÓN 64: Incluir campos de trámites legales
    const { error: proyectoError } = await supabaseAuth
      .from('proyectos')
      .update({
        color: data.color,
        activo: data.activo,
        // Campos legales (Sesión 64)
        razon_social: data.razon_social || null,
        ruc: data.ruc || null,
        domicilio_fiscal: data.domicilio_fiscal || null,
        ubicacion_terreno: data.ubicacion_terreno || null,
        denominacion_proyecto: data.denominacion_proyecto || null,
        partida_electronica: data.partida_electronica || null,
        partida_electronica_predio: data.partida_electronica_predio || null,
        zona_registral: data.zona_registral || null,
        plazo_firma_dias: data.plazo_firma_dias || 5,
        penalidad_porcentaje: data.penalidad_porcentaje || 100,
        representantes_legales: data.representantes_legales || [],
        cuentas_bancarias: data.cuentas_bancarias || [],
      })
      .eq('id', proyectoId);

    if (proyectoError) {
      console.error('Error updating proyecto:', proyectoError);
      return {
        success: false,
        message: 'Error al guardar configuración del proyecto',
      };
    }

    return {
      success: true,
      message: 'Configuración guardada exitosamente',
    };
  } catch (error) {
    console.error('Error in saveProyectoConfiguracion:', error);
    return {
      success: false,
      message: 'Error inesperado al guardar configuración',
    };
  }
}
