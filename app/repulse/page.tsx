// ============================================================================
// PÁGINA: Repulse
// ============================================================================
// Ruta: /repulse
// Descripción: Sistema de reimpulso de leads que no compraron
// Acceso: admin y jefe_ventas (preparado para incluir vendedor en el futuro)
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import RepulseClient from '@/components/repulse/RepulseClient';
import {
  getRepulseLeads,
  getRepulseTemplates,
  getRepulseStats,
  getQuotaWhatsApp,
  type RepulseLead,
  type RepulseTemplate,
  type QuotaInfo,
} from '@/lib/actions-repulse';

// Roles que tienen acceso a esta página
const ALLOWED_ROLES = ['admin', 'jefe_ventas'] as const;

export default function RepulsePage() {
  const router = useRouter();
  const { user, loading, selectedProyecto } = useAuth();
  const [repulseLeads, setRepulseLeads] = useState<RepulseLead[]>([]);
  const [templates, setTemplates] = useState<RepulseTemplate[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    enviados: 0,
    respondieron: 0,
    sinRespuesta: 0,
    excluidos: 0,
  });
  const [quota, setQuota] = useState<QuotaInfo>({
    leadsHoy: 0,
    limite: 250,
    disponible: 250,
    porcentajeUsado: 0,
  });
  const [loadingData, setLoadingData] = useState(true);

  // Redirect if not authenticated or not authorized
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!ALLOWED_ROLES.includes(user.rol as typeof ALLOWED_ROLES[number])) {
        if (user.rol === 'vendedor') {
          router.push('/operativo');
        } else {
          router.push('/locales');
        }
      }
    }
  }, [user, loading, router]);

  // Fetch data when project changes
  useEffect(() => {
    if (user && selectedProyecto?.id) {
      fetchData();
    }
  }, [user, selectedProyecto?.id]);

  const fetchData = async () => {
    if (!selectedProyecto?.id) return;

    setLoadingData(true);
    try {
      const [leadsData, templatesData, statsData, quotaData] = await Promise.all([
        getRepulseLeads(selectedProyecto.id),
        getRepulseTemplates(selectedProyecto.id),
        getRepulseStats(selectedProyecto.id),
        getQuotaWhatsApp(),
      ]);

      setRepulseLeads(leadsData);
      setTemplates(templatesData);
      setStats(statsData);
      setQuota(quotaData);
    } catch (error) {
      console.error('Error fetching repulse data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Show loading while auth is loading
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Header */}
      <DashboardHeader
        title="Repulse"
        subtitle={`Reimpulso de leads${selectedProyecto?.nombre ? ` - ${selectedProyecto.nombre}` : ''}`}
      />

      {/* Contenido */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingData ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando datos de repulse...</p>
          </div>
        ) : (
          <RepulseClient
            initialLeads={repulseLeads}
            initialTemplates={templates}
            initialStats={stats}
            initialQuota={quota}
            proyectoId={selectedProyecto?.id || ''}
            userId={user.id}
            onRefresh={fetchData}
          />
        )}
      </div>
    </div>
  );
}
