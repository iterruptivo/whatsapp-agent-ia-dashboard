// ============================================================================
// PDF GENERATOR: Financiamiento de Locales
// ============================================================================
// Descripción: Genera PDF con información completa del modal de financiamiento
// Librería: jsPDF + jspdf-autotable
// Colores EcoPlaza: #1b967a (verde), #192c4d (navy), #fbde17 (amarillo)
// SESIÓN 52H: Implementación inicial
// ============================================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Local } from './locales';

interface CalendarioCuota {
  numero: number;
  fecha: string;
  monto?: number;
  interes?: number;
  amortizacion?: number;
  cuota?: number;
  saldo?: number;
}

interface PDFData {
  // Datos del local
  local: Local;

  // Lead vinculado
  leadNombre: string;
  leadTelefono: string;

  // Configuración proyecto
  porcentajeInicial: number | null;
  teaProyecto: number | null;

  // Valores calculados
  montoInicial: number | null;
  inicialRestante: number | null;
  montoRestante: number | null;

  // Financiamiento
  conFinanciamiento: boolean;
  cuotaSeleccionada: number | null;
  fechaPago: string;

  // Calendario
  calendarioCuotas: CalendarioCuota[];
}

export function generarPDFFinanciamiento(data: PDFData): void {
  const doc = new jsPDF();

  // Colores EcoPlaza
  const verde: [number, number, number] = [27, 150, 122]; // #1b967a
  const navy: [number, number, number] = [25, 44, 77]; // #192c4d
  const amarillo: [number, number, number] = [251, 222, 23]; // #fbde17

  let yPos = 20;
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();

  // ========================================
  // HEADER: Logo/Título
  // ========================================
  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ECOPLAZA', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Financiamiento de Local', pageWidth / 2, 25, { align: 'center' });

  yPos = 45;
  doc.setTextColor(0, 0, 0);

  // ========================================
  // SECCIÓN 1: Información del Local
  // ========================================
  doc.setFillColor(verde[0], verde[1], verde[2]);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Información del Local', margin + 3, yPos + 5.5);

  yPos += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const infoLocal = [
    `Código: ${data.local.codigo}`,
    `Proyecto: ${data.local.proyecto_nombre || 'N/A'}`,
    `Precio de Venta: $ ${data.local.monto_venta?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || 'N/A'}`,
    `Separación: $ ${data.local.monto_separacion?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || 'N/A'}`,
    `Lead Vinculado (Cliente): ${data.leadNombre}${data.leadTelefono ? ` (${data.leadTelefono})` : ''}`,
  ];

  infoLocal.forEach((line) => {
    doc.text(line, margin + 5, yPos);
    yPos += 6;
  });

  yPos += 5;

  // ========================================
  // SECCIÓN 2: Cálculos Financieros
  // ========================================
  doc.setFillColor(verde[0], verde[1], verde[2]);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Cálculos Financieros', margin + 3, yPos + 5.5);

  yPos += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const formatMonto = (monto: number | null): string => {
    if (monto === null || monto === undefined) return 'N/A';
    return `$ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculos = [
    `Inicial (${data.porcentajeInicial ?? 'N/A'}%): ${formatMonto(data.montoInicial)}`,
    `Inicial Restante: ${formatMonto(data.inicialRestante)}`,
    `Monto Restante: ${formatMonto(data.montoRestante)}`,
  ];

  calculos.forEach((line) => {
    doc.text(line, margin + 5, yPos);
    yPos += 6;
  });

  yPos += 5;

  // ========================================
  // SECCIÓN 3: Detalles de Financiamiento
  // ========================================
  doc.setFillColor(verde[0], verde[1], verde[2]);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalles de Financiamiento', margin + 3, yPos + 5.5);

  yPos += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const detalles = [
    `¿Con financiamiento?: ${data.conFinanciamiento ? 'Sí' : 'No'}`,
    `Cuotas ${data.conFinanciamiento ? 'con' : 'sin'} intereses: ${data.cuotaSeleccionada ?? 'N/A'} meses`,
  ];

  if (data.conFinanciamiento && data.teaProyecto !== null) {
    detalles.push(`TEA: ${data.teaProyecto}% anual`);
  }

  detalles.push(`Fecha de Pago: ${new Date(data.fechaPago + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}`);

  detalles.forEach((line) => {
    doc.text(line, margin + 5, yPos);
    yPos += 6;
  });

  yPos += 10;

  // ========================================
  // SECCIÓN 4: Calendario de Cuotas (Tabla)
  // ========================================
  if (data.calendarioCuotas.length > 0) {
    doc.setFillColor(verde[0], verde[1], verde[2]);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Calendario de Pagos (${data.conFinanciamiento ? 'Con Intereses - Sistema Francés' : 'Sin Intereses'})`,
      margin + 3,
      yPos + 5.5
    );

    yPos += 12;

    // Tabla con autoTable
    if (data.conFinanciamiento) {
      // Tabla CON financiamiento (6 columnas)
      autoTable(doc, {
        startY: yPos,
        head: [['# Cuota', 'Fecha', 'Interés', 'Amortización', 'Cuota', 'Saldo']],
        body: data.calendarioCuotas.map((cuota) => [
          cuota.numero.toString(),
          new Date(cuota.fecha + 'T00:00:00').toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          formatMonto(cuota.interes ?? null),
          formatMonto(cuota.amortizacion ?? null),
          formatMonto(cuota.cuota ?? null),
          formatMonto(cuota.saldo ?? null),
        ]),
        headStyles: {
          fillColor: navy,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { halign: 'center' },
          1: { halign: 'left' },
          2: { halign: 'right', textColor: [220, 38, 38] }, // Rojo
          3: { halign: 'right', textColor: [37, 99, 235] }, // Azul
          4: { halign: 'right', textColor: verde, fontStyle: 'bold' }, // Verde
          5: { halign: 'right' },
        },
        margin: { left: margin, right: margin },
      });
    } else {
      // Tabla SIN financiamiento (3 columnas)
      autoTable(doc, {
        startY: yPos,
        head: [['# Cuota', 'Fecha de Pago', 'Monto']],
        body: data.calendarioCuotas.map((cuota) => [
          cuota.numero.toString(),
          new Date(cuota.fecha + 'T00:00:00').toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          formatMonto(cuota.monto ?? null),
        ]),
        headStyles: {
          fillColor: navy,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10,
        },
        bodyStyles: {
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { halign: 'center' },
          1: { halign: 'left' },
          2: { halign: 'right', textColor: verde, fontStyle: 'bold' },
        },
        margin: { left: margin, right: margin },
      });
    }
  }

  // ========================================
  // FOOTER: Fecha de generación
  // ========================================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Generado el ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // ========================================
  // GUARDAR PDF
  // ========================================
  const fileName = `Local-${data.local.codigo}-Financiamiento.pdf`;
  doc.save(fileName);
}
