'use client';

import { useState, useMemo } from 'react';
import { Lead, Vendedor } from '@/lib/db';
import { formatVisitTimestamp, getVisitStatus, getVisitStatusClasses, getVisitStatusLabel } from '@/lib/formatters';
import { Search, ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon, Calendar, UserCheck, Mail, Check } from 'lucide-react';

interface LeadsTableProps {
  leads: Lead[];
  totalLeads?: number;
  onLeadClick?: (lead: Lead) => void;
  vendedores?: Vendedor[];
  currentVendedorId?: string | null;
  onAssignLead?: (leadId: string, vendedorId: string) => Promise<void>;
  userRole?: 'admin' | 'vendedor' | 'jefe_ventas' | 'vendedor_caseta' | null;
}

export default function LeadsTable({
  leads,
  totalLeads,
  onLeadClick,
  vendedores,
  currentVendedorId,
  onAssignLead,
  userRole,
}: LeadsTableProps) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredLeads = useMemo(
    () =>
      leads.filter(
        (lead) =>
          (lead.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
          lead.telefono.includes(search) ||
          (lead.rubro || '').toLowerCase().includes(search.toLowerCase())
      ),
    [leads, search]
  );

  // Calculate pagination values
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [search]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show: 1, ..., current-1, current, current+1, ..., last
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const getEstadoBadge = (estado: Lead['estado']) => {
    const styles: Record<string, string> = {
      lead_completo: 'bg-primary text-white',
      lead_incompleto: 'bg-accent text-secondary',
      en_conversacion: 'bg-secondary text-white',
      conversacion_abandonada: 'bg-gray-300 text-gray-700',
      lead_manual: 'bg-purple-600 text-white',
    };

    const labels: Record<string, string> = {
      lead_completo: 'Completo',
      lead_incompleto: 'Incompleto',
      en_conversacion: 'En Conversación',
      conversacion_abandonada: 'Abandonado',
      lead_manual: 'Lead Manual',
    };

    const estadoKey = estado || 'conversacion_abandonada';

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${styles[estadoKey] || styles.conversacion_abandonada}`}>
        {labels[estadoKey] || 'Desconocido'}
      </span>
    );
  };

  const displayStart = startIndex + 1;
  const displayEnd = Math.min(endIndex, filteredLeads.length);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Leads Recientes</h3>
          <p className="text-sm text-gray-500 mt-1">
            Mostrando {displayStart}-{displayEnd} de {filteredLeads.length} leads
            {filteredLeads.length !== (totalLeads || leads.length) && (
              <span className="ml-1 text-primary font-medium">
                (filtrado de {totalLeads || leads.length} totales)
              </span>
            )}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-primary">
            <tr className="border-b border-primary">
              <th className="text-left py-3 px-4 text-white font-medium">Nombre</th>
              <th className="text-left py-3 px-4 text-white font-medium">Teléfono</th>
              <th className="text-left py-3 px-4 text-white font-medium">Rubro</th>
              <th className="text-left py-3 px-4 text-white font-medium">UTM</th>
              <th className="text-left py-3 px-4 text-white font-medium">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Horario de Visita
                </div>
              </th>
              <th className="text-left py-3 px-4 text-white font-medium">
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  Email
                </div>
              </th>
              <th className="text-left py-3 px-4 text-white font-medium">Asistió</th>
              <th className="text-left py-3 px-4 text-white font-medium">Estado</th>
              <th className="text-left py-3 px-4 text-white font-medium">
                <div className="flex items-center gap-1">
                  <UserCheck className="w-4 h-4" />
                  Vendedor Asignado
                </div>
              </th>
              <th className="text-left py-3 px-4 text-white font-medium">Fecha</th>
              {onLeadClick && <th className="w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {paginatedLeads.map((lead, index) => (
              <tr
                key={lead.id}
                onClick={() => onLeadClick?.(lead)}
                className={`border-b border-gray-100 transition-colors ${
                  index % 2 === 0 ? 'bg-white' : 'bg-[#f4f4f4]'
                } ${
                  onLeadClick ? 'hover:bg-gray-50 cursor-pointer' : ''
                }`}
              >
                <td className="py-3 px-4 text-gray-800">{lead.nombre || '-'}</td>
                <td className="py-3 px-4 text-gray-600">{lead.telefono}</td>
                <td className="py-3 px-4 text-gray-600">{lead.rubro || '-'}</td>
                <td className="py-3 px-4 text-gray-600">{lead.utm || 'victoria'}</td>
                <td className="py-3 px-4">
                  {lead.horario_visita_timestamp ? (
                    <div className="space-y-1">
                      {/* Formatted timestamp (bold, prominent) */}
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">
                          {formatVisitTimestamp(lead.horario_visita_timestamp)}
                        </p>
                        {/* Status badge (optional) */}
                        {getVisitStatus(lead.horario_visita_timestamp) && (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${getVisitStatusClasses(
                              getVisitStatus(lead.horario_visita_timestamp)
                            )}`}
                          >
                            {getVisitStatusLabel(getVisitStatus(lead.horario_visita_timestamp))}
                          </span>
                        )}
                      </div>
                      {/* Original text (small, gray, italic) */}
                      {lead.horario_visita && (
                        <p className="text-xs text-gray-500 italic">
                          Usuario dijo: &quot;{lead.horario_visita}&quot;
                        </p>
                      )}
                    </div>
                  ) : (
                    // Backwards compatibility: show original text only
                    <span className="text-gray-600">{lead.horario_visita || '-'}</span>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-600">{lead.email || 'N/A'}</td>
                <td className="py-3 px-4">
                  {lead.asistio ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      <Check className="w-3 h-3" />
                      Sí
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                      No
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">{getEstadoBadge(lead.estado)}</td>
                <td className="py-3 px-4">
                  {userRole === 'admin' && vendedores && onAssignLead ? (
                    // ADMIN: Always show dropdown (can reassign or liberate)
                    <select
                      value={lead.vendedor_asignado_id || ''}
                      onChange={(e) => {
                        if (e.target.value !== lead.vendedor_asignado_id) {
                          onAssignLead(lead.id, e.target.value);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()} // Prevent row click when clicking dropdown
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      <option value="">-- Sin Asignar --</option>
                      {vendedores
                        .filter((v) => v.activo)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nombre}
                          </option>
                        ))}
                    </select>
                  ) : lead.vendedor_asignado_id ? (
                    // VENDEDOR: Already assigned - READ ONLY
                    <span className="text-gray-700 font-medium">
                      {lead.vendedor_nombre || 'Vendedor asignado'}
                    </span>
                  ) : vendedores && onAssignLead && currentVendedorId ? (
                    // VENDEDOR: Available - DROPDOWN (only shows themselves)
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          onAssignLead(lead.id, e.target.value);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()} // Prevent row click when clicking dropdown
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    >
                      <option value="">-- Tomar Lead --</option>
                      {vendedores
                        .filter((v) => v.activo && v.id === currentVendedorId)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nombre}
                          </option>
                        ))}
                    </select>
                  ) : (
                    // No vendedores or onAssignLead provided - fallback
                    <span className="text-gray-400">Disponible</span>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-600">
                  {new Date(lead.created_at).toLocaleDateString('es-PE')}
                </td>
                {onLeadClick && (
                  <td className="py-3 px-4">
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            >
              <ChevronLeft size={18} />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, index) =>
                typeof page === 'number' ? (
                  <button
                    key={index}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 rounded-lg border transition-colors ${
                      currentPage === page
                        ? 'bg-primary text-white border-primary font-semibold'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ) : (
                  <span key={index} className="px-2 text-gray-500">
                    {page}
                  </span>
                )
              )}
            </div>

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}