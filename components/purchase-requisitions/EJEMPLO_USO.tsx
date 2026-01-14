/**
 * EJEMPLO DE USO - Purchase Requisitions Components
 *
 * Este archivo muestra cómo usar los componentes de PR en páginas reales.
 * NO es un componente funcional, solo ejemplos de código.
 */

// ============================================================================
// EJEMPLO 1: Página "Mis Solicitudes" (para el solicitante)
// ============================================================================

/*
'use client';

import { useState, useEffect } from 'react';
import { PRList, CreatePRForm } from '@/components/purchase-requisitions';
import { getMyPRs } from '@/lib/actions-purchase-requisitions';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MisSolicitudesPage() {
  const router = useRouter();
  const [prs, setPrs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadPRs();
  }, []);

  const loadPRs = async () => {
    setIsLoading(true);
    const result = await getMyPRs();
    setPrs(result.data);
    setIsLoading(false);
  };

  const handleViewPR = (pr) => {
    router.push(`/purchase-requisitions/${pr.id}`);
  };

  const handleCreateSuccess = (prId, isDraft) => {
    setShowCreateForm(false);
    router.push(`/purchase-requisitions/${prId}`);
  };

  if (showCreateForm) {
    return (
      <div className="container mx-auto px-4 py-8">
        <CreatePRForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mis Solicitudes</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90"
        >
          <Plus className="w-5 h-5" />
          Nueva Solicitud
        </button>
      </div>

      <PRList
        prs={prs}
        isLoading={isLoading}
        onViewPR={handleViewPR}
      />
    </div>
  );
}
*/

// ============================================================================
// EJEMPLO 2: Página "Bandeja de Aprobación" (para aprobadores)
// ============================================================================

/*
'use client';

import { useState, useEffect } from 'react';
import { PRApprovalInbox } from '@/components/purchase-requisitions';
import { getPendingApprovals } from '@/lib/actions-purchase-requisitions';

export default function BandejaAprobacionPage() {
  const [prs, setPrs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPendingPRs();
  }, []);

  const loadPendingPRs = async () => {
    setIsLoading(true);
    const data = await getPendingApprovals();
    setPrs(data);
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Solicitudes Pendientes de Aprobación
      </h1>

      <PRApprovalInbox
        prs={prs}
        isLoading={isLoading}
        onPRUpdated={loadPendingPRs}
      />
    </div>
  );
}
*/

// ============================================================================
// EJEMPLO 3: Página de Detalle (para ver una PR específica)
// ============================================================================

/*
'use client';

import { useState, useEffect } from 'react';
import { PRDetailView } from '@/components/purchase-requisitions';
import { getPRById } from '@/lib/actions-purchase-requisitions';
import { useAuth } from '@/lib/auth-context';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function PRDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadPR();
    }
  }, [params.id]);

  const loadPR = async () => {
    setIsLoading(true);
    const result = await getPRById(params.id as string);
    setData(result);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-secondary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-600">Solicitud no encontrada</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver
      </button>

      <PRDetailView
        data={data}
        userId={user?.id || ''}
        onUpdate={loadPR}
      />
    </div>
  );
}
*/

// ============================================================================
// EJEMPLO 4: Dashboard con Estadísticas
// ============================================================================

/*
'use client';

import { useState, useEffect } from 'react';
import { getPRStats } from '@/lib/actions-purchase-requisitions';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';

export default function PRDashboardPage() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    const data = await getPRStats();
    setStats(data);
    setIsLoading(false);
  };

  if (isLoading) return <div>Cargando...</div>;
  if (!stats) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Dashboard - Solicitudes de Compra
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total"
          value={stats.total}
          icon={FileText}
          color="gray"
        />
        <StatsCard
          title="Pendientes"
          value={stats.pending_count}
          icon={Clock}
          color="accent"
        />
        <StatsCard
          title="Aprobadas"
          value={stats.approved_count}
          icon={CheckCircle}
          color="secondary"
        />
        <StatsCard
          title="Tasa de Aprobación"
          value={`${stats.approval_rate.toFixed(1)}%`}
          icon={CheckCircle}
          color="primary"
        />
      </div>

      {/* Aquí puedes agregar más gráficos, tablas, etc. }
    </div>
  );
}
*/

// ============================================================================
// EJEMPLO 5: Modal para crear PR rápidamente
// ============================================================================

/*
'use client';

import { useState } from 'react';
import { CreatePRForm } from '@/components/purchase-requisitions';
import { X } from 'lucide-react';

export function QuickCreatePRModal({ isOpen, onClose, onSuccess }) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Nueva Solicitud de Compra
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <CreatePRForm
                onSuccess={(prId, isDraft) => {
                  onSuccess(prId, isDraft);
                  onClose();
                }}
                onCancel={onClose}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
*/

export {};
