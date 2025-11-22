// ============================================================================
// PÁGINA: Comisiones
// ============================================================================
// Ruta: /comisiones
// Descripción: Sistema de cálculo y seguimiento de comisiones de vendedores
// Acceso: Todos los roles (cada usuario ve sus propias comisiones)
// ============================================================================

import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { DollarSign } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ComisionesPage() {
  // Validación de sesión
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Header */}
      <DashboardHeader
        title="Comisiones"
        subtitle="Seguimiento de comisiones por ventas realizadas"
      />

      {/* Contenido Placeholder */}
      <div className="max-w-[1400px] mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Sistema de Comisiones
            </h2>
            <p className="text-gray-600 max-w-md mb-4">
              Esta sección permitirá visualizar y realizar seguimiento de las comisiones
              generadas por las ventas realizadas, incluyendo cálculos automáticos,
              estados de pago y histórico de comisiones.
            </p>

            {/* Info Role-based */}
            {session.rol === 'admin' || session.rol === 'jefe_ventas' ? (
              <div className="mt-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Como {session.rol === 'admin' ? 'administrador' : 'jefe de ventas'}, podrás ver
                  las comisiones de todos los vendedores y gestionar los pagos.
                </p>
              </div>
            ) : (
              <div className="mt-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Aquí podrás ver el detalle de tus comisiones por cada venta realizada.
                </p>
              </div>
            )}

            <div className="mt-4 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
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
