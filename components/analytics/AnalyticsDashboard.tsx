// ============================================================================
// COMPONENT: Analytics Dashboard
// ============================================================================
// Dashboard con métricas de uso del sistema
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import {
  Users,
  Clock,
  MousePointer,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Activity,
  Eye,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface AnalyticsSummary {
  usuarios_unicos: number;
  total_sesiones: number;
  duracion_promedio_segundos: number;
  total_pageviews: number;
}

interface UserSession {
  email: string;
  nombre: string;
  sesiones: number;
  tiempo_total_segundos: number;
  pageviews: number;
  ultima_sesion: string;
}

interface TopPage {
  pagina: string;
  visitas: number;
}

interface DailyActivity {
  fecha: string;
  usuarios: number;
  sesiones: number;
}

interface AnalyticsData {
  summary: AnalyticsSummary | null;
  userSessions: UserSession[];
  topPages: TopPage[];
  dailyActivity: DailyActivity[];
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatPageUrl(url: string): string {
  if (!url) return 'Desconocido';
  try {
    const urlObj = new URL(url);
    return urlObj.pathname || '/';
  } catch {
    return url;
  }
}

export default function AnalyticsDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<Record<string, string> | null>(null);
  const [days, setDays] = useState(7);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInstructions(null);

    try {
      const response = await fetch(`/api/analytics/sessions?days=${days}`);
      const result = await response.json();

      if (!result.success) {
        if (result.instructions) {
          setInstructions(result.instructions);
        }
        throw new Error(result.message || result.error || 'Error al cargar analytics');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      // Solo admin y jefe_ventas pueden ver analytics
      if (!['admin', 'jefe_ventas'].includes(user.rol || '')) {
        router.push('/operativo');
        return;
      }
      fetchAnalytics();
    }
  }, [user, authLoading, router, fetchAnalytics]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Analytics" subtitle="Métricas de uso del sistema" />
        <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-gray-600">Cargando analytics...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Analytics" subtitle="Métricas de uso del sistema" />
        <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800">Analytics no configurado</h3>
                  <p className="text-yellow-700 mt-1">{error}</p>

                  {instructions && (
                    <div className="mt-4 bg-white rounded-lg p-4 border border-yellow-100">
                      <h4 className="font-medium text-gray-900 mb-3">Pasos para configurar:</h4>
                      <ol className="space-y-2 text-sm text-gray-700">
                        {Object.entries(instructions).map(([key, value]) => (
                          <li key={key} className="flex gap-2">
                            <span className="font-medium text-primary">{key.replace('step', '')}.</span>
                            <span>{value}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                    <p className="text-xs font-mono text-gray-600">
                      # Agregar a .env.local:<br/>
                      POSTHOG_PERSONAL_API_KEY=phx_...<br/>
                      POSTHOG_PROJECT_ID=12345
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const summary = data?.summary;
  const chartData = data?.dailyActivity?.map((d) => ({
    fecha: new Date(d.fecha).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' }),
    usuarios: d.usuarios,
    sesiones: d.sesiones,
  })) || [];

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Analytics" subtitle="Métricas de uso del sistema" />
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="flex items-center justify-end gap-4 mb-8">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={14}>Últimos 14 días</option>
            <option value={30}>Últimos 30 días</option>
          </select>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Usuarios Únicos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary?.usuarios_unicos || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Sesiones Totales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary?.total_sesiones || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Duración Promedio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDuration(summary?.duracion_promedio_segundos || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Eye className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Pageviews</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary?.total_pageviews || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Activity Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Actividad Diaria
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="usuarios"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Usuarios"
                  />
                  <Line
                    type="monotone"
                    dataKey="sesiones"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Sesiones"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Pages Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MousePointer className="w-5 h-5 text-primary" />
              Páginas Más Visitadas
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.topPages?.slice(0, 5).map((p) => ({
                    pagina: formatPageUrl(p.pagina),
                    visitas: p.visitas,
                  })) || []}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="pagina" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="visitas" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Actividad por Usuario
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-6 text-sm font-semibold text-gray-600">
                    Usuario
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                    Sesiones
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                    Tiempo Total
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
                    Pageviews
                  </th>
                  <th className="text-right py-3 px-6 text-sm font-semibold text-gray-600">
                    Última Sesión
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.userSessions?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No hay datos de sesiones aún
                    </td>
                  </tr>
                ) : (
                  data?.userSessions?.map((user, idx) => (
                    <tr
                      key={user.email || idx}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.nombre || 'Sin nombre'}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {user.sesiones}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center font-medium text-gray-900">
                        {formatDuration(user.tiempo_total_segundos)}
                      </td>
                      <td className="py-4 px-4 text-center text-gray-600">
                        {user.pageviews}
                      </td>
                      <td className="py-4 px-6 text-right text-sm text-gray-500">
                        {user.ultima_sesion
                          ? new Date(user.ultima_sesion).toLocaleDateString('es-PE', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
