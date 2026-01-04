// ============================================================================
// SERVER ACTIONS: Generación de Constancias Word
// ============================================================================
// Descripción: Genera constancias Word usando docx-templates
// Templates: Se obtienen desde Supabase Storage (constancias-templates bucket)
// Constancias:
//   - Separación: Cuando separacion_pagada = true
//   - Abono: Cuando se verifica un abono (NO separación)
//   - Cancelación: Cuando saldo_pendiente = 0
// ============================================================================

'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createReport } from 'docx-templates';
import JSZip from 'jszip';
import {
  numeroALetras,
  fechaALetras,
  tipoCambioALetras,
  formatearFecha,
} from '@/lib/utils/numero-a-letras';

// ============================================================================
// INTERFACES
// ============================================================================

interface ConstanciaSeparacionData {
  razon_social: string;
  ruc: string;
  direccion_empresa: string;
  cliente_nombre: string;
  cliente_dni: string;
  tiene_conyuge: boolean;
  conyuge_nombre: string;
  conyuge_dni: string;
  monto_pen: string;
  monto_pen_letras: string;
  tipo_cambio: string;
  tipo_cambio_letras: string;
  monto_usd: string;
  monto_usd_letras: string;
  local_codigo: string;
  local_rubro: string;
  local_area: string;
  local_nivel: string;
  proyecto_nombre: string;
  depositos: Array<{
    fecha: string;
    monto: string;
    monto_letras: string;
    moneda: string;
    numero_operacion: string;
  }>;
  plazo_dias: string;
  fecha_vencimiento: string;
  fecha_emision: string;
  firma_nombre: string;
  firma_cargo: string;
}

interface ConstanciaAbonoData {
  razon_social: string;
  ruc: string;
  direccion_empresa: string;
  cliente_nombre: string;
  cliente_dni: string;
  monto_usd: string;
  monto_usd_letras: string;
  fecha_deposito: string;
  numero_operacion: string;
  local_codigo: string;
  local_rubro: string;
  local_area: string;
  proyecto_nombre: string;
  fecha_emision: string;
  firma_nombre: string;
  firma_cargo: string;
}

interface ConstanciaCancelacionData {
  razon_social: string;
  ruc: string;
  direccion_empresa: string;
  cliente_nombre: string;
  cliente_dni: string;
  tiene_conyuge: boolean;
  conyuge_nombre: string;
  conyuge_dni: string;
  monto_total_usd: string;
  monto_total_usd_letras: string;
  local_codigo: string;
  local_rubro: string;
  local_area: string;
  proyecto_nombre: string;
  depositos: Array<{
    tipo: string;
    fecha: string;
    monto: string;
    numero_operacion: string;
  }>;
  fecha_emision: string;
  firma_nombre: string;
  firma_cargo: string;
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

function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

function formatMonto(num: number): string {
  return round2(num).toFixed(2);
}

// ============================================================================
// POST-PROCESSING: Remove empty paragraphs from generated docx
// ============================================================================

async function removeEmptyParagraphs(docxBuffer: Buffer): Promise<Buffer> {
  try {
    const zip = await JSZip.loadAsync(docxBuffer);
    const documentXml = await zip.file('word/document.xml')?.async('string');
    if (!documentXml) {
      return docxBuffer;
    }

    let cleanedXml = documentXml.replace(/<w:p[^>]*\/>/g, '');
    cleanedXml = cleanedXml.replace(/<w:p[^>]*>(?:(?!<w:r[ >])[\s\S])*?<\/w:p>/g, (match) => {
      if (!match.includes('<w:r') && !match.includes('<w:t')) {
        return '';
      }
      return match;
    });
    cleanedXml = cleanedXml.replace(/<w:p[^>]*>(?:\s*<w:pPr>[\s\S]*?<\/w:pPr>)?\s*<w:r[^>]*>\s*<w:t[^>]*>\s*<\/w:t>\s*<\/w:r>\s*<\/w:p>/g, '');

    zip.file('word/document.xml', cleanedXml);
    const newBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    return newBuffer;
  } catch (error) {
    console.error('Error removing empty paragraphs:', error);
    return docxBuffer;
  }
}

// ============================================================================
// FUNCIÓN 1: Generar Constancia de Separación
// ============================================================================

export async function generateConstanciaSeparacion(
  controlPagoId: string
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
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
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

    // 2. Obtener proyecto
    const { data: proyecto, error: proyError } = await supabase
      .from('proyectos')
      .select('*')
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
      return { success: false, error: 'Ficha del cliente no encontrada' };
    }

    // 4. Obtener local
    const { data: local, error: localError } = await supabase
      .from('locales')
      .select('*')
      .eq('id', controlPago.local_id)
      .single();

    if (localError || !local) {
      return { success: false, error: 'Local no encontrado' };
    }

    // 5. Obtener depósitos de separación (abonos del pago tipo 'separacion')
    const { data: pagoSeparacion, error: pagoSepError } = await supabase
      .from('pagos_local')
      .select('id')
      .eq('control_pago_id', controlPagoId)
      .eq('tipo', 'separacion')
      .single();

    if (pagoSepError || !pagoSeparacion) {
      return { success: false, error: 'Pago de separación no encontrado' };
    }

    const { data: abonosSeparacion, error: abonosError } = await supabase
      .from('abonos_pago')
      .select('*')
      .eq('pago_id', pagoSeparacion.id)
      .order('fecha_abono', { ascending: true });

    if (abonosError) {
      return { success: false, error: 'Error al obtener abonos de separación' };
    }

    // 6. Obtener template desde Storage
    let templateBuffer: Buffer;
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('constancias-templates')
        .download('constancia-separacion.docx');

      if (downloadError || !fileData) {
        console.error('Error downloading template:', downloadError);
        return { success: false, error: 'Error al descargar template de constancia de separación' };
      }

      const arrayBuffer = await fileData.arrayBuffer();
      templateBuffer = Buffer.from(arrayBuffer);
    } catch (err) {
      console.error('Error fetching template:', err);
      return { success: false, error: 'Error al descargar template de constancia' };
    }

    // 7. Preparar datos para el template
    const fechaHoy = new Date();
    const tipoCambio = controlPago.tipo_cambio || clienteFicha.tipo_cambio || 3.80;
    const montoPEN = round2(controlPago.monto_separacion * tipoCambio);
    const montoUSD = round2(controlPago.monto_separacion);

    // Obtener representante legal
    const representantes = (proyecto.representantes_legales || []) as Array<{
      nombre: string;
      dni: string;
      cargo: string;
    }>;
    const primerRepresentante = representantes[0] || { nombre: '', dni: '', cargo: '' };

    // Calcular fecha de vencimiento
    const diasVigencia = proyecto.dias_vigencia_separacion || 5;
    const fechaVencimiento = new Date(fechaHoy);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + diasVigencia);

    // Preparar array de depósitos
    const depositos = (abonosSeparacion || []).map((abono: any) => {
      const monto = round2(abono.monto);
      return {
        fecha: formatearFecha(abono.fecha_abono),
        monto: formatMonto(monto),
        monto_letras: numeroALetras(monto, 'USD'),
        moneda: 'US$',
        numero_operacion: abono.numero_operacion || 'N/A',
      };
    });

    const templateData: ConstanciaSeparacionData = {
      razon_social: proyecto.razon_social || '',
      ruc: proyecto.ruc || '',
      direccion_empresa: proyecto.domicilio_fiscal || '',
      cliente_nombre: formatNombreCompleto(
        clienteFicha.titular_nombres,
        clienteFicha.titular_apellido_paterno,
        clienteFicha.titular_apellido_materno
      ),
      cliente_dni: clienteFicha.titular_numero_documento || '',
      tiene_conyuge: clienteFicha.tiene_conyuge || false,
      conyuge_nombre: formatNombreCompleto(
        clienteFicha.conyuge_nombres,
        clienteFicha.conyuge_apellido_paterno,
        clienteFicha.conyuge_apellido_materno
      ),
      conyuge_dni: clienteFicha.conyuge_numero_documento || '',
      monto_pen: formatMonto(montoPEN),
      monto_pen_letras: numeroALetras(montoPEN, 'PEN'),
      tipo_cambio: formatMonto(tipoCambio),
      tipo_cambio_letras: tipoCambioALetras(tipoCambio),
      monto_usd: formatMonto(montoUSD),
      monto_usd_letras: numeroALetras(montoUSD, 'USD'),
      local_codigo: local.codigo || controlPago.codigo_local || '',
      local_rubro: local.rubro || clienteFicha.rubro || '',
      local_area: formatMonto(local.area || controlPago.metraje || 0),
      local_nivel: local.nivel || '',
      proyecto_nombre: proyecto.nombre || '',
      depositos,
      plazo_dias: diasVigencia.toString(),
      fecha_vencimiento: formatearFecha(fechaVencimiento),
      fecha_emision: formatearFecha(fechaHoy),
      firma_nombre: primerRepresentante.nombre,
      firma_cargo: primerRepresentante.cargo,
    };

    // 8. Generar documento Word
    const report = await createReport({
      template: templateBuffer,
      data: templateData,
      cmdDelimiter: ['{', '}'],
    });

    const cleanedReport = await removeEmptyParagraphs(Buffer.from(report));

    // 9. Generar nombre de archivo
    const fileName = `CONSTANCIA_SEPARACION_${controlPago.codigo_local}_${fechaHoy.toISOString().split('T')[0]}.docx`;

    return {
      success: true,
      data: cleanedReport,
      fileName,
    };
  } catch (error) {
    console.error('Error generating constancia separacion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al generar constancia de separación',
    };
  }
}

// ============================================================================
// FUNCIÓN 2: Generar Constancia de Abono
// ============================================================================

export async function generateConstanciaAbono(
  abonoId: string
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
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // 1. Obtener abono
    const { data: abono, error: abonoError } = await supabase
      .from('abonos_pago')
      .select('*')
      .eq('id', abonoId)
      .single();

    if (abonoError || !abono) {
      return { success: false, error: 'Abono no encontrado' };
    }

    // 2. Obtener pago_local
    const { data: pago, error: pagoError } = await supabase
      .from('pagos_local')
      .select('*')
      .eq('id', abono.pago_id)
      .single();

    if (pagoError || !pago) {
      return { success: false, error: 'Pago no encontrado' };
    }

    // Validar que NO sea separación
    if (pago.tipo === 'separacion') {
      return { success: false, error: 'Use generateConstanciaSeparacion para abonos de separación' };
    }

    // 3. Obtener control_pago
    const { data: controlPago, error: cpError } = await supabase
      .from('control_pagos')
      .select('*')
      .eq('id', pago.control_pago_id)
      .single();

    if (cpError || !controlPago) {
      return { success: false, error: 'Control de pago no encontrado' };
    }

    // 4. Obtener proyecto
    const { data: proyecto, error: proyError } = await supabase
      .from('proyectos')
      .select('*')
      .eq('id', controlPago.proyecto_id)
      .single();

    if (proyError || !proyecto) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    // 5. Obtener cliente_ficha
    const { data: clienteFicha, error: cfError } = await supabase
      .from('clientes_ficha')
      .select('*')
      .eq('local_id', controlPago.local_id)
      .single();

    if (cfError || !clienteFicha) {
      return { success: false, error: 'Ficha del cliente no encontrada' };
    }

    // 6. Obtener local
    const { data: local, error: localError } = await supabase
      .from('locales')
      .select('*')
      .eq('id', controlPago.local_id)
      .single();

    if (localError || !local) {
      return { success: false, error: 'Local no encontrado' };
    }

    // 7. Obtener template desde Storage
    let templateBuffer: Buffer;
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('constancias-templates')
        .download('constancia-abono.docx');

      if (downloadError || !fileData) {
        console.error('Error downloading template:', downloadError);
        return { success: false, error: 'Error al descargar template de constancia de abono' };
      }

      const arrayBuffer = await fileData.arrayBuffer();
      templateBuffer = Buffer.from(arrayBuffer);
    } catch (err) {
      console.error('Error fetching template:', err);
      return { success: false, error: 'Error al descargar template de constancia' };
    }

    // 8. Preparar datos para el template
    const fechaHoy = new Date();
    const montoUSD = round2(abono.monto);

    const representantes = (proyecto.representantes_legales || []) as Array<{
      nombre: string;
      dni: string;
      cargo: string;
    }>;
    const primerRepresentante = representantes[0] || { nombre: '', dni: '', cargo: '' };

    const templateData: ConstanciaAbonoData = {
      razon_social: proyecto.razon_social || '',
      ruc: proyecto.ruc || '',
      direccion_empresa: proyecto.domicilio_fiscal || '',
      cliente_nombre: formatNombreCompleto(
        clienteFicha.titular_nombres,
        clienteFicha.titular_apellido_paterno,
        clienteFicha.titular_apellido_materno
      ),
      cliente_dni: clienteFicha.titular_numero_documento || '',
      monto_usd: formatMonto(montoUSD),
      monto_usd_letras: numeroALetras(montoUSD, 'USD'),
      fecha_deposito: formatearFecha(abono.fecha_abono),
      numero_operacion: abono.numero_operacion || 'N/A',
      local_codigo: local.codigo || controlPago.codigo_local || '',
      local_rubro: local.rubro || clienteFicha.rubro || '',
      local_area: formatMonto(local.area || controlPago.metraje || 0),
      proyecto_nombre: proyecto.nombre || '',
      fecha_emision: formatearFecha(fechaHoy),
      firma_nombre: primerRepresentante.nombre,
      firma_cargo: primerRepresentante.cargo,
    };

    // 9. Generar documento Word
    const report = await createReport({
      template: templateBuffer,
      data: templateData,
      cmdDelimiter: ['{', '}'],
    });

    const cleanedReport = await removeEmptyParagraphs(Buffer.from(report));

    // 10. Generar nombre de archivo
    const fileName = `CONSTANCIA_ABONO_${controlPago.codigo_local}_${fechaHoy.toISOString().split('T')[0]}.docx`;

    return {
      success: true,
      data: cleanedReport,
      fileName,
    };
  } catch (error) {
    console.error('Error generating constancia abono:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al generar constancia de abono',
    };
  }
}

// ============================================================================
// FUNCIÓN 3: Generar Constancia de Cancelación
// ============================================================================

export async function generateConstanciaCancelacion(
  controlPagoId: string
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
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
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

    // Validar que esté completamente cancelado
    if (controlPago.saldo_pendiente > 0) {
      return { success: false, error: 'El local aún tiene saldo pendiente. No se puede generar constancia de cancelación.' };
    }

    // 2. Obtener proyecto
    const { data: proyecto, error: proyError } = await supabase
      .from('proyectos')
      .select('*')
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
      return { success: false, error: 'Ficha del cliente no encontrada' };
    }

    // 4. Obtener local
    const { data: local, error: localError } = await supabase
      .from('locales')
      .select('*')
      .eq('id', controlPago.local_id)
      .single();

    if (localError || !local) {
      return { success: false, error: 'Local no encontrado' };
    }

    // 5. Obtener TODOS los pagos con sus abonos
    const { data: pagos, error: pagosError } = await supabase
      .from('pagos_local')
      .select('id, tipo, numero_cuota')
      .eq('control_pago_id', controlPagoId)
      .order('tipo', { ascending: true })
      .order('numero_cuota', { ascending: true });

    if (pagosError || !pagos) {
      return { success: false, error: 'Error al obtener pagos' };
    }

    // 6. Obtener todos los abonos
    const pagoIds = pagos.map(p => p.id);
    const { data: abonos, error: abonosError } = await supabase
      .from('abonos_pago')
      .select('*')
      .in('pago_id', pagoIds)
      .order('fecha_abono', { ascending: true });

    if (abonosError) {
      return { success: false, error: 'Error al obtener abonos' };
    }

    // 7. Obtener template desde Storage
    let templateBuffer: Buffer;
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('constancias-templates')
        .download('constancia-cancelacion.docx');

      if (downloadError || !fileData) {
        console.error('Error downloading template:', downloadError);
        return { success: false, error: 'Error al descargar template de constancia de cancelación' };
      }

      const arrayBuffer = await fileData.arrayBuffer();
      templateBuffer = Buffer.from(arrayBuffer);
    } catch (err) {
      console.error('Error fetching template:', err);
      return { success: false, error: 'Error al descargar template de constancia' };
    }

    // 8. Preparar datos para el template
    const fechaHoy = new Date();
    const montoTotalUSD = round2(controlPago.monto_venta);

    const representantes = (proyecto.representantes_legales || []) as Array<{
      nombre: string;
      dni: string;
      cargo: string;
    }>;
    const primerRepresentante = representantes[0] || { nombre: '', dni: '', cargo: '' };

    // Crear mapa de pago_id a tipo
    const pagoTipoMap = new Map(pagos.map(p => [p.id, { tipo: p.tipo, numero: p.numero_cuota }]));

    // Preparar array de depósitos con tipo de pago
    const depositos = (abonos || []).map((abono: any) => {
      const pagoInfo = pagoTipoMap.get(abono.pago_id);
      let tipoLabel = 'Pago';

      if (pagoInfo) {
        if (pagoInfo.tipo === 'separacion') {
          tipoLabel = 'Separación';
        } else if (pagoInfo.tipo === 'inicial') {
          tipoLabel = 'Cuota Inicial';
        } else if (pagoInfo.tipo === 'cuota') {
          tipoLabel = `Cuota ${pagoInfo.numero}`;
        }
      }

      return {
        tipo: tipoLabel,
        fecha: formatearFecha(abono.fecha_abono),
        monto: formatMonto(round2(abono.monto)),
        numero_operacion: abono.numero_operacion || 'N/A',
      };
    });

    const templateData: ConstanciaCancelacionData = {
      razon_social: proyecto.razon_social || '',
      ruc: proyecto.ruc || '',
      direccion_empresa: proyecto.domicilio_fiscal || '',
      cliente_nombre: formatNombreCompleto(
        clienteFicha.titular_nombres,
        clienteFicha.titular_apellido_paterno,
        clienteFicha.titular_apellido_materno
      ),
      cliente_dni: clienteFicha.titular_numero_documento || '',
      tiene_conyuge: clienteFicha.tiene_conyuge || false,
      conyuge_nombre: formatNombreCompleto(
        clienteFicha.conyuge_nombres,
        clienteFicha.conyuge_apellido_paterno,
        clienteFicha.conyuge_apellido_materno
      ),
      conyuge_dni: clienteFicha.conyuge_numero_documento || '',
      monto_total_usd: formatMonto(montoTotalUSD),
      monto_total_usd_letras: numeroALetras(montoTotalUSD, 'USD'),
      local_codigo: local.codigo || controlPago.codigo_local || '',
      local_rubro: local.rubro || clienteFicha.rubro || '',
      local_area: formatMonto(local.area || controlPago.metraje || 0),
      proyecto_nombre: proyecto.nombre || '',
      depositos,
      fecha_emision: formatearFecha(fechaHoy),
      firma_nombre: primerRepresentante.nombre,
      firma_cargo: primerRepresentante.cargo,
    };

    // 9. Generar documento Word
    const report = await createReport({
      template: templateBuffer,
      data: templateData,
      cmdDelimiter: ['{', '}'],
    });

    const cleanedReport = await removeEmptyParagraphs(Buffer.from(report));

    // 10. Generar nombre de archivo
    const fileName = `CONSTANCIA_CANCELACION_${controlPago.codigo_local}_${fechaHoy.toISOString().split('T')[0]}.docx`;

    return {
      success: true,
      data: cleanedReport,
      fileName,
    };
  } catch (error) {
    console.error('Error generating constancia cancelacion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al generar constancia de cancelación',
    };
  }
}

// ============================================================================
// API ROUTE HELPERS - Para descargar archivos
// ============================================================================

export async function getConstanciaSeparacionDataForDownload(
  controlPagoId: string
): Promise<{ success: boolean; base64?: string; fileName?: string; error?: string }> {
  const result = await generateConstanciaSeparacion(controlPagoId);

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    base64: result.data.toString('base64'),
    fileName: result.fileName,
  };
}

export async function getConstanciaAbonoDataForDownload(
  abonoId: string
): Promise<{ success: boolean; base64?: string; fileName?: string; error?: string }> {
  const result = await generateConstanciaAbono(abonoId);

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    base64: result.data.toString('base64'),
    fileName: result.fileName,
  };
}

export async function getConstanciaCancelacionDataForDownload(
  controlPagoId: string
): Promise<{ success: boolean; base64?: string; fileName?: string; error?: string }> {
  const result = await generateConstanciaCancelacion(controlPagoId);

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    base64: result.data.toString('base64'),
    fileName: result.fileName,
  };
}
