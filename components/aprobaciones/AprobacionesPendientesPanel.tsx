// ============================================================================
// COMPONENT: AprobacionesPendientesPanel
// ============================================================================
// Descripcion: Panel para ver y gestionar aprobaciones de descuento pendientes
// Features: Lista pendientes, aprobar, rechazar, historial
// Fase: 5 - Aprobacion de Descuentos
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  Check,
  X,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  User,
  MapPin,
  DollarSign,
  Percent,
  MessageSquare,
  CheckCircle,
  XCircle,
  History,
} from 'lucide-react';
import {
  getAprobacionesPendientes,
  getAprobacionesHistorial,
  aprobarDescuento,
  rechazarDescuento,
  type AprobacionDescuento,
} from '@/lib/actions-aprobaciones';
import { useAuth } from '@/lib/auth-context';

interface AprobacionesPendientesPanelProps {
  proyectoId: string;
}

type TabType = 'pendientes' | 'historial';

export default function AprobacionesPendientesPanel({ proyectoId }: AprobacionesPendientesPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('pendientes');
  const [loading, setLoading] = useState(true);
  const [pendientes, setPendientes] = useState<AprobacionDescuento[]>([]);
  const [historial, setHistorial] = useState<AprobacionDescuento[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comentarioRechazo, setComentarioRechazo] = useState('');
  const [showRechazoModal, setShowRechazoModal] = useState<string | null>(null);
  const [filtroHistorial, setFiltroHistorial] = useState<string>('todos');

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      if (!user?.rol) return;

      setLoading(true);
      setError(null);

      try {
        // Cargar pendientes
        const pendientesResult = await getAprobacionesPendientes(proyectoId, user.rol);
        if (pendientesResult.success && pendientesResult.data) {
          setPendientes(pendientesResult.data);
        }

        // Cargar historial
        const historialResult = await getAprobacionesHistorial(proyectoId);
        if (historialResult.success && historialResult.data) {
          setHistorial(historialResult.data);
        }
      } catch (err) {
        setError('Error al cargar aprobaciones');
        console.error(err);
      }

      setLoading(false);
    };

    loadData();
  }, [proyectoId, user?.rol]);

  // Aprobar
  const handleAprobar = async (aprobacionId: string) => {
    if (!user?.id || !user?.nombre || !user?.rol) return;

    setProcessingId(aprobacionId);
    setError(null);

    const result = await aprobarDescuento(
      aprobacionId,
      user.id,
      user.nombre,
      user.rol,
      'Aprobado'
    );

    if (result.success) {
      // Recargar datos
      const pendientesResult = await getAprobacionesPendientes(proyectoId, user.rol);
      if (pendientesResult.success && pendientesResult.data) {
        setPendientes(pendientesResult.data);
      }
      const historialResult = await getAprobacionesHistorial(proyectoId);
      if (historialResult.success && historialResult.data) {
        setHistorial(historialResult.data);
      }
    } else {
      setError(result.error || 'Error al aprobar');
    }

    setProcessingId(null);
  };

  // Rechazar
  const handleRechazar = async () => {
    if (!user?.id || !user?.nombre || !user?.rol || !showRechazoModal) return;
    if (!comentarioRechazo.trim()) {
      setError('Debe indicar el motivo del rechazo');
      return;
    }

    setProcessingId(showRechazoModal);
    setError(null);

    const result = await rechazarDescuento(
      showRechazoModal,
      user.id,
      user.nombre,
      user.rol,
      comentarioRechazo
    );

    if (result.success) {
      // Recargar datos
      const pendientesResult = await getAprobacionesPendientes(proyectoId, user.rol);
      if (pendientesResult.success && pendientesResult.data) {
        setPendientes(pendientesResult.data);
      }
      const historialResult = await getAprobacionesHistorial(proyectoId);
      if (historialResult.success && historialResult.data) {
        setHistorial(historialResult.data);
      }
      setShowRechazoModal(null);
      setComentarioRechazo('');
    } else {
      setError(result.error || 'Error al rechazar');
    }

    setProcessingId(null);
  };

  // Formatear monto
  const formatMonto = (monto: number) => {
    return `$${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Formatear fecha
  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Obtener color de estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'aprobado':
        return 'bg-green-100 text-green-800';
      case 'rechazado':
        return 'bg-red-100 text-red-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filtrar historial
  const historialFiltrado = historial.filter((h) => {
    if (filtroHistorial === 'todos') return true;
    return h.estado === filtroHistorial;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando aprobaciones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-[#1b967a] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">Aprobaciones de Descuento</h2>
              <p className="text-sm text-green-100">
                {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''} de aprobacion
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('pendientes')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'pendientes'
                ? 'text-[#1b967a] border-b-2 border-[#1b967a]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pendientes
            {pendientes.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                {pendientes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'historial'
                ? 'text-[#1b967a] border-b-2 border-[#1b967a]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-4 h-4" />
            Historial
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {activeTab === 'pendientes' && (
          <>
            {pendientes.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700">No hay aprobaciones pendientes</h3>
                <p className="text-gray-500 mt-1">Todas las solicitudes han sido procesadas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendientes.map((aprobacion) => (
                  <div
                    key={aprobacion.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
                  >
                    {/* Resumen */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === aprobacion.id ? null : aprobacion.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Icono expandir */}
                          <div className="text-gray-400">
                            {expandedId === aprobacion.id ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </div>

                          {/* Info basica */}
                          <div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                Local {(aprobacion.local as { codigo: string })?.codigo || 'N/A'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor('pendiente')}`}>
                                Pendiente
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                              <User className="w-4 h-4" />
                              <span>{aprobacion.vendedor_nombre}</span>
                              <span className="text-gray-300">|</span>
                              <span>{formatFecha(aprobacion.fecha_solicitud)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Descuento */}
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-red-600 font-semibold">
                              <Percent className="w-4 h-4" />
                              <span>{aprobacion.descuento_porcentaje.toFixed(1)}% descuento</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatMonto(aprobacion.precio_lista)} → {formatMonto(aprobacion.precio_negociado)}
                            </div>
                          </div>

                          {/* Botones accion */}
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleAprobar(aprobacion.id)}
                              disabled={processingId === aprobacion.id}
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                              title="Aprobar"
                            >
                              {processingId === aprobacion.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Check className="w-5 h-5" />
                              )}
                            </button>
                            <button
                              onClick={() => setShowRechazoModal(aprobacion.id)}
                              disabled={processingId === aprobacion.id}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                              title="Rechazar"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detalles expandidos */}
                    {expandedId === aprobacion.id && (
                      <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50">
                        <div className="grid grid-cols-3 gap-6 pt-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Detalles del Descuento</h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Precio Lista:</span>
                                <span className="font-medium">{formatMonto(aprobacion.precio_lista)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Precio Negociado:</span>
                                <span className="font-medium">{formatMonto(aprobacion.precio_negociado)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Descuento:</span>
                                <span className="font-medium text-red-600">
                                  -{formatMonto(aprobacion.descuento_monto)} ({aprobacion.descuento_porcentaje.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Aprobadores Requeridos</h4>
                            <div className="flex flex-wrap gap-2">
                              {aprobacion.aprobadores_requeridos.map((rol) => (
                                <span
                                  key={rol}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                                >
                                  {rol === 'jefe_ventas' ? 'Jefe Ventas' : rol === 'admin' ? 'Gerencia' : rol}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Comentario del Vendedor</h4>
                            <p className="text-sm text-gray-700">
                              {aprobacion.vendedor_comentario || 'Sin comentarios'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'historial' && (
          <>
            {/* Filtros */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Filtrar:</span>
              </div>
              <select
                value={filtroHistorial}
                onChange={(e) => setFiltroHistorial(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
              >
                <option value="todos">Todos</option>
                <option value="aprobado">Aprobados</option>
                <option value="rechazado">Rechazados</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>

            {historialFiltrado.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700">Sin historial</h3>
                <p className="text-gray-500 mt-1">No hay aprobaciones en el historial</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historialFiltrado.map((aprobacion) => (
                  <div
                    key={aprobacion.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Icono estado */}
                        <div className={`p-2 rounded-full ${
                          aprobacion.estado === 'aprobado' ? 'bg-green-100' :
                          aprobacion.estado === 'rechazado' ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          {aprobacion.estado === 'aprobado' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : aprobacion.estado === 'rechazado' ? (
                            <XCircle className="w-5 h-5 text-red-600" />
                          ) : (
                            <X className="w-5 h-5 text-gray-600" />
                          )}
                        </div>

                        {/* Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              Local {(aprobacion.local as { codigo: string })?.codigo || 'N/A'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(aprobacion.estado)}`}>
                              {aprobacion.estado.charAt(0).toUpperCase() + aprobacion.estado.slice(1)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            <span>{aprobacion.vendedor_nombre}</span>
                            <span className="mx-2">-</span>
                            <span>{aprobacion.descuento_porcentaje.toFixed(1)}% descuento</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-sm">
                        <div className="text-gray-500">
                          Solicitado: {formatFecha(aprobacion.fecha_solicitud)}
                        </div>
                        {aprobacion.fecha_resolucion && (
                          <div className="text-gray-400">
                            Resuelto: {formatFecha(aprobacion.fecha_resolucion)}
                          </div>
                        )}
                      </div>
                    </div>

                    {aprobacion.comentario_resolucion && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-start gap-2 text-sm">
                          <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                          <span className="text-gray-600">{aprobacion.comentario_resolucion}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Rechazo */}
      {showRechazoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-800">Rechazar Descuento</h3>
              </div>
            </div>

            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo del rechazo (requerido)
              </label>
              <textarea
                value={comentarioRechazo}
                onChange={(e) => setComentarioRechazo(e.target.value)}
                placeholder="Explica por que rechazas este descuento..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowRechazoModal(null);
                  setComentarioRechazo('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleRechazar}
                disabled={!comentarioRechazo.trim() || processingId === showRechazoModal}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {processingId === showRechazoModal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rechazando...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    Rechazar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
