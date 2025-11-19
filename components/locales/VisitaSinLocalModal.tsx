'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Phone, User, MapPin, Search } from 'lucide-react';

interface VisitaSinLocalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (telefono: string, nombre: string, proyectoId: string) => Promise<void>;
  proyectos: Array<{ id: string; nombre: string }>;
}

interface LeadExistente {
  id: string;
  nombre: string;
  email: string | null;
  proyecto_id: string;
  proyecto_nombre: string;
}

export default function VisitaSinLocalModal({
  isOpen,
  onClose,
  onConfirm,
  proyectos,
}: VisitaSinLocalModalProps) {
  const [telefono, setTelefono] = useState('');
  const [nombre, setNombre] = useState('');
  const [proyectoId, setProyectoId] = useState('');
  const [leadExistente, setLeadExistente] = useState<LeadExistente | null>(null);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset state cuando se abre/cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setTelefono('');
      setNombre('');
      setProyectoId('');
      setLeadExistente(null);
      setSearchCompleted(false);
      setIsSearching(false);
      setError('');
    }
  }, [isOpen]);

  // Buscar lead cuando el usuario termine de escribir el teléfono
  const buscarLead = async () => {
    if (!telefono.trim() || telefono.length < 8) {
      setError('Ingresa un número de teléfono válido');
      return;
    }

    setIsSearching(true);
    setError('');
    setLeadExistente(null);
    setSearchCompleted(false);

    try {
      const response = await fetch(`/api/leads/search?telefono=${telefono}`);
      const data = await response.json();

      if (data.found && data.lead) {
        setLeadExistente(data.lead);
        setNombre(data.lead.nombre);
        setProyectoId(data.lead.proyecto_id);
      } else {
        setLeadExistente(null);
        setNombre('');
        setProyectoId('');
      }
      setSearchCompleted(true);
    } catch (err) {
      console.error('Error buscando lead:', err);
      setError('Error al buscar lead');
      setSearchCompleted(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!searchCompleted) {
      setError('Debes buscar el teléfono primero');
      return;
    }

    if (!telefono.trim()) {
      setError('El teléfono es requerido');
      return;
    }

    if (!leadExistente && !nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }

    if (!leadExistente && !proyectoId) {
      setError('Debes seleccionar un proyecto');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onConfirm(telefono, nombre, proyectoId);
      onClose();
    } catch (err) {
      setError('Error al registrar visita');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Visita sin Local</h2>
                <p className="text-blue-100 text-sm">Registrar visita al proyecto</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Teléfono con búsqueda */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-600" />
              <label className="text-sm font-medium text-gray-700">
                Teléfono <span className="text-red-500">*</span>
              </label>
            </div>
            <div className="flex gap-2">
              <input
                type="tel"
                value={telefono}
                onChange={(e) => {
                  // Solo permitir números
                  const value = e.target.value.replace(/\D/g, '');
                  setTelefono(value);
                  setError('');
                  setLeadExistente(null);
                  setSearchCompleted(false);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    buscarLead();
                  }
                }}
                placeholder="Ej: 51987654321"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              />
              <button
                onClick={buscarLead}
                disabled={isSearching || isSubmitting}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Buscar lead"
              >
                <Search className={`w-5 h-5 ${isSearching ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Ingresa el teléfono y presiona Enter o click en buscar
            </p>
          </div>

          {/* Lead existente encontrado */}
          {leadExistente && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-green-900">✓ Lead encontrado</p>
                  <div className="mt-2 space-y-1 text-sm text-green-800">
                    <p><strong>Nombre:</strong> {leadExistente.nombre}</p>
                    {leadExistente.email && <p><strong>Email:</strong> {leadExistente.email}</p>}
                    <p><strong>Proyecto actual:</strong> {leadExistente.proyecto_nombre}</p>
                  </div>
                  <p className="mt-3 text-xs text-green-700 bg-green-100 px-3 py-2 rounded-lg">
                    Se actualizará el campo "Asistió" a "Sí"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje cuando NO se encuentra lead */}
          {searchCompleted && !leadExistente && !isSearching && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <p className="text-sm text-blue-900 font-medium">
                ℹ️ Lead no encontrado. Completa los datos para registrar la visita:
              </p>
            </div>
          )}

          {/* Formulario para nuevo lead (solo después de buscar y NO encontrar) */}
          {searchCompleted && !leadExistente && !isSearching && (
            <>
              {/* Nombre */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Nombre del Cliente <span className="text-red-500">*</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    setError('');
                  }}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              {/* Proyecto */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Proyecto <span className="text-red-500">*</span>
                  </label>
                </div>
                <select
                  value={proyectoId}
                  onChange={(e) => {
                    setProyectoId(e.target.value);
                    setError('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  disabled={isSubmitting}
                >
                  <option value="">- - -</option>
                  {proyectos.map((proyecto) => (
                    <option key={proyecto.id} value={proyecto.id}>
                      {proyecto.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !searchCompleted || !telefono || (!leadExistente && (!nombre || !proyectoId))}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Registrando...' : 'Registrar Visita'}
          </button>
        </div>
      </div>
    </div>
  );
}
