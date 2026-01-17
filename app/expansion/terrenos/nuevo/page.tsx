'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { WizardTerreno } from '@/components/expansion/terrenos';

export default function NuevoTerrenoPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/expansion/terrenos')}
              className="p-2 text-gray-600 hover:text-[#1b967a] hover:bg-gray-100 rounded-lg transition-colors"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[#192c4d]">
                Nuevo Terreno
              </h1>
              <p className="text-sm text-gray-600">
                Completa el formulario para enviar tu propuesta
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Wizard */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <WizardTerreno />
      </div>
    </div>
  );
}
