'use client';

/**
 * AtribucionIATab - Victoria Sales Attribution Dashboard
 * Session 74 - Sistema de Atribución de Ventas IA
 *
 * Features:
 * - Import Excel sales from call center
 * - KPI cards with Victoria attribution
 * - Paginated tables with lazy loading
 * - Lead detail modal
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload,
  Bot,
  Users,
  HelpCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  Check
} from 'lucide-react';
import {
  getVentasStats,
  getVentasPaginated,
  getVentasStatsByMonth,
  getAvailableMonths,
  type VentasStats,
  type VentaExterna,
  type PaginatedResult
} from '@/lib/actions-ventas-ia';
import ImportVentasModal from './ImportVentasModal';
import LeadDetalleModal from './LeadDetalleModal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface Usuario {
  id: string;
  nombre: string;
  rol: string;
}

interface AtribucionIATabProps {
  user: Usuario;
}

// Colores para gráficos
const COLORS = {
  victoria: '#1b967a',   // Verde EcoPlaza
  otroUtm: '#3b82f6',    // Azul
  sinLead: '#9ca3af',    // Gris
};

// Helper para formatear mes
function formatMes(mes: string): string {
  const [year, month] = mes.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${meses[parseInt(month) - 1]} ${year.slice(2)}`;
}

// Helper para formatear monto
function formatMonto(monto: number | null): string {
  if (!monto) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

// Helper para calcular fechas de presets
function getPresetDates(preset: string): { desde: string; hasta: string } {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  switch (preset) {
    case 'last3': {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return {
        desde: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`,
        hasta: currentMonth
      };
    }
    case 'last6': {
      const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return {
        desde: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`,
        hasta: currentMonth
      };
    }
    case 'ytd': {
      return {
        desde: `${now.getFullYear()}-01`,
        hasta: currentMonth
      };
    }
    case 'last12': {
      const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      return {
        desde: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`,
        hasta: currentMonth
      };
    }
    case 'all':
    default:
      return { desde: '', hasta: '' };
  }
}

// Presets disponibles
const DATE_PRESETS = [
  { id: 'last3', label: 'Últimos 3M', shortLabel: '3M' },
  { id: 'last6', label: 'Últimos 6M', shortLabel: '6M' },
  { id: 'ytd', label: 'Este Año', shortLabel: 'YTD' },
  { id: 'last12', label: 'Últimos 12M', shortLabel: '12M' },
  { id: 'all', label: 'Todo', shortLabel: 'Todo' },
];

// Generar opciones de meses (últimos 24 meses)
function generateMonthOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const now = new Date();

  for (let i = 0; i < 24; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = formatMes(value);
    options.push({ value, label });
  }

  return options;
}

export default function AtribucionIATab({ user }: AtribucionIATabProps) {
  // Estados de datos
  const [stats, setStats] = useState<VentasStats | null>(null);
  const [ventasVictoria, setVentasVictoria] = useState<PaginatedResult<VentaExterna> | null>(null);
  const [ventasOtras, setVentasOtras] = useState<PaginatedResult<VentaExterna> | null>(null);
  const [statsByMonth, setStatsByMonth] = useState<Array<{ mes: string; victoria: number; otros: number; sinLead: number }>>([]);

  // Loading independiente por sección
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingVictoria, setLoadingVictoria] = useState(true);
  const [loadingOtras, setLoadingOtras] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros - Default: Últimos 6 meses
  const [selectedPreset, setSelectedPreset] = useState<string>('last6');
  const [mesDesde, setMesDesde] = useState<string>(() => getPresetDates('last6').desde);
  const [mesHasta, setMesHasta] = useState<string>(() => getPresetDates('last6').hasta);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const monthOptions = generateMonthOptions();

  // Paginación
  const [pageVictoria, setPageVictoria] = useState(1);
  const [pageOtras, setPageOtras] = useState(1);
  const pageSize = 10;

  // Modales
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState<{ leadId: string; ventaId: string } | null>(null);

  // Vista activa (victoria vs otras)
  const [activeView, setActiveView] = useState<'victoria' | 'otras'>('victoria');

  // Refs para evitar llamadas duplicadas
  const isInitialMount = useRef(true);
  const currentFilters = useRef({ mesDesde, mesHasta });

  // Cargar stats (KPI cards)
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const statsData = await getVentasStats(mesDesde || undefined, mesHasta || undefined);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [mesDesde, mesHasta]);

  // Cargar charts (gráficos)
  const loadCharts = useCallback(async () => {
    setLoadingCharts(true);
    try {
      const monthData = await getVentasStatsByMonth(mesDesde || undefined, mesHasta || undefined);
      setStatsByMonth(monthData);
    } catch (error) {
      console.error('Error loading charts:', error);
    } finally {
      setLoadingCharts(false);
    }
  }, [mesDesde, mesHasta]);

  // Cargar solo tabla victoria
  const loadVictoriaTable = useCallback(async () => {
    setLoadingVictoria(true);
    try {
      const victoriaData = await getVentasPaginated(
        'victoria', pageVictoria, pageSize,
        mesDesde || undefined, mesHasta || undefined
      );
      setVentasVictoria(victoriaData);
    } catch (error) {
      console.error('Error loading victoria table:', error);
    } finally {
      setLoadingVictoria(false);
    }
  }, [mesDesde, mesHasta, pageVictoria]);

  // Cargar solo tabla otras
  const loadOtrasTable = useCallback(async () => {
    setLoadingOtras(true);
    try {
      const otrasData = await getVentasPaginated(
        'all', pageOtras, pageSize,
        mesDesde || undefined, mesHasta || undefined
      );
      setVentasOtras(otrasData);
    } catch (error) {
      console.error('Error loading otras table:', error);
    } finally {
      setLoadingOtras(false);
    }
  }, [mesDesde, mesHasta, pageOtras]);

  // Carga inicial - cada sección carga en paralelo con su propio loading
  useEffect(() => {
    // Disparar todas las cargas en paralelo (cada una maneja su propio loading)
    loadStats();
    loadCharts();
    loadVictoriaTable();
    loadOtrasTable();

    // Marcar que ya no es el mount inicial después de un tick
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo en mount inicial

  // Cuando cambian filtros de fecha, recargar todo
  useEffect(() => {
    if (isInitialMount.current) return;

    // Verificar si realmente cambiaron los filtros
    if (currentFilters.current.mesDesde === mesDesde &&
        currentFilters.current.mesHasta === mesHasta) {
      return;
    }

    currentFilters.current = { mesDesde, mesHasta };

    // Cada función maneja su propio loading state
    loadStats();
    loadCharts();
    loadVictoriaTable();
    loadOtrasTable();
  }, [mesDesde, mesHasta, loadStats, loadCharts, loadVictoriaTable, loadOtrasTable]);

  // Cuando cambia página victoria, solo recargar esa tabla
  useEffect(() => {
    if (isInitialMount.current) return;
    loadVictoriaTable();
  }, [pageVictoria, loadVictoriaTable]);

  // Cuando cambia página otras, solo recargar esa tabla
  useEffect(() => {
    if (isInitialMount.current) return;
    loadOtrasTable();
  }, [pageOtras, loadOtrasTable]);

  // Handler para cambiar preset
  const handlePresetChange = (presetId: string) => {
    const { desde, hasta } = getPresetDates(presetId);
    setSelectedPreset(presetId);
    setMesDesde(desde);
    setMesHasta(hasta);
    setShowCustomRange(false);
    setPageVictoria(1);
    setPageOtras(1);
  };

  // Handler para activar rango personalizado
  const handleCustomRangeToggle = () => {
    setShowCustomRange(true);
    setSelectedPreset('');
  };

  // Handler para cambiar mes personalizado
  const handleCustomMonthChange = (type: 'desde' | 'hasta', value: string) => {
    if (type === 'desde') {
      setMesDesde(value);
    } else {
      setMesHasta(value);
    }
    setSelectedPreset('');
    setPageVictoria(1);
    setPageOtras(1);
  };

  // Handler para refrescar manual
  const handleRefresh = () => {
    setRefreshing(true);
    // Disparar todas las cargas en paralelo
    Promise.all([
      loadStats(),
      loadCharts(),
      loadVictoriaTable(),
      loadOtrasTable(),
    ]).finally(() => setRefreshing(false));
  };

  // Handlers de paginación
  const handlePageChangeVictoria = (newPage: number) => {
    setPageVictoria(newPage);
  };

  const handlePageChangeOtras = (newPage: number) => {
    setPageOtras(newPage);
  };

  // Handler para después de importar
  const handleImportComplete = () => {
    setShowImportModal(false);
    handleRefresh();
  };

  // Datos para gráfico de pie
  const pieData = stats ? [
    { name: 'Victoria', value: stats.victoria, color: COLORS.victoria },
    { name: 'Otros UTM', value: stats.otroUtm, color: COLORS.otroUtm },
    { name: 'Sin Lead', value: stats.sinLead, color: COLORS.sinLead },
  ].filter(d => d.value > 0) : [];

  // Datos para gráfico de barras
  const barData = statsByMonth.map(item => ({
    mes: formatMes(item.mes),
    Victoria: item.victoria,
    'Otros UTM': item.otros,
    'Sin Lead': item.sinLead,
  }));

  // Verificar si puede importar
  const canImport = user.rol === 'admin' || user.rol === 'jefe_ventas';

  // Skeleton para KPI cards
  const KPICardSkeleton = () => (
    <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-gray-200 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
          <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
      </div>
    </div>
  );

  // Skeleton para gráficos
  const ChartSkeleton = () => (
    <div className="bg-white rounded-xl shadow-md p-5 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>
      <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
      </div>
    </div>
  );

  // Skeleton para tabla
  const TableSkeleton = () => (
    <div className="p-4 animate-pulse">
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-10 bg-gray-100 rounded flex-1"></div>
            <div className="h-10 bg-gray-100 rounded flex-1"></div>
            <div className="h-10 bg-gray-100 rounded flex-1"></div>
            <div className="h-10 bg-gray-100 rounded w-24"></div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header con botón importar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#192c4d] flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#1b967a]" />
            Atribución de Ventas a Victoria
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Cruce de ventas del call center con leads capturados por la IA
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Botón Refrescar */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {/* Botón Importar (solo admin/jefe_ventas) */}
          {canImport && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a64] transition-colors shadow-md"
            >
              <Upload className="w-4 h-4" />
              <span>Importar Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros por rango - PRESETS + PERSONALIZADO */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 mr-2">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">Período:</span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetChange(preset.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                  selectedPreset === preset.id
                    ? 'bg-[#1b967a] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {selectedPreset === preset.id && <Check className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{preset.label}</span>
                <span className="sm:hidden">{preset.shortLabel}</span>
              </button>
            ))}

            {/* Botón Personalizado */}
            <button
              onClick={handleCustomRangeToggle}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                showCustomRange
                  ? 'bg-[#192c4d] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showCustomRange && <Check className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Personalizado</span>
              <span className="sm:hidden">Custom</span>
            </button>
          </div>

          {/* Indicador de rango actual */}
          {mesDesde && mesHasta && !showCustomRange && (
            <div className="ml-auto text-sm text-gray-500 hidden md:block">
              {formatMes(mesDesde)} → {formatMes(mesHasta)}
            </div>
          )}
        </div>

        {/* Selectores de rango personalizado */}
        {showCustomRange && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-600">Desde:</span>
              <select
                value={mesDesde}
                onChange={(e) => handleCustomMonthChange('desde', e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent bg-white"
              >
                <option value="">Seleccionar mes</option>
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <span className="text-gray-400">→</span>

              <span className="text-sm text-gray-600">Hasta:</span>
              <select
                value={mesHasta}
                onChange={(e) => handleCustomMonthChange('hasta', e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent bg-white"
              >
                <option value="">Seleccionar mes</option>
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Mostrar rango seleccionado */}
              {mesDesde && mesHasta && (
                <div className="ml-auto text-sm font-medium text-[#1b967a]">
                  {formatMes(mesDesde)} → {formatMes(mesHasta)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingStats ? (
          <>
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </>
        ) : (
          <>
            {/* Total Ventas */}
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-gray-400">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Ventas</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{stats?.total || 0}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-gray-500" />
                </div>
              </div>
            </div>

            {/* Ventas Victoria */}
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-[#1b967a]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ventas Victoria</p>
                  <p className="text-3xl font-bold text-[#1b967a] mt-1">{stats?.victoria || 0}</p>
                  <p className="text-sm text-[#1b967a] font-medium mt-1">
                    {stats?.porcentajeVictoria || 0}% del total
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#1b967a]/10 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-[#1b967a]" />
                </div>
              </div>
              {/* Barra de progreso */}
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1b967a] rounded-full transition-all duration-500"
                  style={{ width: `${stats?.porcentajeVictoria || 0}%` }}
                />
              </div>
            </div>

            {/* Otros Canales */}
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Otros Canales</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{stats?.otroUtm || 0}</p>
                  <p className="text-sm text-blue-600 font-medium mt-1">
                    {stats?.total ? Math.round((stats.otroUtm / stats.total) * 100) : 0}% del total
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Sin Lead */}
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Sin Lead</p>
                  <p className="text-3xl font-bold text-gray-600 mt-1">{stats?.sinLead || 0}</p>
                  <p className="text-sm text-gray-500 font-medium mt-1">
                    {stats?.total ? Math.round((stats.sinLead / stats.total) * 100) : 0}% del total
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-gray-500" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Gráficos */}
      {loadingCharts ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : stats && stats.total > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribución de Atribución</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value, 'Ventas']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart por Mes */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Ventas por Mes</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Victoria" fill={COLORS.victoria} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Otros UTM" fill={COLORS.otroUtm} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Sin Lead" fill={COLORS.sinLead} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tabs para tablas */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Tab headers */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveView('victoria')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeView === 'victoria'
                ? 'bg-[#1b967a]/10 text-[#1b967a] border-b-2 border-[#1b967a]'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Ventas Victoria ({stats?.victoria || 0})</span>
          </button>
          <button
            onClick={() => setActiveView('otras')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeView === 'otras'
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Todas las Ventas ({stats?.total || 0})</span>
          </button>
        </div>

        {/* Tabla Victoria */}
        {activeView === 'victoria' && (
          <div className="p-4">
            {loadingVictoria ? (
              <TableSkeleton />
            ) : ventasVictoria && ventasVictoria.data.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#1b967a]/5 text-left">
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Teléfono</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Mes Venta</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Monto</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead Victoria</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ventasVictoria.data.map((venta) => (
                        <tr key={venta.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-mono text-gray-800">{venta.telefono}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">{venta.nombre_cliente || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatMes(venta.mes_venta)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{formatMonto(venta.monto_venta)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#1b967a]/10 text-[#1b967a]">
                              <Bot className="w-3 h-3" />
                              {venta.lead_nombre || 'Lead Victoria'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {venta.lead_id && (
                              <button
                                onClick={() => setSelectedVenta({ leadId: venta.lead_id!, ventaId: venta.id })}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1b967a] bg-[#1b967a]/10 rounded-lg hover:bg-[#1b967a]/20 transition-colors"
                              >
                                <Eye className="w-3 h-3" />
                                Ver Lead
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    Mostrando {((pageVictoria - 1) * pageSize) + 1} - {Math.min(pageVictoria * pageSize, ventasVictoria.totalCount)} de {ventasVictoria.totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChangeVictoria(pageVictoria - 1)}
                      disabled={pageVictoria === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {pageVictoria} de {ventasVictoria.totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChangeVictoria(pageVictoria + 1)}
                      disabled={pageVictoria >= ventasVictoria.totalPages}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay ventas atribuidas a Victoria</p>
                {canImport && (
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="mt-4 text-[#1b967a] hover:underline text-sm"
                  >
                    Importar ventas del call center
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tabla Otras Ventas */}
        {activeView === 'otras' && (
          <div className="p-4">
            {loadingOtras ? (
              <TableSkeleton />
            ) : ventasOtras && ventasOtras.data.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Teléfono</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Mes Venta</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Monto</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Atribución</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ventasOtras.data.map((venta) => (
                        <tr key={venta.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-mono text-gray-800">{venta.telefono}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">{venta.nombre_cliente || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{formatMes(venta.mes_venta)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{formatMonto(venta.monto_venta)}</td>
                          <td className="px-4 py-3">
                            {venta.match_type === 'victoria' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#1b967a]/10 text-[#1b967a]">
                                <Bot className="w-3 h-3" />
                                Victoria
                              </span>
                            ) : venta.match_type === 'otro_utm' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                <Users className="w-3 h-3" />
                                {venta.lead_utm || 'Otro canal'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                <HelpCircle className="w-3 h-3" />
                                Sin Lead
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {venta.lead_id && (
                              <button
                                onClick={() => setSelectedVenta({ leadId: venta.lead_id!, ventaId: venta.id })}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                <Eye className="w-3 h-3" />
                                Ver Lead
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginación */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    Mostrando {((pageOtras - 1) * pageSize) + 1} - {Math.min(pageOtras * pageSize, ventasOtras.totalCount)} de {ventasOtras.totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChangeOtras(pageOtras - 1)}
                      disabled={pageOtras === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {pageOtras} de {ventasOtras.totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChangeOtras(pageOtras + 1)}
                      disabled={pageOtras >= ventasOtras.totalPages}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay ventas importadas</p>
                {canImport && (
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="mt-4 text-[#1b967a] hover:underline text-sm"
                  >
                    Importar ventas del call center
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Importar */}
      {showImportModal && (
        <ImportVentasModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
        />
      )}

      {/* Modal Detalle Lead */}
      {selectedVenta && (
        <LeadDetalleModal
          leadId={selectedVenta.leadId}
          ventaId={selectedVenta.ventaId}
          onClose={() => setSelectedVenta(null)}
        />
      )}
    </div>
  );
}
