/**
 * Helpers para el sistema de historial de leads (Audit Trail)
 * Funciones de formateo y mapeo - NO son Server Actions
 * Sesión 107 - Sistema de Auditoría de Leads
 */

/**
 * Mapea nombres técnicos de campos a nombres legibles
 */
export function getCampoLabel(campo: string | null): string {
  if (!campo) return 'Lead';

  const labels: Record<string, string> = {
    vendedor_asignado_id: 'Vendedor asignado',
    estado: 'Estado',
    tipificacion_nivel_1: 'Tipificación N1',
    tipificacion_nivel_2: 'Tipificación N2',
    tipificacion_nivel_3: 'Tipificación N3',
    observaciones_vendedor: 'Observaciones',
    asistio: 'Asistió a cita',
    excluido_repulse: 'Excluido de Repulse',
    nombre: 'Nombre',
    telefono: 'Teléfono',
    email: 'Email',
    rubro: 'Rubro',
  };

  return labels[campo] || campo;
}

/**
 * Mapea orígenes técnicos a nombres legibles
 */
export function getOrigenLabel(origen: string): string {
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    api: 'API',
    sistema: 'Sistema',
    chatbot: 'Victoria (Chatbot)',
    importacion: 'Importación',
    liberacion_masiva: 'Liberación masiva',
    n8n: 'n8n (Automatización)',
  };

  return labels[origen] || origen;
}

/**
 * Mapea acciones a iconos/colores
 */
export function getAccionStyle(accion: string): { icon: string; color: string; bg: string } {
  switch (accion) {
    case 'INSERT':
      return { icon: '✨', color: 'text-green-700', bg: 'bg-green-100' };
    case 'UPDATE':
      return { icon: '✏️', color: 'text-blue-700', bg: 'bg-blue-100' };
    case 'DELETE':
      return { icon: '🗑️', color: 'text-red-700', bg: 'bg-red-100' };
    default:
      return { icon: '📝', color: 'text-gray-700', bg: 'bg-gray-100' };
  }
}

/**
 * Formatea valores especiales para mostrar
 */
export function formatValor(campo: string | null, valor: string | null): string {
  if (valor === null || valor === '') return '(vacío)';
  if (valor === 'Sin asignar') return 'Sin asignar';

  // Formatear booleanos
  if (campo === 'asistio' || campo === 'excluido_repulse') {
    return valor === 'true' ? 'Sí' : 'No';
  }

  // Formatear estados
  if (campo === 'estado') {
    const estados: Record<string, string> = {
      lead_manual: 'Lead Manual',
      lead_completo: 'Lead Completo',
      lead_incompleto: 'Lead Incompleto',
      en_conversacion: 'En Conversación',
      conversacion_abandonada: 'Abandonada',
    };
    return estados[valor] || valor;
  }

  return valor;
}
