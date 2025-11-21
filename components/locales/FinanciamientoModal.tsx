// ============================================================================
// COMPONENT: FinanciamientoModal
// ============================================================================
// Descripción: Modal para iniciar financiamiento de locales en estado ROJO
// Features: Muestra código local y proyecto - contenido placeholder
// SESIÓN 52: Feature inicial - Solo mostrar modal con título correcto
// ============================================================================

'use client';

import { X } from 'lucide-react';
import type { Local } from '@/lib/locales';

interface FinanciamientoModalProps {
  isOpen: boolean;
  local: Local | null;
  onClose: () => void;
}

export default function FinanciamientoModal({
  isOpen,
  local,
  onClose,
}: FinanciamientoModalProps) {
  if (!isOpen || !local) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Financiamiento de Local: {local.codigo} - {local.proyecto_nombre || 'N/A'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body - Placeholder */}
        <div className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              Funcionalidad de financiamiento próximamente.
            </p>
            <div className="text-sm text-gray-500 space-y-2">
              <p><strong>Local:</strong> {local.codigo}</p>
              <p><strong>Proyecto:</strong> {local.proyecto_nombre}</p>
              <p><strong>Metraje:</strong> {local.metraje} m²</p>
              {local.monto_venta && (
                <p>
                  <strong>Monto de Venta:</strong>{' '}
                  $ {local.monto_venta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
