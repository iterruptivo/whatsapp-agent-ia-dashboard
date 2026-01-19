'use client';

import { useState, useCallback } from 'react';
import { X, Sparkles, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { registrarAbono, type PagoConAbonos } from '@/lib/actions-pagos';
import { useAuth } from '@/lib/auth-context';
import AlertModal from '@/components/shared/AlertModal';
import VoucherOCRUploader, { VoucherData } from '@/components/shared/VoucherOCRUploader';

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
  const [numeroOperacion, setNumeroOperacion] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOCR, setShowOCR] = useState(true); // Mostrar OCR por defecto
  const [voucherPreviewUrl, setVoucherPreviewUrl] = useState<string | null>(null);
  const [ocrConfianza, setOcrConfianza] = useState<number | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
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

  // Handler para cuando OCR extrae datos del voucher
  // IMPORTANTE: Debe estar ANTES del early return para cumplir reglas de Hooks
  const handleOCRDataExtracted = useCallback((data: VoucherData, file: File, previewUrl: string) => {
    const filledFields = new Set<string>();

    // Auto-rellenar campos con datos del OCR
    if (data.monto) {
      setMonto(data.monto.toString());
      filledFields.add('monto');
    }
    if (data.fecha) {
      // Convertir fecha de formato YYYY-MM-DD
      setFechaAbono(data.fecha);
      filledFields.add('fecha');
    }
    if (data.numero_operacion && data.numero_operacion !== 'N/A') {
      setNumeroOperacion(data.numero_operacion);
      filledFields.add('operacion');
    }
    // Mapear tipo de operacion a metodo de pago
    if (data.tipo_operacion) {
      const tipoLower = data.tipo_operacion.toLowerCase();
      if (tipoLower.includes('transfer')) {
        setMetodoPago('Transferencia');
        filledFields.add('metodo');
      } else if (tipoLower.includes('deposit') || tipoLower.includes('deposito')) {
        setMetodoPago('Depósito');
        filledFields.add('metodo');
      } else if (tipoLower.includes('yape')) {
        setMetodoPago('Yape');
        filledFields.add('metodo');
      } else if (tipoLower.includes('plin')) {
        setMetodoPago('Plin');
        filledFields.add('metodo');
      }
    }
    // Agregar info del voucher a las notas
    const infoVoucher = [];
    if (data.banco && data.banco !== 'N/A') infoVoucher.push(`Banco: ${data.banco}`);
    if (data.nombre_depositante && data.nombre_depositante !== 'N/A') {
      infoVoucher.push(`Depositante: ${data.nombre_depositante}`);
    }
    if (infoVoucher.length > 0) {
      setNotas(infoVoucher.join(' | '));
      filledFields.add('notas');
    }
    setVoucherPreviewUrl(previewUrl);
    setOcrConfianza(data.confianza);
    setAutoFilledFields(filledFields);
  }, []);

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

    // Construir notas incluyendo numero de operacion si existe
    let notasCompletas = notas.trim();
    if (numeroOperacion.trim()) {
      const prefijo = `Nro. Op: ${numeroOperacion.trim()}`;
      notasCompletas = notasCompletas ? `${prefijo} | ${notasCompletas}` : prefijo;
    }

    const result = await registrarAbono({
      pagoId: pago.id,
      monto: montoNum,
      fechaAbono,
      metodoPago,
      notas: notasCompletas || undefined,
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
      setNumeroOperacion('');
      setVoucherPreviewUrl(null);
      setShowOCR(true);
      setOcrConfianza(null);
      setAutoFilledFields(new Set());
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

            {/* Seccion OCR - Captura inteligente de voucher */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowOCR(!showOCR)}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 flex items-center justify-between text-sm font-medium text-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Captura Inteligente (OCR)</span>
                  <span className="text-xs text-gray-500 font-normal">
                    - Sube voucher y se autocompletan los datos
                  </span>
                </div>
                {showOCR ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {showOCR && (
                <div className="p-4 bg-gray-50 border-t">
                  <VoucherOCRUploader
                    onDataExtracted={handleOCRDataExtracted}
                    onError={(error) => {
                      setAlertModal({
                        isOpen: true,
                        title: 'Error OCR',
                        message: error,
                        variant: 'warning',
                      });
                    }}
                  />
                  {/* Indicador de confianza OCR */}
                  {ocrConfianza !== null && (
                    <div className={`mt-3 p-2 rounded-lg flex items-center gap-2 text-sm ${
                      ocrConfianza >= 85
                        ? 'bg-green-50 text-green-700'
                        : ocrConfianza >= 60
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-orange-50 text-orange-700'
                    }`}>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Datos extraídos con {ocrConfianza}% de confianza
                        {ocrConfianza < 85 && ' - Verifica los campos'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                Monto del Abono *
                {autoFilledFields.has('monto') && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                <input
                  type="number"
                  value={monto}
                  onChange={(e) => {
                    setMonto(e.target.value);
                    setAutoFilledFields(prev => { prev.delete('monto'); return new Set(prev); });
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent ${
                    autoFilledFields.has('monto') ? 'border-green-400 bg-green-50' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                Fecha del Abono *
                {autoFilledFields.has('fecha') && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto
                  </span>
                )}
              </label>
              <input
                type="date"
                value={fechaAbono}
                onChange={(e) => {
                  setFechaAbono(e.target.value);
                  setAutoFilledFields(prev => { prev.delete('fecha'); return new Set(prev); });
                }}
                required
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent ${
                  autoFilledFields.has('fecha') ? 'border-green-400 bg-green-50' : 'border-gray-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                Método de Pago *
                {autoFilledFields.has('metodo') && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto
                  </span>
                )}
              </label>
              <select
                value={metodoPago}
                onChange={(e) => {
                  setMetodoPago(e.target.value);
                  setAutoFilledFields(prev => { prev.delete('metodo'); return new Set(prev); });
                }}
                required
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent ${
                  autoFilledFields.has('metodo') ? 'border-green-400 bg-green-50' : 'border-gray-300'
                }`}
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
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                Número de Operación
                {autoFilledFields.has('operacion') && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto
                  </span>
                )}
              </label>
              <input
                type="text"
                value={numeroOperacion}
                onChange={(e) => {
                  setNumeroOperacion(e.target.value);
                  setAutoFilledFields(prev => { prev.delete('operacion'); return new Set(prev); });
                }}
                placeholder="Ej: 804263"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent ${
                  autoFilledFields.has('operacion') ? 'border-green-400 bg-green-50' : 'border-gray-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                Notas (Opcional)
                {autoFilledFields.has('notas') && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto
                  </span>
                )}
              </label>
              <textarea
                value={notas}
                onChange={(e) => {
                  setNotas(e.target.value);
                  setAutoFilledFields(prev => { prev.delete('notas'); return new Set(prev); });
                }}
                rows={3}
                placeholder="Agrega notas o comentarios sobre este abono..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent resize-none ${
                  autoFilledFields.has('notas') ? 'border-green-400 bg-green-50' : 'border-gray-300'
                }`}
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
