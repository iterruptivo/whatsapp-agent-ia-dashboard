'use client';

import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import type { TerrenoCreateInput } from '@/lib/types/expansion';
import { getDepartamentos, getProvincias, getDistritos } from '@/lib/actions-expansion';

interface PasoUbicacionProps {
  datos: Partial<TerrenoCreateInput>;
  actualizarDatos: (datos: Partial<TerrenoCreateInput>) => void;
  errores: Record<string, string>;
}

export default function PasoUbicacion({ datos, actualizarDatos, errores }: PasoUbicacionProps) {
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [provincias, setProvincias] = useState<any[]>([]);
  const [distritos, setDistritos] = useState<any[]>([]);
  const [cargandoDepartamentos, setCargandoDepartamentos] = useState(true);
  const [cargandoProvincias, setCargandoProvincias] = useState(false);
  const [cargandoDistritos, setCargandoDistritos] = useState(false);

  // Cargar departamentos al montar
  useEffect(() => {
    const cargar = async () => {
      setCargandoDepartamentos(true);
      const result = await getDepartamentos();
      if (result.success) {
        setDepartamentos(result.data || []);
      }
      setCargandoDepartamentos(false);
    };
    cargar();
  }, []);

  // Cargar provincias cuando cambia departamento
  useEffect(() => {
    const departamento = datos.departamento;
    if (departamento) {
      const cargar = async () => {
        setCargandoProvincias(true);
        setProvincias([]);
        setDistritos([]);
        actualizarDatos({ provincia: '', distrito: '' });

        const result = await getProvincias(departamento);
        if (result.success) {
          setProvincias(result.data || []);
        }
        setCargandoProvincias(false);
      };
      cargar();
    } else {
      setProvincias([]);
      setDistritos([]);
    }
  }, [datos.departamento]);

  // Cargar distritos cuando cambia provincia
  useEffect(() => {
    const departamento = datos.departamento;
    const provincia = datos.provincia;
    if (departamento && provincia) {
      const cargar = async () => {
        setCargandoDistritos(true);
        setDistritos([]);
        actualizarDatos({ distrito: '' });

        const result = await getDistritos(departamento, provincia);
        if (result.success) {
          setDistritos(result.data || []);
        }
        setCargandoDistritos(false);
      };
      cargar();
    } else {
      setDistritos([]);
    }
  }, [datos.departamento, datos.provincia]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-6 h-6 text-[#1b967a]" />
        <h2 className="text-[#192c4d] text-2xl font-bold">Ubicación del Terreno</h2>
      </div>

      {/* Selects Cascada */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Departamento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Departamento *
          </label>
          <select
            value={datos.departamento || ''}
            onChange={(e) => actualizarDatos({ departamento: e.target.value })}
            className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent ${
              errores.departamento ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={cargandoDepartamentos}
          >
            <option value="">Seleccione...</option>
            {departamentos.map((dep) => (
              <option key={dep.id} value={dep.departamento}>
                {dep.departamento}
              </option>
            ))}
          </select>
          {errores.departamento && (
            <p className="text-red-500 text-xs mt-1">{errores.departamento}</p>
          )}
        </div>

        {/* Provincia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Provincia *
          </label>
          <select
            value={datos.provincia || ''}
            onChange={(e) => actualizarDatos({ provincia: e.target.value })}
            className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent ${
              errores.provincia ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={!datos.departamento || cargandoProvincias}
          >
            <option value="">Seleccione...</option>
            {provincias.map((prov) => (
              <option key={prov.id} value={prov.provincia}>
                {prov.provincia}
              </option>
            ))}
          </select>
          {errores.provincia && (
            <p className="text-red-500 text-xs mt-1">{errores.provincia}</p>
          )}
        </div>

        {/* Distrito */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Distrito *
          </label>
          <select
            value={datos.distrito || ''}
            onChange={(e) => actualizarDatos({ distrito: e.target.value })}
            className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent ${
              errores.distrito ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={!datos.provincia || cargandoDistritos}
          >
            <option value="">Seleccione...</option>
            {distritos.map((dist) => (
              <option key={dist.id} value={dist.distrito}>
                {dist.distrito}
              </option>
            ))}
          </select>
          {errores.distrito && (
            <p className="text-red-500 text-xs mt-1">{errores.distrito}</p>
          )}
        </div>
      </div>

      {/* Dirección */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dirección *
        </label>
        <input
          type="text"
          value={datos.direccion || ''}
          onChange={(e) => actualizarDatos({ direccion: e.target.value })}
          placeholder="Ej: Av. Paseo de la República 3245"
          className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent ${
            errores.direccion ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errores.direccion && (
          <p className="text-red-500 text-xs mt-1">{errores.direccion}</p>
        )}
      </div>

      {/* Referencia */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Referencia
        </label>
        <input
          type="text"
          value={datos.referencia || ''}
          onChange={(e) => actualizarDatos({ referencia: e.target.value })}
          placeholder="Ej: Frente al colegio Santa María"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
        />
      </div>

      {/* Coordenadas (opcional - placeholder) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Latitud (Opcional)
          </label>
          <input
            type="number"
            step="any"
            value={datos.coordenadas_lat || ''}
            onChange={(e) =>
              actualizarDatos({ coordenadas_lat: parseFloat(e.target.value) || undefined })
            }
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="-12.0464"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Longitud (Opcional)
          </label>
          <input
            type="number"
            step="any"
            value={datos.coordenadas_lng || ''}
            onChange={(e) =>
              actualizarDatos({ coordenadas_lng: parseFloat(e.target.value) || undefined })
            }
            onWheel={(e) => e.currentTarget.blur()}
            placeholder="-77.0428"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
          />
        </div>
      </div>

      {/* Placeholder para Mapa */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">Mapa interactivo (próximamente)</p>
        <p className="text-xs text-gray-400 mt-1">
          Podrá seleccionar la ubicación exacta arrastrando un pin en el mapa
        </p>
      </div>
    </div>
  );
}
