'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getAllProyectos, Proyecto } from '@/lib/db';
import { FolderOpen, ChevronDown, X, CheckCircle2, BarChart3, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ============================================================================
// MAIN COMPONENT: ProyectoSelector (Button + Modal + Confirm en uno)
// ============================================================================

export default function ProyectoSelector() {
  const { selectedProyecto, user, changeProyecto } = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loadingProyectos, setLoadingProyectos] = useState(false);
  const [selectedForChange, setSelectedForChange] = useState<Proyecto | null>(null);
  const [changingProyecto, setChangingProyecto] = useState(false);
  const [error, setError] = useState('');

  // Fetch proyectos al abrir modal
  useEffect(() => {
    if (isModalOpen) {
      setLoadingProyectos(true);
      getAllProyectos()
        .then((data) => {
          // Filtrar solo proyectos activos
          setProyectos(data.filter(p => p.activo));
        })
        .catch((err) => {
          console.error('Error fetching proyectos:', err);
        })
        .finally(() => {
          setLoadingProyectos(false);
        });
    }
  }, [isModalOpen]);

  // Manejar selección de proyecto
  const handleSelectProyecto = (proyecto: Proyecto) => {
    if (proyecto.id === selectedProyecto?.id) {
      setIsModalOpen(false); // Si es el actual, solo cerrar
      return;
    }
    setSelectedForChange(proyecto); // Abrir confirmación
  };

  // Confirmar cambio de proyecto
  const handleConfirmChange = async () => {
    if (!selectedForChange) return;

    setChangingProyecto(true);
    setError('');

    const result = await changeProyecto(selectedForChange.id);

    if (result.success) {
      setSelectedForChange(null);
      setIsModalOpen(false);
    } else {
      setError(result.error || 'Error al cambiar proyecto');
    }

    setChangingProyecto(false);
  };

  // Cancelar confirmación
  const handleCancelConfirm = () => {
    setSelectedForChange(null);
    setError('');
  };

  // Ir a Reportería
  const handleGoToReporteria = () => {
    setIsModalOpen(false);
    router.push('/reporteria');
  };

  // Roles que pueden ver Reportería
  const canSeeReporteria = user?.rol === 'admin' || user?.rol === 'jefe_ventas' || user?.rol === 'marketing' || user?.rol === 'gerencia';

  return (
    <>
      {/* ================================================================== */}
      {/* BOTÓN SELECTOR */}
      {/* ================================================================== */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-white/10 hover:bg-white/20 transition-colors
          text-white text-sm
          border border-white/20
        "
        title={`Proyecto actual: ${selectedProyecto?.nombre || 'Sin proyecto'}`}
      >
        <FolderOpen className="w-4 h-4 flex-shrink-0" />
        <span className="hidden sm:inline font-medium truncate max-w-[150px]">
          {selectedProyecto?.nombre || 'Sin proyecto'}
        </span>
        <ChevronDown className="w-4 h-4 flex-shrink-0" />
      </button>

      {/* ================================================================== */}
      {/* MODAL DE SELECCIÓN */}
      {/* ================================================================== */}
      {isModalOpen && !selectedForChange && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal */}
          <div className="
            fixed z-50
            inset-4 sm:inset-auto
            sm:top-16 sm:right-4 sm:left-auto
            sm:w-80 sm:max-h-[70vh]
            bg-white rounded-xl shadow-2xl
            flex flex-col
            overflow-hidden
          ">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-[#1b967a]" />
                <h3 className="font-semibold text-gray-900">Cambiar Proyecto</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Proyecto actual */}
            <div className="px-4 py-3 bg-[#1b967a]/10 border-b">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Proyecto actual</p>
              <p className="font-medium text-[#1b967a]">{selectedProyecto?.nombre || 'Ninguno'}</p>
            </div>

            {/* Lista de proyectos */}
            <div className="flex-1 overflow-y-auto p-2">
              {loadingProyectos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  {proyectos.map((proyecto) => {
                    const isActive = proyecto.id === selectedProyecto?.id;
                    return (
                      <button
                        key={proyecto.id}
                        onClick={() => handleSelectProyecto(proyecto)}
                        className={`
                          w-full flex items-center justify-between p-3 rounded-lg mb-1
                          transition-colors text-left
                          ${isActive
                            ? 'bg-[#1b967a] text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <FolderOpen className="w-5 h-5 flex-shrink-0" />
                          <span className="font-medium">{proyecto.nombre}</span>
                        </div>
                        {isActive && <CheckCircle2 className="w-5 h-5 flex-shrink-0" />}
                      </button>
                    );
                  })}

                  {/* Separador y Reportería */}
                  {canSeeReporteria && (
                    <>
                      <div className="border-t my-2" />
                      <button
                        onClick={handleGoToReporteria}
                        className="
                          w-full flex items-center gap-3 p-3 rounded-lg
                          hover:bg-blue-50 text-blue-700 transition-colors text-left
                        "
                      >
                        <BarChart3 className="w-5 h-5" />
                        <span className="font-medium">Reportería (Multi-proyecto)</span>
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer con instrucción */}
            <div className="px-4 py-3 bg-gray-50 border-t">
              <p className="text-xs text-gray-500 text-center">
                Selecciona un proyecto para cambiar el contexto
              </p>
            </div>
          </div>
        </>
      )}

      {/* ================================================================== */}
      {/* MODAL DE CONFIRMACIÓN */}
      {/* ================================================================== */}
      {selectedForChange && (
        <>
          {/* Backdrop más oscuro */}
          <div
            className="fixed inset-0 bg-black/70 z-50"
            onClick={handleCancelConfirm}
          />

          {/* Modal centrado */}
          <div className="fixed z-50 inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
              {/* Icono + Título */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-100 rounded-full flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    ¿Cambiar a &quot;{selectedForChange.nombre}&quot;?
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Proyecto actual: {selectedProyecto?.nombre}
                  </p>
                </div>
              </div>

              {/* Mensaje */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  Los datos que estás viendo cambiarán al contexto del nuevo proyecto.
                  Tu sesión seguirá activa y podrás volver a cambiar en cualquier momento.
                </p>
              </div>

              {/* Error (si existe) */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCancelConfirm}
                  disabled={changingProyecto}
                  className="
                    flex-1 px-4 py-3 border border-gray-300 rounded-xl
                    hover:bg-gray-50 transition-colors
                    disabled:opacity-50 font-medium text-gray-700
                  "
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmChange}
                  disabled={changingProyecto}
                  className="
                    flex-1 px-4 py-3 bg-[#1b967a] text-white rounded-xl
                    hover:bg-[#157a64] transition-colors
                    disabled:opacity-50 font-medium
                    flex items-center justify-center gap-2
                  "
                >
                  {changingProyecto && <Loader2 className="w-4 h-4 animate-spin" />}
                  Cambiar Proyecto
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
