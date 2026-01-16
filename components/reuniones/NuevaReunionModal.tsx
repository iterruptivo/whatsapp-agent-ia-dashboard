// ============================================================================
// COMPONENT: NuevaReunionModal
// ============================================================================
// Descripcion: Modal para subir nueva reunión
// Features: Drop zone, validación, progreso, auto-process
// ============================================================================

'use client';

import { useState } from 'react';
import { X, Upload, FileVideo, AlertCircle, CheckCircle } from 'lucide-react';
import { useReunionUpload } from '@/hooks/useReunionUpload';
import UploadProgress from './UploadProgress';

// Reuniones son GLOBALES - no requieren proyectoId
interface NuevaReunionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ALLOWED_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a', 'video/mp4', 'video/webm'];
const ALLOWED_EXTENSIONS = ['.mp3', '.mp4', '.wav', '.m4a', '.webm'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

export default function NuevaReunionModal({
  isOpen,
  onClose,
  onSuccess,
}: NuevaReunionModalProps) {
  const [titulo, setTitulo] = useState('');
  const [fechaReunion, setFechaReunion] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { status, progress, error, upload, cancel, reset } = useReunionUpload();

  // Validar archivo
  const validateFile = (file: File): string | null => {
    // Validar tamaño
    if (file.size > MAX_SIZE_BYTES) {
      return 'El archivo excede el tamaño máximo de 2GB';
    }

    // Validar tipo
    const isValidType = ALLOWED_TYPES.includes(file.type);
    const isValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!isValidType && !isValidExtension) {
      return 'Formato no soportado. Use: mp3, mp4, wav, m4a, webm';
    }

    return null;
  };

  // Manejar selección de archivo
  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      setSelectedFile(null);
    } else {
      setValidationError(null);
      setSelectedFile(file);
    }
  };

  // Drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Manejar submit - sin proyectoId (reuniones globales)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !titulo.trim()) {
      setValidationError('Completa todos los campos requeridos');
      return;
    }

    // Convertir datetime-local a ISO string si existe
    const fechaReunionISO = fechaReunion
      ? new Date(fechaReunion).toISOString()
      : undefined;

    await upload(selectedFile, titulo.trim(), fechaReunionISO);
  };

  // Limpiar y cerrar
  const handleClose = () => {
    if (status === 'uploading') {
      cancel();
    }
    setTitulo('');
    setFechaReunion('');
    setSelectedFile(null);
    setValidationError(null);
    reset();
    onClose();
  };

  // Si se completó exitosamente
  const handleDone = () => {
    handleClose();
    onSuccess();
  };

  if (!isOpen) return null;

  // Vista de éxito
  if (status === 'done') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Reunión Subida Exitosamente
            </h3>
            <p className="text-gray-600 mb-4">
              La transcripción y análisis se están procesando en segundo plano.
              Recibirás una notificación cuando esté lista.
            </p>
            <button
              onClick={handleDone}
              className="w-full px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors font-medium"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista de upload en progreso
  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {status === 'uploading' ? 'Subiendo Archivo' : 'Procesando'}
            </h3>
            <UploadProgress
              progress={progress}
              status={status}
              fileSize={selectedFile?.size || 0}
              onCancel={status === 'uploading' ? cancel : undefined}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Nueva Reunión</h2>
            <p className="text-sm text-gray-500 mt-1">
              Sube el archivo de audio o video de la reunión
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título de la Reunión <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Reunión de Ventas - Enero 2026"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
              required
            />
          </div>

          {/* Fecha y Hora (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha y Hora de la Reunión
            </label>
            <input
              type="datetime-local"
              value={fechaReunion}
              onChange={(e) => setFechaReunion(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Opcional. Puedes dejar vacío si no sabes la fecha exacta.
            </p>
          </div>

          {/* Drop zone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo de Audio/Video <span className="text-red-500">*</span>
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-[#1b967a] bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <FileVideo className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              {selectedFile ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-800">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-2">
                    Arrastra tu archivo aquí o{' '}
                    <label className="text-[#1b967a] hover:text-[#157a63] cursor-pointer font-medium">
                      selecciona uno
                      <input
                        type="file"
                        accept={ALLOWED_EXTENSIONS.join(',')}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileSelect(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">
                    Formatos: mp3, mp4, wav, m4a, webm (máx 2GB)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Validation error */}
          {(validationError || error) && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{validationError || error}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedFile || !titulo.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              Subir Reunión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
