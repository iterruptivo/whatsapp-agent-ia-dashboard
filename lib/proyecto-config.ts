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

// ============================================================================
// Datos legales del proyecto (tabla proyectos)
// ============================================================================

export interface ProyectoLegalData {
  razon_social: string | null;
  ruc: string | null;
  domicilio_fiscal: string | null;
  ubicacion_terreno: string | null;
  logo_url: string | null;
}

export async function getProyectoLegalData(proyectoId: string): Promise<ProyectoLegalData | null> {
  try {
    const { data, error } = await supabase
      .from('proyectos')
      .select('razon_social, ruc, domicilio_fiscal, ubicacion_terreno, logo_url')
      .eq('id', proyectoId)
      .single();

    if (error) {
      console.error('Error fetching proyecto legal data:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getProyectoLegalData:', error);
    return null;
  }
}

// ============================================================================
// Upload/Delete logo del proyecto
// ============================================================================

export async function uploadProyectoLogo(
  proyectoId: string,
  logoBlob: Blob
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileName = `${proyectoId}-${Date.now()}.png`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('logos-proyectos')
      .upload(fileName, logoBlob, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('logos-proyectos')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update proyecto with logo_url
    const { error: updateError } = await supabase
      .from('proyectos')
      .update({ logo_url: publicUrl })
      .eq('id', proyectoId);

    if (updateError) {
      console.error('Error updating proyecto logo_url:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Error in uploadProyectoLogo:', error);
    return { success: false, error: 'Error inesperado al subir logo' };
  }
}

export async function deleteProyectoLogo(
  proyectoId: string,
  currentLogoUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract file name from URL
    const urlParts = currentLogoUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];

    // Delete from Storage
    const { error: deleteError } = await supabase.storage
      .from('logos-proyectos')
      .remove([fileName]);

    if (deleteError) {
      console.error('Error deleting logo from storage:', deleteError);
      // Continue anyway to clear the URL
    }

    // Clear logo_url in proyecto
    const { error: updateError } = await supabase
      .from('proyectos')
      .update({ logo_url: null })
      .eq('id', proyectoId);

    if (updateError) {
      console.error('Error clearing proyecto logo_url:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteProyectoLogo:', error);
    return { success: false, error: 'Error inesperado al eliminar logo' };
  }
}
