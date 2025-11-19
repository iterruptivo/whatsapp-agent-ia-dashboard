import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const telefono = searchParams.get('telefono');

    if (!telefono) {
      return NextResponse.json(
        { found: false, error: 'Teléfono requerido' },
        { status: 400 }
      );
    }

    // Buscar lead por teléfono con JOIN a proyecto
    const { data: lead, error } = await supabase
      .from('leads')
      .select(`
        id,
        nombre,
        email,
        proyecto_id,
        proyecto_nombre:proyectos(nombre)
      `)
      .eq('telefono', telefono)
      .limit(1)
      .single();

    if (error || !lead) {
      return NextResponse.json({ found: false });
    }

    // Flatten proyecto_nombre (Supabase JOIN returns nested object)
    const proyectoNombre = typeof lead.proyecto_nombre === 'object' && lead.proyecto_nombre !== null
      ? (lead.proyecto_nombre as any).nombre
      : lead.proyecto_nombre;

    return NextResponse.json({
      found: true,
      lead: {
        id: lead.id,
        nombre: lead.nombre,
        email: lead.email,
        proyecto_id: lead.proyecto_id,
        proyecto_nombre: proyectoNombre,
      },
    });
  } catch (error) {
    console.error('Error searching lead:', error);
    return NextResponse.json(
      { found: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
