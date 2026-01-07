'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getLocalHistorial } from './locales';

// ============================================================================
// LÓGICA INTELIGENTE: DETECCIÓN DE CICLOS DE VENTA CAÍDA
// ============================================================================

export interface CicloVentaAnalisis {
  debePreguntar: boolean;
  razon: string;
  ultimoResetAVerde: string | null; // Timestamp del último reset a VERDE
  fichaActualizadaDespues: boolean; // Si la ficha fue actualizada DESPUÉS del reset
}

/**
 * LÓGICA CENTRAL: Determina si debemos preguntar "¿Es el mismo cliente?"
 *
 * CASOS:
 * 1. Primera separación del local → NO preguntar (cliente nuevo)
 * 2. Local tiene ficha + volvió a VERDE desde NARANJA → PREGUNTAR (venta caída)
 * 3. Ficha actualizada DESPUÉS del último reset → NO preguntar (ya confirmó)
 * 4. Local en ROJO → NO preguntar (venta completada, cargar directo)
 *
 * @param localId ID del local
 * @param estadoActual Estado actual del local
 * @returns Análisis con decisión
 */
export async function analizarCicloVenta(
  localId: string,
  estadoActual: 'verde' | 'amarillo' | 'naranja' | 'rojo'
): Promise<CicloVentaAnalisis> {
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

  try {
    // CASO 1: Si el local está en ROJO (vendido), NO preguntar
    if (estadoActual === 'rojo') {
      return {
        debePreguntar: false,
        razon: 'Local vendido (ROJO) - cargar ficha directamente',
        ultimoResetAVerde: null,
        fichaActualizadaDespues: false,
      };
    }

    // PASO 1: Obtener historial del local (ordenado DESC)
    const historial = await getLocalHistorial(localId);

    if (historial.length === 0) {
      // Local sin historial = primera vez
      return {
        debePreguntar: false,
        razon: 'Primera separación del local (sin historial)',
        ultimoResetAVerde: null,
        fichaActualizadaDespues: false,
      };
    }

    // PASO 2: Buscar el último reset a VERDE desde NARANJA o ROJO
    // Patrón: estado_nuevo = 'verde' AND estado_anterior IN ('naranja', 'rojo')
    const ultimoReset = historial.find(
      (h) => h.estado_nuevo === 'verde' && (h.estado_anterior === 'naranja' || h.estado_anterior === 'rojo')
    );

    if (!ultimoReset) {
      // No ha habido reset → primera separación o aún en el mismo ciclo
      return {
        debePreguntar: false,
        razon: 'No se detectó ciclo de venta caída (sin reset a VERDE)',
        ultimoResetAVerde: null,
        fichaActualizadaDespues: false,
      };
    }

    // PASO 3: Verificar si hay una ficha de cliente asociada
    const { data: ficha } = await supabase
      .from('clientes_ficha')
      .select('id, updated_at, titular_nombres, titular_numero_documento')
      .eq('local_id', localId)
      .maybeSingle();

    if (!ficha) {
      // No hay ficha creada aún
      return {
        debePreguntar: false,
        razon: 'No existe ficha de cliente previa',
        ultimoResetAVerde: ultimoReset.created_at,
        fichaActualizadaDespues: false,
      };
    }

    // Validar que la ficha tenga datos (no sea un registro vacío)
    const fichaTieneDatos = ficha.titular_nombres || ficha.titular_numero_documento;
    if (!fichaTieneDatos) {
      return {
        debePreguntar: false,
        razon: 'Ficha existe pero no tiene datos',
        ultimoResetAVerde: ultimoReset.created_at,
        fichaActualizadaDespues: false,
      };
    }

    // PASO 4: Comparar timestamps (¿La ficha fue actualizada DESPUÉS del reset?)
    const timestampReset = new Date(ultimoReset.created_at);
    const timestampFicha = new Date(ficha.updated_at);

    if (timestampFicha > timestampReset) {
      // Usuario ya actualizó la ficha en este ciclo → NO volver a preguntar
      return {
        debePreguntar: false,
        razon: 'Ficha ya fue actualizada en este ciclo (después del reset)',
        ultimoResetAVerde: ultimoReset.created_at,
        fichaActualizadaDespues: true,
      };
    }

    // PASO 5: ¡DECISIÓN FINAL! Hay un ciclo caído y la ficha es ANTERIOR al reset
    // → PREGUNTAR si es el mismo cliente o uno nuevo
    return {
      debePreguntar: true,
      razon: 'Ciclo de venta caída detectado - ficha es anterior al último reset',
      ultimoResetAVerde: ultimoReset.created_at,
      fichaActualizadaDespues: false,
    };
  } catch (error) {
    console.error('[CICLO_VENTA] Error analizando ciclo:', error);
    // En caso de error, defaultear a NO preguntar (experiencia más fluida)
    return {
      debePreguntar: false,
      razon: 'Error en análisis - defaulteando a NO preguntar',
      ultimoResetAVerde: null,
      fichaActualizadaDespues: false,
    };
  }
}

/**
 * Helper: Obtener información del cliente anterior (para mostrar en modal)
 */
export async function obtenerDatosClienteAnterior(localId: string) {
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

  try {
    const { data } = await supabase
      .from('clientes_ficha')
      .select('titular_nombres, titular_apellido_paterno, titular_apellido_materno, titular_numero_documento')
      .eq('local_id', localId)
      .maybeSingle();

    if (!data) return null;

    const nombreCompleto = [
      data.titular_nombres,
      data.titular_apellido_paterno,
      data.titular_apellido_materno,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      nombre: nombreCompleto || 'Cliente anterior',
      documento: data.titular_numero_documento || 'Sin documento',
    };
  } catch (error) {
    console.error('[CICLO_VENTA] Error obteniendo datos cliente anterior:', error);
    return null;
  }
}
