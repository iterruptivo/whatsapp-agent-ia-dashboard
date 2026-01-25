'use client';

/**
 * FichasInscripcionTab - Reporte de Fichas de Inscripción
 * Session 100 - Reportería de Fichas con Datos Consolidados
 * Session 107 - Paginación server-side, ordenamiento, búsqueda con debounce, exportación Excel
 *
 * Features:
 * - Paginación server-side
 * - Page size configurable [10, 20, 50, 100]
 * - Ordenamiento server-side multi-columna
 * - Búsqueda server-side con debounce 300ms
 * - Exportación Excel
 * - Vista responsive (desktop/mobile)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Eye,
  Bell,
  CheckCircle2,
  FlaskConical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Download
} from 'lucide-react';
import {
  getFichasParaReportePaginado,
  getFichasParaReporteExport,
  type FichaReporteRow,
  type FichaReporteSortColumn
} from '@/lib/actions-fichas-reporte';
import { getProyectosConFichas } from '@/lib/actions-reporteria';
import type { Proyecto } from '@/lib/db';
import * as XLSX from 'xlsx';

// Tipo Usuario
interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'superadmin' | 'gerencia' | 'vendedor' | 'jefe_ventas' | 'vendedor_caseta' | 'coordinador' | 'finanzas' | 'marketing' | 'corredor' | 'legal' | 'vendedor_externo' | 'postventa';
  vendedor_id: string | null;
  activo: boolean;
}

interface FichasInscripcionTabProps {
  user: Usuario;
  onVerFicha: (fichaId: string, localId: string) => void;
}

// Helper para formatear moneda USD
function formatMonto(monto: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

// Helper para formatear moneda PEN (Soles)
function formatMontoPEN(monto: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
}

// Helper para formatear fecha
function formatFecha(fecha: string): string {
  const date = new Date(fecha);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper para obtener label de rol
function getRolLabel(rol: string | null): string {
  if (!rol) return '-';
  switch (rol) {
    case 'vendedor':
      return 'Vendedor';
    case 'vendedor_caseta':
      return 'Vendedor Caseta';
    case 'coordinador':
      return 'Coordinador';
    default:
      return rol;
  }
}

// Tamaños de página disponibles
const PAGE_SIZES = [10, 20, 50, 100];

export default function FichasInscripcionTab({ user: _user, onVerFicha }: FichasInscripcionTabProps) {
  // Estados de datos
  const [data, setData] = useState<FichaReporteRow[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [incluirPruebas, setIncluirPruebas] = useState(false);

  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Ordenamiento
  const [sortColumn, setSortColumn] = useState<FichaReporteSortColumn>('fecha_creacion');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Totales
  const [totalVouchersUSD, setTotalVouchersUSD] = useState(0);
  const [totalVouchersPEN, setTotalVouchersPEN] = useState(0);

  // Exportación
  const [isExporting, setIsExporting] = useState(false);

  // Cargar proyectos que tienen fichas al montar
  useEffect(() => {
    async function loadProyectos() {
      const proyectosData = await getProyectosConFichas();
      setProyectos(proyectosData);
    }
    loadProyectos();
  }, []);

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset página cuando cambian filtros
  useEffect(() => {
    setPage(1);
  }, [proyectoId, incluirPruebas, debouncedSearch]);

  // Función para cargar datos
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getFichasParaReportePaginado({
        proyectoId: proyectoId || undefined,
        page,
        pageSize,
        sortColumn,
        sortDirection,
        incluirPruebas,
        fichaSearch: debouncedSearch,
      });

      setData(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setTotalVouchersUSD(result.totalVouchersUSD);
      setTotalVouchersPEN(result.totalVouchersPEN);
    } catch (error) {
      console.error('Error loading fichas:', error);
    } finally {
      setLoading(false);
    }
  }, [proyectoId, page, pageSize, sortColumn, sortDirection, incluirPruebas, debouncedSearch]);

  // Cargar datos cuando cambian los filtros/paginación/ordenamiento
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler para cambiar ordenamiento
  const handleSort = (column: FichaReporteSortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setPage(1);
  };

  // Render sort icon
  const renderSortIcon = (column: FichaReporteSortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-4 h-4 text-[#1b967a]" />
      : <ArrowDown className="w-4 h-4 text-[#1b967a]" />;
  };

  // Exportar a Excel
  const handleExportExcel = async () => {
    if (total === 0) return;
    setIsExporting(true);

    try {
      const allData = await getFichasParaReporteExport({
        proyectoId: proyectoId || undefined,
        sortColumn,
        sortDirection,
        incluirPruebas,
        fichaSearch: debouncedSearch,
      });

      const exportData = allData.map((ficha, index) => ({
        '#': index + 1,
        'Fecha': formatFecha(ficha.fecha_creacion),
        'Local': ficha.local_codigo,
        'Proyecto': ficha.proyecto_nombre,
        'Titular': ficha.titular_nombre,
        'Documento': ficha.titular_documento,
        'Vendedor': ficha.vendedor_nombre || '-',
        'Rol': getRolLabel(ficha.vendedor_rol),
        'Jefe Ventas': ficha.jefe_ventas_nombre || '-',
        'Caseta': ficha.vendedor_caseta_nombre || '-',
        'Monto USD': ficha.monto_voucher_usd || 0,
        'Monto PEN': ficha.monto_voucher_pen || 0,
        'Abonos': ficha.abonos_count || 0,
      }));

      // Agregar filas de totales
      exportData.push({} as any);
      exportData.push({
        '#': '',
        'Fecha': 'TOTALES',
        'Local': '',
        'Proyecto': '',
        'Titular': '',
        'Documento': '',
        'Vendedor': '',
        'Rol': '',
        'Jefe Ventas': '',
        'Caseta': '',
        'Monto USD': totalVouchersUSD,
        'Monto PEN': totalVouchersPEN,
        'Abonos': '',
      } as any);

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Fichas Inscripcion');

      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `fichas-inscripcion-${timestamp}.xlsx`);
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Calcular rango de registros mostrados
  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#192c4d] flex items-center gap-2">
          <FileText className="w-6 h-6 text-[#1b967a]" />
          Reporte de Fichas de Inscripción
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Consulta consolidada de fichas con datos de locales, vendedores y pagos
        </p>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtro Proyecto */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proyecto
            </label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={proyectoId || ''}
                onChange={(e) => setProyectoId(e.target.value || null)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent appearance-none bg-white"
              >
                <option value="">Todos los proyectos</option>
                {proyectos.map((proyecto) => (
                  <option key={proyecto.id} value={proyecto.id}>
                    {proyecto.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Búsqueda por texto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Titular, DNI o local..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
              />
            </div>
          </div>

          {/* Botón Exportar */}
          <div className="flex items-end">
            <button
              onClick={handleExportExcel}
              disabled={isExporting || total === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Exportar Todo ({total})
                </>
              )}
            </button>
          </div>
        </div>

        {/* Resumen de totales + Toggle Pruebas */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          {/* Totales */}
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <span className="text-green-700 font-medium">Total USD:</span>
              <span className="ml-2 font-bold text-green-800">${totalVouchersUSD.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <span className="text-blue-700 font-medium">Total PEN:</span>
              <span className="ml-2 font-bold text-blue-800">S/ {totalVouchersPEN.toLocaleString('es-PE', { minimumFractionDigits: 0 })}</span>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
              <span className="text-gray-700 font-medium">Registros:</span>
              <span className="ml-2 font-bold text-gray-800">{total}</span>
            </div>
          </div>

          {/* Toggle Incluir Pruebas */}
          <button
            onClick={() => setIncluirPruebas(!incluirPruebas)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
              ${incluirPruebas
                ? 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200'
                : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 hover:text-gray-700'
              }
            `}
            title={incluirPruebas ? 'Click para excluir datos de prueba' : 'Click para incluir datos de prueba'}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>{incluirPruebas ? 'Pruebas incluidas' : 'Sin pruebas'}</span>
            <div className={`
              w-8 h-4 rounded-full relative transition-colors duration-200
              ${incluirPruebas ? 'bg-amber-400' : 'bg-gray-300'}
            `}>
              <div className={`
                absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200
                ${incluirPruebas ? 'left-4' : 'left-0.5'}
              `} />
            </div>
          </button>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1b967a]"></div>
              <p className="text-gray-600">Cargando fichas...</p>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {debouncedSearch ? 'No se encontraron resultados' : 'No hay fichas disponibles'}
            </h3>
            <p className="text-gray-600">
              {debouncedSearch
                ? 'Intenta con otro término de búsqueda'
                : 'Intenta ajustar los filtros para ver resultados'}
            </p>
          </div>
        ) : (
          <>
            {/* Tabla Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      #
                    </th>
                    <th
                      onClick={() => handleSort('local_codigo')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Local
                        {renderSortIcon('local_codigo')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('proyecto_nombre')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Proyecto
                        {renderSortIcon('proyecto_nombre')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('titular_nombre')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Titular
                        {renderSortIcon('titular_nombre')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendedor/Asesor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jefe Ventas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Caseta
                    </th>
                    <th
                      onClick={() => handleSort('monto_voucher_usd')}
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Monto USD
                        {renderSortIcon('monto_voucher_usd')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('monto_voucher_pen')}
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Monto PEN
                        {renderSortIcon('monto_voucher_pen')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('fecha_creacion')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Fecha
                        {renderSortIcon('fecha_creacion')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nuevo Abono
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((ficha, index) => (
                    <tr key={ficha.ficha_id} className="hover:bg-gray-50 transition-colors">
                      {/* # */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {startRecord + index}
                      </td>

                      {/* Local */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {ficha.local_codigo}
                      </td>

                      {/* Proyecto */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {ficha.proyecto_nombre}
                      </td>

                      {/* Titular */}
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="max-w-xs truncate" title={ficha.titular_nombre}>
                          {ficha.titular_nombre}
                        </div>
                      </td>

                      {/* Vendedor/Asesor */}
                      <td className="px-4 py-3 text-sm">
                        {ficha.vendedor_nombre ? (
                          <div>
                            <div className="font-medium text-gray-900">{ficha.vendedor_nombre}</div>
                            <div className="text-xs text-gray-500">{getRolLabel(ficha.vendedor_rol)}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Jefe Ventas */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {ficha.jefe_ventas_nombre || '-'}
                      </td>

                      {/* Caseta */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {ficha.vendedor_caseta_nombre || '-'}
                      </td>

                      {/* Monto USD (de vouchers OCR) */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {ficha.monto_voucher_usd > 0 ? formatMonto(ficha.monto_voucher_usd) : '-'}
                      </td>

                      {/* Monto PEN (de vouchers OCR) */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                        {ficha.monto_voucher_pen > 0 ? formatMontoPEN(ficha.monto_voucher_pen) : '-'}
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {formatFecha(ficha.fecha_creacion)}
                      </td>

                      {/* Nuevo Abono */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {ficha.tiene_nuevo_abono ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#1b967a]/10 text-[#1b967a] rounded-full text-xs font-medium">
                            <Bell className="w-3 h-3" />
                            <span>Nuevo</span>
                          </div>
                        ) : ficha.abonos_count > 0 ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{ficha.abonos_count}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button
                          onClick={() => onVerFicha(ficha.ficha_id, ficha.local_id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1b967a] bg-[#1b967a]/10 rounded-lg hover:bg-[#1b967a]/20 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Ver Ficha
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista Mobile - Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {data.map((ficha, index) => (
                <div key={ficha.ficha_id} className="p-4 hover:bg-gray-50 transition-colors">
                  {/* Header del card */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-500">#{startRecord + index}</span>
                      <span className="font-semibold text-gray-900">{ficha.local_codigo}</span>
                      {ficha.tiene_nuevo_abono && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1b967a]/10 text-[#1b967a] rounded-full text-xs font-medium">
                          <Bell className="w-3 h-3" />
                          Nuevo
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{formatFecha(ficha.fecha_creacion)}</span>
                  </div>

                  {/* Detalles */}
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Proyecto:</span>
                      <span className="ml-2 text-gray-900">{ficha.proyecto_nombre}</span>
                    </div>

                    <div>
                      <span className="font-medium text-gray-600">Titular:</span>
                      <span className="ml-2 text-gray-900">{ficha.titular_nombre}</span>
                    </div>

                    {ficha.vendedor_nombre && (
                      <div>
                        <span className="font-medium text-gray-600">Vendedor:</span>
                        <div className="ml-2 mt-1">
                          <div className="text-gray-900">{ficha.vendedor_nombre}</div>
                          <div className="text-xs text-gray-500">{getRolLabel(ficha.vendedor_rol)}</div>
                        </div>
                      </div>
                    )}

                    {ficha.jefe_ventas_nombre && (
                      <div>
                        <span className="font-medium text-gray-600">Jefe Ventas:</span>
                        <span className="ml-2 text-gray-900">{ficha.jefe_ventas_nombre}</span>
                      </div>
                    )}

                    {ficha.vendedor_caseta_nombre && (
                      <div>
                        <span className="font-medium text-gray-600">Caseta:</span>
                        <span className="ml-2 text-gray-900">{ficha.vendedor_caseta_nombre}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex gap-4 text-sm">
                        {ficha.monto_voucher_usd > 0 && (
                          <div>
                            <span className="font-medium text-gray-600">USD:</span>
                            <span className="ml-1 font-semibold text-gray-900">
                              {formatMonto(ficha.monto_voucher_usd)}
                            </span>
                          </div>
                        )}
                        {ficha.monto_voucher_pen > 0 && (
                          <div>
                            <span className="font-medium text-gray-600">PEN:</span>
                            <span className="ml-1 font-semibold text-gray-900">
                              {formatMontoPEN(ficha.monto_voucher_pen)}
                            </span>
                          </div>
                        )}
                        {ficha.monto_voucher_usd === 0 && ficha.monto_voucher_pen === 0 && (
                          <span className="text-gray-400">Sin montos registrados</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botón Ver Ficha */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => onVerFicha(ficha.ficha_id, ficha.local_id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-[#1b967a] bg-[#1b967a]/10 rounded-lg hover:bg-[#1b967a]/20 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Ficha
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* PAGINACIÓN */}
            <div className="px-4 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                {/* Izquierda: Selector de registros por página */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">Mostrar</span>
                  <div className="relative">
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="appearance-none bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-gray-700 hover:border-[#1b967a] focus:outline-none focus:ring-2 focus:ring-[#1b967a]/20 focus:border-[#1b967a] cursor-pointer transition-colors"
                    >
                      {PAGE_SIZES.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <span className="text-sm text-gray-500">por página</span>
                </div>

                {/* Centro: Info de registros */}
                <div className="text-sm text-gray-600 order-first lg:order-none">
                  Mostrando <span className="font-semibold text-gray-900">{startRecord}</span> - <span className="font-semibold text-gray-900">{endRecord}</span> de <span className="font-semibold text-[#1b967a]">{total}</span> registros
                </div>

                {/* Derecha: Controles de paginación */}
                <div className="flex items-center gap-1">
                  {/* Primera página */}
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                    title="Primera página"
                  >
                    <ChevronsLeft className="w-5 h-5 text-gray-600" />
                  </button>

                  {/* Anterior */}
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                    title="Página anterior"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>

                  {/* Indicador de página */}
                  <div className="flex items-center gap-2 px-2 mx-1">
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={page}
                      onChange={(e) => {
                        const newPage = parseInt(e.target.value);
                        if (newPage >= 1 && newPage <= totalPages) {
                          setPage(newPage);
                        }
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-14 px-2 py-1.5 text-center text-sm font-medium border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b967a]/20 focus:border-[#1b967a] transition-colors"
                    />
                    <span className="text-sm text-gray-500">/</span>
                    <span className="text-sm font-medium text-gray-700">{totalPages}</span>
                  </div>

                  {/* Siguiente */}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                    title="Página siguiente"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>

                  {/* Última página */}
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                    title="Última página"
                  >
                    <ChevronsRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
