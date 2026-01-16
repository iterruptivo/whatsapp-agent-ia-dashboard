// ============================================================================
// COMPONENT: ReunionDetalleHeader
// ============================================================================
// Descripcion: Header con metadata de la reunión
// ============================================================================

'use client';

import { useState } from 'react';
import { Calendar, Clock, Video, ListChecks, User, Download, Loader2, RefreshCw, AlertTriangle, Pencil } from 'lucide-react';
import { Reunion, ReunionActionItem } from '@/types/reuniones';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import ReunionEstadoBadge from './ReunionEstadoBadge';
import EditarReunionModal from './EditarReunionModal';

interface ReunionDetalleHeaderProps {
  reunion: Reunion;
  actionItems: ReunionActionItem[];
  onReprocess?: () => void;
  onReunionUpdate?: (reunion: Reunion) => void;
}

export default function ReunionDetalleHeader({
  reunion,
  actionItems,
  onReprocess,
  onReunionUpdate,
}: ReunionDetalleHeaderProps) {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentReunion, setCurrentReunion] = useState(reunion);

  // Calcular estadísticas de action items
  const actionItemsCount = actionItems.length;
  const completedCount = actionItems.filter(item => item.completado).length;
  const hasCompletedItems = completedCount > 0;

  // Verificar si el usuario actual es el creador de la reunión
  const esCreador = user?.id === reunion.created_by;

  // Determinar si se puede reprocesar
  const canReprocess = reunion.media_storage_path &&
                       !reunion.media_deleted_at &&
                       reunion.estado !== 'procesando' &&
                       reunion.estado !== 'subiendo';

  // Manejar click en reprocesar
  const handleReprocessClick = () => {
    if (hasCompletedItems) {
      setShowConfirmModal(true);
    } else {
      executeReprocess();
    }
  };

  // Ejecutar reprocesamiento
  const executeReprocess = async () => {
    setShowConfirmModal(false);
    setReprocessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`/api/reuniones/${reunion.id}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al reprocesar');
      }

      // Recargar la página para ver el nuevo estado
      if (onReprocess) {
        onReprocess();
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('[Reprocess] Error:', error);
      alert('Error al reprocesar: ' + error.message);
    } finally {
      setReprocessing(false);
    }
  };

  // Descargar archivo multimedia
  const handleDownload = async () => {
    if (!reunion.media_storage_path) return;

    setDownloading(true);
    setDownloadError(null);

    try {
      // Obtener URL firmada para descarga
      const { data, error } = await supabase.storage
        .from('reuniones-media')
        .createSignedUrl(reunion.media_storage_path, 3600); // 1 hora

      if (error) throw error;

      // Abrir en nueva pestaña para descarga
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error('[Download] Error:', error);
      setDownloadError('Error al descargar. El archivo puede haber sido eliminado.');
    } finally {
      setDownloading(false);
    }
  };

  // Obtener extensión del archivo
  const getFileExtension = (path: string) => {
    const match = path.match(/\.[^.]+$/);
    return match ? match[0] : '';
  };

  const formatFecha = (fecha: string | null) => {
    if (!fecha) return 'No especificada';
    return new Date(fecha).toLocaleDateString('es-PE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDuracion = (segundos: number | null) => {
    if (!segundos) return 'N/A';
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFechaCreacion = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Banner con título - mejor contraste */}
      <div className="bg-gradient-to-r from-[#1b967a] to-[#157a63] px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Icono */}
          <div className="p-3 sm:p-4 bg-white/20 backdrop-blur-sm rounded-xl w-fit">
            <Video className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          {/* Título y estado */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
              {currentReunion.titulo}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <ReunionEstadoBadge estado={currentReunion.estado} />
            </div>
          </div>

          {/* Botones de acción - Solo para el creador */}
          {esCreador && (
            <div className="flex items-center gap-2">
              {/* Botón editar */}
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors text-sm font-medium backdrop-blur-sm"
                title="Editar título y fecha"
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Editar</span>
              </button>

              {/* Botón reprocesar */}
              {canReprocess && (
                <button
                  onClick={handleReprocessClick}
                  disabled={reprocessing}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium backdrop-blur-sm"
                  title={hasCompletedItems ? 'Reprocesar (perderás action items completados)' : 'Reprocesar con IA'}
                >
                  {reprocessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Procesando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span className="hidden sm:inline">Reprocesar</span>
                    </>
                  )}
                </button>
              )}

              {/* Botón descargar */}
              {reunion.media_storage_path && !reunion.media_deleted_at && (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium backdrop-blur-sm"
                  title="Descargar archivo original"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Descargando...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Descargar</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

        </div>

        {/* Error de descarga */}
        {downloadError && (
          <p className="mt-2 text-sm text-red-200">{downloadError}</p>
        )}
      </div>

      {/* Contenido - Metadata */}
      <div className="px-4 sm:px-6 py-4">
        {/* Metadata grid - mobile first: 1 col -> 2 cols -> 4 cols */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Fecha de reunión */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Fecha de Reunión</p>
              <p className="text-sm font-medium text-gray-800">
                {formatFecha(currentReunion.fecha_reunion)}
              </p>
            </div>
          </div>

          {/* Duración */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Duración</p>
              <p className="text-sm font-medium text-gray-800">
                {formatDuracion(reunion.duracion_segundos)}
              </p>
            </div>
          </div>

          {/* Action Items */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <ListChecks className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Action Items</p>
              <p className="text-sm font-medium text-gray-800">{actionItemsCount}</p>
            </div>
          </div>

          {/* Participantes */}
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <User className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Participantes</p>
              <p className="text-sm font-medium text-gray-800">
                {reunion.participantes?.length || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Fecha de creación */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center sm:text-left">
            Subida el {formatFechaCreacion(reunion.created_at)}
          </p>
        </div>
      </div>

      {/* Modal de confirmación para reprocesar */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    ¿Reprocesar reunión?
                  </h3>
                  <p className="text-sm text-gray-600">
                    Esta acción no se puede deshacer
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-gray-700 mb-4">
                Tienes <span className="font-semibold text-yellow-600">{completedCount} action item{completedCount !== 1 ? 's' : ''} completado{completedCount !== 1 ? 's' : ''}</span>.
                Al reprocesar, se eliminarán todos los action items actuales y se generarán nuevos.
              </p>
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p className="font-medium mb-1">Se eliminará:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Todos los action items ({actionItemsCount} total)</li>
                  <li>El progreso de tareas completadas</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium order-2 sm:order-1"
              >
                Cancelar
              </button>
              <button
                onClick={executeReprocess}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium order-1 sm:order-2"
              >
                Sí, reprocesar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      <EditarReunionModal
        reunion={{
          id: currentReunion.id,
          titulo: currentReunion.titulo,
          fecha_reunion: currentReunion.fecha_reunion,
        }}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={(updatedReunion) => {
          setCurrentReunion(updatedReunion);
          setShowEditModal(false);
          if (onReunionUpdate) {
            onReunionUpdate(updatedReunion);
          }
        }}
      />
    </div>
  );
}
