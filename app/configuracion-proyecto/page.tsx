'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { getProyectoConfiguracion } from '@/lib/proyecto-config';
import { saveProyectoTEA } from '@/lib/actions-proyecto-config';
import { Save } from 'lucide-react';

export default function ConfiguracionProyecto() {
  const router = useRouter();
  const { user, selectedProyecto, loading: authLoading } = useAuth();
  const [tea, setTea] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redirect if not authenticated or no proyecto selected
  useEffect(() => {
    if (!authLoading && (!user || !selectedProyecto)) {
      router.push('/login');
    }
  }, [user, selectedProyecto, authLoading, router]);

  // Load existing configuration
  useEffect(() => {
    async function loadConfig() {
      if (!selectedProyecto) return;

      setLoading(true);
      const config = await getProyectoConfiguracion(selectedProyecto.id);
      if (config && config.tea !== null) {
        setTea(config.tea.toString());
      }
      setLoading(false);
    }

    if (selectedProyecto) {
      loadConfig();
    }
  }, [selectedProyecto]);

  const handleSave = async () => {
    if (!selectedProyecto) return;

    const teaValue = tea.trim() === '' ? null : parseFloat(tea);

    if (teaValue !== null && (isNaN(teaValue) || teaValue <= 0 || teaValue > 100)) {
      setMessage({ type: 'error', text: 'TEA debe ser un número mayor a 0 y menor o igual a 100' });
      return;
    }

    setSaving(true);
    setMessage(null);

    const result = await saveProyectoTEA(selectedProyecto.id, teaValue);

    setSaving(false);

    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  // Show loading while auth is loading
  if (authLoading || !selectedProyecto || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <DashboardHeader
        title="Configuración del Proyecto"
        subtitle={`Configuración - ${selectedProyecto.nombre}`}
      />

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Configuración del Proyecto
          </h2>

          {/* TEA Field */}
          <div className="max-w-md">
            <label htmlFor="tea" className="block text-lg font-semibold text-gray-900 mb-1">
              TEA del proyecto
            </label>
            <p className="text-sm text-gray-500 mb-4">
              Este dato se usará para financiamiento del proyecto
            </p>
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="number"
                  id="tea"
                  value={tea}
                  onChange={(e) => setTea(e.target.value)}
                  placeholder="Ej: 18.5"
                  min="0.01"
                  max="100"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                  saving
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary/90 hover:shadow-md active:scale-95'
                }`}
              >
                <Save className="w-5 h-5" />
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>

            {/* Message */}
            {message && (
              <div
                className={`mt-4 p-4 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
