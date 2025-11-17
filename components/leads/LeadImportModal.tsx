// ============================================================================
// COMPONENT: LeadImportModal
// ============================================================================
// Descripción: Modal para importar leads manuales desde CSV o Excel
// Formato: nombre,telefono,email_vendedor,utm,email,rubro
// Acceso: Solo Admin
// ============================================================================

'use client';

import { useState, useRef } from 'react';
import { importManualLeads } from '@/lib/actions';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { X, Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proyectoId: string;
  proyectoNombre: string;
}

interface ParsedLead {
  nombre: string;
  telefono: string;
  email_vendedor: string;
  utm: string; // REQUERIDO para leads manuales
  email?: string;
  rubro?: string;
}

export default function LeadImportModal({
  isOpen,
  onClose,
  onSuccess,
  proyectoId,
  proyectoNombre,
}: LeadImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedLead[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    imported: number;
    duplicates: Array<{ nombre: string; telefono: string }>;
    invalidVendors: Array<{ email: string; row: number; reason?: string }>;
    missingUtm: Array<{ nombre: string; row: number }>;
    total: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ====== ESC KEY TO CLOSE ======
  const handleEsc = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // ====== FILE SELECTION ======
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
      alert('Por favor selecciona un archivo CSV o Excel (.xlsx)');
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  // ====== PARSE FILE ======
  const parseFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target?.result;

      if (file.name.endsWith('.csv')) {
        // Parse CSV
        Papa.parse(data as string, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const leads = results.data.map((row: any) => ({
              nombre: row.nombre || '',
              telefono: row.telefono || '',
              email_vendedor: row.email_vendedor || '',
              utm: row.utm || '', // REQUERIDO
              email: row.email || '',
              rubro: row.rubro || '',
            }));
            setParsedData(leads);
          },
        });
      } else {
        // Parse Excel
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const leads = jsonData.map((row: any) => ({
          nombre: row.nombre || '',
          telefono: row.telefono || '',
          email_vendedor: row.email_vendedor || '',
          utm: row.utm || '', // REQUERIDO
          email: row.email || '',
          rubro: row.rubro || '',
        }));
        setParsedData(leads);
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  // ====== IMPORT ======
  const handleImport = async () => {
    if (parsedData.length === 0) {
      alert('No hay datos para importar');
      return;
    }

    // Validar que todos tengan nombre, telefono, email_vendedor, utm
    const hasInvalidRows = parsedData.some(
      (lead) => !lead.nombre || !lead.telefono || !lead.email_vendedor || !lead.utm
    );

    if (hasInvalidRows) {
      alert(
        'Todos los leads deben tener: nombre, telefono, email_vendedor, utm. Por favor revisa el archivo.'
      );
      return;
    }

    setImporting(true);

    const importResult = await importManualLeads(proyectoId, parsedData);

    setImporting(false);
    setResult(importResult);

    if (importResult.success && importResult.imported > 0) {
      // Esperar 2 segundos antes de llamar onSuccess
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }
  };

  // ====== RESET ======
  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ====== DOWNLOAD TEMPLATE ======
  const handleDownloadTemplate = () => {
    // Datos de ejemplo para la plantilla
    const templateData = [
      {
        nombre: 'Juan Pérez',
        telefono: '+51987654321',
        email_vendedor: 'leo@ecoplaza.com',
        utm: 'facebook',
        email: 'juan.perez@ejemplo.com',
        rubro: 'Restaurante',
      },
      {
        nombre: 'María García',
        telefono: '+51912345678',
        email_vendedor: 'leo@ecoplaza.com',
        utm: 'instagram',
        email: 'maria.garcia@ejemplo.com',
        rubro: 'Retail',
      },
    ];

    // Crear workbook
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

    // Descargar archivo
    XLSX.writeFile(workbook, 'plantilla_leads_manuales.xlsx');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onKeyDown={handleEsc}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Importar Leads Manuales</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Formato Ejemplo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Formato ejemplo:</p>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar plantilla
              </button>
            </div>

            {/* Tabla de ejemplo */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium">nombre</th>
                    <th className="text-left py-2 px-3 font-medium">telefono</th>
                    <th className="text-left py-2 px-3 font-medium">email_vendedor</th>
                    <th className="text-left py-2 px-3 font-medium">utm</th>
                    <th className="text-left py-2 px-3 font-medium">email</th>
                    <th className="text-left py-2 px-3 font-medium">rubro</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-200 bg-white">
                    <td className="py-2 px-3 text-gray-900">Juan Pérez</td>
                    <td className="py-2 px-3 text-gray-900">+51987654321</td>
                    <td className="py-2 px-3 text-gray-900">leo@ecoplaza.com</td>
                    <td className="py-2 px-3 text-gray-900">facebook</td>
                    <td className="py-2 px-3 text-gray-600">juan.perez@ejemplo.com</td>
                    <td className="py-2 px-3 text-gray-600">Restaurante</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500">
              <span className="font-medium">Campos requeridos:</span> nombre, telefono,
              email_vendedor, utm | <span className="font-medium">Opcionales:</span> email, rubro
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Alert: Proyecto de destino */}
          {!result && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 font-medium">Proyecto de destino:</p>
                <p className="text-sm text-blue-800 mt-1">
                  Los leads se importarán al proyecto:{' '}
                  <span className="font-semibold">{proyectoNombre}</span>
                </p>
                {parsedData.length > 0 && (
                  <p className="text-sm text-blue-800 mt-1">
                    Total de leads a importar: <span className="font-semibold">{parsedData.length}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Upload Section */}
          {!file && !result && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-2">
                Arrastra un archivo CSV o Excel aquí
              </p>
              <p className="text-sm text-gray-500 mb-4">
                o haz clic para seleccionar un archivo
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                className="hidden"
                id="lead-file-input"
              />
              <label
                htmlFor="lead-file-input"
                className="inline-block px-6 py-3 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90 transition-colors"
              >
                Seleccionar archivo
              </label>
            </div>
          )}

          {/* Preview Section */}
          {file && parsedData.length > 0 && !result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-700">
                <FileText className="w-5 h-5" />
                <span className="font-medium">{file.name}</span>
                <span className="text-sm text-gray-500">
                  ({parsedData.length} {parsedData.length === 1 ? 'lead' : 'leads'})
                </span>
              </div>

              {/* Preview Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-3 text-gray-600 font-medium">#</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-medium">Nombre</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-medium">Teléfono</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-medium">
                          Email Vendedor
                        </th>
                        <th className="text-left py-2 px-3 text-gray-600 font-medium">UTM</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-medium">Email</th>
                        <th className="text-left py-2 px-3 text-gray-600 font-medium">Rubro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 5).map((lead, idx) => (
                        <tr key={idx} className="border-t border-gray-200">
                          <td className="py-2 px-3 text-gray-600">{idx + 1}</td>
                          <td className="py-2 px-3 text-gray-900">{lead.nombre}</td>
                          <td className="py-2 px-3 text-gray-900">{lead.telefono}</td>
                          <td className="py-2 px-3 text-gray-900">{lead.email_vendedor}</td>
                          <td className="py-2 px-3 text-gray-900">{lead.utm}</td>
                          <td className="py-2 px-3 text-gray-600">{lead.email || '-'}</td>
                          <td className="py-2 px-3 text-gray-600">{lead.rubro || '-'}</td>
                        </tr>
                      ))}
                      {parsedData.length > 5 && (
                        <tr className="border-t border-gray-200 bg-gray-50">
                          <td colSpan={7} className="py-2 px-3 text-center text-sm text-gray-500">
                            ... y {parsedData.length - 5} leads más
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {importing ? 'Importando...' : `Importar ${parsedData.length} leads`}
                </button>
                <button
                  onClick={handleReset}
                  disabled={importing}
                  className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Result Section */}
          {result && (
            <div className="space-y-4">
              {/* Success/Error Message */}
              {result.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-green-900 font-medium">Importación completada</p>
                    <p className="text-sm text-green-800 mt-1">
                      {result.imported} de {result.total} leads importados exitosamente
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-900 font-medium">Error en la importación</p>
                    <p className="text-sm text-red-800 mt-1">No se pudo completar la importación</p>
                  </div>
                </div>
              )}

              {/* Duplicates */}
              {result.duplicates.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900 font-medium mb-2">
                    Leads duplicados (no importados):
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.duplicates.map((dup, idx) => (
                      <p key={idx} className="text-sm text-yellow-800">
                        • {dup.nombre} ({dup.telefono})
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Invalid Vendors */}
              {result.invalidVendors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-900 font-medium mb-2">
                    Vendedores inválidos (no importados):
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.invalidVendors.map((inv, idx) => (
                      <p key={idx} className="text-sm text-red-800">
                        • Fila {inv.row}: {inv.email} - {inv.reason || 'no existe o no es vendedor'}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing UTM */}
              {result.missingUtm && result.missingUtm.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-900 font-medium mb-2">
                    Leads sin UTM (no importados):
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {result.missingUtm.map((missing, idx) => (
                      <p key={idx} className="text-sm text-red-800">
                        • Fila {missing.row}: {missing.nombre} (UTM vacío o faltante)
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
