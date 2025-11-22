// ============================================================================
// COMPONENT: ComisionesTab (Tercer Sub-Tab de Gestión de Locales)
// ============================================================================
// Descripción: Tab para visualizar comisiones por ventas de locales
// Acceso: TODOS los roles (admin, jefe_ventas, vendedor, vendedor_caseta)
// Estado: PLACEHOLDER - Funcionalidad a desarrollar
// ============================================================================

'use client';

import { DollarSign } from 'lucide-react';

export default function ComisionesTab() {
  return (
    <div className="min-h-[600px] flex items-center justify-center bg-white rounded-lg shadow-md">
      <div className="text-center max-w-md p-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#fbde17]/20 rounded-full mb-6">
          <DollarSign className="w-10 h-10 text-[#192c4d]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Comisiones</h2>
        <p className="text-gray-600 mb-2">
          Esta sección estará disponible próximamente.
        </p>
        <p className="text-sm text-gray-500">
          Aquí podrás visualizar las comisiones generadas por ventas de locales, historial de pagos, y estadísticas de rendimiento.
        </p>
      </div>
    </div>
  );
}
