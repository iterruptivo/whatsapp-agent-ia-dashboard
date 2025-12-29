// ============================================================================
// ANALYTICS IDENTIFY
// ============================================================================
// Sincroniza el usuario del AuthContext con PostHog.
// Se coloca dentro de AnalyticsProvider para tener acceso a ambos contextos.
// ============================================================================

'use client';

import { useEffect, useRef } from 'react';
import posthog from 'posthog-js';
import { useAuth } from '../auth-context';
import { analyticsConfig, analyticsLog } from './config';

export function AnalyticsIdentify() {
  const { user, selectedProyecto } = useAuth();
  const lastIdentifiedId = useRef<string | null>(null);

  useEffect(() => {
    if (!analyticsConfig.enabled) return;

    // Si hay usuario y no lo hemos identificado aún (o cambió)
    if (user && user.id !== lastIdentifiedId.current) {
      posthog.identify(user.id, {
        email: user.email,
        name: user.nombre,
        rol: user.rol,
        proyecto_id: selectedProyecto?.id,
        proyecto_nombre: selectedProyecto?.nombre,
      });

      lastIdentifiedId.current = user.id;
      analyticsLog(`User identified: ${user.email} | Rol: ${user.rol}`);
    }

    // Si el usuario hace logout, reset PostHog
    if (!user && lastIdentifiedId.current) {
      posthog.reset();
      lastIdentifiedId.current = null;
      analyticsLog('User reset (logout)');
    }
  }, [user, selectedProyecto]);

  // Si cambia el proyecto, actualizar las propiedades del usuario
  useEffect(() => {
    if (!analyticsConfig.enabled) return;
    if (!user || !selectedProyecto) return;

    posthog.people.set({
      proyecto_id: selectedProyecto.id,
      proyecto_nombre: selectedProyecto.nombre,
    });

    analyticsLog('Proyecto updated:', selectedProyecto.nombre);
  }, [selectedProyecto?.id]);

  return null; // Este componente no renderiza nada
}
