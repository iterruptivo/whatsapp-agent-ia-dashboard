'use client';

import { useVersionCheck } from '@/lib/hooks/useVersionCheck';
import { RefreshCw, X, AlertCircle } from 'lucide-react';
import { useState } from 'react';

/**
 * NewVersionBanner
 *
 * Displays a banner at the top of the screen when a new version
 * of the application is available. Users can click to reload
 * or dismiss the notification.
 *
 * The banner checks for new versions every 60 seconds by default.
 */
export function NewVersionBanner() {
  const { newVersionAvailable, reloadToNewVersion } = useVersionCheck(60000);
  const [dismissed, setDismissed] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  // Don't render if no new version or user dismissed
  if (!newVersionAvailable || dismissed) {
    return null;
  }

  const handleReload = () => {
    setIsReloading(true);
    reloadToNewVersion();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 shadow-lg animate-slideDown">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Icon + Message */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <AlertCircle className="w-5 h-5 flex-shrink-0 animate-pulse" />
          <div className="min-w-0">
            <p className="font-semibold text-sm sm:text-base">
              Nueva version disponible
            </p>
            <p className="text-blue-100 text-xs sm:text-sm truncate">
              Recarga la pagina para obtener las ultimas mejoras
            </p>
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Reload button */}
          <button
            onClick={handleReload}
            disabled={isReloading}
            className="flex items-center gap-2 bg-white text-blue-600 px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors disabled:opacity-70"
          >
            <RefreshCw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isReloading ? 'Recargando...' : 'Recargar'}
            </span>
          </button>

          {/* Dismiss button */}
          <button
            onClick={() => setDismissed(true)}
            className="text-blue-200 hover:text-white transition-colors p-2 rounded-lg hover:bg-blue-500/30"
            aria-label="Descartar notificacion"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
