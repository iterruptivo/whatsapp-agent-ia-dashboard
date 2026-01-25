'use client';

import { useState, useMemo } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Download, Search, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Lead {
  id: string;
  vendedor_asignado_id: string | null;
  estado: string | null;
  tipificacion_nivel_1: string | null;
  tipificacion_nivel_2: string | null;
  tipificacion_nivel_3: string | null;
  observaciones_vendedor: string | null;
  proyecto_id: string;
}

interface Usuario {
  id: string;
  nombre: string;
  rol: string;
  activo: boolean;
  vendedor_id: string | null;
}

interface ControlProductividadProps {
  leads: Lead[];
  usuarios: Usuario[];
  proyectos: {id: string, nombre: string}[];
  userRole: string;
}

export default function ControlProductividad({
  leads,
  usuarios,
  proyectos,
  userRole,
}: ControlProductividadProps) {
  // Solo visible para superadmin, admin, jefe_ventas, marketing
  const allowedRoles = ['superadmin', 'admin', 'jefe_ventas', 'marketing'];
  if (!allowedRoles.includes(userRole)) {
    return null;
  }

  const [isExpanded, setIsExpanded] = useState(false);
  const [filtroTipoVendedor, setFiltroTipoVendedor] = useState<'todos' | 'vendedor' | 'vendedor_caseta'>('todos');

  // Sorting state
  type SortColumn = 'asignados' | 'trabajados' | 'pendientes';
  const [sortColumn, setSortColumn] = useState<SortColumn>('pendientes');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Autocomplete filters
  const [filtroProyectoText, setFiltroProyectoText] = useState('');
  const [filtroVendedorText, setFiltroVendedorText] = useState('');

  // Get all users that can sell (vendedor, vendedor_caseta, jefe_ventas, coordinador)
  const vendedorUsuarios = useMemo(() => {
    const rolesQueVenden = ['vendedor', 'vendedor_caseta', 'jefe_ventas', 'coordinador'];
    return usuarios.filter(
      u => rolesQueVenden.includes(u.rol) && u.activo
    ).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [usuarios]);

  // Find selected proyecto by text
  const selectedProyecto = useMemo(() => {
    if (!filtroProyectoText.trim()) return null;
    return proyectos.find(p =>
      p.nombre.toLowerCase() === filtroProyectoText.toLowerCase()
    );
  }, [proyectos, filtroProyectoText]);

  // Find selected vendedor by text
  const selectedVendedor = useMemo(() => {
    if (!filtroVendedorText.trim()) return null;
    return vendedorUsuarios.find(u =>
      u.nombre.toLowerCase() === filtroVendedorText.toLowerCase()
    );
  }, [vendedorUsuarios, filtroVendedorText]);

  // Filtrar leads por proyecto seleccionado
  const leadsFiltered = useMemo(() => {
    if (!selectedProyecto) return leads;
    return leads.filter(l => l.proyecto_id === selectedProyecto.id);
  }, [leads, selectedProyecto]);

  // Filtrar usuarios por tipo de vendedor
  const usuariosFiltered = useMemo(() => {
    let filtered = vendedorUsuarios;

    // Filtro por tipo
    if (filtroTipoVendedor !== 'todos') {
      filtered = filtered.filter(u => u.rol === filtroTipoVendedor);
    }

    // Filtro por vendedor específico
    if (selectedVendedor) {
      filtered = filtered.filter(u => u.id === selectedVendedor.id);
    }

    return filtered;
  }, [vendedorUsuarios, filtroTipoVendedor, selectedVendedor]);

  // Calcular datos por vendedor
  const vendedoresData = useMemo(() => {
    return usuariosFiltered.map(usuario => {
      const assignedLeads = leadsFiltered.filter(
        lead => lead.vendedor_asignado_id && usuario.vendedor_id &&
                lead.vendedor_asignado_id === usuario.vendedor_id
      );

      const trabajados = assignedLeads.filter(lead =>
        (lead.tipificacion_nivel_1 && lead.tipificacion_nivel_1 !== '') ||
        (lead.tipificacion_nivel_2 && lead.tipificacion_nivel_2 !== '') ||
        (lead.tipificacion_nivel_3 && lead.tipificacion_nivel_3 !== '') ||
        (lead.observaciones_vendedor && lead.observaciones_vendedor !== '')
      ).length;

      return {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol as 'vendedor' | 'vendedor_caseta',
        asignados: assignedLeads.length,
        trabajados,
        pendientes: assignedLeads.length - trabajados,
      };
    }).sort((a, b) => {
      const multiplier = sortDirection === 'desc' ? -1 : 1;
      return (a[sortColumn] - b[sortColumn]) * multiplier;
    });
  }, [usuariosFiltered, leadsFiltered, sortColumn, sortDirection]);

  const maxAsignados = Math.max(...vendedoresData.map(v => v.asignados), 1);
  const displayData = isExpanded ? vendedoresData : vendedoresData.slice(0, 10);
  const remainingCount = vendedoresData.length - 10;

  // Totales
  const totalAsignados = vendedoresData.reduce((sum, v) => sum + v.asignados, 0);
  const totalTrabajados = vendedoresData.reduce((sum, v) => sum + v.trabajados, 0);
  const totalPendientes = vendedoresData.reduce((sum, v) => sum + v.pendientes, 0);
  const porcentajeProductividad = totalAsignados > 0
    ? ((totalTrabajados / totalAsignados) * 100).toFixed(1)
    : '0.0';

  // Export Excel
  const handleExportExcel = () => {
    const excelData = vendedoresData.map((v, i) => ({
      '#': i + 1,
      'Vendedor': v.nombre,
      'Tipo': v.rol === 'vendedor_caseta' ? 'Vendedor Caseta' : 'Call Center',
      'Asignados': v.asignados,
      'Trabajados': v.trabajados,
      'Pendientes': v.pendientes,
      '% Productividad': v.asignados > 0 ? ((v.trabajados / v.asignados) * 100).toFixed(1) + '%' : '0.0%',
    }));

    excelData.push({
      '#': '' as any,
      'Vendedor': 'TOTALES',
      'Tipo': '',
      'Asignados': totalAsignados,
      'Trabajados': totalTrabajados,
      'Pendientes': totalPendientes,
      '% Productividad': porcentajeProductividad + '%',
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Control Productividad');

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Control_Productividad_${fecha}.xlsx`);
  };

  // Clear filter handlers
  const handleClearProyecto = () => setFiltroProyectoText('');
  const handleClearVendedor = () => setFiltroVendedorText('');

  // Sort handler
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-[#1b967a]" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Control de Productividad</h3>
            <p className="text-xs text-gray-500">Vista global de todos los proyectos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {vendedoresData.length} vendedores
          </span>
          {userRole === 'superadmin' && vendedoresData.length > 0 && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#1b967a] bg-[#1b967a]/10 hover:bg-[#1b967a]/20 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
          )}
        </div>
      </div>

      {/* Filtros con Autocomplete */}
      <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
        {/* Filtro Tipo */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Tipo:</label>
          <select
            value={filtroTipoVendedor}
            onChange={(e) => setFiltroTipoVendedor(e.target.value as any)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
          >
            <option value="todos">Todos</option>
            <option value="vendedor">Call Center</option>
            <option value="vendedor_caseta">Vendedor Caseta</option>
          </select>
        </div>

        {/* Filtro Proyecto con Autocomplete */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Proyecto:</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              list="proyectos-list"
              value={filtroProyectoText}
              onChange={(e) => setFiltroProyectoText(e.target.value)}
              placeholder="Todos los proyectos"
              className="text-sm border border-gray-300 rounded-md pl-8 pr-8 py-1.5 w-48 focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
            />
            {filtroProyectoText && (
              <button
                onClick={handleClearProyecto}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <datalist id="proyectos-list">
              {proyectos.map(p => (
                <option key={p.id} value={p.nombre} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Filtro Vendedor con Autocomplete */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Vendedor:</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              list="vendedores-list"
              value={filtroVendedorText}
              onChange={(e) => setFiltroVendedorText(e.target.value)}
              placeholder="Todos los vendedores"
              className="text-sm border border-gray-300 rounded-md pl-8 pr-8 py-1.5 w-52 focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
            />
            {filtroVendedorText && (
              <button
                onClick={handleClearVendedor}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <datalist id="vendedores-list">
              {vendedorUsuarios.map(u => (
                <option key={u.id} value={u.nombre} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {/* Tabla Simplificada */}
      {vendedoresData.length > 0 ? (
        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left py-2 w-8">#</th>
                <th className="text-left py-2">
                  <div className="flex items-center gap-4">
                    <span>Vendedor</span>
                    <div className="flex items-center gap-3 text-gray-400 font-normal">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span>Call Center</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                        <span>Vendedor Caseta</span>
                      </div>
                    </div>
                  </div>
                </th>
                <th
                  className="text-right py-2 w-20 cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => handleSort('asignados')}
                >
                  Asignados {sortColumn === 'asignados' && (sortDirection === 'desc' ? '↓' : '↑')}
                </th>
                <th
                  className="text-right py-2 w-20 cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => handleSort('trabajados')}
                >
                  Trabajados {sortColumn === 'trabajados' && (sortDirection === 'desc' ? '↓' : '↑')}
                </th>
                <th
                  className="text-right py-2 w-20 cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => handleSort('pendientes')}
                >
                  Pendientes {sortColumn === 'pendientes' && (sortDirection === 'desc' ? '↓' : '↑')}
                </th>
                <th className="py-2 w-36">
                  <div className="flex items-center justify-end gap-2 text-gray-400 font-normal">
                    <span className="w-2 h-2 rounded bg-blue-500"></span>
                    <span className="text-[10px]">Trab.</span>
                    <span className="w-2 h-2 rounded bg-orange-400"></span>
                    <span className="text-[10px]">Pend.</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((vendedor, index) => {
                const barWidth = (vendedor.asignados / maxAsignados) * 100;
                const trabajadosWidth = vendedor.asignados > 0 ? (vendedor.trabajados / vendedor.asignados) * barWidth : 0;
                const pendientesWidth = vendedor.asignados > 0 ? (vendedor.pendientes / vendedor.asignados) * barWidth : 0;

                return (
                  <tr key={vendedor.id} className="border-b border-dotted border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                    <td className="py-2 text-sm text-gray-400">{index + 1}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${vendedor.rol === 'vendedor_caseta' ? 'bg-sky-500' : 'bg-red-500'}`}></span>
                        <span className="text-sm font-medium text-gray-800">{vendedor.nombre}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <span className="text-sm font-bold text-gray-700">{vendedor.asignados}</span>
                    </td>
                    <td className="py-2 text-right">
                      <span className="text-sm text-blue-600 font-medium">{vendedor.trabajados}</span>
                    </td>
                    <td className="py-2 text-right">
                      <span className={`text-sm font-medium ${vendedor.pendientes > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {vendedor.pendientes}
                      </span>
                    </td>
                    <td className="py-2 pl-2">
                      <div className="flex h-3 rounded overflow-hidden bg-gray-100">
                        {trabajadosWidth > 0 && <div className="bg-blue-500 h-full" style={{ width: `${trabajadosWidth}%` }} />}
                        {pendientesWidth > 0 && <div className="bg-orange-400 h-full" style={{ width: `${pendientesWidth}%` }} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {remainingCount > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full mt-3 py-2 flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <><ChevronUp className="w-4 h-4" /> Mostrar menos</>
              ) : (
                <><ChevronDown className="w-4 h-4" /> Ver {remainingCount} vendedores más</>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-32 text-gray-400">
          <BarChart3 className="w-8 h-8 mb-2" />
          <p className="text-sm">No hay datos para mostrar</p>
        </div>
      )}

      {/* Footer Totales Simplificado */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Asignados</p>
            <p className="text-lg font-bold text-gray-700">{totalAsignados}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Trabajados</p>
            <p className="text-lg font-bold text-blue-600">{totalTrabajados}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pendientes</p>
            <p className="text-lg font-bold text-orange-500">{totalPendientes}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">% Productividad</p>
            <p className={`text-lg font-bold ${Number(porcentajeProductividad) >= 70 ? 'text-green-600' : Number(porcentajeProductividad) >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
              {porcentajeProductividad}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
