'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StatsCard from '@/components/dashboard/StatsCard';
import PieChartComponent from '@/components/dashboard/PieChart';
import LeadsTable from '@/components/dashboard/LeadsTable';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';
import LeadDetailPanel from '@/components/dashboard/LeadDetailPanel';
import { Lead, Vendedor, Usuario, getAllVendedores, getAllUsuarios } from '@/lib/db';
import { assignLeadToVendedor } from '@/lib/actions';
import { useAuth } from '@/lib/auth-context';
import { Users, CheckCircle, Clock, TrendingUp, AlertCircle, Download, Upload, Plus, ChevronDown } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { exportLeadsToExcel } from '@/lib/exportToExcel';
import LeadImportModal from '@/components/leads/LeadImportModal';
import ManualLeadPanel from '@/components/leads/ManualLeadPanel';

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
  const { user, selectedProyecto } = useAuth(); // Get authenticated user and proyecto from context
  const { isOpen, config, showDialog, closeDialog } = useConfirmDialog();
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Vendedor state (for admin - fetches all vendedores for assignment dropdown)
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);

  // Usuarios state (for manual lead panel - fetches all usuarios with email)
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [selectedVendedorFilter, setSelectedVendedorFilter] = useState<string>(''); // Admin-only: filter by specific vendedor
  const [assignmentFilter, setAssignmentFilter] = useState<'todos' | 'sin_asignar'>('todos'); // Admin-only: assignment filter

  // Estado filter (for both admin and vendedor)
  const [estadoFilter, setEstadoFilter] = useState<string>(''); // Filter by lead estado

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Import state (admin only)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Manual Lead Panel state (admin + vendedor)
  const [isManualPanelOpen, setIsManualPanelOpen] = useState(false);

  // Dropdown state for import options
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);

  // Fetch vendedores on mount (only for assignment dropdown in table)
  useEffect(() => {
    getAllVendedores().then(setVendedores);
    getAllUsuarios().then(setUsuarios);
  }, []);

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
      {
        name: 'Lead Manual',
        value: filteredLeads.filter((l) => l.estado === 'lead_manual').length,
        color: '#9333ea',
      },
    ];
  }, [filteredLeads]);

  // Calculate asistencias data from filtered leads
  const asistenciasData = useMemo(() => {
    // asistio is BOOLEAN: true (visited) / false (not visited) / null (legacy)
    const asistioSi = filteredLeads.filter((l) => l.asistio === true).length;
    const asistioNo = filteredLeads.filter((l) => l.asistio === false || l.asistio === null).length;

    // Debug log to verify data
    console.log('[ASISTENCIAS] Total filtered leads:', filteredLeads.length);
    console.log('[ASISTENCIAS] Asistió Sí:', asistioSi);
    console.log('[ASISTENCIAS] Asistió No:', asistioNo);
    console.log('[ASISTENCIAS] Sum check:', asistioSi + asistioNo, '(should equal', filteredLeads.length, ')');

    return [
      {
        name: 'Asistió: Sí',
        value: asistioSi,
        color: '#1b967a', // Verde EcoPlaza
      },
      {
        name: 'Asistió: No',
        value: asistioNo,
        color: '#cbd5e1', // Gris claro
      },
    ];
  }, [filteredLeads]);

  // Calculate UTM distribution from filtered leads
  const utmData = useMemo(() => {
    console.log('[UTM] Total filtered leads:', filteredLeads.length);

    // Count leads per UTM source
    const utmCounts = filteredLeads.reduce((acc, lead) => {
      const utm = lead.utm || 'Sin UTM';
      acc[utm] = (acc[utm] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('[UTM] Counts:', utmCounts);

    // Sort by count descending
    const sorted = Object.entries(utmCounts)
      .sort((a, b) => b[1] - a[1]);

    // Color palette for UTMs (diverse colors)
    const utmColors: Record<string, string> = {
      'victoria': '#1b967a',      // Verde EcoPlaza
      'facebook': '#4267B2',      // Facebook blue
      'google': '#DB4437',        // Google red
      'instagram': '#E4405F',     // Instagram pink
      'referido': '#192c4d',      // Azul EcoPlaza
      'whatsapp': '#25D366',      // WhatsApp green
      'web': '#fbde17',           // Amarillo EcoPlaza
      'Sin UTM': '#cbd5e1',       // Gris claro
      'Otros': '#9ca3af',         // Gris medio
    };

    // Default color generator for unknown UTMs
    const getColor = (utm: string, index: number): string => {
      if (utmColors[utm]) return utmColors[utm];
      // Fallback to a color palette for unknown UTMs
      const fallbackColors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
      return fallbackColors[index % fallbackColors.length];
    };

    // If ≤5 different UTMs: show all
    if (sorted.length <= 5) {
      const result = sorted.map(([name, value], index) => ({
        name,
        value,
        color: getColor(name, index),
      }));
      console.log('[UTM] Showing all UTMs (≤5):', result.length);
      return result;
    }

    // If >5 different UTMs: Top 5 + "Otros"
    const top5 = sorted.slice(0, 5);
    const otrosCount = sorted.slice(5).reduce((sum, [_, count]) => sum + count, 0);

    const result = [
      ...top5.map(([name, value], index) => ({
        name,
        value,
        color: getColor(name, index),
      })),
      {
        name: 'Otros',
        value: otrosCount,
        color: utmColors['Otros'],
      },
    ];
    console.log('[UTM] Showing Top 5 + Otros:', result.length);
    return result;
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
          title="En Conversación"
          value={stats.conversacion}
          icon={Clock}
          color="secondary"
        />
        {/* Mini tabla: Manual, Incompleto, Abandonado */}
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Lead Manual</span>
              <span className="text-lg font-bold text-purple-600">{filteredLeads.filter((l) => l.estado === 'lead_manual').length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Lead Incompleto</span>
              <span className="text-lg font-bold text-yellow-600">{stats.incompletos}</span>
            </div>
            <div className="flex items-center justify-between">
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
        <PieChartComponent
          data={utmData}
          title="Distribución por UTM"
        />
      </div>

      {/* Admin Filters Section - Hidden for admin role */}
      {user?.rol !== 'admin' && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Filter Tabs - Only visible for jefe_ventas */}
          {user?.rol === 'jefe_ventas' && (
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
          )}

          {/* Vendedor Filter Dropdown - Only for jefe_ventas */}
          {user?.rol === 'jefe_ventas' && (
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

          {/* Estado Filter Dropdown - All non-admin roles */}
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
              <option value="lead_manual">Lead Manual</option>
            </select>
          </div>

          {/* Export & Import Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Import Dropdown (Vendedor only in this context) */}
            {user?.rol === 'vendedor' && (
              <div className="relative">
                <button
                  onClick={() => setIsImportDropdownOpen(!isImportDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 hover:shadow-md active:scale-95 font-medium transition-all duration-200"
                  title="Opciones para importar leads manuales"
                >
                  <Upload className="w-5 h-5" />
                  <span className="hidden sm:inline">Importar Leads Manuales</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isImportDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isImportDropdownOpen && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsImportDropdownOpen(false)}
                    />

                    {/* Dropdown Content */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
                      <button
                        onClick={() => {
                          setIsManualPanelOpen(true);
                          setIsImportDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                      >
                        <Plus className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" />
                        <div>
                          <p className="font-medium text-gray-900">Agregar Lead</p>
                          <p className="text-xs text-gray-500">Formulario visual paso a paso</p>
                        </div>
                      </button>

                      <div className="border-t border-gray-100" />

                      <button
                        onClick={() => {
                          setIsImportModalOpen(true);
                          setIsImportDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                      >
                        <Upload className="w-5 h-5 text-secondary group-hover:scale-110 transition-transform" />
                        <div>
                          <p className="font-medium text-gray-900">Importar CSV/Excel</p>
                          <p className="text-xs text-gray-500">Subir archivo con múltiples leads</p>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Export Button - Only for jefe_ventas (admin is already excluded from parent condition) */}
            {user?.rol === 'jefe_ventas' && (
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
            )}
          </div>
        </div>
      )}

      {/* Table Section - Hidden for admin users */}
      {user?.rol !== 'admin' && (
        <LeadsTable
          leads={filteredLeads}
          totalLeads={initialLeads.length}
          onLeadClick={handleLeadClick}
          vendedores={vendedores}
          currentVendedorId={user?.vendedor_id || null}
          onAssignLead={handleAssignLead}
          userRole={user?.rol || null}
        />
      )}

      {/* Lead Detail Panel - Hidden for admin users */}
      {user?.rol !== 'admin' && (
        <LeadDetailPanel lead={selectedLead} isOpen={isPanelOpen} onClose={handleClosePanel} />
      )}

      {/* Manual Lead Panel (Admin + Vendedor) */}
      {(user?.rol === 'admin' || user?.rol === 'vendedor') && selectedProyecto && (
        <ManualLeadPanel
          isOpen={isManualPanelOpen}
          onClose={() => setIsManualPanelOpen(false)}
          onSuccess={() => {
            setIsManualPanelOpen(false);
            // Refresh leads after successful import
            if (onRefresh) {
              onRefresh(dateFrom, dateTo);
            }
          }}
          proyectoId={selectedProyecto.id}
          proyectoNombre={selectedProyecto.nombre}
          usuarios={usuarios}
        />
      )}

      {/* Import Modal (Admin + Vendedor) */}
      {(user?.rol === 'admin' || user?.rol === 'vendedor') && selectedProyecto && (
        <LeadImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            setIsImportModalOpen(false);
            // Refresh leads after successful import
            if (onRefresh) {
              onRefresh(dateFrom, dateTo);
            }
          }}
          proyectoId={selectedProyecto.id}
          proyectoNombre={selectedProyecto.nombre}
        />
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
    </>
  );
}
