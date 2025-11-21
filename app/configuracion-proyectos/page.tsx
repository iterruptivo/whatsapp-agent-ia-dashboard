'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import {
  getProyectosWithConfigurations,
  saveProyectoConfiguracion,
  Proyecto,
  ProyectoWithConfig,
  PorcentajeInicial
} from '@/lib/actions-proyecto-config';
import { Save, ChevronDown, ChevronUp, ChevronUp as ArrowUp, ChevronDown as ArrowDown, X, Plus } from 'lucide-react';

interface ProyectoFormData {
  tea: string;
  color: string;
  activo: boolean;
  porcentajes_inicial: PorcentajeInicial[];
  nuevoPorcentaje: string;
  saving: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
}

export default function ConfiguracionProyectos() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProyectos, setExpandedProyectos] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<Record<string, ProyectoFormData>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const result = await getProyectosWithConfigurations();

      if (!result.success || !result.data) {
        console.error('Error loading proyectos:', result.message);
        setLoading(false);
        return;
      }

      const proyectosData = result.data.map(p => p.proyecto);
      setProyectos(proyectosData);

      if (proyectosData.length > 0) {
        setExpandedProyectos(new Set([proyectosData[0].id]));
      }

      const initialFormData: Record<string, ProyectoFormData> = {};
      for (const { proyecto, configuracion } of result.data) {
        initialFormData[proyecto.id] = {
          tea: configuracion?.tea?.toString() || '',
          color: proyecto.color || '#1b967a',
          activo: proyecto.activo,
          porcentajes_inicial: configuracion?.configuraciones_extra?.porcentajes_inicial || [],
          nuevoPorcentaje: '',
          saving: false,
          message: null,
        };
      }
      setFormData(initialFormData);

      setLoading(false);
    }

    if (user) {
      loadData();
    }
  }, [user]);

  const toggleProyecto = (proyectoId: string) => {
    setExpandedProyectos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(proyectoId)) {
        newSet.delete(proyectoId);
      } else {
        newSet.add(proyectoId);
      }
      return newSet;
    });
  };

  const updateFormData = (proyectoId: string, field: keyof ProyectoFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [proyectoId]: {
        ...prev[proyectoId],
        [field]: value,
      },
    }));
  };

  const handleSave = async (proyectoId: string) => {
    const data = formData[proyectoId];
    if (!data) return;

    const teaValue = data.tea.trim() === '' ? null : parseFloat(data.tea);

    if (teaValue !== null && (isNaN(teaValue) || teaValue <= 0 || teaValue > 100)) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'TEA debe ser un número mayor a 0 y menor o igual a 100',
      });
      return;
    }

    if (!data.color || !/^#[0-9A-F]{6}$/i.test(data.color)) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'Color debe ser un código hexadecimal válido (ej: #1b967a)',
      });
      return;
    }

    updateFormData(proyectoId, 'saving', true);
    updateFormData(proyectoId, 'message', null);

    const result = await saveProyectoConfiguracion(proyectoId, {
      tea: teaValue,
      color: data.color,
      activo: data.activo,
      porcentajes_inicial: data.porcentajes_inicial,
    });

    updateFormData(proyectoId, 'saving', false);

    if (result.success) {
      updateFormData(proyectoId, 'message', { type: 'success', text: result.message });
      setTimeout(() => {
        updateFormData(proyectoId, 'message', null);
      }, 3000);
    } else {
      updateFormData(proyectoId, 'message', { type: 'error', text: result.message });
    }
  };

  const handleAgregarPorcentaje = (proyectoId: string) => {
    const data = formData[proyectoId];
    if (!data) return;

    const value = parseFloat(data.nuevoPorcentaje);

    if (isNaN(value) || value <= 0 || value > 100) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'Porcentaje debe ser un número mayor a 0 y menor o igual a 100',
      });
      return;
    }

    if (data.porcentajes_inicial.some(p => p.value === value)) {
      updateFormData(proyectoId, 'message', {
        type: 'error',
        text: 'Este porcentaje ya existe',
      });
      return;
    }

    const newPorcentaje: PorcentajeInicial = {
      value,
      order: data.porcentajes_inicial.length
    };

    updateFormData(proyectoId, 'porcentajes_inicial', [...data.porcentajes_inicial, newPorcentaje]);
    updateFormData(proyectoId, 'nuevoPorcentaje', '');
    updateFormData(proyectoId, 'message', null);
  };

  const handleEliminarPorcentaje = (proyectoId: string, index: number) => {
    const data = formData[proyectoId];
    if (!data) return;

    const updated = data.porcentajes_inicial.filter((_, i) => i !== index);
    const reordered = updated.map((p, i) => ({ ...p, order: i }));

    updateFormData(proyectoId, 'porcentajes_inicial', reordered);
  };

  const handleMoverPorcentaje = (proyectoId: string, index: number, direction: 'up' | 'down') => {
    const data = formData[proyectoId];
    if (!data) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= data.porcentajes_inicial.length) return;

    const updated = [...data.porcentajes_inicial];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];

    const reordered = updated.map((p, i) => ({ ...p, order: i }));

    updateFormData(proyectoId, 'porcentajes_inicial', reordered);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Configuración de Proyectos"
        subtitle="Gestiona la configuración de todos los proyectos"
      />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Configuración de Proyectos
          </h2>

          <div className="space-y-4">
            {proyectos.map((proyecto) => {
              const isExpanded = expandedProyectos.has(proyecto.id);
              const data = formData[proyecto.id];

              return (
                <div
                  key={proyecto.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleProyecto(proyecto.id)}
                    className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: data?.color || proyecto.color || '#1b967a' }}
                      />
                      <span className="text-lg font-semibold text-gray-900">
                        {proyecto.nombre}
                      </span>
                      {!proyecto.activo && (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </button>

                  {isExpanded && data && (
                    <div className="px-6 py-6">
                      {/* Grid 2 columnas en desktop, apilado en mobile */}
                      <div className="grid lg:grid-cols-2 gap-8 mb-6">

                        {/* Columna Izquierda: TEA + Color + Estado */}
                        <div className="space-y-6">
                          {/* TEA del proyecto */}
                          <div>
                            <label
                              htmlFor={`tea-${proyecto.id}`}
                              className="block text-lg font-semibold text-gray-900 mb-1"
                            >
                              TEA del proyecto
                            </label>
                            <p className="text-sm text-gray-500 mb-4">
                              Este dato se usará para financiamiento del proyecto
                            </p>
                            <input
                              type="number"
                              id={`tea-${proyecto.id}`}
                              value={data.tea}
                              onChange={(e) => updateFormData(proyecto.id, 'tea', e.target.value)}
                              placeholder="Ej: 18.5"
                              min="0.01"
                              max="100"
                              step="0.01"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                            />
                          </div>

                          <div className="border-t border-gray-200"></div>

                          {/* Color del proyecto */}
                          <div>
                            <label
                              htmlFor={`color-${proyecto.id}`}
                              className="block text-lg font-semibold text-gray-900 mb-1"
                            >
                              Color del proyecto
                            </label>
                            <p className="text-sm text-gray-500 mb-4">
                              Color para identificación visual en el dashboard
                            </p>
                            <div className="flex gap-3 items-center">
                              <input
                                type="color"
                                id={`color-${proyecto.id}`}
                                value={data.color}
                                onChange={(e) => updateFormData(proyecto.id, 'color', e.target.value)}
                                className="h-12 w-20 rounded-lg border border-gray-300 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={data.color}
                                onChange={(e) => updateFormData(proyecto.id, 'color', e.target.value)}
                                placeholder="#1b967a"
                                maxLength={7}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors font-mono"
                              />
                              <div
                                className="h-12 w-24 rounded-lg border border-gray-300 flex items-center justify-center text-white font-medium text-sm"
                                style={{ backgroundColor: data.color }}
                              >
                                Preview
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-gray-200"></div>

                          {/* Estado Activo/Inactivo */}
                          <div>
                            <label className="block text-lg font-semibold text-gray-900 mb-1">
                              Estado del proyecto
                            </label>
                            <p className="text-sm text-gray-500 mb-4">
                              Proyecto activo en el sistema
                            </p>
                            <button
                              type="button"
                              onClick={() => updateFormData(proyecto.id, 'activo', !data.activo)}
                              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                                data.activo ? 'bg-primary' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                  data.activo ? 'translate-x-9' : 'translate-x-1'
                                }`}
                              />
                            </button>
                            <span className="ml-3 text-sm font-medium text-gray-900">
                              {data.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </div>

                        {/* Columna Derecha: Porcentajes de Inicial */}
                        <div>
                        <label className="block text-lg font-semibold text-gray-900 mb-1">
                          Porcentajes de Inicial
                        </label>
                        <p className="text-sm text-gray-500 mb-4">
                          Gestiona los porcentajes de inicial disponibles para este proyecto
                        </p>

                        {/* Input para agregar porcentaje */}
                        <div className="flex gap-2 mb-4">
                          <input
                            type="number"
                            value={data.nuevoPorcentaje}
                            onChange={(e) => updateFormData(proyecto.id, 'nuevoPorcentaje', e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAgregarPorcentaje(proyecto.id);
                              }
                            }}
                            placeholder="Ej: 30"
                            min="0.01"
                            max="100"
                            step="0.01"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => handleAgregarPorcentaje(proyecto.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Agregar
                          </button>
                        </div>

                        {/* Lista de porcentajes */}
                        {data.porcentajes_inicial.length > 0 && (
                          <div className="space-y-2">
                            {data.porcentajes_inicial.map((porcentaje, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                              >
                                <span className="text-sm font-medium text-gray-600 min-w-[30px]">
                                  {index + 1}°
                                </span>
                                <span className="flex-1 text-base font-semibold text-gray-900">
                                  {porcentaje.value}%
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleMoverPorcentaje(proyecto.id, index, 'up')}
                                    disabled={index === 0}
                                    className={`p-1 rounded ${
                                      index === 0
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoverPorcentaje(proyecto.id, index, 'down')}
                                    disabled={index === data.porcentajes_inicial.length - 1}
                                    className={`p-1 rounded ${
                                      index === data.porcentajes_inicial.length - 1
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarPorcentaje(proyecto.id, index)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {data.porcentajes_inicial.length === 0 && (
                          <p className="text-sm text-gray-400 italic">
                            No hay porcentajes configurados. Agrega uno para comenzar.
                          </p>
                        )}
                        </div>
                      </div>

                      {/* Botón Guardar y Mensajes */}
                      <div className="border-t border-gray-200 pt-6">
                        <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleSave(proyecto.id)}
                          disabled={data.saving}
                          className={`flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                            data.saving
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-primary text-white hover:bg-primary/90 hover:shadow-md active:scale-95'
                          }`}
                        >
                          <Save className="w-5 h-5" />
                          {data.saving ? 'Guardando...' : 'Guardar'}
                        </button>

                        {data.message && (
                          <div
                            className={`flex-1 p-3 rounded-lg text-sm ${
                              data.message.type === 'success'
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}
                          >
                            {data.message.text}
                          </div>
                        )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
