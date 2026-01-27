'use client';

/**
 * CambiarLocalModal - Modal para cambiar el local/puesto asignado a una ficha
 * Libera el local anterior y ocupa el nuevo
 */

import { useState, useEffect } from 'react';
import { X, Store, AlertTriangle, Loader2, Search, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { cambiarLocalFicha, getLocalesDisponiblesByProyecto, type LocalDisponible } from '@/lib/actions-fichas-historial';

interface CambiarLocalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fichaId: string;
  localActualId: string;
  localActualCodigo: string;
  localActualPiso?: string | null;
  proyectoId: string;
}

export default function CambiarLocalModal({
  isOpen,
  onClose,
  onSuccess,
  fichaId,
  localActualId,
  localActualCodigo,
  localActualPiso,
  proyectoId,
}: CambiarLocalModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localesDisponibles, setLocalesDisponibles] = useState<LocalDisponible[]>([]);
  const [filteredLocales, setFilteredLocales] = useState<LocalDisponible[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  // Cargar locales disponibles
  useEffect(() => {
    if (isOpen && proyectoId) {
      loadLocales();
    }
  }, [isOpen, proyectoId]);

  // Filtrar locales por búsqueda
  useEffect(() => {
    if (searchTerm.trim()) {
      const filtered = localesDisponibles.filter((local) =>
        local.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredLocales(filtered);
    } else {
      setFilteredLocales(localesDisponibles);
    }
  }, [searchTerm, localesDisponibles]);

  const loadLocales = async () => {
    setLoading(true);
    try {
      const result = await getLocalesDisponiblesByProyecto(proyectoId, localActualId);
      if (result.success) {
        setLocalesDisponibles(result.data);
        setFilteredLocales(result.data);
      } else {
        toast.error(result.error || 'Error al cargar locales');
      }
    } catch (error) {
      toast.error('Error al cargar locales disponibles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedLocalId) {
      toast.error('Seleccione un local');
      return;
    }

    if (motivo.trim().length < 10) {
      toast.error('El motivo debe tener al menos 10 caracteres');
      return;
    }

    setSaving(true);

    try {
      const result = await cambiarLocalFicha({
        fichaId,
        nuevoLocalId: selectedLocalId,
        motivo: motivo.trim(),
      });

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error al cambiar local');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedLocalId(null);
    setMotivo('');
    setSearchTerm('');
    onClose();
  };

  const selectedLocal = localesDisponibles.find((l) => l.id === selectedLocalId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Cambiar Local/Puesto</h2>
                <p className="text-sm text-white/80">Reasignar ficha a otro local</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {/* Local Actual */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-orange-700">Local Actual</span>
                  <p className="text-lg font-bold text-orange-900">
                    {localActualCodigo}
                    {localActualPiso && <span className="text-blue-600 ml-2">{localActualPiso}</span>}
                  </p>
                </div>
                <span className="px-2 py-1 text-xs bg-orange-200 text-orange-800 rounded-full">
                  Actual
                </span>
              </div>
            </div>

            {/* Visualización del cambio */}
            {selectedLocal && (
              <div className="flex items-center justify-center gap-4 py-2">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-orange-100 flex flex-col items-center justify-center mx-auto mb-1">
                    <span className="text-sm font-bold text-orange-700">{localActualCodigo}</span>
                    {localActualPiso && <span className="text-xs text-blue-600">{localActualPiso}</span>}
                  </div>
                  <span className="text-xs text-gray-500">Anterior</span>
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex flex-col items-center justify-center mx-auto mb-1">
                    <span className="text-sm font-bold text-green-700">{selectedLocal.codigo}</span>
                    {selectedLocal.piso && <span className="text-xs text-blue-600">{selectedLocal.piso}</span>}
                  </div>
                  <span className="text-xs text-gray-500">Nuevo</span>
                </div>
              </div>
            )}

            {/* Selector de Nuevo Local */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Nuevo Local
              </label>

              {/* Búsqueda */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por código..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Grid de locales */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  <span className="ml-2 text-gray-500">Cargando locales...</span>
                </div>
              ) : filteredLocales.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Store className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>No hay locales disponibles</p>
                  {searchTerm && (
                    <p className="text-sm">Intente con otro término de búsqueda</p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-[240px] overflow-y-auto p-1">
                  {filteredLocales.map((local) => (
                    <button
                      key={local.id}
                      type="button"
                      onClick={() => setSelectedLocalId(local.id)}
                      className={`p-3 border rounded-lg text-left transition-all ${
                        selectedLocalId === local.id
                          ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                      }`}
                    >
                      <div className="font-bold text-sm text-gray-900">
                        {local.codigo}
                        {local.piso && <span className="text-blue-600 ml-1">{local.piso}</span>}
                      </div>
                      {local.metraje && (
                        <div className="text-xs text-gray-500">{local.metraje} m²</div>
                      )}
                      {local.precio_base && (
                        <div className="text-xs text-green-600 font-medium">
                          ${local.precio_base.toLocaleString()}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-2 text-xs text-gray-500">
                {filteredLocales.length} locales disponibles
              </p>
            </div>

            {/* Motivo del Cambio */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <label className="text-sm font-semibold text-yellow-800">
                  Motivo del Cambio <span className="text-red-500">*</span>
                </label>
              </div>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white"
                placeholder="Explique el motivo del cambio de local (mínimo 10 caracteres)"
                required
                minLength={10}
              />
              <p className="mt-1 text-xs text-yellow-700">
                Obligatorio para auditoría. El local anterior será liberado automáticamente.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t px-6 py-4 rounded-b-xl flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedLocalId || motivo.trim().length < 10 || saving}
              className="px-4 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cambiando...
                </>
              ) : (
                <>
                  <Store className="w-4 h-4" />
                  Cambiar Local
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
