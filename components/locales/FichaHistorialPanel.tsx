'use client';

/**
 * FichaHistorialPanel - Panel de historial de cambios de una ficha de inscripción
 * Solo visible para superadmin y admin
 * Adaptado de LeadHistorialPanel para fichas de locales
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
import { getFichaHistorial, type FichaHistorialEntry } from '@/lib/actions-fichas-historial';
import { getCampoLabel, getOrigenLabel, formatValor, getAccionStyle } from '@/lib/fichas-historial-helpers';

interface FichaHistorialPanelProps {
  fichaId: string;
  localCodigo: string;  // Para mostrar en el header
  localPiso?: string | null;  // Piso del local
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

// Obtener descripción de la acción
function getAccionDescripcion(entry: FichaHistorialEntry): string {
  if (entry.accion === 'INSERT') {
    return 'Ficha creada';
  }
  if (entry.accion === 'DELETE') {
    return 'Ficha eliminada';
  }
  if (entry.accion === 'CAMBIO_TITULAR') {
    return 'Cambio de Titularidad';
  }
  if (entry.accion === 'CAMBIO_LOCAL') {
    return 'Cambio de Local/Puesto';
  }
  return getCampoLabel(entry.campo);
}

// Helper para formatear nombre completo desde snapshot
function formatNombreFromSnapshot(titular: Record<string, any> | null): string {
  if (!titular) return '(vacío)';
  const partes = [
    titular.nombres,
    titular.apellido_paterno,
    titular.apellido_materno,
  ].filter(Boolean);
  return partes.join(' ') || '(vacío)';
}

// Renderizar detalles de cambio de titular
function renderCambioTitular(entry: FichaHistorialEntry) {
  if (!entry.titular_anterior || !entry.titular_nuevo) {
    return (
      <div className="text-sm text-gray-600">
        Sin información de titulares
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Título */}
      <h4 className="font-semibold text-gray-700 text-sm">Comparación de Titulares</h4>

      {/* Tabla comparativa */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Titular Anterior */}
        <div className="space-y-2 p-3 bg-red-50 rounded-lg border border-red-100">
          <p className="font-semibold text-red-700 text-xs uppercase">Anterior</p>
          <div className="space-y-1.5">
            <div>
              <span className="text-gray-500 text-xs">Nombre:</span>
              <p className="text-gray-700 font-medium break-words">
                {formatNombreFromSnapshot(entry.titular_anterior)}
              </p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Documento:</span>
              <p className="text-gray-700 font-medium">
                {entry.titular_anterior.tipo_documento?.toUpperCase() || 'DNI'}: {entry.titular_anterior.numero_documento || '(vacío)'}
              </p>
            </div>
            {entry.titular_anterior.celular && (
              <div>
                <span className="text-gray-500 text-xs">Tel:</span>
                <p className="text-gray-700">{entry.titular_anterior.celular}</p>
              </div>
            )}
            {entry.titular_anterior.email && (
              <div>
                <span className="text-gray-500 text-xs">Email:</span>
                <p className="text-gray-700 break-words text-xs">{entry.titular_anterior.email}</p>
              </div>
            )}
          </div>
        </div>

        {/* Titular Nuevo */}
        <div className="space-y-2 p-3 bg-green-50 rounded-lg border border-green-100">
          <p className="font-semibold text-green-700 text-xs uppercase">Nuevo</p>
          <div className="space-y-1.5">
            <div>
              <span className="text-gray-500 text-xs">Nombre:</span>
              <p className="text-gray-700 font-medium break-words">
                {formatNombreFromSnapshot(entry.titular_nuevo)}
              </p>
            </div>
            <div>
              <span className="text-gray-500 text-xs">Documento:</span>
              <p className="text-gray-700 font-medium">
                {entry.titular_nuevo.tipo_documento?.toUpperCase() || 'DNI'}: {entry.titular_nuevo.numero_documento || '(vacío)'}
              </p>
            </div>
            {entry.titular_nuevo.celular && (
              <div>
                <span className="text-gray-500 text-xs">Tel:</span>
                <p className="text-gray-700">{entry.titular_nuevo.celular}</p>
              </div>
            )}
            {entry.titular_nuevo.email && (
              <div>
                <span className="text-gray-500 text-xs">Email:</span>
                <p className="text-gray-700 break-words text-xs">{entry.titular_nuevo.email}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Motivo del cambio */}
      {entry.motivo_cambio && (
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <span className="text-gray-500 text-xs">Motivo del cambio:</span>
          <p className="text-gray-700 mt-1">{entry.motivo_cambio}</p>
        </div>
      )}
    </div>
  );
}

// Renderizar detalles de cambio de local
function renderCambioLocal(entry: FichaHistorialEntry) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-3 py-2">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Local Anterior</p>
          <p className="text-lg font-bold text-red-600">{entry.local_anterior_codigo || '(sin código)'}</p>
        </div>
        <ArrowRight className="w-6 h-6 text-gray-400" />
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Local Nuevo</p>
          <p className="text-lg font-bold text-green-600">{entry.local_nuevo_codigo || '(sin código)'}</p>
        </div>
      </div>

      {/* Motivo del cambio */}
      {entry.motivo_cambio && (
        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <span className="text-gray-500 text-xs">Motivo del cambio:</span>
          <p className="text-gray-700 mt-1">{entry.motivo_cambio}</p>
        </div>
      )}

      {/* Usuario que autorizó */}
      {entry.autorizado_por_nombre && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <span className="text-gray-500 text-xs">Autorizado por:</span>
          <p className="text-gray-700 mt-1">{entry.autorizado_por_nombre}</p>
        </div>
      )}
    </div>
  );
}

export default function FichaHistorialPanel({
  fichaId,
  localCodigo,
  localPiso,
  isOpen,
  onClose,
}: FichaHistorialPanelProps) {
  const [historial, setHistorial] = useState<FichaHistorialEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Cargar historial
  const loadHistorial = async () => {
    setLoading(true);
    setError(null);

    const result = await getFichaHistorial(fichaId);

    if (result.success) {
      setHistorial(result.data);
    } else {
      setError(result.error || 'Error al cargar historial');
    }

    setLoading(false);
  };

  // Cargar al abrir
  useEffect(() => {
    if (isOpen && fichaId) {
      loadHistorial();
    }
  }, [isOpen, fichaId]);

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
                <p className="text-sm text-white/80 truncate max-w-[250px]">
                  Local {localCodigo}{localPiso && ` ${localPiso}`}
                </p>
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
              <p className="text-sm">No hay cambios registrados para esta ficha</p>
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
                    const canExpand =
                      entry.accion === 'UPDATE' ||
                      entry.accion === 'CAMBIO_TITULAR' ||
                      entry.accion === 'CAMBIO_LOCAL';

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
                            className={`bg-white border ${style.border} rounded-lg overflow-hidden transition-shadow hover:shadow-md ${canExpand ? 'cursor-pointer' : ''}`}
                            onClick={() => canExpand && toggleExpand(entry.id)}
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

                                  {/* Resumen para CAMBIO_LOCAL */}
                                  {entry.accion === 'CAMBIO_LOCAL' && (
                                    <div className="mt-1 flex items-center gap-2 text-sm">
                                      <span className="text-red-600 font-medium">
                                        {entry.local_anterior_codigo}
                                      </span>
                                      <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                                      <span className="text-green-600 font-medium">
                                        {entry.local_nuevo_codigo}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Expand icon */}
                                {canExpand && (
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
                            {isExpanded && (
                              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                                {/* CAMBIO_TITULAR */}
                                {entry.accion === 'CAMBIO_TITULAR' && renderCambioTitular(entry)}

                                {/* CAMBIO_LOCAL */}
                                {entry.accion === 'CAMBIO_LOCAL' && renderCambioLocal(entry)}

                                {/* UPDATE normal */}
                                {entry.accion === 'UPDATE' && (
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
                                )}
                              </div>
                            )}

                            {/* INSERT metadata */}
                            {entry.accion === 'INSERT' && entry.metadata && (
                              <div className="px-4 py-3 bg-green-50/50 border-t border-green-100">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {entry.metadata.titular_nombre && (
                                    <div>
                                      <span className="text-gray-500">Titular:</span>
                                      <span className="ml-1 text-gray-700">{entry.metadata.titular_nombre}</span>
                                    </div>
                                  )}
                                  {entry.metadata.local_codigo && (
                                    <div>
                                      <span className="text-gray-500">Local:</span>
                                      <span className="ml-1 text-gray-700">{entry.metadata.local_codigo}</span>
                                    </div>
                                  )}
                                  {entry.metadata.proyecto && (
                                    <div>
                                      <span className="text-gray-500">Proyecto:</span>
                                      <span className="ml-1 text-gray-700">{entry.metadata.proyecto}</span>
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
