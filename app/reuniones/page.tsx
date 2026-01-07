// ============================================================================
// PAGE: Reuniones
// ============================================================================
// Descripcion: Lista de reuniones y transcripciones
// Features: Tabla, filtros, nueva reunion modal
// Acceso: admin, gerencia, jefe_ventas
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Video, Loader2, AlertCircle, Plus } from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import ReunionesTable from '@/components/reuniones/ReunionesTable';
import NuevaReunionModal from '@/components/reuniones/NuevaReunionModal';

export default function ReunionesPage() {
  const { user, selectedProyecto, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  // Verificar acceso
  useEffect(() => {
    if (!authLoading && user) {
      // Solo admin, gerencia y jefe_ventas pueden acceder
      if (user.rol !== 'admin' && user.rol !== 'gerencia' && user.rol !== 'jefe_ventas') {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#1b967a]" />
      </div>
    );
  }

  if (!user || (user.rol !== 'admin' && user.rol !== 'gerencia' && user.rol !== 'jefe_ventas')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Acceso Denegado</h2>
          <p className="text-gray-500 mt-2">No tienes permiso para acceder a esta página</p>
        </div>
      </div>
    );
  }

  if (!selectedProyecto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Selecciona un Proyecto</h2>
          <p className="text-gray-500 mt-2">Debes seleccionar un proyecto para continuar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader title="Reuniones" subtitle="Transcripciones y análisis de reuniones" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header de página */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#1b967a] rounded-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Reuniones</h1>
                <p className="text-gray-500">
                  Gestiona las transcripciones y análisis de tus reuniones
                </p>
              </div>
            </div>

            {/* Boton Nueva Reunion */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Nueva Reunión
            </button>
          </div>
        </div>

        {/* Tabla de reuniones */}
        <ReunionesTable proyectoId={selectedProyecto.id} />
      </main>

      {/* Modal Nueva Reunion */}
      <NuevaReunionModal
        isOpen={showModal}
        proyectoId={selectedProyecto.id}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false);
          // La tabla se recargará automáticamente
        }}
      />
    </div>
  );
}
