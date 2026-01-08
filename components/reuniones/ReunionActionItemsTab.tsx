// ============================================================================
// COMPONENT: ReunionActionItemsTab
// ============================================================================
// Descripcion: Tab de action items con checkbox para completar
// ============================================================================

'use client';

import { useState } from 'react';
import { ListChecks, ChevronDown, ChevronUp, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { ReunionActionItem } from '@/types/reuniones';
import { supabase } from '@/lib/supabase';
import ActionItemCard from './ActionItemCard';

interface ReunionActionItemsTabProps {
  actionItems: ReunionActionItem[];
  reunionId: string;
  onUpdate: () => void;
}

export default function ReunionActionItemsTab({
  actionItems,
  reunionId,
  onUpdate,
}: ReunionActionItemsTabProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [reextracting, setReextracting] = useState(false);
  const [reextractError, setReextractError] = useState<string | null>(null);

  // Re-extraer action items con IA
  const handleReextract = async () => {
    setReextracting(true);
    setReextractError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`/api/reuniones/${reunionId}/reextract-actions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al re-extraer');
      }

      // Recargar action items
      onUpdate();
    } catch (error: any) {
      console.error('[ReExtract] Error:', error);
      setReextractError(error.message);
    } finally {
      setReextracting(false);
    }
  };

  // Separar pendientes y completados
  const pendientes = actionItems.filter((item) => !item.completado);
  const completados = actionItems.filter((item) => item.completado);

  if (actionItems.length === 0) {
    return (
      <div className="text-center py-12">
        <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600">Sin Action Items</h3>
        <p className="text-gray-500 mb-6">No se identificaron tareas en esta reunión</p>

        {reextractError && (
          <p className="text-red-500 text-sm mb-4">{reextractError}</p>
        )}

        <button
          onClick={handleReextract}
          disabled={reextracting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors disabled:opacity-50"
        >
          {reextracting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Extrayendo con IA...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Extraer Action Items con IA
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Pendientes */}
      {pendientes.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <ListChecks className="w-4 h-4 sm:w-5 sm:h-5 text-[#1b967a]" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">
              Pendientes ({pendientes.length})
            </h3>
          </div>
          <div className="space-y-2 sm:space-y-3">
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
            className="flex items-center gap-2 mb-3 sm:mb-4 text-gray-600 hover:text-gray-800 transition-colors"
          >
            {showCompleted ? (
              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <h3 className="text-base sm:text-lg font-semibold">Completados ({completados.length})</h3>
          </button>

          {showCompleted && (
            <div className="space-y-2 sm:space-y-3">
              {completados.map((item) => (
                <ActionItemCard key={item.id} actionItem={item} onUpdate={onUpdate} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Stats summary - apila en móvil */}
      <div className="pt-3 sm:pt-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div className="text-xs sm:text-sm text-gray-500">
            <span>Total: {actionItems.length} action items</span>
            <span className="mx-2">•</span>
            <span>
              {completados.length} completado{completados.length !== 1 ? 's' : ''},{' '}
              {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Botón re-extraer */}
          <button
            onClick={handleReextract}
            disabled={reextracting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            title="Volver a extraer action items con IA"
          >
            {reextracting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Extrayendo...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Re-extraer con IA
              </>
            )}
          </button>
        </div>

        {reextractError && (
          <p className="text-red-500 text-xs mt-2">{reextractError}</p>
        )}

        {actionItems.length > 0 && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
            <div
              className="bg-green-500 h-1.5 sm:h-2 rounded-full transition-all"
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
