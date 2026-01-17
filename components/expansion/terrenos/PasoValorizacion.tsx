'use client';

import { DollarSign } from 'lucide-react';
import type { TerrenoCreateInput, TerrenoMoneda, TerrenoUrgencia } from '@/lib/types/expansion';
import { URGENCIA_LABELS } from '@/lib/types/expansion';

interface PasoValorizacionProps {
  datos: Partial<TerrenoCreateInput>;
  actualizarDatos: (datos: Partial<TerrenoCreateInput>) => void;
  errores: Record<string, string>;
}

export default function PasoValorizacion({
  datos,
  actualizarDatos,
  errores,
}: PasoValorizacionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-6 h-6 text-[#1b967a]" />
        <h2 className="text-[#192c4d] text-2xl font-bold">Valorización</h2>
      </div>

      {/* Precio Solicitado y Moneda */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Precio Solicitado
          </label>
          <input
            type="number"
            value={datos.precio_solicitado || ''}
            onChange={(e) =>
              actualizarDatos({ precio_solicitado: parseFloat(e.target.value) || undefined })
            }
            onWheel={(e) => e.currentTarget.blur()}
            min="0"
            step="1000"
            placeholder="500000"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Moneda *</label>
          <select
            value={datos.moneda || 'USD'}
            onChange={(e) => actualizarDatos({ moneda: e.target.value as TerrenoMoneda })}
            className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent ${
              errores.moneda ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="USD">USD ($)</option>
            <option value="PEN">PEN (S/)</option>
          </select>
          {errores.moneda && <p className="text-red-500 text-xs mt-1">{errores.moneda}</p>}
        </div>
      </div>

      {/* Precio Negociable */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer p-3 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors">
          <input
            type="checkbox"
            checked={datos.precio_negociable ?? true}
            onChange={(e) => actualizarDatos({ precio_negociable: e.target.checked })}
            className="w-5 h-5 text-[#1b967a] rounded focus:ring-[#1b967a]"
          />
          <span className="text-sm font-medium text-green-900">Precio Negociable</span>
        </label>
      </div>

      {/* Tasación Referencial */}
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Tasación Referencial (Opcional)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor de Tasación ({datos.moneda || 'USD'})
            </label>
            <input
              type="number"
              value={datos.tasacion_referencial || ''}
              onChange={(e) =>
                actualizarDatos({
                  tasacion_referencial: parseFloat(e.target.value) || undefined,
                })
              }
              onWheel={(e) => e.currentTarget.blur()}
              min="0"
              step="1000"
              placeholder="480000"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fuente de Tasación
            </label>
            <input
              type="text"
              value={datos.fuente_tasacion || ''}
              onChange={(e) => actualizarDatos({ fuente_tasacion: e.target.value })}
              placeholder="Ej: BBVA Peritas, Colliers"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Si cuenta con una tasación profesional, indique el valor y la empresa tasadora
        </p>
      </div>

      {/* Urgencia de Venta */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Urgencia de Venta
        </label>
        <select
          value={datos.urgencia_venta || ''}
          onChange={(e) =>
            actualizarDatos({ urgencia_venta: e.target.value as TerrenoUrgencia })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
        >
          <option value="">Seleccione...</option>
          {Object.entries(URGENCIA_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Indicador de Precio por m² */}
      {datos.precio_solicitado && datos.area_total_m2 && datos.area_total_m2 > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">Precio por m²:</span>
            <span className="text-lg font-bold text-blue-700">
              {datos.moneda === 'USD' ? '$' : 'S/'}
              {(datos.precio_solicitado / datos.area_total_m2).toFixed(2)} / m²
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
