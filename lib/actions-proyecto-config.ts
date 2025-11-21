'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
    const { error: proyectoError } = await supabaseAuth
      .from('proyectos')
      .update({
        color: data.color,
        activo: data.activo
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
