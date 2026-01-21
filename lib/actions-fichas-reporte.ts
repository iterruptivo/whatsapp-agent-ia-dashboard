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
  // Campos de montos extraídos por OCR de vouchers (separación)
  monto_voucher_usd: number;
  monto_voucher_pen: number;
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
 * @param incluirPruebas - Si es true, incluye el proyecto de pruebas (por defecto false)
 * @returns Array de fichas con datos consolidados
 */
export async function getFichasParaReporte(proyectoId?: string, incluirPruebas: boolean = false): Promise<FichaReporteRow[]> {
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
    // Incluye comprobante_deposito_ocr para calcular montos por moneda
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
        comprobante_deposito_ocr,
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
    } else if (!incluirPruebas) {
      // Si no se especifica proyecto y no se quiere incluir pruebas, excluir proyecto pruebas
      fichasQuery = fichasQuery.neq('locales.proyecto_id', PROYECTO_PRUEBAS_ID);
    }

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

      // Calcular montos por moneda desde OCR de vouchers
      let montoVoucherUsd = 0;
      let montoVoucherPen = 0;

      const ocrData = ficha.comprobante_deposito_ocr as Array<{
        monto?: number | null;
        moneda?: 'USD' | 'PEN' | null;
      }> | null;

      if (ocrData && Array.isArray(ocrData)) {
        ocrData.forEach(voucher => {
          const monto = Number(voucher.monto) || 0;
          if (voucher.moneda === 'USD') {
            montoVoucherUsd += monto;
          } else if (voucher.moneda === 'PEN') {
            montoVoucherPen += monto;
          }
        });
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
        monto_voucher_usd: montoVoucherUsd,
        monto_voucher_pen: montoVoucherPen,
      };
    });

    console.log(`[getFichasParaReporte] Resultado final: ${resultado.length} fichas procesadas`);

    return resultado;
  } catch (error: any) {
    console.error('[getFichasParaReporte] Error inesperado:', error);
    return [];
  }
}

// ============================================================================
// REPORTE DIARIO - Abonos por cliente ordenados por fecha
// Session 101 - Nuevo reporte para Finanzas
// Con paginación y ordenamiento server-side
// ============================================================================

export interface AbonoDiarioRow {
  ficha_id: string;
  local_id: string;
  local_codigo: string;
  proyecto_nombre: string;
  cliente_nombre: string;
  // Fecha/hora de subida a la plataforma
  uploaded_at: string | null;
  // Fecha y hora del comprobante (del voucher)
  fecha_comprobante: string;
  hora_comprobante: string | null;
  monto: number;
  moneda: 'PEN' | 'USD';
  banco: string | null;
  numero_operacion: string | null;
  // Campos para boletas vinculadas
  voucher_index: number;
  boleta_url: string | null;
  numero_boleta: string | null;
  boleta_tipo: 'boleta' | 'factura' | null;
  // Campos de verificación por Finanzas (nuevos)
  deposito_id: string | null; // ID en tabla depositos_ficha (null si no migrado)
  verificado_finanzas: boolean;
  verificado_finanzas_por: string | null;
  verificado_finanzas_at: string | null;
  verificado_finanzas_nombre: string | null;
}

// Columnas ordenables
export type AbonoDiarioSortColumn = 'uploaded_at' | 'fecha_comprobante' | 'cliente_nombre' | 'monto' | 'local_codigo' | 'proyecto_nombre' | 'banco';
export type SortDirection = 'asc' | 'desc';

interface GetAbonosDiariosParams {
  fechaDesde: string;
  fechaHasta: string;
  proyectoId?: string | null;
  // Paginación
  page?: number;
  pageSize?: number;
  // Ordenamiento
  sortColumn?: AbonoDiarioSortColumn;
  sortDirection?: SortDirection;
  // Filtro de proyecto pruebas (por defecto se excluye)
  incluirPruebas?: boolean;
}

interface GetAbonosDiariosResult {
  data: AbonoDiarioRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  // Totales para mostrar en UI
  totalUSD: number;
  totalPEN: number;
}

// Helper para parsear fecha del OCR a formato YYYY-MM-DD
function parseFechaOCR(fechaStr: string): string | null {
  try {
    let parsedDate: Date;

    if (fechaStr.includes('/')) {
      // Formato DD/MM/YYYY
      const [dia, mes, anio] = fechaStr.split('/');
      parsedDate = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
    } else if (fechaStr.includes('-')) {
      // Formato YYYY-MM-DD o DD-MM-YYYY
      const parts = fechaStr.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        parsedDate = new Date(fechaStr);
      } else {
        // DD-MM-YYYY
        parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    } else {
      return null;
    }

    if (isNaN(parsedDate.getTime())) return null;

    return parsedDate.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

// Helper interno para obtener todos los abonos filtrados (sin paginar)
// Interface para boleta vinculada
export interface BoletaVinculada {
  voucher_index: number;
  boleta_url: string;
  numero_boleta: string;
  tipo: 'boleta' | 'factura';
  uploaded_at: string;
  uploaded_by_id: string;
  uploaded_by_nombre: string;
}

async function fetchAllAbonosFiltered(
  fechaDesde: string,
  fechaHasta: string,
  proyectoId?: string | null,
  incluirPruebas: boolean = false
): Promise<AbonoDiarioRow[]> {
  const supabase = await createSupabaseServer();

  // NUEVA IMPLEMENTACIÓN: Leer de tabla depositos_ficha (normalizada)
  // En lugar del JSONB comprobante_deposito_ocr

  // Construir query a depositos_ficha con joins
  let depositosQuery = supabase
    .from('depositos_ficha')
    .select(`
      id,
      ficha_id,
      local_id,
      proyecto_id,
      indice_original,
      monto,
      moneda,
      fecha_comprobante,
      hora_comprobante,
      banco,
      numero_operacion,
      uploaded_at,
      verificado_finanzas,
      verificado_finanzas_por,
      verificado_finanzas_at,
      verificado_finanzas_nombre,
      locales!inner (
        id,
        codigo,
        proyectos!inner (
          id,
          nombre
        )
      ),
      clientes_ficha!inner (
        id,
        titular_nombres,
        titular_apellido_paterno,
        titular_apellido_materno,
        boletas_vinculadas
      )
    `)
    .gte('fecha_comprobante', fechaDesde)
    .lte('fecha_comprobante', fechaHasta);

  // Filtrar por proyecto
  if (proyectoId) {
    depositosQuery = depositosQuery.eq('proyecto_id', proyectoId);
  } else if (!incluirPruebas) {
    depositosQuery = depositosQuery.neq('proyecto_id', PROYECTO_PRUEBAS_ID);
  }

  const { data: depositos, error } = await depositosQuery;

  if (error) {
    console.error('[fetchAllAbonosFiltered] Error:', error);
    return [];
  }

  if (!depositos || depositos.length === 0) {
    return [];
  }

  // Transformar a AbonoDiarioRow
  const abonos: AbonoDiarioRow[] = depositos.map((dep: any) => {
    const local = dep.locales;
    const proyecto = local?.proyectos;
    const ficha = dep.clientes_ficha;

    // Construir nombre del cliente
    const clienteNombre = [
      ficha?.titular_nombres,
      ficha?.titular_apellido_paterno,
      ficha?.titular_apellido_materno
    ].filter(Boolean).join(' ') || 'Sin nombre';

    // Buscar boleta vinculada
    const boletasVinculadas = (ficha?.boletas_vinculadas || []) as BoletaVinculada[];
    const boletaVinculada = boletasVinculadas.find(b => b.voucher_index === dep.indice_original);

    return {
      ficha_id: dep.ficha_id || '',
      local_id: dep.local_id,
      local_codigo: local?.codigo || 'N/A',
      proyecto_nombre: proyecto?.nombre || 'N/A',
      cliente_nombre: clienteNombre,
      uploaded_at: dep.uploaded_at,
      fecha_comprobante: dep.fecha_comprobante,
      hora_comprobante: dep.hora_comprobante,
      monto: Number(dep.monto) || 0,
      moneda: dep.moneda || 'USD',
      banco: dep.banco,
      numero_operacion: dep.numero_operacion,
      voucher_index: dep.indice_original || 0,
      boleta_url: boletaVinculada?.boleta_url || null,
      numero_boleta: boletaVinculada?.numero_boleta || null,
      boleta_tipo: boletaVinculada?.tipo || null,
      // Nuevos campos de verificación
      deposito_id: dep.id,
      verificado_finanzas: dep.verificado_finanzas || false,
      verificado_finanzas_por: dep.verificado_finanzas_por,
      verificado_finanzas_at: dep.verificado_finanzas_at,
      verificado_finanzas_nombre: dep.verificado_finanzas_nombre,
    };
  });

  return abonos;
}

// Helper para ordenar abonos
function sortAbonos(
  abonos: AbonoDiarioRow[],
  sortColumn: AbonoDiarioSortColumn,
  sortDirection: SortDirection
): AbonoDiarioRow[] {
  return [...abonos].sort((a, b) => {
    let comparison = 0;

    switch (sortColumn) {
      case 'uploaded_at':
        comparison = (a.uploaded_at || '').localeCompare(b.uploaded_at || '');
        break;
      case 'fecha_comprobante':
        // Ordenar por fecha+hora compuesta (YYYY-MM-DD HH:MM:SS)
        const aDateTime = `${a.fecha_comprobante} ${a.hora_comprobante || '00:00:00'}`;
        const bDateTime = `${b.fecha_comprobante} ${b.hora_comprobante || '00:00:00'}`;
        comparison = aDateTime.localeCompare(bDateTime);
        break;
      case 'cliente_nombre':
        comparison = a.cliente_nombre.localeCompare(b.cliente_nombre);
        break;
      case 'monto':
        comparison = a.monto - b.monto;
        break;
      case 'local_codigo':
        comparison = a.local_codigo.localeCompare(b.local_codigo);
        break;
      case 'proyecto_nombre':
        comparison = a.proyecto_nombre.localeCompare(b.proyecto_nombre);
        break;
      case 'banco':
        comparison = (a.banco || '').localeCompare(b.banco || '');
        break;
      default:
        comparison = (a.uploaded_at || '').localeCompare(b.uploaded_at || '');
    }

    return sortDirection === 'desc' ? -comparison : comparison;
  });
}

/**
 * Obtiene los abonos de fichas de inscripción con paginación y ordenamiento server-side
 * Por defecto ordenado por fecha de comprobante descendente
 */
export async function getAbonosDiarios(params: GetAbonosDiariosParams): Promise<GetAbonosDiariosResult> {
  try {
    const {
      fechaDesde,
      fechaHasta,
      proyectoId,
      page = 1,
      pageSize = 20,
      sortColumn = 'fecha_comprobante',
      sortDirection = 'desc',
      incluirPruebas = false
    } = params;

    console.log('[getAbonosDiarios] Parámetros:', { fechaDesde, fechaHasta, proyectoId, page, pageSize, sortColumn, sortDirection, incluirPruebas });

    // Obtener todos los abonos filtrados
    const allAbonos = await fetchAllAbonosFiltered(fechaDesde, fechaHasta, proyectoId, incluirPruebas);

    // Calcular totales (antes de paginar)
    const totalUSD = allAbonos
      .filter(a => a.moneda === 'USD')
      .reduce((sum, a) => sum + a.monto, 0);

    const totalPEN = allAbonos
      .filter(a => a.moneda === 'PEN')
      .reduce((sum, a) => sum + a.monto, 0);

    // Ordenar
    const sortedAbonos = sortAbonos(allAbonos, sortColumn, sortDirection);

    // Calcular paginación
    const total = sortedAbonos.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    // Obtener página actual
    const paginatedAbonos = sortedAbonos.slice(startIndex, endIndex);

    console.log(`[getAbonosDiarios] Resultado: ${total} total, página ${page}/${totalPages}, mostrando ${paginatedAbonos.length}`);

    return {
      data: paginatedAbonos,
      total,
      page,
      pageSize,
      totalPages,
      totalUSD,
      totalPEN
    };
  } catch (error: any) {
    console.error('[getAbonosDiarios] Error inesperado:', error);
    return {
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
      totalUSD: 0,
      totalPEN: 0
    };
  }
}

/**
 * Obtiene TODOS los abonos para exportar a Excel (sin paginación)
 * Mantiene el ordenamiento especificado
 */
export async function getAbonosDiariosExport(params: {
  fechaDesde: string;
  fechaHasta: string;
  proyectoId?: string | null;
  sortColumn?: AbonoDiarioSortColumn;
  sortDirection?: SortDirection;
  incluirPruebas?: boolean;
}): Promise<AbonoDiarioRow[]> {
  try {
    const {
      fechaDesde,
      fechaHasta,
      proyectoId,
      sortColumn = 'fecha_comprobante',
      sortDirection = 'desc',
      incluirPruebas = false
    } = params;

    console.log('[getAbonosDiariosExport] Exportando todos los abonos...', { incluirPruebas });

    // Obtener todos los abonos filtrados
    const allAbonos = await fetchAllAbonosFiltered(fechaDesde, fechaHasta, proyectoId, incluirPruebas);

    // Ordenar
    const sortedAbonos = sortAbonos(allAbonos, sortColumn, sortDirection);

    console.log(`[getAbonosDiariosExport] Exportando ${sortedAbonos.length} registros`);

    return sortedAbonos;
  } catch (error: any) {
    console.error('[getAbonosDiariosExport] Error:', error);
    return [];
  }
}

// ============================================================================
// SESIÓN 103: VINCULAR BOLETAS A COMPROBANTES
// ============================================================================

/**
 * Vincular una boleta/factura a un comprobante de pago (voucher)
 * Solo disponible para: finanzas, admin, superadmin
 */
export async function vincularBoleta(params: {
  fichaId: string;
  voucherIndex: number;
  boletaUrl: string;
  numeroBoleta: string;
  tipo: 'boleta' | 'factura';
}): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createSupabaseServer();

    // Verificar autenticación
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return { success: false, message: 'No autenticado' };
    }

    // Obtener datos del usuario
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, nombre, rol')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    // Validar rol
    const rolesAutorizados = ['superadmin', 'admin', 'finanzas'];
    if (!rolesAutorizados.includes(userData.rol)) {
      return { success: false, message: 'No autorizado. Solo Finanzas puede vincular boletas.' };
    }

    // Obtener ficha actual
    const { data: ficha, error: fichaError } = await supabase
      .from('clientes_ficha')
      .select('boletas_vinculadas')
      .eq('id', params.fichaId)
      .single();

    if (fichaError || !ficha) {
      return { success: false, message: 'Ficha no encontrada' };
    }

    // Obtener boletas existentes
    const boletasExistentes = (ficha.boletas_vinculadas || []) as BoletaVinculada[];

    // Verificar si ya existe una boleta para este voucher
    const existeIndex = boletasExistentes.findIndex(b => b.voucher_index === params.voucherIndex);

    const nuevaBoleta: BoletaVinculada = {
      voucher_index: params.voucherIndex,
      boleta_url: params.boletaUrl,
      numero_boleta: params.numeroBoleta,
      tipo: params.tipo,
      uploaded_at: new Date().toISOString(),
      uploaded_by_id: userData.id,
      uploaded_by_nombre: userData.nombre,
    };

    let nuevasBoletasVinculadas: BoletaVinculada[];
    if (existeIndex >= 0) {
      // Reemplazar boleta existente
      nuevasBoletasVinculadas = [...boletasExistentes];
      nuevasBoletasVinculadas[existeIndex] = nuevaBoleta;
    } else {
      // Agregar nueva boleta
      nuevasBoletasVinculadas = [...boletasExistentes, nuevaBoleta];
    }

    // Actualizar ficha
    const { error: updateError } = await supabase
      .from('clientes_ficha')
      .update({ boletas_vinculadas: nuevasBoletasVinculadas })
      .eq('id', params.fichaId);

    if (updateError) {
      console.error('[vincularBoleta] Error al actualizar:', updateError);
      return { success: false, message: 'Error al vincular boleta' };
    }

    console.log(`[vincularBoleta] ✅ Boleta ${params.numeroBoleta} vinculada al voucher ${params.voucherIndex} por ${userData.nombre}`);

    return { success: true, message: `Boleta ${params.numeroBoleta} vinculada correctamente` };
  } catch (error) {
    console.error('[vincularBoleta] Error inesperado:', error);
    return { success: false, message: 'Error inesperado al vincular boleta' };
  }
}

/**
 * Desvincular una boleta de un comprobante de pago
 */
export async function desvincularBoleta(params: {
  fichaId: string;
  voucherIndex: number;
}): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createSupabaseServer();

    // Verificar autenticación
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return { success: false, message: 'No autenticado' };
    }

    // Obtener datos del usuario
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, nombre, rol')
      .eq('id', authUser.id)
      .single();

    if (userError || !userData) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    // Validar rol
    const rolesAutorizados = ['superadmin', 'admin', 'finanzas'];
    if (!rolesAutorizados.includes(userData.rol)) {
      return { success: false, message: 'No autorizado. Solo Finanzas puede desvincular boletas.' };
    }

    // Obtener ficha actual
    const { data: ficha, error: fichaError } = await supabase
      .from('clientes_ficha')
      .select('boletas_vinculadas')
      .eq('id', params.fichaId)
      .single();

    if (fichaError || !ficha) {
      return { success: false, message: 'Ficha no encontrada' };
    }

    // Filtrar boletas (remover la del voucher indicado)
    const boletasExistentes = (ficha.boletas_vinculadas || []) as BoletaVinculada[];
    const nuevasBoletasVinculadas = boletasExistentes.filter(b => b.voucher_index !== params.voucherIndex);

    // Actualizar ficha
    const { error: updateError } = await supabase
      .from('clientes_ficha')
      .update({ boletas_vinculadas: nuevasBoletasVinculadas })
      .eq('id', params.fichaId);

    if (updateError) {
      console.error('[desvincularBoleta] Error al actualizar:', updateError);
      return { success: false, message: 'Error al desvincular boleta' };
    }

    console.log(`[desvincularBoleta] ✅ Boleta desvinculada del voucher ${params.voucherIndex} por ${userData.nombre}`);

    return { success: true, message: 'Boleta desvinculada correctamente' };
  } catch (error) {
    console.error('[desvincularBoleta] Error inesperado:', error);
    return { success: false, message: 'Error inesperado al desvincular boleta' };
  }
}

// ============================================================================
// OBTENER LOCAL CON PROYECTO (para modal de ficha editable)
// ============================================================================

export interface LocalConProyecto {
  id: string;
  codigo: string;
  estado: string;
  metraje: number | null;
  precio_base: number | null;
  proyecto_id: string;
  monto_venta: number | null;
  proyecto: {
    id: string;
    nombre: string;
  };
}

/**
 * Obtiene un local con su proyecto asociado
 * Para usar en el modal de ficha de inscripción editable
 */
export async function getLocalConProyecto(localId: string): Promise<LocalConProyecto | null> {
  try {
    const supabase = await createSupabaseServer();

    const { data, error } = await supabase
      .from('locales')
      .select(`
        id,
        codigo,
        estado,
        metraje,
        precio_base,
        proyecto_id,
        monto_venta,
        proyectos!inner (
          id,
          nombre
        )
      `)
      .eq('id', localId)
      .single();

    if (error || !data) {
      console.error('[getLocalConProyecto] Error:', error);
      return null;
    }

    const proyecto = data.proyectos as any;

    return {
      id: data.id,
      codigo: data.codigo,
      estado: data.estado,
      metraje: data.metraje,
      precio_base: data.precio_base,
      proyecto_id: data.proyecto_id,
      monto_venta: data.monto_venta,
      proyecto: {
        id: proyecto.id,
        nombre: proyecto.nombre,
      },
    };
  } catch (error) {
    console.error('[getLocalConProyecto] Error inesperado:', error);
    return null;
  }
}
