// ============================================================================
// PAGE: Nueva Solicitud de Compra
// ============================================================================
// Descripcion: Formulario para crear una nueva PR
// Features: CreatePRForm, validacion, redireccion al detalle
// Acceso: Todos los usuarios autenticados
// ============================================================================

'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { CreatePRForm } from '@/components/purchase-requisitions';
import type { PurchaseRequisition } from '@/lib/types/purchase-requisitions';

export default function NuevaSolicitudCompraPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Handler cuando se crea/envía exitosamente
  const handleSuccess = (pr: PurchaseRequisition) => {
    // Redirigir al detalle de la PR creada
    router.push(`/solicitudes-compra/${pr.id}`);
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
      <DashboardHeader title="Nueva Solicitud de Compra" subtitle="Crear purchase requisition" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb / Botón volver */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/solicitudes-compra')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Volver a Solicitudes</span>
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#192c4d]">Nueva Solicitud de Compra</h1>
          <p className="text-gray-500 mt-2">
            Completa el formulario para crear una nueva solicitud de compra. Puedes guardarla como borrador o enviarla directamente a aprobación.
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <CreatePRForm
            onSuccess={handleSuccess}
            onCancel={() => router.push('/solicitudes-compra')}
          />
        </div>
      </main>
    </div>
  );
}
