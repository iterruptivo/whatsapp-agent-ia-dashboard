'use client';

import { useState, useEffect } from 'react';
import { X, Key, Mail, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { type UsuarioConDatos, resetUsuarioPassword } from '@/lib/actions-usuarios';

interface ResetPasswordModalProps {
  usuario: UsuarioConDatos;
  onClose: () => void;
}

export default function ResetPasswordModal({
  usuario,
  onClose,
}: ResetPasswordModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleReset = async () => {
    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await resetUsuarioPassword(usuario.email);
      setResult(response);
    } catch (error) {
      console.error('Error resetting password:', error);
      setResult({
        success: false,
        message: 'Error inesperado. Intenta de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, isSubmitting]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-orange-500 rounded-t-lg">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Key className="w-5 h-5" />
              Restablecer Contraseña
            </h3>
            <button
              onClick={() => !isSubmitting && onClose()}
              disabled={isSubmitting}
              className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6">
            {/* Success/Error result */}
            {result && (
              <div
                className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${
                  result.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <p
                  className={`text-sm ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {result.message}
                </p>
              </div>
            )}

            {/* User info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="font-medium text-gray-900">{usuario.nombre}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Mail className="w-4 h-4" />
                {usuario.email}
              </p>
            </div>

            {/* Warning message */}
            {!result?.success && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">
                      Atención
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Se enviará un email al usuario con instrucciones para
                      restablecer su contraseña. El link de restablecimiento
                      expirará en 24 horas.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {result?.success ? 'Cerrar' : 'Cancelar'}
              </button>
              {!result?.success && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      Enviar Email
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
