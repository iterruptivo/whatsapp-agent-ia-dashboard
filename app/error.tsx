'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error de Conexión</h2>
        <p className="text-gray-600 mb-6">
          No se pudo conectar a la base de datos. Por favor, verifica tu conexión e intenta nuevamente.
        </p>
        <button
          onClick={reset}
          className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
