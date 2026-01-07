'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Download,
  Calendar,
  Filter,
  ChevronDown,
  BarChart3
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getReporteriaData,
  getProyectosForFilter,
  type VendedorReporteriaRow,
  type ProyectoLeads
} from '@/lib/actions-reporteria';
import type { Proyecto } from '@/lib/db';
import ReporteriaTabs, { type ReporteriaTab } from './ReporteriaTabs';
import AtribucionIATab from './AtribucionIATab';

// Tipo Usuario de auth-context (no importar de @/lib/db para evitar conflictos)
interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'gerencia' | 'vendedor' | 'jefe_ventas' | 'vendedor_caseta' | 'coordinador' | 'finanzas' | 'marketing';
  vendedor_id: string | null;
  activo: boolean;
}

interface ReporteriaClientProps {
  user: Usuario;
}

// Helper para calcular fechas por defecto (últimos 3 días)
function getDefaultDates() {
  const today = new Date();
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(today.getDate() - 3);

  // Formato YYYY-MM-DD
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    from: formatDate(threeDaysAgo),
    to: formatDate(today)
  };
}

export default function ReporteriaClient({ user }: ReporteriaClientProps) {
  // Tab state - Session 74
  const [activeTab, setActiveTab] = useState<ReporteriaTab>('leads_vendedor');

  // Referencias para scroll dual
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Fechas por defecto (últimos 3 días)
  const defaultDates = getDefaultDates();

  // Estados
  const [data, setData] = useState<VendedorReporteriaRow[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filtros (con fechas por defecto de últimos 15 días)
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(defaultDates.from);
  const [dateTo, setDateTo] = useState(defaultDates.to);
  const [searchTerm, setSearchTerm] = useState('');

  // Cargar proyectos al montar
  useEffect(() => {
    async function loadProyectos() {
      const proyectosData = await getProyectosForFilter();
      setProyectos(proyectosData);
    }
    loadProyectos();
  }, []);

  // Cargar datos al montar y cuando cambien filtros (excepto searchTerm que es client-side)
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const result = await getReporteriaData({
        proyectoId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
        // searchTerm se filtra client-side para mejor performance
      });
      setData(result);
      setLoading(false);
    }
    loadData();
  }, [proyectoId, dateFrom, dateTo]);

  // Filtrar datos por searchTerm (client-side, instantáneo)
  const filteredData = searchTerm
    ? data.filter(v => v.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    : data;

  // Sincronizar scroll superior con tabla
  const handleTopScroll = () => {
    if (tableContainerRef.current && topScrollRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  // Sincronizar tabla con scroll superior
  const handleTableScroll = () => {
    if (topScrollRef.current && tableContainerRef.current) {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  };

  // Calcular ancho de la tabla (para el scroll dual)
  const calculateTableWidth = () => {
    if (filteredData.length === 0) return 0;
    // Columnas fijas: # (80px) + Vendedor (200px) + Rol (150px) = 430px
    // Columnas proyecto: 180px cada una
    // Columna TOTAL: 100px
    const proyectosCount = filteredData[0]?.proyectos.length || 0;
    return 430 + (proyectosCount * 180) + 100;
  };

  // Calcular totales por proyecto
  const calculateTotalesPorProyecto = (): ProyectoLeads[] => {
    if (filteredData.length === 0) return [];

    const proyectosTemplate = filteredData[0]?.proyectos || [];
    return proyectosTemplate.map((proyecto) => {
      let leadsManuales = 0;
      let leadsAutomaticos = 0;
      let total = 0;

      filteredData.forEach((vendedor) => {
        const proyectoData = vendedor.proyectos.find(p => p.proyecto_id === proyecto.proyecto_id);
        if (proyectoData) {
          leadsManuales += proyectoData.leadsManuales;
          leadsAutomaticos += proyectoData.leadsAutomaticos;
          total += proyectoData.total;
        }
      });

      return {
        proyecto_id: proyecto.proyecto_id,
        proyecto_nombre: proyecto.proyecto_nombre,
        proyecto_color: proyecto.proyecto_color,
        leadsManuales,
        leadsAutomaticos,
        total
      };
    });
  };

  // Calcular total general global
  const totalGeneralGlobal = filteredData.reduce((sum, vendedor) => sum + vendedor.totalGeneral, 0);

  // Exportar a Excel
  const handleExportExcel = () => {
    setIsExporting(true);

    try {
      const exportData: any[] = [];

      // Preparar headers dinámicos
      const headers: any = {
        '#': '#',
        'Vendedor': 'Vendedor',
        'Rol': 'Rol'
      };

      // Agregar columnas de proyectos
      const proyectosTemplate = filteredData[0]?.proyectos || [];
      proyectosTemplate.forEach((proyecto) => {
        headers[`${proyecto.proyecto_nombre}_Manual`] = `${proyecto.proyecto_nombre} (Manual)`;
        headers[`${proyecto.proyecto_nombre}_NoManual`] = `${proyecto.proyecto_nombre} (NO Manual)`;
        headers[`${proyecto.proyecto_nombre}_Total`] = `${proyecto.proyecto_nombre} (Total)`;
      });
      headers['TOTAL'] = 'TOTAL GENERAL';

      exportData.push(headers);

      // Agregar filas de vendedores
      filteredData.forEach((vendedor, index) => {
        const row: any = {
          '#': index + 1,
          'Vendedor': vendedor.nombre,
          'Rol': vendedor.rol === 'vendedor' ? 'Vendedor' : 'Vendedor Caseta'
        };

        vendedor.proyectos.forEach((proyecto) => {
          row[`${proyecto.proyecto_nombre}_Manual`] = proyecto.leadsManuales;
          row[`${proyecto.proyecto_nombre}_NoManual`] = proyecto.leadsAutomaticos;
          row[`${proyecto.proyecto_nombre}_Total`] = proyecto.total;
        });

        row['TOTAL'] = vendedor.totalGeneral;
        exportData.push(row);
      });

      // Agregar fila de totales
      const totalesPorProyecto = calculateTotalesPorProyecto();
      const totalesRow: any = {
        '#': '',
        'Vendedor': 'TOTALES',
        'Rol': ''
      };

      totalesPorProyecto.forEach((proyecto) => {
        totalesRow[`${proyecto.proyecto_nombre}_Manual`] = proyecto.leadsManuales;
        totalesRow[`${proyecto.proyecto_nombre}_NoManual`] = proyecto.leadsAutomaticos;
        totalesRow[`${proyecto.proyecto_nombre}_Total`] = proyecto.total;
      });

      totalesRow['TOTAL'] = totalGeneralGlobal;
      exportData.push(totalesRow);

      const ws = XLSX.utils.json_to_sheet(exportData, { skipHeader: true });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reportería');

      // Nombre del archivo con timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `reporteria-vendedores-matriz-${timestamp}.xlsx`;

      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error al exportar a Excel');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper para obtener badge de rol
  // NOTA: Coordinadores también pueden vender y aparecer en reportería (Sesión 74)
  const getRolBadge = (rol: 'vendedor' | 'vendedor_caseta' | 'coordinador') => {
    if (rol === 'vendedor') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Vendedor
        </span>
      );
    }
    if (rol === 'coordinador') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          Coordinador
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        Vendedor Caseta
      </span>
    );
  };

  const totalesPorProyecto = calculateTotalesPorProyecto();
  const tableWidth = calculateTableWidth();

  return (
    <div className="space-y-6">
      {/* Tabs - Session 74: Sistema de Atribución IA */}
      <ReporteriaTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole={user.rol}
      />

      {/* CONTENIDO PRINCIPAL */}
      <div>
        {/* TAB: Atribución IA */}
        {activeTab === 'atribucion_ia' && (
          <AtribucionIATab user={user} />
        )}

        {/* TAB: Leads por Vendedor (contenido original) */}
        {activeTab === 'leads_vendedor' && (
        <>
        {/* FILTROS */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Fecha Desde */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desde
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
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
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
                />
              </div>
            </div>

            {/* Búsqueda por nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar vendedor
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nombre..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Nota sobre fechas por defecto */}
          <p className="text-xs text-gray-500 mt-2 italic">
            * Últimos 3 días por defecto
          </p>

          {/* Leyenda de colores y Botón Exportar */}
          <div className="mt-4 flex items-center justify-between">
            {/* Leyenda a la izquierda */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                <span>Manual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#1b967a]"></span>
                <span>No Manual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-gray-800"></span>
                <span>Total</span>
              </div>
            </div>

            {/* Botón exportar a la derecha */}
            <button
              onClick={handleExportExcel}
              disabled={isExporting || filteredData.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exportando...' : 'Exportar Excel'}
            </button>
          </div>
        </div>

        {/* TABLA */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1b967a]"></div>
                <p className="text-gray-600">Cargando datos...</p>
              </div>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
              <p className="text-gray-600">Intenta ajustar los filtros para ver resultados</p>
            </div>
          ) : (
            <>
              {/* Tabla Desktop */}
              <div className="hidden md:block">
                {/* Scroll bar superior */}
                <div
                  ref={topScrollRef}
                  onScroll={handleTopScroll}
                  className="overflow-x-auto border-b border-gray-200"
                  style={{ overflowY: 'hidden' }}
                >
                  <div style={{ width: `${tableWidth}px`, height: '1px' }} />
                </div>

                {/* Tabla con scroll */}
                <div
                  ref={tableContainerRef}
                  onScroll={handleTableScroll}
                  className="overflow-x-auto"
                >
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-5">
                      <tr>
                        {/* Columnas fijas */}
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                          Vendedor
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                          Rol
                        </th>

                        {/* Columnas dinámicas de proyectos */}
                        {filteredData[0]?.proyectos.map((proyecto) => (
                          <th
                            key={proyecto.proyecto_id}
                            className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider w-44"
                            style={{
                              backgroundColor: proyecto.proyecto_color || '#6b7280',
                              color: '#ffffff'
                            }}
                          >
                            {proyecto.proyecto_nombre}
                          </th>
                        ))}

                        {/* Columna TOTAL */}
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 bg-gray-100">
                          TOTAL
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredData.map((vendedor, index) => (
                        <tr key={vendedor.vendedor_id} className="hover:bg-gray-50 transition-colors">
                          {/* # */}
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {index + 1}
                          </td>

                          {/* Vendedor */}
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {vendedor.nombre}
                          </td>

                          {/* Rol */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {getRolBadge(vendedor.rol)}
                          </td>

                          {/* Celdas de proyectos (3 líneas cada una) */}
                          {vendedor.proyectos.map((proyecto) => (
                            <td
                              key={proyecto.proyecto_id}
                              className="px-3 py-2 text-sm border-l-[3px]"
                              style={{ borderLeftColor: proyecto.proyecto_color || '#e5e7eb' }}
                            >
                              <div className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                                <span className="text-sm">{proyecto.leadsManuales}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#1b967a]"></span>
                                <span className="text-sm">{proyecto.leadsAutomaticos}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-gray-800"></span>
                                <span className="text-sm font-semibold">{proyecto.total}</span>
                              </div>
                            </td>
                          ))}

                          {/* TOTAL GENERAL */}
                          <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold text-[#1b967a] bg-gray-50">
                            {vendedor.totalGeneral}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    {/* Footer con totales */}
                    <tfoot className="bg-gray-100">
                      <tr className="font-bold">
                        <td colSpan={3} className="px-4 py-3 text-sm text-gray-900">
                          TOTALES
                        </td>

                        {/* Totales por proyecto */}
                        {totalesPorProyecto.map((proyecto) => (
                          <td
                            key={proyecto.proyecto_id}
                            className="px-3 py-2 text-sm border-l-[3px]"
                            style={{ borderLeftColor: proyecto.proyecto_color || '#e5e7eb' }}
                          >
                            <div className="flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                              <span className="text-sm">{proyecto.leadsManuales}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#1b967a]"></span>
                              <span className="text-sm">{proyecto.leadsAutomaticos}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full bg-gray-800"></span>
                              <span className="text-sm font-semibold">{proyecto.total}</span>
                            </div>
                          </td>
                        ))}

                        {/* TOTAL GENERAL GLOBAL */}
                        <td className="px-4 py-3 text-center text-sm text-[#1b967a] bg-gray-50">
                          {totalGeneralGlobal}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Vista Mobile - Cards */}
              <div className="md:hidden divide-y divide-gray-200">
                {filteredData.map((vendedor, index) => (
                  <div key={vendedor.vendedor_id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-bold text-gray-500">#{index + 1}</span>
                      <span className="font-semibold text-gray-900">{vendedor.nombre}</span>
                      {getRolBadge(vendedor.rol)}
                    </div>

                    {/* Proyectos como lista */}
                    <div className="space-y-2 mb-3">
                      {vendedor.proyectos.map((proyecto) => (
                        <div
                          key={proyecto.proyecto_id}
                          className="border-l-4 pl-3 py-1"
                          style={{ borderLeftColor: proyecto.proyecto_color || '#e5e7eb' }}
                        >
                          <div className="font-medium text-sm text-gray-900 mb-1">{proyecto.proyecto_nombre}</div>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                              <span className="text-xs">{proyecto.leadsManuales}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#1b967a]"></span>
                              <span className="text-xs">{proyecto.leadsAutomaticos}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-gray-800"></span>
                              <span className="text-xs font-semibold">{proyecto.total}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t font-bold text-[#1b967a]">
                      Total General: {vendedor.totalGeneral}
                    </div>
                  </div>
                ))}

                {/* Footer totales mobile */}
                <div className="bg-gray-100 p-4 font-bold">
                  <div className="mb-3 text-gray-900">TOTALES</div>
                  <div className="space-y-2">
                    {totalesPorProyecto.map((proyecto) => (
                      <div
                        key={proyecto.proyecto_id}
                        className="border-l-4 pl-3 py-1"
                        style={{ borderLeftColor: proyecto.proyecto_color || '#e5e7eb' }}
                      >
                        <div className="font-medium text-sm text-gray-900 mb-1">{proyecto.proyecto_nombre}</div>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            <span className="text-xs">{proyecto.leadsManuales}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#1b967a]"></span>
                            <span className="text-xs">{proyecto.leadsAutomaticos}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-gray-800"></span>
                            <span className="text-xs font-semibold">{proyecto.total}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t text-lg text-[#1b967a]">
                    Total General: {totalGeneralGlobal}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
