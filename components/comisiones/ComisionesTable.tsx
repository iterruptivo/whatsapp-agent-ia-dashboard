'use client';

import { useState } from 'react';
import { ChevronDown, Edit2, Check } from 'lucide-react';
import type { Comision } from '@/lib/actions-comisiones';
import { marcarComisionPagada } from '@/lib/actions-comisiones';

interface ComisionesTableProps {
  comisiones: Comision[];
  userRole: string;
  userId: string;
  onUpdate: () => void;
}

export default function ComisionesTable({ comisiones, userRole, userId, onUpdate }: ComisionesTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const formatMonto = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getEstadoBadge = (estado: string) => {
    const styles = {
      pendiente_inicial: 'bg-yellow-100 text-yellow-800',
      disponible: 'bg-green-100 text-green-800',
      pagada: 'bg-purple-100 text-purple-800',
    };
    const labels = {
      pendiente_inicial: 'Pendiente Inicial',
      disponible: 'Disponible',
      pagada: 'Pagada',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[estado as keyof typeof styles]}`}>
        {labels[estado as keyof typeof labels]}
      </span>
    );
  };

  const getFaseBadge = (fase: string) => {
    const styles = {
      vendedor: 'bg-blue-100 text-blue-800',
      gestion: 'bg-indigo-100 text-indigo-800',
    };
    const labels = {
      vendedor: 'Vendedor',
      gestion: 'Gestión',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[fase as keyof typeof styles]}`}>
        {labels[fase as keyof typeof labels]}
      </span>
    );
  };

  const handleMarcarPagada = async (comisionId: string) => {
    setLoadingId(comisionId);
    setOpenDropdown(null);

    const result = await marcarComisionPagada(comisionId, userId);

    if (result.success) {
      onUpdate();
    } else {
      alert(result.message || 'Error al marcar comisión como pagada');
    }

    setLoadingId(null);
  };

  const isAdmin = userRole === 'admin';

  // TEMPORAL: Oculto para presentación (Sesión 53)
  // TODO: Restaurar después de presentación
  if (comisiones.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center" style={{ display: 'none' }}>
        <p className="text-gray-500">No tienes comisiones registradas</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Código Local
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Proyecto
              </th>
              {isAdmin && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fase
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monto Venta
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                % Com.
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Comisión
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Procesado
              </th>
              {isAdmin && (
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {comisiones.map((comision) => (
              <tr key={comision.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {comision.local_codigo || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {comision.proyecto_nombre || 'N/A'}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {comision.usuario_nombre || 'N/A'}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getFaseBadge(comision.fase)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatMonto(comision.monto_venta)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                  {comision.porcentaje_comision.toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                  {formatMonto(comision.monto_comision)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  {getEstadoBadge(comision.estado)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {formatFecha(comision.fecha_procesado)}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {comision.estado === 'disponible' && (
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === comision.id ? null : comision.id)}
                          disabled={loadingId === comision.id}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs"
                        >
                          {loadingId === comision.id ? (
                            'Procesando...'
                          ) : (
                            <>
                              Marcar Pagada
                              <ChevronDown className="h-3 w-3" />
                            </>
                          )}
                        </button>

                        {openDropdown === comision.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenDropdown(null)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                              <button
                                onClick={() => handleMarcarPagada(comision.id)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                                Confirmar Pago
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {comision.estado === 'pagada' && (
                      <span className="text-xs text-gray-400">
                        {comision.fecha_pago_comision ? formatFecha(comision.fecha_pago_comision) : 'Pagada'}
                      </span>
                    )}
                    {comision.estado === 'pendiente_inicial' && (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
