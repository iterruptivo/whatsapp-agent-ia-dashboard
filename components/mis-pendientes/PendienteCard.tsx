// ============================================================================
// COMPONENT: PendienteCard
// ============================================================================
// Descripcion: Card de action item con link a la reunión origen
// ============================================================================

'use client';

import { useRouter } from 'next/navigation';
import {
  Video,
  Calendar,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { ActionItemWithReunion } from '@/types/reuniones';
import ActionItemCheckbox from '../reuniones/ActionItemCheckbox';

interface PendienteCardProps {
  actionItem: ActionItemWithReunion;
  onUpdate: () => void;
}

export default function PendienteCard({ actionItem, onUpdate }: PendienteCardProps) {
  const router = useRouter();

  // Formatear deadline
  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const isOverdue = date < now && !actionItem.completado;

    return {
      text: date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      isOverdue,
    };
  };

  // Badge de prioridad
  const getPrioridadBadge = () => {
    switch (actionItem.prioridad) {
      case 'alta':
        return 'bg-red-100 text-red-800';
      case 'media':
        return 'bg-yellow-100 text-yellow-800';
      case 'baja':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const deadline = formatDeadline(actionItem.deadline);

  return (
    <div
      className={`border rounded-lg bg-white transition-all hover:shadow-md ${
        actionItem.completado
          ? 'border-gray-200 bg-gray-50 opacity-75'
          : 'border-gray-300'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <ActionItemCheckbox actionItem={actionItem} onUpdate={onUpdate} />

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            {/* Descripción */}
            <p
              className={`text-gray-800 leading-relaxed mb-3 ${
                actionItem.completado ? 'line-through text-gray-500' : ''
              }`}
            >
              {actionItem.descripcion}
            </p>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {/* Prioridad */}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPrioridadBadge()}`}
              >
                {actionItem.prioridad.charAt(0).toUpperCase() + actionItem.prioridad.slice(1)}
              </span>

              {/* Deadline */}
              {deadline && (
                <div
                  className={`flex items-center gap-1.5 text-sm ${
                    deadline.isOverdue ? 'text-red-600' : 'text-gray-600'
                  }`}
                >
                  {deadline.isOverdue && <AlertCircle className="w-4 h-4" />}
                  <Calendar className="w-4 h-4" />
                  <span>{deadline.text}</span>
                </div>
              )}
            </div>

            {/* Link a reunión */}
            <button
              onClick={() => router.push(`/reuniones/${actionItem.reunion_id}`)}
              className="flex items-center gap-2 text-sm text-[#1b967a] hover:text-[#157a63] transition-colors"
            >
              <Video className="w-4 h-4" />
              <span className="font-medium">{actionItem.reunion_titulo}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
