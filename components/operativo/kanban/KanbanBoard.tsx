'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { Loader2 } from 'lucide-react';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import type { KanbanBoardProps, LeadCard } from './types';

export default function KanbanBoard({
  columns,
  leads,
  onLeadMove,
  onLeadClick,
  isLoading = false,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  // Sensores para drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Mínimo 8px de movimiento para activar drag
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Obtener el lead activo (el que está siendo arrastrado)
  const activeLead = activeId
    ? leads.find((lead) => lead.id === activeId)
    : null;

  // Agrupar leads por columna
  const leadsByColumn = columns.reduce((acc, column) => {
    acc[column.columna_codigo] = leads.filter(
      (lead) => lead.columna_kanban === column.columna_codigo
    );
    return acc;
  }, {} as Record<string, LeadCard[]>);

  // Handlers de drag & drop
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      // Determinar la columna destino
      const overData = over.data.current;
      if (overData?.type === 'column') {
        setOverId(over.id as string);
      } else if (overData?.type === 'lead') {
        // Si está sobre otro lead, obtener la columna de ese lead
        const overLead = leads.find((l) => l.id === over.id);
        if (overLead) {
          setOverId(overLead.columna_kanban);
        }
      }
    } else {
      setOverId(null);
    }
  }, [leads]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const activeLeadId = active.id as string;
    const activeLead = leads.find((l) => l.id === activeLeadId);

    if (!activeLead) return;

    // Determinar la columna destino
    let targetColumn: string;
    const overData = over.data.current;

    if (overData?.type === 'column') {
      targetColumn = over.id as string;
    } else if (overData?.type === 'lead') {
      const overLead = leads.find((l) => l.id === over.id);
      if (!overLead) return;
      targetColumn = overLead.columna_kanban;
    } else {
      return;
    }

    // Si la columna es la misma, no hacer nada
    if (activeLead.columna_kanban === targetColumn) {
      return;
    }

    // Mover el lead
    setIsMoving(true);
    try {
      await onLeadMove(activeLeadId, targetColumn);
    } catch (error) {
      console.error('Error al mover lead:', error);
    } finally {
      setIsMoving(false);
    }
  }, [leads, onLeadMove]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500">Cargando Kanban...</span>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Overlay de carga mientras mueve */}
      {isMoving && (
        <div className="fixed inset-0 bg-black/10 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-sm text-gray-600">Moviendo lead...</span>
          </div>
        </div>
      )}

      {/* Contenedor de columnas con scroll horizontal */}
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)] min-h-[500px]">
        {columns.map((column) => {
          const columnLeads = leadsByColumn[column.columna_codigo] || [];
          return (
            <KanbanColumn
              key={column.columna_codigo}
              column={column}
              leads={columnLeads}
              totalCount={columnLeads.length}
              onLeadClick={onLeadClick}
              isOver={overId === column.columna_codigo}
            />
          );
        })}
      </div>

      {/* Overlay del elemento siendo arrastrado */}
      <DragOverlay>
        {activeLead ? (
          <div className="rotate-3 scale-105">
            <KanbanCard
              lead={activeLead}
              onClick={() => {}}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
