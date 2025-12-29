/**
 * Executive Dashboard API Client
 *
 * Cliente TypeScript para consumir las APIs del Dashboard Ejecutivo
 * Uso en componentes frontend
 */

// Tipos de respuesta
export interface ExecutiveSummary {
  total_leads: number;
  leads_completos: number;
  leads_visitaron: number;
  locales_vendidos: number;
  revenue_total: number;
  total_locales: number;
  tasa_conversion: number;
  promedio_venta: number;
}

export interface ExecutiveFunnel {
  leads_captados: number;
  leads_completos: number;
  leads_visitaron: number;
  ventas: number;
  conversion_completos: number;
  conversion_visitaron: number;
  conversion_ventas: number;
}

export interface PipelineEstado {
  estado: 'verde' | 'amarillo' | 'naranja' | 'rojo';
  cantidad: number;
  valor_total: number;
}

export interface VendedorStats {
  vendedor_id: string;
  vendedor: string;
  leads_asignados: number;
  leads_visitaron: number;
  ventas_cerradas: number;
  monto_total: number;
  comisiones_pendientes: number;
  tasa_conversion: number;
}

export interface CanalStats {
  canal: string;
  leads: number;
  visitaron: number;
  compraron: number;
  conversion_visita: number;
  conversion_compra: number;
}

export interface FinancieroData {
  morosidad: {
    pagos_vencidos: number;
    monto_vencido: number;
    clientes_morosos: number;
    porcentaje_morosidad: number;
  };
  inicial_pendiente: {
    cantidad: number;
    monto_total: number;
  };
  proyeccion_mes: {
    pagos_esperados: number;
    monto_esperado: number;
  };
}

export interface ProyectoComparativa {
  proyecto_id: string;
  proyecto: string;
  leads: number;
  locales_total: number;
  locales_vendidos: number;
  ocupacion_porcentaje: number;
  revenue: number;
}

// Tipo genérico de respuesta
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Base URL (ajustar según environment)
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || '';

// Helper para construir query params
function buildQueryString(params: Record<string, string | undefined>): string {
  const filtered = Object.entries(params).filter(([_, value]) => value !== undefined);
  if (filtered.length === 0) return '';

  const queryParams = new URLSearchParams(
    filtered as [string, string][]
  );
  return `?${queryParams.toString()}`;
}

// Función genérica para hacer fetch
async function fetchAPI<T>(endpoint: string, params?: Record<string, string | undefined>): Promise<T> {
  const queryString = params ? buildQueryString(params) : '';
  const url = `${BASE_URL}${endpoint}${queryString}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<T> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'API error');
    }

    if (!result.data) {
      throw new Error('No data in response');
    }

    return result.data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Obtener KPIs principales
 * @param proyectoId UUID del proyecto (opcional)
 */
export async function getSummary(proyectoId?: string): Promise<ExecutiveSummary> {
  return fetchAPI<ExecutiveSummary>('/api/executive/summary', { proyecto_id: proyectoId });
}

/**
 * Obtener funnel de conversión
 * @param proyectoId UUID del proyecto (opcional)
 */
export async function getFunnel(proyectoId?: string): Promise<ExecutiveFunnel> {
  return fetchAPI<ExecutiveFunnel>('/api/executive/funnel', { proyecto_id: proyectoId });
}

/**
 * Obtener pipeline por estado de locales
 * @param proyectoId UUID del proyecto (opcional)
 */
export async function getPipeline(proyectoId?: string): Promise<PipelineEstado[]> {
  return fetchAPI<PipelineEstado[]>('/api/executive/pipeline', { proyecto_id: proyectoId });
}

/**
 * Obtener ranking de vendedores
 * @param proyectoId UUID del proyecto (opcional)
 */
export async function getVendedores(proyectoId?: string): Promise<VendedorStats[]> {
  return fetchAPI<VendedorStats[]>('/api/executive/vendedores', { proyecto_id: proyectoId });
}

/**
 * Obtener efectividad por canal UTM
 * IMPORTANTE: Agrupa "victoria" y números puros como "Victoria (IA)"
 * @param proyectoId UUID del proyecto (opcional)
 */
export async function getCanales(proyectoId?: string): Promise<CanalStats[]> {
  return fetchAPI<CanalStats[]>('/api/executive/canales', { proyecto_id: proyectoId });
}

/**
 * Obtener salud financiera
 * @param proyectoId UUID del proyecto (opcional)
 */
export async function getFinanciero(proyectoId?: string): Promise<FinancieroData> {
  return fetchAPI<FinancieroData>('/api/executive/financiero', { proyecto_id: proyectoId });
}

/**
 * Obtener comparativa de todos los proyectos activos
 * No requiere parámetros
 */
export async function getProyectos(): Promise<ProyectoComparativa[]> {
  return fetchAPI<ProyectoComparativa[]>('/api/executive/proyectos');
}

/**
 * Hook personalizado para cargar todos los datos del dashboard
 * Uso en componentes React:
 *
 * const { data, loading, error } = useExecutiveDashboard(proyectoId);
 */
export function useExecutiveDashboard(proyectoId?: string) {
  // Este hook se implementará con React hooks en el componente frontend
  // Por ahora, solo exportamos las funciones de fetch
  return {
    getSummary: () => getSummary(proyectoId),
    getFunnel: () => getFunnel(proyectoId),
    getPipeline: () => getPipeline(proyectoId),
    getVendedores: () => getVendedores(proyectoId),
    getCanales: () => getCanales(proyectoId),
    getFinanciero: () => getFinanciero(proyectoId),
    getProyectos: () => getProyectos(),
  };
}
