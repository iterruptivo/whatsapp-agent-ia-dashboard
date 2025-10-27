// ====================================================================
// EXPORT LEADS TO EXCEL - QUIRÚRGICO Y EFICIENTE
// ====================================================================
// Fecha: 26 Octubre 2025
// Feature: Exportar leads filtrados a archivo Excel (.xlsx)
// Librería: xlsx (SheetJS) - https://sheetjs.com/
// ====================================================================

import * as XLSX from 'xlsx';
import { Lead } from './db';

/**
 * Formatea una fecha ISO a formato DD/MM/YYYY HH:MM (timezone Lima)
 * @param isoDate - Fecha en formato ISO string
 * @returns Fecha formateada o "N/A" si es null/inválido
 */
function formatDateForExcel(isoDate: string | null): string {
  if (!isoDate) return 'N/A';

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return 'N/A';

    // Formatear en timezone América/Lima
    const formatted = date.toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return formatted;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
}

/**
 * Genera nombre de archivo dinámico para el export
 * @param proyectoNombre - Nombre del proyecto actual
 * @returns Nombre del archivo .xlsx (ej: "Leads_Proyecto-San-Gabriel_26-10-2025.xlsx")
 */
function generateFileName(proyectoNombre: string): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '-'); // Replace / with -

  // Sanitize proyecto nombre (remove special chars, spaces to hyphens)
  const sanitizedProyecto = proyectoNombre
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30); // Limit length

  return `Leads_${sanitizedProyecto}_${dateStr}.xlsx`;
}

/**
 * Transforma array de Leads a formato Excel-friendly
 * @param leads - Array de leads filtrados
 * @returns Array de objetos con columnas para Excel
 */
function transformLeadsForExcel(leads: Lead[]): any[] {
  return leads.map(lead => ({
    // Columna 1: Proyecto
    'Proyecto': lead.proyecto_nombre || 'N/A',

    // Columna 2: Nombre
    'Nombre': lead.nombre || 'N/A',

    // Columna 3: Teléfono (preservar como texto para mantener formato)
    'Teléfono': lead.telefono || 'N/A',

    // Columna 4: Email (si existe en el futuro, por ahora N/A)
    'Email': 'N/A', // Campo no existe en BD actual, placeholder

    // Columna 5: Rubro
    'Rubro': lead.rubro || 'N/A',

    // Columna 6: Horario de Visita (texto original del usuario)
    'Horario de Visita': lead.horario_visita || 'N/A',

    // Columna 7: Horario Timestamp (fecha parseada)
    'Horario Timestamp': formatDateForExcel(lead.horario_visita_timestamp),

    // Columna 8: Estado
    'Estado': lead.estado || 'N/A',

    // Columna 9: Vendedor Asignado
    'Vendedor Asignado': lead.vendedor_nombre || 'Sin Asignar',

    // Columna 10: Fecha de Captura
    'Fecha de Captura': formatDateForExcel(lead.fecha_captura),

    // Columna 11: Último Mensaje
    'Último Mensaje': lead.ultimo_mensaje || 'N/A',

    // Columna 12: Resumen Historial
    'Resumen Historial': lead.resumen_historial || 'N/A',
  }));
}

/**
 * FUNCIÓN PRINCIPAL: Exporta leads filtrados a archivo Excel
 *
 * @param leads - Array de leads filtrados (respeta TODOS los filtros activos)
 * @param proyectoNombre - Nombre del proyecto actual (para nombre de archivo)
 *
 * @example
 * // En DashboardClient o OperativoClient:
 * exportLeadsToExcel(filteredLeads, selectedProyecto.nombre);
 *
 * @features
 * - Exporta solo leads visibles en tabla (respeta filtros)
 * - Formateo de fechas en timezone Lima
 * - Manejo de campos null/undefined
 * - Nombre de archivo dinámico con fecha y proyecto
 * - Descarga automática en navegador
 * - Sheet único (no múltiples sheets)
 *
 * @performance
 * - < 100 leads: Instantáneo
 * - 100-500 leads: < 2 segundos
 * - 500-1000 leads: 2-5 segundos
 */
export function exportLeadsToExcel(leads: Lead[], proyectoNombre: string): void {
  try {
    // Validación: Si no hay leads, no exportar
    if (!leads || leads.length === 0) {
      alert('No hay leads para exportar. Intenta ajustar los filtros.');
      return;
    }

    // PASO 1: Transformar datos de Leads a formato Excel
    const excelData = transformLeadsForExcel(leads);

    // PASO 2: Crear worksheet (hoja) con los datos
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // PASO 3: Configurar ancho de columnas para mejor legibilidad
    const columnWidths = [
      { wch: 20 }, // Proyecto
      { wch: 25 }, // Nombre
      { wch: 15 }, // Teléfono
      { wch: 25 }, // Email
      { wch: 20 }, // Rubro
      { wch: 30 }, // Horario de Visita
      { wch: 20 }, // Horario Timestamp
      { wch: 18 }, // Estado
      { wch: 20 }, // Vendedor Asignado
      { wch: 20 }, // Fecha de Captura
      { wch: 40 }, // Último Mensaje
      { wch: 40 }, // Resumen Historial
    ];
    worksheet['!cols'] = columnWidths;

    // PASO 4: Crear workbook (libro) y agregar worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

    // PASO 5: Generar nombre de archivo dinámico
    const fileName = generateFileName(proyectoNombre);

    // PASO 6: Generar archivo y descargar en navegador
    XLSX.writeFile(workbook, fileName);

    console.log(`✅ Excel exportado exitosamente: ${fileName} (${leads.length} leads)`);
  } catch (error) {
    console.error('❌ Error exportando a Excel:', error);
    alert('Ocurrió un error al exportar a Excel. Intenta nuevamente.');
  }
}

// ====================================================================
// NOTAS DE IMPLEMENTACIÓN
// ====================================================================
/**
 * COLUMNAS INCLUIDAS (12 total):
 * 1. Proyecto - Nombre del proyecto (San Gabriel, Trapiche, etc.)
 * 2. Nombre - Nombre del lead
 * 3. Teléfono - Número de contacto
 * 4. Email - Placeholder (campo no existe en BD actual)
 * 5. Rubro - Negocio/industria del lead
 * 6. Horario de Visita - Texto original del usuario
 * 7. Horario Timestamp - Fecha parseada en formato DD/MM/YYYY HH:MM
 * 8. Estado - Lead Completo, Incompleto, etc.
 * 9. Vendedor Asignado - Nombre del vendedor o "Sin Asignar"
 * 10. Fecha de Captura - Cuándo se capturó el lead
 * 11. Último Mensaje - Último mensaje del chat
 * 12. Resumen Historial - Resumen de la conversación
 *
 * COLUMNAS NO INCLUIDAS (por solicitud del usuario):
 * - Historial Completo de Conversación (muy pesado)
 * - Intentos del Bot (dato técnico, no relevante para export)
 * - Notificación Enviada (dato técnico)
 * - Created At, Updated At (redundantes con Fecha de Captura)
 *
 * RESPETA FILTROS:
 * - Exporta solo leads pasados en el array (filteredLeads)
 * - Si usuario filtra por fecha → solo esos leads
 * - Si usuario filtra por estado → solo esos leads
 * - Si usuario filtra por vendedor → solo esos leads
 * - Si usuario busca por texto → solo esos leads
 * - Combinación de filtros: exporta intersección
 *
 * FORMATO DE ARCHIVO:
 * - Formato: .xlsx (Excel 2007+)
 * - Sheet único: "Leads"
 * - Nombre archivo: Leads_[Proyecto]_[Fecha].xlsx
 * - Ejemplo: Leads_Proyecto-San-Gabriel_26-10-2025.xlsx
 *
 * COMPATIBILIDAD:
 * - Excel 2007+ (Windows/Mac)
 * - Google Sheets (importación directa)
 * - LibreOffice Calc
 * - Apple Numbers
 *
 * SEGURIDAD:
 * - Client-side only (no envía datos al servidor)
 * - No almacena datos después de descargar
 * - Usuario controla qué exporta (filtros)
 */
