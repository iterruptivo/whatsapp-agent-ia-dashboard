'use client';

import { FileText, User } from 'lucide-react';
import type { TerrenoCreateInput, TerrenoPropiedad } from '@/lib/types/expansion';
import { TIPO_PROPIEDAD_LABELS } from '@/lib/types/expansion';

interface PasoDocumentacionProps {
  datos: Partial<TerrenoCreateInput>;
  actualizarDatos: (datos: Partial<TerrenoCreateInput>) => void;
  errores: Record<string, string>;
}

export default function PasoDocumentacion({
  datos,
  actualizarDatos,
  errores,
}: PasoDocumentacionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-6 h-6 text-[#1b967a]" />
        <h2 className="text-[#192c4d] text-2xl font-bold">Documentación Legal</h2>
      </div>

      {/* Tipo de Propiedad */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Propiedad
        </label>
        <select
          value={datos.tipo_propiedad || ''}
          onChange={(e) =>
            actualizarDatos({ tipo_propiedad: e.target.value as TerrenoPropiedad })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
        >
          <option value="">Seleccione...</option>
          {Object.entries(TIPO_PROPIEDAD_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Partida Registral */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Partida Registral
        </label>
        <input
          type="text"
          value={datos.partida_registral || ''}
          onChange={(e) => actualizarDatos({ partida_registral: e.target.value })}
          placeholder="Ej: 12345678"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">Número de partida en SUNARP (si aplica)</p>
      </div>

      {/* Cargas y Gravámenes */}
      <div className="border border-gray-300 rounded-lg p-4">
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={datos.tiene_cargas || false}
            onChange={(e) => actualizarDatos({ tiene_cargas: e.target.checked })}
            className="w-5 h-5 text-[#1b967a] rounded focus:ring-[#1b967a]"
          />
          <span className="text-sm font-medium text-gray-700">
            El terreno tiene cargas o gravámenes
          </span>
        </label>

        {datos.tiene_cargas && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción de Cargas
            </label>
            <textarea
              value={datos.descripcion_cargas || ''}
              onChange={(e) => actualizarDatos({ descripcion_cargas: e.target.value })}
              rows={3}
              placeholder="Describa las cargas, gravámenes, hipotecas o limitaciones..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent resize-none"
            />
          </div>
        )}
      </div>

      {/* Datos del Propietario */}
      <div className="border-t pt-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-[#192c4d]" />
          <h3 className="text-[#192c4d] text-xl font-semibold">Datos del Propietario</h3>
        </div>

        {/* Checkbox "Soy el propietario" */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer p-3 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors">
            <input
              type="checkbox"
              checked={datos.propietario_es_corredor || false}
              onChange={(e) =>
                actualizarDatos({ propietario_es_corredor: e.target.checked })
              }
              className="w-5 h-5 text-[#1b967a] rounded focus:ring-[#1b967a]"
            />
            <span className="text-sm font-medium text-blue-900">Soy el propietario</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nombre del Propietario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Propietario
            </label>
            <input
              type="text"
              value={datos.propietario_nombre || ''}
              onChange={(e) => actualizarDatos({ propietario_nombre: e.target.value })}
              placeholder="Juan Pérez García"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
            />
          </div>

          {/* DNI */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DNI del Propietario
            </label>
            <input
              type="text"
              value={datos.propietario_dni || ''}
              onChange={(e) => actualizarDatos({ propietario_dni: e.target.value })}
              placeholder="12345678"
              maxLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono del Propietario
            </label>
            <input
              type="tel"
              value={datos.propietario_telefono || ''}
              onChange={(e) => actualizarDatos({ propietario_telefono: e.target.value })}
              placeholder="987654321"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
