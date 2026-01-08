// ============================================================================
// COMPONENT: ReunionesTable
// ============================================================================
// Descripcion: Tabla de reuniones con filtros servidor y paginación
// Features: Click para navegar a detalle, badges de estado, paginación servidor
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Video,
  Calendar,
  Clock,
  Loader2 as LoaderIcon,
  ListChecks,
  Search,
} from 'lucide-react';
import { ReunionListItem, ReunionEstado, PaginationMetadata } from '@/types/reuniones';
import ReunionEstadoBadge from './ReunionEstadoBadge';
import ReunionFiltros from './ReunionFiltros';
import ReunionPagination from './ReunionPagination';

// Reuniones son GLOBALES - no dependen del proyecto seleccionado
export default function ReunionesTable() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reuniones, setReuniones] = useState<ReunionListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtros
  const [page, setPage] = useState(1);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<ReunionEstado | 'todos'>('todos');

  // Fetch reuniones desde API
  const fetchReuniones = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
    });

    if (fechaDesde) params.append('fecha_desde', fechaDesde);
    if (fechaHasta) params.append('fecha_hasta', fechaHasta);
    if (estadoFiltro !== 'todos') params.append('estado', estadoFiltro);

    try {
      const response = await fetch(`/api/reuniones?${params}`);
      const data = await response.json();

      if (data.success) {
        let filteredReuniones = data.reuniones;

        // Filtrar por búsqueda localmente (para UX rápida)
        if (searchTerm) {
          filteredReuniones = filteredReuniones.filter((r: ReunionListItem) =>
            r.titulo.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        setReuniones(filteredReuniones);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching reuniones:', error);
    } finally {
      setLoading(false);
    }
  }, [page, fechaDesde, fechaHasta, estadoFiltro, searchTerm]);

  // Cargar datos cuando cambian filtros
  useEffect(() => {
    fetchReuniones();
  }, [fetchReuniones]);

  // Reset página cuando cambian filtros
  useEffect(() => {
    setPage(1);
  }, [fechaDesde, fechaHasta, estadoFiltro]);

  // Limpiar filtros
  const handleLimpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setEstadoFiltro('todos');
    setSearchTerm('');
    setPage(1);
  };

  // Formatear duración
  const formatDuracion = (segundos: number | null) => {
    if (!segundos) return 'N/A';
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Formatear fecha
  const formatFecha = (fecha: string | null) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header con título y búsqueda */}
      <div className="px-4 sm:px-6 py-4 border-b bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Video className="w-5 h-5" />
            Reuniones Registradas {pagination && `(${pagination.total})`}
          </h2>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b">
        <ReunionFiltros
          fechaDesde={fechaDesde}
          fechaHasta={fechaHasta}
          estado={estadoFiltro}
          onFechaDesdeChange={setFechaDesde}
          onFechaHastaChange={setFechaHasta}
          onEstadoChange={setEstadoFiltro}
          onLimpiar={handleLimpiarFiltros}
          loading={loading}
        />
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-8">
          <div className="flex items-center justify-center gap-3 text-gray-500">
            <LoaderIcon className="w-6 h-6 animate-spin" />
            <span>Cargando reuniones...</span>
          </div>
        </div>
      ) : reuniones.length === 0 ? (
        <div className="p-8 sm:p-12 text-center">
          <Video className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-600 mb-2">
            No hay reuniones
          </h3>
          <p className="text-sm text-gray-500">
            {fechaDesde || fechaHasta || estadoFiltro !== 'todos' || searchTerm
              ? 'No se encontraron reuniones con los filtros aplicados'
              : 'Sube tu primera reunión para comenzar'}
          </p>
        </div>
      ) : (
        <>
          {/* Vista Mobile: Cards */}
          <div className="block md:hidden divide-y divide-gray-200">
            {reuniones.map((reunion) => (
              <div
                key={reunion.id}
                onClick={() => router.push(`/reuniones/${reunion.id}`)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors active:bg-gray-100"
              >
                {/* Header del card */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-[#1b967a]/10 rounded-lg flex-shrink-0">
                    <Video className="w-5 h-5 text-[#1b967a]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                      {reunion.titulo}
                    </h3>
                    <div className="mt-1">
                      <ReunionEstadoBadge estado={reunion.estado} />
                    </div>
                  </div>
                </div>
                {/* Metadata del card */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatFecha(reunion.fecha_reunion)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDuracion(reunion.duracion_segundos)}</span>
                  </div>
                  {reunion.action_items_count > 0 && (
                    <div className="flex items-center gap-1">
                      <ListChecks className="w-3.5 h-3.5" />
                      <span>{reunion.action_items_count} tarea(s)</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Vista Desktop: Tabla */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reunión
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duración
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action Items
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reuniones.map((reunion) => (
                  <tr
                    key={reunion.id}
                    onClick={() => router.push(`/reuniones/${reunion.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#1b967a]/10 rounded-lg">
                          <Video className="w-5 h-5 text-[#1b967a]" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {reunion.titulo}
                          </div>
                          {reunion.participantes_count > 0 && (
                            <div className="text-xs text-gray-500">
                              {reunion.participantes_count} participante(s)
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatFecha(reunion.fecha_reunion)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {formatDuracion(reunion.duracion_segundos)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <ReunionEstadoBadge estado={reunion.estado} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <ListChecks className="w-4 h-4 text-gray-400" />
                        <span>
                          {reunion.action_items_count > 0
                            ? `${reunion.action_items_count} tarea(s)`
                            : 'Sin tareas'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {pagination && pagination.totalPages > 1 && (
            <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t">
              <ReunionPagination
                pagination={pagination}
                onPageChange={setPage}
                loading={loading}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
