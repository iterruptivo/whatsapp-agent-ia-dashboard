// ============================================================================
// COMPONENT: ReunionActionItemsTab
// ============================================================================
// Descripcion: Tab de action items con checkbox para completar
// ============================================================================

'use client';

import { useState } from 'react';
import { ListChecks, ChevronDown, ChevronUp } from 'lucide-react';
import { ReunionActionItem } from '@/types/reuniones';
import ActionItemCard from './ActionItemCard';

interface ReunionActionItemsTabProps {
  actionItems: ReunionActionItem[];
  onUpdate: () => void;
}

export default function ReunionActionItemsTab({
  actionItems,
  onUpdate,
}: ReunionActionItemsTabProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  // Separar pendientes y completados
  const pendientes = actionItems.filter((item) => !item.completado);
  const completados = actionItems.filter((item) => item.completado);

  if (actionItems.length === 0) {
    return (
      <div className="text-center py-12">
        <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600">Sin Action Items</h3>
        <p className="text-gray-500">No se identificaron tareas en esta reunión</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pendientes */}
      {pendientes.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="w-5 h-5 text-[#1b967a]" />
            <h3 className="text-lg font-semibold text-gray-800">
              Pendientes ({pendientes.length})
            </h3>
          </div>
          <div className="space-y-3">
            {pendientes.map((item) => (
              <ActionItemCard key={item.id} actionItem={item} onUpdate={onUpdate} />
            ))}
          </div>
        </section>
      )}

      {/* Completados (colapsable) */}
      {completados.length > 0 && (
        <section>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 mb-4 text-gray-600 hover:text-gray-800 transition-colors"
          >
            {showCompleted ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
            <h3 className="text-lg font-semibold">Completados ({completados.length})</h3>
          </button>

          {showCompleted && (
            <div className="space-y-3">
              {completados.map((item) => (
                <ActionItemCard key={item.id} actionItem={item} onUpdate={onUpdate} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Stats summary */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Total: {actionItems.length} action items</span>
          <span>
            {completados.length} completado{completados.length !== 1 ? 's' : ''},{' '}
            {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
          </span>
        </div>
        {actionItems.length > 0 && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{
                width: `${(completados.length / actionItems.length) * 100}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
