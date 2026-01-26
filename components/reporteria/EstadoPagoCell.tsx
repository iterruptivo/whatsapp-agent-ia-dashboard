'use client';

import { CheckCircle, Clock } from 'lucide-react';

interface Props {
  estado: 'CANCELADO' | 'PENDIENTE';
  precioVenta?: number | null;
  totalAbonado?: number | null;
}

export default function EstadoPagoCell({ estado, precioVenta, totalAbonado }: Props) {
  const isCancelado = estado === 'CANCELADO';

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          isCancelado
            ? 'bg-green-100 text-green-700'
            : 'bg-amber-100 text-amber-700'
        }`}
      >
        {isCancelado ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <Clock className="w-3 h-3" />
        )}
        {estado}
      </span>

      {/* Mostrar porcentaje si está pendiente */}
      {!isCancelado && precioVenta && precioVenta > 0 && totalAbonado != null && (
        <span className="text-[10px] text-gray-500">
          {Math.round((totalAbonado / precioVenta) * 100)}% pagado
        </span>
      )}
    </div>
  );
}
