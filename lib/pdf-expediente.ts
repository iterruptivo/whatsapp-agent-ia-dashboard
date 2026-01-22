// ============================================================================
// PDF EXPEDIENTE DIGITAL
// ============================================================================
// Descripcion: Genera PDF resumen del expediente con timeline y documentos
// Fase: 6 - Expediente Digital
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExpedienteData {
  local: {
    codigo: string;
    nivel: string;
    area: number;
    precio: number;
  };
  cliente: {
    nombre: string;
    dni: string;
    telefono: string;
    email: string;
  };
  proyecto: {
    nombre: string;
  };
  pagos: Array<{
    tipo: string;
    monto: number;
    fecha: string;
    validado: boolean;
  }>;
  documentos: Array<{
    tipo: string;
    nombre: string;
    url: string;
    fecha: string;
  }>;
  eventos: Array<{
    tipo_evento: string;
    descripcion: string | null;
    created_at: string;
    usuario_nombre?: string;
  }>;
}

/**
 * Genera PDF del expediente digital
 */
export function generateExpedientePDF(data: ExpedienteData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Colores corporativos
  const primaryColor: [number, number, number] = [27, 150, 122]; // #1b967a
  const textColor: [number, number, number] = [51, 51, 51];
  const grayColor: [number, number, number] = [128, 128, 128];

  // ============ ENCABEZADO ============
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('EXPEDIENTE DIGITAL', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Local ${data.local.codigo} - ${data.proyecto.nombre}`, pageWidth / 2, 25, { align: 'center' });

  yPos = 45;

  // ============ DATOS DEL CLIENTE ============
  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL CLIENTE', 14, yPos);
  yPos += 8;

  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const clienteInfo = [
    ['Nombre:', data.cliente.nombre],
    ['DNI:', data.cliente.dni],
    ['Telefono:', data.cliente.telefono],
    ['Email:', data.cliente.email || 'No registrado'],
  ];

  clienteInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 45, yPos);
    yPos += 6;
  });

  yPos += 5;

  // ============ DATOS DEL LOCAL ============
  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL LOCAL', 14, yPos);
  yPos += 8;

  doc.setTextColor(...textColor);
  doc.setFontSize(10);

  const localInfo = [
    ['Codigo:', data.local.codigo],
    ['Nivel:', data.local.nivel],
    ['Area:', `${data.local.area} m²`],
    ['Precio:', `S/ ${data.local.precio.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`],
  ];

  localInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 45, yPos);
    yPos += 6;
  });

  yPos += 10;

  // ============ HISTORIAL DE PAGOS ============
  if (data.pagos.length > 0) {
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('HISTORIAL DE PAGOS', 14, yPos);
    yPos += 5;

    const pagosData = data.pagos.map((p, idx) => [
      (idx + 1).toString(),
      p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1),
      `S/ ${p.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`,
      formatDate(p.fecha),
      p.validado ? 'Validado' : 'Pendiente',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Tipo', 'Monto', 'Fecha', 'Estado']],
      body: pagosData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 35 },
        2: { halign: 'right', cellWidth: 40 },
        3: { halign: 'center', cellWidth: 30 },
        4: { halign: 'center', cellWidth: 30 },
      },
    });

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ============ DOCUMENTOS ============
  if (data.documentos.length > 0) {
    // Verificar si necesitamos nueva pagina
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DOCUMENTOS DEL EXPEDIENTE', 14, yPos);
    yPos += 5;

    const docsData = data.documentos.map((d, idx) => [
      (idx + 1).toString(),
      d.nombre,
      getTipoDocumentoLabel(d.tipo),
      formatDate(d.fecha),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Documento', 'Tipo', 'Fecha']],
      body: docsData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 70 },
        2: { cellWidth: 50 },
        3: { halign: 'center', cellWidth: 35 },
      },
    });

    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ============ TIMELINE DE EVENTOS ============
  if (data.eventos.length > 0) {
    // Verificar si necesitamos nueva pagina
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TIMELINE DEL EXPEDIENTE', 14, yPos);
    yPos += 5;

    const eventosData = data.eventos.map((e, idx) => [
      (idx + 1).toString(),
      formatDate(e.created_at),
      getTipoEventoLabel(e.tipo_evento),
      e.descripcion || '-',
      e.usuario_nombre || '-',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Fecha', 'Evento', 'Descripcion', 'Usuario']],
      body: eventosData,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 70 },
        4: { cellWidth: 35 },
      },
    });
  }

  // ============ PIE DE PAGINA ============
  // @ts-expect-error - getNumberOfPages existe en runtime pero no en tipos
  const totalPages = doc.getNumberOfPages ? doc.getNumberOfPages() : doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();

    // Linea separadora
    doc.setDrawColor(...grayColor);
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

    // Texto del pie
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text(
      `Expediente Digital - ${data.proyecto.nombre} - Local ${data.local.codigo}`,
      14,
      pageHeight - 10
    );
    doc.text(`Pagina ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' });

    // Fecha de generacion
    doc.text(
      `Generado: ${new Date().toLocaleString('es-PE')}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  return doc;
}

// Helpers
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getTipoDocumentoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    dni_titular: 'DNI Titular',
    dni_conyuge: 'DNI Conyuge',
    voucher: 'Voucher',
    voucher_separacion: 'Voucher Separacion',
    voucher_inicial: 'Voucher Inicial',
    boleta: 'Boleta/Factura',
    constancia: 'Constancia',
    constancia_separacion: 'Constancia Separacion',
    constancia_cancelacion: 'Constancia Cancelacion',
    contrato: 'Contrato',
    ficha: 'Ficha Inscripcion',
  };
  return labels[tipo] || tipo;
}

function getTipoEventoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    ficha_creada: 'Ficha Creada',
    documento_subido: 'Documento Subido',
    pago_registrado: 'Pago Registrado',
    pago_validado: 'Pago Validado',
    constancia_generada: 'Constancia Generada',
    contrato_generado: 'Contrato Generado',
    expediente_completo: 'Expediente Completo',
  };
  return labels[tipo] || tipo;
}

/**
 * Descarga el PDF del expediente
 */
export function downloadExpedientePDF(data: ExpedienteData, filename?: string): void {
  const doc = generateExpedientePDF(data);
  const defaultFilename = `Expediente_${data.local.codigo}_${data.cliente.dni}.pdf`;
  doc.save(filename || defaultFilename);
}
