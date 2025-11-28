// ============================================================================
// PÁGINA: Comisiones
// ============================================================================
// Ruta: /comisiones
// Descripción: Sistema de cálculo y seguimiento de comisiones de vendedores
// Acceso: Todos los roles (cada usuario ve sus propias comisiones)
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import ComisionStatsCards from '@/components/comisiones/ComisionStatsCards';
import ComisionesChart from '@/components/comisiones/ComisionesChart';
import ComisionesDesgloseMensual from '@/components/comisiones/ComisionesDesgloseMensual';
import ComisionesTable from '@/components/comisiones/ComisionesTable';
import {
  getComisionesByUsuario,
  getAllComisiones,
  getComisionStats,
  type Comision,
  type ComisionStats
} from '@/lib/actions-comisiones';

export default function ComisionesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [stats, setStats] = useState<ComisionStats>({
    total_generado: 0,
    disponible: 0,
    pagado: 0,
    pendiente_inicial: 0,
    count_total: 0,
    count_disponible: 0,
    count_pagado: 0,
    count_pendiente: 0,
  });
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = async () => {
    if (!user) return;

    setLoadingData(true);

    try {
      // TEMPORAL FIX (Sesión 53): Todos los roles (admin/jefe/vendedor) ven solo SUS comisiones
      // TODO: Restaurar vista consolidada para admin/jefe después de presentación
      const userComisiones = await getComisionesByUsuario(user.id);
      const userStats = await getComisionStats(user.id);

      setComisiones(userComisiones);
      setStats(userStats);
    } catch (error) {
      console.error('[COMISIONES PAGE] Error fetching data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user) {
      fetchData();
    }
  }, [loading, user]);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando comisiones...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Header */}
      <DashboardHeader
        title="Mis Comisiones"
        subtitle="Tus comisiones generadas por ventas de locales"
      />

      {/* Content */}
      <div className="max-w-[1400px] mx-auto p-6">
        <ComisionStatsCards stats={stats} />
        <ComisionesChart stats={stats} />
        <ComisionesDesgloseMensual comisiones={comisiones} />
        <ComisionesTable
          comisiones={comisiones}
          userRole={user.rol}
          userId={user.id}
          onUpdate={fetchData}
        />
      </div>
    </div>
  );
}
