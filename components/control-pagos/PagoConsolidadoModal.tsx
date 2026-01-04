'use client';

// ============================================================================
// COMPONENTE: PagoConsolidadoModal
// FASE 4 - Plan Procesos Finanzas-Ventas 2025
// ============================================================================
// Modal para registrar pagos consolidados (1 voucher = N locales)
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import {
  X,
  Search,
  Plus,
  Trash2,
  Building2,
  User,
  DollarSign,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import AlertModal from '@/components/shared/AlertModal';
import {
  LocalCliente,
  getLocalesCliente,
  getLocalPorCodigo,
  createPagoConsolidado,
  CreatePagoConsolidadoInput,
} from '@/lib/actions-pagos-consolidados';

interface PagoConsolidadoModalProps {
  isOpen: boolean;
  proyectoId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface LocalSeleccionado extends LocalCliente {
  distribucion: {
    pagoId: string;
    concepto: 'separacion' | 'inicial' | 'cuota' | 'abono_general';
    numeroCuota?: number;
    montoAsignado: number;
    montoMaximo: number;
    descripcion: string;
  }[];
}

export default function PagoConsolidadoModal({
  isOpen,
  proyectoId,
  onClose,
  onSuccess,
}: PagoConsolidadoModalProps) {
  const { user } = useAuth();

  // Estado del voucher/pago
  const [montoTotal, setMontoTotal] = useState('');
  const [moneda, setMoneda] = useState<'USD' | 'PEN'>('USD');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [bancoOrigen, setBancoOrigen] = useState('');
  const [numeroOperacion, setNumeroOperacion] = useState('');
  const [metodoPago, setMetodoPago] = useState('Transferencia');
  const [notas, setNotas] = useState('');

  // Estado de búsqueda
  const [dniCliente, setDniCliente] = useState('');
  const [codigoLocal, setCodigoLocal] = useState('');
  const [buscando, setBuscando] = useState(false);

  // Locales seleccionados para distribuir el pago
  const [localesSeleccionados, setLocalesSeleccionados] = useState<LocalSeleccionado[]>([]);

  // UI State
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

  // Reset form cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setMontoTotal('');
      setMoneda('USD');
      setFechaPago(new Date().toISOString().split('T')[0]);
      setBancoOrigen('');
      setNumeroOperacion('');
      setMetodoPago('Transferencia');
      setNotas('');
      setDniCliente('');
      setCodigoLocal('');
      setLocalesSeleccionados([]);
    }
  }, [isOpen]);

  // Buscar locales por DNI del cliente
  const buscarPorDni = useCallback(async () => {
    if (!dniCliente.trim()) return;

    setBuscando(true);
    const result = await getLocalesCliente(proyectoId, dniCliente.trim());
    setBuscando(false);

    if (!result.success || !result.data) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: result.message || 'Error buscando locales',
        variant: 'danger',
      });
      return;
    }

    if (result.data.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'No encontrado',
        message: `No se encontraron locales para el DNI ${dniCliente}`,
        variant: 'warning',
      });
      return;
    }

    // Agregar locales encontrados (evitando duplicados)
    const nuevosLocales: LocalSeleccionado[] = [];
    for (const local of result.data) {
      const yaExiste = localesSeleccionados.some(
        (l) => l.control_pago_id === local.control_pago_id
      );
      if (!yaExiste && local.pagos.length > 0) {
        nuevosLocales.push({
          ...local,
          distribucion: local.pagos.map((p) => ({
            pagoId: p.id,
            concepto: p.tipo as 'separacion' | 'inicial' | 'cuota',
            numeroCuota: p.numero_cuota || undefined,
            montoAsignado: 0,
            montoMaximo: p.monto_restante,
            descripcion:
              p.tipo === 'separacion'
                ? 'Separación'
                : p.tipo === 'inicial'
                ? 'Inicial'
                : `Cuota ${p.numero_cuota}`,
          })),
        });
      }
    }

    if (nuevosLocales.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'Sin pagos pendientes',
        message: 'Los locales encontrados no tienen pagos pendientes',
        variant: 'info',
      });
      return;
    }

    setLocalesSeleccionados((prev) => [...prev, ...nuevosLocales]);
    setDniCliente('');
  }, [dniCliente, proyectoId, localesSeleccionados]);

  // Buscar local por código
  const buscarPorCodigo = useCallback(async () => {
    if (!codigoLocal.trim()) return;

    setBuscando(true);
    const result = await getLocalPorCodigo(proyectoId, codigoLocal.trim());
    setBuscando(false);

    if (!result.success || !result.data) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: result.message || 'Local no encontrado',
        variant: 'danger',
      });
      return;
    }

    const local = result.data;

    // Verificar si ya está agregado
    const yaExiste = localesSeleccionados.some(
      (l) => l.control_pago_id === local.control_pago_id
    );
    if (yaExiste) {
      setAlertModal({
        isOpen: true,
        title: 'Ya agregado',
        message: `El local ${local.local_codigo} ya está en la lista`,
        variant: 'warning',
      });
      return;
    }

    if (local.pagos.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'Sin pagos pendientes',
        message: `El local ${local.local_codigo} no tiene pagos pendientes`,
        variant: 'info',
      });
      return;
    }

    setLocalesSeleccionados((prev) => [
      ...prev,
      {
        ...local,
        distribucion: local.pagos.map((p) => ({
          pagoId: p.id,
          concepto: p.tipo as 'separacion' | 'inicial' | 'cuota',
          numeroCuota: p.numero_cuota || undefined,
          montoAsignado: 0,
          montoMaximo: p.monto_restante,
          descripcion:
            p.tipo === 'separacion'
              ? 'Separación'
              : p.tipo === 'inicial'
              ? 'Inicial'
              : `Cuota ${p.numero_cuota}`,
        })),
      },
    ]);
    setCodigoLocal('');
  }, [codigoLocal, proyectoId, localesSeleccionados]);

  // Eliminar local de la lista
  const eliminarLocal = (controlPagoId: string) => {
    setLocalesSeleccionados((prev) =>
      prev.filter((l) => l.control_pago_id !== controlPagoId)
    );
  };

  // Actualizar monto asignado a un pago específico
  const actualizarMontoDistribucion = (
    controlPagoId: string,
    pagoId: string,
    monto: number
  ) => {
    setLocalesSeleccionados((prev) =>
      prev.map((local) => {
        if (local.control_pago_id !== controlPagoId) return local;
        return {
          ...local,
          distribucion: local.distribucion.map((d) => {
            if (d.pagoId !== pagoId) return d;
            return {
              ...d,
              montoAsignado: Math.min(monto, d.montoMaximo),
            };
          }),
        };
      })
    );
  };

  // Auto-distribuir el monto del voucher
  const autoDistribuir = () => {
    const monto = parseFloat(montoTotal) || 0;
    if (monto <= 0 || localesSeleccionados.length === 0) return;

    let restante = monto;
    const nuevosLocales = localesSeleccionados.map((local) => ({
      ...local,
      distribucion: local.distribucion.map((d) => {
        if (restante <= 0) return { ...d, montoAsignado: 0 };
        const asignar = Math.min(d.montoMaximo, restante);
        restante -= asignar;
        return { ...d, montoAsignado: asignar };
      }),
    }));

    setLocalesSeleccionados(nuevosLocales);
  };

  // Calcular totales
  const totalDistribuido = localesSeleccionados.reduce(
    (sum, local) =>
      sum + local.distribucion.reduce((s, d) => s + d.montoAsignado, 0),
    0
  );

  const montoVoucher = parseFloat(montoTotal) || 0;
  const diferencia = montoVoucher - totalDistribuido;

  // Validar formulario
  const formValido =
    montoVoucher > 0 &&
    localesSeleccionados.length > 0 &&
    Math.abs(diferencia) < 0.01 && // Tolerancia de 1 centavo
    totalDistribuido > 0;

  // Submit
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

    if (!formValido) {
      setAlertModal({
        isOpen: true,
        title: 'Formulario incompleto',
        message: 'Verifica que el monto distribuido coincida con el total del voucher',
        variant: 'warning',
      });
      return;
    }

    setLoading(true);

    // Construir input para crear pago consolidado
    const input: CreatePagoConsolidadoInput = {
      proyectoId,
      clienteNombre: localesSeleccionados[0]?.cliente_nombre,
      clienteDni: localesSeleccionados[0]?.cliente_dni,
      montoTotal: montoVoucher,
      moneda,
      fechaPago,
      bancoOrigen: bancoOrigen || undefined,
      numeroOperacion: numeroOperacion || undefined,
      metodoPago,
      notas: notas || undefined,
      createdBy: user.id,
      distribucion: localesSeleccionados.flatMap((local) =>
        local.distribucion
          .filter((d) => d.montoAsignado > 0)
          .map((d) => ({
            controlPagoId: local.control_pago_id,
            pagoId: d.pagoId,
            montoAsignado: d.montoAsignado,
            concepto: d.concepto,
            numeroCuota: d.numeroCuota,
          }))
      ),
    };

    const result = await createPagoConsolidado(input);
    setLoading(false);

    if (result.success) {
      setAlertModal({
        isOpen: true,
        title: 'Éxito',
        message: 'Pago consolidado registrado correctamente',
        variant: 'success',
      });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } else {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: result.message || 'Error al registrar el pago',
        variant: 'danger',
      });
    }
  };

  if (!isOpen) return null;

  const formatMonto = (m: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: moneda,
    }).format(m);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1b967a] to-[#157a63] px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pago Consolidado (1 voucher = N locales)
            </h3>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            {/* Sección: Datos del Voucher */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Datos del Voucher
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Monto Total *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={montoTotal}
                    onChange={(e) => setMontoTotal(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Moneda *</label>
                  <select
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value as 'USD' | 'PEN')}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1b967a]"
                  >
                    <option value="USD">Dólares (USD)</option>
                    <option value="PEN">Soles (PEN)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Fecha Pago *
                  </label>
                  <input
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1b967a]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Método Pago
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1b967a]"
                  >
                    <option value="Transferencia">Transferencia</option>
                    <option value="Depósito">Depósito</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Yape">Yape</option>
                    <option value="Plin">Plin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Banco</label>
                  <input
                    type="text"
                    value={bancoOrigen}
                    onChange={(e) => setBancoOrigen(e.target.value)}
                    placeholder="Ej: Interbank"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1b967a]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Nro. Operación
                  </label>
                  <input
                    type="text"
                    value={numeroOperacion}
                    onChange={(e) => setNumeroOperacion(e.target.value)}
                    placeholder="Ej: 804263"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1b967a]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Notas</label>
                  <input
                    type="text"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Notas adicionales..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1b967a]"
                  />
                </div>
              </div>
            </div>

            {/* Sección: Buscar Locales */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Agregar Locales
              </h4>
              <div className="flex flex-wrap gap-4">
                {/* Buscar por DNI */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={dniCliente}
                    onChange={(e) => setDniCliente(e.target.value)}
                    placeholder="DNI del cliente"
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1b967a] w-40"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), buscarPorDni())}
                  />
                  <button
                    type="button"
                    onClick={buscarPorDni}
                    disabled={buscando || !dniCliente.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {buscando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    Buscar
                  </button>
                </div>

                {/* O buscar por código de local */}
                <span className="text-gray-400 self-center">ó</span>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codigoLocal}
                    onChange={(e) => setCodigoLocal(e.target.value)}
                    placeholder="Código de local"
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1b967a] w-40"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), buscarPorCodigo())}
                  />
                  <button
                    type="button"
                    onClick={buscarPorCodigo}
                    disabled={buscando || !codigoLocal.trim()}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    {buscando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            {/* Sección: Distribución del Pago */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Distribución del Pago ({localesSeleccionados.length} locales)
                </h4>
                {localesSeleccionados.length > 0 && montoVoucher > 0 && (
                  <button
                    type="button"
                    onClick={autoDistribuir}
                    className="text-sm px-3 py-1 bg-[#1b967a] text-white rounded hover:bg-[#157a63]"
                  >
                    Auto-distribuir
                  </button>
                )}
              </div>

              {localesSeleccionados.length === 0 ? (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Busca locales por DNI o código para agregarlos</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {localesSeleccionados.map((local) => (
                    <div
                      key={local.control_pago_id}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-bold text-gray-800">
                            Local {local.local_codigo}
                          </span>
                          <span className="text-gray-500 text-sm ml-2">
                            {local.local_area} m² | {local.cliente_nombre}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => eliminarLocal(local.control_pago_id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {local.distribucion.map((d) => (
                          <div key={d.pagoId} className="bg-white p-3 rounded border">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-600">
                                {d.descripcion}
                              </span>
                              <span className="text-xs text-gray-400">
                                Máx: {formatMonto(d.montoMaximo)}
                              </span>
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              value={d.montoAsignado || ''}
                              onChange={(e) =>
                                actualizarMontoDistribucion(
                                  local.control_pago_id,
                                  d.pagoId,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                              placeholder="0.00"
                              max={d.montoMaximo}
                              className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-[#1b967a]"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="mt-2 text-right text-sm text-gray-600">
                        Subtotal:{' '}
                        <span className="font-bold">
                          {formatMonto(
                            local.distribucion.reduce((s, d) => s + d.montoAsignado, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumen */}
            {localesSeleccionados.length > 0 && (
              <div className="bg-gray-100 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total Voucher:</span>
                  <span className="font-bold">{formatMonto(montoVoucher)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-600">Total Distribuido:</span>
                  <span className="font-bold">{formatMonto(totalDistribuido)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1 border-t pt-2">
                  <span className="text-gray-600">Diferencia:</span>
                  <span
                    className={`font-bold ${
                      Math.abs(diferencia) < 0.01
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatMonto(diferencia)}
                    {Math.abs(diferencia) < 0.01 ? (
                      <CheckCircle className="w-4 h-4 inline ml-1" />
                    ) : (
                      <AlertCircle className="w-4 h-4 inline ml-1" />
                    )}
                  </span>
                </div>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !formValido}
              className="px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Registrar Pago Consolidado
            </button>
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
        onOk={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
