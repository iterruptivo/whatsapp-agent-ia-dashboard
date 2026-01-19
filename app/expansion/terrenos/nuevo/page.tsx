'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { WizardTerreno } from '@/components/expansion/terrenos';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

export default function NuevoTerrenoPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con menú */}
      <DashboardHeader
        title="Nuevo Terreno"
        subtitle="Completa el formulario para enviar tu propuesta"
      />

      {/* Wizard */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Botón Volver */}
        <button
          onClick={() => router.push('/expansion/terrenos')}
          className="flex items-center gap-2 mb-4 text-gray-600 hover:text-[#1b967a] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver a Mis Terrenos
        </button>

        <WizardTerreno />
      </div>
    </div>
  );
}
