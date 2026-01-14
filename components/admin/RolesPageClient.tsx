/**
 * RolesPageClient Component
 *
 * Client wrapper para la página de roles.
 * Maneja el estado del modal de creación.
 * Usa DashboardHeader para consistencia con el resto del sistema.
 *
 * @version 1.1
 * @fecha 12 Enero 2026
 */

'use client';

import { useState } from 'react';
import { Shield, Plus } from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import RolesTable, { type Role } from '@/components/admin/RolesTable';
import CreateRoleModal from '@/components/admin/CreateRoleModal';

// ============================================================================
// TYPES
// ============================================================================

interface RolesPageClientProps {
  roles: Role[];
  onDelete: (roleId: string) => Promise<void>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function RolesPageClient({
  roles,
  onDelete,
}: RolesPageClientProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <>
      <div className="min-h-screen bg-[#f4f4f4]">
        {/* Header del Sistema */}
        <DashboardHeader
          title="Gestión de Roles"
          subtitle="Administra roles y permisos del sistema"
        />

        {/* Contenido */}
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Actions Bar */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{roles.length}</span> roles configurados
              </div>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Crear Rol
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <RolesTable roles={roles} onDelete={onDelete} />
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Los roles de sistema (Admin, Jefe Ventas, etc.) no pueden ser eliminados.
              Solo puedes modificar sus permisos.
            </p>
          </div>
        </div>
      </div>

      {/* Create Role Modal */}
      <CreateRoleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}
