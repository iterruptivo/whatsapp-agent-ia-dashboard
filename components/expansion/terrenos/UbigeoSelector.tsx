// ============================================================================
// COMPONENT: UbigeoSelector
// ============================================================================
// Selector de ubicación Perú (Departamento/Provincia/Distrito)
// UX de clase mundial con:
// - Combobox searchable (no dropdowns tradicionales)
// - Skeleton loading states
// - Cascada inteligente con feedback visual
// - CACHÉ EN MEMORIA para evitar llamadas repetidas al servidor
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import ComboboxFilter from '@/components/ui/ComboboxFilter';
import { getDepartamentos, getProvincias, getDistritos } from '@/lib/actions-expansion';

interface UbigeoSelectorProps {
  departamento: string;
  provincia: string;
  distrito: string;
  onDepartamentoChange: (value: string) => void;
  onProvinciaChange: (value: string) => void;
  onDistritoChange: (value: string) => void;
  errores?: {
    departamento?: string;
    provincia?: string;
    distrito?: string;
  };
}

interface UbigeoOption {
  value: string;
  label: string;
}

// ============================================================================
// CACHÉ EN MEMORIA - Persiste durante la sesión del navegador
// ============================================================================
const ubigeoCache = {
  departamentos: null as UbigeoOption[] | null,
  provincias: new Map<string, UbigeoOption[]>(),
  distritos: new Map<string, UbigeoOption[]>(),
};

// Skeleton loading component
function SkeletonCombobox({ label }: { label: string }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} *
      </label>
      <div className="relative">
        <div className="w-full h-[42px] bg-gray-100 rounded-lg animate-pulse flex items-center px-4">
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin mr-2" />
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    </div>
  );
}

export default function UbigeoSelector({
  departamento,
  provincia,
  distrito,
  onDepartamentoChange,
  onProvinciaChange,
  onDistritoChange,
  errores = {},
}: UbigeoSelectorProps) {
  // Estados de datos - inicializar desde caché si existe
  const [departamentos, setDepartamentos] = useState<UbigeoOption[]>(
    () => ubigeoCache.departamentos || []
  );
  const [provincias, setProvincias] = useState<UbigeoOption[]>(
    () => departamento ? (ubigeoCache.provincias.get(departamento) || []) : []
  );
  const [distritos, setDistritos] = useState<UbigeoOption[]>(
    () => (departamento && provincia) ? (ubigeoCache.distritos.get(`${departamento}|${provincia}`) || []) : []
  );

  // Estados de carga - no mostrar loading si ya hay caché
  const [cargandoDepartamentos, setCargandoDepartamentos] = useState(
    () => !ubigeoCache.departamentos
  );
  const [cargandoProvincias, setCargandoProvincias] = useState(false);
  const [cargandoDistritos, setCargandoDistritos] = useState(false);

  // Cargar departamentos al montar (con caché)
  useEffect(() => {
    let mounted = true;

    const cargar = async () => {
      // Si ya está en caché, usar inmediatamente
      if (ubigeoCache.departamentos) {
        setDepartamentos(ubigeoCache.departamentos);
        setCargandoDepartamentos(false);
        return;
      }

      setCargandoDepartamentos(true);
      try {
        const result = await getDepartamentos();
        if (mounted && result.success && result.data) {
          const options = result.data.map((dep: any) => ({
            value: dep.departamento,
            label: dep.departamento,
          }));
          // Guardar en caché
          ubigeoCache.departamentos = options;
          setDepartamentos(options);
        }
      } catch (error) {
        console.error('[UbigeoSelector] Error cargando departamentos:', error);
      } finally {
        if (mounted) setCargandoDepartamentos(false);
      }
    };

    cargar();
    return () => { mounted = false; };
  }, []);

  // Cargar provincias cuando cambia departamento (con caché)
  useEffect(() => {
    let mounted = true;

    if (!departamento) {
      setProvincias([]);
      setDistritos([]);
      return;
    }

    const cargar = async () => {
      // Limpiar distritos al cambiar departamento
      setDistritos([]);

      // Si ya está en caché, usar inmediatamente
      const cacheKey = departamento;
      if (ubigeoCache.provincias.has(cacheKey)) {
        setProvincias(ubigeoCache.provincias.get(cacheKey)!);
        setCargandoProvincias(false);
        return;
      }

      setCargandoProvincias(true);
      setProvincias([]);

      try {
        const result = await getProvincias(departamento);
        if (mounted && result.success && result.data) {
          const options = result.data.map((prov: any) => ({
            value: prov.provincia,
            label: prov.provincia,
          }));
          // Guardar en caché
          ubigeoCache.provincias.set(cacheKey, options);
          setProvincias(options);
        }
      } catch (error) {
        console.error('[UbigeoSelector] Error cargando provincias:', error);
      } finally {
        if (mounted) setCargandoProvincias(false);
      }
    };

    cargar();
    return () => { mounted = false; };
  }, [departamento]);

  // Cargar distritos cuando cambia provincia (con caché)
  useEffect(() => {
    let mounted = true;

    if (!departamento || !provincia) {
      setDistritos([]);
      return;
    }

    const cargar = async () => {
      // Si ya está en caché, usar inmediatamente
      const cacheKey = `${departamento}|${provincia}`;
      if (ubigeoCache.distritos.has(cacheKey)) {
        setDistritos(ubigeoCache.distritos.get(cacheKey)!);
        setCargandoDistritos(false);
        return;
      }

      setCargandoDistritos(true);
      setDistritos([]);

      try {
        const result = await getDistritos(departamento, provincia);
        if (mounted && result.success && result.data) {
          const options = result.data.map((dist: any) => ({
            value: dist.distrito,
            label: dist.distrito,
          }));
          // Guardar en caché
          ubigeoCache.distritos.set(cacheKey, options);
          setDistritos(options);
        }
      } catch (error) {
        console.error('[UbigeoSelector] Error cargando distritos:', error);
      } finally {
        if (mounted) setCargandoDistritos(false);
      }
    };

    cargar();
    return () => { mounted = false; };
  }, [departamento, provincia]);

  // Handlers con limpieza de cascada
  const handleDepartamentoChange = useCallback((value: string) => {
    onDepartamentoChange(value);
    // Limpiar provincia y distrito cuando cambia departamento
    onProvinciaChange('');
    onDistritoChange('');
  }, [onDepartamentoChange, onProvinciaChange, onDistritoChange]);

  const handleProvinciaChange = useCallback((value: string) => {
    onProvinciaChange(value);
    // Limpiar distrito cuando cambia provincia
    onDistritoChange('');
  }, [onProvinciaChange, onDistritoChange]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-[#1b967a]" />
        <span className="text-sm font-medium text-gray-700">
          Selecciona la ubicación
        </span>
      </div>

      {/* Grid de selectores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Departamento */}
        {cargandoDepartamentos ? (
          <SkeletonCombobox label="Departamento" />
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Departamento *
            </label>
            <ComboboxFilter
              options={departamentos}
              value={departamento}
              onChange={handleDepartamentoChange}
              placeholder="Buscar departamento..."
              searchPlaceholder="Escribe para buscar..."
              emptyMessage="No se encontró el departamento"
              className={errores.departamento ? 'ring-2 ring-red-500 rounded-lg' : ''}
            />
            {errores.departamento && (
              <p className="text-red-500 text-xs mt-1">{errores.departamento}</p>
            )}
          </div>
        )}

        {/* Provincia */}
        {!departamento ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">
              Provincia *
            </label>
            <div className="w-full h-[42px] bg-gray-50 border border-gray-200 rounded-lg flex items-center px-4 text-gray-400 text-sm">
              Selecciona departamento primero
            </div>
          </div>
        ) : cargandoProvincias ? (
          <SkeletonCombobox label="Provincia" />
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Provincia *
            </label>
            <ComboboxFilter
              options={provincias}
              value={provincia}
              onChange={handleProvinciaChange}
              placeholder="Buscar provincia..."
              searchPlaceholder="Escribe para buscar..."
              emptyMessage="No se encontró la provincia"
              className={errores.provincia ? 'ring-2 ring-red-500 rounded-lg' : ''}
            />
            {errores.provincia && (
              <p className="text-red-500 text-xs mt-1">{errores.provincia}</p>
            )}
          </div>
        )}

        {/* Distrito */}
        {!provincia ? (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">
              Distrito *
            </label>
            <div className="w-full h-[42px] bg-gray-50 border border-gray-200 rounded-lg flex items-center px-4 text-gray-400 text-sm">
              Selecciona provincia primero
            </div>
          </div>
        ) : cargandoDistritos ? (
          <SkeletonCombobox label="Distrito" />
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Distrito *
            </label>
            <ComboboxFilter
              options={distritos}
              value={distrito}
              onChange={onDistritoChange}
              placeholder="Buscar distrito..."
              searchPlaceholder="Escribe para buscar..."
              emptyMessage="No se encontró el distrito"
              className={errores.distrito ? 'ring-2 ring-red-500 rounded-lg' : ''}
            />
            {errores.distrito && (
              <p className="text-red-500 text-xs mt-1">{errores.distrito}</p>
            )}
          </div>
        )}
      </div>

      {/* Indicador de ubicación seleccionada */}
      {departamento && provincia && distrito && (
        <div className="flex items-center gap-2 p-3 bg-[#1b967a]/10 border border-[#1b967a]/20 rounded-lg">
          <MapPin className="w-4 h-4 text-[#1b967a]" />
          <span className="text-sm text-[#1b967a] font-medium">
            {distrito}, {provincia}, {departamento}
          </span>
        </div>
      )}
    </div>
  );
}
