'use server';

import {
  getProyectoConfiguracion,
  createProyectoConfiguracion,
  updateProyectoConfiguracion
} from './proyecto-config';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function saveProyectoTEA(proyectoId: string, tea: number | null) {
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

    if (tea !== null && (tea <= 0 || tea > 100)) {
      return {
        success: false,
        message: 'TEA debe ser mayor a 0 y menor o igual a 100',
      };
    }

    const existingConfig = await getProyectoConfiguracion(proyectoId);

    let result;
    if (existingConfig) {
      result = await updateProyectoConfiguracion(proyectoId, tea, user.id);
    } else {
      result = await createProyectoConfiguracion(proyectoId, tea, user.id);
    }

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Error al guardar TEA',
      };
    }

    return {
      success: true,
      message: 'TEA guardado exitosamente',
      data: result.data,
    };
  } catch (error) {
    console.error('Error in saveProyectoTEA:', error);
    return {
      success: false,
      message: 'Error inesperado al guardar TEA',
    };
  }
}
