'use client';

/**
 * LeadHistorialPanel - Panel de historial de cambios de un lead
 * Solo visible para superadmin y admin
 * Sesión 107 - Sistema de Auditoría de Leads
 */

import { useState, useEffect } from 'react';
import {
  History,
  ChevronDown,
  ChevronUp,
  User,
  ArrowRight,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { getLeadHistorial, type LeadHistorialEntry } from '@/lib/actions-leads-historial';
import { getCampoLabel, getOrigenLabel, formatValor } from '@/lib/leads-historial-helpers';

interface LeadHistorialPanelProps {
  leadId: string;
  leadNombre: string;
  isOpen: boolean;
  onClose: () => void;
}

// Formatear fecha relativa
function formatFechaRelativa(fecha: string): string {
  const now = new Date();
  const date = new Date(fecha);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Hace un momento';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays} días`;

  // Fecha completa
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Formatear fecha completa
function formatFechaCompleta(fecha: string): string {
  const date = new Date(fecha);
  return date.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Obtener estilo según acción
function getAccionStyle(accion: string): { icon: string; color: string; bg: string; border: string } {
  switch (accion) {
    case 'INSERT':
      return { icon: '✨', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' };
    case 'UPDATE':
      return { icon: '✏️', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' };
    case 'DELETE':
      return { icon: '🗑️', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' };
    default:
      return { icon: '📝', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' };
  }
}

// Obtener descripción de la acción
function getAccionDescripcion(entry: LeadHistorialEntry): string {
  if (entry.accion === 'INSERT') {
    return 'Lead creado';
  }
  if (entry.accion === 'DELETE') {
    return 'Lead eliminado';
  }
  return getCampoLabel(entry.campo);
}

export default function LeadHistorialPanel({
  leadId,
  leadNombre,
  isOpen,
  onClose,
}: LeadHistorialPanelProps) {
  const [historial, setHistorial] = useState<LeadHistorialEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Cargar historial
  const loadHistorial = async () => {
    setLoading(true);
    setError(null);

    const result = await getLeadHistorial(leadId);

    if (result.success) {
      setHistorial(result.data);
    } else {
      setError(result.error || 'Error al cargar historial');
    }

    setLoading(false);
  };

  // Cargar al abrir
  useEffect(() => {
    if (isOpen && leadId) {
      loadHistorial();
    }
  }, [isOpen, leadId]);

  // Toggle expand
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#192c4d] to-[#1b967a] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Historial de Cambios</h2>
                <p className="text-sm text-white/80 truncate max-w-[250px]">{leadNombre}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadHistorial}
                disabled={loading}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Actualizar"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-80px)] overflow-y-auto">
          {/* Loading */}
          {loading && historial.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p>Cargando historial...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error al cargar</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && historial.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <History className="w-12 h-12 text-gray-300 mb-3" />
              <p className="font-medium">Sin historial</p>
              <p className="text-sm">No hay cambios registrados para este lead</p>
            </div>
          )}

          {/* Timeline */}
          {historial.length > 0 && (
            <div className="p-4">
              <div className="relative">
                {/* Línea del timeline */}
                <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-gray-200" />

                {/* Entries */}
                <div className="space-y-4">
                  {historial.map((entry, index) => {
                    const style = getAccionStyle(entry.accion);
                    const isExpanded = expandedIds.has(entry.id);
                    const isFirst = index === 0;

                    return (
                      <div
                        key={entry.id}
                        className={`relative flex gap-4 ${isFirst ? 'animate-in fade-in-0 slide-in-from-top-2 duration-300' : ''}`}
                      >
                        {/* Dot */}
                        <div className={`relative z-10 w-10 h-10 rounded-full ${style.bg} border-2 ${style.border} flex items-center justify-center shrink-0`}>
                          <span className="text-lg">{style.icon}</span>
                        </div>

                        {/* Card */}
                        <div className="flex-1 min-w-0">
                          <div
                            className={`bg-white border ${style.border} rounded-lg overflow-hidden transition-shadow hover:shadow-md cursor-pointer`}
                            onClick={() => entry.accion === 'UPDATE' && toggleExpand(entry.id)}
                          >
                            {/* Header */}
                            <div className="px-4 py-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold ${style.color}`}>
                                    {getAccionDescripcion(entry)}
                                  </p>

                                  {/* Valor para UPDATE */}
                                  {entry.accion === 'UPDATE' && (
                                    <div className="mt-1 flex items-center gap-2 text-sm">
                                      <span className="text-gray-500 line-through truncate max-w-[120px]" title={entry.valor_anterior || '(vacío)'}>
                                        {formatValor(entry.campo, entry.valor_anterior)}
                                      </span>
                                      <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                                      <span className="text-gray-900 font-medium truncate max-w-[120px]" title={entry.valor_nuevo || '(vacío)'}>
                                        {formatValor(entry.campo, entry.valor_nuevo)}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Expand icon */}
                                {entry.accion === 'UPDATE' && (
                                  <button className="p-1 text-gray-400 hover:text-gray-600">
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* Meta info */}
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                                <span className="flex items-center gap-1" title={formatFechaCompleta(entry.created_at)}>
                                  <Clock className="w-3 h-3" />
                                  {formatFechaRelativa(entry.created_at)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {entry.usuario_nombre || 'Sistema'}
                                </span>
                                <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                                  {getOrigenLabel(entry.origen)}
                                </span>
                              </div>
                            </div>

                            {/* Expanded details */}
                            {isExpanded && entry.accion === 'UPDATE' && (
                              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                                <div className="space-y-2 text-sm">
                                  <div className="flex gap-2">
                                    <span className="text-gray-500 w-20 shrink-0">Antes:</span>
                                    <span className="text-gray-700 break-all">
                                      {entry.valor_anterior || '(vacío)'}
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="text-gray-500 w-20 shrink-0">Después:</span>
                                    <span className="text-gray-900 font-medium break-all">
                                      {entry.valor_nuevo || '(vacío)'}
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="text-gray-500 w-20 shrink-0">Fecha:</span>
                                    <span className="text-gray-700">
                                      {formatFechaCompleta(entry.created_at)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* INSERT metadata */}
                            {entry.accion === 'INSERT' && entry.metadata && (
                              <div className="px-4 py-3 bg-green-50/50 border-t border-green-100">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {entry.metadata.nombre && (
                                    <div>
                                      <span className="text-gray-500">Nombre:</span>
                                      <span className="ml-1 text-gray-700">{entry.metadata.nombre}</span>
                                    </div>
                                  )}
                                  {entry.metadata.telefono && (
                                    <div>
                                      <span className="text-gray-500">Tel:</span>
                                      <span className="ml-1 text-gray-700">{entry.metadata.telefono}</span>
                                    </div>
                                  )}
                                  {entry.metadata.utm && (
                                    <div>
                                      <span className="text-gray-500">Origen:</span>
                                      <span className="ml-1 text-gray-700">{entry.metadata.utm}</span>
                                    </div>
                                  )}
                                  {entry.metadata.estado && (
                                    <div>
                                      <span className="text-gray-500">Estado:</span>
                                      <span className="ml-1 text-gray-700">{formatValor('estado', entry.metadata.estado)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 text-center text-sm text-gray-400">
                Mostrando últimos {historial.length} cambios
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
