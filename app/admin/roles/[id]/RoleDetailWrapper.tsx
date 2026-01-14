/**
 * RoleDetailWrapper Component
 *
 * Client wrapper para la página de detalle de rol.
 * Proporciona el layout con DashboardHeader.
 *
 * @version 1.0
 * @fecha 12 Enero 2026
 */

'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';

interface RoleDetailWrapperProps {
  rolNombre: string;
  rolDescripcion: string | null;
  esSistema: boolean;
  activo: boolean;
  usuariosCount: number;
  children: ReactNode;
}

export default function RoleDetailWrapper({
  rolNombre,
  rolDescripcion,
  esSistema,
  activo,
  usuariosCount,
  children,
}: RoleDetailWrapperProps) {
  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Header del Sistema */}
      <DashboardHeader
        title={`Rol: ${rolNombre}`}
        subtitle="Configuración de permisos"
      />

      {/* Contenido */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link
          href="/admin/roles"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Roles
        </Link>

        {/* Role Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-[#192c4d]">
                {rolNombre}
              </h2>
              <p className="text-gray-600 mt-1">
                {rolDescripcion || 'Sin descripción'}
              </p>

              {/* Metadata */}
              <div className="flex items-center gap-4 mt-4">
                {esSistema && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    Rol de Sistema
                  </span>
                )}
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    activo
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {activo ? 'Activo' : 'Inactivo'}
                </span>
                <span className="text-sm text-gray-600">
                  <strong>{usuariosCount}</strong> usuario(s) asignado(s)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Permisos Matrix (children) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {children}
        </div>

        {/* Info para roles de sistema */}
        {esSistema && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Este es un rol de sistema. Puedes modificar sus permisos,
              pero no puedes eliminarlo ni cambiar su nombre.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
