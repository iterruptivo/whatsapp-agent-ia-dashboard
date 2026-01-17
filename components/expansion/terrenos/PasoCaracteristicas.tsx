'use client';

import { Ruler, Droplet, Zap, Wifi, Home } from 'lucide-react';
import type { TerrenoCreateInput, TerrenoTipo } from '@/lib/types/expansion';
import { TIPO_TERRENO_LABELS } from '@/lib/types/expansion';

interface PasoCaracteristicasProps {
  datos: Partial<TerrenoCreateInput>;
  actualizarDatos: (datos: Partial<TerrenoCreateInput>) => void;
  errores: Record<string, string>;
}

export default function PasoCaracteristicas({
  datos,
  actualizarDatos,
  errores,
}: PasoCaracteristicasProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Ruler className="w-6 h-6 text-[#1b967a]" />
        <h2 className="text-[#192c4d] text-2xl font-bold">Características del Terreno</h2>
      </div>

      {/* Áreas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Área Total (m²) *
          </label>
          <input
            type="number"
            value={datos.area_total_m2 || ''}
            onChange={(e) =>
              actualizarDatos({ area_total_m2: parseFloat(e.target.value) || 0 })
            }
            onWheel={(e) => e.currentTarget.blur()}
            min="0"
            step="0.01"
            placeholder="1000"
            className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent ${
              errores.area_total_m2 ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errores.area_total_m2 && (
            <p className="text-red-500 text-xs mt-1">{errores.area_total_m2}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Área Construida (m²)
          </label>
          <input
            type="number"
            value={datos.area_construida_m2 || ''}
            onChange={(e) =>
              actualizarDatos({ area_construida_m2: parseFloat(e.target.value) || 0 })
            }
            onWheel={(e) => e.currentTarget.blur()}
            min="0"
            step="0.01"
            placeholder="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Solo si hay construcciones en el terreno
          </p>
        </div>
      </div>

      {/* Medidas lineales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frente (metros lineales)
          </label>
          <input
            type="number"
            value={datos.frente_ml || ''}
            onChange={(e) =>
              actualizarDatos({ frente_ml: parseFloat(e.target.value) || undefined })
            }
            onWheel={(e) => e.currentTarget.blur()}
            min="0"
            step="0.01"
            placeholder="20"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fondo (metros lineales)
          </label>
          <input
            type="number"
            value={datos.fondo_ml || ''}
            onChange={(e) =>
              actualizarDatos({ fondo_ml: parseFloat(e.target.value) || undefined })
            }
            onWheel={(e) => e.currentTarget.blur()}
            min="0"
            step="0.01"
            placeholder="50"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
          />
        </div>
      </div>

      {/* Tipo de terreno */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Terreno *
        </label>
        <select
          value={datos.tipo_terreno || 'urbano'}
          onChange={(e) => actualizarDatos({ tipo_terreno: e.target.value as TerrenoTipo })}
          className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent ${
            errores.tipo_terreno ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          {Object.entries(TIPO_TERRENO_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errores.tipo_terreno && (
          <p className="text-red-500 text-xs mt-1">{errores.tipo_terreno}</p>
        )}
      </div>

      {/* Zonificación y Uso */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zonificación
          </label>
          <input
            type="text"
            value={datos.zonificacion || ''}
            onChange={(e) => actualizarDatos({ zonificacion: e.target.value })}
            placeholder="Ej: RDM, Comercial, Industrial"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Según plano de zonificación municipal</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Uso Actual</label>
          <input
            type="text"
            value={datos.uso_actual || ''}
            onChange={(e) => actualizarDatos({ uso_actual: e.target.value })}
            placeholder="Ej: Baldío, Estacionamiento, Cultivo"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
          />
        </div>
      </div>

      {/* Servicios disponibles */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Servicios Disponibles
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Agua */}
          <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={datos.tiene_agua || false}
              onChange={(e) => actualizarDatos({ tiene_agua: e.target.checked })}
              className="w-5 h-5 text-[#1b967a] rounded focus:ring-[#1b967a]"
            />
            <Droplet className="w-5 h-5 text-blue-500" />
            <span className="text-gray-700">Agua</span>
          </label>

          {/* Luz */}
          <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={datos.tiene_luz || false}
              onChange={(e) => actualizarDatos({ tiene_luz: e.target.checked })}
              className="w-5 h-5 text-[#1b967a] rounded focus:ring-[#1b967a]"
            />
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="text-gray-700">Electricidad</span>
          </label>

          {/* Desagüe */}
          <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={datos.tiene_desague || false}
              onChange={(e) => actualizarDatos({ tiene_desague: e.target.checked })}
              className="w-5 h-5 text-[#1b967a] rounded focus:ring-[#1b967a]"
            />
            <Home className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700">Desagüe</span>
          </label>

          {/* Internet */}
          <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={datos.tiene_internet || false}
              onChange={(e) => actualizarDatos({ tiene_internet: e.target.checked })}
              className="w-5 h-5 text-[#1b967a] rounded focus:ring-[#1b967a]"
            />
            <Wifi className="w-5 h-5 text-purple-500" />
            <span className="text-gray-700">Internet/Fibra</span>
          </label>

          {/* Acceso Pavimentado */}
          <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-md hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={datos.acceso_pavimentado || false}
              onChange={(e) => actualizarDatos({ acceso_pavimentado: e.target.checked })}
              className="w-5 h-5 text-[#1b967a] rounded focus:ring-[#1b967a]"
            />
            <div className="w-5 h-5 bg-gray-400 rounded" />
            <span className="text-gray-700">Acceso Pavimentado</span>
          </label>
        </div>
      </div>
    </div>
  );
}
