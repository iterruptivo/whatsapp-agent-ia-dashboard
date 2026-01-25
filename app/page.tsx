'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';
import StatsCard from '@/components/dashboard/StatsCard';
import PieChartComponent from '@/components/dashboard/PieChart';
import HorizontalBarChart from '@/components/dashboard/HorizontalBarChart';
import DistribucionLeads from '@/components/dashboard/DistribucionLeads';
import ControlProductividad from '@/components/dashboard/ControlProductividad';
import ResumenProyectos from '@/components/dashboard/ResumenProyectos';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { StatsSkeleton, ChartsSkeleton, DistribucionSkeleton, TableSkeleton } from '@/components/dashboard/skeletons';
import { getAllLeads, getAllLeadsGlobal, getProyectosActivos, getAllUsuarios, Lead, Usuario } from '@/lib/db';
import { useAuth } from '@/lib/auth-context';
import { Users, CheckCircle, Clock, TrendingUp } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, selectedProyecto, loading: authLoading } = useAuth();
  const { isOpen, config, showDialog, closeDialog } = useConfirmDialog();

  // Date filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Data states - separated for progressive loading
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsGlobales, setLeadsGlobales] = useState<Lead[]>([]);
  const [proyectosActivos, setProyectosActivos] = useState<{id: string, nombre: string}[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // Loading states per section
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  // Calculate initial date range strings
  const getDefaultDates = () => {
    const now = new Date();
    const toDate = new Date(now);
    toDate.setUTCHours(23, 59, 59, 999);
    const fromDate = new Date(toDate);
    fromDate.setUTCDate(fromDate.getUTCDate() - 30);
    fromDate.setUTCHours(0, 0, 0, 0);
    return {
      dateFromString: fromDate.toISOString().split('T')[0],
      dateToString: toDate.toISOString().split('T')[0],
    };
  };

  // Initialize dates
  useEffect(() => {
    const { dateFromString, dateToString } = getDefaultDates();
    setDateFrom(dateFromString);
    setDateTo(dateToString);
  }, []);

  // Redirect if not authenticated or no proyecto selected
  useEffect(() => {
    if (!authLoading && (!user || !selectedProyecto)) {
      router.push('/login');
    }
  }, [user, selectedProyecto, authLoading, router]);

  // PROGRESSIVE LOADING: Fetch data in stages
  useEffect(() => {
    if (!selectedProyecto || !user || !dateFrom || !dateTo) return;

    const proyecto = selectedProyecto;
    const allowedRoles = ['superadmin', 'admin', 'jefe_ventas', 'marketing'];
    const isAdmin = allowedRoles.includes(user.rol);

    // Parse dates
    const [yearFrom, monthFrom, dayFrom] = dateFrom.split('-').map(Number);
    const dateFromObj = new Date(yearFrom, monthFrom - 1, dayFrom);
    dateFromObj.setHours(0, 0, 0, 0);

    const [yearTo, monthTo, dayTo] = dateTo.split('-').map(Number);
    const dateToObj = new Date(yearTo, monthTo - 1, dayTo);
    dateToObj.setHours(23, 59, 59, 999);

    // Stage 1: Load basic leads for stats (fast)
    setLoadingStats(true);
    getAllLeads(dateFromObj, dateToObj, proyecto.id).then(data => {
      setLeads(data);
      setLoadingStats(false);
      setLoadingCharts(false);
    });

    // Stage 2: Load admin data if allowed (parallel but separate state)
    if (isAdmin) {
      setLoadingAdmin(true);
      Promise.all([
        getAllLeadsGlobal(dateFromObj, dateToObj),
        getProyectosActivos(),
        getAllUsuarios(),
      ]).then(([globalLeads, proyectos, users]) => {
        setLeadsGlobales(globalLeads);
        setProyectosActivos(proyectos);
        setUsuarios(users);
        setLoadingAdmin(false);
      });
    } else {
      setLoadingAdmin(false);
    }
  }, [selectedProyecto, user, dateFrom, dateTo]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (!selectedProyecto || !user || !dateFrom || !dateTo) return;

    const proyecto = selectedProyecto;
    const allowedRoles = ['superadmin', 'admin', 'jefe_ventas', 'marketing'];
    const isAdmin = allowedRoles.includes(user.rol);

    const [yearFrom, monthFrom, dayFrom] = dateFrom.split('-').map(Number);
    const dateFromObj = new Date(yearFrom, monthFrom - 1, dayFrom);
    dateFromObj.setHours(0, 0, 0, 0);

    const [yearTo, monthTo, dayTo] = dateTo.split('-').map(Number);
    const dateToObj = new Date(yearTo, monthTo - 1, dayTo);
    dateToObj.setHours(23, 59, 59, 999);

    setLoadingStats(true);
    setLoadingCharts(true);
    if (isAdmin) setLoadingAdmin(true);

    const data = await getAllLeads(dateFromObj, dateToObj, proyecto.id);
    setLeads(data);
    setLoadingStats(false);
    setLoadingCharts(false);

    if (isAdmin) {
      const globalLeads = await getAllLeadsGlobal(dateFromObj, dateToObj);
      setLeadsGlobales(globalLeads);
      setLoadingAdmin(false);
    }
  }, [selectedProyecto, user, dateFrom, dateTo]);

  const handleClearFilters = () => {
    const { dateFromString, dateToString } = getDefaultDates();
    setDateFrom(dateFromString);
    setDateTo(dateToString);
  };

  // Calculate stats from leads
  const stats = {
    total: leads.length,
    completos: leads.filter(l => l.estado === 'lead_completo').length,
    incompletos: leads.filter(l => l.estado === 'lead_incompleto').length,
    conversacion: leads.filter(l => l.estado === 'en_conversacion').length,
    abandonados: leads.filter(l => l.estado === 'conversacion_abandonada').length,
    manuales: leads.filter(l => l.estado === 'lead_manual').length,
    tasaConversion: leads.length > 0
      ? ((leads.filter(l => l.estado === 'lead_completo').length / leads.length) * 100).toFixed(1)
      : '0.0',
  };

  // Chart data
  const chartData = [
    { name: 'Lead Completo', value: stats.completos, color: '#1b967a' },
    { name: 'Lead Incompleto', value: stats.incompletos, color: '#fbde17' },
    { name: 'En Conversación', value: stats.conversacion, color: '#192c4d' },
    { name: 'Abandonado', value: stats.abandonados, color: '#cbd5e1' },
    { name: 'Lead Manual', value: stats.manuales, color: '#9333ea' },
  ];

  const asistenciasData = [
    { name: 'Asistió: Sí', value: leads.filter(l => l.asistio === true).length, color: '#1b967a' },
    { name: 'Asistió: No', value: leads.filter(l => l.asistio === false || l.asistio === null).length, color: '#cbd5e1' },
  ];

  // UTM data
  const utmCounts = leads.reduce((acc, lead) => {
    const utm = lead.utm || 'Sin UTM';
    acc[utm] = (acc[utm] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const utmColors: Record<string, string> = {
    'victoria': '#1b967a', 'facebook': '#4267B2', 'google': '#DB4437',
    'instagram': '#E4405F', 'referido': '#192c4d', 'whatsapp': '#25D366',
    'web': '#fbde17', 'Sin UTM': '#cbd5e1',
  };

  const utmData = Object.entries(utmCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name,
      value,
      color: utmColors[name] || ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index % 4],
    }));

  // Show minimal loading while auth is checking
  if (authLoading || !selectedProyecto) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  const allowedRoles = ['superadmin', 'admin', 'jefe_ventas', 'marketing'];
  const isAdmin = user && allowedRoles.includes(user.rol);

  return (
    <div className="min-h-screen">
      {/* Header - Renders immediately */}
      <DashboardHeader
        title="Estadísticas"
        subtitle={`Gestión de Leads - ${selectedProyecto.nombre}`}
      />

      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Filter - Renders immediately */}
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onClear={handleClearFilters}
          defaultDateFrom={getDefaultDates().dateFromString}
          defaultDateTo={getDefaultDates().dateToString}
          onRefresh={handleRefresh}
        />

        {/* Admin Section - Distribución de Leads */}
        {isAdmin && (
          loadingAdmin ? (
            <DistribucionSkeleton />
          ) : (
            <div className="mb-6">
              <DistribucionLeads leads={leadsGlobales} usuarios={usuarios} userRole={user.rol} />
            </div>
          )
        )}

        {/* Admin Section - Control & Resumen Grid */}
        {isAdmin && (
          loadingAdmin ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <TableSkeleton rows={5} />
              <TableSkeleton rows={5} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ControlProductividad
                leads={leadsGlobales}
                usuarios={usuarios}
                proyectos={proyectosActivos}
                userRole={user.rol}
              />
              <ResumenProyectos
                leads={leadsGlobales}
                proyectos={proyectosActivos}
                usuarios={usuarios}
                userRole={user.rol}
              />
            </div>
          )
        )}

        {/* Stats Grid - Third row */}
        {loadingStats ? (
          <StatsSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <StatsCard title="Total Leads" value={stats.total} icon={Users} color="primary" />
            <StatsCard title="Leads Completos" value={stats.completos} icon={CheckCircle} color="primary" />
            <StatsCard title="En Conversación" value={stats.conversacion} icon={Clock} color="secondary" />
            <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg hover:bg-gray-50 transition-all duration-200">
              <div>
                <div className="flex items-center justify-between pb-1 border-b border-dotted border-gray-300">
                  <span className="text-sm text-gray-600">Lead Manual</span>
                  <span className="text-lg font-bold text-purple-600">{stats.manuales}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-dotted border-gray-300">
                  <span className="text-sm text-gray-600">Lead Incompleto</span>
                  <span className="text-lg font-bold text-yellow-600">{stats.incompletos}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-gray-600">Abandonado</span>
                  <span className="text-lg font-bold text-gray-500">{stats.abandonados}</span>
                </div>
              </div>
            </div>
            <StatsCard title="Tasa Conversión" value={`${stats.tasaConversion}%`} icon={TrendingUp} color="accent" />
          </div>
        )}

        {/* Charts Section - Progressive */}
        {loadingCharts ? (
          <ChartsSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <PieChartComponent data={chartData} title="Distribución de Estados" />
            <PieChartComponent data={asistenciasData} title="Asistencias al Proyecto" />
            <HorizontalBarChart data={utmData} title="Distribución por UTM" />
          </div>
        )}

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={isOpen}
          onClose={closeDialog}
          onConfirm={config.onConfirm}
          title={config.title}
          message={config.message}
          type={config.type}
          variant={config.variant}
          confirmText={config.confirmText}
          cancelText={config.cancelText}
          showCancel={config.showCancel}
        />
      </main>
    </div>
  );
}
