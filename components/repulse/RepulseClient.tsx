// ============================================================================
// COMPONENT: RepulseClient
// ============================================================================
// Descripción: Componente principal para gestión de repulse
// Features: Tabla de leads, selección múltiple, templates, envío a n8n
// ============================================================================

'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import {
  type RepulseLead,
  type RepulseTemplate,
  removeLeadFromRepulse,
  excluirLeadDeRepulse,
  prepararEnvioRepulseBatch,
} from '@/lib/actions-repulse';
import RepulseTemplateModal from './RepulseTemplateModal';
import RepulseEnvioModal from './RepulseEnvioModal';

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
  proyectoId: string;
  userId: string;
  onRefresh: () => void;
}

export default function RepulseClient({
  initialLeads,
  initialTemplates,
  initialStats,
  proyectoId,
  userId,
  onRefresh,
}: RepulseClientProps) {
  const [leads, setLeads] = useState(initialLeads);
  const [templates, setTemplates] = useState(initialTemplates);
  const [stats, setStats] = useState(initialStats);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<string>('todos');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEnvioModal, setShowEnvioModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  // Leads seleccionables (solo pendientes)
  const selectableLeads = filteredLeads.filter((l) => l.estado === 'pendiente');

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

  // Eliminar lead de repulse
  const handleRemoveLead = async (repulseLeadId: string) => {
    if (!confirm('¿Eliminar este lead de la lista de repulse?')) return;

    setIsLoading(true);
    const result = await removeLeadFromRepulse(repulseLeadId);
    setIsLoading(false);

    if (result.success) {
      onRefresh();
    } else {
      alert(result.error || 'Error al eliminar');
    }
  };

  // Excluir lead permanentemente
  const handleExcluirLead = async (leadId: string) => {
    if (!confirm('¿Excluir este lead de futuros repulses? No recibirá más mensajes.')) return;

    setIsLoading(true);
    const result = await excluirLeadDeRepulse(leadId);
    setIsLoading(false);

    if (result.success) {
      onRefresh();
    } else {
      alert(result.error || 'Error al excluir');
    }
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
          <div className="flex gap-2">
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Lead
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-12 h-12 text-gray-300" />
                      <p>No hay leads en repulse</p>
                      <p className="text-sm">Los leads se agregan automáticamente cada 10 días o manualmente desde /operativo</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((repulseLead, idx) => (
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
                            onClick={() => handleExcluirLead(repulseLead.lead_id)}
                            title="Excluir de futuros repulses"
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveLead(repulseLead.id)}
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
    </div>
  );
}
