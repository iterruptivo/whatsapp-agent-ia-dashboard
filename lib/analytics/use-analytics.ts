// ============================================================================
// USE ANALYTICS HOOK
// ============================================================================
// Hook para trackear eventos de negocio en PostHog.
// ============================================================================

'use client';

import { useCallback } from 'react';
import posthog from 'posthog-js';
import { analyticsConfig, analyticsLog } from './config';

export interface AnalyticsUser {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  proyecto_id?: string;
}

export function useAnalytics() {
  // Identificar usuario
  const identify = useCallback((user: AnalyticsUser) => {
    if (!analyticsConfig.enabled) return;
    if (typeof window === 'undefined') return;

    posthog.identify(user.id, {
      email: user.email,
      name: user.nombre,
      rol: user.rol,
      proyecto_id: user.proyecto_id,
    });
    analyticsLog('User identified:', user.email);
  }, []);

  // Reset al logout
  const reset = useCallback(() => {
    if (!analyticsConfig.enabled) return;
    if (typeof window === 'undefined') return;

    posthog.reset();
    analyticsLog('Analytics reset (logout)');
  }, []);

  // Evento genérico
  const track = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    if (!analyticsConfig.enabled) return;
    if (typeof window === 'undefined') return;

    posthog.capture(eventName, properties);
    analyticsLog(`Event: ${eventName}`, properties);
  }, []);

  // ========== EVENTOS DE NEGOCIO ==========

  const trackLogin = useCallback((user: AnalyticsUser) => {
    identify(user);
    track('user_login', { user_id: user.id, rol: user.rol });
  }, [identify, track]);

  const trackLogout = useCallback(() => {
    track('user_logout');
    reset();
  }, [track, reset]);

  const trackProjectChange = useCallback((proyectoId: string, proyectoNombre: string) => {
    track('project_changed', { proyecto_id: proyectoId, proyecto_nombre: proyectoNombre });
  }, [track]);

  const trackLeadAssigned = useCallback((leadId: string, vendedorId: string, autoAsignado: boolean) => {
    track('lead_assigned', { lead_id: leadId, vendedor_id: vendedorId, auto_asignado: autoAsignado });
  }, [track]);

  const trackLeadStatusChange = useCallback((leadId: string, estadoAnterior: string, estadoNuevo: string) => {
    track('lead_status_changed', { lead_id: leadId, estado_anterior: estadoAnterior, estado_nuevo: estadoNuevo });
  }, [track]);

  const trackLocalStatusChange = useCallback((localCodigo: string, estadoAnterior: string, estadoNuevo: string) => {
    track('local_status_changed', { local_codigo: localCodigo, estado_anterior: estadoAnterior, estado_nuevo: estadoNuevo });
  }, [track]);

  const trackContratoGenerated = useCallback((tipo: string, localCodigo: string) => {
    track('contrato_generated', { tipo, local_codigo: localCodigo });
  }, [track]);

  const trackPagoRegistered = useCallback((monto: number, tipoPago: string) => {
    track('pago_registered', { monto, tipo_pago: tipoPago });
  }, [track]);

  const trackSearch = useCallback((query: string, resultados: number, modulo: string) => {
    track('search_performed', { query_length: query.length, resultados, modulo });
  }, [track]);

  const trackFilterApplied = useCallback((filtros: Record<string, unknown>, modulo: string) => {
    track('filter_applied', { filtros, modulo });
  }, [track]);

  const trackExport = useCallback((formato: 'excel' | 'pdf', modulo: string, registros: number) => {
    track('data_exported', { formato, modulo, registros });
  }, [track]);

  const trackError = useCallback((error: string, context?: Record<string, unknown>) => {
    track('error_occurred', { error, ...context });
  }, [track]);

  return {
    identify,
    reset,
    track,
    trackLogin,
    trackLogout,
    trackProjectChange,
    trackLeadAssigned,
    trackLeadStatusChange,
    trackLocalStatusChange,
    trackContratoGenerated,
    trackPagoRegistered,
    trackSearch,
    trackFilterApplied,
    trackExport,
    trackError,
  };
}

// Funciones directas (para uso fuera de componentes React)
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (!analyticsConfig.enabled) return;
  if (typeof window === 'undefined') return;
  posthog.capture(eventName, properties);
  analyticsLog(`Event: ${eventName}`, properties);
}

export function identifyUser(user: AnalyticsUser) {
  if (!analyticsConfig.enabled) return;
  if (typeof window === 'undefined') return;
  posthog.identify(user.id, {
    email: user.email,
    name: user.nombre,
    rol: user.rol,
    proyecto_id: user.proyecto_id,
  });
  analyticsLog('User identified:', user.email);
}
