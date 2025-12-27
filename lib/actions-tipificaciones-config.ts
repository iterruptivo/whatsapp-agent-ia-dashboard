'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Tipo para cookies en setAll
interface CookieSetItem {
  name: string;
  value: string;
  options?: CookieOptions;
}

/**
 * Crear cliente Supabase autenticado para server actions
 * IMPORTANTE: Este cliente tiene el contexto de auth del usuario actual
 */
async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesList: CookieSetItem[]) => {
          cookiesList.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // Ignorar errores de cookies en lecturas
            }
          });
        },
      },
    }
  );
}

// ============================================================================
// TIPOS TYPESCRIPT
// ============================================================================

export interface TipificacionNivel1 {
  id: string;
  codigo: string;
  label: string;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TipificacionNivel2 {
  id: string;
  nivel_1_codigo: string;
  codigo: string;
  label: string;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TipificacionNivel3 {
  id: string;
  codigo: string;
  label: string;
  orden: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
  uso_count?: number;
}

export interface TipificacionTreeNode {
  nivel1: TipificacionNivel1;
  nivel2List: (TipificacionNivel2 & { uso_count?: number })[];
  uso_count: number;
}

export interface TipificacionCombination {
  nivel_1_codigo: string;
  nivel_1_label: string;
  nivel_2_codigo: string;
  nivel_2_label: string;
}

export type ActionResult<T = any> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

// ============================================================================
// FUNCIONES DE LECTURA
// ============================================================================

/**
 * Obtener todas las tipificaciones de Nivel 1 activas, ordenadas
 * @returns Lista de tipificaciones N1 activas
 */
export async function getTipificacionesNivel1(): Promise<ActionResult<TipificacionNivel1[]>> {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('tipificaciones_nivel_1')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) {
      console.error('[getTipificacionesNivel1] Error:', error);
      return {
        success: false,
        error: 'Error al obtener tipificaciones N1',
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error('[getTipificacionesNivel1] Exception:', error);
    return {
      success: false,
      error: 'Error inesperado al obtener tipificaciones N1',
    };
  }
}

/**
 * Obtener todas las tipificaciones de Nivel 2 de un Nivel 1 específico
 * @param nivel1Codigo - Código del nivel 1 padre
 * @returns Lista de tipificaciones N2 activas del N1 especificado
 */
export async function getTipificacionesNivel2(
  nivel1Codigo: string
): Promise<ActionResult<TipificacionNivel2[]>> {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('tipificaciones_nivel_2')
      .select('*')
      .eq('nivel_1_codigo', nivel1Codigo)
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) {
      console.error('[getTipificacionesNivel2] Error:', error);
      return {
        success: false,
        error: 'Error al obtener tipificaciones N2',
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    console.error('[getTipificacionesNivel2] Exception:', error);
    return {
      success: false,
      error: 'Error inesperado al obtener tipificaciones N2',
    };
  }
}

/**
 * Obtener todas las tipificaciones de Nivel 3 activas con conteo de uso, ordenadas
 * @returns Lista de tipificaciones N3 activas con uso_count
 */
export async function getTipificacionesNivel3(): Promise<ActionResult<TipificacionNivel3[]>> {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('tipificaciones_nivel_3')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) {
      console.error('[getTipificacionesNivel3] Error:', error);
      return {
        success: false,
        error: 'Error al obtener tipificaciones N3',
      };
    }

    // Contar uso de cada N3
    const n3WithCount = await Promise.all(
      (data || []).map(async (n3) => {
        const { count, error: countError } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('tipificacion_nivel_3', n3.codigo);

        if (countError) {
          console.warn(`[getTipificacionesNivel3] Error contando N3 ${n3.codigo}:`, countError);
        }

        return {
          ...n3,
          uso_count: count || 0,
        };
      })
    );

    return {
      success: true,
      data: n3WithCount,
    };
  } catch (error) {
    console.error('[getTipificacionesNivel3] Exception:', error);
    return {
      success: false,
      error: 'Error inesperado al obtener tipificaciones N3',
    };
  }
}

/**
 * Obtener árbol completo de tipificaciones N1 → N2 con conteo de uso
 * Útil para la página de configuración de tipificaciones
 * @returns Árbol jerárquico con contadores de uso
 */
export async function getTipificacionesTree(): Promise<ActionResult<TipificacionTreeNode[]>> {
  try {
    const supabase = await getServerSupabase();

    // 1. Obtener todos los N1 activos
    const { data: nivel1Data, error: nivel1Error } = await supabase
      .from('tipificaciones_nivel_1')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (nivel1Error) {
      console.error('[getTipificacionesTree] Error N1:', nivel1Error);
      return {
        success: false,
        error: 'Error al obtener tipificaciones N1',
      };
    }

    // 2. Obtener todos los N2 activos
    const { data: nivel2Data, error: nivel2Error } = await supabase
      .from('tipificaciones_nivel_2')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (nivel2Error) {
      console.error('[getTipificacionesTree] Error N2:', nivel2Error);
      return {
        success: false,
        error: 'Error al obtener tipificaciones N2',
      };
    }

    // 3. Construir árbol con conteo de uso
    const tree: TipificacionTreeNode[] = [];

    for (const n1 of nivel1Data || []) {
      // Contar uso total del N1
      const { count: n1Count, error: n1CountError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('tipificacion_nivel_1', n1.codigo);

      if (n1CountError) {
        console.warn(`[getTipificacionesTree] Error contando N1 ${n1.codigo}:`, n1CountError);
      }

      // Filtrar N2 que pertenecen a este N1
      const n2List = (nivel2Data || []).filter(
        (n2) => n2.nivel_1_codigo === n1.codigo
      );

      // Contar uso de cada N2
      const n2WithCount = await Promise.all(
        n2List.map(async (n2) => {
          const { count: n2Count, error: n2CountError } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('tipificacion_nivel_2', n2.codigo);

          if (n2CountError) {
            console.warn(`[getTipificacionesTree] Error contando N2 ${n2.codigo}:`, n2CountError);
          }

          return {
            ...n2,
            uso_count: n2Count || 0,
          };
        })
      );

      tree.push({
        nivel1: n1,
        nivel2List: n2WithCount,
        uso_count: n1Count || 0,
      });
    }

    return {
      success: true,
      data: tree,
    };
  } catch (error) {
    console.error('[getTipificacionesTree] Exception:', error);
    return {
      success: false,
      error: 'Error inesperado al construir árbol de tipificaciones',
    };
  }
}

/**
 * Obtener todas las combinaciones N1+N2 posibles
 * Útil para configuración de Kanban (mapeo tipificación → columna)
 * @returns Array de combinaciones {nivel_1_codigo, nivel_1_label, nivel_2_codigo, nivel_2_label}
 */
export async function getAllTipificacionesCombinations(): Promise<
  ActionResult<TipificacionCombination[]>
> {
  try {
    const supabase = await getServerSupabase();

    // Obtener todos los N2 con JOIN a N1
    const { data, error } = await supabase
      .from('tipificaciones_nivel_2')
      .select(`
        codigo,
        label,
        nivel_1:tipificaciones_nivel_1!fk_tipif_n2_n1(
          codigo,
          label
        )
      `)
      .eq('activo', true);

    if (error) {
      console.error('[getAllTipificacionesCombinations] Error:', error);
      return {
        success: false,
        error: 'Error al obtener combinaciones de tipificaciones',
      };
    }

    // Transformar datos al formato esperado
    const combinations: TipificacionCombination[] = (data || []).map((item: any) => ({
      nivel_1_codigo: item.nivel_1?.codigo || '',
      nivel_1_label: item.nivel_1?.label || '',
      nivel_2_codigo: item.codigo,
      nivel_2_label: item.label,
    }));

    return {
      success: true,
      data: combinations,
    };
  } catch (error) {
    console.error('[getAllTipificacionesCombinations] Exception:', error);
    return {
      success: false,
      error: 'Error inesperado al obtener combinaciones',
    };
  }
}

// ============================================================================
// FUNCIONES DE ESCRITURA
// ============================================================================

/**
 * Crear una nueva tipificación de Nivel 1
 * @param data - Datos de la tipificación (codigo, label)
 * @returns Tipificación creada o error
 */
export async function createTipificacionN1(data: {
  codigo: string;
  label: string;
}): Promise<ActionResult<TipificacionNivel1>> {
  try {
    // Crear servidor client con auth context
    const cookieStore = await cookies();
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesList: CookieSetItem[]) => {
            cookiesList.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Validar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    // Validar que el código no exista ya
    const { data: existing, error: checkError } = await supabase
      .from('tipificaciones_nivel_1')
      .select('id')
      .eq('codigo', data.codigo)
      .maybeSingle();

    if (checkError) {
      console.error('[createTipificacionN1] Error verificando codigo:', checkError);
      return {
        success: false,
        error: 'Error al verificar código único',
      };
    }

    if (existing) {
      return {
        success: false,
        error: `El código "${data.codigo}" ya existe`,
      };
    }

    // Obtener el último orden
    const { data: lastItem } = await supabase
      .from('tipificaciones_nivel_1')
      .select('orden')
      .order('orden', { ascending: false })
      .limit(1)
      .maybeSingle();

    const newOrden = (lastItem?.orden || 0) + 1;

    // Insertar nueva tipificación
    const { data: newTipif, error: insertError } = await supabaseServer
      .from('tipificaciones_nivel_1')
      .insert({
        codigo: data.codigo,
        label: data.label,
        orden: newOrden,
        activo: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[createTipificacionN1] Error insertando:', insertError);
      return {
        success: false,
        error: 'Error al crear tipificación N1',
      };
    }

    revalidatePath('/configuracion-tipificaciones');
    revalidatePath('/operativo');

    return {
      success: true,
      data: newTipif,
    };
  } catch (error) {
    console.error('[createTipificacionN1] Exception:', error);
    return {
      success: false,
      error: 'Error inesperado al crear tipificación N1',
    };
  }
}

/**
 * Crear una nueva tipificación de Nivel 2
 * @param data - Datos de la tipificación (nivel_1_codigo, codigo, label)
 * @returns Tipificación creada o error
 */
export async function createTipificacionN2(data: {
  nivel_1_codigo: string;
  codigo: string;
  label: string;
}): Promise<ActionResult<TipificacionNivel2>> {
  try {
    // Crear servidor client con auth context
    const cookieStore = await cookies();
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesList: CookieSetItem[]) => {
            cookiesList.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Validar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    // Validar que el N1 exista
    const { data: n1Exists, error: n1Error } = await supabase
      .from('tipificaciones_nivel_1')
      .select('id')
      .eq('codigo', data.nivel_1_codigo)
      .eq('activo', true)
      .maybeSingle();

    if (n1Error || !n1Exists) {
      return {
        success: false,
        error: 'El nivel 1 especificado no existe o está inactivo',
      };
    }

    // Validar que la combinación N1+N2 no exista ya
    const { data: existing, error: checkError } = await supabase
      .from('tipificaciones_nivel_2')
      .select('id')
      .eq('nivel_1_codigo', data.nivel_1_codigo)
      .eq('codigo', data.codigo)
      .maybeSingle();

    if (checkError) {
      console.error('[createTipificacionN2] Error verificando codigo:', checkError);
      return {
        success: false,
        error: 'Error al verificar código único',
      };
    }

    if (existing) {
      return {
        success: false,
        error: `El código "${data.codigo}" ya existe para este nivel 1`,
      };
    }

    // Obtener el último orden dentro del grupo N1
    const { data: lastItem } = await supabase
      .from('tipificaciones_nivel_2')
      .select('orden')
      .eq('nivel_1_codigo', data.nivel_1_codigo)
      .order('orden', { ascending: false })
      .limit(1)
      .maybeSingle();

    const newOrden = (lastItem?.orden || 0) + 1;

    // Insertar nueva tipificación
    const { data: newTipif, error: insertError } = await supabaseServer
      .from('tipificaciones_nivel_2')
      .insert({
        nivel_1_codigo: data.nivel_1_codigo,
        codigo: data.codigo,
        label: data.label,
        orden: newOrden,
        activo: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[createTipificacionN2] Error insertando:', insertError);
      return {
        success: false,
        error: 'Error al crear tipificación N2',
      };
    }

    revalidatePath('/configuracion-tipificaciones');
    revalidatePath('/operativo');
    revalidatePath('/configuracion-kanban');

    return {
      success: true,
      data: newTipif,
    };
  } catch (error) {
    console.error('[createTipificacionN2] Exception:', error);
    return {
      success: false,
      error: 'Error inesperado al crear tipificación N2',
    };
  }
}

/**
 * Crear una nueva tipificación de Nivel 3
 * @param data - Datos de la tipificación (codigo, label)
 * @returns Tipificación creada o error
 */
export async function createTipificacionN3(data: {
  codigo: string;
  label: string;
}): Promise<ActionResult<TipificacionNivel3>> {
  try {
    // Crear servidor client con auth context
    const cookieStore = await cookies();
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesList: CookieSetItem[]) => {
            cookiesList.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Validar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    // Validar que el código no exista ya
    const { data: existing, error: checkError } = await supabase
      .from('tipificaciones_nivel_3')
      .select('id')
      .eq('codigo', data.codigo)
      .maybeSingle();

    if (checkError) {
      console.error('[createTipificacionN3] Error verificando codigo:', checkError);
      return {
        success: false,
        error: 'Error al verificar código único',
      };
    }

    if (existing) {
      return {
        success: false,
        error: `El código "${data.codigo}" ya existe`,
      };
    }

    // Obtener el último orden
    const { data: lastItem } = await supabase
      .from('tipificaciones_nivel_3')
      .select('orden')
      .order('orden', { ascending: false })
      .limit(1)
      .maybeSingle();

    const newOrden = (lastItem?.orden || 0) + 1;

    // Insertar nueva tipificación
    const { data: newTipif, error: insertError } = await supabaseServer
      .from('tipificaciones_nivel_3')
      .insert({
        codigo: data.codigo,
        label: data.label,
        orden: newOrden,
        activo: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[createTipificacionN3] Error insertando:', insertError);
      return {
        success: false,
        error: 'Error al crear tipificación N3',
      };
    }

    revalidatePath('/configuracion-tipificaciones');
    revalidatePath('/operativo');

    return {
      success: true,
      data: newTipif,
    };
  } catch (error) {
    console.error('[createTipificacionN3] Exception:', error);
    return {
      success: false,
      error: 'Error inesperado al crear tipificación N3',
    };
  }
}

/**
 * Actualizar una tipificación existente
 * @param nivel - Nivel de la tipificación (1, 2 o 3)
 * @param id - UUID de la tipificación
 * @param data - Datos a actualizar (label y/o orden)
 * @returns Tipificación actualizada o error
 */
export async function updateTipificacion(
  nivel: 1 | 2 | 3,
  id: string,
  data: { label?: string; orden?: number }
): Promise<ActionResult<any>> {
  try {
    // Crear servidor client con auth context
    const cookieStore = await cookies();
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesList: CookieSetItem[]) => {
            cookiesList.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Validar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    // Determinar tabla según nivel
    const tableName = `tipificaciones_nivel_${nivel}`;

    // Actualizar tipificación
    const { data: updated, error: updateError } = await supabaseServer
      .from(tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error(`[updateTipificacion] Error actualizando N${nivel}:`, updateError);
      return {
        success: false,
        error: `Error al actualizar tipificación N${nivel}`,
      };
    }

    revalidatePath('/configuracion-tipificaciones');
    revalidatePath('/operativo');
    if (nivel === 2) {
      revalidatePath('/configuracion-kanban');
    }

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error('[updateTipificacion] Exception:', error);
    return {
      success: false,
      error: 'Error inesperado al actualizar tipificación',
    };
  }
}

/**
 * Activar o desactivar una tipificación
 * VALIDACIÓN: No se puede desactivar si está en uso por leads
 * @param nivel - Nivel de la tipificación (1, 2 o 3)
 * @param id - UUID de la tipificación
 * @returns Resultado de la operación con mensaje
 */
export async function toggleTipificacionActivo(
  nivel: 1 | 2 | 3,
  id: string
): Promise<ActionResult<{ activo: boolean; message: string }>> {
  try {
    // Crear servidor client con auth context
    const cookieStore = await cookies();
    const supabaseServer = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesList: CookieSetItem[]) => {
            cookiesList.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Validar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabaseServer.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'No autenticado',
      };
    }

    // Determinar tabla según nivel
    const tableName = `tipificaciones_nivel_${nivel}`;

    // Obtener tipificación actual
    const { data: tipif, error: fetchError } = await supabaseServer
      .from(tableName)
      .select('id, codigo, activo')
      .eq('id', id)
      .single();

    if (fetchError || !tipif) {
      console.error(`[toggleTipificacionActivo] Error obteniendo N${nivel}:`, fetchError);
      return {
        success: false,
        error: 'Tipificación no encontrada',
      };
    }

    const newActivo = !tipif.activo;

    // Si se va a DESACTIVAR, verificar que no esté en uso
    if (!newActivo) {
      // Usar función de BD para contar uso
      const { data: usoCount, error: countError } = await supabaseServer.rpc(
        'get_tipificacion_uso_count',
        {
          nivel: nivel,
          codigo_tipif: tipif.codigo,
        }
      );

      if (countError) {
        console.error('[toggleTipificacionActivo] Error contando uso:', countError);
        return {
          success: false,
          error: 'Error al verificar uso de la tipificación',
        };
      }

      if (usoCount && usoCount > 0) {
        return {
          success: false,
          error: `No se puede desactivar: ${usoCount} lead(s) la están usando`,
        };
      }
    }

    // Actualizar estado activo
    const { error: updateError } = await supabaseServer
      .from(tableName)
      .update({ activo: newActivo })
      .eq('id', id);

    if (updateError) {
      console.error(`[toggleTipificacionActivo] Error actualizando N${nivel}:`, updateError);
      return {
        success: false,
        error: `Error al ${newActivo ? 'activar' : 'desactivar'} tipificación`,
      };
    }

    revalidatePath('/configuracion-tipificaciones');
    revalidatePath('/operativo');
    if (nivel === 2) {
      revalidatePath('/configuracion-kanban');
    }

    return {
      success: true,
      data: {
        activo: newActivo,
        message: newActivo ? 'Tipificación activada' : 'Tipificación desactivada',
      },
    };
  } catch (error) {
    console.error('[toggleTipificacionActivo] Exception:', error);
    return {
      success: false,
      error: 'Error inesperado al cambiar estado de tipificación',
    };
  }
}
