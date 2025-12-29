// ============================================================================
// POSTHOG PROVIDER
// ============================================================================
// Provider de PostHog para Next.js App Router.
// Incluye: Analytics + Session Replay + Heatmaps
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { analyticsConfig, analyticsLog } from './config';

let posthogInitialized = false;

function initPostHog() {
  if (posthogInitialized) return;
  if (typeof window === 'undefined') return;
  if (!analyticsConfig.enabled) return;
  if (!analyticsConfig.posthog.key) return;

  posthog.init(analyticsConfig.posthog.key, {
    api_host: analyticsConfig.posthog.host,

    // Pageview tracking (recomendado 2025)
    capture_pageview: 'history_change',
    capture_pageleave: true,

    // Autocapture (clicks, forms, etc)
    autocapture: true,

    // Session Replay - HABILITADO
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,        // Enmascarar passwords y datos sensibles
      maskTextSelector: '[data-mask]', // Selector custom
    },

    // Heatmaps - HABILITADO (via toolbar)
    enable_heatmaps: true,

    // Persistence
    persistence: 'localStorage+cookie',

    // Debug
    loaded: (ph) => {
      analyticsLog('PostHog inicializado', {
        sessionRecording: true,
        heatmaps: true,
        autocapture: true,
      });
      if (analyticsConfig.debug) {
        ph.debug();
      }
    },
  });

  posthogInitialized = true;
}

// Tracker de pageviews (respaldo)
function PostHogPageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!analyticsConfig.enabled || !posthogInitialized) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    analyticsLog('Pageview:', url);
  }, [pathname, searchParams]);

  return null;
}

// Provider principal
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!analyticsConfig.enabled) {
      analyticsLog('Analytics deshabilitado');
      return;
    }
    initPostHog();
    setMounted(true);
  }, []);

  if (!analyticsConfig.enabled) {
    return <>{children}</>;
  }

  return (
    <>
      {mounted && <PostHogPageviewTracker />}
      {children}
    </>
  );
}

export { posthog };
