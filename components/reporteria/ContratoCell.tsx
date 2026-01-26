'use client';

import { CheckCircle, XCircle, Download } from 'lucide-react';

interface Props {
  firmado: boolean;
  fechaFirma?: string | null;
  contratoUrl?: string | null;
}

export default function ContratoCell({ firmado, fechaFirma, contratoUrl }: Props) {
  if (!firmado) {
    return (
      <div className="flex items-center justify-center">
        <XCircle className="w-4 h-4 text-gray-300" />
      </div>
    );
  }

  // Formatear fecha si existe
  const fechaFormateada = fechaFirma
    ? new Date(fechaFirma + 'T00:00:00').toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
      })
    : null;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1">
        <CheckCircle className="w-4 h-4 text-green-500" />
        {contratoUrl && (
          <a
            href={contratoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700"
            title="Descargar contrato"
          >
            <Download className="w-3 h-3" />
          </a>
        )}
      </div>
      {fechaFormateada && (
        <span className="text-[10px] text-gray-500">{fechaFormateada}</span>
      )}
    </div>
  );
}
