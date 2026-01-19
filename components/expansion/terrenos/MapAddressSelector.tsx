// ============================================================================
// COMPONENT: MapAddressSelector
// ============================================================================
// Selector de dirección con Google Maps de clase mundial
// Features:
// - Mapa interactivo con marker arrastrable
// - Geocoding inverso (marker → dirección)
// - Sincronización bidireccional
// - Mobile-first design
// - Fallback cuando no hay API key
// ============================================================================

'use client';

import { useState, useCallback, useEffect } from 'react';
import { MapPin, Navigation, Search, AlertCircle, Loader2, X, Check } from 'lucide-react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps';

// Coordenadas por defecto: Lima, Perú
const DEFAULT_CENTER = { lat: -12.0464, lng: -77.0428 };
const DEFAULT_ZOOM = 12;

interface MapAddressSelectorProps {
  direccion: string;
  referencia: string;
  coordenadasLat?: number;
  coordenadasLng?: number;
  // Ubigeo para mejorar búsqueda
  departamento?: string;
  provincia?: string;
  distrito?: string;
  onDireccionChange: (direccion: string) => void;
  onReferenciaChange: (referencia: string) => void;
  onCoordenadasChange: (lat: number, lng: number) => void;
  errores?: {
    direccion?: string;
  };
}

// Componente interno que usa los hooks de Google Maps
function MapContent({
  position,
  shouldCenter,
  onCenterComplete,
  onPositionChange,
  onAddressFound,
}: {
  position: { lat: number; lng: number };
  shouldCenter: boolean; // Solo centrar cuando viene de búsqueda/geolocalización
  onCenterComplete: () => void;
  onPositionChange: (pos: { lat: number; lng: number }) => void;
  onAddressFound: (address: string) => void;
}) {
  const map = useMap();
  const geocodingLib = useMapsLibrary('geocoding');
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Inicializar geocoder
  useEffect(() => {
    if (geocodingLib) {
      setGeocoder(new geocodingLib.Geocoder());
    }
  }, [geocodingLib]);

  // Centrar mapa SOLO cuando shouldCenter es true (búsqueda o geolocalización)
  useEffect(() => {
    if (!map || !shouldCenter) return;

    if (position.lat !== DEFAULT_CENTER.lat || position.lng !== DEFAULT_CENTER.lng) {
      console.log('[MapContent] Centrando mapa en:', position);
      map.panTo(position);
      // Ajustar zoom para ver mejor el área
      const currentZoom = map.getZoom();
      if (currentZoom && currentZoom < 15) {
        map.setZoom(16);
      }
      // Marcar que ya centramos
      onCenterComplete();
    }
  }, [map, position.lat, position.lng, shouldCenter, onCenterComplete]);

  // Reverse geocoding: coordenadas → dirección
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    if (!geocoder) return;

    setIsGeocoding(true);
    try {
      const response = await geocoder.geocode({
        location: { lat, lng },
      });

      if (response.results && response.results.length > 0) {
        // Buscar la dirección más específica (street_address o route)
        const streetAddress = response.results.find(r =>
          r.types.includes('street_address') || r.types.includes('route')
        );
        const address = streetAddress || response.results[0];
        onAddressFound(address.formatted_address);
      }
    } catch (error) {
      console.error('[MapAddressSelector] Error en geocoding:', error);
    } finally {
      setIsGeocoding(false);
    }
  }, [geocoder, onAddressFound]);

  // Manejar drag del marker - NO centra (usuario explorando)
  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };
      onPositionChange(newPos);
      reverseGeocode(newPos.lat, newPos.lng);
      // NO centramos - el usuario está ajustando manualmente
    }
  }, [onPositionChange, reverseGeocode]);

  // Manejar click en el mapa - NO centra (usuario explorando)
  const handleMapClick = useCallback((e: MapMouseEvent) => {
    if (e.detail.latLng) {
      const newPos = {
        lat: e.detail.latLng.lat,
        lng: e.detail.latLng.lng,
      };
      onPositionChange(newPos);
      reverseGeocode(newPos.lat, newPos.lng);
      // NO centramos - el usuario está explorando el mapa
    }
  }, [onPositionChange, reverseGeocode]);

  // Función para centrar en el marcador (botón flotante)
  const handleCenterOnMarker = useCallback(() => {
    if (map && position.lat !== DEFAULT_CENTER.lat) {
      map.panTo(position);
      map.setZoom(16);
    }
  }, [map, position]);

  return (
    <>
      <Map
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        mapId="ecoplaza-terrenos-map"
        onClick={handleMapClick}
        gestureHandling="greedy"
        disableDefaultUI={false}
        zoomControl={true}
        mapTypeControl={true}
        streetViewControl={false}
        fullscreenControl={true}
        className="w-full h-full rounded-lg"
      >
        <AdvancedMarker
          position={position}
          draggable={true}
          onDragEnd={handleMarkerDragEnd}
          title="Arrastra para ajustar la ubicación"
        >
          <div className="relative">
            {/* Pin personalizado con animación */}
            <div className="bg-[#1b967a] p-2 rounded-full shadow-lg transform -translate-y-1/2 hover:scale-110 transition-transform cursor-grab active:cursor-grabbing">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            {/* Sombra del pin */}
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-black/20 rounded-full blur-sm" />
            {/* Indicador de carga durante geocoding */}
            {isGeocoding && (
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded shadow-md">
                <Loader2 className="w-4 h-4 text-[#1b967a] animate-spin" />
              </div>
            )}
          </div>
        </AdvancedMarker>
      </Map>

      {/* Botón flotante para centrar en el marcador */}
      {position.lat !== DEFAULT_CENTER.lat && (
        <button
          type="button"
          onClick={handleCenterOnMarker}
          className="absolute top-4 right-16 z-10 bg-white p-2.5 rounded-lg shadow-lg hover:bg-gray-50 transition-all border border-gray-200 hover:shadow-xl"
          title="Centrar en el marcador"
        >
          <Navigation className="w-5 h-5 text-[#1b967a]" />
        </button>
      )}
    </>
  );
}

// Componente de búsqueda de dirección
function AddressSearchInput({
  value,
  onChange,
  onSearch,
  onUseMyLocation,
  isSearching,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  onUseMyLocation: () => void;
  isSearching: boolean;
  error?: string;
}) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localValue.trim()) {
      onSearch(localValue.trim());
    }
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={localValue}
              onChange={(e) => {
                setLocalValue(e.target.value);
                onChange(e.target.value);
              }}
              placeholder="Escribe la dirección o busca en el mapa..."
              className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {localValue && (
              <button
                type="button"
                onClick={() => {
                  setLocalValue('');
                  onChange('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Botón buscar */}
          <button
            type="submit"
            disabled={isSearching || !localValue.trim()}
            className="px-4 py-3 bg-[#1b967a] text-white rounded-lg hover:bg-[#158a6e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>

          {/* Botón mi ubicación */}
          <button
            type="button"
            onClick={onUseMyLocation}
            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Usar mi ubicación actual"
          >
            <Navigation className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </form>
      {error && (
        <p className="text-red-500 text-xs">{error}</p>
      )}
    </div>
  );
}

// Componente principal
export default function MapAddressSelector({
  direccion,
  referencia,
  coordenadasLat,
  coordenadasLng,
  departamento,
  provincia,
  distrito,
  onDireccionChange,
  onReferenciaChange,
  onCoordenadasChange,
  errores = {},
}: MapAddressSelectorProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const [position, setPosition] = useState({
    lat: coordenadasLat || DEFAULT_CENTER.lat,
    lng: coordenadasLng || DEFAULT_CENTER.lng,
  });
  const [isSearching, setIsSearching] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  // shouldCenter: solo se activa cuando viene de búsqueda o geolocalización
  // NO se activa cuando el usuario hace clic o arrastra en el mapa
  const [shouldCenter, setShouldCenter] = useState(false);

  // Actualizar posición cuando cambian las props
  useEffect(() => {
    if (coordenadasLat && coordenadasLng) {
      setPosition({ lat: coordenadasLat, lng: coordenadasLng });
    }
  }, [coordenadasLat, coordenadasLng]);

  // Manejar cambio de posición del marker
  const handlePositionChange = useCallback((newPos: { lat: number; lng: number }) => {
    setPosition(newPos);
    onCoordenadasChange(newPos.lat, newPos.lng);
  }, [onCoordenadasChange]);

  // Construir contexto de ubicación desde ubigeo
  const buildLocationContext = useCallback(() => {
    const parts: string[] = [];
    if (distrito) parts.push(distrito);
    if (provincia) parts.push(provincia);
    if (departamento) parts.push(departamento);
    parts.push('Peru');
    return parts.join(', ');
  }, [departamento, provincia, distrito]);

  // Buscar dirección y mover marker (usa ubigeo como contexto)
  const handleSearch = useCallback(async (query: string) => {
    if (!apiKey) return;

    setIsSearching(true);
    setMapError(null);

    try {
      // Agregar contexto de ubigeo a la búsqueda para mejores resultados
      const locationContext = buildLocationContext();
      const fullQuery = `${query}, ${locationContext}`;

      console.log('[MapAddressSelector] Buscando:', fullQuery);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullQuery)}&components=country:PE&key=${apiKey}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const newPos = {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        };
        setPosition(newPos);
        onCoordenadasChange(newPos.lat, newPos.lng);
        // Mostrar la dirección original del usuario, no la formateada de Google
        // para que pueda editarla como quiera
        onDireccionChange(query);
        // Activar centrado porque viene de búsqueda
        setShouldCenter(true);
      } else {
        // Si no encuentra con contexto completo, intentar solo con la query
        console.log('[MapAddressSelector] Reintentando sin contexto...');
        const fallbackResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:PE&key=${apiKey}`
        );
        const fallbackData = await fallbackResponse.json();

        if (fallbackData.status === 'OK' && fallbackData.results.length > 0) {
          const result = fallbackData.results[0];
          const newPos = {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
          };
          setPosition(newPos);
          onCoordenadasChange(newPos.lat, newPos.lng);
          onDireccionChange(query);
          // Activar centrado porque viene de búsqueda
          setShouldCenter(true);
        } else {
          setMapError('No se encontró. Intenta arrastrar el marcador en el mapa.');
        }
      }
    } catch (error) {
      console.error('[MapAddressSelector] Error buscando dirección:', error);
      setMapError('Error al buscar dirección. Intenta de nuevo.');
    } finally {
      setIsSearching(false);
    }
  }, [apiKey, onCoordenadasChange, onDireccionChange, buildLocationContext]);

  // Usar ubicación actual
  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setMapError('Tu navegador no soporta geolocalización');
      return;
    }

    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setPosition(newPos);
        onCoordenadasChange(newPos.lat, newPos.lng);
        setIsSearching(false);
        // Activar centrado porque viene de geolocalización
        setShouldCenter(true);
        // El reverse geocoding se hará automáticamente por el componente del mapa
      },
      (error) => {
        console.error('[MapAddressSelector] Error obteniendo ubicación:', error);
        setMapError('No se pudo obtener tu ubicación. Verifica los permisos.');
        setIsSearching(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onCoordenadasChange]);

  // Si no hay API key, mostrar fallback
  if (!apiKey) {
    return (
      <div className="space-y-4">
        {/* Dirección manual */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dirección *
          </label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => onDireccionChange(e.target.value)}
            placeholder="Ej: Av. Paseo de la República 3245, San Isidro"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent ${
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
            value={referencia}
            onChange={(e) => onReferenciaChange(e.target.value)}
            placeholder="Ej: Frente al colegio Santa María, a 2 cuadras del parque"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
          />
        </div>

        {/* Coordenadas manuales */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Latitud (opcional)
            </label>
            <input
              type="number"
              step="any"
              value={coordenadasLat || ''}
              onChange={(e) => {
                const lat = parseFloat(e.target.value);
                if (!isNaN(lat)) {
                  onCoordenadasChange(lat, coordenadasLng || DEFAULT_CENTER.lng);
                }
              }}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="-12.0464"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Longitud (opcional)
            </label>
            <input
              type="number"
              step="any"
              value={coordenadasLng || ''}
              onChange={(e) => {
                const lng = parseFloat(e.target.value);
                if (!isNaN(lng)) {
                  onCoordenadasChange(coordenadasLat || DEFAULT_CENTER.lat, lng);
                }
              }}
              onWheel={(e) => e.currentTarget.blur()}
              placeholder="-77.0428"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
            />
          </div>
        </div>

        {/* Aviso de configuración */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Mapa no disponible</p>
            <p className="mt-1">
              El mapa interactivo requiere una API Key de Google Maps.
              Contacta al administrador para habilitarlo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Con API key, mostrar mapa completo
  return (
    <APIProvider apiKey={apiKey}>
      <div className="space-y-4">
        {/* Búsqueda de dirección */}
        <AddressSearchInput
          value={direccion}
          onChange={onDireccionChange}
          onSearch={handleSearch}
          onUseMyLocation={handleUseMyLocation}
          isSearching={isSearching}
          error={mapError || errores.direccion}
        />

        {/* Mapa */}
        <div className="relative h-[400px] rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          <MapContent
            position={position}
            shouldCenter={shouldCenter}
            onCenterComplete={() => setShouldCenter(false)}
            onPositionChange={handlePositionChange}
            onAddressFound={onDireccionChange}
          />

          {/* Instrucciones flotantes - centrado, no tapa controles */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#1b967a] flex-shrink-0" />
              <span>Haz clic en el mapa o arrastra el marcador</span>
            </div>
          </div>
        </div>

        {/* Coordenadas actuales */}
        {position.lat !== DEFAULT_CENTER.lat && position.lng !== DEFAULT_CENTER.lng && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm">
            <Check className="w-4 h-4 text-[#1b967a]" />
            <span className="text-gray-600">
              Coordenadas: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
            </span>
          </div>
        )}

        {/* Referencia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Referencia (opcional)
          </label>
          <input
            type="text"
            value={referencia}
            onChange={(e) => onReferenciaChange(e.target.value)}
            placeholder="Ej: Frente al colegio Santa María, a 2 cuadras del parque"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Agrega referencias para facilitar la ubicación del terreno
          </p>
        </div>
      </div>
    </APIProvider>
  );
}
