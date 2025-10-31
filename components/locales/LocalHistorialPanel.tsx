// ============================================================================
// COMPONENT: LocalHistorialPanel
// ============================================================================
// Descripción: Panel lateral para mostrar historial de cambios de un local
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { getLocalHistorial } from '@/lib/locales';
import type { Local, LocalHistorial } from '@/lib/locales';
import { X, History, Clock } from 'lucide-react';

interface LocalHistorialPanelProps {
  local: Local;
  isOpen: boolean;
  onClose: () => void;
}

export default function LocalHistorialPanel({
  local,
  isOpen,
  onClose,
}: LocalHistorialPanelProps) {
  const [historial, setHistorial] = useState<LocalHistorial[]>([]);
  const [loading, setLoading] = useState(true);

  // ====== FETCH HISTORIAL ======
  useEffect(() => {
    if (isOpen && local) {
      setLoading(true);
      getLocalHistorial(local.id).then((data) => {
        setHistorial(data);
        setLoading(false);
      });
    }
  }, [isOpen, local]);

  // ====== ESC KEY TO CLOSE ======
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // ====== BODY SCROLL LOCK ======
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // ====== HELPER: Formato Fecha ======
  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima',
    });
  };

  // ====== HELPER: Color Badge Estado ======
  const getEstadoBadge = (estado: string) => {
    const badges = {
      verde: 'bg-green-100 text-green-800 border-green-300',
      amarillo: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      naranja: 'bg-orange-100 text-orange-800 border-orange-300',
      rojo: 'bg-red-100 text-red-800 border-red-300',
    };
    return badges[estado as keyof typeof badges] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (!isOpen) return null;

  // ====== RENDER ======

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[500px] lg:w-[600px] bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="sticky top-0 bg-secondary text-white p-6 shadow-md z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History className="w-6 h-6" />
                Historial del Local
              </h2>
              <p className="text-sm text-white/80 mt-1 font-mono">{local.codigo}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              aria-label="Cerrar panel"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Info del Local */}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-white/70">Proyecto</p>
              <p className="font-semibold">{local.proyecto_nombre || 'N/A'}</p>
            </div>
            <div>
              <p className="text-white/70">Metraje</p>
              <p className="font-semibold">{local.metraje} m²</p>
            </div>
            <div>
              <p className="text-white/70">Estado Actual</p>
              <p className="font-semibold capitalize">{local.estado}</p>
            </div>
            <div>
              <p className="text-white/70">Bloqueado</p>
              <p className="font-semibold">{local.bloqueado ? 'Sí' : 'No'}</p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="px-6 pb-6 pt-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              Cargando historial...
            </div>
          ) : historial.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No hay historial de cambios para este local</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historial.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  {/* Timestamp */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatFecha(item.created_at)}</span>
                  </div>

                  {/* Usuario */}
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    {item.usuario_nombre || 'Usuario desconocido'}
                  </p>

                  {/* Cambio de Estado */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded border ${getEstadoBadge(
                        item.estado_anterior
                      )}`}
                    >
                      {item.estado_anterior}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded border ${getEstadoBadge(
                        item.estado_nuevo
                      )}`}
                    >
                      {item.estado_nuevo}
                    </span>
                  </div>

                  {/* Acción */}
                  {item.accion && (
                    <p className="text-sm text-gray-600 italic">{item.accion}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 p-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}
