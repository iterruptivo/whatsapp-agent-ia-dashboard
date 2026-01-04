'use client';

// ============================================================================
// COMPONENTE: ImportarEstadoCuentaModal
// ============================================================================
// Modal para importar estado de cuenta bancario desde Excel
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { ConfigBanco, importarEstadoCuenta, ImportResult } from '@/lib/actions-validacion-bancaria';

interface ImportarEstadoCuentaModalProps {
  isOpen: boolean;
  proyectoId: string;
  userId: string;
  bancos: ConfigBanco[];
  onClose: () => void;
  onSuccess: (importacionId: string) => void;
}

export default function ImportarEstadoCuentaModal({
  isOpen,
  proyectoId,
  userId,
  bancos,
  onClose,
  onSuccess,
}: ImportarEstadoCuentaModalProps) {
  const [bancoId, setBancoId] = useState('');
  const [moneda, setMoneda] = useState('USD');
  const [cuenta, setCuenta] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bancoSeleccionado = bancos.find((b) => b.id === bancoId);

  const handleFileSelect = useCallback((file: File) => {
    // Validar tipo de archivo
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    const validExtensions = ['.xls', '.xlsx', '.csv'];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (!validTypes.includes(file.type) && !validExtensions.includes(extension)) {
      setResultado({
        success: false,
        message: 'Solo se permiten archivos Excel (.xls, .xlsx) o CSV',
      });
      return;
    }

    // Validar tamano (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setResultado({
        success: false,
        message: 'El archivo no puede superar 10MB',
      });
      return;
    }

    setArchivo(file);
    setResultado(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bancoId || !archivo) {
      setResultado({
        success: false,
        message: 'Selecciona un banco y un archivo',
      });
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      // Convertir archivo a base64
      const base64 = await fileToBase64(archivo);

      const result = await importarEstadoCuenta(
        proyectoId,
        bancoId,
        moneda,
        cuenta || undefined,
        base64,
        archivo.name,
        userId
      );

      setResultado(result);

      if (result.success && result.importacion_id) {
        setTimeout(() => {
          onSuccess(result.importacion_id!);
        }, 1500);
      }
    } catch (error) {
      setResultado({
        success: false,
        message: 'Error al procesar el archivo',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setArchivo(null);
    setResultado(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
          {/* Header */}
          <div className="bg-[#1b967a] text-white p-4 rounded-t-lg flex items-center justify-between sticky top-0">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Importar Estado de Cuenta
            </h3>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-1 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Banco */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banco *
              </label>
              <select
                value={bancoId}
                onChange={(e) => setBancoId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
              >
                <option value="">Seleccionar banco...</option>
                {bancos.map((banco) => (
                  <option key={banco.id} value={banco.id}>
                    {banco.nombre_display}
                  </option>
                ))}
              </select>
            </div>

            {/* Moneda y Cuenta */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda *
                </label>
                <select
                  value={moneda}
                  onChange={(e) => setMoneda(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
                >
                  <option value="USD">Dolares (USD)</option>
                  <option value="PEN">Soles (PEN)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cuenta (opcional)
                </label>
                <input
                  type="text"
                  value={cuenta}
                  onChange={(e) => setCuenta(e.target.value)}
                  placeholder="Ej: 123-456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
                />
              </div>
            </div>

            {/* Info del banco seleccionado */}
            {bancoSeleccionado && (
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm">
                <p className="font-medium">Formato esperado: {bancoSeleccionado.nombre_display}</p>
                <p className="text-blue-600 mt-1">
                  {bancoSeleccionado.filas_encabezado > 0
                    ? `Se saltaran ${bancoSeleccionado.filas_encabezado} filas de encabezado`
                    : 'La primera fila debe ser el encabezado'}
                </p>
              </div>
            )}

            {/* Upload area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Archivo Excel *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                  ${isDragging ? 'border-[#1b967a] bg-green-50' : 'border-gray-300 hover:border-gray-400'}
                  ${archivo ? 'bg-green-50 border-green-300' : ''}
                `}
              >
                {archivo ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="w-10 h-10 text-green-600" />
                    <p className="text-sm font-medium text-gray-700">{archivo.name}</p>
                    <p className="text-xs text-gray-500">
                      {(archivo.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReset();
                      }}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Cambiar archivo
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">
                      Arrastra el archivo aqui
                    </p>
                    <p className="text-xs text-gray-500">
                      o haz click para seleccionar
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Excel (.xls, .xlsx) o CSV (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Resultado */}
            {resultado && (
              <div
                className={`p-4 rounded-lg ${
                  resultado.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {resultado.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        resultado.success ? 'text-green-800' : 'text-red-800'
                      }`}
                    >
                      {resultado.message}
                    </p>
                    {resultado.success && (
                      <div className="mt-2 text-sm text-green-700 space-y-1">
                        <p>Total transacciones: {resultado.total_transacciones}</p>
                        <p>Abonos: {resultado.transacciones_abonos}</p>
                        <p>Cargos: {resultado.transacciones_cargos}</p>
                      </div>
                    )}
                    {resultado.errores && resultado.errores.length > 0 && (
                      <div className="mt-2 text-sm text-yellow-700">
                        <p className="font-medium">Advertencias:</p>
                        <ul className="list-disc list-inside">
                          {resultado.errores.slice(0, 5).map((err, idx) => (
                            <li key={idx}>{err}</li>
                          ))}
                          {resultado.errores.length > 5 && (
                            <li>...y {resultado.errores.length - 5} mas</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !bancoId || !archivo || resultado?.success}
                className="flex-1 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : resultado?.success ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Importado
                  </>
                ) : (
                  'Importar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// Helper para convertir archivo a base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}
