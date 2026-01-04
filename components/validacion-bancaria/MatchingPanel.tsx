'use client';

// ============================================================================
// COMPONENTE: MatchingPanel
// ============================================================================
// Panel para hacer matching entre transacciones bancarias y abonos del sistema
// ============================================================================

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Search,
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  Hash,
  User,
  DollarSign,
  Loader2,
  Eye,
  Ban,
} from 'lucide-react';
import {
  TransaccionBancaria,
  MatchSuggestion,
  getTransacciones,
  buscarMatchesPosibles,
  confirmarMatch,
  ignorarTransaccion,
} from '@/lib/actions-validacion-bancaria';

interface MatchingPanelProps {
  importacionId: string;
  proyectoId: string;
  userId: string;
  onUpdate: () => void;
}

type FilterEstado = 'todos' | 'pendiente' | 'matched' | 'ignorado';

export default function MatchingPanel({
  importacionId,
  proyectoId,
  userId,
  onUpdate,
}: MatchingPanelProps) {
  const [transacciones, setTransacciones] = useState<TransaccionBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FilterEstado>('pendiente');
  const [transaccionSeleccionada, setTransaccionSeleccionada] = useState<TransaccionBancaria | null>(null);
  const [sugerencias, setSugerencias] = useState<MatchSuggestion[]>([]);
  const [loadingSugerencias, setLoadingSugerencias] = useState(false);
  const [procesando, setProcesando] = useState<string | null>(null);

  // Cargar transacciones
  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await getTransacciones(importacionId, {
        estado: filtro === 'todos' ? undefined : filtro,
        soloAbonos: true,
      });
      setTransacciones(data);
      setLoading(false);
    }
    load();
  }, [importacionId, filtro]);

  // Cargar sugerencias cuando se selecciona una transaccion
  useEffect(() => {
    async function loadSugerencias() {
      if (!transaccionSeleccionada) {
        setSugerencias([]);
        return;
      }
      setLoadingSugerencias(true);
      const data = await buscarMatchesPosibles(transaccionSeleccionada.id);
      setSugerencias(data);
      setLoadingSugerencias(false);
    }
    loadSugerencias();
  }, [transaccionSeleccionada]);

  const handleConfirmarMatch = async (sugerencia: MatchSuggestion) => {
    if (!transaccionSeleccionada) return;

    setProcesando(sugerencia.abono_id);
    const result = await confirmarMatch(
      transaccionSeleccionada.id,
      sugerencia.abono_id,
      sugerencia.control_pago_id,
      userId,
      false
    );

    if (result.success) {
      // Recargar datos
      setTransaccionSeleccionada(null);
      const data = await getTransacciones(importacionId, {
        estado: filtro === 'todos' ? undefined : filtro,
        soloAbonos: true,
      });
      setTransacciones(data);
      onUpdate();
    }
    setProcesando(null);
  };

  const handleIgnorar = async (transaccion: TransaccionBancaria, notas: string) => {
    setProcesando(transaccion.id);
    const result = await ignorarTransaccion(transaccion.id, notas, userId);

    if (result.success) {
      setTransaccionSeleccionada(null);
      const data = await getTransacciones(importacionId, {
        estado: filtro === 'todos' ? undefined : filtro,
        soloAbonos: true,
      });
      setTransacciones(data);
      onUpdate();
    }
    setProcesando(null);
  };

  const formatMonto = (monto: number, moneda: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: moneda === 'PEN' ? 'PEN' : 'USD',
    }).format(monto);
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Estadisticas
  const stats = {
    total: transacciones.length,
    pendientes: transacciones.filter((t) => t.estado_matching === 'pendiente').length,
    matched: transacciones.filter((t) => t.estado_matching === 'matched' || t.estado_matching === 'manual').length,
    ignorados: transacciones.filter((t) => t.estado_matching === 'ignorado').length,
  };

  return (
    <div className="space-y-4">
      {/* Filtros y stats */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex gap-2">
          <FilterButton
            active={filtro === 'pendiente'}
            onClick={() => setFiltro('pendiente')}
            color="yellow"
          >
            Pendientes ({stats.pendientes})
          </FilterButton>
          <FilterButton
            active={filtro === 'matched'}
            onClick={() => setFiltro('matched')}
            color="green"
          >
            Matched ({stats.matched})
          </FilterButton>
          <FilterButton
            active={filtro === 'ignorado'}
            onClick={() => setFiltro('ignorado')}
            color="gray"
          >
            Ignorados ({stats.ignorados})
          </FilterButton>
          <FilterButton
            active={filtro === 'todos'}
            onClick={() => setFiltro('todos')}
            color="blue"
          >
            Todos ({stats.total})
          </FilterButton>
        </div>
      </div>

      {/* Grid de transacciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lista de transacciones */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Transacciones Bancarias
            </h3>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                Cargando transacciones...
              </div>
            ) : transacciones.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                No hay transacciones {filtro !== 'todos' ? 'con este filtro' : ''}
              </div>
            ) : (
              transacciones.map((trans) => (
                <div
                  key={trans.id}
                  onClick={() => setTransaccionSeleccionada(trans)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    transaccionSeleccionada?.id === trans.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {formatFecha(trans.fecha_operacion)}
                      </span>
                    </div>
                    <span className="font-bold text-lg text-green-600">
                      {formatMonto(trans.monto, trans.moneda)}
                    </span>
                  </div>

                  {trans.numero_operacion && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Hash className="w-3 h-3" />
                      {trans.numero_operacion}
                    </div>
                  )}

                  {trans.descripcion && (
                    <p className="text-sm text-gray-600 truncate">{trans.descripcion}</p>
                  )}

                  {trans.nombre_extraido && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <User className="w-3 h-3" />
                      {trans.nombre_extraido}
                    </div>
                  )}

                  {/* Estado badge */}
                  <div className="mt-2">
                    <EstadoBadge estado={trans.estado_matching} confianza={trans.match_confianza} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel de matching */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Buscar Match
            </h3>
          </div>

          {!transaccionSeleccionada ? (
            <div className="p-8 text-center text-gray-500">
              <ArrowRight className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              Selecciona una transaccion para buscar coincidencias
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Resumen transaccion seleccionada */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800 font-medium mb-1">
                  Transaccion seleccionada:
                </p>
                <div className="flex justify-between">
                  <span className="text-blue-700">
                    {formatFecha(transaccionSeleccionada.fecha_operacion)}
                  </span>
                  <span className="font-bold text-blue-800">
                    {formatMonto(transaccionSeleccionada.monto, transaccionSeleccionada.moneda)}
                  </span>
                </div>
                {transaccionSeleccionada.descripcion && (
                  <p className="text-xs text-blue-600 mt-1 truncate">
                    {transaccionSeleccionada.descripcion}
                  </p>
                )}
              </div>

              {/* Sugerencias de match */}
              {loadingSugerencias ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">Buscando coincidencias...</p>
                </div>
              ) : sugerencias.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                  <p className="text-gray-600 font-medium">No se encontraron coincidencias</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Puedes ignorar esta transaccion si no corresponde a un pago
                  </p>
                  <button
                    onClick={() => handleIgnorar(transaccionSeleccionada, 'Sin match encontrado')}
                    disabled={procesando !== null}
                    className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 mx-auto"
                  >
                    <Ban className="w-4 h-4" />
                    Ignorar transaccion
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    {sugerencias.length} coincidencia{sugerencias.length > 1 ? 's' : ''} encontrada{sugerencias.length > 1 ? 's' : ''}:
                  </p>
                  {sugerencias.map((sug) => (
                    <div
                      key={sug.abono_id}
                      className="border rounded-lg p-3 hover:border-green-300 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-800">{sug.local_codigo}</p>
                          <p className="text-sm text-gray-600">{sug.cliente_nombre}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {formatMonto(sug.monto, transaccionSeleccionada.moneda)}
                          </p>
                          <p className="text-xs text-gray-500">{formatFecha(sug.fecha_abono)}</p>
                        </div>
                      </div>

                      {/* Confianza */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              sug.confianza >= 80
                                ? 'bg-green-500'
                                : sug.confianza >= 60
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${sug.confianza}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {sug.confianza}%
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mb-3">{sug.motivo}</p>

                      <button
                        onClick={() => handleConfirmarMatch(sug)}
                        disabled={procesando !== null}
                        className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {procesando === sug.abono_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Confirmar Match
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => handleIgnorar(transaccionSeleccionada, 'Ignorado manualmente')}
                    disabled={procesando !== null}
                    className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Ignorar transaccion
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

function FilterButton({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: 'yellow' | 'green' | 'gray' | 'blue';
  children: React.ReactNode;
}) {
  const colors = {
    yellow: active ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-white text-gray-600 border-gray-200',
    green: active ? 'bg-green-100 text-green-800 border-green-300' : 'bg-white text-gray-600 border-gray-200',
    gray: active ? 'bg-gray-200 text-gray-800 border-gray-400' : 'bg-white text-gray-600 border-gray-200',
    blue: active ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-white text-gray-600 border-gray-200',
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${colors[color]}`}
    >
      {children}
    </button>
  );
}

function EstadoBadge({
  estado,
  confianza,
}: {
  estado: string;
  confianza?: number | null;
}) {
  switch (estado) {
    case 'matched':
    case 'manual':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
          <CheckCircle className="w-3 h-3" />
          {estado === 'manual' ? 'Match Manual' : 'Matched'}
          {confianza && ` (${confianza}%)`}
        </span>
      );
    case 'pendiente':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
          <AlertCircle className="w-3 h-3" />
          Pendiente
        </span>
      );
    case 'ignorado':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
          <XCircle className="w-3 h-3" />
          Ignorado
        </span>
      );
    default:
      return null;
  }
}
