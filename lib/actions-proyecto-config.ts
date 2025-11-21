'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Types
export interface Proyecto {
  id: string;
  nombre: string;
  slug: string;
  color: string | null;
  activo: boolean;
  created_at: string | null;
}

export interface ProyectoConfiguracion {
  id: string;
  proyecto_id: string;
  tea: number | null;
  configuraciones_extra: Record<string, any>;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface ProyectoWithConfig {
  proyecto: Proyecto;
  configuracion: ProyectoConfiguracion | null;
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

    // Fetch all proyectos
    const { data: proyectos, error: proyectosError } = await supabaseAuth
      .from('proyectos')
      .select('id, nombre, slug, color, activo, created_at')
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
  data: { tea: number | null; color: string; activo: boolean }
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

    let teaResult;
    if (existingConfig) {
      // Update existing config
      const { error: updateError } = await supabaseAuth
        .from('proyecto_configuraciones')
        .update({
          tea: data.tea,
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
          configuraciones_extra: {},
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
    const { data: proyectoData, error: proyectoError } = await supabaseAuth
      .from('proyectos')
      .update({
        color: data.color,
        activo: data.activo
      })
      .eq('id', proyectoId)
      .select();

    console.log('[PROYECTO UPDATE]', { proyectoId, color: data.color, activo: data.activo, proyectoData, proyectoError });

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
