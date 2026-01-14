// ============================================================================
// PAGE: Aprobaciones de Descuento
// ============================================================================
// Descripcion: Pagina para gestionar aprobaciones de descuento
// Features: Panel de pendientes, historial, configuracion (admin)
// Fase: 5 - Aprobacion de Descuentos
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Settings, Loader2, AlertCircle } from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import AprobacionesPendientesPanel from '@/components/aprobaciones/AprobacionesPendientesPanel';
import AprobacionesConfigPanel from '@/components/configuracion/AprobacionesConfigPanel';
import { getEstadisticasAprobaciones } from '@/lib/actions-aprobaciones';

export default function AprobacionesPage() {
  const { user, selectedProyecto, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showConfig, setShowConfig] = useState(false);
  const [stats, setStats] = useState<{
    pendientes: number;
    aprobadas: number;
    rechazadas: number;
  } | null>(null);

  // ============================================================================
  // VALIDACIÓN DE ACCESO - PREPARADO PARA RBAC (Grupo 2)
  // ============================================================================
  // PERMISO REQUERIDO: aprobaciones:read (PERMISOS_APROBACIONES.READ)
  // ROLES ACTUALES: admin, jefe_ventas
  // ============================================================================
  useEffect(() => {
    if (!authLoading && user) {
      // Validación legacy (será reemplazada por RBAC cuando se active)
      if (user.rol !== 'admin' && user.rol !== 'jefe_ventas') {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  // Cargar estadisticas
  useEffect(() => {
    const loadStats = async () => {
      if (!selectedProyecto?.id) return;

      const result = await getEstadisticasAprobaciones(selectedProyecto.id);
      if (result.success && result.data) {
        setStats({
          pendientes: result.data.pendientes,
          aprobadas: result.data.aprobadas,
          rechazadas: result.data.rechazadas,
        });
      }
    };

    loadStats();
  }, [selectedProyecto?.id]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#1b967a]" />
      </div>
    );
  }

  if (!user || (user.rol !== 'admin' && user.rol !== 'jefe_ventas')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Acceso Denegado</h2>
          <p className="text-gray-500 mt-2">No tienes permiso para acceder a esta pagina</p>
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
      <DashboardHeader title="Aprobaciones" subtitle="Gestión de descuentos" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header de pagina */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#1b967a] rounded-lg">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Aprobaciones de Descuento</h1>
                <p className="text-gray-500">
                  Gestiona las solicitudes de descuento pendientes
                </p>
              </div>
            </div>

            {/* Boton configuracion (solo admin) */}
            {user.rol === 'admin' && (
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                  showConfig
                    ? 'bg-[#1b967a] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Settings className="w-5 h-5" />
                {showConfig ? 'Ver Aprobaciones' : 'Configurar Rangos'}
              </button>
            )}
          </div>

          {/* Estadisticas rapidas */}
          {stats && !showConfig && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-700">{stats.pendientes}</div>
                <div className="text-sm text-yellow-600">Pendientes</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700">{stats.aprobadas}</div>
                <div className="text-sm text-green-600">Aprobadas</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-700">{stats.rechazadas}</div>
                <div className="text-sm text-red-600">Rechazadas</div>
              </div>
            </div>
          )}
        </div>

        {/* Contenido principal */}
        {showConfig ? (
          <AprobacionesConfigPanel
            proyectoId={selectedProyecto.id}
            onClose={() => setShowConfig(false)}
          />
        ) : (
          <AprobacionesPendientesPanel proyectoId={selectedProyecto.id} />
        )}
      </main>
    </div>
  );
}
