// ============================================================================
// PÁGINA: Repulse
// ============================================================================
// Ruta: /repulse
// Descripción: Página de Repulse (en desarrollo)
// Acceso: admin y jefe_ventas (preparado para incluir vendedor en el futuro)
// ============================================================================

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

// Roles que tienen acceso a esta página
// Para añadir vendedor en el futuro, simplemente agregar 'vendedor' al array
const ALLOWED_ROLES = ['admin', 'jefe_ventas'] as const;

export default function RepulsePage() {
  const router = useRouter();
  const { user, loading, selectedProyecto } = useAuth();

  // Redirect if not authenticated or not authorized
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!ALLOWED_ROLES.includes(user.rol as typeof ALLOWED_ROLES[number])) {
        // Redirigir según el rol
        if (user.rol === 'vendedor') {
          router.push('/operativo');
        } else {
          router.push('/locales');
        }
      }
    }
  }, [user, loading, router]);

  // Show loading while auth is loading
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Header */}
      <DashboardHeader
        title="Repulse"
        subtitle={`Gestión de Repulse${selectedProyecto?.nombre ? ` - ${selectedProyecto.nombre}` : ''}`}
      />

      {/* Contenido */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Página en desarrollo</h2>
          <p className="text-gray-500">El contenido de Repulse estará disponible próximamente.</p>
        </div>
      </div>
    </div>
  );
}
