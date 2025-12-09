// ============================================================================
// SERVER ACTIONS: Generación de Contratos Word
// ============================================================================
// Descripción: Genera contratos Word usando docx-templates
// Templates: Se obtienen desde Supabase Storage (contratos-templates bucket)
// Sesión: 66
// ============================================================================

'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createReport } from 'docx-templates';
import {
  numeroALetras,
  fechaALetras,
  tipoCambioALetras,
  numeroEnteroALetras,
  generarMontoVariantes,
  calcularFechaUltimaCuota,
  formatearFecha,
  extraerDia,
  convertirUSDaPEN,
} from '@/lib/utils/numero-a-letras';

// ============================================================================
// INTERFACES
// ============================================================================

interface RepresentanteLegal {
  nombre: string;
  dni: string;
  cargo: string;
}

interface CuentaBancaria {
  banco: string;
  numero: string;
  tipo: 'Corriente' | 'Ahorros';
  moneda: 'USD' | 'PEN';
}

interface Copropietario {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  tipo_documento: string;
  numero_documento: string;
  parentesco: string;
  telefono?: string;
  email?: string;
}

interface ContratoTemplateData {
  // Fecha del contrato
  fecha_contrato: string;
  fecha_contrato_texto: string;

  // Proyecto - Datos legales
  proyecto_nombre: string;
  denominacion_proyecto: string;
  razon_social: string;
  ruc: string;
  domicilio_fiscal: string;
  ubicacion_terreno: string;
  partida_electronica: string;
  zona_registral: string;

  // Representante legal (primero del array)
  representante_nombre: string;
  representante_dni: string;
  representante_cargo: string;

  // Array completo de representantes (para loops)
  representantes_legales: RepresentanteLegal[];

  // Cuentas bancarias
  cuentas_bancarias: CuentaBancaria[];

  // Titular
  titular_nombres: string;
  titular_apellido_paterno: string;
  titular_apellido_materno: string;
  titular_nombre_completo: string;
  titular_tipo_documento: string;
  titular_numero_documento: string;
  titular_fecha_nacimiento: string;
  titular_lugar_nacimiento: string;
  titular_estado_civil: string;
  titular_nacionalidad: string;
  titular_direccion: string;
  titular_distrito: string;
  titular_provincia: string;
  titular_departamento: string;
  titular_direccion_completa: string;
  titular_celular: string;
  titular_telefono_fijo: string;
  titular_email: string;
  titular_ocupacion: string;
  titular_centro_trabajo: string;
  titular_ruc: string;

  // Cónyuge (condicional)
  tiene_conyuge: boolean;
  conyuge_nombres: string;
  conyuge_apellido_paterno: string;
  conyuge_apellido_materno: string;
  conyuge_nombre_completo: string;
  conyuge_tipo_documento: string;
  conyuge_numero_documento: string;
  conyuge_fecha_nacimiento: string;
  conyuge_lugar_nacimiento: string;
  conyuge_nacionalidad: string;
  conyuge_ocupacion: string;
  conyuge_celular: string;
  conyuge_email: string;

  // Copropietarios (array para FOR loops - futuro: agregar a clientes_ficha)
  copropietarios: Copropietario[];

  // Local
  codigo_local: string;
  metraje: number;
  metraje_texto: string;
  rubro: string;

  // Montos USD
  monto_venta: number;
  monto_venta_texto: string;
  monto_separacion: number;
  monto_separacion_texto: string;
  cuota_inicial: number;
  cuota_inicial_texto: string;
  saldo_financiar: number;
  saldo_financiar_texto: string;

  // Montos PEN
  monto_venta_pen: number;
  monto_venta_pen_texto: string;
  monto_separacion_pen: number;
  monto_separacion_pen_texto: string;
  cuota_inicial_pen: number;
  cuota_inicial_pen_texto: string;
  saldo_financiar_pen: number;
  saldo_financiar_pen_texto: string;

  // Tipo de cambio
  tipo_cambio: number;
  tipo_cambio_texto: string;

  // Financiamiento
  con_financiamiento: boolean;
  porcentaje_inicial: number;
  porcentaje_inicial_texto: string;
  numero_cuotas: number;
  numero_cuotas_texto: string;
  cuota_mensual: number;
  cuota_mensual_texto: string;
  cuota_mensual_pen: number;
  cuota_mensual_pen_texto: string;
  tea: number;
  dia_pago: number;
  dia_pago_texto: string;

  // Fechas de pago
  fecha_inicio_pago: string;
  fecha_inicio_pago_texto: string;
  fecha_ultima_cuota: string;
  fecha_ultima_cuota_texto: string;

  // Condiciones para tablas
  es_frances: boolean;
  es_simple: boolean;

  // Tabla de amortización/cuotas
  calendario_cuotas: Array<{
    numero: number;
    fecha: string;
    cuota: number;
    interes?: number;
    amortizacion?: number;
    saldo?: number;
  }>;

  // Penalidad y plazos
  plazo_firma_dias: number;
  plazo_firma_dias_texto: string;
  penalidad_porcentaje: number;
  penalidad_porcentaje_texto: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function formatNombreCompleto(
  nombres: string | null,
  apellidoPaterno: string | null,
  apellidoMaterno: string | null
): string {
  const parts = [nombres, apellidoPaterno, apellidoMaterno].filter(Boolean);
  return parts.join(' ') || '';
}

function formatDireccionCompleta(
  direccion: string | null,
  distrito: string | null,
  provincia: string | null,
  departamento: string | null
): string {
  const parts = [direccion, distrito, provincia, departamento].filter(Boolean);
  return parts.join(', ') || '';
}

// ============================================================================
// MAIN FUNCTION: Generate Contract
// ============================================================================

export async function generateContrato(
  controlPagoId: string,
  tipoCambio: number = 3.80
): Promise<{ success: boolean; data?: Buffer; fileName?: string; error?: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // 1. Obtener control_pago
    const { data: controlPago, error: cpError } = await supabase
      .from('control_pagos')
      .select('*')
      .eq('id', controlPagoId)
      .single();

    if (cpError || !controlPago) {
      return { success: false, error: 'Control de pago no encontrado' };
    }

    // 2. Obtener proyecto con datos legales
    const { data: proyecto, error: proyError } = await supabase
      .from('proyectos')
      .select(`
        id, nombre, slug,
        razon_social, ruc, domicilio_fiscal, ubicacion_terreno, denominacion_proyecto,
        partida_electronica, zona_registral,
        plazo_firma_dias, penalidad_porcentaje,
        representantes_legales, cuentas_bancarias,
        contrato_template_url
      `)
      .eq('id', controlPago.proyecto_id)
      .single();

    if (proyError || !proyecto) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    // 3. Obtener cliente_ficha
    const { data: clienteFicha, error: cfError } = await supabase
      .from('clientes_ficha')
      .select('*')
      .eq('local_id', controlPago.local_id)
      .single();

    if (cfError || !clienteFicha) {
      return { success: false, error: 'Ficha del cliente no encontrada. Complete la ficha de inscripción primero.' };
    }

    // 4. Obtener template Word desde Supabase Storage (bucket privado)
    // contrato_template_url ahora contiene solo el nombre del archivo
    if (!proyecto.contrato_template_url) {
      return { success: false, error: 'No hay template de contrato configurado para este proyecto. Configure uno en Configuración de Proyectos.' };
    }

    let templateBuffer: Buffer;
    try {
      // Descargar archivo directamente desde Storage (bucket privado, usuario autenticado)
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('contratos-templates')
        .download(proyecto.contrato_template_url);

      if (downloadError || !fileData) {
        console.error('Error downloading template:', downloadError);
        throw new Error(downloadError?.message || 'Error al descargar template');
      }

      const arrayBuffer = await fileData.arrayBuffer();
      templateBuffer = Buffer.from(arrayBuffer);
    } catch (err) {
      console.error('Error fetching template:', err);
      return { success: false, error: 'Error al descargar template de contrato. Verifique que el archivo existe.' };
    }

    // 5. Preparar datos para el template
    const fechaHoy = new Date();
    const representantes = (proyecto.representantes_legales || []) as RepresentanteLegal[];
    const cuentas = (proyecto.cuentas_bancarias || []) as CuentaBancaria[];
    const primerRepresentante = representantes[0] || { nombre: '', dni: '', cargo: '' };

    // Calcular cuota mensual del calendario
    const calendario = controlPago.calendario_cuotas || [];
    const cuotaMensual = calendario.length > 0 ? calendario[0].cuota || 0 : 0;

    // Calcular fecha última cuota
    const fechaInicioPago = new Date(controlPago.fecha_primer_pago);
    const fechaUltimaCuota = calcularFechaUltimaCuota(fechaInicioPago, controlPago.numero_cuotas);

    // Determinar tipo de tabla (francesa vs simple)
    const esFrances = (controlPago.tea || 0) > 0;

    const templateData: ContratoTemplateData = {
      // Fecha del contrato
      fecha_contrato: formatearFecha(fechaHoy),
      fecha_contrato_texto: fechaALetras(fechaHoy),

      // Proyecto
      proyecto_nombre: proyecto.nombre || '',
      denominacion_proyecto: proyecto.denominacion_proyecto || '',
      razon_social: proyecto.razon_social || '',
      ruc: proyecto.ruc || '',
      domicilio_fiscal: proyecto.domicilio_fiscal || '',
      ubicacion_terreno: proyecto.ubicacion_terreno || '',
      partida_electronica: proyecto.partida_electronica || '',
      zona_registral: proyecto.zona_registral || '',

      // Representante principal
      representante_nombre: primerRepresentante.nombre,
      representante_dni: primerRepresentante.dni,
      representante_cargo: primerRepresentante.cargo,

      // Arrays para loops
      representantes_legales: representantes,
      cuentas_bancarias: cuentas,

      // Titular
      titular_nombres: clienteFicha.titular_nombres || '',
      titular_apellido_paterno: clienteFicha.titular_apellido_paterno || '',
      titular_apellido_materno: clienteFicha.titular_apellido_materno || '',
      titular_nombre_completo: formatNombreCompleto(
        clienteFicha.titular_nombres,
        clienteFicha.titular_apellido_paterno,
        clienteFicha.titular_apellido_materno
      ),
      titular_tipo_documento: clienteFicha.titular_tipo_documento || 'DNI',
      titular_numero_documento: clienteFicha.titular_numero_documento || '',
      titular_fecha_nacimiento: clienteFicha.titular_fecha_nacimiento
        ? formatearFecha(clienteFicha.titular_fecha_nacimiento)
        : '',
      titular_lugar_nacimiento: clienteFicha.titular_lugar_nacimiento || '',
      titular_estado_civil: clienteFicha.titular_estado_civil || '',
      titular_nacionalidad: clienteFicha.titular_nacionalidad || 'PERUANA',
      titular_direccion: clienteFicha.titular_direccion || '',
      titular_distrito: clienteFicha.titular_distrito || '',
      titular_provincia: clienteFicha.titular_provincia || '',
      titular_departamento: clienteFicha.titular_departamento || '',
      titular_direccion_completa: formatDireccionCompleta(
        clienteFicha.titular_direccion,
        clienteFicha.titular_distrito,
        clienteFicha.titular_provincia,
        clienteFicha.titular_departamento
      ),
      titular_celular: clienteFicha.titular_celular || '',
      titular_telefono_fijo: clienteFicha.titular_telefono_fijo || '',
      titular_email: clienteFicha.titular_email || '',
      titular_ocupacion: clienteFicha.titular_ocupacion || '',
      titular_centro_trabajo: clienteFicha.titular_centro_trabajo || '',
      titular_ruc: clienteFicha.titular_ruc || '',

      // Cónyuge
      tiene_conyuge: clienteFicha.tiene_conyuge || false,
      conyuge_nombres: clienteFicha.conyuge_nombres || '',
      conyuge_apellido_paterno: clienteFicha.conyuge_apellido_paterno || '',
      conyuge_apellido_materno: clienteFicha.conyuge_apellido_materno || '',
      conyuge_nombre_completo: formatNombreCompleto(
        clienteFicha.conyuge_nombres,
        clienteFicha.conyuge_apellido_paterno,
        clienteFicha.conyuge_apellido_materno
      ),
      conyuge_tipo_documento: clienteFicha.conyuge_tipo_documento || 'DNI',
      conyuge_numero_documento: clienteFicha.conyuge_numero_documento || '',
      conyuge_fecha_nacimiento: clienteFicha.conyuge_fecha_nacimiento
        ? formatearFecha(clienteFicha.conyuge_fecha_nacimiento)
        : '',
      conyuge_lugar_nacimiento: clienteFicha.conyuge_lugar_nacimiento || '',
      conyuge_nacionalidad: clienteFicha.conyuge_nacionalidad || '',
      conyuge_ocupacion: clienteFicha.conyuge_ocupacion || '',
      conyuge_celular: clienteFicha.conyuge_celular || '',
      conyuge_email: clienteFicha.conyuge_email || '',

      // Copropietarios (desde clientes_ficha.copropietarios JSONB)
      copropietarios: (clienteFicha.copropietarios || []) as Copropietario[],

      // Local
      codigo_local: controlPago.codigo_local || '',
      metraje: controlPago.metraje || 0,
      metraje_texto: numeroEnteroALetras(Math.floor(controlPago.metraje || 0)),
      rubro: clienteFicha.rubro || '',

      // Montos USD
      monto_venta: controlPago.monto_venta || 0,
      monto_venta_texto: numeroALetras(controlPago.monto_venta || 0, 'USD'),
      monto_separacion: controlPago.monto_separacion || 0,
      monto_separacion_texto: numeroALetras(controlPago.monto_separacion || 0, 'USD'),
      cuota_inicial: controlPago.monto_inicial || 0,
      cuota_inicial_texto: numeroALetras(controlPago.monto_inicial || 0, 'USD'),
      saldo_financiar: controlPago.monto_restante || 0,
      saldo_financiar_texto: numeroALetras(controlPago.monto_restante || 0, 'USD'),

      // Montos PEN
      monto_venta_pen: convertirUSDaPEN(controlPago.monto_venta || 0, tipoCambio),
      monto_venta_pen_texto: numeroALetras(convertirUSDaPEN(controlPago.monto_venta || 0, tipoCambio), 'PEN'),
      monto_separacion_pen: convertirUSDaPEN(controlPago.monto_separacion || 0, tipoCambio),
      monto_separacion_pen_texto: numeroALetras(convertirUSDaPEN(controlPago.monto_separacion || 0, tipoCambio), 'PEN'),
      cuota_inicial_pen: convertirUSDaPEN(controlPago.monto_inicial || 0, tipoCambio),
      cuota_inicial_pen_texto: numeroALetras(convertirUSDaPEN(controlPago.monto_inicial || 0, tipoCambio), 'PEN'),
      saldo_financiar_pen: convertirUSDaPEN(controlPago.monto_restante || 0, tipoCambio),
      saldo_financiar_pen_texto: numeroALetras(convertirUSDaPEN(controlPago.monto_restante || 0, tipoCambio), 'PEN'),

      // Tipo de cambio
      tipo_cambio: tipoCambio,
      tipo_cambio_texto: tipoCambioALetras(tipoCambio),

      // Financiamiento
      con_financiamiento: controlPago.con_financiamiento || false,
      porcentaje_inicial: controlPago.porcentaje_inicial || 0,
      porcentaje_inicial_texto: numeroEnteroALetras(controlPago.porcentaje_inicial || 0),
      numero_cuotas: controlPago.numero_cuotas || 0,
      numero_cuotas_texto: numeroEnteroALetras(controlPago.numero_cuotas || 0),
      cuota_mensual: cuotaMensual,
      cuota_mensual_texto: numeroALetras(cuotaMensual, 'USD'),
      cuota_mensual_pen: convertirUSDaPEN(cuotaMensual, tipoCambio),
      cuota_mensual_pen_texto: numeroALetras(convertirUSDaPEN(cuotaMensual, tipoCambio), 'PEN'),
      tea: controlPago.tea || 0,
      dia_pago: extraerDia(fechaInicioPago),
      dia_pago_texto: numeroEnteroALetras(extraerDia(fechaInicioPago)),

      // Fechas de pago
      fecha_inicio_pago: formatearFecha(fechaInicioPago),
      fecha_inicio_pago_texto: fechaALetras(fechaInicioPago),
      fecha_ultima_cuota: formatearFecha(fechaUltimaCuota),
      fecha_ultima_cuota_texto: fechaALetras(fechaUltimaCuota),

      // Condiciones para tablas
      es_frances: esFrances,
      es_simple: !esFrances,

      // Calendario de cuotas
      calendario_cuotas: calendario.map((cuota: any, index: number) => ({
        numero: index + 1,
        fecha: formatearFecha(cuota.fecha),
        cuota: cuota.cuota || 0,
        interes: cuota.interes || 0,
        amortizacion: cuota.amortizacion || 0,
        saldo: cuota.saldo || 0,
      })),

      // Penalidad y plazos
      plazo_firma_dias: proyecto.plazo_firma_dias || 5,
      plazo_firma_dias_texto: numeroEnteroALetras(proyecto.plazo_firma_dias || 5),
      penalidad_porcentaje: proyecto.penalidad_porcentaje || 100,
      penalidad_porcentaje_texto: numeroEnteroALetras(proyecto.penalidad_porcentaje || 100),
    };

    // 6. Generar documento Word
    const report = await createReport({
      template: templateBuffer,
      data: templateData,
      cmdDelimiter: ['{', '}'],
    });

    // 7. Generar nombre de archivo
    const fileName = `CONTRATO_${controlPago.codigo_local}_${fechaHoy.toISOString().split('T')[0]}.docx`;

    return {
      success: true,
      data: Buffer.from(report),
      fileName,
    };
  } catch (error) {
    console.error('Error generating contrato:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al generar contrato',
    };
  }
}

// ============================================================================
// API ROUTE HELPER - Para descargar el archivo
// ============================================================================

export async function getContratoDataForDownload(
  controlPagoId: string,
  tipoCambio: number = 3.80
): Promise<{ success: boolean; base64?: string; fileName?: string; error?: string }> {
  const result = await generateContrato(controlPagoId, tipoCambio);

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    base64: result.data.toString('base64'),
    fileName: result.fileName,
  };
}
