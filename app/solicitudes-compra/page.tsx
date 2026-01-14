// ============================================================================
// PAGE: Solicitudes de Compra (Purchase Requisitions)
// ============================================================================
// Descripcion: Pagina principal con tabs para mis solicitudes y aprobaciones pendientes
// Features: Tabs, lista de mis PRs, bandeja de aprobaciones, estadisticas
// Acceso: Todos los usuarios (todos pueden crear PRs)
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Plus, Loader2, AlertCircle, FileText, Clock } from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { PRList, PRApprovalInbox } from '@/components/purchase-requisitions';
import { getMyPRs, getPendingApprovals, getMyPRsStats } from '@/lib/actions-purchase-requisitions';
import type { PurchaseRequisition } from '@/lib/types/purchase-requisitions';
import { toast } from 'sonner';

export default function SolicitudesCompraPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'mis-solicitudes' | 'pendientes-aprobacion'>('mis-solicitudes');
  const [myPRs, setMyPRs] = useState<PurchaseRequisition[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
  });

  // Cargar datos - OPTIMIZADO: queries en paralelo
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      setLoading(true);

      try {
        // Ejecutar las 3 queries en paralelo
        const [myPRsResult, pendingResult, statsResult] = await Promise.all([
          getMyPRs(),
          getPendingApprovals(),
          getMyPRsStats(),
        ]);

        // Actualizar estado
        if (myPRsResult.data) {
          setMyPRs(myPRsResult.data);
        }

        if (pendingResult) {
          setPendingApprovals(pendingResult);
        }

        if (statsResult) {
          setStats(statsResult);
        }
      } catch (error) {
        console.error('[solicitudes-compra] Error loading data:', error);
        toast.error('Error al cargar solicitudes');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Callback cuando se actualiza una PR en la bandeja de aprobación
  const handlePRUpdated = async () => {
    if (!user) return;
    try {
      const pendingResult = await getPendingApprovals();
      if (pendingResult) {
        setPendingApprovals(pendingResult);
      }
      const myPRsResult = await getMyPRs();
      if (myPRsResult.data) {
        setMyPRs(myPRsResult.data);
      }
    } catch (error) {
      console.error('[solicitudes-compra] Error refreshing data:', error);
    }
  };

  // Validar autenticación
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#1b967a]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Acceso Denegado</h2>
          <p className="text-gray-500 mt-2">Debes iniciar sesión para acceder a esta página</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader title="Solicitudes de Compra" subtitle="Gestión de purchase requisitions" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header de página */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#1b967a] rounded-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Compra</h1>
                <p className="text-gray-500">
                  Gestiona tus solicitudes de compra y aprobaciones
                </p>
              </div>
            </div>

            {/* Botón nueva solicitud */}
            <button
              onClick={() => router.push('/solicitudes-compra/nueva')}
              className="flex items-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#156b5a] transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Nueva Solicitud
            </button>
          </div>

          {/* Estadísticas rápidas */}
          {!loading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-700">{stats.draft}</div>
                <div className="text-sm text-yellow-600">Borradores</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700">{stats.pending}</div>
                <div className="text-sm text-blue-600">Pendientes</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700">{stats.approved}</div>
                <div className="text-sm text-green-600">Aprobadas</div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {/* Tab: Mis Solicitudes */}
              <button
                onClick={() => setActiveTab('mis-solicitudes')}
                className={`${
                  activeTab === 'mis-solicitudes'
                    ? 'border-[#1b967a] text-[#1b967a]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <FileText className="w-5 h-5" />
                Mis Solicitudes
                {stats.total > 0 && (
                  <span className="ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {stats.total}
                  </span>
                )}
              </button>

              {/* Tab: Pendientes de Aprobación (solo si tiene PRs pendientes) */}
              {pendingApprovals.length > 0 && (
                <button
                  onClick={() => setActiveTab('pendientes-aprobacion')}
                  className={`${
                    activeTab === 'pendientes-aprobacion'
                      ? 'border-[#1b967a] text-[#1b967a]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                >
                  <Clock className="w-5 h-5" />
                  Pendientes de Aprobación
                  <span className="ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                    {pendingApprovals.length}
                  </span>
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Contenido de tabs */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#1b967a]" />
          </div>
        ) : (
          <>
            {activeTab === 'mis-solicitudes' && (
              <PRList
                prs={myPRs}
                onViewPR={(pr) => router.push(`/solicitudes-compra/${pr.id}`)}
              />
            )}

            {activeTab === 'pendientes-aprobacion' && (
              <PRApprovalInbox
                prs={pendingApprovals}
                onPRUpdated={handlePRUpdated}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
