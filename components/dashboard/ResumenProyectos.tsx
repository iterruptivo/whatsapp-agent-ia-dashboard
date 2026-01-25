'use client';

import { useState, useMemo } from 'react';
import { Building2 } from 'lucide-react';

interface Lead {
  id: string;
  vendedor_asignado_id: string | null;
  estado: string | null;
  tipificacion_nivel_1: string | null;
  tipificacion_nivel_2: string | null;
  tipificacion_nivel_3: string | null;
  observaciones_vendedor: string | null;
  proyecto_id: string;
  proyecto_nombre?: string | null;
}

interface Usuario {
  id: string;
  nombre: string;
  rol: string;
  activo: boolean;
  vendedor_id: string | null;
}

interface ResumenProyectosProps {
  leads: Lead[];
  proyectos: {id: string, nombre: string}[];
  usuarios: Usuario[];
  userRole: string;
}

export default function ResumenProyectos({
  leads,
  proyectos,
  usuarios,
  userRole,
}: ResumenProyectosProps) {
  // Solo visible para superadmin, admin, jefe_ventas, marketing
  const allowedRoles = ['superadmin', 'admin', 'jefe_ventas', 'marketing'];
  if (!allowedRoles.includes(userRole)) {
    return null;
  }

  // Sorting state
  type SortColumn = 'asignados' | 'trabajados' | 'pendientes';
  const [sortColumn, setSortColumn] = useState<SortColumn>('pendientes');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Get active vendedor_ids for consistent counting with ControlProductividad
  // Incluye: vendedor, vendedor_caseta, jefe_ventas, coordinador (todos pueden vender)
  const activeVendedorIds = useMemo(() => {
    const rolesQueVenden = ['vendedor', 'vendedor_caseta', 'jefe_ventas', 'coordinador'];
    return new Set(
      usuarios
        .filter(u => rolesQueVenden.includes(u.rol) && u.activo && u.vendedor_id)
        .map(u => u.vendedor_id)
    );
  }, [usuarios]);

  // Calcular resumen por proyecto (solo vendedores activos)
  const resumenData = useMemo(() => {
    return proyectos.map(proyecto => {
      const proyectoLeads = leads.filter(l => l.proyecto_id === proyecto.id);
      // Solo contar leads asignados a vendedores ACTIVOS
      const asignados = proyectoLeads.filter(l =>
        l.vendedor_asignado_id && activeVendedorIds.has(l.vendedor_asignado_id)
      ).length;

      const trabajados = proyectoLeads.filter(lead =>
        lead.vendedor_asignado_id &&
        activeVendedorIds.has(lead.vendedor_asignado_id) && (
          (lead.tipificacion_nivel_1 && lead.tipificacion_nivel_1 !== '') ||
          (lead.tipificacion_nivel_2 && lead.tipificacion_nivel_2 !== '') ||
          (lead.tipificacion_nivel_3 && lead.tipificacion_nivel_3 !== '') ||
          (lead.observaciones_vendedor && lead.observaciones_vendedor !== '')
        )
      ).length;

      const pendientes = asignados - trabajados;

      return {
        id: proyecto.id,
        nombre: proyecto.nombre,
        asignados,
        trabajados,
        pendientes,
      };
    }).filter(p => p.asignados > 0).sort((a, b) => {
      const multiplier = sortDirection === 'desc' ? -1 : 1;
      return (a[sortColumn] - b[sortColumn]) * multiplier;
    });
  }, [leads, proyectos, activeVendedorIds, sortColumn, sortDirection]);

  // Sort handler
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Totales
  const totales = useMemo(() => ({
    asignados: resumenData.reduce((sum, p) => sum + p.asignados, 0),
    trabajados: resumenData.reduce((sum, p) => sum + p.trabajados, 0),
    pendientes: resumenData.reduce((sum, p) => sum + p.pendientes, 0),
  }), [resumenData]);

  const maxAsignados = Math.max(...resumenData.map(p => p.asignados), 1);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-[#192c4d]" />
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Resumen por Proyecto</h3>
            <p className="text-xs text-gray-500">Distribución de leads en el rango de fechas</p>
          </div>
        </div>
        <span className="text-sm text-gray-500">
          {resumenData.length} proyectos con leads
        </span>
      </div>

      {/* Tabla */}
      {resumenData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left py-2">Proyecto</th>
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
                <th className="py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {resumenData.map((proyecto) => {
                const barWidth = (proyecto.asignados / maxAsignados) * 100;
                const trabajadosWidth = proyecto.asignados > 0 ? (proyecto.trabajados / proyecto.asignados) * barWidth : 0;
                const pendientesWidth = proyecto.asignados > 0 ? (proyecto.pendientes / proyecto.asignados) * barWidth : 0;

                return (
                  <tr key={proyecto.id} className="border-b border-dotted border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                    <td className="py-2">
                      <span className="text-sm font-medium text-gray-800">{proyecto.nombre}</span>
                    </td>
                    <td className="py-2 text-right">
                      <span className="text-sm text-[#1b967a] font-medium">{proyecto.asignados}</span>
                    </td>
                    <td className="py-2 text-right">
                      <span className="text-sm text-blue-600 font-medium">{proyecto.trabajados}</span>
                    </td>
                    <td className="py-2 text-right">
                      <span className={`text-sm font-medium ${proyecto.pendientes > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                        {proyecto.pendientes}
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
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="py-2 text-sm text-gray-700">TOTALES</td>
                <td className="py-2 text-right text-sm text-[#1b967a]">{totales.asignados}</td>
                <td className="py-2 text-right text-sm text-blue-600">{totales.trabajados}</td>
                <td className="py-2 text-right text-sm text-orange-500">{totales.pendientes}</td>
                <td className="py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-32 text-gray-400">
          <Building2 className="w-8 h-8 mb-2" />
          <p className="text-sm">No hay datos para mostrar</p>
        </div>
      )}

      {/* Leyenda */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-500"></span>
            <span>Trabajados</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-orange-400"></span>
            <span>Pendientes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
