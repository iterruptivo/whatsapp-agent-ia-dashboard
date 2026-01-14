// ============================================================================
// PAGE: Detalle de Solicitud de Compra
// ============================================================================
// Descripcion: Vista detallada de una PR con timeline, comentarios y acciones
// Features: PRDetailView, acciones (aprobar/rechazar/cancelar), responsive
// Acceso: Usuario solicitante, aprobador asignado, admins
// ============================================================================

'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { PRDetailView } from '@/components/purchase-requisitions';
import { getPRById } from '@/lib/actions-purchase-requisitions';
import type { PRDetailViewData } from '@/lib/types/purchase-requisitions';
import { toast } from 'sonner';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SolicitudCompraDetallePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const prId = resolvedParams.id;

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [prData, setPrData] = useState<PRDetailViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Cargar datos de la PR
  useEffect(() => {
    const loadPR = async () => {
      if (!user || !prId) return;

      setLoading(true);

      try {
        const data = await getPRById(prId);

        if (!data) {
          setNotFound(true);
          toast.error('Solicitud no encontrada');
        } else {
          setPrData(data);
        }
      } catch (error) {
        console.error('[solicitud-detalle] Error loading PR:', error);
        toast.error('Error al cargar la solicitud');
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadPR();
  }, [user, prId]);

  // Callback después de una acción (aprobar, rechazar, etc.)
  const handleActionSuccess = async () => {
    // Recargar datos
    if (prId) {
      const data = await getPRById(prId);
      if (data) {
        setPrData(data);
      }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader title="Cargando..." subtitle="Solicitud de Compra" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#1b967a]" />
        </div>
      </div>
    );
  }

  if (notFound || !prData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader title="No Encontrada" subtitle="Solicitud de Compra" />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Botón volver */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/solicitudes-compra')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Volver a Solicitudes</span>
            </button>
          </div>

          <div className="text-center bg-white rounded-lg shadow-md p-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800">Solicitud No Encontrada</h2>
            <p className="text-gray-500 mt-2">
              La solicitud que buscas no existe o no tienes permiso para verla.
            </p>
            <button
              onClick={() => router.push('/solicitudes-compra')}
              className="mt-6 px-4 py-2 bg-[#1b967a] text-white rounded-lg hover:bg-[#156b5a] transition-colors"
            >
              Volver a Solicitudes
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title={`PR-${prData.pr.pr_number}`}
        subtitle="Detalle de Solicitud de Compra"
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Botón volver */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/solicitudes-compra')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Volver a Solicitudes</span>
          </button>
        </div>

        {/* Vista detallada */}
        <PRDetailView data={prData} userId={user.id} onUpdate={handleActionSuccess} />
      </main>
    </div>
  );
}
