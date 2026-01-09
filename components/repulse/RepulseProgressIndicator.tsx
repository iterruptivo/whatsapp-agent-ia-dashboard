// ============================================================================
// COMPONENT: RepulseProgressIndicator
// ============================================================================
// Descripción: Indicador flotante que muestra el progreso de envío de repulses
// Se muestra cuando el usuario minimiza el modal de progreso
// Permite hacer clic para reabrir el modal completo
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Zap, CheckCircle, XCircle, Loader2, ChevronUp } from 'lucide-react';

interface RepulseProgressIndicatorProps {
  batchId: string;
  totalLeads: number;
  onExpand: () => void;
  onComplete: () => void;
}

interface ProgressState {
  enviados: number;
  errores: number;
  pendientes: number;
  enviando: number;
}

export default function RepulseProgressIndicator({
  batchId,
  totalLeads,
  onExpand,
  onComplete,
}: RepulseProgressIndicatorProps) {
  const [progress, setProgress] = useState<ProgressState>({
    enviados: 0,
    errores: 0,
    pendientes: totalLeads,
    enviando: 0,
  });
  const [isComplete, setIsComplete] = useState(false);

  // Polling para obtener el progreso
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

  // Polling cada 1.5 segundos
  useEffect(() => {
    fetchProgress();

    if (isComplete) return;

    const interval = setInterval(fetchProgress, 1500);
    return () => clearInterval(interval);
  }, [fetchProgress, isComplete]);

  const porcentaje = Math.round(
    ((progress.enviados + progress.errores) / totalLeads) * 100
  );

  const allFailed = isComplete && progress.enviados === 0 && progress.errores > 0;
  const hasErrors = progress.errores > 0;

  // Auto-completar después de 3 segundos de completado
  useEffect(() => {
    if (isComplete) {
      const timeout = setTimeout(() => {
        onComplete();
      }, 5000); // 5 segundos para que el usuario vea el resultado
      return () => clearTimeout(timeout);
    }
  }, [isComplete, onComplete]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={onExpand}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all hover:scale-105 ${
          isComplete
            ? allFailed
              ? 'bg-red-500 text-white'
              : hasErrors
              ? 'bg-yellow-500 text-white'
              : 'bg-green-500 text-white'
            : 'bg-primary text-white'
        }`}
      >
        {/* Icono */}
        <div className="flex items-center gap-2">
          {isComplete ? (
            allFailed ? (
              <XCircle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )
          ) : (
            <Loader2 className="w-5 h-5 animate-spin" />
          )}
          <Zap className="w-4 h-4" />
        </div>

        {/* Texto */}
        <div className="text-left">
          <div className="text-sm font-medium">
            {isComplete
              ? allFailed
                ? 'Error en envío'
                : hasErrors
                ? 'Envío con errores'
                : 'Envío completado'
              : 'Enviando repulses...'}
          </div>
          <div className="text-xs opacity-90">
            {progress.enviados}/{totalLeads} enviados
            {progress.errores > 0 && ` • ${progress.errores} errores`}
            {!isComplete && ` • ${porcentaje}%`}
          </div>
        </div>

        {/* Barra de progreso mini */}
        {!isComplete && (
          <div className="w-16 h-1.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        )}

        {/* Indicador de expandir */}
        <ChevronUp className="w-4 h-4 opacity-60" />
      </button>
    </div>
  );
}
