'use client';

import { Filter, X } from 'lucide-react';
import { ReunionEstado } from '@/types/reuniones';

interface ReunionFiltrosProps {
  fechaDesde: string;
  fechaHasta: string;
  estado: ReunionEstado | 'todos';
  onFechaDesdeChange: (fecha: string) => void;
  onFechaHastaChange: (fecha: string) => void;
  onEstadoChange: (estado: ReunionEstado | 'todos') => void;
  onLimpiar: () => void;
  loading?: boolean;
}

export default function ReunionFiltros({
  fechaDesde,
  fechaHasta,
  estado,
  onFechaDesdeChange,
  onFechaHastaChange,
  onEstadoChange,
  onLimpiar,
  loading = false,
}: ReunionFiltrosProps) {
  const tienesFiltrosActivos =
    fechaDesde !== '' || fechaHasta !== '' || estado !== 'todos';

  return (
    <div>
      {/* Filtros Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Fecha Desde */}
        <div>
          <label
            htmlFor="fecha-desde"
            className="block text-sm font-medium text-[#192c4d] mb-1"
          >
            Fecha Desde
          </label>
          <input
            id="fecha-desde"
            type="date"
            value={fechaDesde}
            onChange={(e) => onFechaDesdeChange(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          />
        </div>

        {/* Fecha Hasta */}
        <div>
          <label
            htmlFor="fecha-hasta"
            className="block text-sm font-medium text-[#192c4d] mb-1"
          >
            Fecha Hasta
          </label>
          <input
            id="fecha-hasta"
            type="date"
            value={fechaHasta}
            onChange={(e) => onFechaHastaChange(e.target.value)}
            disabled={loading}
            min={fechaDesde || undefined}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          />
        </div>

        {/* Estado */}
        <div>
          <label
            htmlFor="estado"
            className="block text-sm font-medium text-[#192c4d] mb-1"
          >
            Estado
          </label>
          <select
            id="estado"
            value={estado}
            onChange={(e) =>
              onEstadoChange(e.target.value as ReunionEstado | 'todos')
            }
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          >
            <option value="todos">Todos</option>
            <option value="subiendo">Subiendo</option>
            <option value="procesando">Procesando</option>
            <option value="completado">Completado</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Botón Limpiar */}
        {tienesFiltrosActivos && (
          <div className="flex items-end">
            <button
              onClick={onLimpiar}
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-[#1b967a] border border-gray-300 rounded-md hover:border-[#1b967a] transition-colors disabled:opacity-50"
              title="Limpiar filtros"
            >
              <X className="w-4 h-4" />
              <span>Limpiar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
