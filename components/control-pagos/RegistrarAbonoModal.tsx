'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { registrarAbono, type PagoConAbonos } from '@/lib/actions-pagos';
import { useAuth } from '@/lib/auth-context';
import AlertModal from '@/components/shared/AlertModal';

interface RegistrarAbonoModalProps {
  isOpen: boolean;
  pago: PagoConAbonos | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RegistrarAbonoModal({
  isOpen,
  pago,
  onClose,
  onSuccess,
}: RegistrarAbonoModalProps) {
  const [monto, setMonto] = useState('');
  const [fechaAbono, setFechaAbono] = useState(new Date().toISOString().split('T')[0]);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'success' | 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });
  const { user } = useAuth();

  if (!isOpen || !pago) return null;

  const montoRestante = pago.monto_esperado - pago.monto_abonado;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Usuario no autenticado',
        variant: 'danger',
      });
      return;
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setAlertModal({
        isOpen: true,
        title: 'Monto Inválido',
        message: 'Por favor ingresa un monto válido mayor a 0',
        variant: 'warning',
      });
      return;
    }

    // Redondear a centavos (2 decimales) para evitar errores de punto flotante
    const montoCentavos = Math.round(montoNum * 100);
    const restanteCentavos = Math.round(montoRestante * 100);

    if (montoCentavos > restanteCentavos) {
      setAlertModal({
        isOpen: true,
        title: 'Monto Excedido',
        message: `El monto ingresado ($${montoNum.toFixed(2)}) excede lo que falta pagar ($${montoRestante.toFixed(2)})`,
        variant: 'warning',
      });
      return;
    }

    setLoading(true);

    const result = await registrarAbono({
      pagoId: pago.id,
      monto: montoNum,
      fechaAbono,
      metodoPago,
      notas: notas.trim() || undefined,
      registradoPor: user.id,
    });

    setLoading(false);

    if (result.success) {
      setAlertModal({
        isOpen: true,
        title: 'Abono Registrado',
        message: result.message || 'El abono se registró exitosamente',
        variant: 'success',
      });
      setMonto('');
      setNotas('');
    } else {
      setAlertModal({
        isOpen: true,
        title: 'Error al Registrar',
        message: result.message || 'No se pudo registrar el abono',
        variant: 'danger',
      });
    }
  };

  const formatMonto = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
          <div className="bg-[#1b967a] text-white p-4 rounded-t-lg flex items-center justify-between">
            <h3 className="text-lg font-bold">Registrar Abono</h3>
            <button onClick={onClose} className="text-white hover:bg-white/20 p-1 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <div className="text-sm text-gray-600 mb-2">
                {pago.tipo === 'inicial' ? 'Pago Inicial' : `Cuota #${pago.numero_cuota}`}
              </div>
              <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Esperado:</span>
                  <span className="font-semibold">{formatMonto(pago.monto_esperado)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Abonado:</span>
                  <span className="font-semibold text-green-600">{formatMonto(pago.monto_abonado)}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-gray-600">Falta:</span>
                  <span className="font-bold text-red-600">{formatMonto(montoRestante)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto del Abono *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha del Abono *
              </label>
              <input
                type="date"
                value={fechaAbono}
                onChange={(e) => setFechaAbono(e.target.value)}
                required
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Método de Pago *
              </label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Depósito">Depósito</option>
                <option value="Cheque">Cheque</option>
                <option value="Tarjeta">Tarjeta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas (Opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                placeholder="Agrega notas o comentarios sobre este abono..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
        onOk={() => {
          setAlertModal({ ...alertModal, isOpen: false });
          if (alertModal.variant === 'success') {
            onSuccess();
          }
        }}
      />
    </>
  );
}
