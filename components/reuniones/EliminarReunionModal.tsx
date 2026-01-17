// ============================================================================
// COMPONENT: EliminarReunionModal
// ============================================================================
// Modal de confirmación para eliminar reunión con motivo obligatorio
// ============================================================================

'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { deleteReunion } from '@/lib/actions-reuniones';

interface EliminarReunionModalProps {
  isOpen: boolean;
  onClose: () => void;
  reunion: {
    id: string;
    titulo: string;
  };
  onSuccess: () => void;
}

export default function EliminarReunionModal({
  isOpen,
  onClose,
  reunion,
  onSuccess,
}: EliminarReunionModalProps) {
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Resetear estado al abrir/cerrar
  const handleClose = () => {
    setMotivo('');
    setError('');
    setLoading(false);
    onClose();
  };

  // Eliminar reunión
  const handleEliminar = async () => {
    // Validar motivo
    if (!motivo.trim()) {
      setError('El motivo es obligatorio');
      return;
    }

    if (motivo.trim().length < 10) {
      setError('El motivo debe tener al menos 10 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await deleteReunion(reunion.id, motivo.trim());

      if (!result.success) {
        setError(result.error || 'Error al eliminar reunión');
        setLoading(false);
        return;
      }

      // Éxito
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error eliminando reunión:', err);
      setError(err.message || 'Error inesperado al eliminar');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-red-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Eliminar Reunión
              </h2>
              <p className="text-sm text-gray-600">Esta acción no se puede deshacer</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">
                Advertencia: Eliminación Permanente
              </p>
              <p className="text-sm text-red-700 mt-1">
                Se eliminarán permanentemente:
              </p>
              <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                <li>La reunión y todos sus datos</li>
                <li>El archivo de audio/video del storage</li>
                <li>Todos los action items asociados</li>
                <li>La transcripción y el resumen generado</li>
              </ul>
              <p className="text-sm text-red-700 mt-2 font-medium">
                Solo se guardará un registro de auditoría con tu motivo.
              </p>
            </div>
          </div>

          {/* Reunión a eliminar */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-1">
              Reunión a eliminar:
            </p>
            <p className="text-base font-semibold text-gray-900">
              {reunion.titulo}
            </p>
          </div>

          {/* Motivo (obligatorio) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de eliminación <span className="text-red-600">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                setError(''); // Limpiar error al escribir
              }}
              placeholder="Ejemplo: Reunión duplicada, grabación con problemas de audio, información sensible compartida por error..."
              rows={4}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Mínimo 10 caracteres. Este motivo se guardará en el registro de auditoría.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleEliminar}
            disabled={loading || !motivo.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Eliminar Permanentemente
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
