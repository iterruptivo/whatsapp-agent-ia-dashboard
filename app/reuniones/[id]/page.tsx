// ============================================================================
// PAGE: Detalle de Reunión
// ============================================================================
// Descripcion: Detalle completo de una reunión con tabs
// Features: Resumen, Action Items, Transcripción
// Acceso: admin, gerencia, jefe_ventas
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Video, Loader2, AlertCircle } from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import ReunionDetalleHeader from '@/components/reuniones/ReunionDetalleHeader';
import ReunionResumenTab from '@/components/reuniones/ReunionResumenTab';
import ReunionActionItemsTab from '@/components/reuniones/ReunionActionItemsTab';
import ReunionTranscripcionTab from '@/components/reuniones/ReunionTranscripcionTab';
import { getReunionDetalle } from '@/lib/actions-reuniones';
import { Reunion, ReunionActionItem } from '@/types/reuniones';

type TabType = 'resumen' | 'action-items' | 'transcripcion';

export default function ReunionDetallePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const reunionId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('resumen');
  const [loading, setLoading] = useState(true);
  const [reunion, setReunion] = useState<Reunion | null>(null);
  const [actionItems, setActionItems] = useState<ReunionActionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Verificar acceso
  useEffect(() => {
    if (!authLoading && user) {
      if (user.rol !== 'admin' && user.rol !== 'gerencia' && user.rol !== 'jefe_ventas') {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const result = await getReunionDetalle(reunionId);

      if (result.success && result.data) {
        setReunion(result.data.reunion);
        setActionItems(result.data.actionItems);
      } else {
        setError(result.error || 'Error al cargar reunión');
      }

      setLoading(false);
    };

    if (reunionId) {
      loadData();
    }
  }, [reunionId]);

  if (authLoading || loading) {
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

  if (error || !reunion) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader title="Reunión" subtitle="Detalle de reunión" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {error || 'Reunión no encontrada'}
            </h2>
            <button
              onClick={() => router.push('/reuniones')}
              className="mt-4 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors"
            >
              Volver a Reuniones
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader title="Detalle de Reunión" subtitle={reunion.titulo} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Boton volver */}
        <button
          onClick={() => router.push('/reuniones')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Reuniones
        </button>

        {/* Header de la reunion */}
        <ReunionDetalleHeader
          reunion={reunion}
          actionItems={actionItems}
          onReprocess={() => {
            // Recargar datos
            getReunionDetalle(reunionId).then((result) => {
              if (result.success && result.data) {
                setReunion(result.data.reunion);
                setActionItems(result.data.actionItems);
              }
            });
          }}
        />

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
          {/* Tab headers - scrollable en móvil */}
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('resumen')}
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 font-medium transition-colors whitespace-nowrap text-sm sm:text-base flex-shrink-0 ${
                  activeTab === 'resumen'
                    ? 'text-[#1b967a] border-b-2 border-[#1b967a]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Resumen
              </button>
              <button
                onClick={() => setActiveTab('action-items')}
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 font-medium transition-colors whitespace-nowrap text-sm sm:text-base flex-shrink-0 ${
                  activeTab === 'action-items'
                    ? 'text-[#1b967a] border-b-2 border-[#1b967a]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="hidden sm:inline">Action Items</span>
                <span className="sm:hidden">Tareas</span>
                {actionItems.length > 0 && (
                  <span className="ml-1 px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                    {actionItems.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('transcripcion')}
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 font-medium transition-colors whitespace-nowrap text-sm sm:text-base flex-shrink-0 ${
                  activeTab === 'transcripcion'
                    ? 'text-[#1b967a] border-b-2 border-[#1b967a]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Transcripción
              </button>
            </div>
          </div>

          {/* Tab content - padding responsivo */}
          <div className="p-4 sm:p-6">
            {activeTab === 'resumen' && <ReunionResumenTab reunion={reunion} />}
            {activeTab === 'action-items' && (
              <ReunionActionItemsTab
                actionItems={actionItems}
                reunionId={reunionId}
                onUpdate={() => {
                  // Recargar action items
                  getReunionDetalle(reunionId).then((result) => {
                    if (result.success && result.data) {
                      setActionItems(result.data.actionItems);
                    }
                  });
                }}
              />
            )}
            {activeTab === 'transcripcion' && <ReunionTranscripcionTab reunion={reunion} />}
          </div>
        </div>
      </main>
    </div>
  );
}
