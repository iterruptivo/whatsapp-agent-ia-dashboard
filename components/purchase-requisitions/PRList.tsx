'use client';

import { useState } from 'react';
import type { PurchaseRequisition } from '@/lib/types/purchase-requisitions';
import PRStatusBadge from './PRStatusBadge';
import PRPriorityBadge from './PRPriorityBadge';
import { FileText, Calendar, DollarSign, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PRListProps {
  prs: PurchaseRequisition[];
  isLoading?: boolean;
  onViewPR: (pr: PurchaseRequisition) => void;
}

export default function PRList({ prs, isLoading = false, onViewPR }: PRListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 text-secondary animate-spin mb-4" />
        <p className="text-gray-600">Cargando solicitudes...</p>
      </div>
    );
  }

  if (prs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          No hay solicitudes
        </h3>
        <p className="text-sm text-gray-500">
          Aún no has creado ninguna solicitud de compra
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Vista Desktop: Tabla */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PR #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Título
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prioridad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {prs.map((pr) => (
              <tr
                key={pr.id}
                onClick={() => onViewPR(pr)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-mono font-semibold text-secondary">
                    {pr.pr_number}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 line-clamp-1">
                      {pr.title}
                    </span>
                    <span className="text-xs text-gray-500 line-clamp-1">
                      {pr.item_description}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-700">
                    {pr.category_id}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">
                      {pr.total_amount.toLocaleString('es-PE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-xs text-gray-500">{pr.currency}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <PRStatusBadge status={pr.status} size="sm" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <PRPriorityBadge priority={pr.priority} size="sm" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(pr.created_at), 'dd/MM/yyyy', { locale: es })}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista Mobile: Cards */}
      <div className="md:hidden space-y-4">
        {prs.map((pr) => (
          <div
            key={pr.id}
            onClick={() => onViewPR(pr)}
            className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <span className="text-xs font-mono font-semibold text-secondary">
                  {pr.pr_number}
                </span>
                <h3 className="text-sm font-semibold text-gray-900 mt-1 line-clamp-2">
                  {pr.title}
                </h3>
              </div>
              <PRPriorityBadge priority={pr.priority} size="sm" />
            </div>

            {/* Description */}
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {pr.item_description}
            </p>

            {/* Monto */}
            <div className="flex items-center gap-1 mb-3">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="text-base font-bold text-gray-900">
                {pr.total_amount.toLocaleString('es-PE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-xs text-gray-500">{pr.currency}</span>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <PRStatusBadge status={pr.status} size="sm" />
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>
                  {format(new Date(pr.created_at), 'dd/MM/yy', { locale: es })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
