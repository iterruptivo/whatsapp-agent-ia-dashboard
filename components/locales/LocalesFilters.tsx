// ============================================================================
// COMPONENT: LocalesFilters
// ============================================================================
// Descripción: Filtros para tabla de locales (proyecto, estado, metraje)
// Estado con multiselect y checkboxes
// ============================================================================

'use client';

import type { Proyecto } from '@/lib/db';
import { X } from 'lucide-react';

interface LocalesFiltersProps {
  proyectos: Proyecto[];
  proyectoFilter: string;
  estadosFilter: string[]; // Ahora es array
  metrajeMin: number | undefined;
  metrajeMax: number | undefined;
  defaultProyectoId?: string; // Proyecto del login para comparar default
  selectedProyectoNombre?: string; // SESIÓN 55: Nombre del proyecto seleccionado en login
  pisosDisponibles?: string[];
  pisoFilter?: string;
  onProyectoChange: (value: string) => void;
  onEstadosChange: (estados: string[]) => void; // Ahora recibe array
  onMetrajeMinChange: (value: number | undefined) => void;
  onMetrajeMaxChange: (value: number | undefined) => void;
  onPisoChange?: (piso: string) => void;
  onClearFilters: () => void;
}

export default function LocalesFilters({
  proyectos,
  proyectoFilter,
  estadosFilter,
  metrajeMin,
  metrajeMax,
  defaultProyectoId,
  selectedProyectoNombre,
  pisosDisponibles,
  pisoFilter,
  onProyectoChange,
  onEstadosChange,
  onMetrajeMinChange,
  onMetrajeMaxChange,
  onPisoChange,
  onClearFilters,
}: LocalesFiltersProps) {
  // Defaults: verde, amarillo, naranja
  const defaults = ['verde', 'amarillo', 'naranja'];

  // Verificar si está en estado default
  const isDefaultState =
    JSON.stringify([...estadosFilter].sort()) === JSON.stringify([...defaults].sort()) &&
    proyectoFilter === (defaultProyectoId || '') && // Comparar con proyecto del login
    metrajeMin === undefined &&
    metrajeMax === undefined;

  const hasActiveFilters = !isDefaultState;

  // Estados disponibles
  const estados = [
    { value: 'verde', label: '🟢 Libre', color: 'text-green-600' },
    { value: 'amarillo', label: '🟡 Negociando', color: 'text-yellow-600' },
    { value: 'naranja', label: '🟠 Confirmado', color: 'text-orange-600' },
    { value: 'rojo', label: '🔴 Vendido', color: 'text-red-600' },
  ];

  // Toggle estado
  const handleToggleEstado = (estado: string) => {
    if (estadosFilter.includes(estado)) {
      // Remover
      onEstadosChange(estadosFilter.filter((e) => e !== estado));
    } else {
      // Agregar
      onEstadosChange([...estadosFilter, estado]);
    }
  };

  return (
    <div className="space-y-3">
      {/* PRIMERA FILA: Solo Estados */}
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
          Estados:
        </label>
        <div className="flex flex-wrap gap-3">
          {estados.map((estado) => (
            <label
              key={estado.value}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={estadosFilter.includes(estado.value)}
                onChange={() => handleToggleEstado(estado.value)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className={`text-sm font-medium ${estado.color}`}>
                {estado.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* SEGUNDA FILA: Proyecto, Piso y Metrajes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* SESIÓN 55: Proyecto fijo (no editable) - mostrar nombre del proyecto seleccionado en login */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Proyecto
          </label>
          <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
            {selectedProyectoNombre || 'Cargando...'}
          </div>
        </div>

        {/* Filtro Piso - Solo si hay pisos disponibles */}
        {pisosDisponibles && pisosDisponibles.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Piso
            </label>
            <select
              value={pisoFilter || ''}
              onChange={(e) => onPisoChange?.(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">Todos los pisos</option>
              {pisosDisponibles.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}

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
            onWheel={(e) => e.currentTarget.blur()}
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
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="Ej: 10.0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Botón Limpiar Filtros - Solo si NO está en estado default */}
      {hasActiveFilters && (
        <div>
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
