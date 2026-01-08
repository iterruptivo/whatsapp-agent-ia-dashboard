// ============================================================================
// COMPONENT: ActionItemCard
// ============================================================================
// Descripcion: Card de un action item con checkbox y metadata
// ============================================================================

'use client';

import { useState } from 'react';
import {
  User,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Quote,
} from 'lucide-react';
import { ReunionActionItem } from '@/types/reuniones';
import ActionItemCheckbox from './ActionItemCheckbox';

interface ActionItemCardProps {
  actionItem: ReunionActionItem;
  onUpdate: () => void;
}

export default function ActionItemCard({ actionItem, onUpdate }: ActionItemCardProps) {
  const [showContext, setShowContext] = useState(false);

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
      className={`border rounded-lg transition-all ${
        actionItem.completado
          ? 'border-gray-200 bg-gray-50 opacity-75'
          : 'border-gray-300 bg-white'
      }`}
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Checkbox */}
          <ActionItemCheckbox actionItem={actionItem} onUpdate={onUpdate} />

          {/* Contenido */}
          <div className="flex-1 min-w-0">
            {/* Descripción */}
            <p
              className={`text-sm sm:text-base text-gray-800 leading-relaxed ${
                actionItem.completado ? 'line-through text-gray-500' : ''
              }`}
            >
              {actionItem.descripcion}
            </p>

            {/* Metadata - apila en móvil pequeño */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:mt-3">
              {/* Asignado */}
              <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-600">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="truncate max-w-[100px] sm:max-w-none">{actionItem.asignado_nombre || 'Sin asignar'}</span>
              </div>

              {/* Prioridad */}
              <span
                className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium ${getPrioridadBadge()}`}
              >
                {actionItem.prioridad.charAt(0).toUpperCase() + actionItem.prioridad.slice(1)}
              </span>

              {/* Deadline */}
              {deadline && (
                <div
                  className={`flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm ${
                    deadline.isOverdue ? 'text-red-600' : 'text-gray-600'
                  }`}
                >
                  {deadline.isOverdue && <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{deadline.text}</span>
                </div>
              )}
            </div>

            {/* Contexto (colapsable) */}
            {actionItem.contexto_quote && (
              <div className="mt-2 sm:mt-3">
                <button
                  onClick={() => setShowContext(!showContext)}
                  className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showContext ? (
                    <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                  <span>{showContext ? 'Ocultar' : 'Ver'} contexto</span>
                </button>

                {showContext && (
                  <div className="mt-2 p-2 sm:p-3 bg-gray-100 border-l-4 border-gray-400 rounded">
                    <div className="flex items-start gap-2">
                      <Quote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0 mt-0.5 sm:mt-1" />
                      <p className="text-xs sm:text-sm text-gray-600 italic leading-relaxed">
                        {actionItem.contexto_quote}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
