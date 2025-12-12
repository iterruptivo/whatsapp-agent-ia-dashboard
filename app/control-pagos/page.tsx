// ============================================================================
// PÁGINA: Control de Pagos
// ============================================================================
// Ruta: /control-pagos
// Descripción: Sistema de control y seguimiento de pagos de locales
// Acceso: admin, jefe_ventas y finanzas
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

export default function ControlPagosPage() {
  const router = useRouter();
  const { user, loading, selectedProyecto } = useAuth();
  const [controlPagos, setControlPagos] = useState<ControlPago[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Redirect if not authenticated or not admin/jefe_ventas/finanzas
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.rol !== 'admin' && user.rol !== 'jefe_ventas' && user.rol !== 'finanzas') {
        router.push('/');
      }
    }
  }, [user, loading, router]);

  // Fetch control_pagos data filtrado por proyecto
  useEffect(() => {
    if (user && (user.rol === 'admin' || user.rol === 'jefe_ventas' || user.rol === 'finanzas') && selectedProyecto?.id) {
      const proyectoId = selectedProyecto.id;
      async function fetchData() {
        setLoadingData(true);
        const data = await getAllControlPagos(proyectoId);
        setControlPagos(data);
        setLoadingData(false);
      }
      fetchData();
    }
  }, [user, selectedProyecto?.id]);

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
