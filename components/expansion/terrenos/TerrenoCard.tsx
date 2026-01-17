'use client';

import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Edit, Eye } from 'lucide-react';
import type { Terreno } from '@/lib/types/expansion';
import {
  TERRENO_ESTADO_LABELS,
  TERRENO_ESTADO_COLORS,
  TIPO_TERRENO_LABELS,
} from '@/lib/types/expansion';

interface TerrenoCardProps {
  terreno: Terreno;
}

export default function TerrenoCard({ terreno }: TerrenoCardProps) {
  const router = useRouter();
  const estadoColor = TERRENO_ESTADO_COLORS[terreno.estado];

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrecio = (precio?: number, moneda?: string) => {
    if (!precio) return 'No especificado';
    const symbol = moneda === 'USD' ? '$' : 'S/';
    return `${symbol} ${precio.toLocaleString('es-PE')}`;
  };

  const handleClick = () => {
    if (terreno.estado === 'borrador' || terreno.estado === 'info_adicional') {
      // Editar
      router.push(`/expansion/terrenos/editar/${terreno.id}`);
    } else {
      // Ver detalle
      router.push(`/expansion/terrenos/${terreno.id}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
      <div onClick={handleClick}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Código</p>
              <h3 className="text-lg font-bold text-[#192c4d]">{terreno.codigo}</h3>
            </div>

            {/* Badge Estado */}
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full border ${estadoColor.bg} ${estadoColor.text} ${estadoColor.border}`}
            >
              {TERRENO_ESTADO_LABELS[terreno.estado]}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Ubicación */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[#1b967a] mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-gray-900">{terreno.distrito}</p>
              <p className="text-gray-600">
                {terreno.provincia}, {terreno.departamento}
              </p>
              {terreno.direccion && (
                <p className="text-xs text-gray-500 mt-1">{terreno.direccion}</p>
              )}
            </div>
          </div>

          {/* Características principales */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500">Área Total</p>
              <p className="text-sm font-semibold text-gray-900">
                {terreno.area_total_m2.toLocaleString('es-PE')} m²
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tipo</p>
              <p className="text-sm font-semibold text-gray-900">
                {TIPO_TERRENO_LABELS[terreno.tipo_terreno]}
              </p>
            </div>
          </div>

          {/* Precio */}
          {terreno.precio_solicitado && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">Precio Solicitado</p>
              <p className="text-lg font-bold text-[#1b967a]">
                {formatPrecio(terreno.precio_solicitado, terreno.moneda)}
              </p>
              {terreno.precio_negociable && (
                <span className="text-xs text-green-600 font-medium">Negociable</span>
              )}
            </div>
          )}

          {/* Fecha */}
          <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
            <Calendar className="w-4 h-4" />
            <span>
              Creado: {formatFecha(terreno.created_at)}
            </span>
          </div>
        </div>

        {/* Footer - Botones */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Indicadores de completitud */}
            {terreno.fotos_urls && terreno.fotos_urls.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>{terreno.fotos_urls.length} fotos</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleClick}
            className="px-4 py-2 bg-[#1b967a] text-white rounded-md hover:bg-[#156b5a] transition-colors text-sm font-medium flex items-center gap-2"
          >
            {terreno.estado === 'borrador' || terreno.estado === 'info_adicional' ? (
              <>
                <Edit className="w-4 h-4" />
                Continuar Edición
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Ver Detalle
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
