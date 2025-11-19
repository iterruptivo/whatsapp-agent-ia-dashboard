// ============================================================================
// COMPONENT: LocalImportModal
// ============================================================================
// Descripción: Modal para importar locales desde Excel o CSV
// Formatos soportados: .xlsx, .csv
// Usuario selecciona proyecto en dropdown (ya no necesita columna proyecto)
// ============================================================================

'use client';

import { useState, useRef } from 'react';
import { importLocales } from '@/lib/actions-locales';
import type { Proyecto } from '@/lib/db';
import type { LocalImportRow } from '@/lib/locales';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { X, Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import ConfirmModal from '@/components/shared/ConfirmModal';

interface LocalImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proyectos: Proyecto[];
}

export default function LocalImportModal({
  isOpen,
  onClose,
  onSuccess,
  proyectos,
}: LocalImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedProyectoId, setSelectedProyectoId] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    inserted: number;
    skipped: number;
    total: number;
    errors: string[];
  } | null>(null);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'warning' | 'danger';
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
    if (selectedFile) {
      // Validar extensión
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(extension || '')) {
        setAlertModal({
          isOpen: true,
          title: 'Formato no válido',
          message: 'Solo se permiten archivos Excel (.xlsx, .xls) o CSV',
          variant: 'warning',
        });
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  // ====== PARSE CSV ======
  const parseCSV = (file: File): Promise<LocalImportRow[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const data = results.data as any[];
            const locales: LocalImportRow[] = data.map((row) => {
              const local: LocalImportRow = {
                codigo: String(row.codigo || '').trim(),
                metraje: parseFloat(row.metraje || '0'),
              };

              // Columna estado opcional
              if (row.estado) {
                const estadoLower = String(row.estado).trim().toLowerCase();
                if (['verde', 'amarillo', 'naranja', 'rojo'].includes(estadoLower)) {
                  local.estado = estadoLower as 'verde' | 'amarillo' | 'naranja' | 'rojo';
                }
              }

              return local;
            });
            resolve(locales);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => reject(error),
      });
    });
  };

  // ====== PARSE EXCEL ======
  const parseExcel = (file: File): Promise<LocalImportRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

          const locales: LocalImportRow[] = jsonData.map((row) => {
            const local: LocalImportRow = {
              codigo: String(row.codigo || '').trim(),
              metraje: parseFloat(row.metraje || '0'),
            };

            // Columna estado opcional
            if (row.estado) {
              const estadoLower = String(row.estado).trim().toLowerCase();
              if (['verde', 'amarillo', 'naranja', 'rojo'].includes(estadoLower)) {
                local.estado = estadoLower as 'verde' | 'amarillo' | 'naranja' | 'rojo';
              }
            }

            return local;
          });

          resolve(locales);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsBinaryString(file);
    });
  };

  // ====== DOWNLOAD TEMPLATE ======
  const handleDownloadTemplate = () => {
    // Datos de ejemplo con 2 filas, ambas estado=verde
    const templateData = [
      { codigo: 'A-101', metraje: 45.5, estado: 'verde' },
      { codigo: 'B-205', metraje: 67.2, estado: 'verde' },
    ];

    // Crear workbook y worksheet
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Locales');

    // Descargar archivo
    XLSX.writeFile(workbook, 'plantilla_locales.xlsx');
  };

  // ====== IMPORT ======
  const handleImport = async () => {
    if (!file) {
      setAlertModal({
        isOpen: true,
        title: 'Archivo requerido',
        message: 'Por favor selecciona un archivo para importar',
        variant: 'warning',
      });
      return;
    }

    if (!selectedProyectoId) {
      setAlertModal({
        isOpen: true,
        title: 'Proyecto requerido',
        message: 'Por favor selecciona un proyecto antes de importar',
        variant: 'warning',
      });
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      // Parse file
      const extension = file.name.split('.').pop()?.toLowerCase();
      let locales: LocalImportRow[];

      if (extension === 'csv') {
        locales = await parseCSV(file);
      } else {
        locales = await parseExcel(file);
      }

      // Validar datos
      if (locales.length === 0) {
        setAlertModal({
          isOpen: true,
          title: 'Archivo vacío',
          message: 'El archivo está vacío o no tiene el formato correcto',
          variant: 'warning',
        });
        setImporting(false);
        return;
      }

      // Validar columnas requeridas
      const hasErrors = locales.some(
        (local) => !local.codigo || !local.metraje
      );

      if (hasErrors) {
        setAlertModal({
          isOpen: true,
          title: 'Formato incorrecto',
          message:
            'Asegúrate de que el archivo tenga las columnas requeridas:\n\n' +
            'REQUERIDAS: codigo, metraje\n' +
            'OPCIONAL: estado (verde/amarillo/naranja/rojo)\n\n' +
            'Ejemplo básico (default: verde):\n' +
            'LC-001,4.5\n' +
            'LC-002,6.0\n\n' +
            'Ejemplo con estado:\n' +
            'LC-001,4.5,rojo\n' +
            'LC-002,6.0,verde',
          variant: 'warning',
        });
        setImporting(false);
        return;
      }

      // Llamar Server Action con proyectoId
      const importResult = await importLocales(locales, selectedProyectoId);
      setResult(importResult);

      // Usuario controlará cuándo cerrar con botón "Terminar importación"
    } catch (error) {
      console.error('Error importing locales:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error al importar',
        message: 'Error al importar archivo. Verifica el formato y vuelve a intentar.',
        variant: 'danger',
      });
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  // ====== RENDER ======

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onKeyDown={handleEsc}
      >
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-secondary text-white p-6 rounded-t-lg">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Upload className="w-6 h-6" />
                  Importar Locales
                </h2>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 text-sm text-white/90 hover:text-white mt-2 transition-colors group"
                >
                  <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="underline">Descargar plantilla</span>
                </button>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Instrucciones */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Formato del Archivo Excel
              </h3>
              <p className="text-sm text-blue-800 mb-2">
                <strong>Columnas requeridas:</strong>
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1 mb-3">
                <li>
                  <strong>codigo:</strong> Código único del local (ej: LC-001, BLV-045)
                </li>
                <li>
                  <strong>metraje:</strong> Metros cuadrados (ej: 4.5, 6.0)
                </li>
              </ul>
              <p className="text-sm text-blue-800 mb-2">
                <strong>Columnas opcionales:</strong>
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                <li>
                  <strong>estado:</strong> verde, amarillo, naranja, o rojo (default: verde)
                </li>
              </ul>
              <p className="text-xs text-blue-700 mt-2">
                💡 <strong>Importante:</strong> Ya no necesitas la columna "proyecto".
                Selecciona el proyecto en el dropdown de abajo.
              </p>
            </div>

            {/* Dropdown Proyecto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar proyecto <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedProyectoId}
                onChange={(e) => setSelectedProyectoId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              >
                <option value="">-- Selecciona un proyecto --</option>
                {proyectos.map((proyecto) => (
                  <option key={proyecto.id} value={proyecto.id}>
                    {proyecto.nombre}
                  </option>
                ))}
              </select>
              {selectedProyectoId && (
                <p className="text-xs text-gray-600 mt-1">
                  ✅ Todos los locales se asignarán a este proyecto
                </p>
              )}
            </div>

            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar archivo Excel <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
              />
              {file && (
                <p className="text-sm text-gray-600 mt-2">
                  Archivo seleccionado: <strong>{file.name}</strong>
                </p>
              )}
            </div>

            {/* Result */}
            {result && (
              <div
                className={`rounded-lg p-4 border ${
                  result.errors.length === 0
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.errors.length === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Resultado de Importación
                    </h4>
                    <div className="text-sm space-y-1">
                      <p>
                        ✅ <strong>{result.inserted}</strong> locales importados correctamente
                      </p>
                      <p>
                        ⏭️ <strong>{result.skipped}</strong> locales omitidos (duplicados o errores)
                      </p>
                      <p>
                        📊 <strong>{result.total}</strong> filas procesadas
                      </p>
                    </div>

                    {/* Errores */}
                    {result.errors.length > 0 && (
                      <div className="mt-3">
                        <p className="font-semibold text-sm text-gray-900 mb-1">
                          Advertencias:
                        </p>
                        <ul className="text-xs text-gray-700 space-y-1 max-h-32 overflow-y-auto">
                          {result.errors.map((error, index) => (
                            <li key={index} className="list-disc list-inside">
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 p-4 rounded-b-lg flex gap-3 justify-end">
            {result ? (
              // Después de importación: solo botón "Terminar importación"
              <button
                onClick={onSuccess}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Terminar importación
              </button>
            ) : (
              // Antes de importación: botones "Cancelar" e "Importar Locales"
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || !selectedProyectoId || importing}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Importar Locales
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      {alertModal && (
        <ConfirmModal
          isOpen={alertModal.isOpen}
          title={alertModal.title}
          message={alertModal.message}
          variant={alertModal.variant}
          confirmText="Cerrar"
          cancelText=""
          onConfirm={() => setAlertModal(null)}
          onCancel={() => setAlertModal(null)}
        />
      )}
    </>
  );
}
