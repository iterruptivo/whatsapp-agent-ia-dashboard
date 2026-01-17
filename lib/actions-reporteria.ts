'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Proyecto, Usuario } from './db';

// Helper para crear cliente Supabase con contexto de servidor
async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', options);
        },
      },
    }
  );
}

// ============================================================================
// REPORTERIA: Datos de vendedores multi-proyecto
// ============================================================================

export interface ProyectoLeads {
  proyecto_id: string;
  proyecto_nombre: string;
  proyecto_color: string | null;
  leadsManuales: number;
  leadsAutomaticos: number;
  total: number;
}

export interface VendedorReporteriaRow {
  vendedor_id: string;
  nombre: string;
  rol: 'vendedor' | 'vendedor_caseta' | 'coordinador';
  proyectos: ProyectoLeads[]; // Array con datos de CADA proyecto
  totalGeneral: number; // Suma de todos los proyectos
}

// Legacy interface - mantener para backward compatibility
export interface VendedorReporteriaData {
  id: string;
  nombre: string;
  rol: 'vendedor' | 'vendedor_caseta' | 'coordinador';
  proyecto_id: string;
  proyecto_nombre: string;
  proyecto_color: string | null;
  leadsManuales: number;
  leadsAutomaticos: number;
  total: number;
}

export interface ReporteriaFilters {
  proyectoId?: string | null; // null = todos los proyectos
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  searchTerm?: string; // buscar por nombre de usuario
}

/**
 * Obtiene datos de vendedores con leads de TODOS los proyectos activos
 * Retorna una matriz vendedor × proyecto (cada vendedor tiene array de proyectos)
 */
export async function getReporteriaData(filters: ReporteriaFilters = {}): Promise<VendedorReporteriaRow[]> {
  try {
    const supabase = await createSupabaseServer();
    const { proyectoId, dateFrom, dateTo, searchTerm } = filters;

    // STEP 1: Obtener todos los proyectos activos
    const { data: proyectosData, error: proyectosError } = await supabase
      .from('proyectos')
      .select('id, nombre, color')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (proyectosError) {
      console.error('[REPORTERIA] Error fetching proyectos:', proyectosError);
      return [];
    }

    const proyectos = proyectosData || [];
    const proyectosMap = new Map(proyectos.map(p => [p.id, p]));

    // Si hay filtro de proyecto, solo usar ese proyecto
    const proyectosToUse = proyectoId
      ? proyectos.filter(p => p.id === proyectoId)
      : proyectos;

    console.log(`[REPORTERIA] Proyectos activos: ${proyectos.length}`);
    console.log(`[REPORTERIA] Proyectos a usar (con filtro): ${proyectosToUse.length}`);

    // STEP 2: Obtener todos los usuarios con rol vendedor, vendedor_caseta o coordinador
    // NOTA: Coordinadores también pueden vender, por eso se incluyen en reportería
    let usuariosQuery = supabase
      .from('usuarios')
      .select('id, nombre, rol, vendedor_id')
      .eq('activo', true)
      .in('rol', ['vendedor', 'vendedor_caseta', 'coordinador'])
      .order('nombre', { ascending: true });

    const { data: usuariosData, error: usuariosError } = await usuariosQuery;

    if (usuariosError) {
      console.error('[REPORTERIA] Error fetching usuarios:', usuariosError);
      return [];
    }

    const usuarios = usuariosData || [];

    // Filtrar por searchTerm si se proporciona
    const filteredUsuarios = searchTerm
      ? usuarios.filter(u => u.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
      : usuarios;

    console.log(`[REPORTERIA] Usuarios vendedores totales: ${usuarios.length}`);
    console.log(`[REPORTERIA] Usuarios después de filtro búsqueda: ${filteredUsuarios.length}`);

    // STEP 3: Crear estructura vacía - cada vendedor con todos los proyectos en 0
    const vendedoresMap = new Map<string, VendedorReporteriaRow>();

    for (const usuario of filteredUsuarios) {
      if (!usuario.vendedor_id) continue;

      const proyectosArray: ProyectoLeads[] = proyectosToUse.map(proyecto => ({
        proyecto_id: proyecto.id,
        proyecto_nombre: proyecto.nombre,
        proyecto_color: proyecto.color,
        leadsManuales: 0,
        leadsAutomaticos: 0,
        total: 0,
      }));

      vendedoresMap.set(usuario.vendedor_id, {
        vendedor_id: usuario.vendedor_id,
        nombre: usuario.nombre,
        rol: usuario.rol as 'vendedor' | 'vendedor_caseta',
        proyectos: proyectosArray,
        totalGeneral: 0,
      });
    }

    // STEP 4: Obtener leads con filtros
    // Usamos keyset pagination para manejar grandes volúmenes
    const allLeads: any[] = [];
    let hasMore = true;
    let lastCreatedAt: string | null = null;
    const BATCH_SIZE = 1000;
    let batchNumber = 0;
    const MAX_BATCHES = 20; // Límite de seguridad: máximo 20,000 leads

    console.log('[REPORTERIA] Starting leads fetch with filters:', { proyectoId, dateFrom, dateTo });

    while (hasMore && batchNumber < MAX_BATCHES) {
      batchNumber++;

      let leadsQuery = supabase
        .from('leads')
        .select('id, vendedor_asignado_id, proyecto_id, estado, fecha_captura, created_at')
        .order('created_at', { ascending: false })
        .limit(BATCH_SIZE);

      // Filtrar por proyecto si se especifica
      if (proyectoId) {
        leadsQuery = leadsQuery.eq('proyecto_id', proyectoId);
      }

      // Filtrar por rango de fechas
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        leadsQuery = leadsQuery.gte('fecha_captura', fromDate.toISOString());
      }

      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        leadsQuery = leadsQuery.lte('fecha_captura', toDate.toISOString());
      }

      // Keyset pagination - usar lt para obtener siguientes registros
      if (lastCreatedAt) {
        leadsQuery = leadsQuery.lt('created_at', lastCreatedAt);
      }

      const { data: batchData, error: batchError } = await leadsQuery;

      if (batchError) {
        console.error('[REPORTERIA] Error fetching leads batch:', batchError);
        break;
      }

      const batchCount = batchData?.length || 0;
      console.log(`[REPORTERIA] Batch ${batchNumber}: ${batchCount} leads fetched`);

      if (batchCount === 0) {
        hasMore = false;
      } else {
        allLeads.push(...batchData);

        if (batchCount < BATCH_SIZE) {
          hasMore = false;
        } else {
          lastCreatedAt = batchData[batchData.length - 1].created_at;
        }
      }
    }

    console.log(`[REPORTERIA] Total leads fetched: ${allLeads.length}`);

    // STEP 5: Sumar leads a las celdas correspondientes
    let leadsProcessed = 0;
    let leadsSkipped = 0;

    for (const lead of allLeads) {
      if (!lead.vendedor_asignado_id) {
        leadsSkipped++;
        continue;
      }

      const vendedorRow = vendedoresMap.get(lead.vendedor_asignado_id);
      if (!vendedorRow) {
        leadsSkipped++;
        continue;
      }

      const proyectoIndex = vendedorRow.proyectos.findIndex(p => p.proyecto_id === lead.proyecto_id);
      if (proyectoIndex === -1) {
        leadsSkipped++;
        continue;
      }

      const isManual = lead.estado === 'lead_manual';

      if (isManual) {
        vendedorRow.proyectos[proyectoIndex].leadsManuales++;
      } else {
        vendedorRow.proyectos[proyectoIndex].leadsAutomaticos++;
      }
      vendedorRow.proyectos[proyectoIndex].total++;
      vendedorRow.totalGeneral++;
      leadsProcessed++;
    }

    console.log(`[REPORTERIA] Leads processed: ${leadsProcessed}`);
    console.log(`[REPORTERIA] Leads skipped: ${leadsSkipped}`);

    // STEP 6: Convertir a array y ordenar por totalGeneral descendente
    const result = Array.from(vendedoresMap.values()).sort((a, b) => b.totalGeneral - a.totalGeneral);

    console.log(`[REPORTERIA] Vendedores en resultado final: ${result.length}`);

    return result;
  } catch (error) {
    console.error('[REPORTERIA] Error in getReporteriaData:', error);
    return [];
  }
}

/**
 * Obtiene la lista de proyectos activos para el dropdown de filtro
 */
export async function getProyectosForFilter(): Promise<Proyecto[]> {
  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
      .from('proyectos')
      .select('id, nombre, slug, color, activo')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('[REPORTERIA] Error fetching proyectos for filter:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[REPORTERIA] Error in getProyectosForFilter:', error);
    return [];
  }
}

/**
 * Obtener solo proyectos que tienen fichas de inscripción
 * La tabla de fichas es 'clientes_ficha' con relación a 'locales' vía local_id
 */
export async function getProyectosConFichas(): Promise<Proyecto[]> {
  try {
    const supabase = await createSupabaseServer();

    // Obtener IDs de proyectos que tienen fichas (usando clientes_ficha)
    const { data: fichasData, error: fichasError } = await supabase
      .from('clientes_ficha')
      .select('locales!inner(proyecto_id)');

    if (fichasError) {
      console.error('[REPORTERIA] Error fetching fichas for proyectos filter:', fichasError);
      return [];
    }

    // Extraer IDs únicos de proyectos
    const proyectoIds = [...new Set(
      (fichasData || [])
        .map((f: any) => f.locales?.proyecto_id)
        .filter((id: string | null | undefined) => id != null)
    )];

    if (proyectoIds.length === 0) {
      return [];
    }

    // Obtener los proyectos
    const { data, error } = await supabase
      .from('proyectos')
      .select('id, nombre, slug, color, activo')
      .in('id', proyectoIds)
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('[REPORTERIA] Error fetching proyectos con fichas:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[REPORTERIA] Error in getProyectosConFichas:', error);
    return [];
  }
}
