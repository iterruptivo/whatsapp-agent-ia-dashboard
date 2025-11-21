'use server';

import {
  getProyectoConfiguracion,
  createProyectoConfiguracion,
  updateProyectoConfiguracion
} from './proyecto-config';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function saveProyectoConfiguracion(
  proyectoId: string,
  data: { tea: number | null; color: string; activo: boolean }
) {
  try {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();

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

    const existingConfig = await getProyectoConfiguracion(proyectoId);

    let teaResult;
    if (existingConfig) {
      teaResult = await updateProyectoConfiguracion(proyectoId, data.tea, user.id);
    } else {
      teaResult = await createProyectoConfiguracion(proyectoId, data.tea, user.id);
    }

    if (!teaResult.success) {
      return {
        success: false,
        message: teaResult.error || 'Error al guardar TEA',
      };
    }

    const { error: proyectoError } = await supabase
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
