// ============================================================================
// COMPONENT: FichaInscripcionModal
// ============================================================================
// Descripción: Modal para mostrar la ficha de inscripción de un local
// Sesión: 65 - Integración ficha de inscripción en /locales
// ============================================================================

'use client';

import { X } from 'lucide-react';
import { Local } from '@/lib/locales';

interface FichaInscripcionModalProps {
  isOpen: boolean;
  onClose: () => void;
  local: Local | null;
}

export default function FichaInscripcionModal({
  isOpen,
  onClose,
  local,
}: FichaInscripcionModalProps) {
  if (!isOpen || !local) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header sticky verde */}
        <div className="sticky top-0 z-10 bg-[#1b967a] text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Ficha de Inscripción - {local.codigo}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="overflow-y-auto flex-1 p-6">
          {/* Contenido temporal - Se reemplazará con el template real */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-500 text-lg mb-4">
              Ficha de Inscripción
            </p>
            <p className="text-gray-400 text-sm">
              Local: <strong>{local.codigo}</strong>
            </p>
            <p className="text-gray-400 text-sm">
              Proyecto: <strong>{local.proyecto_nombre || 'N/A'}</strong>
            </p>
            <p className="text-gray-400 text-sm">
              Metraje: <strong>{local.metraje} m²</strong>
            </p>
            <p className="text-gray-400 text-sm mt-4">
              (El template completo se integrará próximamente)
            </p>
          </div>
        </div>

        {/* Footer sticky */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 rounded-b-lg flex justify-end">
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