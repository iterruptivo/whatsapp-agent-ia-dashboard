'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

export default function ConfiguracionProyecto() {
  const router = useRouter();
  const { user, selectedProyecto, loading: authLoading } = useAuth();

  // Redirect if not authenticated or no proyecto selected
  useEffect(() => {
    if (!authLoading && (!user || !selectedProyecto)) {
      router.push('/login');
    }
  }, [user, selectedProyecto, authLoading, router]);

  // Show loading while auth is loading
  if (authLoading || !selectedProyecto) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <DashboardHeader
        title="Configuración del Proyecto"
        subtitle={`Configuración - ${selectedProyecto.nombre}`}
      />

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Configuración del Proyecto
          </h2>
          <p className="text-gray-600">
            Esta página estará disponible próximamente para configurar las opciones de tu proyecto.
          </p>
        </div>
      </main>
    </div>
  );
}
