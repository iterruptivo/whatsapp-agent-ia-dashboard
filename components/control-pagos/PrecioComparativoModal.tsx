'use client';

import { X } from 'lucide-react';

interface PrecioComparativoModalProps {
  isOpen: boolean;
  onClose: () => void;
  codigoLocal: string;
  metraje: number;
  cliente: string;
  precioBase: number | null;
  montoVenta: number;
}

export default function PrecioComparativoModal({
  isOpen,
  onClose,
  codigoLocal,
  metraje,
  cliente,
  precioBase,
  montoVenta,
}: PrecioComparativoModalProps) {
  if (!isOpen) return null;

  const formatMonto = (monto: number): string => {
    return `$ ${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calcular diferencia porcentual
  const diferencia = precioBase ? montoVenta - precioBase : 0;
  const porcentajeDiferencia = precioBase ? ((montoVenta - precioBase) / precioBase) * 100 : 0;

  // Determinar el valor máximo para las barras (el mayor entre precio base y monto venta)
  const maxValue = Math.max(precioBase || 0, montoVenta);

  // Calcular anchos de barras (porcentaje del máximo)
  const precioBaseWidth = precioBase ? (precioBase / maxValue) * 100 : 0;
  const montoVentaWidth = (montoVenta / maxValue) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Comparativo de Precios
            </h3>
            <p className="text-sm text-gray-500">
              {codigoLocal} • {metraje} m²
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Info Cliente */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Cliente</p>
            <p className="font-medium text-gray-900">{cliente}</p>
          </div>

          {/* Barras Comparativas */}
          <div className="space-y-4">
            {/* Precio Base */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">Precio Base</span>
                <span className="text-sm font-semibold text-blue-600">
                  {precioBase ? formatMonto(precioBase) : 'No definido'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div
                  className="bg-blue-500 h-6 rounded-full transition-all duration-500"
                  style={{ width: `${precioBaseWidth}%` }}
                />
              </div>
            </div>

            {/* Monto Venta */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">Monto Venta</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatMonto(montoVenta)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6">
                <div
                  className={`h-6 rounded-full transition-all duration-500 ${
                    diferencia >= 0 ? 'bg-green-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${montoVentaWidth}%` }}
                />
              </div>
            </div>
          </div>

          {/* Diferencia */}
          {precioBase && (
            <div className={`mt-6 p-4 rounded-lg ${
              diferencia >= 0 ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-medium ${
                  diferencia >= 0 ? 'text-green-700' : 'text-orange-700'
                }`}>
                  {diferencia >= 0 ? 'Ganancia sobre precio base' : 'Descuento sobre precio base'}
                </span>
                <div className="text-right">
                  <span className={`text-lg font-bold ${
                    diferencia >= 0 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {diferencia >= 0 ? '+' : ''}{porcentajeDiferencia.toFixed(1)}%
                  </span>
                  <p className={`text-sm ${
                    diferencia >= 0 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {diferencia >= 0 ? '+' : ''}{formatMonto(diferencia)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!precioBase && (
            <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                No se puede calcular la diferencia porque el precio base no está definido.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
