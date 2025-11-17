// ============================================================================
// COMPONENT: ComentarioNaranjaModal
// ============================================================================
// Descripción: Modal para comentario OBLIGATORIO al cambiar local a NARANJA
// Uso: Solo para vendedor/vendedor_caseta (admin/jefe_ventas NO lo ven)
// Validación: Mínimo 10 caracteres
// ============================================================================

'use client';

import { useState } from 'react';
import { X, AlertCircle, MessageSquare } from 'lucide-react';
import type { Local } from '@/lib/locales';

interface ComentarioNaranjaModalProps {
  isOpen: boolean;
  local: Local | null;
  onConfirm: (comentario: string) => Promise<void>;
  onCancel: () => void;
}

export default function ComentarioNaranjaModal({
  isOpen,
  local,
  onConfirm,
  onCancel,
}: ComentarioNaranjaModalProps) {
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !local) return null;

  const handleSubmit = async () => {
    // Validar mínimo 10 caracteres
    if (comentario.trim().length < 10) {
      setError('El comentario debe tener al menos 10 caracteres');
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(comentario.trim());
      // Limpiar y cerrar
      setComentario('');
      setError('');
    } catch (err) {
      setError('Error al confirmar el local. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setComentario('');
    setError('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Confirmar Local - Estado NARANJA
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {local.proyecto_nombre} - Local {local.codigo}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={submitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Label + Icon */}
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-orange-500" />
            <label className="text-sm font-medium text-gray-700">
              ¿Por qué pasas este local a confirmado? <span className="text-red-500">*</span>
            </label>
          </div>

          {/* Textarea */}
          <textarea
            value={comentario}
            onChange={(e) => {
              setComentario(e.target.value);
              setError(''); // Limpiar error al escribir
            }}
            placeholder="Ej: Cliente confirmó compra, pidió enviar contrato por email..."
            rows={4}
            className={`w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 transition-all ${
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-orange-500'
            }`}
            disabled={submitting}
          />

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Info */}
          <p className="text-xs text-gray-500">
            Este comentario quedará registrado en el historial del local. Mínimo 10 caracteres.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting || comentario.trim().length < 10}
          >
            {submitting ? 'Confirmando...' : 'Confirmar local'}
          </button>
        </div>
      </div>
    </div>
  );
}
