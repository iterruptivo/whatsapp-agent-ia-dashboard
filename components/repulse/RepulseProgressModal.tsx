// ============================================================================
// COMPONENT: RepulseProgressModal
// ============================================================================
// Descripción: Modal que muestra el progreso de envío masivo de repulses
// Actualizado: Botón X siempre visible + Botón Minimizar en footer
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Zap, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface RepulseProgressModalProps {
  batchId: string;
  totalLeads: number;
  onClose: () => void;
}

interface ProgressState {
  enviados: number;
  errores: number;
  pendientes: number;
  enviando: number;
}

export default function RepulseProgressModal({
  batchId,
  totalLeads,
  onClose,
}: RepulseProgressModalProps) {
  const [progress, setProgress] = useState<ProgressState>({
    enviados: 0,
    errores: 0,
    pendientes: totalLeads,
    enviando: 0,
  });
  const [isComplete, setIsComplete] = useState(false);

  // Función para obtener estado actual via API (polling)
  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/repulse/send-batch?batchId=${batchId}`);
      if (response.ok) {
        const data = await response.json();
        setProgress({
          enviados: data.enviados,
          errores: data.errores,
          pendientes: data.pendientes,
          enviando: data.enviando,
        });
        if (data.completado) {
          setIsComplete(true);
        }
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  }, [batchId]);

  // SIEMPRE usar polling - es más confiable que Realtime
  useEffect(() => {
    // Fetch inicial inmediato
    fetchProgress();

    // Si ya está completo, no iniciar polling
    if (isComplete) return;

    // Polling cada 1.5 segundos para actualizaciones en "casi" tiempo real
    const interval = setInterval(fetchProgress, 1500);
    return () => clearInterval(interval);
  }, [fetchProgress, isComplete]);

  const porcentaje = Math.round(
    ((progress.enviados + progress.errores) / totalLeads) * 100
  );

  const allFailed = isComplete && progress.enviados === 0 && progress.errores > 0;
  const hasErrors = progress.errores > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop - no cerrar si está procesando */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50"
        onClick={isComplete ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              {isComplete ? 'Envío Completado' : 'Enviando Repulses...'}
            </h2>
            {/* Siempre mostrar X para cerrar */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title={isComplete ? 'Cerrar' : 'Minimizar (el envío continuará)'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Icono de estado */}
            <div className="flex justify-center">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  isComplete
                    ? allFailed
                      ? 'bg-red-100'
                      : hasErrors
                      ? 'bg-yellow-100'
                      : 'bg-green-100'
                    : 'bg-blue-100'
                }`}
              >
                {isComplete ? (
                  allFailed ? (
                    <XCircle className="w-10 h-10 text-red-600" />
                  ) : hasErrors ? (
                    <AlertCircle className="w-10 h-10 text-yellow-600" />
                  ) : (
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  )
                ) : (
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                )}
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Progreso</span>
                <span>
                  {progress.enviados + progress.errores} / {totalLeads} ({porcentaje}%)
                </span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isComplete
                      ? allFailed
                        ? 'bg-red-500'
                        : hasErrors
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-700">{progress.enviados}</p>
                <p className="text-sm text-green-600 flex items-center justify-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Enviados
                </p>
              </div>
              <div
                className={`${
                  progress.errores > 0 ? 'bg-red-50' : 'bg-gray-50'
                } rounded-lg p-4 text-center`}
              >
                <p
                  className={`text-3xl font-bold ${
                    progress.errores > 0 ? 'text-red-700' : 'text-gray-400'
                  }`}
                >
                  {progress.errores}
                </p>
                <p
                  className={`text-sm flex items-center justify-center gap-1 ${
                    progress.errores > 0 ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  Errores
                </p>
              </div>
            </div>

            {/* Estado actual */}
            {!isComplete && (
              <div className="text-center text-sm text-gray-500">
                {progress.enviando > 0 && (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando {progress.enviando} mensaje{progress.enviando > 1 ? 's' : ''}...
                  </span>
                )}
                {progress.pendientes > 0 && progress.enviando === 0 && (
                  <span>{progress.pendientes} pendientes en cola</span>
                )}
              </div>
            )}

            {/* Mensaje de error si falló todo */}
            {isComplete && allFailed && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Error en el envío</p>
                    <p className="mt-1">
                      No se pudo enviar ningún mensaje. Verifica la configuración del webhook n8n.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje de éxito parcial */}
            {isComplete && hasErrors && !allFailed && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Envío parcial completado</p>
                    <p className="mt-1">
                      {progress.enviados} mensajes enviados, {progress.errores} fallaron.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje de éxito total */}
            {isComplete && !hasErrors && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium">Envío completado exitosamente</p>
                    <p className="mt-1">
                      {progress.enviados} mensajes de repulse enviados correctamente.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            {isComplete ? (
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Cerrar
              </button>
            ) : (
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Minimizar (el envío continuará en segundo plano)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
