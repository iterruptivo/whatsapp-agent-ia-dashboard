/**
 * RolesTable Component
 *
 * Tabla de roles del sistema con acciones CRUD.
 * Muestra conteo de permisos y usuarios asignados.
 *
 * @version 1.0
 * @fecha 11 Enero 2026
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Edit2, Trash2, Shield, Users, CheckCircle } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// ============================================================================
// TYPES
// ============================================================================

export interface Role {
  id: string;
  nombre: string;
  descripcion: string | null;
  es_sistema: boolean;
  activo: boolean;
  permisos_count?: number;
  usuarios_count?: number;
  created_at: string;
}

interface RolesTableProps {
  roles: Role[];
  onDelete: (roleId: string) => Promise<void>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function RolesTable({ roles, onDelete }: RolesTableProps) {
  const router = useRouter();
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handles
  const handleView = (roleId: string) => {
    router.push(`/admin/roles/${roleId}`);
  };

  const handleEdit = (roleId: string) => {
    router.push(`/admin/roles/${roleId}/edit`);
  };

  const handleDeleteClick = (roleId: string) => {
    setDeletingRoleId(roleId);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRoleId) return;

    setIsDeleting(true);
    try {
      await onDelete(deletingRoleId);
      setDeletingRoleId(null);
    } catch (error) {
      console.error('Error eliminando rol:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const roleToDelete = roles.find((r) => r.id === deletingRoleId);

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permisos
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuarios
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => (
                <tr
                  key={role.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Nombre del Rol */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Shield className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {role.nombre}
                        </div>
                        {role.es_sistema && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                            Sistema
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Descripción */}
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {role.descripcion || 'Sin descripción'}
                    </p>
                  </td>

                  {/* Conteo de Permisos */}
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      {role.permisos_count || 0}
                    </span>
                  </td>

                  {/* Conteo de Usuarios */}
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm font-medium">
                      <Users className="w-4 h-4" />
                      {role.usuarios_count || 0}
                    </span>
                  </td>

                  {/* Estado */}
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        role.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {role.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Ver */}
                      <button
                        onClick={() => handleView(role.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Editar */}
                      <button
                        onClick={() => handleEdit(role.id)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Editar rol"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Eliminar (solo si no es rol de sistema) */}
                      {!role.es_sistema && (
                        <button
                          onClick={() => handleDeleteClick(role.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar rol"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {/* Empty State */}
              {roles.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                      No hay roles configurados
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Crea tu primer rol para comenzar
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deletingRoleId}
        onClose={() => setDeletingRoleId(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Rol"
        message={`¿Estás seguro de eliminar el rol "${roleToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        type="confirm"
        variant="danger"
        confirmText={isDeleting ? 'Eliminando...' : 'Eliminar'}
        cancelText="Cancelar"
      />
    </>
  );
}
