// ============================================================================
// COMPONENT: VendedoresMiniTable
// ============================================================================
// Descripción: Mini tabla compacta mostrando Top 5 vendedores con leads
// - Vista compacta por defecto (Top 5)
// - Expandible para ver todos los vendedores
// - Columnas: #, Vendedor, Manual, Auto, Total, Barra visual
// - Badge sutil de rol (vendedor vs vendedor_caseta)
// ============================================================================

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';

interface VendedorLeadsData {
  id: string;
  nombre: string;
  rol: 'vendedor' | 'vendedor_caseta';
  leadsManuales: number;
  leadsAutomaticos: number;
  total: number;
}

interface VendedoresMiniTableProps {
  data: VendedorLeadsData[];
  title?: string;
  initialShowCount?: number;
}

export default function VendedoresMiniTable({
  data,
  title = 'Leads por Vendedor',
  initialShowCount = 5,
}: VendedoresMiniTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Ordenar por total descendente
  const sortedData = [...data].sort((a, b) => b.total - a.total);

  // Calcular el máximo para la barra de progreso
  const maxTotal = Math.max(...sortedData.map((v) => v.total), 1);

  // Datos a mostrar según estado expandido
  const displayData = isExpanded ? sortedData : sortedData.slice(0, initialShowCount);
  const remainingCount = sortedData.length - initialShowCount;

  // Calcular totales
  const totalLeads = data.reduce((sum, v) => sum + v.total, 0);
  const totalManuales = data.reduce((sum, v) => sum + v.leadsManuales, 0);
  const totalAutomaticos = data.reduce((sum, v) => sum + v.leadsAutomaticos, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="text-sm text-gray-500">
          {data.length} vendedores • {totalLeads} leads
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-500"></span>
          <span>Manual</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-[#1b967a]"></span>
          <span>Automático</span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <span className="w-2 h-2 rounded-full bg-sky-500"></span>
          <span>Caseta</span>
        </div>
      </div>

      {/* Table */}
      {sortedData.length > 0 ? (
        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200">
                <th className="text-left py-2 w-8">#</th>
                <th className="text-left py-2">Vendedor</th>
                <th className="text-right py-2 w-16">Manual</th>
                <th className="text-right py-2 w-16">Auto</th>
                <th className="text-right py-2 w-16">Total</th>
                <th className="py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((vendedor, index) => {
                const barWidth = (vendedor.total / maxTotal) * 100;
                const manualWidth = vendedor.total > 0
                  ? (vendedor.leadsManuales / vendedor.total) * barWidth
                  : 0;
                const autoWidth = barWidth - manualWidth;

                return (
                  <tr
                    key={vendedor.id}
                    className="border-b border-dotted border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2 text-sm text-gray-400">{index + 1}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1.5">
                        {vendedor.rol === 'vendedor_caseta' && (
                          <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0"></span>
                        )}
                        <span className="text-sm font-medium text-gray-800 truncate max-w-[150px]">
                          {vendedor.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <span className="text-sm text-purple-600 font-medium">
                        {vendedor.leadsManuales}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <span className="text-sm text-[#1b967a] font-medium">
                        {vendedor.leadsAutomaticos}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <span className="text-sm font-bold text-gray-700">
                        {vendedor.total}
                      </span>
                    </td>
                    <td className="py-2 pl-2">
                      {/* Mini stacked bar */}
                      <div className="flex h-3 rounded overflow-hidden bg-gray-100">
                        {manualWidth > 0 && (
                          <div
                            className="bg-purple-500 h-full"
                            style={{ width: `${manualWidth}%` }}
                          />
                        )}
                        {autoWidth > 0 && (
                          <div
                            className="bg-[#1b967a] h-full"
                            style={{ width: `${autoWidth}%` }}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Expand/Collapse Button */}
          {remainingCount > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full mt-3 py-2 flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Mostrar menos
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Ver {remainingCount} vendedores más
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-32 text-gray-400">
          <Users className="w-8 h-8 mb-2" />
          <p className="text-sm">No hay vendedores activos</p>
        </div>
      )}

      {/* Summary Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Manual</p>
            <p className="text-lg font-bold text-purple-600">{totalManuales}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Automático</p>
            <p className="text-lg font-bold text-[#1b967a]">{totalAutomaticos}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-bold text-gray-700">{totalLeads}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
