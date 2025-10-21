'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LeadsTable from '@/components/dashboard/LeadsTable';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';
import LeadDetailPanel from '@/components/dashboard/LeadDetailPanel';
import { Lead, Vendedor, getAllVendedores } from '@/lib/db';
import { assignLeadToVendedor } from '@/lib/actions';
import { useAuth } from '@/lib/auth-context';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

interface OperativoClientProps {
  initialLeads: Lead[];
  initialDateFrom?: string;
  initialDateTo?: string;
  onRefresh?: () => Promise<void>;
}

export default function OperativoClient({
  initialLeads,
  initialDateFrom = '',
  initialDateTo = '',
  onRefresh,
}: OperativoClientProps) {
  const router = useRouter();
  const { user } = useAuth(); // Get authenticated user from context
  const { isOpen, config, showDialog, closeDialog } = useConfirmDialog();
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Vendedor state (for admin - fetches all vendedores for assignment dropdown)
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [assignmentFilter, setAssignmentFilter] = useState<'todos' | 'sin_asignar' | 'mis_leads'>('todos');
  const [selectedVendedorFilter, setSelectedVendedorFilter] = useState<string>(''); // Admin-only: filter by specific vendedor

  // Estado filter (for both admin and vendedor)
  const [estadoFilter, setEstadoFilter] = useState<string>(''); // Filter by lead estado

  // Fetch vendedores on mount (only for assignment dropdown in table)
  useEffect(() => {
    getAllVendedores().then(setVendedores);
  }, []);

  // Get current vendedor ID from auth context
  const currentVendedorId = user?.vendedor_id || null;

  // Filter leads by date range AND assignment filter
  const filteredLeads = useMemo(() => {
    let filtered = initialLeads;

    // Date filtering (existing)
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

    // Assignment filtering (NEW)
    if (assignmentFilter === 'sin_asignar') {
      filtered = filtered.filter((lead) => lead.vendedor_asignado_id === null);
    } else if (assignmentFilter === 'mis_leads' && currentVendedorId) {
      filtered = filtered.filter((lead) => lead.vendedor_asignado_id === currentVendedorId);
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
  }, [initialLeads, dateFrom, dateTo, assignmentFilter, currentVendedorId, selectedVendedorFilter, estadoFilter, user?.rol]);

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
          await onRefresh();
        }

        // Success notification
        showDialog({
          title: '¡Asignación exitosa!',
          message: `Lead "${result.leadNombre}" asignado a ${result.vendedorNombre}`,
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

      {/* Assignment Filter Tabs + Admin Vendedor Dropdown */}
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
          {/* Only show "Mis Leads" for vendedor role */}
          {user?.rol === 'vendedor' && (
            <button
              onClick={() => setAssignmentFilter('mis_leads')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                assignmentFilter === 'mis_leads'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
              disabled={!currentVendedorId}
            >
              Mis Leads
            </button>
          )}
        </div>

        {/* Admin-only: Vendedor Filter Dropdown */}
        {user?.rol === 'admin' && (
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
        )}

        {/* Estado Filter Dropdown (for both admin and vendedor) */}
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
      </div>

      {/* Leads Table */}
      <LeadsTable
        leads={filteredLeads}
        totalLeads={initialLeads.length}
        onLeadClick={handleLeadClick}
        vendedores={vendedores}
        currentVendedorId={currentVendedorId}
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
