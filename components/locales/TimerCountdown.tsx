// ============================================================================
// COMPONENT: TimerCountdown
// ============================================================================
// Descripción: Componente aislado para timer countdown (optimización)
// OPT: Solo este componente se re-renderiza cada segundo (no toda la tabla)
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimerCountdownProps {
  naranjaTimestamp: string | null;
}

export default function TimerCountdown({ naranjaTimestamp }: TimerCountdownProps) {
  // HYDRATION FIX: Iniciar con null para evitar mismatch servidor/cliente
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Marcar que estamos en el cliente y establecer tiempo inicial
  useEffect(() => {
    setIsClient(true);
    setCurrentTime(Date.now());
  }, []);

  // Solo actualizar cada segundo si hay timestamp y estamos en cliente
  useEffect(() => {
    if (!naranjaTimestamp || !isClient) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [naranjaTimestamp, isClient]);

  // Calcular tiempo restante
  const calcularTiempoRestante = () => {
    if (!naranjaTimestamp || currentTime === null) return null;

    const inicio = new Date(naranjaTimestamp);
    const ahora = new Date(currentTime);
    const fin = new Date(inicio.getTime() + 120 * 60 * 60 * 1000); // +120 horas

    const msRestantes = fin.getTime() - ahora.getTime();

    // Si ya expiró
    if (msRestantes <= 0) {
      return { expired: true, text: 'Expirado', percent: 0 };
    }

    // Calcular tiempo restante con segundos
    const segundosTotales = Math.floor(msRestantes / 1000);
    const minutosTotales = Math.floor(segundosTotales / 60);
    const horasTotales = Math.floor(minutosTotales / 60);

    const diasRestantes = Math.floor(horasTotales / 24);
    const horasRestantes = horasTotales % 24;
    const minutosRestantes = minutosTotales % 60;
    const segundosRestantes = segundosTotales % 60;

    // Porcentaje de timer (0-100%)
    const porcentaje = (horasTotales / 120) * 100;

    // Texto para badge con segundos
    let text = '';
    if (diasRestantes > 0) {
      text = `Quedan ${diasRestantes}d ${horasRestantes}h ${minutosRestantes}m ${segundosRestantes}s`;
    } else if (horasRestantes > 0) {
      text = `Quedan ${horasRestantes}h ${minutosRestantes}m ${segundosRestantes}s`;
    } else {
      text = `Quedan ${minutosRestantes}m ${segundosRestantes}s`;
    }

    return {
      expired: false,
      text,
      percent: porcentaje,
    };
  };

  const tiempo = calcularTiempoRestante();

  // No renderizar si no hay timestamp o expiró
  if (!tiempo || tiempo.expired) return null;

  return (
    <div className="mt-2 space-y-1">
      {/* Progress Bar Azul */}
      <div className="w-full h-1.5 bg-gray-200 rounded-full border border-blue-300">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-1000"
          style={{ width: `${tiempo.percent}%` }}
        />
      </div>

      {/* Badge con tiempo restante */}
      <div className="flex items-center gap-1 text-xs text-blue-700">
        <Clock className="w-3 h-3" />
        <span className="font-medium">{tiempo.text}</span>
      </div>
    </div>
  );
}
