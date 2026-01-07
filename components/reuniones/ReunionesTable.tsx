// ============================================================================
// COMPONENT: ReunionesTable
// ============================================================================
// Descripcion: Tabla de reuniones con filtros y paginación
// Features: Click para navegar a detalle, badges de estado
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Video,
  Calendar,
  Clock,
  CheckCircle,
  Loader2 as LoaderIcon,
  AlertCircle,
  ListChecks,
  Search,
} from 'lucide-react';
import { getReuniones } from '@/lib/actions-reuniones';
import { Reunion, ReunionEstado } from '@/types/reuniones';
import ReunionEstadoBadge from './ReunionEstadoBadge';

interface ReunionesTableProps {
  proyectoId: string;
}

export default function ReunionesTable({ proyectoId }: ReunionesTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<ReunionEstado | 'todos'>('todos');

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const params = {
        proyecto_id: proyectoId,
        estado: estadoFiltro !== 'todos' ? estadoFiltro : undefined,
        limit: 50,
      };

      const result = await getReuniones(params);

      if (result.success) {
        let filteredReuniones = result.reuniones;

        // Filtrar por búsqueda localmente
        if (searchTerm) {
          filteredReuniones = filteredReuniones.filter((r) =>
            r.titulo.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        setReuniones(filteredReuniones);
        setTotal(result.total);
      }

      setLoading(false);
    };

    loadData();
  }, [proyectoId, estadoFiltro, searchTerm]);

  // Formatear duración
  const formatDuracion = (segundos: number | null) => {
    if (!segundos) return 'N/A';
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Formatear fecha
  const formatFecha = (fecha: string | null) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <LoaderIcon className="w-6 h-6 animate-spin" />
          <span>Cargando reuniones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header con filtros */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Video className="w-5 h-5" />
            Reuniones Registradas ({total})
          </h2>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
              />
            </div>

            {/* Filtro estado */}
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value as ReunionEstado | 'todos')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
            >
              <option value="todos">Todos los estados</option>
              <option value="procesando">Procesando</option>
              <option value="completado">Completado</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      {reuniones.length === 0 ? (
        <div className="p-12 text-center">
          <Video className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            No hay reuniones registradas
          </h3>
          <p className="text-gray-500">
            Sube tu primera reunión para comenzar con el análisis
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reunión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duración
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action Items
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reuniones.map((reunion) => (
                <tr
                  key={reunion.id}
                  onClick={() => router.push(`/reuniones/${reunion.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Video className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {reunion.titulo}
                        </div>
                        {reunion.participantes && reunion.participantes.length > 0 && (
                          <div className="text-xs text-gray-500">
                            {reunion.participantes.length} participante(s)
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatFecha(reunion.fecha_reunion)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatDuracion(reunion.duracion_segundos)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <ReunionEstadoBadge estado={reunion.estado} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <ListChecks className="w-4 h-4 text-gray-400" />
                      {/* Este número se podría obtener de una query adicional */}
                      <span>Ver detalles</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
