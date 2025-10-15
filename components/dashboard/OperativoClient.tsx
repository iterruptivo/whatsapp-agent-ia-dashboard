'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LeadsTable from '@/components/dashboard/LeadsTable';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';
import LeadDetailPanel from '@/components/dashboard/LeadDetailPanel';
import { Lead, Vendedor, getAllVendedores } from '@/lib/db';
import { assignLeadToVendedor } from '@/lib/actions';
import { useAuth } from '@/lib/auth-context';
import { Calendar, X } from 'lucide-react';

interface OperativoClientProps {
  initialLeads: Lead[];
  initialDateFrom?: string;
  initialDateTo?: string;
}

export default function OperativoClient({
  initialLeads,
  initialDateFrom = '',
  initialDateTo = '',
}: OperativoClientProps) {
  const router = useRouter();
  const { user } = useAuth(); // Get authenticated user from context
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Vendedor state (for admin - fetches all vendedores for assignment dropdown)
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [assignmentFilter, setAssignmentFilter] = useState<'todos' | 'sin_asignar' | 'mis_leads'>('todos');

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
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((lead) => {
        const leadDate = new Date(lead.fecha_captura);
        return leadDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
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

    return filtered;
  }, [initialLeads, dateFrom, dateTo, assignmentFilter, currentVendedorId]);

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
        alert(`Lead "${result.leadNombre}" asignado a ${result.vendedorNombre}`);
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
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-primary" size={20} />
            <span className="text-sm font-medium text-gray-700">Filtrar por fecha:</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor="date-from" className="text-sm text-gray-600">
                Desde:
              </label>
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="date-to" className="text-sm text-gray-600">
                Hasta:
              </label>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            {((dateFrom && dateFrom !== initialDateFrom) || (dateTo && dateTo !== initialDateTo)) && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                <X className="w-4 h-4" />
                Limpiar Selección
              </button>
            )}
          </div>
        </div>

        {/* Date Range Indicator */}
        {(dateFrom || dateTo) && (
          <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
            {dateFrom === initialDateFrom && dateTo === initialDateTo ? (
              <span className="text-gray-600">
                Mostrando leads de los últimos 30 días por defecto
              </span>
            ) : (
              <>
                Mostrando leads capturados{' '}
                {dateFrom && dateTo
                  ? `entre ${dateFrom.split('-').reverse().join('/')} y ${dateTo.split('-').reverse().join('/')}`
                  : dateFrom
                  ? `desde ${dateFrom.split('-').reverse().join('/')}`
                  : `hasta ${dateTo.split('-').reverse().join('/')}`}
              </>
            )}
          </div>
        )}
      </div>

      {/* Assignment Filter Tabs */}
      <div className="flex gap-2 mb-6">
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
      </div>

      {/* Leads Table */}
      <LeadsTable
        leads={filteredLeads}
        totalLeads={initialLeads.length}
        onLeadClick={handleLeadClick}
        vendedores={vendedores}
        currentVendedorId={currentVendedorId}
        onAssignLead={handleAssignLead}
      />

      {/* Lead Detail Panel */}
      <LeadDetailPanel lead={selectedLead} isOpen={isPanelOpen} onClose={handleClosePanel} />
    </>
  );
}
