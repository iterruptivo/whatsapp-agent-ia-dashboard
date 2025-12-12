// ============================================================================
// COMPONENT: RepulseClient
// ============================================================================
// Descripción: Componente principal para gestión de repulse
// Features: Tabla de leads, selección múltiple, templates, envío a n8n
// ============================================================================

'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Zap,
  Users,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  Search,
  FileText,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  Info,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  type RepulseLead,
  type RepulseTemplate,
  type QuotaInfo,
  removeLeadFromRepulse,
  excluirLeadDeRepulse,
  prepararEnvioRepulseBatch,
} from '@/lib/actions-repulse';
import Tooltip from '@/components/shared/Tooltip';
import RepulseTemplateModal from './RepulseTemplateModal';
import RepulseEnvioModal from './RepulseEnvioModal';
import ConfirmModal from '@/components/shared/ConfirmModal';

interface RepulseClientProps {
  initialLeads: RepulseLead[];
  initialTemplates: RepulseTemplate[];
  initialStats: {
    total: number;
    pendientes: number;
    enviados: number;
    respondieron: number;
    sinRespuesta: number;
    excluidos: number;
  };
  initialQuota: QuotaInfo;
  proyectoId: string;
  userId: string;
  onRefresh: () => void;
}

export default function RepulseClient({
  initialLeads,
  initialTemplates,
  initialStats,
  initialQuota,
  proyectoId,
  userId,
  onRefresh,
}: RepulseClientProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [templates, setTemplates] = useState(initialTemplates);
  const [stats, setStats] = useState(initialStats);
  const [quota] = useState(initialQuota);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEnvioModal, setShowEnvioModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Sort state (asc = oldest first, desc = newest first)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // State para ConfirmModal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'remove' | 'excluir' | null;
    targetId: string | null;
  }>({
    isOpen: false,
    type: null,
    targetId: null,
  });

  // State para modal informativo
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Filtrar leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Filtro por estado
      if (estadoFilter !== 'todos' && lead.estado !== estadoFilter) {
        return false;
      }

      // Filtro por búsqueda
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const nombre = lead.lead?.nombre?.toLowerCase() || '';
        const telefono = lead.lead?.telefono?.toLowerCase() || '';
        const rubro = lead.lead?.rubro?.toLowerCase() || '';

        if (!nombre.includes(search) && !telefono.includes(search) && !rubro.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [leads, estadoFilter, searchTerm]);

  // Sorted leads by fecha lead (created_at)
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      const dateA = new Date(a.lead?.created_at || 0).getTime();
      const dateB = new Date(b.lead?.created_at || 0).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [filteredLeads, sortOrder]);

  // Paginated leads
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedLeads.slice(start, end);
  }, [sortedLeads, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedLeads.length / itemsPerPage);

  // Reset page when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, estadoFilter, sortOrder]);

  // Leads seleccionables (solo pendientes de la página actual)
  const selectableLeads = paginatedLeads.filter((l) => l.estado === 'pendiente');

  // Toggle selección individual
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedLeads(newSelected);
  };

  // Seleccionar todos los pendientes visibles
  const toggleSelectAll = () => {
    if (selectedLeads.size === selectableLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(selectableLeads.map((l) => l.id)));
    }
  };

  // Abrir modal de confirmación para eliminar
  const openRemoveConfirm = (repulseLeadId: string) => {
    setConfirmModal({ isOpen: true, type: 'remove', targetId: repulseLeadId });
  };

  // Abrir modal de confirmación para excluir
  const openExcluirConfirm = (leadId: string) => {
    setConfirmModal({ isOpen: true, type: 'excluir', targetId: leadId });
  };

  // Cerrar modal de confirmación
  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: null, targetId: null });
  };

  // Ejecutar acción confirmada
  const handleConfirmAction = async () => {
    if (!confirmModal.targetId || !confirmModal.type) return;

    setIsLoading(true);
    closeConfirmModal();

    if (confirmModal.type === 'remove') {
      const result = await removeLeadFromRepulse(confirmModal.targetId);
      if (result.success) {
        onRefresh();
      } else {
        alert(result.error || 'Error al eliminar');
      }
    } else if (confirmModal.type === 'excluir') {
      const result = await excluirLeadDeRepulse(confirmModal.targetId);
      if (result.success) {
        onRefresh();
      } else {
        alert(result.error || 'Error al excluir');
      }
    }

    setIsLoading(false);
  };

  // Obtener badge de estado
  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      pendiente: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" />, label: 'Pendiente' },
      enviado: { color: 'bg-blue-100 text-blue-800', icon: <Send className="w-3 h-3" />, label: 'Enviado' },
      respondio: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" />, label: 'Respondió' },
      sin_respuesta: { color: 'bg-gray-100 text-gray-800', icon: <XCircle className="w-3 h-3" />, label: 'Sin respuesta' },
      excluido: { color: 'bg-red-100 text-red-800', icon: <Ban className="w-3 h-3" />, label: 'Excluido' },
    };

    const badge = badges[estado] || badges.pendiente;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  // Formatear fecha
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header con título e icono de info */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Sistema Repulse</h1>
        <button
          onClick={() => setShowInfoModal(true)}
          className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-full transition-colors"
          title="¿Cómo funciona Repulse?"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pendientes}</p>
              <p className="text-xs text-gray-500">Pendientes</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.enviados}</p>
              <p className="text-xs text-gray-500">Enviados</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.respondieron}</p>
              <p className="text-xs text-gray-500">Respondieron</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <XCircle className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.sinRespuesta}</p>
              <p className="text-xs text-gray-500">Sin respuesta</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.excluidos}</p>
              <p className="text-xs text-gray-500">Excluidos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, teléfono o rubro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="enviado">Enviados</option>
              <option value="respondio">Respondieron</option>
              <option value="sin_respuesta">Sin respuesta</option>
              <option value="excluido">Excluidos</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 items-center">
            {/* Quota Badge - A la izquierda */}
            <Tooltip
              text={`Leads de campaña hoy: ${quota.leadsHoy} | Disponible para Repulse: ${quota.disponible} | Límite diario Meta: ${quota.limite}`}
            >
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold cursor-help border ${
                  quota.porcentajeUsado >= 80
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : quota.porcentajeUsado >= 50
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    : 'bg-green-50 text-green-700 border-green-200'
                }`}
              >
                <span>Quota: {quota.disponible}/{quota.limite}</span>
                <Info className="w-4 h-4" />
              </div>
            </Tooltip>

            {/* Botón Actualizar */}
            <button
              onClick={onRefresh}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>

            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Templates
            </button>

            {selectedLeads.size > 0 && (
              <button
                onClick={() => setShowEnvioModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Enviar Repulse ({selectedLeads.size})
              </button>
            )}
          </div>
        </div>

        {/* Selection info */}
        {selectableLeads.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedLeads.size === selectableLeads.length && selectableLeads.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <span className="text-sm text-gray-600">
                Seleccionar todos los pendientes ({selectableLeads.length})
              </span>
            </label>

            {selectedLeads.size > 0 && (
              <span className="text-sm text-primary font-medium">
                {selectedLeads.size} seleccionados
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Pagination Top */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedLeads.length)} de {sortedLeads.length} leads
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 px-3">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  {/* Checkbox header */}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rubro
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origen
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Repulses
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <div className="flex items-center gap-1">
                    Fecha Lead
                    {sortOrder === 'asc' ? (
                      <ArrowUp className="w-3 h-3 text-primary" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-primary" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-12 h-12 text-gray-300" />
                      <p>No hay leads en repulse</p>
                      <p className="text-sm">Los leads se agregan automáticamente cada día (3:00 AM) o manualmente desde /operativo</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((repulseLead, idx) => (
                  <tr
                    key={repulseLead.id}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}
                  >
                    <td className="px-4 py-3">
                      {repulseLead.estado === 'pendiente' && (
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(repulseLead.id)}
                          onChange={() => toggleSelection(repulseLead.id)}
                          className="w-4 h-4 text-primary rounded focus:ring-primary"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {repulseLead.lead?.nombre || 'Sin nombre'}
                        </p>
                        <p className="text-xs text-gray-500">{repulseLead.lead?.email || '-'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {repulseLead.lead?.telefono || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {repulseLead.lead?.rubro || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          repulseLead.origen === 'manual'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {repulseLead.origen === 'manual' ? 'Manual' : 'Automático'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getEstadoBadge(repulseLead.estado)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="font-medium">{repulseLead.conteo_repulses}</span>
                      {repulseLead.ultimo_repulse_at && (
                        <span className="text-xs text-gray-400 block">
                          Último: {formatDate(repulseLead.ultimo_repulse_at)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {repulseLead.lead?.created_at ? formatDate(repulseLead.lead.created_at) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {repulseLead.estado !== 'excluido' && (
                          <button
                            onClick={() => openExcluirConfirm(repulseLead.lead_id)}
                            title="Excluir de futuros repulses"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openRemoveConfirm(repulseLead.id)}
                          title="Eliminar de la lista"
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedLeads.length)} de {sortedLeads.length} leads
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 px-3">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showTemplateModal && (
        <RepulseTemplateModal
          templates={templates}
          proyectoId={proyectoId}
          userId={userId}
          onClose={() => setShowTemplateModal(false)}
          onRefresh={onRefresh}
        />
      )}

      {showEnvioModal && (
        <RepulseEnvioModal
          selectedLeadIds={Array.from(selectedLeads)}
          templates={templates}
          proyectoId={proyectoId}
          userId={userId}
          onClose={() => {
            setShowEnvioModal(false);
            setSelectedLeads(new Set());
          }}
          onSuccess={() => {
            setShowEnvioModal(false);
            setSelectedLeads(new Set());
            onRefresh();
          }}
        />
      )}

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={
          confirmModal.type === 'remove'
            ? 'Eliminar de Repulse'
            : 'Excluir Lead Permanentemente'
        }
        message={
          confirmModal.type === 'remove'
            ? '¿Estás seguro de eliminar este lead de la lista de repulse?\n\nEl lead podrá volver a aparecer si cumple las condiciones.'
            : '¿Excluir este lead de futuros repulses?\n\nNo recibirá más mensajes de re-engagement.'
        }
        variant={confirmModal.type === 'excluir' ? 'danger' : 'warning'}
        confirmText={confirmModal.type === 'remove' ? 'Eliminar' : 'Excluir'}
        cancelText="Cancelar"
        onConfirm={handleConfirmAction}
        onCancel={closeConfirmModal}
      />

      {/* Modal informativo - ¿Cómo funciona Repulse? */}
      {showInfoModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
            onClick={() => setShowInfoModal(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="bg-primary text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Info className="w-6 h-6" />
                  <h2 className="text-lg font-semibold">¿Cómo funciona Repulse?</h2>
                </div>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body - Scrollable */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* ¿Qué es Repulse? */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    ¿Qué es Repulse?
                  </h3>
                  <p className="text-gray-600">
                    Repulse es un sistema de <strong>re-engagement</strong> para leads que no han
                    realizado una compra. Permite enviar mensajes personalizados vía WhatsApp
                    para reactivar su interés.
                  </p>
                </div>

                {/* Criterios de detección */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    ¿Qué leads entran a Repulse?
                  </h3>
                  <ul className="text-gray-600 space-y-1 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      Leads con más de <strong>30 días</strong> en el sistema
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      Que <strong>no han comprado</strong> ningún local
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      Que <strong>no están excluidos</strong> manualmente
                    </li>
                  </ul>
                </div>

                {/* Ciclo de vida */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-primary" />
                    Ciclo de vida de estados
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex flex-col space-y-3">
                      {/* Flujo principal */}
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="w-4 h-4" /> Pendiente
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          <Send className="w-4 h-4" /> Enviado
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500 italic">(15 días después)</span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="w-4 h-4" /> Pendiente
                        </span>
                      </div>

                      {/* Estado de exclusión */}
                      <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
                        <span className="text-sm text-gray-500">Exclusión manual:</span>
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          <Ban className="w-4 h-4" /> Excluido
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detección automática vs manual */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Detección automática
                  </h3>
                  <p className="text-gray-600 mb-2">
                    <strong>Todos los días a las 3:00 AM</strong> (hora Perú), el sistema automáticamente:
                  </p>
                  <ul className="text-gray-600 space-y-1 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">1.</span>
                      Detecta <strong>nuevos leads</strong> que cumplen los criterios (30+ días sin compra)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">2.</span>
                      <strong>Reactiva</strong> leads en estado &quot;Enviado&quot; que tienen 15+ días desde el último envío
                    </li>
                  </ul>
                </div>

                {/* Envío manual */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-md font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    Importante: El envío es siempre MANUAL
                  </h3>
                  <p className="text-blue-800 text-sm">
                    El sistema solo detecta y reactiva leads automáticamente.
                    El <strong>envío de mensajes WhatsApp</strong> siempre lo realiza un usuario
                    manualmente seleccionando los leads y eligiendo un template o mensaje personalizado.
                  </p>
                </div>

                {/* Exclusión */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Ban className="w-5 h-5 text-red-500" />
                    Exclusión permanente
                  </h3>
                  <p className="text-gray-600">
                    Si un lead no debe recibir más mensajes de repulse (pidió no ser contactado,
                    información incorrecta, etc.), puedes <strong>excluirlo permanentemente</strong>.
                    El lead no volverá a aparecer en la lista de repulse.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end">
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
