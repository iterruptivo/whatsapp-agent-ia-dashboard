'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MapPin, Filter, Search, RefreshCw } from 'lucide-react';
import { getMisTerrenos } from '@/lib/actions-expansion';
import { TerrenoCard } from '@/components/expansion/terrenos';
import type { Terreno } from '@/lib/types/expansion';

export default function TerrenosPage() {
  const router = useRouter();
  const [terrenos, setTerrenos] = useState<Terreno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');

  const cargarTerrenos = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMisTerrenos();
      if (result.success) {
        setTerrenos(result.data || []);
      } else {
        setError(result.error || 'Error al cargar terrenos');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTerrenos();
  }, []);

  // Filtrar terrenos
  const terrenosFiltrados = terrenos.filter(t => {
    const matchEstado = filtroEstado === 'todos' || t.estado === filtroEstado;
    const matchBusqueda = !busqueda ||
      t.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.direccion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.distrito?.toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusqueda;
  });

  // Contar por estado
  const contadores = {
    todos: terrenos.length,
    borrador: terrenos.filter(t => t.estado === 'borrador').length,
    enviado: terrenos.filter(t => t.estado === 'enviado').length,
    en_revision: terrenos.filter(t => ['en_revision', 'evaluacion', 'visita_programada'].includes(t.estado)).length,
    aprobado: terrenos.filter(t => t.estado === 'aprobado').length,
    rechazado: terrenos.filter(t => t.estado === 'rechazado').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#192c4d] flex items-center gap-2">
                <MapPin className="w-7 h-7 text-[#1b967a]" />
                Mis Terrenos
              </h1>
              <p className="text-gray-600 mt-1">
                Gestiona tus propuestas de terrenos para EcoPlaza
              </p>
            </div>
            <button
              onClick={() => router.push('/expansion/terrenos/nuevo')}
              className="flex items-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#158a6e] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nuevo Terreno
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, dirección o distrito..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
                />
              </div>
            </div>

            {/* Filtro estado */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
              >
                <option value="todos">Todos ({contadores.todos})</option>
                <option value="borrador">Borradores ({contadores.borrador})</option>
                <option value="enviado">Enviados ({contadores.enviado})</option>
                <option value="en_revision">En Revisión ({contadores.en_revision})</option>
                <option value="aprobado">Aprobados ({contadores.aprobado})</option>
                <option value="rechazado">Rechazados ({contadores.rechazado})</option>
              </select>

              <button
                onClick={cargarTerrenos}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-[#1b967a] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Actualizar"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1b967a]"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center">
            {error}
          </div>
        ) : terrenosFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {terrenos.length === 0 ? 'No tienes terrenos registrados' : 'No se encontraron terrenos'}
            </h3>
            <p className="text-gray-600 mb-6">
              {terrenos.length === 0
                ? 'Comienza agregando tu primera propuesta de terreno'
                : 'Intenta con otros filtros de búsqueda'}
            </p>
            {terrenos.length === 0 && (
              <button
                onClick={() => router.push('/expansion/terrenos/nuevo')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#158a6e] transition-colors"
              >
                <Plus className="w-5 h-5" />
                Agregar Terreno
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {terrenosFiltrados.map((terreno) => (
              <TerrenoCard
                key={terreno.id}
                terreno={terreno}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
