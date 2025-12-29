// ============================================================================
// ANALYTICS MODULE (PostHog)
// ============================================================================
// Sistema de analytics para EcoPlaza Dashboard.
// Incluye: Product Analytics + Session Replay + Heatmaps
//
// ACTIVAR: NEXT_PUBLIC_ANALYTICS_ENABLED=true en .env.local
//
// USO:
//   import { useAnalytics } from '@/lib/analytics';
//   const { trackLeadAssigned } = useAnalytics();
// ============================================================================

export { analyticsConfig, validateAnalyticsConfig, analyticsLog } from './config';
export { AnalyticsProvider } from './analytics-provider';
export { PostHogProvider, posthog } from './posthog-provider';
export { useAnalytics, trackEvent, identifyUser } from './use-analytics';
export type { AnalyticsUser } from './use-analytics';
