'use client';

/**
 * ImportVentasModal - Excel Import for Sales Attribution
 * Session 74 - Sistema de Atribución de Ventas IA
 *
 * Features:
 * - Drag & drop file upload
 * - Excel parsing with XLSX
 * - Preview data before import
 * - Column mapping
 * - Import progress and results
 */

import { useState, useCallback, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Info,
  Loader2,
  Bot,
  Users,
  HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { importVentasExternas, type VentaExternaRow, type ImportResult } from '@/lib/actions-ventas-ia';

interface ImportVentasModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'results';

export default function ImportVentasModal({ onClose, onImportComplete }: ImportVentasModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<VentaExternaRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse Excel file
  const parseFile = useCallback(async (file: File) => {
    setParseError(null);
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: false });

      if (jsonData.length === 0) {
        setParseError('El archivo está vacío o no tiene datos válidos');
        return;
      }

      // Map columns (flexible matching)
      const mapped: VentaExternaRow[] = jsonData.map((row) => {
        // Find phone column
        const phoneKey = Object.keys(row).find(k =>
          k.toLowerCase().includes('telefono') ||
          k.toLowerCase().includes('celular') ||
          k.toLowerCase().includes('phone') ||
          k.toLowerCase().includes('tel')
        );

        // Find month column
        const mesKey = Object.keys(row).find(k =>
          k.toLowerCase().includes('mes') ||
          k.toLowerCase().includes('fecha') ||
          k.toLowerCase().includes('month') ||
          k.toLowerCase().includes('periodo')
        );

        // Find name column
        const nombreKey = Object.keys(row).find(k =>
          k.toLowerCase().includes('nombre') ||
          k.toLowerCase().includes('cliente') ||
          k.toLowerCase().includes('name')
        );

        // Find amount column
        const montoKey = Object.keys(row).find(k =>
          k.toLowerCase().includes('monto') ||
          k.toLowerCase().includes('precio') ||
          k.toLowerCase().includes('amount') ||
          k.toLowerCase().includes('valor')
        );

        // Find project column
        const proyectoKey = Object.keys(row).find(k =>
          k.toLowerCase().includes('proyecto') ||
          k.toLowerCase().includes('project')
        );

        // Find observations column
        const obsKey = Object.keys(row).find(k =>
          k.toLowerCase().includes('observ') ||
          k.toLowerCase().includes('nota') ||
          k.toLowerCase().includes('note')
        );

        return {
          telefono: phoneKey ? String(row[phoneKey] || '').trim() : '',
          mes_venta: mesKey ? String(row[mesKey] || '').trim() : '',
          nombre_cliente: nombreKey ? String(row[nombreKey] || '').trim() : undefined,
          monto_venta: montoKey ? parseFloat(String(row[montoKey] || '0').replace(/[^0-9.]/g, '')) || undefined : undefined,
          proyecto: proyectoKey ? String(row[proyectoKey] || '').trim() : undefined,
          observaciones: obsKey ? String(row[obsKey] || '').trim() : undefined,
        };
      });

      // Filter rows with at least phone
      const validRows = mapped.filter(row => row.telefono);

      if (validRows.length === 0) {
        setParseError('No se encontró ninguna columna con "telefono" o "celular". Asegúrate de que el Excel tenga una columna con ese nombre.');
        return;
      }

      setParsedData(validRows);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing file:', error);
      setParseError('Error al leer el archivo. Asegúrate de que sea un Excel válido (.xlsx, .xls)');
    }
  }, []);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      parseFile(file);
    }
  }, [parseFile]);

  // Handle file select
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  }, [parseFile]);

  // Handle import
  const handleImport = async () => {
    setStep('importing');

    try {
      const result = await importVentasExternas(parsedData, fileName);
      setImportResult(result);
      setStep('results');
    } catch (error) {
      console.error('Error importing:', error);
      setImportResult({
        success: false,
        message: 'Error inesperado al importar',
        totalRows: parsedData.length,
        inserted: 0,
        duplicates: 0,
        errors: parsedData.length,
        matchesVictoria: 0,
        matchesOtroUtm: 0,
        sinLead: 0,
        errorDetails: [],
      });
      setStep('results');
    }
  };

  // Download template
  const downloadTemplate = () => {
    const template = [
      {
        'Telefono': '987654321',
        'Mes_Venta': '2025-01',
        'Nombre_Cliente': 'Juan Pérez',
        'Monto_Venta': '15000',
        'Proyecto': 'Proyecto Ejemplo',
        'Observaciones': 'Nota opcional'
      },
      {
        'Telefono': '+51 912 345 678',
        'Mes_Venta': 'Enero 2025',
        'Nombre_Cliente': 'María García',
        'Monto_Venta': '18500',
        'Proyecto': '',
        'Observaciones': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(wb, 'plantilla-ventas-call-center.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#1b967a] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Importar Ventas del Call Center</h2>
              <p className="text-sm text-white/80">Cruce automático con leads de Victoria</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-2">Formato del Excel:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Telefono</strong> (obligatorio): 9 dígitos o con prefijo +51</li>
                      <li><strong>Mes_Venta</strong> (obligatorio): "2025-01", "Enero 2025", "01/2025"</li>
                      <li><strong>Nombre_Cliente</strong> (opcional): Nombre del cliente</li>
                      <li><strong>Monto_Venta</strong> (opcional): Monto en USD</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Upload Area */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                  ${isDragging
                    ? 'border-[#1b967a] bg-[#1b967a]/5'
                    : 'border-gray-300 hover:border-[#1b967a] hover:bg-gray-50'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-[#1b967a]' : 'text-gray-400'}`} />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {isDragging ? 'Suelta el archivo aquí' : 'Arrastra un archivo Excel'}
                </p>
                <p className="text-sm text-gray-500">
                  o haz clic para seleccionar
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Formatos aceptados: .xlsx, .xls, .csv
                </p>
              </div>

              {/* Error */}
              {parseError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <p className="text-sm text-red-700">{parseError}</p>
                </div>
              )}

              {/* Download Template */}
              <div className="flex justify-center">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-[#1b967a] hover:bg-[#1b967a]/5 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar plantilla de ejemplo
                </button>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Vista previa</h3>
                  <p className="text-sm text-gray-500">
                    {parsedData.length} filas encontradas en "{fileName}"
                  </p>
                </div>
                <button
                  onClick={() => { setStep('upload'); setParsedData([]); }}
                  className="text-sm text-[#1b967a] hover:underline"
                >
                  Cambiar archivo
                </button>
              </div>

              {/* Preview Table */}
              <div className="border rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Teléfono</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mes Venta</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedData.slice(0, 50).map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                          <td className="px-4 py-2 font-mono">{row.telefono}</td>
                          <td className="px-4 py-2">{row.mes_venta}</td>
                          <td className="px-4 py-2">{row.nombre_cliente || '-'}</td>
                          <td className="px-4 py-2">{row.monto_venta ? `$${row.monto_venta.toLocaleString()}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 50 && (
                  <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500 text-center">
                    Mostrando 50 de {parsedData.length} filas
                  </div>
                )}
              </div>

              {/* Info about matching */}
              <div className="bg-[#1b967a]/5 border border-[#1b967a]/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Bot className="w-5 h-5 text-[#1b967a] mt-0.5" />
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1">Al importar, el sistema:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Limpiará los teléfonos al formato estándar (51 + 9 dígitos)</li>
                      <li>Detectará duplicados automáticamente</li>
                      <li>Cruzará con leads existentes para identificar ventas de Victoria</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-[#1b967a] animate-spin mb-4" />
              <p className="text-lg font-medium text-gray-700">Importando ventas...</p>
              <p className="text-sm text-gray-500 mt-1">
                Procesando {parsedData.length} filas y cruzando con leads
              </p>
            </div>
          )}

          {/* Step: Results */}
          {step === 'results' && importResult && (
            <div className="space-y-6">
              {/* Result Header */}
              <div className={`rounded-xl p-6 ${importResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-4">
                  {importResult.success ? (
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                  )}
                  <div>
                    <h3 className={`text-lg font-bold ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {importResult.success ? 'Importación Completada' : 'Error en la Importación'}
                    </h3>
                    <p className={`text-sm ${importResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {importResult.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-800">{importResult.inserted}</p>
                  <p className="text-xs text-gray-500 mt-1">Nuevas insertadas</p>
                </div>
                <div className="bg-white border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{importResult.duplicates}</p>
                  <p className="text-xs text-gray-500 mt-1">Duplicadas (omitidas)</p>
                </div>
                <div className="bg-white border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{importResult.errors}</p>
                  <p className="text-xs text-gray-500 mt-1">Errores</p>
                </div>
                <div className="bg-white border rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-600">{importResult.totalRows}</p>
                  <p className="text-xs text-gray-500 mt-1">Total filas</p>
                </div>
              </div>

              {/* Attribution Stats */}
              {importResult.inserted > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Resultado del cruce con leads:</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1b967a]/10 rounded-full flex items-center justify-center">
                        <Bot className="w-5 h-5 text-[#1b967a]" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-[#1b967a]">{importResult.matchesVictoria}</p>
                        <p className="text-xs text-gray-500">Victoria</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-blue-600">{importResult.matchesOtroUtm}</p>
                        <p className="text-xs text-gray-500">Otros canales</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <HelpCircle className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-600">{importResult.sinLead}</p>
                        <p className="text-xs text-gray-500">Sin lead</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Details */}
              {importResult.errorDetails.length > 0 && (
                <div className="border border-red-200 rounded-xl overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                    <p className="text-sm font-medium text-red-800">
                      Detalle de errores ({importResult.errorDetails.length})
                    </p>
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-red-50/50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-red-700">Fila</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-red-700">Teléfono</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-red-700">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {importResult.errorDetails.slice(0, 20).map((err, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-red-600">{err.row}</td>
                            <td className="px-4 py-2 font-mono text-red-600">{err.telefono || '-'}</td>
                            <td className="px-4 py-2 text-red-600">{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t">
          {step === 'upload' && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => { setStep('upload'); setParsedData([]); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Atrás
              </button>
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-5 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a64] transition-colors"
              >
                <Upload className="w-4 h-4" />
                Importar {parsedData.length} ventas
              </button>
            </>
          )}

          {step === 'results' && (
            <button
              onClick={onImportComplete}
              className="flex items-center gap-2 px-5 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a64] transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Cerrar y ver resultados
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
