// ============================================================================
// COMPONENT: ReunionDetalleHeader
// ============================================================================
// Descripcion: Header con metadata de la reunión
// ============================================================================

'use client';

import { Calendar, Clock, Video, ListChecks, User } from 'lucide-react';
import { Reunion } from '@/types/reuniones';
import ReunionEstadoBadge from './ReunionEstadoBadge';

interface ReunionDetalleHeaderProps {
  reunion: Reunion;
  actionItemsCount: number;
}

export default function ReunionDetalleHeader({
  reunion,
  actionItemsCount,
}: ReunionDetalleHeaderProps) {
  const formatFecha = (fecha: string | null) => {
    if (!fecha) return 'No especificada';
    return new Date(fecha).toLocaleDateString('es-PE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDuracion = (segundos: number | null) => {
    if (!segundos) return 'N/A';
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFechaCreacion = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Banner con gradiente */}
      <div className="h-24 bg-gradient-to-r from-[#1b967a] to-[#157a63]" />

      {/* Contenido */}
      <div className="px-6 py-4">
        {/* Título y estado */}
        <div className="flex items-start justify-between mb-4 -mt-12">
          <div className="flex items-start gap-4">
            <div className="p-4 bg-white rounded-lg shadow-md">
              <Video className="w-8 h-8 text-[#1b967a]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{reunion.titulo}</h1>
              <div className="mt-2">
                <ReunionEstadoBadge estado={reunion.estado} />
              </div>
            </div>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
          {/* Fecha de reunión */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Fecha de Reunión</p>
              <p className="text-sm font-medium text-gray-800">
                {formatFecha(reunion.fecha_reunion)}
              </p>
            </div>
          </div>

          {/* Duración */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Duración</p>
              <p className="text-sm font-medium text-gray-800">
                {formatDuracion(reunion.duracion_segundos)}
              </p>
            </div>
          </div>

          {/* Action Items */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <ListChecks className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Action Items</p>
              <p className="text-sm font-medium text-gray-800">{actionItemsCount}</p>
            </div>
          </div>

          {/* Participantes */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <User className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Participantes</p>
              <p className="text-sm font-medium text-gray-800">
                {reunion.participantes?.length || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Fecha de creación */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Subida el {formatFechaCreacion(reunion.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
