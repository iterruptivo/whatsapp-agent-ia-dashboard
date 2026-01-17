'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import ReporteriaClient from '@/components/reporteria/ReporteriaClient';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { canCurrentUser } from '@/lib/permissions/server';
import { isRBACEnabled } from '@/lib/permissions/types';

export default function ReporteriaPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // RBAC: Verificar permiso insights:read
  useEffect(() => {
    async function checkAccess() {
      if (!loading && user) {
        // Si RBAC está habilitado, verificar permiso; si no, usar legacy
        if (isRBACEnabled()) {
          const canRead = await canCurrentUser('insights', 'read');
          setHasAccess(canRead);
        } else {
          // Fallback legacy: superadmin, admin, jefe_ventas, marketing, finanzas
          const hasLegacyAccess = user.rol === 'superadmin' || user.rol === 'admin' || user.rol === 'jefe_ventas' || user.rol === 'marketing' || user.rol === 'finanzas';
          setHasAccess(hasLegacyAccess);
        }
      }
    }
    checkAccess();
  }, [user, loading]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (hasAccess === false) {
        setShowAccessDenied(true);
      }
    }
  }, [user, loading, hasAccess, router]);

  if (loading || hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1b967a]"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (showAccessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600 mb-6">No tienes permisos para acceder a esta página. Solo administradores, jefes de ventas, marketing y finanzas pueden ver la reportería.</p>
          <button
            onClick={() => router.back()}
            className="w-full py-3 px-4 bg-[#1b967a] text-white font-medium rounded-lg hover:bg-[#157a64] transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <DashboardHeader
        title="Reportería"
        subtitle="Análisis de leads por vendedor en todos los proyectos"
      />
      <div className="max-w-[1920px] mx-auto p-6">
        <ReporteriaClient user={user} />
      </div>
    </div>
  );
}
