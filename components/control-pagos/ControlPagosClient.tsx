// ============================================================================
// COMPONENT: ControlPagosClient
// ============================================================================
// Descripción: Tabla de control de pagos de locales en proceso de venta
// Features: Lista completa de locales procesados con calendario de cuotas
// Sesión: 54
// ============================================================================

'use client';

import { useState } from 'react';
import type { ControlPago } from '@/lib/actions-control-pagos';
import { FileText, Calendar, Eye } from 'lucide-react';
import PagosPanel from './PagosPanel';

interface ControlPagosClientProps {
  initialData: ControlPago[];
}

export default function ControlPagosClient({ initialData }: ControlPagosClientProps) {
  const [controlPagos] = useState<ControlPago[]>(initialData);
  const [pagosPanel, setPagosPanel] = useState<{
    isOpen: boolean;
    controlPago: ControlPago | null;
  }>({
    isOpen: false,
    controlPago: null,
  });

  // Helper para formatear montos
  const formatMonto = (monto: number): string => {
    return `$ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper para formatear fechas
  const formatFecha = (fecha: string): string => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-[#1b967a] text-white px-6 py-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Locales en Control de Pagos
        </h2>
        <p className="text-sm text-green-100 mt-1">
          Total de locales procesados: {controlPagos.length}
        </p>
      </div>

      {/* Tabla */}
      {controlPagos.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 text-lg">No hay locales en control de pagos</p>
          <p className="text-gray-400 text-sm mt-2">
            Los locales procesados aparecerán aquí
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Código Local
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Proyecto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Monto Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Inicial (%)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Restante
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Cuotas
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Financiamiento
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Próximo Pago
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {controlPagos.map((cp) => (
                <tr key={cp.id} className="hover:bg-gray-50 transition-colors">
                  {/* Código Local */}
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{cp.codigo_local}</span>
                    <div className="text-xs text-gray-500">{cp.metraje} m²</div>
                  </td>

                  {/* Proyecto */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{cp.proyecto_nombre}</span>
                  </td>

                  {/* Cliente */}
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{cp.lead_nombre}</div>
                    <div className="text-xs text-gray-500">{cp.lead_telefono}</div>
                  </td>

                  {/* Monto Total */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatMonto(cp.monto_venta)}
                    </span>
                  </td>

                  {/* Inicial (%) */}
                  <td className="px-4 py-3 text-right">
                    {cp.porcentaje_inicial ? (
                      <>
                        <div className="text-sm font-medium text-blue-600">
                          {cp.porcentaje_inicial}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatMonto(cp.monto_inicial)}
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">N/A</span>
                    )}
                  </td>

                  {/* Restante */}
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-green-600">
                      {formatMonto(cp.monto_restante)}
                    </span>
                  </td>

                  {/* Cuotas */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {cp.numero_cuotas} cuotas
                    </span>
                    {cp.tea && (
                      <div className="text-xs text-gray-500 mt-1">TEA: {cp.tea}%</div>
                    )}
                  </td>

                  {/* Financiamiento */}
                  <td className="px-4 py-3 text-center">
                    {cp.con_financiamiento ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Sí
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        No
                      </span>
                    )}
                  </td>

                  {/* Próximo Pago */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatFecha(cp.fecha_primer_pago)}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setPagosPanel({ isOpen: true, controlPago: cp })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PagosPanel
        isOpen={pagosPanel.isOpen}
        controlPago={pagosPanel.controlPago}
        onClose={() => setPagosPanel({ isOpen: false, controlPago: null })}
      />
    </div>
  );
}
