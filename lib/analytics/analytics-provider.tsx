// ============================================================================
// ANALYTICS PROVIDER
// ============================================================================
// Wrapper principal para PostHog.
// Se usa en layout.tsx para envolver toda la aplicación.
//
// ACTIVAR: NEXT_PUBLIC_ANALYTICS_ENABLED=true en .env.local
// ============================================================================

'use client';

import { Suspense, useEffect } from 'react';
import { PostHogProvider } from './posthog-provider';
import { AnalyticsIdentify } from './analytics-identify';
import { analyticsConfig, validateAnalyticsConfig, analyticsLog } from './config';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  useEffect(() => {
    if (!analyticsConfig.enabled) {
      analyticsLog('Analytics deshabilitado (NEXT_PUBLIC_ANALYTICS_ENABLED=false)');
      return;
    }

    const { valid, errors } = validateAnalyticsConfig();
    if (!valid) {
      console.warn('[Analytics] Configuración inválida:', errors);
    }
  }, []);

  if (!analyticsConfig.enabled) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={null}>
      <PostHogProvider>
        {/* Sincroniza AuthContext con PostHog para identificar usuarios */}
        <AnalyticsIdentify />
        {children}
      </PostHogProvider>
    </Suspense>
  );
}
