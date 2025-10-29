// ============================================================================
// COMPONENT: LocalImportModal
// ============================================================================
// Descripción: Modal para importar locales desde CSV o Excel
// Formatos soportados: .csv, .xlsx
// ============================================================================

'use client';

import { useState, useRef } from 'react';
import { importLocales } from '@/lib/actions-locales';
import type { Proyecto } from '@/lib/db';
import type { LocalImportRow } from '@/lib/locales';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

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
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    inserted: number;
    skipped: number;
    total: number;
    errors: string[];
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
        alert('⚠️ Formato no válido. Solo se permiten archivos CSV o Excel (.xlsx, .xls)');
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
            const locales: LocalImportRow[] = data.map((row) => ({
              codigo: String(row.codigo || '').trim(),
              proyecto: String(row.proyecto || '').trim().toLowerCase(),
              metraje: parseFloat(row.metraje || '0'),
            }));
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

          const locales: LocalImportRow[] = jsonData.map((row) => ({
            codigo: String(row.codigo || '').trim(),
            proyecto: String(row.proyecto || '').trim().toLowerCase(),
            metraje: parseFloat(row.metraje || '0'),
          }));

          resolve(locales);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsBinaryString(file);
    });
  };

  // ====== IMPORT ======
  const handleImport = async () => {
    if (!file) {
      alert('⚠️ Por favor selecciona un archivo');
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
        alert('⚠️ El archivo está vacío o no tiene el formato correcto');
        setImporting(false);
        return;
      }

      // Validar columnas requeridas
      const hasErrors = locales.some(
        (local) => !local.codigo || !local.proyecto || !local.metraje
      );

      if (hasErrors) {
        alert(
          '⚠️ Formato incorrecto. Asegúrate de que el archivo tenga las columnas:\n\n' +
          'codigo, proyecto, metraje\n\n' +
          'Ejemplo:\n' +
          'LC-001,trapiche,4.5\n' +
          'LC-002,callao,6.0'
        );
        setImporting(false);
        return;
      }

      // Llamar Server Action
      const importResult = await importLocales(locales);
      setResult(importResult);

      // Si todo se importó correctamente, cerrar modal
      if (importResult.success && importResult.inserted > 0 && importResult.errors.length === 0) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error) {
      console.error('Error importing locales:', error);
      alert('❌ Error al importar archivo. Verifica el formato y vuelve a intentar.');
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
                <p className="text-sm text-white/80 mt-1">
                  Carga masiva desde CSV o Excel
                </p>
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
                Formato del Archivo
              </h3>
              <p className="text-sm text-blue-800 mb-2">
                El archivo debe tener las siguientes columnas:
              </p>
              <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                <li>
                  <strong>codigo:</strong> Código único del local (ej: LC-001)
                </li>
                <li>
                  <strong>proyecto:</strong> Slug del proyecto (trapiche, callao, san-gabriel, etc.)
                </li>
                <li>
                  <strong>metraje:</strong> Metros cuadrados (ej: 4.5, 6.0)
                </li>
              </ul>
              <p className="text-xs text-blue-700 mt-2">
                💡 Proyectos disponibles: {proyectos.map((p) => p.slug).join(', ')}
              </p>
            </div>

            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar archivo
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
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={!file || importing}
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
          </div>
        </div>
      </div>
    </>
  );
}
