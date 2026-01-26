'use client';

/**
 * AtribucionIATab - Atribución de Fichas a Victoria
 *
 * Muestra las Fichas de Inscripción (ventas reales) y su atribución a Victoria.
 *
 * Un lead es de Victoria si:
 * - Estado: en_conversacion, lead_completo, lead_incompleto, conversacion_abandonada
 * - UTM contiene "form", "victoria", o es numérico (IDs Meta)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Check,
  FileText,
  Download,
  Search,
  X,
  Eye,
  MessageCircle
} from 'lucide-react';
import ChatHistoryModal from '@/components/shared/ChatHistoryModal';
import {
  getFichasAtribucionStats,
  getFichasAtribucionPaginated,
  getFichasAtribucionByMonth,
  getFichasAtribucionExport,
  type FichasAtribucionStats,
  type FichaAtribucion,
  type PaginatedFichasResult,
  type StatsByMonth
} from '@/lib/actions-atribucion-fichas';
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
import * as XLSX from 'xlsx';

interface Usuario {
  id: string;
  nombre: string;
  rol: string;
}

interface AtribucionIATabProps {
  user: Usuario;
  proyectoId?: string;
}

// Colores para gráficos
const COLORS = {
  victoria: '#1b967a',   // Verde EcoPlaza
  otros: '#6b7280',      // Gris
};

// Helper para formatear mes
function formatMes(mes: string): string {
  const [year, month] = mes.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${meses[parseInt(month) - 1]} ${year.slice(2)}`;
}

// Helper para formatear monto
function formatMonto(monto: number): string {
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

export default function AtribucionIATab({ user, proyectoId }: AtribucionIATabProps) {
  // Estados de datos
  const [stats, setStats] = useState<FichasAtribucionStats | null>(null);
  const [fichasVictoria, setFichasVictoria] = useState<PaginatedFichasResult | null>(null);
  const [fichasOtras, setFichasOtras] = useState<PaginatedFichasResult | null>(null);
  const [statsByMonth, setStatsByMonth] = useState<StatsByMonth[]>([]);

  // Loading independiente por sección
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingVictoria, setLoadingVictoria] = useState(true);
  const [loadingOtras, setLoadingOtras] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filtros - Default: Últimos 6 meses
  const [selectedPreset, setSelectedPreset] = useState<string>('last6');
  const [mesDesde, setMesDesde] = useState<string>(() => getPresetDates('last6').desde);
  const [mesHasta, setMesHasta] = useState<string>(() => getPresetDates('last6').hasta);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const monthOptions = generateMonthOptions();

  // Paginación
  const [pageVictoria, setPageVictoria] = useState(1);
  const [pageOtras, setPageOtras] = useState(1);
  const pageSize = 10;

  // Vista activa (victoria vs otras)
  const [activeView, setActiveView] = useState<'victoria' | 'otras'>('victoria');

  // Modal para ver historial de conversación
  const [selectedLead, setSelectedLead] = useState<{ id: string; nombre: string; telefono: string } | null>(null);

  // Refs para evitar llamadas duplicadas
  const isInitialMount = useRef(true);
  const currentFilters = useRef({ mesDesde, mesHasta, proyectoId });

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset página al cambiar búsqueda
  useEffect(() => {
    setPageVictoria(1);
    setPageOtras(1);
  }, [debouncedSearch]);

  // Cargar stats (KPI cards)
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const statsData = await getFichasAtribucionStats(
        mesDesde || undefined,
        mesHasta || undefined,
        proyectoId
      );
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [mesDesde, mesHasta, proyectoId]);

  // Cargar charts (gráficos)
  const loadCharts = useCallback(async () => {
    setLoadingCharts(true);
    try {
      const monthData = await getFichasAtribucionByMonth(
        mesDesde || undefined,
        mesHasta || undefined,
        proyectoId
      );
      setStatsByMonth(monthData);
    } catch (error) {
      console.error('Error loading charts:', error);
    } finally {
      setLoadingCharts(false);
    }
  }, [mesDesde, mesHasta, proyectoId]);

  // Cargar tabla victoria
  const loadVictoriaTable = useCallback(async () => {
    setLoadingVictoria(true);
    try {
      const result = await getFichasAtribucionPaginated(
        'victoria',
        pageVictoria,
        pageSize,
        mesDesde || undefined,
        mesHasta || undefined,
        proyectoId,
        debouncedSearch || undefined
      );
      setFichasVictoria(result);
    } catch (error) {
      console.error('Error loading victoria table:', error);
    } finally {
      setLoadingVictoria(false);
    }
  }, [mesDesde, mesHasta, proyectoId, pageVictoria, debouncedSearch]);

  // Cargar tabla otras
  const loadOtrasTable = useCallback(async () => {
    setLoadingOtras(true);
    try {
      const result = await getFichasAtribucionPaginated(
        'otros',
        pageOtras,
        pageSize,
        mesDesde || undefined,
        mesHasta || undefined,
        proyectoId,
        debouncedSearch || undefined
      );
      setFichasOtras(result);
    } catch (error) {
      console.error('Error loading otras table:', error);
    } finally {
      setLoadingOtras(false);
    }
  }, [mesDesde, mesHasta, proyectoId, pageOtras, debouncedSearch]);

  // Carga inicial
  useEffect(() => {
    loadStats();
    loadCharts();
    loadVictoriaTable();
    loadOtrasTable();

    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando cambian filtros de fecha o proyecto, recargar todo
  useEffect(() => {
    if (isInitialMount.current) return;

    if (
      currentFilters.current.mesDesde === mesDesde &&
      currentFilters.current.mesHasta === mesHasta &&
      currentFilters.current.proyectoId === proyectoId
    ) {
      return;
    }

    currentFilters.current = { mesDesde, mesHasta, proyectoId };

    loadStats();
    loadCharts();
    loadVictoriaTable();
    loadOtrasTable();
  }, [mesDesde, mesHasta, proyectoId, loadStats, loadCharts, loadVictoriaTable, loadOtrasTable]);

  // Cuando cambia página o búsqueda
  useEffect(() => {
    if (isInitialMount.current) return;
    loadVictoriaTable();
  }, [pageVictoria, debouncedSearch, loadVictoriaTable]);

  useEffect(() => {
    if (isInitialMount.current) return;
    loadOtrasTable();
  }, [pageOtras, debouncedSearch, loadOtrasTable]);

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

  // Handler para refrescar
  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([
      loadStats(),
      loadCharts(),
      loadVictoriaTable(),
      loadOtrasTable(),
    ]).finally(() => setRefreshing(false));
  };

  // Handler para exportar Excel
  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await getFichasAtribucionExport(
        activeView === 'victoria' ? 'victoria' : 'otros',
        mesDesde || undefined,
        mesHasta || undefined,
        proyectoId
      );

      const exportData = data.map(f => ({
        'Separación': new Date(f.fecha_ficha).toLocaleDateString('es-PE'),
        'Captura': f.fecha_lead ? new Date(f.fecha_lead).toLocaleDateString('es-PE') : '',
        'Cliente': f.cliente_nombre,
        'DNI': f.cliente_dni,
        'Celular': f.lead_telefono,
        'Local': f.local_codigo,
        'Proyecto': f.proyecto_nombre,
        'UTM': f.lead_utm,
        'Estado': f.lead_estado,
        'USD': f.total_abonado_usd,
        'PEN': f.total_abonado_pen,
        'Canal': f.es_victoria ? 'Victoria' : 'Otro'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Atribución');
      XLSX.writeFile(wb, `atribucion-${activeView}-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setExporting(false);
    }
  };

  // Datos para gráfico de pie
  const pieData = stats ? [
    { name: 'Victoria', value: stats.fichasVictoria, color: COLORS.victoria },
    { name: 'Otros Canales', value: stats.fichasOtros, color: COLORS.otros },
  ].filter(d => d.value > 0) : [];

  // Datos para gráfico de barras
  const barData = statsByMonth.map(item => ({
    mes: formatMes(item.mes),
    Victoria: item.victoria,
    'Otros': item.otros,
  }));

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#192c4d] flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#1b967a]" />
            Atribución de Ventas a Victoria
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Fichas de inscripción atribuidas a la IA vs otros canales
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent w-48"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Botón Refrescar */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {/* Botón Exportar */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a64] transition-colors shadow-md disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Exportando...' : 'Exportar'}</span>
          </button>
        </div>
      </div>

      {/* Filtros por rango */}
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
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b967a]"
              >
                <option value="">Seleccionar</option>
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <span className="text-gray-400">→</span>

              <span className="text-sm text-gray-600">Hasta:</span>
              <select
                value={mesHasta}
                onChange={(e) => handleCustomMonthChange('hasta', e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b967a]"
              >
                <option value="">Seleccionar</option>
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

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
            {/* Total Fichas */}
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-gray-400">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Fichas</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{stats?.totalFichas || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Con lead vinculado</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-gray-500" />
                </div>
              </div>
            </div>

            {/* Fichas Victoria */}
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-[#1b967a]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Fichas Victoria</p>
                  <p className="text-3xl font-bold text-[#1b967a] mt-1">{stats?.fichasVictoria || 0}</p>
                  <p className="text-sm text-[#1b967a] font-medium mt-1">
                    {stats?.porcentajeVictoria || 0}% del total
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#1b967a]/10 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-[#1b967a]" />
                </div>
              </div>
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1b967a] rounded-full transition-all duration-500"
                  style={{ width: `${stats?.porcentajeVictoria || 0}%` }}
                />
              </div>
            </div>

            {/* Monto Victoria */}
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-green-400">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Abonos Victoria</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatMonto(stats?.montoVictoriaUSD || 0)}
                  </p>
                  {(stats?.montoVictoriaPEN || 0) > 0 && (
                    <p className="text-sm text-blue-600 font-medium mt-1">
                      S/ {(stats?.montoVictoriaPEN || 0).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Otros Canales */}
            <div className="bg-white rounded-xl shadow-md p-5 border-l-4 border-gray-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Otros Canales</p>
                  <p className="text-3xl font-bold text-gray-600 mt-1">{stats?.fichasOtros || 0}</p>
                  <p className="text-sm text-gray-500 font-medium mt-1">
                    {stats?.totalFichas ? Math.round(((stats.fichasOtros || 0) / stats.totalFichas) * 100) : 0}% del total
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-gray-500" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Gráficos */}
      {!loadingCharts && stats && stats.totalFichas > 0 && (
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
                  <Tooltip formatter={(value: number) => [value, 'Fichas']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Fichas por Mes</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Victoria" fill={COLORS.victoria} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Otros" fill={COLORS.otros} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

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
            <span>Fichas Victoria ({stats?.fichasVictoria || 0})</span>
          </button>
          <button
            onClick={() => setActiveView('otras')}
            className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeView === 'otras'
                ? 'bg-gray-100 text-gray-700 border-b-2 border-gray-400'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Otros Canales ({stats?.fichasOtros || 0})</span>
          </button>
        </div>

        {/* Tabla Victoria */}
        {activeView === 'victoria' && (
          <div className="p-4">
            {loadingVictoria ? (
              <TableSkeleton />
            ) : fichasVictoria && fichasVictoria.data.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#1b967a]/5 text-left">
                        <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Separación</th>
                        <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Captura</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Local</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">UTM / Estado</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Abonado</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {fichasVictoria.data.map((ficha) => (
                        <tr key={ficha.ficha_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-3 text-sm text-gray-700">
                            {new Date(ficha.fecha_ficha).toLocaleDateString('es-PE')}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-500">
                            {ficha.fecha_lead ? new Date(ficha.fecha_lead).toLocaleDateString('es-PE') : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-800">{ficha.cliente_nombre}</div>
                            <div className="text-xs text-gray-500">{ficha.cliente_dni}</div>
                            {ficha.lead_telefono && (
                              <div className="text-xs text-gray-600 mt-0.5">{ficha.lead_telefono}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-mono text-gray-800">{ficha.local_codigo}</div>
                            <div className="text-xs text-gray-500">{ficha.proyecto_nombre}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#1b967a]/10 text-[#1b967a]">
                              <Bot className="w-3 h-3" />
                              Victoria
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              {ficha.lead_utm || ficha.lead_estado}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {ficha.total_abonado_usd > 0 && (
                              <div className="text-sm font-medium text-green-600">
                                $ {ficha.total_abonado_usd.toLocaleString()}
                              </div>
                            )}
                            {ficha.total_abonado_pen > 0 && (
                              <div className="text-sm font-medium text-blue-600">
                                S/ {ficha.total_abonado_pen.toLocaleString()}
                              </div>
                            )}
                            {ficha.total_abonado_usd === 0 && ficha.total_abonado_pen === 0 && (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {ficha.lead_id ? (
                              <button
                                onClick={() => setSelectedLead({ id: ficha.lead_id, nombre: ficha.cliente_nombre, telefono: ficha.lead_telefono })}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1b967a] bg-[#1b967a]/10 rounded-lg hover:bg-[#1b967a]/20 transition-colors"
                                title="Ver historial de conversación"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                Ver Lead
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
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
                    Mostrando {((pageVictoria - 1) * pageSize) + 1} - {Math.min(pageVictoria * pageSize, fichasVictoria.totalCount)} de {fichasVictoria.totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPageVictoria(p => p - 1)}
                      disabled={pageVictoria === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {pageVictoria} de {fichasVictoria.totalPages}
                    </span>
                    <button
                      onClick={() => setPageVictoria(p => p + 1)}
                      disabled={pageVictoria >= fichasVictoria.totalPages}
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
                <p className="text-gray-500">No hay fichas atribuidas a Victoria en este período</p>
              </div>
            )}
          </div>
        )}

        {/* Tabla Otros Canales */}
        {activeView === 'otras' && (
          <div className="p-4">
            {loadingOtras ? (
              <TableSkeleton />
            ) : fichasOtras && fichasOtras.data.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Separación</th>
                        <th className="px-3 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Captura</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Local</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Canal / UTM</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Abonado</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {fichasOtras.data.map((ficha) => (
                        <tr key={ficha.ficha_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-3 text-sm text-gray-700">
                            {new Date(ficha.fecha_ficha).toLocaleDateString('es-PE')}
                          </td>
                          <td className="px-3 py-3 text-sm text-gray-500">
                            {ficha.fecha_lead ? new Date(ficha.fecha_lead).toLocaleDateString('es-PE') : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-800">{ficha.cliente_nombre}</div>
                            <div className="text-xs text-gray-500">{ficha.cliente_dni}</div>
                            {ficha.lead_telefono && (
                              <div className="text-xs text-gray-600 mt-0.5">{ficha.lead_telefono}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-mono text-gray-800">{ficha.local_codigo}</div>
                            <div className="text-xs text-gray-500">{ficha.proyecto_nombre}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              <Users className="w-3 h-3" />
                              {ficha.lead_utm || 'Sin UTM'}
                            </span>
                            {ficha.lead_estado && ficha.lead_estado !== ficha.lead_utm && (
                              <div className="text-xs text-gray-500 mt-1">{ficha.lead_estado}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {ficha.total_abonado_usd > 0 && (
                              <div className="text-sm font-medium text-green-600">
                                $ {ficha.total_abonado_usd.toLocaleString()}
                              </div>
                            )}
                            {ficha.total_abonado_pen > 0 && (
                              <div className="text-sm font-medium text-blue-600">
                                S/ {ficha.total_abonado_pen.toLocaleString()}
                              </div>
                            )}
                            {ficha.total_abonado_usd === 0 && ficha.total_abonado_pen === 0 && (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {ficha.lead_id ? (
                              <button
                                onClick={() => setSelectedLead({ id: ficha.lead_id, nombre: ficha.cliente_nombre, telefono: ficha.lead_telefono })}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                title="Ver historial de conversación"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                Ver Lead
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
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
                    Mostrando {((pageOtras - 1) * pageSize) + 1} - {Math.min(pageOtras * pageSize, fichasOtras.totalCount)} de {fichasOtras.totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPageOtras(p => p - 1)}
                      disabled={pageOtras === 1}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {pageOtras} de {fichasOtras.totalPages}
                    </span>
                    <button
                      onClick={() => setPageOtras(p => p + 1)}
                      disabled={pageOtras >= fichasOtras.totalPages}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay fichas de otros canales en este período</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para ver historial de conversación */}
      <ChatHistoryModal
        isOpen={!!selectedLead}
        leadId={selectedLead?.id || ''}
        leadNombre={selectedLead?.nombre}
        leadTelefono={selectedLead?.telefono}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
}
