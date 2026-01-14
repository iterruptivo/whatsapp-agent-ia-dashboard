'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LeadsTable from '@/components/dashboard/LeadsTable';
import DateRangeFilter from '@/components/dashboard/DateRangeFilter';
import LeadDetailPanel from '@/components/dashboard/LeadDetailPanel';
import { Lead, Usuario, getAllUsuarios } from '@/lib/db';
import { getAllVendedoresActivos, VendedorActivo } from '@/lib/locales';
import { assignLeadToVendedor } from '@/lib/actions';
import { useAuth } from '@/lib/auth-context';
import { Download, Upload, Plus, ChevronDown, Zap, Filter, X, SlidersHorizontal, ChevronUp } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { exportLeadsToExcel } from '@/lib/exportToExcel';
import LeadImportModal from '@/components/leads/LeadImportModal';
import ManualLeadPanel from '@/components/leads/ManualLeadPanel';
import { addMultipleLeadsToRepulse, excluirLeadDeRepulse, reincluirLeadEnRepulse } from '@/lib/actions-repulse';
// Kanban imports
import { KanbanBoard, KanbanViewToggle, type ViewMode, type LeadCard, type KanbanColumnConfig } from '@/components/operativo/kanban';
import ComboboxFilter from '@/components/ui/ComboboxFilter';
import { getKanbanColumns, getKanbanMappings, calculateKanbanColumn, type KanbanMapping } from '@/lib/kanban-config';
import { moveLeadToColumn } from '@/lib/actions-kanban';

interface OperativoClientProps {
  initialLeads: Lead[];
  initialDateFrom?: string;
  initialDateTo?: string;
  onRefresh?: (dateFrom: string, dateTo: string) => Promise<void>;
}

export default function OperativoClient({
  initialLeads,
  initialDateFrom = '',
  initialDateTo = '',
  onRefresh,
}: OperativoClientProps) {
  const router = useRouter();
  const { user, selectedProyecto } = useAuth(); // Get authenticated user and proyecto from context
  const { isOpen, config, showDialog, closeDialog } = useConfirmDialog();
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Vendedor state (for admin - fetches all vendedores for assignment dropdown)
  // NOTA: Usa VendedorActivo que incluye coordinadores (Sesión 74)
  const [vendedores, setVendedores] = useState<VendedorActivo[]>([]);

  // Usuarios state (for manual lead panel - fetches all usuarios with email)
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [assignmentFilter, setAssignmentFilter] = useState<'todos' | 'sin_asignar' | 'mis_leads'>('todos');
  const [selectedVendedorFilter, setSelectedVendedorFilter] = useState<string>(''); // Admin-only: filter by specific vendedor
  const [roleDefaultsApplied, setRoleDefaultsApplied] = useState(false); // Track if role-based defaults were applied

  // Estado filter (for both admin and vendedor)
  const [estadoFilter, setEstadoFilter] = useState<string>(''); // Filter by lead estado

  // UTM filter (for both admin and vendedor)
  const [utmFilter, setUtmFilter] = useState<string>(''); // Filter by UTM source

  // Advanced Filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [rubroFilter, setRubroFilter] = useState<string>('');
  const [asistioFilter, setAsistioFilter] = useState<string>(''); // '', 'si', 'no'
  const [tipificacionN1Filter, setTipificacionN1Filter] = useState<string>('');
  const [tipificacionN2Filter, setTipificacionN2Filter] = useState<string>('');
  const [tipificacionN3Filter, setTipificacionN3Filter] = useState<string>('');
  const [excluRepulseFilter, setExcluRepulseFilter] = useState<string>(''); // '', 'si', 'no'

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Import state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Manual Lead Panel state (admin + vendedor)
  const [isManualPanelOpen, setIsManualPanelOpen] = useState(false);

  // Dropdown state for import options
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);

  // Repulse selection state
  const [selectedLeadIdsForRepulse, setSelectedLeadIdsForRepulse] = useState<string[]>([]);
  const [isAddingToRepulse, setIsAddingToRepulse] = useState(false);

  // Kanban state
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumnConfig[]>([]);
  const [kanbanMappings, setKanbanMappings] = useState<KanbanMapping[]>([]);
  const [isKanbanLoading, setIsKanbanLoading] = useState(false);

  // Fetch vendedores on mount (only for assignment dropdown in table)
  // NOTA: Usa getAllVendedoresActivos para incluir coordinadores (Sesión 74)
  useEffect(() => {
    getAllVendedoresActivos().then(setVendedores);
    getAllUsuarios().then(setUsuarios);
  }, []);

  // NOTA: Defaults cambiados a Tabla + Todos para todos los roles (Sesión 76)
  // Anteriormente vendedores tenían Kanban + Mis Leads por defecto
  useEffect(() => {
    if (user && !roleDefaultsApplied) {
      // Todos los roles usan los defaults iniciales: Tabla + Todos
      // No aplicamos cambios automáticos de vista/filtro
      setRoleDefaultsApplied(true);
    }
  }, [user, roleDefaultsApplied]);

  // Fetch Kanban config when switching to kanban view
  useEffect(() => {
    if (viewMode === 'kanban' && kanbanColumns.length === 0) {
      setIsKanbanLoading(true);
      Promise.all([getKanbanColumns(), getKanbanMappings()])
        .then(([columns, mappings]) => {
          setKanbanColumns(columns);
          setKanbanMappings(mappings);
        })
        .catch((error) => {
          console.error('Error loading Kanban config:', error);
        })
        .finally(() => {
          setIsKanbanLoading(false);
        });
    }
  }, [viewMode, kanbanColumns.length]);

  // Get current vendedor ID from auth context
  const currentVendedorId = user?.vendedor_id || null;

  // Calculate unique UTM values dynamically from leads (normalized to lowercase for grouping)
  const uniqueUtmValues = useMemo(() => {
    const utmMap = new Map<string, string>(); // normalized -> original display value

    initialLeads.forEach((lead) => {
      if (lead.utm) {
        const normalized = lead.utm.toLowerCase().trim();
        // Keep the first occurrence's original casing for display
        if (!utmMap.has(normalized)) {
          // Capitalize first letter for nice display
          const displayValue = lead.utm.charAt(0).toUpperCase() + lead.utm.slice(1).toLowerCase();
          utmMap.set(normalized, displayValue);
        }
      }
    });

    // Sort alphabetically and return as array of {value, label}
    return Array.from(utmMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [initialLeads]);

  // Create vendedor options for ComboboxFilter (only active vendedores)
  const vendedorOptions = useMemo(() => {
    return vendedores
      .filter((v) => v.activo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((v) => ({ value: v.id, label: v.nombre }));
  }, [vendedores]);

  // Calculate unique RUBRO values dynamically from leads
  const uniqueRubroValues = useMemo(() => {
    const rubroMap = new Map<string, string>();
    initialLeads.forEach((lead) => {
      if (lead.rubro) {
        const normalized = lead.rubro.toLowerCase().trim();
        if (!rubroMap.has(normalized)) {
          const displayValue = lead.rubro.charAt(0).toUpperCase() + lead.rubro.slice(1).toLowerCase();
          rubroMap.set(normalized, displayValue);
        }
      }
    });
    return Array.from(rubroMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [initialLeads]);

  // Calculate unique TIPIFICACION_NIVEL_1 values
  const uniqueTipN1Values = useMemo(() => {
    const tipMap = new Map<string, string>();
    initialLeads.forEach((lead) => {
      if (lead.tipificacion_nivel_1) {
        const normalized = lead.tipificacion_nivel_1.toLowerCase().trim();
        if (!tipMap.has(normalized)) {
          tipMap.set(normalized, lead.tipificacion_nivel_1);
        }
      }
    });
    return Array.from(tipMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [initialLeads]);

  // Calculate unique TIPIFICACION_NIVEL_2 values (filtered by N1 if selected)
  const uniqueTipN2Values = useMemo(() => {
    const tipMap = new Map<string, string>();
    initialLeads
      .filter((lead) => !tipificacionN1Filter || lead.tipificacion_nivel_1?.toLowerCase().trim() === tipificacionN1Filter)
      .forEach((lead) => {
        if (lead.tipificacion_nivel_2) {
          const normalized = lead.tipificacion_nivel_2.toLowerCase().trim();
          if (!tipMap.has(normalized)) {
            tipMap.set(normalized, lead.tipificacion_nivel_2);
          }
        }
      });
    return Array.from(tipMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [initialLeads, tipificacionN1Filter]);

  // Calculate unique TIPIFICACION_NIVEL_3 values (filtered by N1 and N2 if selected)
  const uniqueTipN3Values = useMemo(() => {
    const tipMap = new Map<string, string>();
    initialLeads
      .filter((lead) => !tipificacionN1Filter || lead.tipificacion_nivel_1?.toLowerCase().trim() === tipificacionN1Filter)
      .filter((lead) => !tipificacionN2Filter || lead.tipificacion_nivel_2?.toLowerCase().trim() === tipificacionN2Filter)
      .forEach((lead) => {
        if (lead.tipificacion_nivel_3) {
          const normalized = lead.tipificacion_nivel_3.toLowerCase().trim();
          if (!tipMap.has(normalized)) {
            tipMap.set(normalized, lead.tipificacion_nivel_3);
          }
        }
      });
    return Array.from(tipMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [initialLeads, tipificacionN1Filter, tipificacionN2Filter]);

  // Count active filters for badge indicator
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (assignmentFilter !== 'todos') count++;
    if (selectedVendedorFilter) count++;
    if (estadoFilter) count++;
    if (utmFilter) count++;
    // Advanced filters
    if (rubroFilter) count++;
    if (asistioFilter) count++;
    if (tipificacionN1Filter) count++;
    if (tipificacionN2Filter) count++;
    if (tipificacionN3Filter) count++;
    if (excluRepulseFilter) count++;
    return count;
  }, [assignmentFilter, selectedVendedorFilter, estadoFilter, utmFilter, rubroFilter, asistioFilter, tipificacionN1Filter, tipificacionN2Filter, tipificacionN3Filter, excluRepulseFilter]);

  // Count advanced filters only (for badge in advanced button)
  const advancedFilterCount = useMemo(() => {
    let count = 0;
    if (utmFilter) count++;
    if (rubroFilter) count++;
    if (asistioFilter) count++;
    if (tipificacionN1Filter) count++;
    if (tipificacionN2Filter) count++;
    if (tipificacionN3Filter) count++;
    if (excluRepulseFilter) count++;
    return count;
  }, [utmFilter, rubroFilter, asistioFilter, tipificacionN1Filter, tipificacionN2Filter, tipificacionN3Filter, excluRepulseFilter]);

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

    // Admin/Jefe Ventas/Superadmin: Filter by specific vendedor (dropdown)
    if (selectedVendedorFilter && (user?.rol === 'admin' || user?.rol === 'superadmin' || user?.rol === 'jefe_ventas')) {
      filtered = filtered.filter((lead) => lead.vendedor_asignado_id === selectedVendedorFilter);
    }

    // NEW: Filter by estado (applies to both admin and vendedor)
    if (estadoFilter) {
      filtered = filtered.filter((lead) => lead.estado === estadoFilter);
    }

    // NEW: Filter by UTM source (normalized comparison)
    if (utmFilter) {
      filtered = filtered.filter((lead) => {
        if (!lead.utm) return false;
        return lead.utm.toLowerCase().trim() === utmFilter;
      });
    }

    // ADVANCED FILTERS
    // Filter by rubro (normalized comparison)
    if (rubroFilter) {
      filtered = filtered.filter((lead) => {
        if (!lead.rubro) return false;
        return lead.rubro.toLowerCase().trim() === rubroFilter;
      });
    }

    // Filter by asistio_cita
    if (asistioFilter) {
      filtered = filtered.filter((lead) => {
        if (asistioFilter === 'si') return lead.asistio === true;
        if (asistioFilter === 'no') return lead.asistio === false;
        return true;
      });
    }

    // Filter by tipificacion nivel 1 (normalized)
    if (tipificacionN1Filter) {
      filtered = filtered.filter((lead) => {
        if (!lead.tipificacion_nivel_1) return false;
        return lead.tipificacion_nivel_1.toLowerCase().trim() === tipificacionN1Filter;
      });
    }

    // Filter by tipificacion nivel 2 (normalized)
    if (tipificacionN2Filter) {
      filtered = filtered.filter((lead) => {
        if (!lead.tipificacion_nivel_2) return false;
        return lead.tipificacion_nivel_2.toLowerCase().trim() === tipificacionN2Filter;
      });
    }

    // Filter by tipificacion nivel 3 (normalized)
    if (tipificacionN3Filter) {
      filtered = filtered.filter((lead) => {
        if (!lead.tipificacion_nivel_3) return false;
        return lead.tipificacion_nivel_3.toLowerCase().trim() === tipificacionN3Filter;
      });
    }

    // Filter by excluido_repulse
    if (excluRepulseFilter) {
      filtered = filtered.filter((lead) => {
        if (excluRepulseFilter === 'si') return lead.excluido_repulse === true;
        if (excluRepulseFilter === 'no') return lead.excluido_repulse !== true;
        return true;
      });
    }

    return filtered;
  }, [initialLeads, dateFrom, dateTo, assignmentFilter, currentVendedorId, selectedVendedorFilter, estadoFilter, utmFilter, rubroFilter, asistioFilter, tipificacionN1Filter, tipificacionN2Filter, tipificacionN3Filter, excluRepulseFilter, user?.rol]);

  // Convert filtered leads to Kanban cards with calculated column
  const kanbanLeads = useMemo((): LeadCard[] => {
    if (kanbanMappings.length === 0) return [];

    return filteredLeads.map((lead) => ({
      id: lead.id,
      nombre: lead.nombre,
      telefono: lead.telefono,
      rubro: lead.rubro,
      email: lead.email,
      utm_source: lead.utm, // El campo en Lead es 'utm', mapeamos a utm_source para Kanban
      tipificacion_nivel_1: lead.tipificacion_nivel_1,
      tipificacion_nivel_2: lead.tipificacion_nivel_2,
      tipificacion_nivel_3: lead.tipificacion_nivel_3,
      vendedor_asignado_id: lead.vendedor_asignado_id,
      vendedor_nombre: lead.vendedor_nombre,
      proyecto_id: lead.proyecto_id,
      proyecto_nombre: lead.proyecto_nombre,
      proyecto_color: lead.proyecto_color,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      columna_kanban: calculateKanbanColumn(lead, kanbanMappings),
    }));
  }, [filteredLeads, kanbanMappings]);

  const handleClearFilters = () => {
    setDateFrom(initialDateFrom);
    setDateTo(initialDateTo);
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsPanelOpen(true);
  };

  // Handler for Kanban card click (convert LeadCard to Lead)
  const handleKanbanLeadClick = (leadCard: LeadCard) => {
    const lead = filteredLeads.find((l) => l.id === leadCard.id);
    if (lead) {
      setSelectedLead(lead);
      setIsPanelOpen(true);
    }
  };

  // Handler for moving lead in Kanban
  const handleKanbanLeadMove = async (leadId: string, targetColumn: string) => {
    try {
      const result = await moveLeadToColumn(leadId, targetColumn);

      if (result.success) {
        // Refresh leads to get updated tipificacion
        if (onRefresh) {
          await onRefresh(dateFrom, dateTo);
        }
      } else {
        showDialog({
          title: 'Error al mover lead',
          message: result.error || 'No se pudo mover el lead',
          type: 'error',
          variant: 'danger',
          confirmText: 'Aceptar',
          showCancel: false,
        });
      }
    } catch (error) {
      console.error('Error moving lead in Kanban:', error);
      showDialog({
        title: 'Error inesperado',
        message: 'Ocurrió un error al mover el lead.',
        type: 'error',
        variant: 'danger',
        confirmText: 'Aceptar',
        showCancel: false,
      });
    }
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

  // Handler: Send single lead to Repulse (from detail panel)
  const handleSendToRepulse = async (leadId: string) => {
    if (!user || !selectedProyecto) return;

    setIsAddingToRepulse(true);
    try {
      const result = await addMultipleLeadsToRepulse([leadId], selectedProyecto.id, user.id);

      if (result.success) {
        handleClosePanel();
        showDialog({
          title: '¡Lead agregado a Repulse!',
          message: `El lead ha sido agregado al sistema de re-engagement. Puedes gestionarlo desde la página de Repulse.`,
          type: 'success',
          variant: 'success',
          confirmText: 'Aceptar',
          showCancel: false,
        });
      } else {
        showDialog({
          title: 'Error al agregar',
          message: result.errors.length > 0 ? result.errors[0] : 'No se pudo agregar el lead a repulse',
          type: 'error',
          variant: 'danger',
          confirmText: 'Aceptar',
          showCancel: false,
        });
      }
    } catch (error) {
      console.error('Error al enviar a repulse:', error);
      showDialog({
        title: 'Error inesperado',
        message: 'Ocurrió un error al agregar el lead a repulse.',
        type: 'error',
        variant: 'danger',
        confirmText: 'Aceptar',
        showCancel: false,
      });
    } finally {
      setIsAddingToRepulse(false);
    }
  };

  // Handler: Send multiple leads to Repulse (from table selection)
  const handleSendMultipleToRepulse = async () => {
    if (!user || !selectedProyecto || selectedLeadIdsForRepulse.length === 0) return;

    setIsAddingToRepulse(true);
    try {
      const result = await addMultipleLeadsToRepulse(selectedLeadIdsForRepulse, selectedProyecto.id, user.id);

      if (result.success) {
        setSelectedLeadIdsForRepulse([]);
        showDialog({
          title: '¡Leads agregados a Repulse!',
          message: `Se han agregado ${result.added} leads al sistema de re-engagement.${result.skipped > 0 ? ` (${result.skipped} ya estaban en repulse)` : ''}`,
          type: 'success',
          variant: 'success',
          confirmText: 'Aceptar',
          showCancel: false,
        });
      } else {
        showDialog({
          title: 'Error al agregar',
          message: result.errors.length > 0 ? result.errors.join(', ') : 'No se pudieron agregar los leads a repulse',
          type: 'error',
          variant: 'danger',
          confirmText: 'Aceptar',
          showCancel: false,
        });
      }
    } catch (error) {
      console.error('Error al enviar a repulse:', error);
      showDialog({
        title: 'Error inesperado',
        message: 'Ocurrió un error al agregar los leads a repulse.',
        type: 'error',
        variant: 'danger',
        confirmText: 'Aceptar',
        showCancel: false,
      });
    } finally {
      setIsAddingToRepulse(false);
    }
  };

  // Handler: Toggle lead exclusion from Repulse
  const handleToggleExcludeRepulse = async (leadId: string, exclude: boolean) => {
    try {
      const result = exclude
        ? await excluirLeadDeRepulse(leadId)
        : await reincluirLeadEnRepulse(leadId);

      if (result.success) {
        handleClosePanel();
        showDialog({
          title: exclude ? 'Lead excluido' : 'Lead reincluido',
          message: exclude
            ? 'El lead ha sido excluido permanentemente del sistema de Repulse.'
            : 'El lead ahora puede ser agregado al sistema de Repulse.',
          type: 'success',
          variant: 'success',
          confirmText: 'Aceptar',
          showCancel: false,
        });
        // Refresh leads to update excluido_repulse state
        if (onRefresh) {
          await onRefresh(dateFrom, dateTo);
        }
      } else {
        showDialog({
          title: 'Error',
          message: result.error || 'No se pudo actualizar el estado del lead',
          type: 'error',
          variant: 'danger',
          confirmText: 'Aceptar',
          showCancel: false,
        });
      }
    } catch (error) {
      console.error('Error toggling repulse exclusion:', error);
      showDialog({
        title: 'Error inesperado',
        message: 'Ocurrió un error al actualizar el estado del lead.',
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


      {/* ============================================================ */}
      {/* FILTER BAR - World-Class UX 2026 (Linear/Notion/Figma style) */}
      {/* ============================================================ */}
      <div className="mb-4">
        {/* Unified Filter Bar Container */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">

          {/* MOBILE/TABLET: Stack vertical | DESKTOP (1280px+): Horizontal */}
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-3">

            {/* ROW 1: Quick Filter Pills */}
            <div className="flex items-center gap-1 p-1.5 bg-gray-100 rounded-lg w-fit">
              <button
                onClick={() => setAssignmentFilter('todos')}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  assignmentFilter === 'todos'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setAssignmentFilter('sin_asignar')}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  assignmentFilter === 'sin_asignar'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Sin Asignar
              </button>
              {/* Mis Leads - only for vendedor roles */}
              {(user?.rol === 'vendedor' || user?.rol === 'vendedor_caseta' || user?.rol === 'coordinador') && (
                <button
                  onClick={() => setAssignmentFilter('mis_leads')}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    assignmentFilter === 'mis_leads'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                  disabled={!currentVendedorId}
                >
                  Mis Leads
                </button>
              )}
            </div>

            {/* ROW 2: Vendedor Filter - Admin/Jefe Ventas/Superadmin (full width on mobile) */}
            {(user?.rol === 'admin' || user?.rol === 'superadmin' || user?.rol === 'jefe_ventas') && (
              <ComboboxFilter
                options={vendedorOptions}
                value={selectedVendedorFilter}
                onChange={setSelectedVendedorFilter}
                placeholder="Vendedor"
                searchPlaceholder="Buscar vendedor..."
                emptyMessage="No se encontró vendedor"
                className="w-full xl:w-auto"
              />
            )}

            {/* ROW 3: Estado Filter (full width on mobile) */}
            <ComboboxFilter
              options={[
                { value: 'lead_completo', label: 'Lead Completo' },
                { value: 'lead_incompleto', label: 'Lead Incompleto' },
                { value: 'en_conversacion', label: 'En Conversación' },
                { value: 'conversacion_abandonada', label: 'Abandonada' },
              ]}
              value={estadoFilter}
              onChange={setEstadoFilter}
              placeholder="Estado"
              searchPlaceholder="Buscar estado..."
              emptyMessage="No se encontró estado"
              className="w-full xl:w-auto"
            />

            {/* Active Filters Badge + Clear */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                  <Filter className="w-4 h-4" />
                  <span>{activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''}</span>
                </div>
                <button
                  onClick={() => {
                    setAssignmentFilter('todos');
                    setSelectedVendedorFilter('');
                    setEstadoFilter('');
                    setUtmFilter('');
                    // Clear advanced filters
                    setRubroFilter('');
                    setAsistioFilter('');
                    setTipificacionN1Filter('');
                    setTipificacionN2Filter('');
                    setTipificacionN3Filter('');
                    setExcluRepulseFilter('');
                    setShowAdvancedFilters(false);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Limpiar filtros"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Divider - Only on desktop (1280px+) */}
            <div className="hidden xl:block w-px h-8 bg-gray-200 shrink-0" />

            {/* ROW 5: Actions Section */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 xl:pt-0 xl:border-t-0 shrink-0">
              {/* View Toggle */}
              <KanbanViewToggle view={viewMode} onViewChange={setViewMode} />

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {/* Import Dropdown */}
                {(user?.rol === 'admin' || user?.rol === 'jefe_ventas' || user?.rol === 'vendedor' || user?.rol === 'vendedor_caseta' || user?.rol === 'coordinador') && (
                  <div className="relative">
                    <button
                      onClick={() => setIsImportDropdownOpen(!isImportDropdownOpen)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-white rounded-lg hover:bg-secondary/90 text-sm font-semibold transition-all"
                      title="Importar leads"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="hidden sm:inline">Importar</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isImportDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isImportDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsImportDropdownOpen(false)} />
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-20 overflow-hidden">
                          <button
                            onClick={() => { setIsManualPanelOpen(true); setIsImportDropdownOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <Plus className="w-5 h-5 text-accent" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Agregar Lead</p>
                              <p className="text-xs text-gray-500">Formulario visual</p>
                            </div>
                          </button>
                          <div className="border-t border-gray-100" />
                          <button
                            onClick={() => { setIsImportModalOpen(true); setIsImportDropdownOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            <Upload className="w-5 h-5 text-secondary" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Importar CSV/Excel</p>
                              <p className="text-xs text-gray-500">Múltiples leads</p>
                            </div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Export Button - SOLO SUPERADMIN */}
                {user?.rol === 'superadmin' && (
                  <button
                    onClick={handleExportToExcel}
                    disabled={isExporting || filteredLeads.length === 0}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      isExporting || filteredLeads.length === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                    title={filteredLeads.length === 0 ? 'No hay leads' : 'Exportar a Excel'}
                  >
                    <Download className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
                    <span className="hidden sm:inline">{isExporting ? 'Exportando...' : 'Exportar'}</span>
                  </button>
                )}

                {/* Advanced Filters Button */}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    showAdvancedFilters || advancedFilterCount > 0
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Filtros Avanzados"
                >
                  <SlidersHorizontal className="w-5 h-5" />
                  <span className="hidden sm:inline">Avanzado</span>
                  {advancedFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-purple-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                      {advancedFilterCount}
                    </span>
                  )}
                  {showAdvancedFilters ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ADVANCED FILTERS PANEL - Collapsible (Mobile First) */}
        {/* ============================================================ */}
        {showAdvancedFilters && (
          <div className="mt-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-semibold text-gray-700">Filtros Avanzados</span>
                {advancedFilterCount > 0 && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                    {advancedFilterCount} activo{advancedFilterCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setUtmFilter('');
                  setRubroFilter('');
                  setAsistioFilter('');
                  setTipificacionN1Filter('');
                  setTipificacionN2Filter('');
                  setTipificacionN3Filter('');
                  setExcluRepulseFilter('');
                }}
                className={`text-xs font-medium transition-colors ${
                  advancedFilterCount > 0 ? 'text-red-500 hover:text-red-700' : 'text-gray-400 cursor-not-allowed'
                }`}
                disabled={advancedFilterCount === 0}
              >
                Limpiar avanzados
              </button>
            </div>

            {/* Filters Grid - Mobile: 1 col | Tablet: 2 cols | Desktop: 4 cols */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {/* Origen (UTM) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</label>
                <ComboboxFilter
                  options={uniqueUtmValues}
                  value={utmFilter}
                  onChange={setUtmFilter}
                  placeholder="Todos los orígenes"
                  searchPlaceholder="Buscar origen..."
                  emptyMessage="No se encontró"
                  className="w-full"
                />
              </div>

              {/* Rubro */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rubro</label>
                <ComboboxFilter
                  options={uniqueRubroValues}
                  value={rubroFilter}
                  onChange={setRubroFilter}
                  placeholder="Todos los rubros"
                  searchPlaceholder="Buscar rubro..."
                  emptyMessage="No se encontró"
                  className="w-full"
                />
              </div>

              {/* Asistió a Cita */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Asistió a Cita</label>
                <ComboboxFilter
                  options={[
                    { value: 'si', label: 'Sí asistió' },
                    { value: 'no', label: 'No asistió' },
                  ]}
                  value={asistioFilter}
                  onChange={setAsistioFilter}
                  placeholder="Todos"
                  searchPlaceholder="Buscar..."
                  emptyMessage="No se encontró"
                  className="w-full"
                />
              </div>

              {/* Excluido de Repulse */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Repulse</label>
                <ComboboxFilter
                  options={[
                    { value: 'si', label: 'Excluido' },
                    { value: 'no', label: 'No excluido' },
                  ]}
                  value={excluRepulseFilter}
                  onChange={setExcluRepulseFilter}
                  placeholder="Todos"
                  searchPlaceholder="Buscar..."
                  emptyMessage="No se encontró"
                  className="w-full"
                />
              </div>

              {/* Tipificación Nivel 1 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tipificación N1</label>
                <ComboboxFilter
                  options={uniqueTipN1Values}
                  value={tipificacionN1Filter}
                  onChange={(value) => {
                    setTipificacionN1Filter(value);
                    // Reset dependent filters when N1 changes
                    setTipificacionN2Filter('');
                    setTipificacionN3Filter('');
                  }}
                  placeholder="Todas"
                  searchPlaceholder="Buscar..."
                  emptyMessage="No se encontró"
                  className="w-full"
                />
              </div>

              {/* Tipificación Nivel 2 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tipificación N2</label>
                <ComboboxFilter
                  options={uniqueTipN2Values}
                  value={tipificacionN2Filter}
                  onChange={(value) => {
                    setTipificacionN2Filter(value);
                    // Reset dependent filter when N2 changes
                    setTipificacionN3Filter('');
                  }}
                  placeholder="Todas"
                  searchPlaceholder="Buscar..."
                  emptyMessage={tipificacionN1Filter ? 'No hay opciones' : 'Selecciona N1 primero'}
                  className="w-full"
                />
              </div>

              {/* Tipificación Nivel 3 */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tipificación N3</label>
                <ComboboxFilter
                  options={uniqueTipN3Values}
                  value={tipificacionN3Filter}
                  onChange={setTipificacionN3Filter}
                  placeholder="Todas"
                  searchPlaceholder="Buscar..."
                  emptyMessage={tipificacionN2Filter ? 'No hay opciones' : 'Selecciona N2 primero'}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leads View - Table or Kanban */}
      {viewMode === 'table' ? (
        <LeadsTable
          leads={filteredLeads}
          totalLeads={initialLeads.length}
          onLeadClick={handleLeadClick}
          vendedores={vendedores}
          currentUserId={user?.id || null}
          onAssignLead={handleAssignLead}
          userRole={user?.rol || null}
          // Repulse multi-select (solo admin y jefe_ventas)
          showRepulseSelection={user?.rol === 'admin' || user?.rol === 'jefe_ventas'}
          selectedLeadIds={selectedLeadIdsForRepulse}
          onSelectionChange={setSelectedLeadIdsForRepulse}
          onSendToRepulse={handleSendMultipleToRepulse}
          isAddingToRepulse={isAddingToRepulse}
        />
      ) : (
        <KanbanBoard
          columns={kanbanColumns}
          leads={kanbanLeads}
          onLeadMove={handleKanbanLeadMove}
          onLeadClick={handleKanbanLeadClick}
          isLoading={isKanbanLoading}
          vendedores={
            // Vendedores solo pueden asignarse a sí mismos, admins/jefes ven todos
            (user?.rol === 'vendedor' || user?.rol === 'vendedor_caseta')
              ? vendedores.filter(v => v.vendedor_id === currentVendedorId).map(v => ({ id: v.vendedor_id!, nombre: v.nombre }))
              : vendedores.filter(v => v.vendedor_id).map(v => ({ id: v.vendedor_id!, nombre: v.nombre }))
          }
          onAssignLead={handleAssignLead}
          canAssign={user?.rol === 'admin' || user?.rol === 'superadmin' || user?.rol === 'jefe_ventas' || user?.rol === 'vendedor' || user?.rol === 'vendedor_caseta'}
        />
      )}

      {/* Lead Detail Panel */}
      <LeadDetailPanel
        lead={selectedLead}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
        showRepulseButton={user?.rol === 'admin' || user?.rol === 'jefe_ventas'}
        onSendToRepulse={handleSendToRepulse}
        onToggleExcludeRepulse={handleToggleExcludeRepulse}
        usuarioId={user?.id}
        usuarioNombre={user?.nombre || user?.email || 'Usuario'}
        usuarioRol={user?.rol}
        onLeadUpdate={async () => {
          // Refresh leads cuando se actualiza la tipificación en el panel
          if (onRefresh) {
            await onRefresh(dateFrom, dateTo);
          }
        }}
      />

      {/* Manual Lead Panel (Admin + Jefe Ventas + Vendedor + Vendedor Caseta + Coordinador) */}
      {(user?.rol === 'admin' || user?.rol === 'jefe_ventas' || user?.rol === 'vendedor' || user?.rol === 'vendedor_caseta' || user?.rol === 'coordinador') && selectedProyecto && (
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

      {/* Import Modal (Admin + Jefe Ventas + Vendedor + Vendedor Caseta + Coordinador) */}
      {(user?.rol === 'admin' || user?.rol === 'jefe_ventas' || user?.rol === 'vendedor' || user?.rol === 'vendedor_caseta' || user?.rol === 'coordinador') && selectedProyecto && (
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
    </>
  );
}
