// ============================================================================
// PÁGINA: Control de Pagos
// ============================================================================
// Ruta: /control-pagos
// Descripción: Sistema de control y seguimiento de pagos de locales
// Acceso: Requiere permiso control_pagos:read (RBAC)
// Sesión: 54 - Implementación completa
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import ControlPagosClient from '@/components/control-pagos/ControlPagosClient';
import { getAllControlPagos } from '@/lib/actions-control-pagos';
import type { ControlPago } from '@/lib/actions-control-pagos';
import { canCurrentUser } from '@/lib/permissions/server';
import { isRBACEnabled } from '@/lib/permissions/types';

export default function ControlPagosPage() {
  const router = useRouter();
  const { user, loading, selectedProyecto } = useAuth();
  const [controlPagos, setControlPagos] = useState<ControlPago[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // RBAC: Verificar permiso control_pagos:read
  useEffect(() => {
    async function checkAccess() {
      if (!loading && user) {
        // Si RBAC está habilitado, verificar permiso; si no, usar legacy
        if (isRBACEnabled()) {
          const canRead = await canCurrentUser('control_pagos', 'read');
          setHasAccess(canRead);
        } else {
          // Fallback legacy: admin, jefe_ventas, finanzas
          const hasLegacyAccess = user.rol === 'admin' || user.rol === 'jefe_ventas' || user.rol === 'finanzas';
          setHasAccess(hasLegacyAccess);
        }
      }
    }
    checkAccess();
  }, [user, loading]);

  // Redirect if not authenticated or no access
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (hasAccess === false) {
        router.push('/');
      }
    }
  }, [user, loading, hasAccess, router]);

  // Fetch control_pagos data filtrado por proyecto
  useEffect(() => {
    if (hasAccess === true && selectedProyecto?.id) {
      const proyectoId = selectedProyecto.id;
      async function fetchData() {
        setLoadingData(true);
        const data = await getAllControlPagos(proyectoId);
        setControlPagos(data);
        setLoadingData(false);
      }
      fetchData();
    }
  }, [hasAccess, selectedProyecto?.id]);

  // Show loading while auth is loading or access check is pending
  if (loading || !user || hasAccess === null) {
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
        title="Control de Pagos"
        subtitle={`Seguimiento y gestión de pagos de locales vendidos${selectedProyecto?.nombre ? ` - ${selectedProyecto.nombre}` : ''}`}
      />

      {/* Contenido */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingData ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando control de pagos...</p>
          </div>
        ) : (
          <ControlPagosClient initialData={controlPagos} />
        )}
      </div>
    </div>
  );
}
