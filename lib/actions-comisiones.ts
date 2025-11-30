'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface Comision {
  id: string;
  control_pago_id: string;
  local_id: string;
  usuario_id: string;
  rol_usuario: string;
  fase: 'vendedor' | 'gestion';
  porcentaje_comision: number;
  monto_venta: number;
  monto_comision: number;
  estado: 'pendiente_inicial' | 'disponible' | 'pagada';
  fecha_procesado: string;
  fecha_disponible: string | null;
  fecha_inicial_completa: string | null;
  fecha_pago_comision: string | null;
  pagado_por: string | null;
  created_at: string;
  updated_at: string;
  local_codigo?: string;
  proyecto_nombre?: string;
  usuario_nombre?: string;
}

export interface ComisionStats {
  total_generado: number;
  disponible: number;
  pagado: number;
  pendiente_inicial: number;
  count_total: number;
  count_disponible: number;
  count_pagado: number;
  count_pendiente: number;
}

export async function getComisionesByUsuario(usuarioId: string): Promise<Comision[]> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  try {
    // Fetch comisiones
    const { data: comisiones, error } = await supabase
      .from('comisiones')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('fecha_procesado', { ascending: false });

    if (error || !comisiones) {
      console.error('[COMISIONES] Error:', error);
      return [];
    }

    // Fetch related data separately
    const localIds = [...new Set(comisiones.map(c => c.local_id))];
    const usuarioIds = [...new Set(comisiones.map(c => c.usuario_id))];

    const [{ data: locales }, { data: usuarios }] = await Promise.all([
      supabase.from('locales').select('id, codigo, proyecto_id').in('id', localIds),
      supabase.from('usuarios').select('id, nombre').in('id', usuarioIds),
    ]);

    // Fetch proyectos
    const proyectoIds = [...new Set(locales?.map(l => l.proyecto_id).filter(Boolean) || [])];
    const { data: proyectos } = await supabase
      .from('proyectos')
      .select('id, nombre')
      .in('id', proyectoIds);

    // Map comisiones with related data
    return comisiones.map((c: any) => {
      const local = locales?.find(l => l.id === c.local_id);
      const proyecto = proyectos?.find(p => p.id === local?.proyecto_id);
      const usuario = usuarios?.find(u => u.id === c.usuario_id);

      return {
        ...c,
        local_codigo: local?.codigo,
        proyecto_nombre: proyecto?.nombre,
        usuario_nombre: usuario?.nombre,
      };
    });
  } catch (error) {
    console.error('[COMISIONES] Error:', error);
    return [];
  }
}

export async function getAllComisiones(): Promise<Comision[]> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!usuario || !['admin', 'jefe_ventas'].includes(usuario.rol)) {
      return [];
    }

    // Fetch comisiones
    const { data: comisiones, error } = await supabase
      .from('comisiones')
      .select('*')
      .order('fecha_procesado', { ascending: false});

    if (error || !comisiones) {
      console.error('[COMISIONES] Error:', error);
      return [];
    }

    // Fetch related data separately
    const localIds = [...new Set(comisiones.map(c => c.local_id))];
    const usuarioIds = [...new Set(comisiones.map(c => c.usuario_id))];

    const [{ data: locales }, { data: usuarios }] = await Promise.all([
      supabase.from('locales').select('id, codigo, proyecto_id').in('id', localIds),
      supabase.from('usuarios').select('id, nombre').in('id', usuarioIds),
    ]);

    // Fetch proyectos
    const proyectoIds = [...new Set(locales?.map(l => l.proyecto_id).filter(Boolean) || [])];
    const { data: proyectos } = await supabase
      .from('proyectos')
      .select('id, nombre')
      .in('id', proyectoIds);

    // Map comisiones with related data
    return comisiones.map((c: any) => {
      const local = locales?.find(l => l.id === c.local_id);
      const proyecto = proyectos?.find(p => p.id === local?.proyecto_id);
      const usuario = usuarios?.find(u => u.id === c.usuario_id);

      return {
        ...c,
        local_codigo: local?.codigo,
        proyecto_nombre: proyecto?.nombre,
        usuario_nombre: usuario?.nombre,
      };
    });
  } catch (error) {
    console.error('[COMISIONES] Error:', error);
    return [];
  }
}

export async function getComisionStats(usuarioId: string): Promise<ComisionStats> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  try {
    const { data: comisiones } = await supabase
      .from('comisiones')
      .select('*')
      .eq('usuario_id', usuarioId);

    if (!comisiones || comisiones.length === 0) {
      return {
        total_generado: 0,
        disponible: 0,
        pagado: 0,
        pendiente_inicial: 0,
        count_total: 0,
        count_disponible: 0,
        count_pagado: 0,
        count_pendiente: 0,
      };
    }

    const total_generado = comisiones.reduce((sum, c) => sum + c.monto_comision, 0);
    const disponible = comisiones
      .filter(c => c.estado === 'disponible')
      .reduce((sum, c) => sum + c.monto_comision, 0);
    const pagado = comisiones
      .filter(c => c.estado === 'pagada')
      .reduce((sum, c) => sum + c.monto_comision, 0);
    const pendiente_inicial = comisiones
      .filter(c => c.estado === 'pendiente_inicial')
      .reduce((sum, c) => sum + c.monto_comision, 0);

    return {
      total_generado,
      disponible,
      pagado,
      pendiente_inicial,
      count_total: comisiones.length,
      count_disponible: comisiones.filter(c => c.estado === 'disponible').length,
      count_pagado: comisiones.filter(c => c.estado === 'pagada').length,
      count_pendiente: comisiones.filter(c => c.estado === 'pendiente_inicial').length,
    };
  } catch (error) {
    console.error('[COMISIONES STATS] Error:', error);
    return {
      total_generado: 0,
      disponible: 0,
      pagado: 0,
      pendiente_inicial: 0,
      count_total: 0,
      count_disponible: 0,
      count_pagado: 0,
      count_pendiente: 0,
    };
  }
}

export async function getAllComisionStats(): Promise<ComisionStats> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  try {
    // Validar que el usuario sea admin o jefe_ventas
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {
      total_generado: 0,
      disponible: 0,
      pagado: 0,
      pendiente_inicial: 0,
      count_total: 0,
      count_disponible: 0,
      count_pagado: 0,
      count_pendiente: 0,
    };

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!usuario || !['admin', 'jefe_ventas'].includes(usuario.rol)) {
      return {
        total_generado: 0,
        disponible: 0,
        pagado: 0,
        pendiente_inicial: 0,
        count_total: 0,
        count_disponible: 0,
        count_pagado: 0,
        count_pendiente: 0,
      };
    }

    // Fetch TODAS las comisiones (sin filtro por usuario)
    const { data: comisiones } = await supabase
      .from('comisiones')
      .select('*');

    if (!comisiones || comisiones.length === 0) {
      return {
        total_generado: 0,
        disponible: 0,
        pagado: 0,
        pendiente_inicial: 0,
        count_total: 0,
        count_disponible: 0,
        count_pagado: 0,
        count_pendiente: 0,
      };
    }

    // Calcular stats consolidados
    const total_generado = comisiones.reduce((sum, c) => sum + c.monto_comision, 0);
    const disponible = comisiones
      .filter(c => c.estado === 'disponible')
      .reduce((sum, c) => sum + c.monto_comision, 0);
    const pagado = comisiones
      .filter(c => c.estado === 'pagada')
      .reduce((sum, c) => sum + c.monto_comision, 0);
    const pendiente_inicial = comisiones
      .filter(c => c.estado === 'pendiente_inicial')
      .reduce((sum, c) => sum + c.monto_comision, 0);

    return {
      total_generado,
      disponible,
      pagado,
      pendiente_inicial,
      count_total: comisiones.length,
      count_disponible: comisiones.filter(c => c.estado === 'disponible').length,
      count_pagado: comisiones.filter(c => c.estado === 'pagada').length,
      count_pendiente: comisiones.filter(c => c.estado === 'pendiente_inicial').length,
    };
  } catch (error) {
    console.error('[ALL COMISIONES STATS] Error:', error);
    return {
      total_generado: 0,
      disponible: 0,
      pagado: 0,
      pendiente_inicial: 0,
      count_total: 0,
      count_disponible: 0,
      count_pagado: 0,
      count_pendiente: 0,
    };
  }
}

export async function marcarComisionPagada(comisionId: string, adminId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'No autenticado' };
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!usuario || usuario.rol !== 'admin') {
      return { success: false, message: 'Solo admin puede marcar comisiones como pagadas' };
    }

    const { error } = await supabase
      .from('comisiones')
      .update({
        estado: 'pagada',
        fecha_pago_comision: new Date().toISOString(),
        pagado_por: adminId,
      })
      .eq('id', comisionId);

    if (error) {
      console.error('[COMISION PAGADA] Error:', error);
      return { success: false, message: 'Error al marcar comisión como pagada' };
    }

    return { success: true, message: 'Comisión marcada como pagada' };
  } catch (error) {
    console.error('[COMISION PAGADA] Error:', error);
    return { success: false, message: 'Error inesperado' };
  }
}

export async function updatePorcentajeComision(
  comisionId: string,
  nuevoPorcentaje: number,
  adminId: string
) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: 'No autenticado' };
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();

    if (!usuario || usuario.rol !== 'admin') {
      return { success: false, message: 'Solo admin puede modificar porcentajes' };
    }

    const { data: comision } = await supabase
      .from('comisiones')
      .select('monto_venta')
      .eq('id', comisionId)
      .single();

    if (!comision) {
      return { success: false, message: 'Comisión no encontrada' };
    }

    const nuevoMontoComision = (comision.monto_venta * nuevoPorcentaje) / 100;

    const { error } = await supabase
      .from('comisiones')
      .update({
        porcentaje_comision: nuevoPorcentaje,
        monto_comision: nuevoMontoComision,
      })
      .eq('id', comisionId);

    if (error) {
      console.error('[UPDATE PORCENTAJE] Error:', error);
      return { success: false, message: 'Error al actualizar porcentaje' };
    }

    return { success: true, message: 'Porcentaje actualizado' };
  } catch (error) {
    console.error('[UPDATE PORCENTAJE] Error:', error);
    return { success: false, message: 'Error inesperado' };
  }
}

// ============================================================================
// QUERIES - TRAZABILIDAD DE COMISIONES
// ============================================================================

export interface ComisionConTrazabilidad extends Comision {
  vendedor_lead_nombre?: string;  // Vendedor asignado al lead (de locales_leads)
  usuario_naranja_nombre?: string;
  usuario_rojo_nombre?: string;
  usuario_procesado_nombre?: string;
}

export async function getComisionesByLocalId(localId: string): Promise<ComisionConTrazabilidad[]> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
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

  try {
    // Fetch comisiones del local
    const { data: comisiones, error: comisionesError } = await supabase
      .from('comisiones')
      .select('*')
      .eq('local_id', localId)
      .order('fase', { ascending: true }); // vendedor primero, gestión después

    if (comisionesError || !comisiones) {
      console.error('[GET COMISIONES BY LOCAL] Error:', comisionesError);
      return [];
    }

    // Fetch datos del local con trazabilidad
    const { data: local, error: localError } = await supabase
      .from('locales')
      .select('usuario_paso_naranja_id, usuario_paso_rojo_id')
      .eq('id', localId)
      .single();

    if (localError || !local) {
      console.error('[GET LOCAL TRAZABILIDAD] Error:', localError);
      return comisiones; // Retornar comisiones sin trazabilidad
    }

    // Fetch locales_leads para obtener vendedor asignado al lead
    const { data: localLead } = await supabase
      .from('locales_leads')
      .select('vendedor_id')
      .eq('local_id', localId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch control_pagos para obtener procesado_por
    const { data: controlPago } = await supabase
      .from('control_pagos')
      .select('procesado_por')
      .eq('local_id', localId)
      .single();

    // Recopilar todos los IDs de usuarios únicos
    const usuarioIds = new Set<string>();
    if (local.usuario_paso_naranja_id) usuarioIds.add(local.usuario_paso_naranja_id);
    if (local.usuario_paso_rojo_id) usuarioIds.add(local.usuario_paso_rojo_id);
    if (controlPago?.procesado_por) usuarioIds.add(controlPago.procesado_por);
    comisiones.forEach(c => { if (c.usuario_id) usuarioIds.add(c.usuario_id); });

    // Fetch nombres de todos los usuarios (por id)
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id, nombre, vendedor_id')
      .in('id', Array.from(usuarioIds));

    const usuariosMap = new Map(usuarios?.map(u => [u.id, u.nombre]) || []);

    // Buscar nombre del vendedor asignado al lead (por vendedor_id, no por id)
    let vendedorLeadNombre: string | undefined;
    if (localLead?.vendedor_id) {
      const { data: usuarioVendedor } = await supabase
        .from('usuarios')
        .select('nombre')
        .eq('vendedor_id', localLead.vendedor_id)
        .single();
      vendedorLeadNombre = usuarioVendedor?.nombre;
    }

    // Mapear comisiones con trazabilidad
    return comisiones.map((c: any) => ({
      ...c,
      usuario_nombre: usuariosMap.get(c.usuario_id),
      vendedor_lead_nombre: vendedorLeadNombre,
      usuario_naranja_nombre: local.usuario_paso_naranja_id ? usuariosMap.get(local.usuario_paso_naranja_id) : undefined,
      usuario_rojo_nombre: local.usuario_paso_rojo_id ? usuariosMap.get(local.usuario_paso_rojo_id) : undefined,
      usuario_procesado_nombre: controlPago?.procesado_por ? usuariosMap.get(controlPago.procesado_por) : undefined,
    }));
  } catch (error) {
    console.error('[GET COMISIONES BY LOCAL] Error:', error);
    return [];
  }
}
