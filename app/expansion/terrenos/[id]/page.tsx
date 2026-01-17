'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Edit, Eye, Clock, MapPin, Ruler, DollarSign, FileText, Image } from 'lucide-react';
import { getTerrenoById } from '@/lib/actions-expansion';
import { WizardTerreno } from '@/components/expansion/terrenos';
import {
  TERRENO_ESTADO_LABELS,
  TERRENO_ESTADO_COLORS,
  TIPO_TERRENO_LABELS,
  TIPO_PROPIEDAD_LABELS,
  URGENCIA_LABELS,
} from '@/lib/types/expansion';
import type { Terreno } from '@/lib/types/expansion';

export default function TerrenoDetallePage() {
  const router = useRouter();
  const params = useParams();
  const terrenoId = params.id as string;

  const [terreno, setTerreno] = useState<Terreno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  const cargarTerreno = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTerrenoById(terrenoId);
      if (result.success && result.data) {
        setTerreno(result.data);
        // Si es borrador o info_adicional, entrar en modo edición automáticamente
        if (['borrador', 'info_adicional'].includes(result.data.estado)) {
          setModoEdicion(true);
        }
      } else {
        setError(result.error || 'Terreno no encontrado');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTerreno();
  }, [terrenoId]);

  const puedeEditar = terreno && ['borrador', 'info_adicional'].includes(terreno.estado);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1b967a]"></div>
      </div>
    );
  }

  if (error || !terreno) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center max-w-md">
          <div className="text-red-500 mb-4">
            <FileText className="w-16 h-16 mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {error || 'Terreno no encontrado'}
          </h2>
          <button
            onClick={() => router.push('/expansion/terrenos')}
            className="mt-4 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#158a6e]"
          >
            Volver a la lista
          </button>
        </div>
      </div>
    );
  }

  // Modo edición (wizard)
  if (modoEdicion && puedeEditar) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setModoEdicion(false)}
                className="p-2 text-gray-600 hover:text-[#1b967a] hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-[#192c4d]">
                  Editar Terreno - {terreno.codigo}
                </h1>
                <p className="text-sm text-gray-600">
                  Completa los datos faltantes
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <WizardTerreno
            terrenoId={terrenoId}
            datosIniciales={terreno}
          />
        </div>
      </div>
    );
  }

  // Modo visualización
  const estadoColors = TERRENO_ESTADO_COLORS[terreno.estado];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/expansion/terrenos')}
                className="p-2 text-gray-600 hover:text-[#1b967a] hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-[#192c4d]">
                    {terreno.codigo}
                  </h1>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${estadoColors.bg} ${estadoColors.text}`}>
                    {TERRENO_ESTADO_LABELS[terreno.estado]}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {terreno.distrito}, {terreno.provincia}
                </p>
              </div>
            </div>

            {puedeEditar && (
              <button
                onClick={() => setModoEdicion(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#158a6e]"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Ubicación */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#192c4d] flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-[#1b967a]" />
            Ubicación
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Dirección</p>
              <p className="font-medium">{terreno.direccion}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ubicación</p>
              <p className="font-medium">{terreno.distrito}, {terreno.provincia}, {terreno.departamento}</p>
            </div>
            {terreno.referencia && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Referencia</p>
                <p className="font-medium">{terreno.referencia}</p>
              </div>
            )}
          </div>
        </div>

        {/* Características */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#192c4d] flex items-center gap-2 mb-4">
            <Ruler className="w-5 h-5 text-[#1b967a]" />
            Características
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Área Total</p>
              <p className="font-medium">{terreno.area_total_m2?.toLocaleString()} m²</p>
            </div>
            {terreno.area_construida_m2 > 0 && (
              <div>
                <p className="text-sm text-gray-500">Área Construida</p>
                <p className="font-medium">{terreno.area_construida_m2?.toLocaleString()} m²</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Tipo</p>
              <p className="font-medium">{TIPO_TERRENO_LABELS[terreno.tipo_terreno]}</p>
            </div>
            {terreno.zonificacion && (
              <div>
                <p className="text-sm text-gray-500">Zonificación</p>
                <p className="font-medium">{terreno.zonificacion}</p>
              </div>
            )}
          </div>

          {/* Servicios */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500 mb-2">Servicios</p>
            <div className="flex flex-wrap gap-2">
              {terreno.tiene_agua && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Agua</span>}
              {terreno.tiene_luz && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">Luz</span>}
              {terreno.tiene_desague && <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Desagüe</span>}
              {terreno.tiene_internet && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Internet</span>}
              {terreno.acceso_pavimentado && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">Acceso Pavimentado</span>}
            </div>
          </div>
        </div>

        {/* Valorización */}
        {terreno.precio_solicitado && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-[#192c4d] flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-[#1b967a]" />
              Valorización
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Precio Solicitado</p>
                <p className="text-xl font-bold text-[#1b967a]">
                  {terreno.moneda} {terreno.precio_solicitado?.toLocaleString()}
                </p>
              </div>
              {terreno.precio_negociable && (
                <div>
                  <p className="text-sm text-gray-500">Negociable</p>
                  <p className="font-medium text-green-600">Sí</p>
                </div>
              )}
              {terreno.urgencia_venta && (
                <div>
                  <p className="text-sm text-gray-500">Urgencia</p>
                  <p className="font-medium">{URGENCIA_LABELS[terreno.urgencia_venta]}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fotos */}
        {terreno.fotos_urls && terreno.fotos_urls.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-[#192c4d] flex items-center gap-2 mb-4">
              <Image className="w-5 h-5 text-[#1b967a]" />
              Fotos ({terreno.fotos_urls.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {terreno.fotos_urls.map((url, index) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={url}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline/Estado */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#192c4d] flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[#1b967a]" />
            Historial
          </h2>
          <div className="space-y-3">
            {terreno.enviado_at && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-500">Enviado:</span>
                <span>{new Date(terreno.enviado_at).toLocaleDateString('es-PE')}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-gray-500">Creado:</span>
              <span>{new Date(terreno.created_at).toLocaleDateString('es-PE')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
