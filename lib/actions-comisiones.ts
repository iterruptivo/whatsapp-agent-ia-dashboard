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
      },
    }
  );

  try {
    const { data: comisiones, error } = await supabase
      .from('comisiones')
      .select(`
        *,
        local_codigo:locales(codigo),
        proyecto_nombre:locales(proyectos(nombre)),
        usuario_nombre:usuarios(nombre)
      `)
      .eq('usuario_id', usuarioId)
      .order('fecha_procesado', { ascending: false });

    if (error) {
      console.error('[COMISIONES] Error:', error);
      return [];
    }

    return (comisiones || []).map((c: any) => ({
      ...c,
      local_codigo: c.local_codigo?.codigo,
      proyecto_nombre: c.proyecto_nombre?.nombre,
      usuario_nombre: c.usuario_nombre?.nombre,
    }));
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

    const { data: comisiones, error } = await supabase
      .from('comisiones')
      .select(`
        *,
        local_codigo:locales(codigo),
        proyecto_nombre:locales(proyectos(nombre)),
        usuario_nombre:usuarios(nombre)
      `)
      .order('fecha_procesado', { ascending: false });

    if (error) {
      console.error('[COMISIONES] Error:', error);
      return [];
    }

    return (comisiones || []).map((c: any) => ({
      ...c,
      local_codigo: c.local_codigo?.codigo,
      proyecto_nombre: c.proyecto_nombre?.nombre,
      usuario_nombre: c.usuario_nombre?.nombre,
    }));
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
