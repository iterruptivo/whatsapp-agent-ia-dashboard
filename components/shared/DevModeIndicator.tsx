'use client';

import { useState, useEffect } from 'react';
import { Code2, RefreshCw } from 'lucide-react';

const isDev = process.env.NODE_ENV === 'development';

/**
 * DevModeIndicator
 *
 * Small badge shown only in development mode.
 * Helps developers know they're in dev environment
 * and shows the last HMR update time.
 *
 * In production, this component returns null and is tree-shaken.
 */
export function DevModeIndicator() {
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    // Only run in development
    if (!isDev) return;

    // Set initial time
    const updateTime = () => {
      const now = new Date();
      setLastUpdate(now.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
      // Trigger pulse animation
      setPulse(true);
      setTimeout(() => setPulse(false), 500);
    };

    updateTime();

    // Also update on visibility change (when tab becomes visible)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateTime();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Only render in development
  if (!isDev) return null;

  return (
    <div
      className={`
        fixed bottom-4 left-4 z-[9998]
        bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg
        flex items-center gap-2 text-xs font-mono
        transition-all duration-300
        ${pulse ? 'ring-2 ring-green-400 scale-105' : ''}
        opacity-70 hover:opacity-100
      `}
      title="Modo desarrollo - Los cambios se actualizan automaticamente via HMR"
    >
      <Code2 className={`w-4 h-4 text-green-400 ${pulse ? 'animate-spin' : ''}`} />
      <span className="font-semibold text-green-400">DEV</span>
      <span className="text-gray-400">|</span>
      <span className="text-gray-300">{lastUpdate}</span>
      <button
        onClick={() => window.location.reload()}
        className="ml-1 p-1 hover:bg-gray-700 rounded transition-colors"
        title="Recargar pagina"
      >
        <RefreshCw className="w-3 h-3" />
      </button>
    </div>
  );
}
