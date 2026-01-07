// ============================================================================
// COMPONENT: ActionItemCheckbox
// ============================================================================
// Descripcion: Checkbox para marcar action item como completado
// ============================================================================

'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { markActionItemCompleted } from '@/lib/actions-action-items';
import { ReunionActionItem } from '@/types/reuniones';

interface ActionItemCheckboxProps {
  actionItem: ReunionActionItem;
  onUpdate: () => void;
}

export default function ActionItemCheckbox({
  actionItem,
  onUpdate,
}: ActionItemCheckboxProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);

    const result = await markActionItemCompleted(actionItem.id, !actionItem.completado);

    if (result.success) {
      onUpdate();
    }

    setLoading(false);
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center justify-center w-6 h-6 rounded border-2 transition-all flex-shrink-0 ${
        actionItem.completado
          ? 'bg-green-500 border-green-500'
          : 'border-gray-300 hover:border-[#1b967a]'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 text-white animate-spin" />
      ) : actionItem.completado ? (
        <Check className="w-4 h-4 text-white" />
      ) : null}
    </button>
  );
}
