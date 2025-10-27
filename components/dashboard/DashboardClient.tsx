'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StatsCard from '@/components/dashboard/StatsCard';
import PieChartComponent from '@/components/dashboard/PieChart';
import LeadsTable from '@/components/dashboard/LeadsTable';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';
import LeadDetailPanel from '@/components/dashboard/LeadDetailPanel';
import { Lead, Vendedor, getAllVendedores } from '@/lib/db';
import { assignLeadToVendedor } from '@/lib/actions';
import { useAuth } from '@/lib/auth-context';
import { Users, CheckCircle, Clock, TrendingUp, AlertCircle, Download } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { exportLeadsToExcel } from '@/lib/exportToExcel';

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
  const router = useRouter();
  const { user } = useAuth(); // Get authenticated user from context
  const { isOpen, config, showDialog, closeDialog } = useConfirmDialog();
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Vendedor state (for admin - fetches all vendedores for assignment dropdown)
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [selectedVendedorFilter, setSelectedVendedorFilter] = useState<string>(''); // Admin-only: filter by specific vendedor
  const [assignmentFilter, setAssignmentFilter] = useState<'todos' | 'sin_asignar'>('todos'); // Admin-only: assignment filter

  // Estado filter (for both admin and vendedor)
  const [estadoFilter, setEstadoFilter] = useState<string>(''); // Filter by lead estado

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Fetch vendedores on mount (only for assignment dropdown in table)
  useEffect(() => {
    getAllVendedores().then(setVendedores);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('[DashboardClient] Received initialLeads:', initialLeads.length);
    console.log('[DashboardClient] First 3 leads:', initialLeads.slice(0, 3));
  }, [initialLeads]);

  // Filter leads by date range AND vendedor (admin only)
  const filteredLeads = useMemo(() => {
    let filtered = initialLeads;

    if (dateFrom) {
      // Parse date string as LOCAL timezone (not UTC) to match user's timezone
      const [year, month, day] = dateFrom.split('-').map(Number);
      const fromDate = new Date(year, month - 1, day);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((lead) => {
        const leadDate = new Date(lead.fecha_captura);
        return leadDate >= fromDate;
      });
    }

    if (dateTo) {
      // Parse date string as LOCAL timezone (not UTC) to match user's timezone
      const [year, month, day] = dateTo.split('-').map(Number);
      const toDate = new Date(year, month - 1, day);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((lead) => {
        const leadDate = new Date(lead.fecha_captura);
        return leadDate <= toDate;
      });
    }

    // Assignment filtering (admin only)
    if (assignmentFilter === 'sin_asignar') {
      filtered = filtered.filter((lead) => lead.vendedor_asignado_id === null);
    }
    // 'todos' shows all leads (no additional filtering)

    // Admin-only: Filter by specific vendedor (dropdown)
    if (selectedVendedorFilter && user?.rol === 'admin') {
      filtered = filtered.filter((lead) => lead.vendedor_asignado_id === selectedVendedorFilter);
    }

    // NEW: Filter by estado (applies to both admin and vendedor)
    if (estadoFilter) {
      filtered = filtered.filter((lead) => lead.estado === estadoFilter);
    }

    return filtered;
  }, [initialLeads, dateFrom, dateTo, assignmentFilter, selectedVendedorFilter, estadoFilter, user?.rol]);

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
    ];
  }, [filteredLeads]);

  const handleClearFilters = () => {
    setDateFrom(initialDateFrom);
    setDateTo(initialDateTo);
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
    // Delay clearing selectedLead for smooth animation
    setTimeout(() => setSelectedLead(null), 300);
  };

  const handleAssignLead = async (leadId: string, vendedorId: string) => {
    try {
      const result = await assignLeadToVendedor(leadId, vendedorId);

      if (result.success) {
        // Refetch leads BEFORE showing success dialog (real-time update)
        if (onRefresh) {
          await onRefresh(dateFrom, dateTo);
        }

        // Success notification
        showDialog({
          title: '¡Asignación exitosa!',
          message: result.message || `Lead "${result.leadNombre}" asignado a ${result.vendedorNombre}`,
          type: 'success',
          variant: 'success',
          confirmText: 'Aceptar',
          showCancel: false,
        });
      } else {
        // Error notification
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

  // Handler: Export filtered leads to Excel
  const handleExportToExcel = () => {
    if (!user) return;

    setIsExporting(true);
    try {
      // Export filtered leads (respects ALL active filters)
      const proyectoNombre = initialLeads[0]?.proyecto_nombre || 'Dashboard';
      exportLeadsToExcel(filteredLeads, proyectoNombre);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      // Reset loading state after a short delay (for UX feedback)
      setTimeout(() => setIsExporting(false), 500);
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
          title="Leads Incompletos"
          value={stats.incompletos}
          icon={AlertCircle}
          color="accent"
        />
        <StatsCard
          title="En Conversación"
          value={stats.conversacion}
          icon={Clock}
          color="secondary"
        />
        <StatsCard
          title="Tasa Conversión"
          value={`${stats.tasaConversion}%`}
          icon={TrendingUp}
          color="accent"
        />
      </div>

      {/* Chart Section */}
      <div className="mb-8">
        <PieChartComponent data={chartData} />
      </div>

      {/* Admin-only: Assignment Filter Tabs + Vendedor Dropdown */}
      {user?.rol === 'admin' && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setAssignmentFilter('todos')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                assignmentFilter === 'todos'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setAssignmentFilter('sin_asignar')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                assignmentFilter === 'sin_asignar'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Sin Asignar
            </button>
          </div>

          {/* Admin-only: Vendedor Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedVendedorFilter}
              onChange={(e) => setSelectedVendedorFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors hover:bg-gray-50"
            >
              <option value="">Todos los vendedores</option>
              {vendedores
                .filter((v) => v.activo)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
            </select>
          </div>

          {/* Admin-only: Estado Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors hover:bg-gray-50"
            >
              <option value="">Todos los estados</option>
              <option value="lead_completo">Lead Completo</option>
              <option value="lead_incompleto">Lead Incompleto</option>
              <option value="en_conversacion">En Conversación</option>
              <option value="conversacion_abandonada">Conversación Abandonada</option>
            </select>
          </div>

          {/* Export to Excel Button */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleExportToExcel}
              disabled={isExporting || filteredLeads.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                isExporting || filteredLeads.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90 hover:shadow-md active:scale-95'
              }`}
              title={filteredLeads.length === 0 ? 'No hay leads para exportar' : 'Exportar leads filtrados a Excel'}
            >
              <Download className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">
                {isExporting ? 'Exportando...' : 'Exportar a Excel'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Table Section */}
      <LeadsTable
        leads={filteredLeads}
        totalLeads={initialLeads.length}
        onLeadClick={handleLeadClick}
        vendedores={vendedores}
        currentVendedorId={user?.vendedor_id || null}
        onAssignLead={handleAssignLead}
        userRole={user?.rol || null}
      />

      {/* Lead Detail Panel */}
      <LeadDetailPanel lead={selectedLead} isOpen={isPanelOpen} onClose={handleClosePanel} />

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
