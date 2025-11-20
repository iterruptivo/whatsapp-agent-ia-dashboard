import { supabase } from './supabase';

export interface ProyectoConfiguracion {
  id: string;
  proyecto_id: string;
  tea: number | null;
  configuraciones_extra: Record<string, any>;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export async function getProyectoConfiguracion(proyectoId: string): Promise<ProyectoConfiguracion | null> {
  try {
    const { data, error } = await supabase
      .from('proyecto_configuraciones')
      .select('*')
      .eq('proyecto_id', proyectoId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching proyecto configuracion:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getProyectoConfiguracion:', error);
    return null;
  }
}

export async function createProyectoConfiguracion(
  proyectoId: string,
  tea: number | null,
  updatedBy: string
): Promise<{ success: boolean; data?: ProyectoConfiguracion; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('proyecto_configuraciones')
      .insert({
        proyecto_id: proyectoId,
        tea: tea,
        configuraciones_extra: {},
        updated_by: updatedBy,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating proyecto configuracion:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in createProyectoConfiguracion:', error);
    return { success: false, error: 'Error inesperado al crear configuración' };
  }
}

export async function updateProyectoConfiguracion(
  proyectoId: string,
  tea: number | null,
  updatedBy: string
): Promise<{ success: boolean; data?: ProyectoConfiguracion; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('proyecto_configuraciones')
      .update({
        tea: tea,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      })
      .eq('proyecto_id', proyectoId)
      .select()
      .single();

    if (error) {
      console.error('Error updating proyecto configuracion:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in updateProyectoConfiguracion:', error);
    return { success: false, error: 'Error inesperado al actualizar configuración' };
  }
}
