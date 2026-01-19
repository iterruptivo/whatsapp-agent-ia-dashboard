// ============================================================================
// COMPONENT: PasoUbicacion (Wizard Step)
// ============================================================================
// Paso de ubicación del wizard de terrenos
// UX de clase mundial con:
// - UbigeoSelector (Combobox searchable con skeleton loading)
// - MapAddressSelector (Google Maps con marker arrastrable)
// ============================================================================

'use client';

import { MapPin } from 'lucide-react';
import type { TerrenoCreateInput } from '@/lib/types/expansion';
import UbigeoSelector from './UbigeoSelector';
import MapAddressSelector from './MapAddressSelector';

interface PasoUbicacionProps {
  datos: Partial<TerrenoCreateInput>;
  actualizarDatos: (datos: Partial<TerrenoCreateInput>) => void;
  errores: Record<string, string>;
}

export default function PasoUbicacion({ datos, actualizarDatos, errores }: PasoUbicacionProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#1b967a]/10 rounded-lg">
          <MapPin className="w-6 h-6 text-[#1b967a]" />
        </div>
        <div>
          <h2 className="text-[#192c4d] text-2xl font-bold">Ubicación del Terreno</h2>
          <p className="text-gray-500 text-sm mt-1">
            Selecciona la ubicación y dirección exacta del terreno
          </p>
        </div>
      </div>

      {/* Sección 1: Ubigeo (Departamento/Provincia/Distrito) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <UbigeoSelector
          departamento={datos.departamento || ''}
          provincia={datos.provincia || ''}
          distrito={datos.distrito || ''}
          onDepartamentoChange={(value) => actualizarDatos({ departamento: value })}
          onProvinciaChange={(value) => actualizarDatos({ provincia: value })}
          onDistritoChange={(value) => actualizarDatos({ distrito: value })}
          errores={{
            departamento: errores.departamento,
            provincia: errores.provincia,
            distrito: errores.distrito,
          }}
        />
      </div>

      {/* Sección 2: Dirección y Mapa */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-[#1b967a]" />
          <span className="text-sm font-medium text-gray-700">
            Dirección exacta
          </span>
        </div>

        <MapAddressSelector
          direccion={datos.direccion || ''}
          referencia={datos.referencia || ''}
          coordenadasLat={datos.coordenadas_lat}
          coordenadasLng={datos.coordenadas_lng}
          departamento={datos.departamento}
          provincia={datos.provincia}
          distrito={datos.distrito}
          onDireccionChange={(value) => actualizarDatos({ direccion: value })}
          onReferenciaChange={(value) => actualizarDatos({ referencia: value })}
          onCoordenadasChange={(lat, lng) => actualizarDatos({
            coordenadas_lat: lat,
            coordenadas_lng: lng,
          })}
          errores={{
            direccion: errores.direccion,
          }}
        />
      </div>

      {/* Tip de ayuda */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Consejos para una buena ubicación
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Asegúrate de seleccionar el departamento, provincia y distrito correctos</li>
          <li>• Usa el mapa para ubicar exactamente el terreno arrastrando el marcador</li>
          <li>• Agrega referencias claras para facilitar la visita al terreno</li>
          <li>• Verifica que la dirección coincida con la ubicación en el mapa</li>
        </ul>
      </div>
    </div>
  );
}
