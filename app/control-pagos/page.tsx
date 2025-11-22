// ============================================================================
// PÁGINA: Control de Pagos
// ============================================================================
// Ruta: /control-pagos
// Descripción: Sistema de control y seguimiento de pagos de locales
// Acceso: Solo admin y jefe_ventas
// ============================================================================

import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ControlPagosPage() {
  // Validación de acceso role-based
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // Solo admin y jefe_ventas pueden acceder
  if (session.rol !== 'admin' && session.rol !== 'jefe_ventas') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Header */}
      <DashboardHeader
        title="Control de Pagos"
        subtitle="Seguimiento y gestión de pagos de locales"
      />

      {/* Contenido Placeholder */}
      <div className="max-w-[1400px] mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Control de Pagos
            </h2>
            <p className="text-gray-600 max-w-md">
              Esta sección permitirá gestionar y realizar seguimiento detallado de los pagos
              de cada local vendido, incluyendo calendario de cuotas, pagos recibidos y pendientes.
            </p>
            <div className="mt-6 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Funcionalidad en desarrollo
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
