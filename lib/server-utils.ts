// ============================================================================
// SERVER UTILITIES
// ============================================================================
// Descripción: Utilidades para Server Components
// SESIÓN 55: Helper para obtener proyecto seleccionado desde cookies
// ============================================================================

import { cookies } from 'next/headers';

/**
 * SESIÓN 55: Obtener el ID del proyecto seleccionado desde la cookie
 * Para uso en Server Components (page.tsx, layout.tsx)
 *
 * @returns ID del proyecto seleccionado o null si no existe
 */
export async function getSelectedProyectoId(): Promise<string | null> {
  const cookieStore = await cookies();
  const proyectoId = cookieStore.get('selected_proyecto_id')?.value;
  return proyectoId || null;
}
