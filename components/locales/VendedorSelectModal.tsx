// ============================================================================
// COMPONENT: VendedorSelectModal
// ============================================================================
// Descripción: Modal para que admin asigne local a vendedor
// Uso: Al cambiar estados amarillo/naranja, admin debe seleccionar vendedor
// ============================================================================

'use client';

import { useState } from 'react';
import { X, UserCheck } from 'lucide-react';
import { VendedorActivo } from '@/lib/locales';

interface VendedorSelectModalProps {
  isOpen: boolean;
  vendedores: VendedorActivo[];
  estadoDestino: 'amarillo' | 'naranja';
  localCodigo: string;
  vendedorActualId?: string | null;
  onConfirm: (vendedorId: string) => void;
  onCancel: () => void;
}

export default function VendedorSelectModal({
  isOpen,
  vendedores,
  estadoDestino,
  localCodigo,
  vendedorActualId,
  onConfirm,
  onCancel,
}: VendedorSelectModalProps) {
  const [selectedVendedorId, setSelectedVendedorId] = useState<string>(
    vendedorActualId || ''
  );

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedVendedorId) {
      alert('Por favor selecciona un vendedor');
      return;
    }
    onConfirm(selectedVendedorId);
  };

  // Texto según estado
  const estadoTexto = {
    amarillo: 'Amarillo (Negociación)',
    naranja: 'Naranja (Cliente Confirmó)',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Asignar Local a Vendedor
              </h3>
              <p className="text-sm text-gray-500">Local {localCodigo}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Vas a cambiar el estado a{' '}
            <span
              className={`font-semibold ${
                estadoDestino === 'amarillo' ? 'text-yellow-600' : 'text-orange-600'
              }`}
            >
              {estadoTexto[estadoDestino]}
            </span>
            . Selecciona el vendedor que gestionará este local:
          </p>

          {/* Select de Vendedores */}
          <div>
            <label
              htmlFor="vendedor-select"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Vendedor Asignado
            </label>
            <select
              id="vendedor-select"
              value={selectedVendedorId}
              onChange={(e) => setSelectedVendedorId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">-- Selecciona un vendedor --</option>
              {vendedores.map((vendedor) => (
                <option key={vendedor.id} value={vendedor.vendedor_id}>
                  {vendedor.nombre}{' '}
                  {vendedor.rol === 'vendedor_caseta' ? '(Caseta)' : '(Vendedor)'}
                </option>
              ))}
            </select>
          </div>

          {/* Info adicional */}
          {selectedVendedorId && (
            <div className="bg-primary/5 border border-primary/20 rounded-md p-3">
              <p className="text-sm text-primary">
                ✓ El local {localCodigo} será asignado al vendedor seleccionado y
                quedará registrado en el historial.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 bg-gray-50 rounded-b-lg">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedVendedorId}
            className={`flex-1 px-4 py-2 rounded-md font-medium text-white transition-colors ${
              selectedVendedorId
                ? 'bg-primary hover:bg-primary/90'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Confirmar Asignación
          </button>
        </div>
      </div>
    </div>
  );
}
