'use client';

import { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import type { ControlPago } from '@/lib/actions-control-pagos';
import { getPagosLocal, getPagoStats, toggleSeparacionPagada, type PagoConAbonos, type PagoStats } from '@/lib/actions-pagos';
import RegistrarAbonoModal from './RegistrarAbonoModal';
import AlertModal from '@/components/shared/AlertModal';
import { useAuth } from '@/lib/auth-context';

interface PagosPanelProps {
  isOpen: boolean;
  controlPago: ControlPago | null;
  onClose: () => void;
}

export default function PagosPanel({ isOpen, controlPago, onClose }: PagosPanelProps) {
  const [activeTab, setActiveTab] = useState<'inicial' | 'cuotas'>('inicial');
  const [pagos, setPagos] = useState<PagoConAbonos[]>([]);
  const [stats, setStats] = useState<PagoStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [abonoModal, setAbonoModal] = useState<{ isOpen: boolean; pago: PagoConAbonos | null }>({
    isOpen: false,
    pago: null,
  });
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

  useEffect(() => {
    if (isOpen && controlPago) {
      loadData();
    }
  }, [isOpen, controlPago]);

  const loadData = async () => {
    if (!controlPago) return;
    setLoading(true);
    const [pagosData, statsData] = await Promise.all([
      getPagosLocal(controlPago.id),
      getPagoStats(controlPago.id),
    ]);
    setPagos(pagosData);
    setStats(statsData);
    setLoading(false);
  };

  const pagoSeparacion = pagos.find(p => p.tipo === 'separacion');
  const pagoInicial = pagos.find(p => p.tipo === 'inicial');
  const cuotas = pagos.filter(p => p.tipo === 'cuota');

  const handleToggleSeparacion = async (pagado: boolean) => {
    if (!pagoSeparacion || !user || !controlPago) return;

    const result = await toggleSeparacionPagada({
      pagoId: pagoSeparacion.id,
      pagado,
      usuarioId: user.id,
      montoSeparacion: controlPago.monto_separacion,
    });

    setAlertModal({
      isOpen: true,
      title: result.success ? 'Actualizado' : 'Error',
      message: result.message || (result.success ? 'Separación actualizada' : 'No se pudo actualizar'),
      variant: result.success ? 'success' : 'danger',
    });
  };

  const formatMonto = (monto: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(monto);
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completado': return 'text-green-600 bg-green-50';
      case 'parcial': return 'text-yellow-600 bg-yellow-50';
      case 'vencido': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'completado': return <CheckCircle className="w-4 h-4" />;
      case 'vencido': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (!isOpen || !controlPago) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-[#1b967a] text-white p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold">Control de Pagos</h2>
            <p className="text-sm opacity-90">
              Local {controlPago.codigo_local} - {controlPago.lead_nombre}
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500">Cargando...</div>
        ) : (
          <>
            {/* Banner Total Abonado */}
            <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 border-b">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">
                  Monto total: {formatMonto(stats?.totalVenta || 0)}
                </div>
                <div className="text-3xl font-bold text-green-600">
                  Total abonado: {formatMonto(stats?.totalAbonado || 0)}
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Falta por pagar: {formatMonto((stats?.totalVenta || 0) - (stats?.totalAbonado || 0))}
                  {(stats?.totalIntereses || 0) > 0 && (
                    <span className="ml-2 text-orange-600">
                      | Intereses: {formatMonto(stats?.totalIntereses || 0)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-b">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-1">Inicial</div>
                  <div className="text-xl font-bold text-gray-900">
                    {formatMonto(stats?.inicial.abonado || 0)}
                  </div>
                  <div className="text-xs text-gray-500">
                    de {formatMonto(stats?.inicial.esperado || 0)}
                  </div>
                  <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(stats?.inicial.estado || 'pendiente')}`}>
                    {getEstadoIcon(stats?.inicial.estado || 'pendiente')}
                    {stats?.inicial.estado || 'pendiente'}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-1">Cuotas</div>
                  <div className="text-xl font-bold text-gray-900">
                    {stats?.cuotas.pagadas || 0} / {stats?.cuotas.total || 0}
                  </div>
                  <div className="text-xs text-gray-500 space-y-1 mt-2">
                    {(stats?.cuotas.vencidas || 0) > 0 && (
                      <div className="text-red-600">🔴 {stats?.cuotas.vencidas} vencidas</div>
                    )}
                    {stats?.cuotas.proximaFecha && (
                      <div>⏰ Próxima: {formatFecha(stats.cuotas.proximaFecha)}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {pagoSeparacion && (
              <div className="p-6 bg-white border-b">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-gray-600" />
                    Separación
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pagoSeparacion.estado === 'completado'}
                      onChange={(e) => handleToggleSeparacion(e.target.checked)}
                      className="w-4 h-4 text-[#1b967a] border-gray-300 rounded focus:ring-[#1b967a]"
                    />
                    <span className="text-sm font-medium text-gray-700">Pagado</span>
                  </label>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monto:</span>
                    <span className="font-semibold">{formatMonto(pagoSeparacion.monto_esperado)}</span>
                  </div>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(pagoSeparacion.estado)}`}>
                    {getEstadoIcon(pagoSeparacion.estado)}
                    {pagoSeparacion.estado}
                  </div>
                </div>

                {pagoSeparacion.estado !== 'completado' && (
                  <button
                    onClick={() => setAbonoModal({ isOpen: true, pago: pagoSeparacion })}
                    className="mt-3 w-full bg-[#1b967a] text-white py-2 px-4 rounded-lg hover:bg-[#157a63] transition-colors font-medium text-sm"
                  >
                    + Registrar Monto de Separación
                  </button>
                )}

                {pagoSeparacion.fue_desmarcado && (
                  <div className="mt-3">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Historial de Abonos</div>
                    {pagoSeparacion.abonos.length > 0 ? (
                      <div className="space-y-2">
                        {pagoSeparacion.abonos.map((abono) => (
                          <div key={abono.id} className="bg-gray-50 border rounded-lg p-3 text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-semibold text-gray-900">{formatMonto(abono.monto)}</div>
                              <div className="text-gray-600">{formatFecha(abono.fecha_abono)}</div>
                            </div>
                            <div className="text-gray-600">{abono.metodo_pago}</div>
                            {abono.notas && <div className="text-gray-500 text-xs mt-1">{abono.notas}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          ⚠️ La separación fue desmarcada como NO pagada
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="border-b">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('inicial')}
                  className={`flex-1 py-3 px-4 font-medium transition-colors ${
                    activeTab === 'inicial'
                      ? 'text-[#1b967a] border-b-2 border-[#1b967a] bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Inicial
                </button>
                <button
                  onClick={() => setActiveTab('cuotas')}
                  className={`flex-1 py-3 px-4 font-medium transition-colors ${
                    activeTab === 'cuotas'
                      ? 'text-[#1b967a] border-b-2 border-[#1b967a] bg-green-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Cuotas ({cuotas.length})
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'inicial' && pagoInicial && (
                <div className="space-y-4">
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">Pago Inicial</div>
                        <div className="text-sm text-gray-600">
                          Esperado: {formatMonto(pagoInicial.monto_esperado)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {formatMonto(pagoInicial.monto_abonado)}
                        </div>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(pagoInicial.estado)}`}>
                          {getEstadoIcon(pagoInicial.estado)}
                          {pagoInicial.estado}
                        </div>
                      </div>
                    </div>

                    {pagoInicial.estado !== 'completado' && (
                      <button
                        onClick={() => setAbonoModal({ isOpen: true, pago: pagoInicial })}
                        className="w-full bg-[#1b967a] text-white py-2 px-4 rounded-lg hover:bg-[#157a63] transition-colors font-medium"
                      >
                        + Registrar Abono
                      </button>
                    )}
                  </div>

                  {pagoInicial.abonos.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-gray-700 mb-2">Historial de Abonos</div>
                      <div className="space-y-2">
                        {pagoInicial.abonos.map((abono) => (
                          <div key={abono.id} className="bg-gray-50 border rounded-lg p-3 text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-semibold text-gray-900">{formatMonto(abono.monto)}</div>
                              <div className="text-gray-600">{formatFecha(abono.fecha_abono)}</div>
                            </div>
                            <div className="text-gray-600">{abono.metodo_pago}</div>
                            {abono.notas && <div className="text-gray-500 text-xs mt-1">{abono.notas}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'cuotas' && (
                <div className="space-y-3">
                  {cuotas.map((cuota) => (
                    <div key={cuota.id} className="bg-white border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-semibold text-gray-900">
                            Cuota #{cuota.numero_cuota}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatFecha(cuota.fecha_esperada)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">{formatMonto(cuota.monto_esperado)}</div>
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(cuota.estado)}`}>
                            {getEstadoIcon(cuota.estado)}
                            {cuota.estado}
                          </div>
                        </div>
                      </div>

                      {cuota.monto_abonado > 0 && (
                        <div className="text-sm text-green-600 mb-2">
                          Abonado: {formatMonto(cuota.monto_abonado)}
                        </div>
                      )}

                      {cuota.estado !== 'completado' && (
                        <button
                          onClick={() => setAbonoModal({ isOpen: true, pago: cuota })}
                          className="w-full bg-gray-100 text-gray-700 py-1.5 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          + Registrar Pago
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <RegistrarAbonoModal
        isOpen={abonoModal.isOpen}
        pago={abonoModal.pago}
        onClose={() => setAbonoModal({ isOpen: false, pago: null })}
        onSuccess={() => {
          setAbonoModal({ isOpen: false, pago: null });
          loadData();
        }}
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
        onOk={() => {
          setAlertModal({ ...alertModal, isOpen: false });
          loadData(); // Recargar datos después de cerrar el modal
        }}
      />
    </>
  );
}
