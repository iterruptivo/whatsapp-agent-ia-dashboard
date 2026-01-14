/**
 * CreateRoleModal Component
 *
 * Modal para crear un nuevo rol.
 * Valida nombre único y llama a createRoleAction.
 *
 * @version 1.0
 * @fecha 12 Enero 2026
 */

'use client';

import { useState } from 'react';
import { X, Shield, Loader2 } from 'lucide-react';
import { createRoleAction } from '@/app/admin/roles/actions';
import { useRouter } from 'next/navigation';

// ============================================================================
// TYPES
// ============================================================================

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CreateRoleModal({
  isOpen,
  onClose,
}: CreateRoleModalProps) {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal closes
  const handleClose = () => {
    setNombre('');
    setDescripcion('');
    setError(null);
    onClose();
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación básica
    if (!nombre.trim()) {
      setError('El nombre del rol es requerido');
      return;
    }

    if (nombre.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const result = await createRoleAction(nombre.trim(), descripcion.trim());

      if (result.success && result.roleId) {
        // Redirigir al detalle del rol para configurar permisos
        router.push(`/admin/roles/${result.roleId}`);
        handleClose();
      } else {
        setError(result.error || 'Error creando el rol');
      }
    } catch (err) {
      console.error('Error creando rol:', err);
      setError('Error interno del servidor');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#1b967a]/10 to-[#192c4d]/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1b967a] rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#192c4d]">Crear Nuevo Rol</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Define un nuevo rol para el sistema
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Alert */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Nombre del Rol */}
          <div>
            <label
              htmlFor="nombre"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nombre del Rol <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Coordinador de Ventas"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent transition-all"
              disabled={isLoading}
              maxLength={50}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {nombre.length}/50 caracteres
            </p>
          </div>

          {/* Descripción */}
          <div>
            <label
              htmlFor="descripcion"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Descripción
            </label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe las responsabilidades de este rol..."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent transition-all resize-none"
              disabled={isLoading}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {descripcion.length}/200 caracteres
            </p>
          </div>

          {/* Info Note */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Siguiente paso:</strong> Después de crear el rol, podrás
              configurar sus permisos en la siguiente pantalla.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !nombre.trim()}
              className="flex-1 px-4 py-2.5 bg-[#1b967a] text-white rounded-lg hover:bg-[#156b5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Crear Rol
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
