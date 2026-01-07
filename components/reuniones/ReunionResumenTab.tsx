// ============================================================================
// COMPONENT: ReunionResumenTab
// ============================================================================
// Descripcion: Tab de resumen con puntos clave, decisiones, preguntas
// ============================================================================

'use client';

import { useState } from 'react';
import { FileText, Key, CheckCircle, HelpCircle, Loader2, RefreshCw } from 'lucide-react';
import { Reunion } from '@/types/reuniones';
import { supabase } from '@/lib/supabase';

interface ReunionResumenTabProps {
  reunion: Reunion;
  onReprocesar?: () => void;
}

export default function ReunionResumenTab({ reunion, onReprocesar }: ReunionResumenTabProps) {
  const [reprocesando, setReprocesando] = useState(false);
  const [reprocesarError, setReprocesarError] = useState<string | null>(null);

  const handleReprocesar = async () => {
    setReprocesando(true);
    setReprocesarError(null);

    try {
      // Obtener sesión directamente del cliente de Supabase
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`/api/reuniones/${reunion.id}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al reprocesar');
      }

      // Recargar la página para ver el nuevo estado
      if (onReprocesar) {
        onReprocesar();
      } else {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('[Reprocesar] Error:', error);
      setReprocesarError(error.message || 'Error desconocido');
      setReprocesando(false);
    }
  };
  // Si está procesando
  if (reunion.estado === 'procesando') {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 text-[#1b967a] animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          Analizando Reunión
        </h3>
        <p className="text-gray-500">
          La IA está generando el resumen y extrayendo insights clave...
        </p>
      </div>
    );
  }

  // Si hay error
  if (reunion.estado === 'error') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">Error en el Procesamiento</h3>
        <p className="text-gray-500 mb-6">{reunion.error_mensaje || 'Error desconocido'}</p>

        {reprocesarError && (
          <p className="text-red-500 mb-4">{reprocesarError}</p>
        )}

        <button
          onClick={handleReprocesar}
          disabled={reprocesando}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {reprocesando ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Reprocesando...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Reintentar Procesamiento
            </>
          )}
        </button>
      </div>
    );
  }

  // Si no hay resumen aún
  if (!reunion.resumen) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600">Sin Resumen</h3>
        <p className="text-gray-500">El resumen aún no está disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen general */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-[#1b967a]" />
          <h3 className="text-lg font-semibold text-gray-800">Resumen General</h3>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-700 leading-relaxed">{reunion.resumen}</p>
        </div>
      </section>

      {/* Puntos clave */}
      {reunion.puntos_clave && reunion.puntos_clave.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Puntos Clave</h3>
          </div>
          <ul className="space-y-2">
            {reunion.puntos_clave.map((punto, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg"
              >
                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-gray-700 leading-relaxed">{punto}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Decisiones */}
      {reunion.decisiones && reunion.decisiones.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Decisiones Tomadas</h3>
          </div>
          <ul className="space-y-2">
            {reunion.decisiones.map((decision, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-lg"
              >
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700 leading-relaxed">{decision}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Preguntas abiertas */}
      {reunion.preguntas_abiertas && reunion.preguntas_abiertas.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-800">Preguntas Abiertas</h3>
          </div>
          <ul className="space-y-2">
            {reunion.preguntas_abiertas.map((pregunta, index) => (
              <li
                key={index}
                className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg"
              >
                <HelpCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-gray-700 leading-relaxed">{pregunta}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
