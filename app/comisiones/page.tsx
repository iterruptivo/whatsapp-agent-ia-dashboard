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
  getAllComisionStats,
  type Comision,
  type ComisionStats
} from '@/lib/actions-comisiones';

export default function ComisionesPage() {
  const router = useRouter();
  const { user, loading, selectedProyecto } = useAuth(); // Sesión 64: Agregar selectedProyecto
  const [activeTab, setActiveTab] = useState<'mis' | 'control'>('mis');
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
  const [allComisiones, setAllComisiones] = useState<Comision[]>([]);
  const [allStats, setAllStats] = useState<ComisionStats>({
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

  // Sesión 64: Función fetchData con filtro por proyecto
  const fetchData = async () => {
    if (!user || !selectedProyecto?.id) return;

    const proyectoId = selectedProyecto.id;
    setLoadingData(true);

    try {
      // SIEMPRE fetch de comisiones propias (filtradas por proyecto)
      const userComisiones = await getComisionesByUsuario(user.id, proyectoId);
      const userStats = await getComisionStats(user.id, proyectoId);

      setComisiones(userComisiones);
      setStats(userStats);

      // Admin/Jefe: TAMBIÉN fetch de todas las comisiones (filtradas por proyecto)
      if (user.rol === 'admin' || user.rol === 'jefe_ventas') {
        const allCom = await getAllComisiones(proyectoId);
        const allSt = await getAllComisionStats(proyectoId);

        setAllComisiones(allCom);
        setAllStats(allSt);
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

  // Sesión 64: Refetch cuando cambia el proyecto seleccionado
  useEffect(() => {
    if (!loading && user && selectedProyecto?.id) {
      fetchData();
    }
  }, [loading, user, selectedProyecto?.id]);

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

  const isAdminOrJefe = user.rol === 'admin' || user.rol === 'jefe_ventas';

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Header */}
      <DashboardHeader
        title={activeTab === 'control' && isAdminOrJefe ? 'Control de Comisiones' : 'Mis Comisiones'}
        subtitle={`${activeTab === 'control' && isAdminOrJefe ? 'Vista consolidada de comisiones de todos los vendedores' : 'Tus comisiones generadas por ventas de locales'}${selectedProyecto?.nombre ? ` - ${selectedProyecto.nombre}` : ''}`}
      />

      {/* Content */}
      <div className="max-w-[1400px] mx-auto p-6">
        {/* Tabs - Solo para admin y jefe_ventas */}
        {isAdminOrJefe && (
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('mis')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'mis'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mis Comisiones
            </button>
            <button
              onClick={() => setActiveTab('control')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'control'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Control Comisiones
            </button>
          </div>
        )}

        {/* Stats Cards - cambiar según tab */}
        <ComisionStatsCards
          stats={activeTab === 'control' && isAdminOrJefe ? allStats : stats}
        />

        {/* Chart - Solo mostrar en tab "Mis Comisiones" (no tiene sentido en vista consolidada) */}
        {!(activeTab === 'control' && isAdminOrJefe) && (
          <ComisionesChart
            comisiones={comisiones}
          />
        )}

        {/* Tabla - cambiar según tab + props condicionales */}
        <ComisionesDesgloseMensual
          comisiones={activeTab === 'control' && isAdminOrJefe ? allComisiones : comisiones}
          userRole={user.rol}
          userId={user.id}
          onUpdate={fetchData}
          showVendedorColumn={activeTab === 'control' && isAdminOrJefe}
          showVendedorFilter={activeTab === 'control' && isAdminOrJefe}
        />

        {/* TABLA ANTIGUA OCULTA - Funcionalidad migrada a ComisionesDesgloseMensual */}
        {/* <ComisionesTable
          comisiones={comisiones}
          userRole={user.rol}
          userId={user.id}
          onUpdate={fetchData}
        /> */}
      </div>
    </div>
  );
}
