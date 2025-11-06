// ============================================================================
// COMPONENT: LocalTrackingModal
// ============================================================================
// Descripción: Modal para vincular leads a locales mediante búsqueda por teléfono
// Solo accesible por: vendedor, vendedor_caseta
// ============================================================================

'use client';

import { useState } from 'react';
import { X, Search, User, Phone, Mail, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { searchLeadByPhone } from '@/lib/db';
import { registerLeadTracking } from '@/lib/actions-locales';
import type { Lead } from '@/lib/db';
import type { Local } from '@/lib/locales';

interface LocalTrackingModalProps {
  local: Local;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  usuarioId?: string;
}

type ViewState = 'search' | 'lead-found' | 'not-found' | 'success';

export default function LocalTrackingModal({
  local,
  isOpen,
  onClose,
  onSuccess,
  usuarioId,
}: LocalTrackingModalProps) {
  // ====== STATE ======
  const [viewState, setViewState] = useState<ViewState>('search');
  const [phoneInput, setPhoneInput] = useState('');
  const [manualName, setManualName] = useState('');
  const [foundLead, setFoundLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ====== HANDLERS ======

  const handleSearch = async () => {
    if (!phoneInput.trim()) {
      setError('Ingrese un número de teléfono');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const lead = await searchLeadByPhone(phoneInput);

      if (lead) {
        setFoundLead(lead);
        setViewState('lead-found');
      } else {
        setViewState('not-found');
      }
    } catch (err) {
      console.error('Error searching lead:', err);
      setError('Error al buscar lead');
    } finally {
      setLoading(false);
    }
  };

  const handleVincularFound = async () => {
    if (!foundLead) return;

    setLoading(true);
    setError(null);

    try {
      const result = await registerLeadTracking(
        local.id,
        foundLead.telefono,
        foundLead.nombre || 'Sin nombre',
        usuarioId
      );

      if (result.success) {
        setViewState('success');
        if (onSuccess) onSuccess();
      } else {
        setError(result.message || 'Error al vincular lead');
      }
    } catch (err) {
      console.error('Error vinculando lead:', err);
      setError('Error inesperado al vincular');
    } finally {
      setLoading(false);
    }
  };

  const handleVincularManual = async () => {
    if (!phoneInput.trim() || !manualName.trim()) {
      setError('Complete teléfono y nombre');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await registerLeadTracking(
        local.id,
        phoneInput,
        manualName,
        usuarioId
      );

      if (result.success) {
        setViewState('success');
        if (onSuccess) onSuccess();
      } else {
        setError(result.message || 'Error al registrar');
      }
    } catch (err) {
      console.error('Error registrando tracking:', err);
      setError('Error inesperado al registrar');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setViewState('search');
    setPhoneInput('');
    setManualName('');
    setFoundLead(null);
    setError(null);
    onClose();
  };

  const handleBackToSearch = () => {
    setViewState('search');
    setFoundLead(null);
    setError(null);
  };

  if (!isOpen) return null;

  // ====== RENDER ======

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-primary text-white p-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Tracking de Lead</h2>
              <p className="text-sm text-white/80 font-mono">{local.codigo}</p>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* VIEW: Search */}
            {viewState === 'search' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Busque un lead por número de teléfono para vincularlo a este local.
                </p>
                <p className="text-sm text-gray-700 font-bold italic">
                  * Incluir código de país
                </p>

                {/* Phone Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Teléfono
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSearch();
                      }}
                      placeholder="Ej: 51987654321 (con código de país)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={loading}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Search className="w-4 h-4" />
                      {loading ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}
              </div>
            )}

            {/* VIEW: Lead Found */}
            {viewState === 'lead-found' && foundLead && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 mb-4">
                  <CheckCircle className="w-5 h-5" />
                  <p className="font-semibold">Lead encontrado</p>
                </div>

                {/* Lead Info Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Nombre</p>
                      <p className="font-medium">{foundLead.nombre || 'Sin nombre'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Teléfono</p>
                      <p className="font-medium">{foundLead.telefono}</p>
                    </div>
                  </div>

                  {foundLead.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Email</p>
                        <p className="font-medium">{foundLead.email}</p>
                      </div>
                    </div>
                  )}

                  {foundLead.proyecto_nombre && (
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Proyecto</p>
                        <p className="font-medium">{foundLead.proyecto_nombre}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleBackToSearch}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleVincularFound}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Vinculando...' : 'Vincular Lead'}
                  </button>
                </div>
              </div>
            )}

            {/* VIEW: Not Found */}
            {viewState === 'not-found' && (
              <div className="space-y-4">
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-800">No encontrado</p>
                    <p className="text-sm text-yellow-700">
                      No se encontró ningún lead con el teléfono <strong>{phoneInput}</strong> en
                      la tabla de leads de los proyectos.
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  Puede registrarlo de todas formas ingresando el nombre completo de la persona:
                </p>

                {/* Manual Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-gray-50"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleBackToSearch}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleVincularManual}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Registrando...' : 'Registrar de Todas Formas'}
                  </button>
                </div>
              </div>
            )}

            {/* VIEW: Success */}
            {viewState === 'success' && (
              <div className="space-y-4 text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Lead Vinculado</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    El lead ha sido registrado en el historial del local correctamente.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
