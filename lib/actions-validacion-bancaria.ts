'use server';

// ============================================================================
// SERVER ACTIONS: Validacion Bancaria
// ============================================================================
// Funciones para importar estados de cuenta bancarios y hacer matching
// con los abonos registrados en el sistema
// ============================================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import * as XLSX from 'xlsx';

// Helper para crear cliente Supabase en server actions
async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

// ============================================================================
// TYPES
// ============================================================================

export interface ConfigBanco {
  id: string;
  nombre: string;
  nombre_display: string;
  mapeo_columnas: Record<string, string>;
  filas_encabezado: number;
  formato_fecha: string;
  separador_decimal: string;
  monedas_soportadas: string[];
  activo: boolean;
}

export interface ImportacionBancaria {
  id: string;
  proyecto_id: string;
  banco_id: string;
  banco?: ConfigBanco;
  archivo_nombre: string;
  archivo_url?: string;
  cuenta?: string;
  moneda: string;
  fecha_desde: string;
  fecha_hasta: string;
  total_transacciones: number;
  transacciones_matched: number;
  transacciones_pendientes: number;
  transacciones_ignoradas: number;
  monto_total_abonos: number;
  monto_total_cargos: number;
  estado: 'procesando' | 'completado' | 'error';
  error_mensaje?: string;
  created_at: string;
  created_by?: string;
}

export interface TransaccionBancaria {
  id: string;
  importacion_id: string;
  proyecto_id: string;
  banco_id: string;
  cuenta?: string;
  moneda: string;
  fecha_operacion: string;
  fecha_proceso?: string;
  numero_operacion?: string;
  tipo_movimiento?: string;
  descripcion?: string;
  canal?: string;
  monto: number;
  es_cargo: boolean;
  archivo_origen?: string;
  fila_origen?: number;
  datos_raw?: Record<string, unknown>;
  estado_matching: 'pendiente' | 'matched' | 'manual' | 'ignorado';
  match_confianza?: number;
  match_regla?: string;
  abono_id?: string;
  control_pago_id?: string;
  nombre_extraido?: string;
  dni_extraido?: string;
  notas?: string;
  matched_at?: string;
  matched_by?: string;
  created_at: string;
  // Relaciones
  abono?: {
    id: string;
    monto: number;
    fecha_abono: string;
    metodo_pago: string;
    notas?: string;
  };
  control_pago?: {
    id: string;
    local_codigo: string;
    cliente_nombre: string;
  };
}

export interface MatchSuggestion {
  abono_id: string;
  control_pago_id: string;
  local_codigo: string;
  cliente_nombre: string;
  cliente_dni?: string;
  monto: number;
  fecha_abono: string;
  metodo_pago: string;
  confianza: number;
  regla: string;
  motivo: string;
}

export interface ImportResult {
  success: boolean;
  message?: string;
  importacion_id?: string;
  total_transacciones?: number;
  transacciones_abonos?: number;
  transacciones_cargos?: number;
  errores?: string[];
}

// ============================================================================
// BANCOS
// ============================================================================

export async function getBancosActivos(): Promise<ConfigBanco[]> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from('config_bancos')
    .select('*')
    .eq('activo', true)
    .order('nombre_display');

  if (error) {
    console.error('Error fetching bancos:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// IMPORTACIONES
// ============================================================================

export async function getImportaciones(proyectoId: string): Promise<ImportacionBancaria[]> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from('importaciones_bancarias')
    .select(`
      *,
      banco:config_bancos(*)
    `)
    .eq('proyecto_id', proyectoId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching importaciones:', error);
    return [];
  }

  return data || [];
}

export async function getImportacionById(importacionId: string): Promise<ImportacionBancaria | null> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from('importaciones_bancarias')
    .select(`
      *,
      banco:config_bancos(*)
    `)
    .eq('id', importacionId)
    .single();

  if (error) {
    console.error('Error fetching importacion:', error);
    return null;
  }

  return data;
}

// ============================================================================
// IMPORTAR EXCEL
// ============================================================================

export async function importarEstadoCuenta(
  proyectoId: string,
  bancoId: string,
  moneda: string,
  cuenta: string | undefined,
  excelBase64: string,
  nombreArchivo: string,
  userId: string
): Promise<ImportResult> {
  const supabase = await getSupabase();

  try {
    // 1. Obtener configuracion del banco
    const { data: banco, error: bancoError } = await supabase
      .from('config_bancos')
      .select('*')
      .eq('id', bancoId)
      .single();

    if (bancoError || !banco) {
      return { success: false, message: 'Banco no encontrado' };
    }

    // 2. Parsear el Excel
    const buffer = Buffer.from(excelBase64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convertir a JSON saltando las filas de encabezado
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      dateNF: 'yyyy-mm-dd',
    }) as string[][];

    // Saltar filas de encabezado segun config del banco
    const filasASaltar = banco.filas_encabezado || 0;
    const headerRow = jsonData[filasASaltar];
    const dataRows = jsonData.slice(filasASaltar + 1);

    if (!headerRow || dataRows.length === 0) {
      return { success: false, message: 'El archivo Excel esta vacio o no tiene el formato esperado' };
    }

    // 3. Mapear columnas segun configuracion del banco
    const mapeo = banco.mapeo_columnas as Record<string, string>;
    const colIndices: Record<string, number> = {};

    for (const [campo, nombreColumna] of Object.entries(mapeo)) {
      const idx = headerRow.findIndex(
        (h: string) => h && h.toString().toLowerCase().trim() === nombreColumna.toLowerCase().trim()
      );
      if (idx !== -1) {
        colIndices[campo] = idx;
      }
    }

    // Verificar columnas minimas requeridas
    if (colIndices.fecha_operacion === undefined) {
      return {
        success: false,
        message: `No se encontro la columna de fecha. Esperada: "${mapeo.fecha_operacion}"`,
      };
    }

    // 4. Crear registro de importacion
    let fechaMin: Date | null = null;
    let fechaMax: Date | null = null;
    let montoTotalAbonos = 0;
    let montoTotalCargos = 0;

    const transacciones: Omit<TransaccionBancaria, 'id' | 'created_at'>[] = [];
    const errores: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length === 0) continue;

      try {
        // Extraer valores
        const fechaRaw = row[colIndices.fecha_operacion];
        const fecha = parseFecha(fechaRaw, banco.formato_fecha);

        if (!fecha) {
          errores.push(`Fila ${i + filasASaltar + 2}: Fecha invalida "${fechaRaw}"`);
          continue;
        }

        // Determinar monto y si es cargo o abono
        let monto = 0;
        let esCargo = false;

        if (colIndices.abono !== undefined && colIndices.cargo !== undefined) {
          const abonoRaw = row[colIndices.abono];
          const cargoRaw = row[colIndices.cargo];

          const abonoVal = parseNumber(abonoRaw, banco.separador_decimal);
          const cargoVal = parseNumber(cargoRaw, banco.separador_decimal);

          if (abonoVal > 0) {
            monto = abonoVal;
            esCargo = false;
          } else if (cargoVal > 0) {
            monto = cargoVal;
            esCargo = true;
          } else {
            continue; // Sin monto, saltar fila
          }
        } else {
          continue; // No hay columnas de monto
        }

        // Actualizar estadisticas
        if (!fechaMin || fecha < fechaMin) fechaMin = fecha;
        if (!fechaMax || fecha > fechaMax) fechaMax = fecha;
        if (esCargo) {
          montoTotalCargos += monto;
        } else {
          montoTotalAbonos += monto;
        }

        // Extraer otros campos
        const descripcion = colIndices.descripcion !== undefined ? row[colIndices.descripcion]?.toString() : undefined;
        const numeroOperacion = colIndices.numero_operacion !== undefined ? row[colIndices.numero_operacion]?.toString() : undefined;
        const tipoMovimiento = colIndices.tipo_movimiento !== undefined ? row[colIndices.tipo_movimiento]?.toString() : undefined;
        const canal = colIndices.canal !== undefined ? row[colIndices.canal]?.toString() : undefined;
        const fechaProceso = colIndices.fecha_proceso !== undefined ? parseFecha(row[colIndices.fecha_proceso], banco.formato_fecha) : undefined;

        // Extraer nombre y DNI de la descripcion si es posible
        const { nombre, dni } = extraerDatosDeDescripcion(descripcion || '');

        transacciones.push({
          importacion_id: '', // Se llenara despues
          proyecto_id: proyectoId,
          banco_id: bancoId,
          cuenta: cuenta,
          moneda: moneda,
          fecha_operacion: fecha.toISOString().split('T')[0],
          fecha_proceso: fechaProceso?.toISOString().split('T')[0],
          numero_operacion: numeroOperacion,
          tipo_movimiento: tipoMovimiento,
          descripcion: descripcion,
          canal: canal,
          monto: monto,
          es_cargo: esCargo,
          archivo_origen: nombreArchivo,
          fila_origen: i + filasASaltar + 2,
          datos_raw: Object.fromEntries(
            headerRow.map((h: string, idx: number) => [h, row[idx]])
          ),
          estado_matching: 'pendiente',
          nombre_extraido: nombre,
          dni_extraido: dni,
        });
      } catch (err) {
        errores.push(`Fila ${i + filasASaltar + 2}: Error procesando - ${err}`);
      }
    }

    if (transacciones.length === 0) {
      return {
        success: false,
        message: 'No se encontraron transacciones validas en el archivo',
        errores: errores,
      };
    }

    // 5. Insertar importacion
    const { data: importacion, error: importError } = await supabase
      .from('importaciones_bancarias')
      .insert({
        proyecto_id: proyectoId,
        banco_id: bancoId,
        archivo_nombre: nombreArchivo,
        cuenta: cuenta,
        moneda: moneda,
        fecha_desde: fechaMin!.toISOString().split('T')[0],
        fecha_hasta: fechaMax!.toISOString().split('T')[0],
        total_transacciones: transacciones.length,
        transacciones_pendientes: transacciones.filter((t) => !t.es_cargo).length,
        monto_total_abonos: montoTotalAbonos,
        monto_total_cargos: montoTotalCargos,
        estado: 'completado',
        created_by: userId,
      })
      .select()
      .single();

    if (importError || !importacion) {
      console.error('Error creating importacion:', importError);
      return { success: false, message: 'Error al crear registro de importacion' };
    }

    // 6. Insertar transacciones
    const transaccionesConId = transacciones.map((t) => ({
      ...t,
      importacion_id: importacion.id,
    }));

    const { error: transError } = await supabase
      .from('transacciones_bancarias')
      .insert(transaccionesConId);

    if (transError) {
      console.error('Error inserting transacciones:', transError);
      // Eliminar la importacion si falla
      await supabase.from('importaciones_bancarias').delete().eq('id', importacion.id);
      return { success: false, message: 'Error al insertar transacciones' };
    }

    return {
      success: true,
      message: `Se importaron ${transacciones.length} transacciones exitosamente`,
      importacion_id: importacion.id,
      total_transacciones: transacciones.length,
      transacciones_abonos: transacciones.filter((t) => !t.es_cargo).length,
      transacciones_cargos: transacciones.filter((t) => t.es_cargo).length,
      errores: errores.length > 0 ? errores : undefined,
    };
  } catch (error) {
    console.error('Error importing estado de cuenta:', error);
    return { success: false, message: 'Error al procesar el archivo' };
  }
}

// ============================================================================
// TRANSACCIONES
// ============================================================================

export async function getTransacciones(
  importacionId: string,
  filtros?: {
    estado?: string;
    soloAbonos?: boolean;
  }
): Promise<TransaccionBancaria[]> {
  const supabase = await getSupabase();

  let query = supabase
    .from('transacciones_bancarias')
    .select(`
      *,
      abono:abonos_pago(id, monto, fecha_abono, metodo_pago, notas)
    `)
    .eq('importacion_id', importacionId)
    .order('fecha_operacion', { ascending: false });

  if (filtros?.estado) {
    query = query.eq('estado_matching', filtros.estado);
  }

  if (filtros?.soloAbonos) {
    query = query.eq('es_cargo', false);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching transacciones:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// MATCHING
// ============================================================================

export async function buscarMatchesPosibles(
  transaccionId: string
): Promise<MatchSuggestion[]> {
  const supabase = await getSupabase();

  // Obtener la transaccion
  const { data: transaccion, error: transError } = await supabase
    .from('transacciones_bancarias')
    .select('*')
    .eq('id', transaccionId)
    .single();

  if (transError || !transaccion) {
    return [];
  }

  // Buscar abonos que podrian coincidir
  // Criterios: mismo proyecto, rango de fechas, monto similar
  const fechaOp = new Date(transaccion.fecha_operacion);
  const fechaMin = new Date(fechaOp);
  fechaMin.setDate(fechaMin.getDate() - 5);
  const fechaMax = new Date(fechaOp);
  fechaMax.setDate(fechaMax.getDate() + 5);

  // Rango de monto (±1%)
  const montoMin = transaccion.monto * 0.99;
  const montoMax = transaccion.monto * 1.01;

  const { data: abonos, error: abonosError } = await supabase
    .from('abonos_pago')
    .select(`
      id,
      monto,
      fecha_abono,
      metodo_pago,
      notas,
      pago:pagos_local(
        id,
        control_pago:control_pagos(
          id,
          local:locales(codigo),
          lead:leads(nombre_completo, telefono)
        )
      )
    `)
    .gte('fecha_abono', fechaMin.toISOString().split('T')[0])
    .lte('fecha_abono', fechaMax.toISOString().split('T')[0])
    .gte('monto', montoMin)
    .lte('monto', montoMax)
    .is('verificado_por', null); // Solo abonos no verificados

  if (abonosError || !abonos) {
    return [];
  }

  // Calcular confianza para cada match posible
  const sugerencias: MatchSuggestion[] = [];

  for (const abono of abonos) {
    const pago = abono.pago as any;
    const controlPago = pago?.control_pago;
    const local = controlPago?.local;
    const lead = controlPago?.lead;

    if (!controlPago) continue;

    let confianza = 0;
    let motivos: string[] = [];
    let regla = '';

    // Regla 1: Monto exacto (40 puntos)
    if (Math.abs(abono.monto - transaccion.monto) < 0.01) {
      confianza += 40;
      motivos.push('Monto exacto');
      regla = 'MONTO_EXACTO';
    } else {
      confianza += 20; // Monto similar
      motivos.push('Monto similar');
    }

    // Regla 2: Fecha exacta (30 puntos) o cercana (15 puntos)
    const diffDias = Math.abs(
      (new Date(abono.fecha_abono).getTime() - fechaOp.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDias === 0) {
      confianza += 30;
      motivos.push('Misma fecha');
      regla = regla ? `${regla}+FECHA` : 'FECHA_EXACTA';
    } else if (diffDias <= 1) {
      confianza += 20;
      motivos.push('Fecha ±1 día');
    } else if (diffDias <= 3) {
      confianza += 10;
      motivos.push(`Fecha ±${Math.round(diffDias)} días`);
    }

    // Regla 3: Numero de operacion coincide (30 puntos)
    if (transaccion.numero_operacion && abono.notas) {
      if (abono.notas.includes(transaccion.numero_operacion)) {
        confianza += 30;
        motivos.push('Nro. operación coincide');
        regla = regla ? `${regla}+NRO_OP` : 'NRO_OPERACION';
      }
    }

    // Regla 4: Nombre coincide (15 puntos)
    if (transaccion.nombre_extraido && lead?.nombre_completo) {
      const nombreTrans = transaccion.nombre_extraido.toLowerCase();
      const nombreLead = lead.nombre_completo.toLowerCase();
      if (nombreTrans.includes(nombreLead.split(' ')[0]) || nombreLead.includes(nombreTrans.split(' ')[0])) {
        confianza += 15;
        motivos.push('Nombre similar');
      }
    }

    // Solo agregar si confianza >= 50%
    if (confianza >= 50) {
      sugerencias.push({
        abono_id: abono.id,
        control_pago_id: controlPago.id,
        local_codigo: local?.codigo || 'N/A',
        cliente_nombre: lead?.nombre_completo || 'N/A',
        cliente_dni: transaccion.dni_extraido,
        monto: abono.monto,
        fecha_abono: abono.fecha_abono,
        metodo_pago: abono.metodo_pago,
        confianza: Math.min(confianza, 100),
        regla: regla || 'SIMILAR',
        motivo: motivos.join(', '),
      });
    }
  }

  // Ordenar por confianza
  return sugerencias.sort((a, b) => b.confianza - a.confianza);
}

export async function confirmarMatch(
  transaccionId: string,
  abonoId: string,
  controlPagoId: string,
  userId: string,
  esManual: boolean = false
): Promise<{ success: boolean; message?: string }> {
  const supabase = await getSupabase();

  const { error } = await supabase
    .from('transacciones_bancarias')
    .update({
      estado_matching: esManual ? 'manual' : 'matched',
      abono_id: abonoId,
      control_pago_id: controlPagoId,
      matched_at: new Date().toISOString(),
      matched_by: userId,
    })
    .eq('id', transaccionId);

  if (error) {
    console.error('Error confirming match:', error);
    return { success: false, message: 'Error al confirmar match' };
  }

  // Actualizar estadisticas de la importacion
  await actualizarEstadisticasImportacion(transaccionId);

  return { success: true, message: 'Match confirmado exitosamente' };
}

export async function ignorarTransaccion(
  transaccionId: string,
  notas: string,
  userId: string
): Promise<{ success: boolean; message?: string }> {
  const supabase = await getSupabase();

  const { error } = await supabase
    .from('transacciones_bancarias')
    .update({
      estado_matching: 'ignorado',
      notas: notas,
      matched_at: new Date().toISOString(),
      matched_by: userId,
    })
    .eq('id', transaccionId);

  if (error) {
    console.error('Error ignoring transaccion:', error);
    return { success: false, message: 'Error al ignorar transaccion' };
  }

  await actualizarEstadisticasImportacion(transaccionId);

  return { success: true, message: 'Transaccion ignorada' };
}

// ============================================================================
// HELPERS
// ============================================================================

async function actualizarEstadisticasImportacion(transaccionId: string) {
  const supabase = await getSupabase();

  // Obtener importacion_id de la transaccion
  const { data: trans } = await supabase
    .from('transacciones_bancarias')
    .select('importacion_id')
    .eq('id', transaccionId)
    .single();

  if (!trans) return;

  // Calcular estadisticas
  const { data: stats } = await supabase
    .from('transacciones_bancarias')
    .select('estado_matching, es_cargo')
    .eq('importacion_id', trans.importacion_id);

  if (!stats) return;

  const matched = stats.filter(
    (s) => (s.estado_matching === 'matched' || s.estado_matching === 'manual') && !s.es_cargo
  ).length;
  const pendientes = stats.filter((s) => s.estado_matching === 'pendiente' && !s.es_cargo).length;
  const ignorados = stats.filter((s) => s.estado_matching === 'ignorado').length;

  await supabase
    .from('importaciones_bancarias')
    .update({
      transacciones_matched: matched,
      transacciones_pendientes: pendientes,
      transacciones_ignoradas: ignorados,
      updated_at: new Date().toISOString(),
    })
    .eq('id', trans.importacion_id);
}

function parseFecha(value: unknown, formato: string): Date | null {
  if (!value) return null;

  // Si ya es Date
  if (value instanceof Date) return value;

  const str = value.toString().trim();
  if (!str) return null;

  // Intentar parsear segun formato
  if (formato === 'DD/MM/YYYY') {
    const parts = str.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
  }

  // Intentar parseo generico
  const date = new Date(str);
  if (!isNaN(date.getTime())) return date;

  return null;
}

function parseNumber(value: unknown, separadorDecimal: string = '.'): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;

  let str = value.toString().trim();

  // Limpiar simbolos de moneda y espacios
  str = str.replace(/[S\/\$USD PEN,]/gi, '');

  // Ajustar separador decimal
  if (separadorDecimal === ',') {
    str = str.replace('.', '').replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.abs(num);
}

function extraerDatosDeDescripcion(descripcion: string): { nombre?: string; dni?: string } {
  const result: { nombre?: string; dni?: string } = {};

  // Buscar DNI (8 digitos)
  const dniMatch = descripcion.match(/\b\d{8}\b/);
  if (dniMatch) {
    result.dni = dniMatch[0];
  }

  // Extraer nombre (palabras en mayusculas consecutivas)
  const nombreMatch = descripcion.match(/[A-ZÁÉÍÓÚÑ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ]{2,})+/);
  if (nombreMatch) {
    result.nombre = nombreMatch[0];
  }

  return result;
}

// ============================================================================
// EXPORTAR A CONCARD
// ============================================================================

export async function exportarConcard(
  importacionId: string,
  soloMatched: boolean = true
): Promise<{ success: boolean; data?: string; filename?: string; message?: string }> {
  const supabase = await getSupabase();

  // Obtener importacion
  const { data: importacion } = await supabase
    .from('importaciones_bancarias')
    .select(`*, banco:config_bancos(nombre_display)`)
    .eq('id', importacionId)
    .single();

  if (!importacion) {
    return { success: false, message: 'Importacion no encontrada' };
  }

  // Obtener transacciones
  let query = supabase
    .from('transacciones_bancarias')
    .select(`
      *,
      abono:abonos_pago(
        id, monto, fecha_abono, metodo_pago,
        pago:pagos_local(
          control_pago:control_pagos(
            lead:leads(nombre_completo, telefono)
          )
        )
      )
    `)
    .eq('importacion_id', importacionId)
    .eq('es_cargo', false);

  if (soloMatched) {
    query = query.in('estado_matching', ['matched', 'manual']);
  }

  const { data: transacciones } = await query.order('fecha_operacion');

  if (!transacciones || transacciones.length === 0) {
    return { success: false, message: 'No hay transacciones para exportar' };
  }

  // Crear Excel con formato Concard
  const rows = transacciones.map((t) => {
    const abono = t.abono as any;
    const lead = abono?.pago?.control_pago?.lead;

    return {
      'Fecha de operacion': t.fecha_operacion,
      'Fecha de proceso': t.fecha_proceso || '',
      'Nro. de operacion': t.numero_operacion || '',
      'Movimiento': t.tipo_movimiento || '',
      'Descripcion': t.descripcion || '',
      'Canal': t.canal || '',
      'Cargo': '',
      'Abono': t.monto,
      'TIPO': 'BV', // Boleta de Venta
      'COMPROBANTE': '', // Se llena manualmente
      'DNI': t.dni_extraido || '',
      'NOMBRE': lead?.nombre_completo || t.nombre_extraido || '',
      'ESTADO': t.estado_matching === 'matched' || t.estado_matching === 'manual' ? 'IDENTIFICADO' : 'PENDIENTE',
    };
  });

  // Generar Excel
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Consolidado');

  const buffer = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  const filename = `Concard_${(importacion.banco as any)?.nombre_display || 'Banco'}_${importacion.moneda}_${importacion.fecha_desde}_${importacion.fecha_hasta}.xlsx`;

  return {
    success: true,
    data: buffer,
    filename: filename,
  };
}
