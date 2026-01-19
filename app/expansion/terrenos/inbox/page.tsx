'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getAllTerrenos } from '@/lib/actions-expansion';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import {
  TERRENO_ESTADO_LABELS,
  TERRENO_ESTADO_COLORS,
  TIPO_TERRENO_LABELS,
} from '@/lib/types/expansion';
import type { Terreno, TerrenoEstado } from '@/lib/types/expansion';

const ESTADOS_FILTRO: { value: TerrenoEstado | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'enviado', label: 'Enviados' },
  { value: 'en_revision', label: 'En Revisión' },
  { value: 'info_adicional', label: 'Info Adicional' },
  { value: 'evaluacion', label: 'Evaluación' },
  { value: 'visita_programada', label: 'Visita Programada' },
  { value: 'visitado', label: 'Visitados' },
  { value: 'negociacion', label: 'Negociación' },
  { value: 'aprobado', label: 'Aprobados' },
  { value: 'rechazado', label: 'Rechazados' },
];

export default function TerrenosInboxPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [terrenos, setTerrenos] = useState<Terreno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<TerrenoEstado | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    enviados: 0,
    en_revision: 0,
    aprobados: 0,
    rechazados: 0,
  });

  // Verificar permisos
  const rolesPermitidos = ['superadmin', 'admin', 'gerencia', 'legal'];
  const tienePermiso = user && rolesPermitidos.includes(user.rol);

  const cargarTerrenos = async () => {
    setLoading(true);
    setError(null);
    try {
      const filtros = filtroEstado !== 'todos' ? { estado: filtroEstado } : {};
      const result = await getAllTerrenos(filtros);

      if (result.success) {
        // getAllTerrenos retorna { terrenos: [...], total: N, ... }
        // El inbox solo muestra terrenos NO en borrador (enviados para revisión)
        const allData = result.data?.terrenos || [];
        const data = allData.filter((t: Terreno) => t.estado !== 'borrador');
        setTerrenos(data);

        // Calcular stats
        setStats({
          total: data.length,
          enviados: data.filter((t: Terreno) => t.estado === 'enviado').length,
          en_revision: data.filter((t: Terreno) =>
            ['en_revision', 'evaluacion', 'visita_programada'].includes(t.estado)
          ).length,
          aprobados: data.filter((t: Terreno) => t.estado === 'aprobado').length,
          rechazados: data.filter((t: Terreno) => t.estado === 'rechazado').length,
        });
      } else {
        setTerrenos([]);
        setError(result.error || 'Error al cargar terrenos');
      }
    } catch (err) {
      setTerrenos([]);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tienePermiso) {
      cargarTerrenos();
    }
  }, [filtroEstado, tienePermiso]);

  // Filtrar por búsqueda - validación defensiva para evitar error si terrenos no es array
  const terrenosFiltrados = Array.isArray(terrenos)
    ? terrenos.filter((t) => {
        if (!busqueda) return true;
        const search = busqueda.toLowerCase();
        return (
          t.codigo?.toLowerCase().includes(search) ||
          t.direccion?.toLowerCase().includes(search) ||
          t.distrito?.toLowerCase().includes(search) ||
          t.provincia?.toLowerCase().includes(search)
        );
      })
    : [];

  // Mostrar loading mientras se carga la autenticación
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader
          title="Bandeja de Terrenos"
          subtitle="Cargando..."
        />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b967a]"></div>
        </div>
      </div>
    );
  }

  if (!tienePermiso) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader
          title="Bandeja de Terrenos"
          subtitle="Acceso restringido"
        />
        <div className="flex items-center justify-center py-12">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
            <p className="text-gray-600">No tienes permisos para acceder a esta sección.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con menú */}
      <DashboardHeader
        title="Bandeja de Terrenos"
        subtitle="Revisa y gestiona las propuestas de terrenos de corredores"
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.enviados}</p>
                <p className="text-xs text-gray-500">Enviados</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Eye className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.en_revision}</p>
                <p className="text-xs text-gray-500">En Revisión</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.aprobados}</p>
                <p className="text-xs text-gray-500">Aprobados</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.rechazados}</p>
                <p className="text-xs text-gray-500">Rechazados</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, dirección, distrito..."
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
                onChange={(e) => setFiltroEstado(e.target.value as TerrenoEstado | 'todos')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
              >
                {ESTADOS_FILTRO.map((estado) => (
                  <option key={estado.value} value={estado.value}>
                    {estado.label}
                  </option>
                ))}
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

        {/* Tabla */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1b967a]"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center">{error}</div>
        ) : terrenosFiltrados.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay terrenos</h3>
            <p className="text-gray-600">
              {filtroEstado !== 'todos'
                ? 'No hay terrenos con este estado'
                : 'Aún no hay propuestas de terrenos'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Código
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ubicación
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Área
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Precio
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {terrenosFiltrados.map((terreno) => {
                    const estadoColors = TERRENO_ESTADO_COLORS[terreno.estado];
                    return (
                      <tr key={terreno.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-[#192c4d]">{terreno.codigo}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                              {terreno.direccion}
                            </p>
                            <p className="text-xs text-gray-500">
                              {terreno.distrito}, {terreno.provincia}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">
                            {terreno.area_total_m2?.toLocaleString()} m²
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">
                            {TIPO_TERRENO_LABELS[terreno.tipo_terreno]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {terreno.precio_solicitado ? (
                            <span className="text-sm font-medium text-[#1b967a]">
                              {terreno.moneda} {terreno.precio_solicitado?.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${estadoColors.bg} ${estadoColors.text}`}
                          >
                            {TERRENO_ESTADO_LABELS[terreno.estado]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="w-3 h-3" />
                            {terreno.enviado_at
                              ? new Date(terreno.enviado_at).toLocaleDateString('es-PE')
                              : new Date(terreno.created_at).toLocaleDateString('es-PE')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => router.push(`/expansion/terrenos/inbox/${terreno.id}`)}
                            className="p-2 text-[#1b967a] hover:bg-[#1b967a]/10 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
