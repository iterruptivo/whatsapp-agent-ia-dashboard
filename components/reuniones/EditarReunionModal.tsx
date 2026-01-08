'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Reunion, UpdateReunionResponse } from '@/types/reuniones';
import { createBrowserClient } from '@supabase/ssr';

interface EditarReunionModalProps {
  reunion: { id: string; titulo: string; fecha_reunion: string | null };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reunion: Reunion) => void;
}

export default function EditarReunionModal({
  reunion,
  isOpen,
  onClose,
  onSuccess,
}: EditarReunionModalProps) {
  const [titulo, setTitulo] = useState(reunion.titulo);
  const [fechaReunion, setFechaReunion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Inicializar fecha cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setTitulo(reunion.titulo);
      setError(null);

      // Convertir fecha ISO a datetime-local format
      if (reunion.fecha_reunion) {
        const date = new Date(reunion.fecha_reunion);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        setFechaReunion(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        setFechaReunion('');
      }
    }
  }, [isOpen, reunion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar título
    if (titulo.trim().length < 3) {
      setError('El título debe tener al menos 3 caracteres');
      return;
    }

    if (titulo.trim().length > 200) {
      setError('El título no puede exceder 200 caracteres');
      return;
    }

    setLoading(true);

    try {
      // Obtener token de sesión
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('No hay sesión activa');
      }

      // Preparar body
      const body: { titulo: string; fecha_reunion?: string | null } = {
        titulo: titulo.trim(),
      };

      // Agregar fecha solo si se modificó
      if (fechaReunion) {
        body.fecha_reunion = new Date(fechaReunion).toISOString();
      } else {
        body.fecha_reunion = null;
      }

      // Llamar a la API
      const response = await fetch(`/api/reuniones/${reunion.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const data: UpdateReunionResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar la reunión');
      }

      if (!data.reunion) {
        throw new Error('No se recibió la reunión actualizada');
      }

      // Éxito
      onSuccess(data.reunion);
      onClose();
    } catch (err) {
      console.error('Error al editar reunión:', err);
      setError(
        err instanceof Error ? err.message : 'Error desconocido al guardar'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-[#192c4d]">Editar Reunión</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Título */}
          <div>
            <label
              htmlFor="titulo"
              className="block text-sm font-medium text-[#192c4d] mb-1"
            >
              Título <span className="text-red-500">*</span>
            </label>
            <input
              id="titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              disabled={loading}
              required
              minLength={3}
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Ej: Reunión de planificación Q1 2026"
            />
            <p className="mt-1 text-xs text-gray-500">
              {titulo.length}/200 caracteres
            </p>
          </div>

          {/* Fecha de Reunión */}
          <div>
            <label
              htmlFor="fecha-reunion"
              className="block text-sm font-medium text-[#192c4d] mb-1"
            >
              Fecha de Reunión
            </label>
            <input
              id="fecha-reunion"
              type="datetime-local"
              value={fechaReunion}
              onChange={(e) => setFechaReunion(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b967a] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              Opcional. Puedes dejar vacío si no sabes la fecha exacta.
            </p>
          </div>

          {/* Botones */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-[#192c4d] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || titulo.trim().length < 3}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-[#1b967a] text-white rounded-md hover:bg-[#156b5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
