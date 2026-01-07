// ============================================================================
// COMPONENT: UploadProgress
// ============================================================================
// Descripcion: Barra de progreso para upload de reuniones
// Features: Porcentaje, MB subidos, cancelar
// ============================================================================

'use client';

import { Loader2, X } from 'lucide-react';
import { UploadStatus } from '@/hooks/useReunionUpload';

interface UploadProgressProps {
  progress: number;
  status: UploadStatus;
  fileSize: number;
  onCancel?: () => void;
}

export default function UploadProgress({
  progress,
  status,
  fileSize,
  onCancel,
}: UploadProgressProps) {
  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(2);
  };

  const uploadedBytes = (fileSize * progress) / 100;

  return (
    <div className="space-y-4">
      {/* Progreso */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {status === 'uploading' ? 'Subiendo archivo...' : 'Iniciando procesamiento...'}
          </span>
          <span className="text-sm font-semibold text-[#1b967a]">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-[#1b967a] h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {status === 'uploading' && (
          <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
            <span>
              {formatBytes(uploadedBytes)} MB / {formatBytes(fileSize)} MB
            </span>
          </div>
        )}
      </div>

      {/* Mensaje de advertencia */}
      {status === 'uploading' && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Loader2 className="w-4 h-4 text-yellow-600 animate-spin flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            No cierres esta ventana hasta que se complete la subida
          </p>
        </div>
      )}

      {/* Mensaje de procesamiento */}
      {status === 'processing' && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            El archivo se está procesando en segundo plano. Puedes cerrar esta ventana.
          </p>
        </div>
      )}

      {/* Botón cancelar (solo durante upload) */}
      {status === 'uploading' && onCancel && (
        <button
          onClick={onCancel}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors font-medium"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
      )}
    </div>
  );
}
