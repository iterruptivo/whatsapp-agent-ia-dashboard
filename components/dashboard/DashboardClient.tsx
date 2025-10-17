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
import { Users, CheckCircle, Clock, TrendingUp, AlertCircle } from 'lucide-react';

interface DashboardClientProps {
  initialLeads: Lead[];
  initialDateFrom?: string;
  initialDateTo?: string;
}

export default function DashboardClient({
  initialLeads,
  initialDateFrom = '',
  initialDateTo = '',
}: DashboardClientProps) {
  const router = useRouter();
  const { user } = useAuth(); // Get authenticated user from context
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Vendedor state (for admin - fetches all vendedores for assignment dropdown)
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [selectedVendedorFilter, setSelectedVendedorFilter] = useState<string>(''); // Admin-only: filter by specific vendedor
  const [assignmentFilter, setAssignmentFilter] = useState<'todos' | 'sin_asignar'>('todos'); // Admin-only: assignment filter

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

    return filtered;
  }, [initialLeads, dateFrom, dateTo, assignmentFilter, selectedVendedorFilter, user?.rol]);

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
        // Success notification
        alert(result.message || `Lead "${result.leadNombre}" asignado a ${result.vendedorNombre}`);
        // Refresh page to update data
        router.refresh();
      } else {
        // Error notification
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error al asignar lead:', error);
      alert('Error inesperado al asignar lead. Por favor intenta nuevamente.');
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
    </>
  );
}
