'use client';

import { useState, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown } from 'lucide-react';
import KanbanCard from './KanbanCard';
import type { KanbanColumnProps } from './types';
import { KANBAN_PAGINATION } from './types';

export default function KanbanColumn({
  column,
  leads,
  totalCount,
  onLeadClick,
  isOver,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.columna_codigo,
    data: {
      type: 'column',
      column,
    },
  });

  // Estado de paginación local
  const [visibleCount, setVisibleCount] = useState<number>(KANBAN_PAGINATION.INITIAL_ITEMS);

  // Leads visibles (paginados)
  const visibleLeads = useMemo(() => {
    return leads.slice(0, visibleCount);
  }, [leads, visibleCount]);

  const leadIds = visibleLeads.map((lead) => lead.id);
  const hasMore = leads.length > visibleCount;
  const remainingCount = leads.length - visibleCount;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + KANBAN_PAGINATION.LOAD_MORE_BATCH);
  };

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col bg-gray-50 rounded-lg min-w-[280px] max-w-[320px] h-full
        ${isOver ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
        transition-all duration-200
      `}
    >
      {/* Header de columna con contador mejorado */}
      <div
        className="px-3 py-2 rounded-t-lg flex items-center justify-between"
        style={{ backgroundColor: column.columna_color + '20' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.columna_color }}
          />
          <h3 className="font-semibold text-gray-800 text-sm">
            {column.columna_nombre}
          </h3>
        </div>
        {/* Contador: visible/total */}
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: column.columna_color }}
          title={`Mostrando ${Math.min(visibleCount, leads.length)} de ${totalCount} leads`}
        >
          {totalCount}
        </span>
      </div>

      {/* Lista de leads con paginación */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px]">
        <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Sin leads
            </div>
          ) : (
            <>
              {visibleLeads.map((lead) => (
                <KanbanCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => onLeadClick(lead)}
                />
              ))}

              {/* Botón "Ver más" */}
              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  className="w-full py-2 px-3 mt-2 text-sm text-gray-600 bg-white border border-gray-200
                           rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors
                           flex items-center justify-center gap-2 shadow-sm"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>
                    Ver {Math.min(remainingCount, KANBAN_PAGINATION.LOAD_MORE_BATCH)} más
                  </span>
                  <span className="text-gray-400">
                    ({visibleLeads.length}/{leads.length})
                  </span>
                </button>
              )}
            </>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
