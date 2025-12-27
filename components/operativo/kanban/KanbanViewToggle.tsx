'use client';

import { LayoutGrid, Table } from 'lucide-react';
import type { ViewMode } from './types';

interface KanbanViewToggleProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export default function KanbanViewToggle({ view, onViewChange }: KanbanViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
      <button
        onClick={() => onViewChange('table')}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
          transition-colors duration-200
          ${view === 'table'
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100'
          }
        `}
        title="Vista de tabla"
      >
        <Table className="w-4 h-4" />
        <span className="hidden sm:inline">Tabla</span>
      </button>
      <button
        onClick={() => onViewChange('kanban')}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
          transition-colors duration-200
          ${view === 'kanban'
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100'
          }
        `}
        title="Vista Kanban"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Kanban</span>
      </button>
    </div>
  );
}
