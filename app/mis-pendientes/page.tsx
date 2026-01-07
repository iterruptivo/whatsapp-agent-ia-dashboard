// ============================================================================
// PAGE: Mis Pendientes
// ============================================================================
// Descripcion: Action items asignados al usuario
// Features: Lista pendientes, marcar completado
// Acceso: Todos los roles
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Loader2, CheckSquare } from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import MisPendientesTable from '@/components/mis-pendientes/MisPendientesTable';

export default function MisPendientesPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#1b967a]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader title="Mis Pendientes" subtitle="Action items asignados a ti" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header de página */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#1b967a] rounded-lg">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mis Pendientes</h1>
              <p className="text-gray-500">
                Tareas y action items de reuniones asignados a ti
              </p>
            </div>
          </div>
        </div>

        {/* Tabla de pendientes */}
        <MisPendientesTable />
      </main>
    </div>
  );
}
