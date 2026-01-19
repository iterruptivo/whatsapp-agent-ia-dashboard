'use server';

// ============================================================================
// SERVER ACTIONS: Reporte de Fichas de Inscripción
// ============================================================================
// Obtener datos consolidados de fichas para reportes ejecutivos
// ============================================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Helper para crear cliente Supabase con contexto de servidor
async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', options);
        },
      },
    }
  );
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface FichaReporteRow {
  ficha_id: string;
  local_id: string;
  local_codigo: string;
  local_estado: string;
  proyecto_id: string;
  proyecto_nombre: string;
  titular_nombre: string; // concatenar nombres
  titular_documento: string;
  vendedor_id: string | null;
  vendedor_nombre: string | null;
  vendedor_rol: string | null;
  jefe_ventas_nombre: string | null;
  vendedor_caseta_nombre: string | null; // si aplica
  total_abonado: number;
  fecha_creacion: string;
  // Campos para indicador de nuevo abono
  tiene_nuevo_abono: boolean;
  fecha_ultimo_abono: string | null;
  abonos_count: number;
}

// ============================================================================
// OBTENER FICHAS PARA REPORTE
// ============================================================================

const PROYECTO_PRUEBAS_ID = '80761314-7a78-43db-8ad5-10f16eedac87';

/**
 * Obtiene datos consolidados de fichas de inscripción para reportes
 * Incluye información de local, proyecto, vendedor, jefe de ventas y total abonado
 *
 * @param proyectoId - ID del proyecto específico (opcional). Si no se proporciona, trae todos los proyectos
 * @returns Array de fichas con datos consolidados
 */
export async function getFichasParaReporte(proyectoId?: string): Promise<FichaReporteRow[]> {
  try {
    const supabase = await createSupabaseServer();

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[getFichasParaReporte] Error de autenticación:', authError);
      return [];
    }

    console.log('[getFichasParaReporte] Iniciando consulta de fichas');
    console.log('[getFichasParaReporte] Filtro proyecto:', proyectoId || 'TODOS');

    // PASO 1: Obtener todas las fichas con datos de local y proyecto
    let fichasQuery = supabase
      .from('clientes_ficha')
      .select(`
        id,
        local_id,
        titular_nombres,
        titular_apellido_paterno,
        titular_apellido_materno,
        titular_numero_documento,
        vendedor_id,
        created_at,
        locales!inner (
          id,
          codigo,
          estado,
          proyecto_id,
          proyectos!inner (
            id,
            nombre
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Filtrar por proyecto si se especifica
    if (proyectoId) {
      fichasQuery = fichasQuery.eq('locales.proyecto_id', proyectoId);
    }

    // CRÍTICO: Excluir proyecto de pruebas
    fichasQuery = fichasQuery.neq('locales.proyecto_id', PROYECTO_PRUEBAS_ID);

    const { data: fichasData, error: fichasError } = await fichasQuery;

    if (fichasError) {
      console.error('[getFichasParaReporte] Error obteniendo fichas:', fichasError);
      return [];
    }

    if (!fichasData || fichasData.length === 0) {
      console.log('[getFichasParaReporte] No se encontraron fichas');
      return [];
    }

    console.log(`[getFichasParaReporte] Fichas encontradas: ${fichasData.length}`);

    // PASO 2: Obtener IDs únicos de vendedores para hacer consultas eficientes
    const vendedorIds = [...new Set(fichasData.map(f => f.vendedor_id).filter(Boolean))];

    // PASO 3: Obtener datos de vendedores (usuarios) con sus vendedor_id
    const { data: vendedoresData, error: vendedoresError } = await supabase
      .from('usuarios')
      .select('id, nombre, rol, vendedor_id')
      .in('vendedor_id', vendedorIds);

    if (vendedoresError) {
      console.warn('[getFichasParaReporte] Error obteniendo vendedores:', vendedoresError);
    }

    // Crear mapa de vendedor_id -> datos de usuario
    const vendedoresMap = new Map(
      (vendedoresData || []).map(v => [v.vendedor_id, v])
    );

    // PASO 4: Buscar jefes de ventas (usuarios con rol jefe_ventas)
    const { data: jefesVentasData, error: jefesError } = await supabase
      .from('usuarios')
      .select('id, nombre, vendedor_id')
      .eq('rol', 'jefe_ventas')
      .eq('activo', true);

    if (jefesError) {
      console.warn('[getFichasParaReporte] Error obteniendo jefes de ventas:', jefesError);
    }

    // Crear mapa de vendedor_id -> jefe de ventas
    // NOTA: En el modelo actual no hay relación directa vendedor -> jefe
    // Esta funcionalidad se puede extender en el futuro si se agrega esa relación
    const jefesVentasMap = new Map(
      (jefesVentasData || []).map(j => [j.vendedor_id, j.nombre])
    );

    // PASO 5: Obtener IDs de locales para calcular total abonado
    const localIds = fichasData.map(f => f.local_id);

    // PASO 6: Obtener control_pagos para cada local
    const { data: controlPagosData, error: controlPagosError } = await supabase
      .from('control_pagos')
      .select('id, local_id')
      .in('local_id', localIds);

    if (controlPagosError) {
      console.warn('[getFichasParaReporte] Error obteniendo control_pagos:', controlPagosError);
    }

    // Crear mapa de local_id -> control_pago_id
    const controlPagosMap = new Map(
      (controlPagosData || []).map(cp => [cp.local_id, cp.id])
    );

    // PASO 7: Obtener pagos_local para los control_pagos
    const controlPagoIds = [...controlPagosMap.values()];

    const { data: pagosLocalData, error: pagosLocalError } = await supabase
      .from('pagos_local')
      .select('id, control_pago_id')
      .in('control_pago_id', controlPagoIds);

    if (pagosLocalError) {
      console.warn('[getFichasParaReporte] Error obteniendo pagos_local:', pagosLocalError);
    }

    // Crear mapa de control_pago_id -> array de pago_ids
    const pagosLocalMap = new Map<string, string[]>();
    (pagosLocalData || []).forEach(pl => {
      const existing = pagosLocalMap.get(pl.control_pago_id) || [];
      pagosLocalMap.set(pl.control_pago_id, [...existing, pl.id]);
    });

    // PASO 8: Obtener abonos_pago y sumar por pago_id + obtener fecha último abono
    const pagoIds = (pagosLocalData || []).map(pl => pl.id);

    const { data: abonosData, error: abonosError } = await supabase
      .from('abonos_pago')
      .select('pago_id, monto, fecha_abono, created_at')
      .in('pago_id', pagoIds);

    if (abonosError) {
      console.warn('[getFichasParaReporte] Error obteniendo abonos:', abonosError);
    }

    // Crear mapa de pago_id -> total abonado
    const abonosPorPagoMap = new Map<string, number>();
    // Crear mapa de pago_id -> fecha último abono
    const ultimoAbonoPorPagoMap = new Map<string, string>();
    // Crear mapa de pago_id -> count de abonos
    const abonosCountPorPagoMap = new Map<string, number>();

    (abonosData || []).forEach(abono => {
      // Sumar monto total
      const currentTotal = abonosPorPagoMap.get(abono.pago_id) || 0;
      abonosPorPagoMap.set(abono.pago_id, currentTotal + Number(abono.monto));

      // Contar abonos
      const currentCount = abonosCountPorPagoMap.get(abono.pago_id) || 0;
      abonosCountPorPagoMap.set(abono.pago_id, currentCount + 1);

      // Rastrear fecha más reciente (usar fecha_abono o created_at)
      const fechaAbono = abono.fecha_abono || abono.created_at;
      const currentFecha = ultimoAbonoPorPagoMap.get(abono.pago_id);
      if (!currentFecha || new Date(fechaAbono) > new Date(currentFecha)) {
        ultimoAbonoPorPagoMap.set(abono.pago_id, fechaAbono);
      }
    });

    // PASO 9: Construir resultado final
    const resultado: FichaReporteRow[] = fichasData.map(ficha => {
      // Extraer datos del local y proyecto (desde JOIN)
      const local = ficha.locales as any;
      const proyecto = local?.proyectos as any;

      // Concatenar nombre completo del titular
      const nombreCompleto = [
        ficha.titular_nombres,
        ficha.titular_apellido_paterno,
        ficha.titular_apellido_materno,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Sin nombre';

      // Obtener datos del vendedor
      const vendedor = ficha.vendedor_id ? vendedoresMap.get(ficha.vendedor_id) : null;

      // Determinar si es vendedor_caseta
      const esVendedorCaseta = vendedor?.rol === 'vendedor_caseta';
      const vendedorCasetaNombre = esVendedorCaseta ? vendedor?.nombre || null : null;

      // Buscar jefe de ventas (por ahora null, se puede extender)
      const jefeVentasNombre = null; // TODO: Implementar lógica si se agrega relación vendedor -> jefe

      // Calcular total abonado, fecha último abono y count
      const controlPagoId = ficha.local_id ? controlPagosMap.get(ficha.local_id) : null;
      let totalAbonado = 0;
      let fechaUltimoAbono: string | null = null;
      let abonosCount = 0;

      if (controlPagoId) {
        const pagoIdsDeLocal = pagosLocalMap.get(controlPagoId) || [];

        pagoIdsDeLocal.forEach(pagoId => {
          // Sumar monto
          totalAbonado += abonosPorPagoMap.get(pagoId) || 0;
          // Sumar count
          abonosCount += abonosCountPorPagoMap.get(pagoId) || 0;
          // Encontrar fecha más reciente
          const fechaPago = ultimoAbonoPorPagoMap.get(pagoId);
          if (fechaPago && (!fechaUltimoAbono || new Date(fechaPago) > new Date(fechaUltimoAbono))) {
            fechaUltimoAbono = fechaPago;
          }
        });
      }

      // Determinar si tiene nuevo abono (últimos 7 días)
      let tieneNuevoAbono = false;
      if (fechaUltimoAbono) {
        const hoy = new Date();
        const fechaAbono = new Date(fechaUltimoAbono);
        const diasDesdeAbono = Math.floor((hoy.getTime() - fechaAbono.getTime()) / (1000 * 60 * 60 * 24));
        tieneNuevoAbono = diasDesdeAbono <= 7;
      }

      return {
        ficha_id: ficha.id,
        local_id: ficha.local_id,
        local_codigo: local?.codigo || 'Sin código',
        local_estado: local?.estado || 'desconocido',
        proyecto_id: proyecto?.id || '',
        proyecto_nombre: proyecto?.nombre || 'Sin proyecto',
        titular_nombre: nombreCompleto,
        titular_documento: ficha.titular_numero_documento || 'Sin documento',
        vendedor_id: ficha.vendedor_id,
        vendedor_nombre: vendedor?.nombre || null,
        vendedor_rol: vendedor?.rol || null,
        jefe_ventas_nombre: jefeVentasNombre,
        vendedor_caseta_nombre: vendedorCasetaNombre,
        total_abonado: totalAbonado,
        fecha_creacion: ficha.created_at,
        tiene_nuevo_abono: tieneNuevoAbono,
        fecha_ultimo_abono: fechaUltimoAbono,
        abonos_count: abonosCount,
      };
    });

    console.log(`[getFichasParaReporte] Resultado final: ${resultado.length} fichas procesadas`);

    return resultado;
  } catch (error: any) {
    console.error('[getFichasParaReporte] Error inesperado:', error);
    return [];
  }
}
