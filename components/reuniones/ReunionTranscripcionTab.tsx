// ============================================================================
// COMPONENT: ReunionTranscripcionTab
// ============================================================================
// Descripcion: Tab de transcripción completa con botón copiar
// ============================================================================

'use client';

import { useState } from 'react';
import { FileText, Copy, Check, Loader2 } from 'lucide-react';
import { Reunion } from '@/types/reuniones';

interface ReunionTranscripcionTabProps {
  reunion: Reunion;
}

export default function ReunionTranscripcionTab({ reunion }: ReunionTranscripcionTabProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (reunion.transcripcion_completa) {
      navigator.clipboard.writeText(reunion.transcripcion_completa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Si está procesando
  if (reunion.estado === 'procesando') {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 text-[#1b967a] animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          Transcribiendo Audio
        </h3>
        <p className="text-gray-500">
          La IA está generando la transcripción completa...
        </p>
      </div>
    );
  }

  // Si no hay transcripción
  if (!reunion.transcripcion_completa) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600">Sin Transcripción</h3>
        <p className="text-gray-500">La transcripción aún no está disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con botón copiar - apilado en móvil */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#1b967a]" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-800">Transcripción Completa</h3>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors w-full sm:w-auto"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copiar Transcripción
            </>
          )}
        </button>
      </div>

      {/* Transcripción - altura adaptable */}
      <div className="p-3 sm:p-4 bg-gray-50 rounded-lg max-h-[400px] sm:max-h-[600px] overflow-y-auto">
        <div className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
          {reunion.transcripcion_completa}
        </div>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 text-center sm:text-left">
        <p>
          Transcripción generada automáticamente por IA. Puede contener errores menores.
        </p>
      </div>
    </div>
  );
}
