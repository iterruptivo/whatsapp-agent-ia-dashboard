'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, Search, Filter, Calendar, Check } from 'lucide-react';
import type { Comision } from '@/lib/actions-comisiones';
import { marcarComisionPagada } from '@/lib/actions-comisiones';

interface ComisionesDesgloseMensualProps {
  comisiones: Comision[];
  userRole: string;
  userId: string;
  onUpdate: () => void;
}

interface MonthGroup {
  monthKey: string;
  monthLabel: string;
  comisiones: Comision[];
  totalMonto: number;
  countPendiente: number;
  countDisponible: number;
  countPagada: number;
  montoPendiente: number;
  montoDisponible: number;
  montoPagada: number;
}

export default function ComisionesDesgloseMensual({ comisiones, userRole, userId, onUpdate }: ComisionesDesgloseMensualProps) {
  // Estados
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroAnio, setFiltroAnio] = useState<string>('2025');
  const [busqueda, setBusqueda] = useState<string>('');
  const [mesesVisibles, setMesesVisibles] = useState<number>(6);
  const [mesesExpandidos, setMesesExpandidos] = useState<Set<string>>(new Set());
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const isAdmin = userRole === 'admin';

  // Helper: Obtener la clave de mes según lógica híbrida
  const getMonthKey = (comision: Comision): string => {
    // 1. Si está pagada, usar mes de pago
    if (comision.estado === 'pagada' && comision.fecha_pago_comision) {
      return comision.fecha_pago_comision.slice(0, 7); // "2025-12"
    }
    // 2. Si está disponible, usar mes que se puso disponible
    if (comision.estado === 'disponible' && comision.fecha_disponible) {
      return comision.fecha_disponible.slice(0, 7);
    }
    // 3. Si está pendiente, usar mes de procesado
    return comision.fecha_procesado.slice(0, 7);
  };

  // Helper: Formatear clave de mes a texto legible
  const formatMonthYear = (monthKey: string): string => {
    const [year, month] = monthKey.split('-');
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  // Helper: Formatear monto
  const formatMonto = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Helper: Formatear fecha
  const formatFecha = (fecha: string | null) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Helper: Badge de estado
  const getEstadoBadge = (estado: string) => {
    const styles = {
      pendiente_inicial: 'bg-yellow-100 text-yellow-800',
      disponible: 'bg-green-100 text-green-800',
      pagada: 'bg-purple-100 text-purple-800',
    };
    const labels = {
      pendiente_inicial: 'Pendiente',
      disponible: 'Disponible',
      pagada: 'Pagada',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[estado as keyof typeof styles]}`}>
        {labels[estado as keyof typeof labels]}
      </span>
    );
  };

  // Helper: Badge de fase
  const getFaseBadge = (fase: string) => {
    const styles = {
      vendedor: 'bg-blue-100 text-blue-800',
      gestion: 'bg-indigo-100 text-indigo-800',
    };
    const labels = {
      vendedor: 'Vendedor',
      gestion: 'Gestión',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[fase as keyof typeof styles]}`}>
        {labels[fase as keyof typeof labels]}
      </span>
    );
  };

  // Agrupar comisiones por mes
  const comisionesPorMes = useMemo(() => {
    // 1. Filtrar comisiones
    let filtradas = comisiones;

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      filtradas = filtradas.filter(c => c.estado === filtroEstado);
    }

    // Filtro por año
    if (filtroAnio !== 'todos') {
      filtradas = filtradas.filter(c => {
        const monthKey = getMonthKey(c);
        return monthKey.startsWith(filtroAnio);
      });
    }

    // Filtro por búsqueda (código/proyecto/cliente)
    if (busqueda.trim()) {
      const searchLower = busqueda.toLowerCase().trim();
      filtradas = filtradas.filter(c => {
        const codigo = (c.local_codigo || '').toLowerCase();
        const proyecto = (c.proyecto_nombre || '').toLowerCase();
        return codigo.includes(searchLower) || proyecto.includes(searchLower);
      });
    }

    // 2. Agrupar por mes
    const grupos = new Map<string, MonthGroup>();

    filtradas.forEach(comision => {
      const monthKey = getMonthKey(comision);

      if (!grupos.has(monthKey)) {
        grupos.set(monthKey, {
          monthKey,
          monthLabel: formatMonthYear(monthKey),
          comisiones: [],
          totalMonto: 0,
          countPendiente: 0,
          countDisponible: 0,
          countPagada: 0,
          montoPendiente: 0,
          montoDisponible: 0,
          montoPagada: 0,
        });
      }

      const grupo = grupos.get(monthKey)!;
      grupo.comisiones.push(comision);
      grupo.totalMonto += comision.monto_comision;

      if (comision.estado === 'pendiente_inicial') {
        grupo.countPendiente++;
        grupo.montoPendiente += comision.monto_comision;
      } else if (comision.estado === 'disponible') {
        grupo.countDisponible++;
        grupo.montoDisponible += comision.monto_comision;
      } else if (comision.estado === 'pagada') {
        grupo.countPagada++;
        grupo.montoPagada += comision.monto_comision;
      }
    });

    // 3. Ordenar por mes descendente (más reciente primero)
    return Array.from(grupos.values()).sort((a, b) => {
      return b.monthKey.localeCompare(a.monthKey);
    });
  }, [comisiones, filtroEstado, filtroAnio, busqueda]);

  // Expandir mes actual por defecto
  useEffect(() => {
    const mesActual = new Date().toISOString().slice(0, 7); // "2025-11"
    setMesesExpandidos(new Set([mesActual]));
  }, []);

  // Toggle expansión de mes
  const toggleMes = (monthKey: string) => {
    const newSet = new Set(mesesExpandidos);
    if (newSet.has(monthKey)) {
      newSet.delete(monthKey);
    } else {
      newSet.add(monthKey);
    }
    setMesesExpandidos(newSet);
  };

  // Cargar más meses
  const handleCargarMas = () => {
    setMesesVisibles(prev => prev + 6);
  };

  // Marcar comisión como pagada (solo admin)
  const handleMarcarPagada = async (comisionId: string) => {
    setLoadingId(comisionId);
    setOpenDropdown(null);

    const result = await marcarComisionPagada(comisionId, userId);

    if (result.success) {
      onUpdate();
    } else {
      alert(result.message || 'Error al marcar comisión como pagada');
    }

    setLoadingId(null);
  };

  // Obtener años disponibles para filtro
  const aniosDisponibles = useMemo(() => {
    const anios = new Set<string>();
    comisiones.forEach(c => {
      const monthKey = getMonthKey(c);
      const year = monthKey.split('-')[0];
      anios.add(year);
    });
    return Array.from(anios).sort().reverse();
  }, [comisiones]);

  // Meses a mostrar (limitar por lazy loading)
  const mesesAMostrar = comisionesPorMes.slice(0, mesesVisibles);
  const hayMasMeses = comisionesPorMes.length > mesesVisibles;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Desglose Mensual de Comisiones
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Comisiones agrupadas por mes según su estado
          </p>
        </div>
        <Calendar className="h-6 w-6 text-gray-400" />
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código o proyecto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Filtro Estado */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente_inicial">Pendiente Inicial</option>
            <option value="disponible">Disponible</option>
            <option value="pagada">Pagada</option>
          </select>
        </div>

        {/* Filtro Año */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={filtroAnio}
            onChange={(e) => setFiltroAnio(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
          >
            <option value="todos">Todos los años</option>
            {aniosDisponibles.map(anio => (
              <option key={anio} value={anio}>{anio}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Accordions por mes */}
      {mesesAMostrar.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay comisiones para mostrar</p>
          <p className="text-sm text-gray-400 mt-1">
            Intenta ajustar los filtros
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {mesesAMostrar.map((grupo) => {
            const isExpanded = mesesExpandidos.has(grupo.monthKey);

            return (
              <div
                key={grupo.monthKey}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleMes(grupo.monthKey)}
                  className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    )}
                    <div className="text-left">
                      <h4 className="text-base font-semibold text-gray-900">
                        {grupo.monthLabel}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {grupo.comisiones.length} {grupo.comisiones.length === 1 ? 'comisión' : 'comisiones'} • Total: {formatMonto(grupo.totalMonto)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {grupo.countPendiente > 0 && (
                      <div className="text-xs">
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                          🟡 Pendiente: {grupo.countPendiente} ({formatMonto(grupo.montoPendiente)})
                        </span>
                      </div>
                    )}
                    {grupo.countDisponible > 0 && (
                      <div className="text-xs">
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                          🟢 Disponible: {grupo.countDisponible} ({formatMonto(grupo.montoDisponible)})
                        </span>
                      </div>
                    )}
                    {grupo.countPagada > 0 && (
                      <div className="text-xs">
                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">
                          🟣 Pagada: {grupo.countPagada} ({formatMonto(grupo.montoPagada)})
                        </span>
                      </div>
                    )}
                  </div>
                </button>

                {/* Accordion Body (tabla detallada) */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Código Local
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Proyecto
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Monto Venta
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fase
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            % Com.
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Monto Comisión
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha Procesado
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha Disponible
                          </th>
                          {isAdmin && (
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Acciones
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {grupo.comisiones.map((comision) => (
                          <tr key={comision.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {comision.local_codigo || 'N/A'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {comision.proyecto_nombre || 'N/A'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                              {formatMonto(comision.monto_venta)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              {getFaseBadge(comision.fase)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                              {comision.porcentaje_comision.toFixed(2)}%
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-green-600">
                              {formatMonto(comision.monto_comision)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                              {getEstadoBadge(comision.estado)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {formatFecha(comision.fecha_procesado)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {formatFecha(comision.fecha_disponible)}
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                {comision.estado === 'disponible' && (
                                  <div className="relative">
                                    <button
                                      onClick={() => setOpenDropdown(openDropdown === comision.id ? null : comision.id)}
                                      disabled={loadingId === comision.id}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs"
                                    >
                                      {loadingId === comision.id ? (
                                        'Procesando...'
                                      ) : (
                                        <>
                                          Marcar Pagada
                                          <ChevronDown className="h-3 w-3" />
                                        </>
                                      )}
                                    </button>

                                    {openDropdown === comision.id && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-10"
                                          onClick={() => setOpenDropdown(null)}
                                        />
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                                          <button
                                            onClick={() => handleMarcarPagada(comision.id)}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                          >
                                            <Check className="h-4 w-4 text-green-600" />
                                            Confirmar Pago
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )}
                                {comision.estado === 'pagada' && (
                                  <span className="text-xs text-gray-400">
                                    {comision.fecha_pago_comision ? formatFecha(comision.fecha_pago_comision) : 'Pagada'}
                                  </span>
                                )}
                                {comision.estado === 'pendiente_inicial' && (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Botón Cargar Más */}
      {hayMasMeses && (
        <div className="mt-6 text-center">
          <button
            onClick={handleCargarMas}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Cargar 6 meses más antiguos
          </button>
        </div>
      )}
    </div>
  );
}
