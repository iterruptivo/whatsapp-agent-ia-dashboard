'use server';

/**
 * Server Actions for Ventas IA Attribution System
 * Session 74 - Sistema de Atribución de Ventas IA
 *
 * Features:
 * - Import sales from Excel
 * - Match with Victoria leads
 * - Paginated queries
 * - Lazy load lead details
 */

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore - called from Server Component
          }
        },
      },
    }
  );
}

// ============================================================================
// TYPES
// ============================================================================

export interface VentaExternaRow {
  telefono: string;
  mes_venta: string;
  nombre_cliente?: string;
  monto_venta?: number;
  proyecto?: string;
  fecha_venta?: string;
  observaciones?: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  totalRows: number;
  inserted: number;
  duplicates: number;
  errors: number;
  matchesVictoria: number;
  matchesOtroUtm: number;
  sinLead: number;
  errorDetails: Array<{ row: number; telefono: string; error: string }>;
}

export interface VentasStats {
  total: number;
  victoria: number;
  otroUtm: number;
  sinLead: number;
  porcentajeVictoria: number;
  montoTotalVictoria: number;
  montoTotalOtros: number;
}

export interface VentaExterna {
  id: string;
  telefono: string;
  nombre_cliente: string | null;
  mes_venta: string;
  monto_venta: number | null;
  proyecto_nombre: string | null;
  lead_id: string | null;
  lead_utm: string | null;
  lead_nombre: string | null;
  match_type: 'victoria' | 'otro_utm' | 'sin_lead';
  created_at: string;
}

export interface LeadDetalle {
  id: string;
  nombre: string;
  telefono: string;
  email: string | null;
  utm: string;
  rubro: string | null;
  estado: string;
  created_at: string;
  proyecto_nombre: string | null;
  vendedor_nombre: string | null;
  conversacion: string | null;
  horario_visita: string | null;
  asistio: boolean | null;
  // Venta relacionada
  venta_mes: string | null;
  venta_monto: number | null;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clean phone number to standard format: 51 + 9 digits
 * Examples:
 * - "987654321" -> "51987654321"
 * - "+51 987 654 321" -> "51987654321"
 * - "(51) 987-654-321" -> "51987654321"
 * - "0051987654321" -> "51987654321"
 */
function cleanPhoneNumber(rawPhone: string): string {
  // Remove all non-digits
  let cleaned = String(rawPhone || '').replace(/\D/g, '');

  // Remove leading zeros (international prefix)
  cleaned = cleaned.replace(/^0+/, '');

  // If starts with 51 and has 11 digits, it's already correct
  if (cleaned.startsWith('51') && cleaned.length === 11) {
    return cleaned;
  }

  // If has 9 digits, add 51 prefix
  if (cleaned.length === 9) {
    return '51' + cleaned;
  }

  // If starts with 51 but has more digits, trim to 11
  if (cleaned.startsWith('51') && cleaned.length > 11) {
    return cleaned.substring(0, 11);
  }

  // If doesn't start with 51 but has 11+ digits starting with 9
  if (!cleaned.startsWith('51') && cleaned.length >= 9 && cleaned.startsWith('9')) {
    return '51' + cleaned.substring(0, 9);
  }

  // Return as-is if can't normalize (will likely fail validation)
  return cleaned;
}

/**
 * Normalize mes_venta to YYYY-MM format
 * Examples:
 * - "2025-01" -> "2025-01"
 * - "Enero 2025" -> "2025-01"
 * - "01/2025" -> "2025-01"
 * - "Ene 2025" -> "2025-01"
 */
function normalizeMesVenta(mes: string): string {
  const mesLower = String(mes || '').toLowerCase().trim();

  // Already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(mesLower)) {
    return mesLower;
  }

  // Format: MM/YYYY or MM-YYYY
  const mmYYYY = mesLower.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (mmYYYY) {
    return `${mmYYYY[2]}-${mmYYYY[1].padStart(2, '0')}`;
  }

  // Format: YYYY/MM or YYYY-MM
  const yyyyMM = mesLower.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (yyyyMM) {
    return `${yyyyMM[1]}-${yyyyMM[2].padStart(2, '0')}`;
  }

  // Month name mapping
  const meses: Record<string, string> = {
    enero: '01', ene: '01', january: '01', jan: '01',
    febrero: '02', feb: '02', february: '02',
    marzo: '03', mar: '03', march: '03',
    abril: '04', abr: '04', april: '04', apr: '04',
    mayo: '05', may: '05',
    junio: '06', jun: '06', june: '06',
    julio: '07', jul: '07', july: '07',
    agosto: '08', ago: '08', august: '08', aug: '08',
    septiembre: '09', sep: '09', sept: '09', september: '09',
    octubre: '10', oct: '10', october: '10',
    noviembre: '11', nov: '11', november: '11',
    diciembre: '12', dic: '12', december: '12', dec: '12',
  };

  // Format: "Mes YYYY" or "Mes. YYYY"
  for (const [nombre, num] of Object.entries(meses)) {
    const regex = new RegExp(`${nombre}\\.?\\s*(\\d{4})`, 'i');
    const match = mesLower.match(regex);
    if (match) {
      return `${match[1]}-${num}`;
    }
  }

  // Format: "YYYY Mes"
  for (const [nombre, num] of Object.entries(meses)) {
    const regex = new RegExp(`(\\d{4})\\s*${nombre}`, 'i');
    const match = mesLower.match(regex);
    if (match) {
      return `${match[1]}-${num}`;
    }
  }

  // Return original if can't parse (will show as-is)
  return mes.trim();
}

// ============================================================================
// IMPORT VENTAS
// ============================================================================

export async function importVentasExternas(
  ventas: VentaExternaRow[],
  archivoOrigen: string
): Promise<ImportResult> {
  const supabase = await getSupabaseServer();

  // Verify user is admin or jefe_ventas
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      message: 'No autenticado',
      totalRows: 0,
      inserted: 0,
      duplicates: 0,
      errors: 0,
      matchesVictoria: 0,
      matchesOtroUtm: 0,
      sinLead: 0,
      errorDetails: [],
    };
  }

  const { data: userData } = await supabase
    .from('usuarios')
    .select('id, nombre, rol')
    .eq('id', user.id)
    .single();

  if (!userData || !['admin', 'jefe_ventas'].includes(userData.rol)) {
    return {
      success: false,
      message: 'No tienes permisos para importar ventas',
      totalRows: ventas.length,
      inserted: 0,
      duplicates: 0,
      errors: 0,
      matchesVictoria: 0,
      matchesOtroUtm: 0,
      sinLead: 0,
      errorDetails: [],
    };
  }

  // Pre-load all existing phones for fast duplicate detection
  const { data: existingPhones } = await supabase
    .from('ventas_externas')
    .select('telefono');
  const existingSet = new Set(existingPhones?.map(p => p.telefono) || []);

  // Pre-load ALL leads for fast matching (paginated to avoid 1000 row limit)
  // IMPORTANT: Supabase hard limit is 1000 rows per query, we need to paginate
  const leadsMap = new Map<string, { id: string; utm: string; nombre: string; created_at: string }>();

  const PAGE_SIZE = 1000; // Supabase hard limit is 1000 rows
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: leadsPage, error: leadsError } = await supabase
      .from('leads')
      .select('id, telefono, utm, nombre, created_at')
      .not('telefono', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (leadsError) {
      console.error('[VENTAS IA] Error fetching leads page:', leadsError);
      break;
    }

    if (!leadsPage || leadsPage.length === 0) {
      hasMore = false;
    } else {
      // Prefer Victoria leads over non-Victoria when same phone exists
      leadsPage.forEach(lead => {
        if (lead.telefono) {
          const existing = leadsMap.get(lead.telefono);
          const currentUtm = (lead.utm || '').toLowerCase();
          const isCurrentVictoria = currentUtm === 'victoria' || /^\d+$/.test(lead.utm || '');

          if (!existing) {
            leadsMap.set(lead.telefono, {
              id: lead.id,
              utm: lead.utm || '',
              nombre: lead.nombre || '',
              created_at: lead.created_at,
            });
          } else {
            const existingUtm = existing.utm.toLowerCase();
            const isExistingVictoria = existingUtm === 'victoria' || /^\d+$/.test(existing.utm);
            // Prefer Victoria lead for attribution
            if (isCurrentVictoria && !isExistingVictoria) {
              leadsMap.set(lead.telefono, {
                id: lead.id,
                utm: lead.utm || '',
                nombre: lead.nombre || '',
                created_at: lead.created_at,
              });
            }
          }
        }
      });

      offset += PAGE_SIZE;
      hasMore = leadsPage.length === PAGE_SIZE;
    }
  }

  console.log('[VENTAS IA] Loaded', leadsMap.size, 'leads for matching');

  // Process results
  const result: ImportResult = {
    success: true,
    message: '',
    totalRows: ventas.length,
    inserted: 0,
    duplicates: 0,
    errors: 0,
    matchesVictoria: 0,
    matchesOtroUtm: 0,
    sinLead: 0,
    errorDetails: [],
  };

  // Process each row
  const toInsert: Array<{
    telefono: string;
    telefono_original: string;
    nombre_cliente: string | null;
    mes_venta: string;
    monto_venta: number | null;
    proyecto_nombre: string | null;
    observaciones: string | null;
    lead_id: string | null;
    lead_utm: string | null;
    lead_nombre: string | null;
    lead_fecha_creacion: string | null;
    match_type: string;
    match_timestamp: string;
    importado_por: string;
    importado_por_nombre: string;
    archivo_origen: string;
    fila_origen: number;
  }> = [];

  for (let i = 0; i < ventas.length; i++) {
    const venta = ventas[i];
    const rowNum = i + 2; // +2 for header and 0-index

    // Validate required fields
    if (!venta.telefono) {
      result.errors++;
      result.errorDetails.push({ row: rowNum, telefono: '', error: 'Teléfono vacío' });
      continue;
    }

    if (!venta.mes_venta) {
      result.errors++;
      result.errorDetails.push({ row: rowNum, telefono: venta.telefono, error: 'Mes de venta vacío' });
      continue;
    }

    // Clean phone
    const telefonoLimpio = cleanPhoneNumber(venta.telefono);

    // Validate phone format (must be 11 digits starting with 51)
    if (!/^51\d{9}$/.test(telefonoLimpio)) {
      result.errors++;
      result.errorDetails.push({
        row: rowNum,
        telefono: venta.telefono,
        error: `Formato inválido: ${telefonoLimpio} (debe ser 51 + 9 dígitos)`,
      });
      continue;
    }

    // Check duplicate
    if (existingSet.has(telefonoLimpio)) {
      result.duplicates++;
      continue;
    }

    // Add to existing set to prevent duplicates within same import
    existingSet.add(telefonoLimpio);

    // Match with lead
    const lead = leadsMap.get(telefonoLimpio);
    let matchType: 'victoria' | 'otro_utm' | 'sin_lead' = 'sin_lead';

    if (lead) {
      const utm = lead.utm.toLowerCase();
      // Victoria = UTM 'victoria' OR pure numbers (IA attribution)
      const isVictoria = utm === 'victoria' || /^\d+$/.test(lead.utm);
      if (isVictoria) {
        matchType = 'victoria';
        result.matchesVictoria++;
      } else {
        matchType = 'otro_utm';
        result.matchesOtroUtm++;
      }
    } else {
      result.sinLead++;
    }

    // Prepare insert data
    toInsert.push({
      telefono: telefonoLimpio,
      telefono_original: venta.telefono,
      nombre_cliente: venta.nombre_cliente || null,
      mes_venta: normalizeMesVenta(venta.mes_venta),
      monto_venta: venta.monto_venta || null,
      proyecto_nombre: venta.proyecto || null,
      observaciones: venta.observaciones || null,
      lead_id: lead?.id || null,
      lead_utm: lead?.utm || null,
      lead_nombre: lead?.nombre || null,
      lead_fecha_creacion: lead?.created_at || null,
      match_type: matchType,
      match_timestamp: new Date().toISOString(),
      importado_por: userData.id,
      importado_por_nombre: userData.nombre,
      archivo_origen: archivoOrigen,
      fila_origen: rowNum,
    });
  }

  // Batch insert
  if (toInsert.length > 0) {
    const { error } = await supabase.from('ventas_externas').insert(toInsert);

    if (error) {
      console.error('[VENTAS IA] Error inserting:', error);
      result.success = false;
      result.message = `Error al insertar: ${error.message}`;
      return result;
    }

    result.inserted = toInsert.length;
  }

  result.message = `Importación completada: ${result.inserted} nuevas, ${result.duplicates} duplicadas, ${result.errors} errores`;

  revalidatePath('/reporteria');

  return result;
}

// ============================================================================
// GET STATS
// ============================================================================

export async function getVentasStats(
  mesDesde?: string,
  mesHasta?: string
): Promise<VentasStats> {
  const supabase = await getSupabaseServer();

  let query = supabase.from('ventas_externas').select('match_type, monto_venta');

  // Apply date filters
  if (mesDesde) {
    query = query.gte('mes_venta', mesDesde);
  }
  if (mesHasta) {
    query = query.lte('mes_venta', mesHasta);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('[VENTAS IA] Error getting stats:', error);
    return {
      total: 0,
      victoria: 0,
      otroUtm: 0,
      sinLead: 0,
      porcentajeVictoria: 0,
      montoTotalVictoria: 0,
      montoTotalOtros: 0,
    };
  }

  const stats = {
    total: data.length,
    victoria: 0,
    otroUtm: 0,
    sinLead: 0,
    porcentajeVictoria: 0,
    montoTotalVictoria: 0,
    montoTotalOtros: 0,
  };

  data.forEach(row => {
    const monto = row.monto_venta || 0;
    if (row.match_type === 'victoria') {
      stats.victoria++;
      stats.montoTotalVictoria += monto;
    } else if (row.match_type === 'otro_utm') {
      stats.otroUtm++;
      stats.montoTotalOtros += monto;
    } else {
      stats.sinLead++;
      stats.montoTotalOtros += monto;
    }
  });

  stats.porcentajeVictoria = stats.total > 0
    ? Math.round((stats.victoria / stats.total) * 1000) / 10
    : 0;

  return stats;
}

// ============================================================================
// GET VENTAS (PAGINATED)
// ============================================================================

export async function getVentasPaginated(
  matchType: 'victoria' | 'otro_utm' | 'sin_lead' | 'all',
  page: number = 1,
  pageSize: number = 10,
  mesDesde?: string,
  mesHasta?: string
): Promise<PaginatedResult<VentaExterna>> {
  const supabase = await getSupabaseServer();

  // Count query
  let countQuery = supabase
    .from('ventas_externas')
    .select('*', { count: 'exact', head: true });

  if (matchType !== 'all') {
    countQuery = countQuery.eq('match_type', matchType);
  }
  if (mesDesde) {
    countQuery = countQuery.gte('mes_venta', mesDesde);
  }
  if (mesHasta) {
    countQuery = countQuery.lte('mes_venta', mesHasta);
  }

  const { count } = await countQuery;
  const totalCount = count || 0;

  // Data query with pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let dataQuery = supabase
    .from('ventas_externas')
    .select(`
      id,
      telefono,
      nombre_cliente,
      mes_venta,
      monto_venta,
      proyecto_nombre,
      lead_id,
      lead_utm,
      lead_nombre,
      match_type,
      created_at
    `)
    .order('mes_venta', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (matchType !== 'all') {
    dataQuery = dataQuery.eq('match_type', matchType);
  }
  if (mesDesde) {
    dataQuery = dataQuery.gte('mes_venta', mesDesde);
  }
  if (mesHasta) {
    dataQuery = dataQuery.lte('mes_venta', mesHasta);
  }

  const { data, error } = await dataQuery;

  if (error) {
    console.error('[VENTAS IA] Error getting ventas:', error);
    return {
      data: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  return {
    data: (data || []) as VentaExterna[],
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

// ============================================================================
// GET LEAD DETAIL (LAZY LOAD FOR MODAL)
// ============================================================================

export async function getLeadDetalleParaVenta(
  leadId: string,
  ventaId: string
): Promise<LeadDetalle | null> {
  // Use service role to bypass RLS - reporteria needs access to all projects
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseServiceKey) {
    console.error('[VENTAS IA] SUPABASE_SERVICE_ROLE_KEY no está configurada');
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Get lead data
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(`
      id,
      nombre,
      telefono,
      email,
      utm,
      rubro,
      estado,
      created_at,
      horario_visita,
      asistio,
      proyecto_id,
      historial_conversacion
    `)
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    console.error('[VENTAS IA] Error getting lead:', leadError);
    return null;
  }

  // Get project name
  let proyectoNombre: string | null = null;
  if (lead.proyecto_id) {
    const { data: proyecto } = await supabase
      .from('proyectos')
      .select('nombre')
      .eq('id', lead.proyecto_id)
      .single();
    proyectoNombre = proyecto?.nombre || null;
  }

  // Get assigned vendor name (from vendedores table via lead)
  let vendedorNombre: string | null = null;
  const { data: leadWithVendedor } = await supabase
    .from('leads')
    .select('vendedor_asignado_id')
    .eq('id', leadId)
    .single();

  if (leadWithVendedor?.vendedor_asignado_id) {
    const { data: vendedor } = await supabase
      .from('vendedores')
      .select('nombre')
      .eq('id', leadWithVendedor.vendedor_asignado_id)
      .single();
    vendedorNombre = vendedor?.nombre || null;
  }

  // Get venta data
  const { data: venta } = await supabase
    .from('ventas_externas')
    .select('mes_venta, monto_venta')
    .eq('id', ventaId)
    .single();

  return {
    id: lead.id,
    nombre: lead.nombre || 'Sin nombre',
    telefono: lead.telefono,
    email: lead.email,
    utm: lead.utm || '',
    rubro: lead.rubro,
    estado: lead.estado || '',
    created_at: lead.created_at,
    proyecto_nombre: proyectoNombre,
    vendedor_nombre: vendedorNombre,
    conversacion: lead.historial_conversacion || null,
    horario_visita: lead.horario_visita,
    asistio: lead.asistio,
    venta_mes: venta?.mes_venta || null,
    venta_monto: venta?.monto_venta || null,
  };
}

// ============================================================================
// GET STATS BY MONTH (FOR CHART)
// ============================================================================

export async function getVentasStatsByMonth(
  mesDesde?: string,
  mesHasta?: string
): Promise<Array<{ mes: string; victoria: number; otros: number; sinLead: number }>> {
  const supabase = await getSupabaseServer();

  let query = supabase
    .from('ventas_externas')
    .select('mes_venta, match_type');

  if (mesDesde) {
    query = query.gte('mes_venta', mesDesde);
  }
  if (mesHasta) {
    query = query.lte('mes_venta', mesHasta);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('[VENTAS IA] Error getting stats by month:', error);
    return [];
  }

  // Group by month
  const byMonth = new Map<string, { victoria: number; otros: number; sinLead: number }>();

  data.forEach(row => {
    const mes = row.mes_venta;
    if (!byMonth.has(mes)) {
      byMonth.set(mes, { victoria: 0, otros: 0, sinLead: 0 });
    }
    const stats = byMonth.get(mes)!;
    if (row.match_type === 'victoria') {
      stats.victoria++;
    } else if (row.match_type === 'otro_utm') {
      stats.otros++;
    } else {
      stats.sinLead++;
    }
  });

  // Convert to array and sort by month
  return Array.from(byMonth.entries())
    .map(([mes, stats]) => ({ mes, ...stats }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

// ============================================================================
// GET AVAILABLE MONTHS (FOR FILTER)
// ============================================================================

export async function getAvailableMonths(): Promise<string[]> {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from('ventas_externas')
    .select('mes_venta')
    .order('mes_venta', { ascending: false });

  if (error || !data) {
    return [];
  }

  // Get unique months
  const uniqueMonths = [...new Set(data.map(d => d.mes_venta))];
  return uniqueMonths;
}

// ============================================================================
// RE-PROCESS VENTAS (FIX MATCHING)
// ============================================================================

export interface ReprocessResult {
  success: boolean;
  message: string;
  total: number;
  updated: number;
  newVictoria: number;
  newOtroUtm: number;
  stillSinLead: number;
}

/**
 * Re-process all ventas_externas to fix matching.
 * This is needed because the original import had a bug where only 1000 leads were loaded.
 * Now we load ALL leads and re-match.
 */
export async function reprocessVentasExternas(): Promise<ReprocessResult> {
  const supabase = await getSupabaseServer();

  // Verify user is admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      message: 'No autenticado',
      total: 0,
      updated: 0,
      newVictoria: 0,
      newOtroUtm: 0,
      stillSinLead: 0,
    };
  }

  const { data: userData } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (userData?.rol !== 'admin') {
    return {
      success: false,
      message: 'Solo administradores pueden re-procesar ventas',
      total: 0,
      updated: 0,
      newVictoria: 0,
      newOtroUtm: 0,
      stillSinLead: 0,
    };
  }

  // Load ALL leads (paginated with 1000 limit - Supabase max)
  const leadsMap = new Map<string, { id: string; utm: string; nombre: string; created_at: string }>();
  const PAGE_SIZE = 1000; // Supabase hard limit
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: leadsPage, error: leadsError } = await supabase
      .from('leads')
      .select('id, telefono, utm, nombre, created_at')
      .not('telefono', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (leadsError) {
      console.error('[REPROCESS] Error fetching leads:', leadsError);
      break;
    }

    if (!leadsPage || leadsPage.length === 0) {
      hasMore = false;
    } else {
      // Prefer Victoria leads over non-Victoria when same phone exists
      leadsPage.forEach(lead => {
        if (lead.telefono) {
          const existing = leadsMap.get(lead.telefono);
          const currentUtm = (lead.utm || '').toLowerCase();
          const isCurrentVictoria = currentUtm === 'victoria' || /^\d+$/.test(lead.utm || '');

          if (!existing) {
            leadsMap.set(lead.telefono, {
              id: lead.id,
              utm: lead.utm || '',
              nombre: lead.nombre || '',
              created_at: lead.created_at,
            });
          } else {
            const existingUtm = existing.utm.toLowerCase();
            const isExistingVictoria = existingUtm === 'victoria' || /^\d+$/.test(existing.utm);
            // Prefer Victoria lead for attribution
            if (isCurrentVictoria && !isExistingVictoria) {
              leadsMap.set(lead.telefono, {
                id: lead.id,
                utm: lead.utm || '',
                nombre: lead.nombre || '',
                created_at: lead.created_at,
              });
            }
          }
        }
      });
      offset += PAGE_SIZE;
      hasMore = leadsPage.length === PAGE_SIZE;
    }
  }

  console.log('[REPROCESS] Loaded', leadsMap.size, 'leads');

  // Get all ventas_externas
  const { data: ventas, error: ventasError } = await supabase
    .from('ventas_externas')
    .select('id, telefono, match_type, lead_id');

  if (ventasError || !ventas) {
    return {
      success: false,
      message: 'Error al obtener ventas: ' + ventasError?.message,
      total: 0,
      updated: 0,
      newVictoria: 0,
      newOtroUtm: 0,
      stillSinLead: 0,
    };
  }

  const result: ReprocessResult = {
    success: true,
    message: '',
    total: ventas.length,
    updated: 0,
    newVictoria: 0,
    newOtroUtm: 0,
    stillSinLead: 0,
  };

  // Process each venta
  for (const venta of ventas) {
    const lead = leadsMap.get(venta.telefono);
    let newMatchType: 'victoria' | 'otro_utm' | 'sin_lead' = 'sin_lead';
    let newLeadId: string | null = null;
    let newLeadUtm: string | null = null;
    let newLeadNombre: string | null = null;
    let newLeadFecha: string | null = null;

    if (lead) {
      const utm = lead.utm.toLowerCase();
      // Victoria = UTM 'victoria' OR pure numbers (IA attribution)
      const isVictoria = utm === 'victoria' || /^\d+$/.test(lead.utm);
      newMatchType = isVictoria ? 'victoria' : 'otro_utm';
      newLeadId = lead.id;
      newLeadUtm = lead.utm;
      newLeadNombre = lead.nombre;
      newLeadFecha = lead.created_at;
    }

    // Only update if something changed
    if (
      newMatchType !== venta.match_type ||
      newLeadId !== venta.lead_id
    ) {
      const { error: updateError } = await supabase
        .from('ventas_externas')
        .update({
          lead_id: newLeadId,
          lead_utm: newLeadUtm,
          lead_nombre: newLeadNombre,
          lead_fecha_creacion: newLeadFecha,
          match_type: newMatchType,
          match_timestamp: new Date().toISOString(),
        })
        .eq('id', venta.id);

      if (!updateError) {
        result.updated++;
      }
    }

    // Count final stats
    if (newMatchType === 'victoria') {
      result.newVictoria++;
    } else if (newMatchType === 'otro_utm') {
      result.newOtroUtm++;
    } else {
      result.stillSinLead++;
    }
  }

  result.message = `Re-procesadas ${result.total} ventas. Victoria: ${result.newVictoria}, Otro UTM: ${result.newOtroUtm}, Sin Lead: ${result.stillSinLead}`;

  revalidatePath('/reporteria');

  return result;
}
