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
  const { user, usuario, loading } = useAuth();
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
    if (!user || !usuario) return;

    setLoadingData(true);

    try {
      const isAdminOrJefe = usuario.rol === 'admin' || usuario.rol === 'jefe_ventas';

      if (isAdminOrJefe) {
        const allComisiones = await getAllComisiones();
        setComisiones(allComisiones);

        // Calculate aggregate stats for all users
        const totalGenerado = allComisiones.reduce((sum, c) => sum + c.monto_comision, 0);
        const disponible = allComisiones
          .filter(c => c.estado === 'disponible')
          .reduce((sum, c) => sum + c.monto_comision, 0);
        const pagado = allComisiones
          .filter(c => c.estado === 'pagada')
          .reduce((sum, c) => sum + c.monto_comision, 0);
        const pendienteInicial = allComisiones
          .filter(c => c.estado === 'pendiente_inicial')
          .reduce((sum, c) => sum + c.monto_comision, 0);

        setStats({
          total_generado: totalGenerado,
          disponible: disponible,
          pagado: pagado,
          pendiente_inicial: pendienteInicial,
          count_total: allComisiones.length,
          count_disponible: allComisiones.filter(c => c.estado === 'disponible').length,
          count_pagado: allComisiones.filter(c => c.estado === 'pagada').length,
          count_pendiente: allComisiones.filter(c => c.estado === 'pendiente_inicial').length,
        });
      } else {
        const userComisiones = await getComisionesByUsuario(user.id);
        const userStats = await getComisionStats(user.id);

        setComisiones(userComisiones);
        setStats(userStats);
      }
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
    if (!loading && user && usuario) {
      fetchData();
    }
  }, [loading, user, usuario]);

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

  if (!user || !usuario) {
    return null;
  }

  const isAdminOrJefe = usuario.rol === 'admin' || usuario.rol === 'jefe_ventas';

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Header */}
      <DashboardHeader
        title={isAdminOrJefe ? 'Comisiones - Todas' : 'Mis Comisiones'}
        subtitle={
          isAdminOrJefe
            ? 'Vista general de todas las comisiones del equipo'
            : 'Tus comisiones generadas por ventas de locales'
        }
      />

      {/* Content */}
      <div className="max-w-[1400px] mx-auto p-6">
        <ComisionStatsCards stats={stats} />
        <ComisionesTable
          comisiones={comisiones}
          userRole={usuario.rol}
          userId={user.id}
          onUpdate={fetchData}
        />
      </div>
    </div>
  );
}
