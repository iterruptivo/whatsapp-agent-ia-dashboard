'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface VersionInfo {
  buildId: string;
  version: string;
  timestamp: string;
  environment: string;
  vercelEnv: string;
}

/**
 * Hook to detect new version deployments
 *
 * Polls the /api/version endpoint and compares the buildId
 * with the initial value. If they differ, a new version is available.
 *
 * @param checkInterval - Polling interval in milliseconds (default: 60000 = 1 min)
 */
export function useVersionCheck(checkInterval: number = 60000) {
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<VersionInfo | null>(null);
  const initialBuildIdRef = useRef<string | null>(null);

  const checkVersion = useCallback(async () => {
    try {
      const response = await fetch('/api/version', {
        cache: 'no-store',
        headers: {
          'pragma': 'no-cache',
          'cache-control': 'no-cache, no-store',
        },
      });

      if (!response.ok) {
        console.warn('[VersionCheck] Failed to fetch version:', response.status);
        return;
      }

      const data: VersionInfo = await response.json();

      // First check: store initial buildId
      if (!initialBuildIdRef.current) {
        initialBuildIdRef.current = data.buildId;
        setCurrentVersion(data);
        console.log('[VersionCheck] Initial buildId stored:', data.buildId);
        return;
      }

      // Subsequent checks: compare with initial
      if (data.buildId !== initialBuildIdRef.current) {
        console.log('[VersionCheck] New version detected!');
        console.log('[VersionCheck] Current:', initialBuildIdRef.current);
        console.log('[VersionCheck] New:', data.buildId);
        setNewVersionAvailable(true);
        setCurrentVersion(data);
      }
    } catch (error) {
      console.error('[VersionCheck] Error:', error);
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkVersion();

    // Setup polling
    const interval = setInterval(checkVersion, checkInterval);

    // Cleanup
    return () => clearInterval(interval);
  }, [checkVersion, checkInterval]);

  const reloadToNewVersion = useCallback(() => {
    // Clear any cached data
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    // Force hard reload
    window.location.reload();
  }, []);

  const dismissUpdate = useCallback(() => {
    setNewVersionAvailable(false);
  }, []);

  return {
    newVersionAvailable,
    currentVersion,
    reloadToNewVersion,
    dismissUpdate,
  };
}
