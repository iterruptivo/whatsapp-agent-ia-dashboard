// ============================================================================
// COMPONENT: ControlPagosTab (Segundo Sub-Tab de Gestión de Locales)
// ============================================================================
// Descripción: Tab para control de pagos de locales vendidos
// Acceso: SOLO admin y jefe_ventas
// Estado: PLACEHOLDER - Funcionalidad a desarrollar
// ============================================================================

'use client';

import { FileText } from 'lucide-react';

export default function ControlPagosTab() {
  return (
    <div className="min-h-[600px] flex items-center justify-center bg-white rounded-lg shadow-md">
      <div className="text-center max-w-md p-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#1b967a]/10 rounded-full mb-6">
          <FileText className="w-10 h-10 text-[#1b967a]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Control de Pagos</h2>
        <p className="text-gray-600 mb-2">
          Esta sección estará disponible próximamente.
        </p>
        <p className="text-sm text-gray-500">
          Aquí podrás gestionar los pagos de los locales vendidos, ver calendarios de cuotas, y registrar pagos realizados.
        </p>
      </div>
    </div>
  );
}
