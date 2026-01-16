// ============================================================================
// COMPONENT: ReunionPublicaView
// ============================================================================
// Vista pública de reunión compartida (sin sidebar, solo lectura)
// ============================================================================

'use client';

import { Calendar, Clock, Video, FileText, Key, Target, MessageSquare } from 'lucide-react';
import { Reunion, ReunionActionItem } from '@/types/reuniones';
import Link from 'next/link';

interface ReunionPublicaViewProps {
  reunion: Reunion;
  actionItems: ReunionActionItem[];
}

export default function ReunionPublicaView({ reunion, actionItems }: ReunionPublicaViewProps) {
  const formatFecha = (fecha: string | null) => {
    if (!fecha) return 'No especificada';
    return new Date(fecha).toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDuracion = (segundos: number | null) => {
    if (!segundos) return 'N/A';
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simple */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#1b967a] rounded-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#192c4d]">EcoPlaza</h1>
                <p className="text-sm text-gray-500">Reunión Compartida</p>
              </div>
            </div>
            <Link
              href="/login"
              className="px-4 py-2 text-sm text-[#1b967a] hover:bg-gray-100 rounded-lg transition-colors"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Título y Metadata */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-[#192c4d] mb-4">{reunion.titulo}</h2>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{formatFecha(reunion.fecha_reunion)}</span>
            </div>
            {reunion.duracion_segundos && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{formatDuracion(reunion.duracion_segundos)}</span>
              </div>
            )}
            {reunion.participantes && reunion.participantes.length > 0 && (
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-gray-400" />
                <span>{reunion.participantes.length} participante(s)</span>
              </div>
            )}
          </div>

          {/* Participantes */}
          {reunion.participantes && reunion.participantes.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">Participantes:</p>
              <div className="flex flex-wrap gap-2">
                {reunion.participantes.map((participante, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm"
                  >
                    {participante}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Resumen */}
        {reunion.resumen && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-[#1b967a]" />
              <h3 className="text-lg font-semibold text-[#192c4d]">Resumen</h3>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{reunion.resumen}</p>
          </div>
        )}

        {/* Puntos Clave */}
        {reunion.puntos_clave && reunion.puntos_clave.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-[#1b967a]" />
              <h3 className="text-lg font-semibold text-[#192c4d]">Puntos Clave</h3>
            </div>
            <ul className="space-y-2">
              {reunion.puntos_clave.map((punto, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1b967a] text-white text-sm flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-gray-700">{punto}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Decisiones */}
        {reunion.decisiones && reunion.decisiones.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-[#1b967a]" />
              <h3 className="text-lg font-semibold text-[#192c4d]">Decisiones</h3>
            </div>
            <ul className="space-y-3">
              {reunion.decisiones.map((decision, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#1b967a] mt-2"></span>
                  <span className="text-gray-700">{decision}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Preguntas Abiertas */}
        {reunion.preguntas_abiertas && reunion.preguntas_abiertas.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-[#1b967a]" />
              <h3 className="text-lg font-semibold text-[#192c4d]">Preguntas Abiertas</h3>
            </div>
            <ul className="space-y-3">
              {reunion.preguntas_abiertas.map((pregunta, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-[#1b967a] font-bold">?</span>
                  <span className="text-gray-700">{pregunta}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items (Solo vista, sin edición) */}
        {actionItems && actionItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-[#1b967a]" />
              <h3 className="text-lg font-semibold text-[#192c4d]">
                Action Items ({actionItems.length})
              </h3>
            </div>
            <div className="space-y-3">
              {actionItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 border rounded-lg ${
                    item.completado ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p
                      className={`text-sm ${
                        item.completado ? 'text-gray-500 line-through' : 'text-gray-900'
                      }`}
                    >
                      {item.descripcion}
                    </p>
                    {item.prioridad && (
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          item.prioridad === 'alta'
                            ? 'bg-red-100 text-red-800'
                            : item.prioridad === 'media'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.prioridad}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {item.asignado_nombre && (
                      <span>Asignado: {item.asignado_nombre}</span>
                    )}
                    {item.deadline && (
                      <span>
                        Fecha límite:{' '}
                        {new Date(item.deadline).toLocaleDateString('es-PE')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcripción */}
        {reunion.transcripcion_completa && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-[#1b967a]" />
              <h3 className="text-lg font-semibold text-[#192c4d]">Transcripción Completa</h3>
            </div>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap text-sm">
                {reunion.transcripcion_completa}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">
            Esta reunión fue compartida públicamente desde{' '}
            <span className="font-semibold text-[#1b967a]">EcoPlaza</span>
          </p>
          <Link
            href="/login"
            className="inline-block mt-3 px-6 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors"
          >
            Acceder al Sistema
          </Link>
        </div>
      </div>
    </div>
  );
}
