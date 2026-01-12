/**
 * RoleEditClient Component
 *
 * Client component para editar permisos de un rol.
 *
 * @version 1.0
 * @fecha 11 Enero 2026
 */

'use client';

import { useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import type { Permission } from '@/lib/permissions/types';
import PermissionsMatrix from '@/components/admin/PermissionsMatrix';
import { updateRolePermissionsAction } from '../actions';

interface RoleEditClientProps {
  roleId: string;
  initialPermissions: Permission[];
  rolNombre: string;
}

export default function RoleEditClient({
  roleId,
  initialPermissions,
  rolNombre,
}: RoleEditClientProps) {
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const hasChanges =
    JSON.stringify(permissions) !== JSON.stringify(initialPermissions);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const result = await updateRolePermissionsAction(roleId, permissions);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Permisos del rol "${rolNombre}" actualizados correctamente`,
        });
        // Recargar página después de 1.5s
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Error actualizando permisos',
        });
      }
    } catch (error) {
      console.error('Error guardando permisos:', error);
      setMessage({
        type: 'error',
        text: 'Error al guardar los cambios',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Message Alert */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-800">
              Tienes cambios sin guardar
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      )}

      {/* Permissions Matrix */}
      <PermissionsMatrix
        selectedPermissions={permissions}
        onChange={setPermissions}
        title={`Permisos del Rol: ${rolNombre}`}
      />

      {/* Save Button (Bottom) */}
      {hasChanges && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      )}
    </div>
  );
}
