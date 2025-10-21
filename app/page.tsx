'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardClient from '@/components/dashboard/DashboardClient';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { getAllLeads, Lead } from '@/lib/db';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const router = useRouter();
  const { user, selectedProyecto, loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated or no proyecto selected
  useEffect(() => {
    if (!authLoading && (!user || !selectedProyecto)) {
      router.push('/login');
    }
  }, [user, selectedProyecto, authLoading, router]);

  // Fetch leads when selectedProyecto changes
  useEffect(() => {
    if (selectedProyecto && user) {
      async function fetchData() {
        // Capture selectedProyecto value to avoid null reference
        const proyecto = selectedProyecto;
        if (!proyecto) return;

        setLoading(true);

        // Calculate default date range (last 30 days)
        const now = new Date();
        const dateTo = new Date(now);
        dateTo.setUTCHours(23, 59, 59, 999);
        const dateFrom = new Date(dateTo);
        dateFrom.setUTCDate(dateFrom.getUTCDate() - 30);
        dateFrom.setUTCHours(0, 0, 0, 0);

        console.log('[CLIENT] Fetching leads for proyecto:', proyecto.nombre);
        console.log('[CLIENT] Proyecto ID:', proyecto.id);

        // MULTI-PROYECTO: Fetch leads filtered by proyecto
        const data = await getAllLeads(dateFrom, dateTo, proyecto.id);

        console.log('[CLIENT] Fetched leads count:', data.length);
        setLeads(data);
        setLoading(false);
      }
      fetchData();
    }
  }, [selectedProyecto, user]);

  // Function to refetch leads (for real-time updates after assignment)
  const refetchLeads = useCallback(async () => {
    const proyecto = selectedProyecto;
    if (proyecto) {
      const now = new Date();
      const dateTo = new Date(now);
      dateTo.setUTCHours(23, 59, 59, 999);
      const dateFrom = new Date(dateTo);
      dateFrom.setUTCDate(dateFrom.getUTCDate() - 30);
      dateFrom.setUTCHours(0, 0, 0, 0);

      const data = await getAllLeads(dateFrom, dateTo, proyecto.id);
      setLeads(data);
    }
  }, [selectedProyecto]);

  // Show loading while auth or data is loading
  if (authLoading || loading || !selectedProyecto) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate initial date range strings for DashboardClient
  const now = new Date();
  const dateTo = new Date(now);
  dateTo.setUTCHours(23, 59, 59, 999);
  const dateFrom = new Date(dateTo);
  dateFrom.setUTCDate(dateFrom.getUTCDate() - 30);
  dateFrom.setUTCHours(0, 0, 0, 0);
  const dateFromString = dateFrom.toISOString().split('T')[0];
  const dateToString = dateTo.toISOString().split('T')[0];

  return (
    <div className="min-h-screen">
      {/* Header with logout button */}
      <DashboardHeader
        title="Dashboard EcoPlaza"
        subtitle={`Gestión de Leads - ${selectedProyecto.nombre}`}
      />

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardClient
          initialLeads={leads}
          initialDateFrom={dateFromString}
          initialDateTo={dateToString}
          onRefresh={refetchLeads}
        />
      </main>
    </div>
  );
}