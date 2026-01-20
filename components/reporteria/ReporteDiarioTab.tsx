'use client';

/**
 * ReporteDiarioTab - Reporte de abonos por cliente ordenados por fecha
 * Session 101 - Nuevo reporte para Finanzas
 *
 * Features:
 * - Paginación server-side
 * - Ordenamiento por columnas server-side
 * - Exportación Excel de todos los registros
 * - Vista responsive
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  FileText,
  Download,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  FlaskConical,
  Receipt,
  Plus,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import VincularBoletaModal from './VincularBoletaModal';
import { desvincularBoleta } from '@/lib/actions-fichas-reporte';
import {
  getAbonosDiarios,
  getAbonosDiariosExport,
  type AbonoDiarioRow,
  type AbonoDiarioSortColumn,
  type SortDirection
} from '@/lib/actions-fichas-reporte';
import { getProyectosForFilter } from '@/lib/actions-reporteria';
import type { Proyecto } from '@/lib/db';
import * as XLSX from 'xlsx';

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

interface ReporteDiarioTabProps {
  user: Usuario;
  onVerFicha: (fichaId: string, localId: string) => void;
}

// Helper para formatear fecha
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// Helper para formatear monto
function formatMonto(monto: number, moneda: 'PEN' | 'USD'): string {
  if (moneda === 'USD') {
    return `$ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `S/ ${monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper para calcular fechas por defecto (últimos 7 días)
function getDefaultDates() {
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  const formatDateISO = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    from: formatDateISO(sevenDaysAgo),
    to: formatDateISO(today)
  };
}

// Tamaños de página disponibles
const PAGE_SIZES = [10, 20, 50, 100];

export default function ReporteDiarioTab({ user, onVerFicha }: ReporteDiarioTabProps) {
  const defaultDates = getDefaultDates();

  const [loading, setLoading] = useState(true);
  const [abonos, setAbonos] = useState<AbonoDiarioRow[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState(defaultDates.from);
  const [fechaHasta, setFechaHasta] = useState(defaultDates.to);
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [incluirPruebas, setIncluirPruebas] = useState(false);

  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Ordenamiento
  const [sortColumn, setSortColumn] = useState<AbonoDiarioSortColumn>('fecha_comprobante');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Totales
  const [totalUSD, setTotalUSD] = useState(0);
  const [totalPEN, setTotalPEN] = useState(0);

  // Modal vincular boleta
  const [showBoletaModal, setShowBoletaModal] = useState(false);
  const [selectedAbono, setSelectedAbono] = useState<AbonoDiarioRow | null>(null);
  const [deletingBoleta, setDeletingBoleta] = useState<string | null>(null);

  // Verificar si usuario puede vincular boletas
  const canVincularBoleta = ['superadmin', 'admin', 'finanzas'].includes(user.rol);

  // Cargar proyectos al montar
  useEffect(() => {
    async function loadProyectos() {
      const data = await getProyectosForFilter();
      setProyectos(data);
    }
    loadProyectos();
  }, []);

  // Función para cargar datos
  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getAbonosDiarios({
      fechaDesde,
      fechaHasta,
      proyectoId,
      page,
      pageSize,
      sortColumn,
      sortDirection,
      incluirPruebas
    });
    setAbonos(result.data);
    setTotal(result.total);
    setTotalPages(result.totalPages);
    setTotalUSD(result.totalUSD);
    setTotalPEN(result.totalPEN);
    setLoading(false);
  }, [fechaDesde, fechaHasta, proyectoId, page, pageSize, sortColumn, sortDirection, incluirPruebas]);

  // Cargar datos cuando cambian los filtros/paginación/ordenamiento
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset página cuando cambian filtros
  useEffect(() => {
    setPage(1);
  }, [fechaDesde, fechaHasta, proyectoId, incluirPruebas]);

  // Handler para cambiar ordenamiento
  const handleSort = (column: AbonoDiarioSortColumn) => {
    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Nueva columna, por defecto descendente
      setSortColumn(column);
      setSortDirection('desc');
    }
    setPage(1); // Reset a primera página
  };

  // Render sort icon
  const renderSortIcon = (column: AbonoDiarioSortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-4 h-4 text-[#1b967a]" />
      : <ArrowDown className="w-4 h-4 text-[#1b967a]" />;
  };

  // Exportar a Excel (todos los registros)
  const handleExportExcel = async () => {
    if (total === 0) return;
    setIsExporting(true);

    try {
      // Obtener TODOS los registros (sin paginar)
      const allAbonos = await getAbonosDiariosExport({
        fechaDesde,
        fechaHasta,
        proyectoId,
        sortColumn,
        sortDirection,
        incluirPruebas
      });

      const exportData = allAbonos.map((abono, index) => ({
        '#': index + 1,
        'Fecha': formatDate(abono.fecha_comprobante),
        'Cliente': abono.cliente_nombre,
        'Local': abono.local_codigo,
        'Proyecto': abono.proyecto_nombre,
        'Monto': abono.monto,
        'Moneda': abono.moneda,
        'Banco': abono.banco || '-',
        'N° Operación': abono.numero_operacion || '-',
      }));

      // Agregar filas de totales
      exportData.push({} as any); // Fila vacía
      exportData.push({
        '#': '',
        'Fecha': '',
        'Cliente': 'TOTALES',
        'Local': '',
        'Proyecto': '',
        'Monto': '' as any,
        'Moneda': '',
        'Banco': '',
        'N° Operación': '',
      } as any);
      exportData.push({
        '#': '',
        'Fecha': '',
        'Cliente': 'Total USD',
        'Local': '',
        'Proyecto': '',
        'Monto': totalUSD,
        'Moneda': 'USD',
        'Banco': '',
        'N° Operación': '',
      } as any);
      exportData.push({
        '#': '',
        'Fecha': '',
        'Cliente': 'Total PEN',
        'Local': '',
        'Proyecto': '',
        'Monto': totalPEN,
        'Moneda': 'PEN',
        'Banco': '',
        'N° Operación': '',
      } as any);

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte Diario');

      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `reporte-diario-abonos-${timestamp}.xlsx`);
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Calcular rango de registros mostrados
  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  // Handler para abrir modal de vincular boleta
  const handleVincularBoleta = (abono: AbonoDiarioRow) => {
    setSelectedAbono(abono);
    setShowBoletaModal(true);
  };

  // Handler para desvincular boleta
  const handleDesvincularBoleta = async (abono: AbonoDiarioRow) => {
    if (!window.confirm('¿Está seguro de desvincular esta boleta?')) return;

    const key = `${abono.ficha_id}-${abono.voucher_index}`;
    setDeletingBoleta(key);

    try {
      const result = await desvincularBoleta({
        fichaId: abono.ficha_id,
        voucherIndex: abono.voucher_index,
      });

      if (result.success) {
        loadData(); // Recargar datos
      } else {
        alert(result.message);
      }
    } catch (err) {
      console.error('Error desvinculando boleta:', err);
      alert('Error al desvincular boleta');
    } finally {
      setDeletingBoleta(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* FILTROS */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Fecha Desde */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desde
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
              />
            </div>
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasta
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro Proyecto */}
          <div>
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
              <span className="ml-2 font-bold text-green-800">${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <span className="text-blue-700 font-medium">Total PEN:</span>
              <span className="ml-2 font-bold text-blue-800">S/ {totalPEN.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
              <span className="text-gray-700 font-medium">Registros:</span>
              <span className="ml-2 font-bold text-gray-800">{total}</span>
            </div>
          </div>

          {/* Toggle Incluir Pruebas - Discreto pero accesible */}
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
              <p className="text-gray-600">Cargando abonos...</p>
            </div>
          </div>
        ) : abonos.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay abonos en este período</h3>
            <p className="text-gray-600">Ajusta el rango de fechas para ver resultados</p>
          </div>
        ) : (
          <>
            {/* Tabla Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      #
                    </th>
                    <th
                      onClick={() => handleSort('fecha_comprobante')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Fecha
                        {renderSortIcon('fecha_comprobante')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('cliente_nombre')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Cliente
                        {renderSortIcon('cliente_nombre')}
                      </div>
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
                      onClick={() => handleSort('monto')}
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-1">
                        Monto
                        {renderSortIcon('monto')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('banco')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Banco
                        {renderSortIcon('banco')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                      Boleta
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {abonos.map((abono, index) => (
                    <tr key={`${abono.ficha_id}-${index}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {startRecord + index}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDate(abono.fecha_comprobante)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {abono.cliente_nombre}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {abono.local_codigo}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {abono.proyecto_nombre}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        <span className={`font-semibold ${abono.moneda === 'USD' ? 'text-green-600' : 'text-blue-600'}`}>
                          {formatMonto(abono.monto, abono.moneda)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {abono.banco || '-'}
                      </td>
                      {/* Columna Boleta */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {abono.boleta_url ? (
                          // Boleta vinculada - mostrar info
                          <div className="flex items-center justify-center gap-1">
                            <a
                              href={abono.boleta_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                              title="Ver boleta"
                            >
                              <Receipt className="w-3 h-3" />
                              {abono.numero_boleta}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            {canVincularBoleta && (
                              <button
                                onClick={() => handleDesvincularBoleta(abono)}
                                disabled={deletingBoleta === `${abono.ficha_id}-${abono.voucher_index}`}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                title="Desvincular boleta"
                              >
                                {deletingBoleta === `${abono.ficha_id}-${abono.voucher_index}` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        ) : canVincularBoleta ? (
                          // Sin boleta - mostrar botón para agregar (solo roles autorizados)
                          <button
                            onClick={() => handleVincularBoleta(abono)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                            title="Vincular boleta"
                          >
                            <Plus className="w-3 h-3" />
                            Agregar
                          </button>
                        ) : (
                          // Sin boleta - usuario sin permisos
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <button
                          onClick={() => onVerFicha(abono.ficha_id, abono.local_id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1b967a] bg-[#1b967a]/10 rounded-lg hover:bg-[#1b967a]/20 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
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
              {abonos.map((abono, index) => (
                <div key={`${abono.ficha_id}-${index}`} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs text-gray-500">#{startRecord + index}</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {formatDate(abono.fecha_comprobante)}
                      </span>
                    </div>
                    <span className={`font-bold ${abono.moneda === 'USD' ? 'text-green-600' : 'text-blue-600'}`}>
                      {formatMonto(abono.monto, abono.moneda)}
                    </span>
                  </div>

                  <div className="mb-2">
                    <p className="font-semibold text-gray-900">{abono.cliente_nombre}</p>
                    <p className="text-sm text-gray-500">
                      {abono.local_codigo} • {abono.proyecto_nombre}
                    </p>
                    {abono.banco && (
                      <p className="text-xs text-gray-400 mt-1">Banco: {abono.banco}</p>
                    )}
                  </div>

                  {/* Boleta en mobile */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Boleta:</span>
                    {abono.boleta_url ? (
                      <div className="flex items-center gap-1">
                        <a
                          href={abono.boleta_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 rounded"
                        >
                          <Receipt className="w-3 h-3" />
                          {abono.numero_boleta}
                        </a>
                        {canVincularBoleta && (
                          <button
                            onClick={() => handleDesvincularBoleta(abono)}
                            disabled={deletingBoleta === `${abono.ficha_id}-${abono.voucher_index}`}
                            className="p-1 text-red-500"
                          >
                            {deletingBoleta === `${abono.ficha_id}-${abono.voucher_index}` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    ) : canVincularBoleta ? (
                      <button
                        onClick={() => handleVincularBoleta(abono)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-50 rounded"
                      >
                        <Plus className="w-3 h-3" />
                        Agregar
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </div>

                  <button
                    onClick={() => onVerFicha(abono.ficha_id, abono.local_id)}
                    className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-[#1b967a] bg-[#1b967a]/10 rounded-lg hover:bg-[#1b967a]/20 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Ver Ficha
                  </button>
                </div>
              ))}
            </div>

            {/* PAGINACIÓN - Diseño profesional */}
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

      {/* Modal Vincular Boleta */}
      {selectedAbono && (
        <VincularBoletaModal
          isOpen={showBoletaModal}
          onClose={() => {
            setShowBoletaModal(false);
            setSelectedAbono(null);
          }}
          fichaId={selectedAbono.ficha_id}
          voucherIndex={selectedAbono.voucher_index}
          clienteNombre={selectedAbono.cliente_nombre}
          localCodigo={selectedAbono.local_codigo}
          monto={formatMonto(selectedAbono.monto, selectedAbono.moneda)}
          onSuccess={() => {
            loadData(); // Recargar datos después de vincular
          }}
        />
      )}
    </div>
  );
}
