'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, X, Check } from 'lucide-react';
import { extenderPlazoReserva } from '@/lib/actions-locales';
import { toast } from 'sonner';

interface ExtenderPlazoModalProps {
  isOpen: boolean;
  onClose: () => void;
  local: {
    id: string;
    codigo: string;
    lead_nombre?: string | null;
    vendedor_actual_nombre?: string | null;
    naranja_timestamp: string | null;
    extension_dias: number;
  };
  usuarioId: string;
  onSuccess: () => void;
}

export default function ExtenderPlazoModal({
  isOpen,
  onClose,
  local,
  usuarioId,
  onSuccess,
}: ExtenderPlazoModalProps) {
  const [motivo, setMotivo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState<string>('');

  // Calcular tiempo restante
  useEffect(() => {
    if (!local.naranja_timestamp) return;

    const calcularTiempo = () => {
      const inicio = new Date(local.naranja_timestamp!);
      const horasTotales = 120 + (local.extension_dias * 120);
      const fin = new Date(inicio.getTime() + horasTotales * 60 * 60 * 1000);
      const ahora = new Date();
      const diffMs = fin.getTime() - ahora.getTime();

      if (diffMs <= 0) {
        setTiempoRestante('Expirado');
        return;
      }

      const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (dias > 0) {
        setTiempoRestante(`${dias}d ${horas}h ${minutos}m`);
      } else if (horas > 0) {
        setTiempoRestante(`${horas}h ${minutos}m`);
      } else {
        setTiempoRestante(`${minutos}m`);
      }
    };

    calcularTiempo();
    const interval = setInterval(calcularTiempo, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  }, [local.naranja_timestamp, local.extension_dias]);

  const handleConfirmar = async () => {
    if (motivo.trim().length < 10) {
      toast.error('El motivo debe tener al menos 10 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      const result = await extenderPlazoReserva(local.id, usuarioId, motivo.trim());

      if (result.success) {
        toast.success(result.message);
        setMotivo('');
        onSuccess();
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error extendiendo plazo:', error);
      toast.error('Error inesperado al extender plazo');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const nuevoTiempoTotal = tiempoRestante === 'Expirado' ? 'N/A' : `${tiempoRestante} + 5 días`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Extender Plazo de Reserva</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Info del local */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Local:</span>
              <span className="text-sm font-semibold text-gray-900">{local.codigo}</span>
            </div>
            {local.lead_nombre && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cliente:</span>
                <span className="text-sm font-medium text-gray-700">{local.lead_nombre}</span>
              </div>
            )}
            {local.vendedor_actual_nombre && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Vendedor:</span>
                <span className="text-sm font-medium text-gray-700">{local.vendedor_actual_nombre}</span>
              </div>
            )}
          </div>

          {/* Tiempo */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800">Tiempo actual restante</p>
                <p className="text-2xl font-bold text-amber-700">{tiempoRestante}</p>
                <p className="text-xs text-amber-600">
                  Nuevo plazo total: <span className="font-semibold">{nuevoTiempoTotal}</span>
                </p>
                {local.extension_dias === 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    Extensiones disponibles: <span className="font-semibold">1 de 1</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de la extensión <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Cliente solicita más tiempo para completar documentación..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
              rows={3}
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Mínimo 10 caracteres ({motivo.length}/10)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={isLoading || motivo.trim().length < 10 || tiempoRestante === 'Expirado'}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Procesando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirmar Extensión
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
