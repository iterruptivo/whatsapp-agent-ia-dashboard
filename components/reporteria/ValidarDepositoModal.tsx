'use client';

import { useState } from 'react';
import { X, ShieldCheck, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

interface ValidarDepositoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  monto: string;
  cliente: string;
  banco: string | null;
  fecha: string;
}

export default function ValidarDepositoModal({
  isOpen,
  onClose,
  onConfirm,
  monto,
  cliente,
  banco,
  fecha,
}: ValidarDepositoModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header con icono */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
            {success ? (
              <CheckCircle2 className="w-8 h-8 text-white" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-white" />
            )}
          </div>
          <h2 className="text-xl font-bold text-white">
            {success ? '¡Validado!' : 'Validar Depósito'}
          </h2>
          <p className="text-white/80 text-sm mt-1">
            {success ? 'El depósito ha sido validado correctamente' : 'Esta acción no se puede deshacer'}
          </p>
        </div>

        {/* Botón cerrar */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {!success && (
          <>
            {/* Contenido */}
            <div className="px-6 py-6">
              {/* Datos del depósito */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Monto</span>
                  <span className="text-lg font-bold text-green-600">{monto}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Cliente</span>
                  <span className="text-sm font-medium text-gray-900 text-right max-w-[200px] truncate">
                    {cliente}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Banco</span>
                  <span className="text-sm font-medium text-gray-700">{banco || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Fecha</span>
                  <span className="text-sm font-medium text-gray-700">{fecha}</span>
                </div>
              </div>

              {/* Advertencia */}
              <div className="flex items-start gap-3 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Al validar este depósito, confirmas que los datos son correctos y que el pago ha sido recibido.
                </p>
              </div>
            </div>

            {/* Footer con botones */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Confirmar Validación
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
