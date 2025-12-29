// ============================================================================
// ANALYTICS CONFIG
// ============================================================================
// Configuración para PostHog (analytics + session replay + heatmaps)
// Para activar/desactivar: NEXT_PUBLIC_ANALYTICS_ENABLED en .env.local
// ============================================================================

export const analyticsConfig = {
  // Master switch
  enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true',

  // PostHog config
  posthog: {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  },

  // Debug mode - logs to console
  debug: process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === 'true',
};

// Validar configuración
export function validateAnalyticsConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (analyticsConfig.enabled && !analyticsConfig.posthog.key) {
    errors.push('Analytics está habilitado pero falta NEXT_PUBLIC_POSTHOG_KEY');
  }

  return { valid: errors.length === 0, errors };
}

// Helper para logging en debug mode
export function analyticsLog(message: string, data?: unknown) {
  if (analyticsConfig.debug) {
    console.log(`[Analytics] ${message}`, data || '');
  }
}
