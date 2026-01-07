// ============================================================================
// COMPONENT: ReunionEstadoBadge
// ============================================================================
// Descripcion: Badge de estado de reunión con colores y iconos
// ============================================================================

'use client';

import { Loader2, CheckCircle, XCircle, Upload } from 'lucide-react';
import { ReunionEstado } from '@/types/reuniones';

interface ReunionEstadoBadgeProps {
  estado: ReunionEstado;
  size?: 'sm' | 'md';
}

export default function ReunionEstadoBadge({ estado, size = 'md' }: ReunionEstadoBadgeProps) {
  const getEstadoConfig = () => {
    switch (estado) {
      case 'subiendo':
        return {
          label: 'Subiendo',
          icon: Upload,
          className: 'bg-blue-100 text-blue-800',
        };
      case 'procesando':
        return {
          label: 'Procesando',
          icon: Loader2,
          className: 'bg-yellow-100 text-yellow-800',
        };
      case 'completado':
        return {
          label: 'Completado',
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800',
        };
      case 'error':
        return {
          label: 'Error',
          icon: XCircle,
          className: 'bg-red-100 text-red-800',
        };
      default:
        return {
          label: 'Desconocido',
          icon: XCircle,
          className: 'bg-gray-100 text-gray-800',
        };
    }
  };

  const config = getEstadoConfig();
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${padding} rounded-full font-medium ${textSize} ${config.className}`}
    >
      <Icon className={`${iconSize} ${estado === 'procesando' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
}
