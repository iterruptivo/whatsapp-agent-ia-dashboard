/**
 * Page: /expansion/bienvenido
 *
 * Página de bienvenida para corredores aprobados.
 * Solo accesible por usuarios con rol 'corredor' y registro aprobado.
 *
 * @version 1.0
 * @fecha 12 Enero 2026
 */

import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  CheckCircle,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  Building2,
  User,
} from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

export default async function BienvenidoCorredorPage() {
  // Verificar autenticación
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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verificar que es corredor
  const { data: userData } = await supabase
    .from('usuarios')
    .select('rol, nombre')
    .eq('id', user.id)
    .single();

  if (!userData || userData.rol !== 'corredor') {
    redirect('/');
  }

  // Obtener registro aprobado
  const { data: registro } = await supabase
    .from('corredores_registro')
    .select('*')
    .eq('usuario_id', user.id)
    .eq('estado', 'aprobado')
    .single();

  // Si no está aprobado, redirigir a registro
  if (!registro) {
    redirect('/expansion/registro');
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <DashboardHeader
        title="Bienvenido a EcoPlaza"
        subtitle="Tu registro ha sido aprobado"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner de Éxito */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-green-800">
                ¡Felicidades, {userData.nombre}!
              </h2>
              <p className="text-green-700 mt-1">
                Tu registro como corredor de EcoPlaza ha sido aprobado exitosamente.
                Ahora puedes comenzar a operar.
              </p>
              {registro.aprobado_at && (
                <p className="text-sm text-green-600 mt-2">
                  Aprobado el {formatDate(registro.aprobado_at)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Datos del Registro */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            {registro.tipo_persona === 'natural' ? (
              <div className="p-3 bg-blue-100 rounded-full">
                <User className="w-6 h-6 text-blue-600" />
              </div>
            ) : (
              <div className="p-3 bg-purple-100 rounded-full">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {registro.tipo_persona === 'natural'
                  ? `${registro.nombres} ${registro.apellido_paterno} ${registro.apellido_materno}`
                  : registro.razon_social}
              </h3>
              <p className="text-sm text-gray-500">
                {registro.tipo_persona === 'natural' ? 'Persona Natural' : 'Persona Jurídica'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="w-5 h-5" />
              <span>{registro.email}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Phone className="w-5 h-5" />
              <span>{registro.telefono}</span>
            </div>
            <div className="flex items-start gap-3 text-gray-600 md:col-span-2">
              <MapPin className="w-5 h-5 mt-0.5" />
              <span>{registro.direccion_declarada}</span>
            </div>
          </div>

          {registro.tipo_persona === 'natural' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">DNI</p>
              <p className="font-medium">{registro.dni}</p>
            </div>
          )}

          {registro.tipo_persona === 'juridica' && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">RUC</p>
                <p className="font-medium">{registro.ruc}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Representante Legal</p>
                <p className="font-medium">{registro.representante_legal}</p>
              </div>
            </div>
          )}
        </div>

        {/* Próximos Pasos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Próximos Pasos
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">Contacta a tu coordinador</p>
                <p className="text-sm text-gray-500">
                  Te asignaremos un coordinador que te guiará en tus primeros pasos.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">Capacitación inicial</p>
                <p className="text-sm text-gray-500">
                  Recibirás materiales y capacitación sobre nuestros proyectos.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <p className="font-medium text-gray-900">Comienza a operar</p>
                <p className="text-sm text-gray-500">
                  Busca terrenos potenciales y registra tus prospectos en el sistema.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info de Contacto */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>¿Necesitas ayuda?</strong> Contacta al equipo de expansión de EcoPlaza
            al correo <a href="mailto:expansion@ecoplaza.com.pe" className="underline">expansion@ecoplaza.com.pe</a>
          </p>
        </div>
      </div>
    </div>
  );
}
