'use server';

import { createClient } from '@/lib/supabase/server';

export interface Evidencia {
  id: string;
  lead_id: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_rol: string;
  archivo_url: string;
  archivo_tipo: 'imagen' | 'video';
  archivo_nombre: string;
  archivo_size: number | null;
  created_at: string;
}

export async function getEvidenciasByLeadId(leadId: string): Promise<Evidencia[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('lead_evidencias')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching evidencias:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getEvidenciasByLeadId:', error);
    return [];
  }
}

export async function uploadEvidencia(
  leadId: string,
  usuarioId: string,
  usuarioNombre: string,
  usuarioRol: string,
  archivoUrl: string,
  archivoTipo: 'imagen' | 'video',
  archivoNombre: string,
  archivoSize: number
): Promise<{ success: boolean; evidencia?: Evidencia; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('lead_evidencias')
      .insert({
        lead_id: leadId,
        usuario_id: usuarioId,
        usuario_nombre: usuarioNombre,
        usuario_rol: usuarioRol,
        archivo_url: archivoUrl,
        archivo_tipo: archivoTipo,
        archivo_nombre: archivoNombre,
        archivo_size: archivoSize,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting evidencia:', error);
      return { success: false, error: error.message };
    }

    return { success: true, evidencia: data };
  } catch (error) {
    console.error('Error in uploadEvidencia:', error);
    return { success: false, error: 'Error al guardar evidencia' };
  }
}
