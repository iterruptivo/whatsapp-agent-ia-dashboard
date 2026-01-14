'use client';

import { useState, useMemo, useEffect } from 'react';
import StatsCard from '@/components/dashboard/StatsCard';
import PieChartComponent from '@/components/dashboard/PieChart';
import HorizontalBarChart from '@/components/dashboard/HorizontalBarChart';
import VendedoresMiniTable from '@/components/dashboard/VendedoresMiniTable';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';
import { Lead, Vendedor, Usuario, getAllVendedores, getAllUsuarios } from '@/lib/db';
import { assignLeadToVendedor } from '@/lib/actions';
import { useAuth } from '@/lib/auth-context';
import { Users, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

interface DashboardClientProps {
  initialLeads: Lead[];
  initialDateFrom?: string;
  initialDateTo?: string;
  onRefresh?: (dateFrom: string, dateTo: string) => Promise<void>;
}

export default function DashboardClient({
  initialLeads,
  initialDateFrom = '',
  initialDateTo = '',
  onRefresh,
}: DashboardClientProps) {
  const { user } = useAuth();
  const { isOpen, config, showDialog, closeDialog } = useConfirmDialog();
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);

  // Vendedor state (for assignment functionality - kept for potential future use)
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);

  // Usuarios state (for VendedoresMiniTable)
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  // Fetch vendedores and usuarios on mount
  useEffect(() => {
    getAllVendedores().then(setVendedores);
    getAllUsuarios().then(setUsuarios);
  }, []);

  // Filter leads by date range
  const filteredLeads = useMemo(() => {
    let filtered = initialLeads;

    if (dateFrom) {
      const [year, month, day] = dateFrom.split('-').map(Number);
      const fromDate = new Date(year, month - 1, day);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((lead) => {
        const leadDate = new Date(lead.fecha_captura);
        return leadDate >= fromDate;
      });
    }

    if (dateTo) {
      const [year, month, day] = dateTo.split('-').map(Number);
      const toDate = new Date(year, month - 1, day);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((lead) => {
        const leadDate = new Date(lead.fecha_captura);
        return leadDate <= toDate;
      });
    }

    return filtered;
  }, [initialLeads, dateFrom, dateTo]);

  // Calculate stats from filtered leads
  const stats = useMemo(() => {
    const total = filteredLeads.length;
    const completos = filteredLeads.filter((l) => l.estado === 'lead_completo').length;
    const incompletos = filteredLeads.filter((l) => l.estado === 'lead_incompleto').length;
    const conversacion = filteredLeads.filter((l) => l.estado === 'en_conversacion').length;
    const abandonados = filteredLeads.filter((l) => l.estado === 'conversacion_abandonada').length;
    const tasaConversion = total > 0 ? ((completos / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      completos,
      incompletos,
      conversacion,
      abandonados,
      tasaConversion,
    };
  }, [filteredLeads]);

  // Calculate chart data from filtered leads
  const chartData = useMemo(() => {
    return [
      {
        name: 'Lead Completo',
        value: filteredLeads.filter((l) => l.estado === 'lead_completo').length,
        color: '#1b967a',
      },
      {
        name: 'Lead Incompleto',
        value: filteredLeads.filter((l) => l.estado === 'lead_incompleto').length,
        color: '#fbde17',
      },
      {
        name: 'En Conversación',
        value: filteredLeads.filter((l) => l.estado === 'en_conversacion').length,
        color: '#192c4d',
      },
      {
        name: 'Abandonado',
        value: filteredLeads.filter((l) => l.estado === 'conversacion_abandonada').length,
        color: '#cbd5e1',
      },
      {
        name: 'Lead Manual',
        value: filteredLeads.filter((l) => l.estado === 'lead_manual').length,
        color: '#9333ea',
      },
    ];
  }, [filteredLeads]);

  // Calculate asistencias data from filtered leads
  const asistenciasData = useMemo(() => {
    const asistioSi = filteredLeads.filter((l) => l.asistio === true).length;
    const asistioNo = filteredLeads.filter((l) => l.asistio === false || l.asistio === null).length;

    return [
      {
        name: 'Asistió: Sí',
        value: asistioSi,
        color: '#1b967a',
      },
      {
        name: 'Asistió: No',
        value: asistioNo,
        color: '#cbd5e1',
      },
    ];
  }, [filteredLeads]);

  // Calculate UTM distribution from filtered leads
  const utmData = useMemo(() => {
    const utmCounts = filteredLeads.reduce((acc, lead) => {
      const utm = lead.utm || 'Sin UTM';
      acc[utm] = (acc[utm] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sorted = Object.entries(utmCounts)
      .sort((a, b) => b[1] - a[1]);

    const utmColors: Record<string, string> = {
      'victoria': '#1b967a',
      'facebook': '#4267B2',
      'google': '#DB4437',
      'instagram': '#E4405F',
      'referido': '#192c4d',
      'whatsapp': '#25D366',
      'web': '#fbde17',
      'Sin UTM': '#cbd5e1',
    };

    const getColor = (utm: string, index: number): string => {
      if (utmColors[utm]) return utmColors[utm];
      const fallbackColors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4', '#84cc16'];
      return fallbackColors[index % fallbackColors.length];
    };

    return sorted.map(([name, value], index) => ({
      name,
      value,
      color: getColor(name, index),
    }));
  }, [filteredLeads]);

  // Calculate leads per vendedor (vendedor + vendedor_caseta roles)
  const vendedoresLeadsData = useMemo(() => {
    const vendedorUsuarios = usuarios.filter(
      (u) => (u.rol === 'vendedor' || u.rol === 'vendedor_caseta') && u.activo
    );

    return vendedorUsuarios.map((usuario) => {
      const assignedLeads = filteredLeads.filter(
        (lead) => lead.vendedor_asignado_id === usuario.vendedor_id
      );

      const leadsManuales = assignedLeads.filter(
        (lead) => lead.estado === 'lead_manual'
      ).length;
      const leadsAutomaticos = assignedLeads.length - leadsManuales;

      return {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol as 'vendedor' | 'vendedor_caseta',
        leadsManuales,
        leadsAutomaticos,
        total: assignedLeads.length,
      };
    });
  }, [usuarios, filteredLeads]);

  const handleClearFilters = () => {
    setDateFrom(initialDateFrom);
    setDateTo(initialDateTo);
  };

  // Handler for assigning leads (kept for VendedoresMiniTable or future use)
  const handleAssignLead = async (leadId: string, vendedorId: string) => {
    try {
      const result = await assignLeadToVendedor(leadId, vendedorId);

      if (result.success) {
        if (onRefresh) {
          await onRefresh(dateFrom, dateTo);
        }

        showDialog({
          title: '¡Asignación exitosa!',
          message: result.message || `Lead "${result.leadNombre}" asignado a ${result.vendedorNombre}`,
          type: 'success',
          variant: 'success',
          confirmText: 'Aceptar',
          showCancel: false,
        });
      } else {
        showDialog({
          title: 'Error al asignar',
          message: result.message || 'No se pudo asignar el lead',
          type: 'error',
          variant: 'danger',
          confirmText: 'Aceptar',
          showCancel: false,
        });
      }
    } catch (error) {
      console.error('Error al asignar lead:', error);
      showDialog({
        title: 'Error inesperado',
        message: 'Ocurrió un error al asignar el lead. Por favor intenta nuevamente.',
        type: 'error',
        variant: 'danger',
        confirmText: 'Aceptar',
        showCancel: false,
      });
    }
  };

  return (
    <>
      {/* Date Range Filter */}
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onClear={handleClearFilters}
        defaultDateFrom={initialDateFrom}
        defaultDateTo={initialDateTo}
        onRefresh={onRefresh ? async () => await onRefresh(dateFrom, dateTo) : undefined}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatsCard title="Total Leads" value={stats.total} icon={Users} color="primary" />
        <StatsCard
          title="Leads Completos"
          value={stats.completos}
          icon={CheckCircle}
          color="primary"
        />
        <StatsCard
          title="En Conversación"
          value={stats.conversacion}
          icon={Clock}
          color="secondary"
        />
        {/* Mini tabla: Manual, Incompleto, Abandonado */}
        <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg hover:bg-gray-50 transition-all duration-200">
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-dotted border-gray-300">
              <span className="text-sm text-gray-600">Lead Manual</span>
              <span className="text-lg font-bold text-purple-600">{filteredLeads.filter((l) => l.estado === 'lead_manual').length}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-dotted border-gray-300">
              <span className="text-sm text-gray-600">Lead Incompleto</span>
              <span className="text-lg font-bold text-yellow-600">{stats.incompletos}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-gray-600">Abandonado</span>
              <span className="text-lg font-bold text-gray-500">{filteredLeads.filter((l) => l.estado === 'conversacion_abandonada').length}</span>
            </div>
          </div>
        </div>
        <StatsCard
          title="Tasa Conversión"
          value={`${stats.tasaConversion}%`}
          icon={TrendingUp}
          color="accent"
        />
      </div>

      {/* Chart Section - Three charts side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <PieChartComponent
          data={chartData}
          title="Distribución de Estados"
        />
        <PieChartComponent
          data={asistenciasData}
          title="Asistencias al Proyecto"
        />
        <HorizontalBarChart
          data={utmData}
          title="Distribución por UTM"
        />
      </div>

      {/* Mini Table: Leads por Vendedor - Full width */}
      <div className="mb-8">
        <VendedoresMiniTable
          data={vendedoresLeadsData}
          title="Leads por Vendedor"
          userRole={user?.rol}
        />
      </div>

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
    </>
  );
}
