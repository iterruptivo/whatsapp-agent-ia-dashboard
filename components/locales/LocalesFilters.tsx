// ============================================================================
// COMPONENT: LocalesFilters
// ============================================================================
// Descripción: Filtros para tabla de locales (proyecto, estado, metraje)
// ============================================================================

'use client';

import type { Proyecto } from '@/lib/db';
import { X } from 'lucide-react';

interface LocalesFiltersProps {
  proyectos: Proyecto[];
  proyectoFilter: string;
  estadoFilter: string;
  metrajeMin: number | undefined;
  metrajeMax: number | undefined;
  onProyectoChange: (value: string) => void;
  onEstadoChange: (value: string) => void;
  onMetrajeMinChange: (value: number | undefined) => void;
  onMetrajeMaxChange: (value: number | undefined) => void;
  onClearFilters: () => void;
}

export default function LocalesFilters({
  proyectos,
  proyectoFilter,
  estadoFilter,
  metrajeMin,
  metrajeMax,
  onProyectoChange,
  onEstadoChange,
  onMetrajeMinChange,
  onMetrajeMaxChange,
  onClearFilters,
}: LocalesFiltersProps) {
  const hasActiveFilters =
    proyectoFilter || estadoFilter || metrajeMin !== undefined || metrajeMax !== undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Filtro Proyecto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Proyecto
        </label>
        <select
          value={proyectoFilter}
          onChange={(e) => onProyectoChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Todos los proyectos</option>
          {proyectos.map((proyecto) => (
            <option key={proyecto.id} value={proyecto.id}>
              {proyecto.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro Estado */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Estado
        </label>
        <select
          value={estadoFilter}
          onChange={(e) => onEstadoChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Todos los estados</option>
          <option value="verde">🟢 Libre</option>
          <option value="amarillo">🟡 Negociando</option>
          <option value="naranja">🟠 Confirmado</option>
          <option value="rojo">🔴 Vendido</option>
        </select>
      </div>

      {/* Filtro Metraje Mín */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Metraje Mín (m²)
        </label>
        <input
          type="number"
          step="0.5"
          min="0"
          value={metrajeMin || ''}
          onChange={(e) =>
            onMetrajeMinChange(e.target.value ? parseFloat(e.target.value) : undefined)
          }
          placeholder="Ej: 4.0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Filtro Metraje Máx */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Metraje Máx (m²)
        </label>
        <input
          type="number"
          step="0.5"
          min="0"
          value={metrajeMax || ''}
          onChange={(e) =>
            onMetrajeMaxChange(e.target.value ? parseFloat(e.target.value) : undefined)
          }
          placeholder="Ej: 10.0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      {/* Botón Limpiar Filtros */}
      {hasActiveFilters && (
        <div className="md:col-span-2 lg:col-span-4">
          <button
            onClick={onClearFilters}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
