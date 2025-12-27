'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import {
  getKanbanColumns,
  getKanbanMappings,
  type KanbanColumn,
  type KanbanMapping,
  ALL_TIPIFICACION_COMBINATIONS,
  NIVEL_1_LABELS,
  type TipificacionCombination,
  getTipificacionCombinationsFromDB,
} from '@/lib/kanban-config';
import { updateKanbanColumn, upsertKanbanMapping, reorderKanbanColumns } from '@/lib/actions-kanban';
import {
  Settings,
  GripVertical,
  Save,
  Palette,
  Tag,
  ArrowUp,
  ArrowDown,
  Loader2,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';

// Helper para obtener el key único de una combinación
function getCombinationKey(nivel1: string | null, nivel2: string | null): string {
  return `${nivel1 || 'NULL'}::${nivel2 || 'NULL'}`;
}

export default function ConfiguracionKanbanPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [mappings, setMappings] = useState<KanbanMapping[]>([]);
  const [tipificacionCombinations, setTipificacionCombinations] = useState<TipificacionCombination[]>(ALL_TIPIFICACION_COMBINATIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Temp edit states for columns
  const [tempColumnName, setTempColumnName] = useState('');
  const [tempColumnColor, setTempColumnColor] = useState('');

  // Accordion states - qué categorías están expandidas
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'sin_tipificar',
    'contactado',
    'no_contactado',
    'seguimiento',
    'otros',
  ]);

  // Only admin can access
  useEffect(() => {
    if (user && user.rol !== 'admin') {
      router.push('/operativo');
    }
  }, [user, router]);

  // Load data (including tipificaciones from DB)
  useEffect(() => {
    async function loadData() {
      try {
        const [cols, maps, combinations] = await Promise.all([
          getKanbanColumns(),
          getKanbanMappings(),
          getTipificacionCombinationsFromDB(),
        ]);
        setColumns(cols);
        setMappings(maps);
        setTipificacionCombinations(combinations);
      } catch (error) {
        console.error('Error loading Kanban config:', error);
        setMessage({ type: 'error', text: 'Error al cargar configuración' });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Crear un mapa de combinaciones a columnas para lookup rápido
  const mappingsByKey = useMemo(() => {
    const map = new Map<string, { id: string; columna_codigo: string }>();
    mappings.forEach((m) => {
      const key = getCombinationKey(m.tipificacion_nivel_1, m.tipificacion_nivel_2);
      map.set(key, { id: m.id, columna_codigo: m.columna_codigo });
    });
    return map;
  }, [mappings]);

  // Agrupar combinaciones por categoría (usando datos de BD)
  const combinationsByCategory = useMemo(() => {
    const groups: Record<string, TipificacionCombination[]> = {};
    tipificacionCombinations.forEach((combo) => {
      if (!groups[combo.category]) {
        groups[combo.category] = [];
      }
      groups[combo.category].push(combo);
    });
    return groups;
  }, [tipificacionCombinations]);

  // Toggle categoría expandida
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  // Obtener la columna actual para una combinación
  const getColumnForCombination = (nivel1: string | null, nivel2: string | null): string => {
    const key = getCombinationKey(nivel1, nivel2);
    return mappingsByKey.get(key)?.columna_codigo || 'nuevo';
  };

  // Guardar cambio de columna para una combinación
  const handleColumnChange = async (
    nivel1: string | null,
    nivel2: string | null,
    newColumn: string
  ) => {
    const key = getCombinationKey(nivel1, nivel2);
    setSavingKey(key);

    try {
      // Prioridad más alta para combinaciones específicas (con N2), más baja para fallbacks (sin N2)
      const prioridad = nivel2 ? 90 : nivel1 ? 50 : 100;

      const result = await upsertKanbanMapping(nivel1, nivel2, newColumn, prioridad);

      if (result.success) {
        // Actualizar estado local
        setMappings((prev) => {
          const existing = prev.find(
            (m) => m.tipificacion_nivel_1 === nivel1 && m.tipificacion_nivel_2 === nivel2
          );

          if (existing) {
            return prev.map((m) =>
              m.id === existing.id ? { ...m, columna_codigo: newColumn } : m
            );
          } else {
            // Agregar nuevo mapping
            return [
              ...prev,
              {
                id: result.mappingId || '',
                tipificacion_nivel_1: nivel1,
                tipificacion_nivel_2: nivel2,
                columna_codigo: newColumn,
                prioridad,
              },
            ];
          }
        });

        setMessage({ type: 'success', text: 'Mapeo guardado' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al guardar' });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Error inesperado' });
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveColumn = async (columnId: string) => {
    setIsSaving(true);
    try {
      const result = await updateKanbanColumn(columnId, {
        columna_nombre: tempColumnName,
        columna_color: tempColumnColor,
      });

      if (result.success) {
        setColumns((prev) =>
          prev.map((col) =>
            col.id === columnId
              ? { ...col, columna_nombre: tempColumnName, columna_color: tempColumnColor }
              : col
          )
        );
        setEditingColumn(null);
        setMessage({ type: 'success', text: 'Columna actualizada' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al actualizar' });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Error inesperado' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveColumn = async (columnId: string, direction: 'up' | 'down') => {
    const currentIndex = columns.findIndex((c) => c.id === columnId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;

    const newColumns = [...columns];
    [newColumns[currentIndex], newColumns[newIndex]] = [
      newColumns[newIndex],
      newColumns[currentIndex],
    ];

    const columnOrders = newColumns.map((col, idx) => ({
      id: col.id,
      orden: idx,
    }));

    setColumns(newColumns);

    try {
      const result = await reorderKanbanColumns(columnOrders);
      if (!result.success) {
        setColumns(columns);
        setMessage({ type: 'error', text: 'Error al reordenar' });
      }
    } catch {
      setColumns(columns);
      setMessage({ type: 'error', text: 'Error inesperado' });
    }
  };

  const startEditColumn = (column: KanbanColumn) => {
    setEditingColumn(column.id);
    setTempColumnName(column.columna_nombre);
    setTempColumnColor(column.columna_color);
  };

  // Clear message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (user?.rol !== 'admin') {
    return null;
  }

  // Orden de categorías
  const categoryOrder = ['sin_tipificar', 'contactado', 'no_contactado', 'seguimiento', 'otros'];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Configuración Kanban"
        subtitle="Personaliza las columnas y mapeos del pipeline"
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Configuración del Kanban</h1>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message.type === 'success' && <Check className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columns Configuration - 1 column */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold">Columnas del Pipeline</h2>
              </div>

              <div className="space-y-3">
                {columns.map((column, index) => (
                  <div
                    key={column.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400" />

                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: column.columna_color }}
                    />

                    {editingColumn === column.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={tempColumnName}
                          onChange={(e) => setTempColumnName(e.target.value)}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                          placeholder="Nombre"
                        />
                        <input
                          type="color"
                          value={tempColumnColor}
                          onChange={(e) => setTempColumnColor(e.target.value)}
                          className="w-8 h-8 cursor-pointer"
                        />
                        <button
                          onClick={() => handleSaveColumn(column.id)}
                          disabled={isSaving}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingColumn(null)}
                          className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          className="flex-1 cursor-pointer hover:text-blue-600"
                          onClick={() => startEditColumn(column)}
                        >
                          {column.columna_nombre}
                        </span>
                        <span className="text-xs text-gray-400">{column.columna_codigo}</span>
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleMoveColumn(column.id, 'up')}
                            disabled={index === 0}
                            className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMoveColumn(column.id, 'down')}
                            disabled={index === columns.length - 1}
                            className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mappings Configuration - 2 columns */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold">Mapeo de Tipificaciones</h2>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Define en qué columna del Kanban aparece cada combinación de tipificación (Nivel 1 +
                Nivel 2).
              </p>

              {/* Árbol jerárquico por categoría */}
              <div className="space-y-2">
                {categoryOrder.map((category) => {
                  const combinations = combinationsByCategory[category] || [];
                  const isExpanded = expandedCategories.includes(category);
                  const categoryLabel = NIVEL_1_LABELS[category] || category;

                  return (
                    <div key={category} className="border rounded-lg overflow-hidden">
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="font-medium text-gray-700">{categoryLabel}</span>
                          <span className="text-xs text-gray-400">
                            ({combinations.length} combinaciones)
                          </span>
                        </div>
                      </button>

                      {/* Combinations */}
                      {isExpanded && (
                        <div className="divide-y">
                          {combinations.map((combo) => {
                            const key = getCombinationKey(combo.nivel_1, combo.nivel_2);
                            const currentColumn = getColumnForCombination(
                              combo.nivel_1,
                              combo.nivel_2
                            );
                            const isSavingThis = savingKey === key;
                            const isFallback = combo.nivel_2 === null && combo.nivel_1 !== null;

                            return (
                              <div
                                key={key}
                                className={`flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 ${
                                  isFallback ? 'bg-yellow-50/50' : ''
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isFallback ? (
                                    <span className="text-xs text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded">
                                      fallback
                                    </span>
                                  ) : (
                                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                                  )}
                                  <span className="text-sm text-gray-700">
                                    {combo.nivel_2 ? (
                                      <>
                                        <span className="text-gray-400">→</span> {combo.label}
                                      </>
                                    ) : (
                                      combo.label
                                    )}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {isSavingThis && (
                                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                  )}
                                  <select
                                    value={currentColumn}
                                    onChange={(e) =>
                                      handleColumnChange(combo.nivel_1, combo.nivel_2, e.target.value)
                                    }
                                    disabled={isSavingThis}
                                    className="text-sm border rounded px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    style={{
                                      borderColor:
                                        columns.find((c) => c.columna_codigo === currentColumn)
                                          ?.columna_color || '#e5e7eb',
                                    }}
                                  >
                                    {columns.map((col) => (
                                      <option key={col.columna_codigo} value={col.columna_codigo}>
                                        {col.columna_nombre}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Instrucciones</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Haz clic en el nombre de una columna para editar su nombre y color</li>
            <li>• Usa las flechas para reordenar las columnas del pipeline</li>
            <li>
              • Cada combinación de tipificación (N1 + N2) puede asignarse a una columna del Kanban
            </li>
            <li>
              • Los <span className="bg-yellow-100 px-1 rounded text-yellow-700">fallback</span> se
              usan cuando solo hay Nivel 1 sin Nivel 2
            </li>
            <li>• Los cambios se guardan automáticamente al seleccionar una columna</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
