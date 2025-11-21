// ============================================================================
// COMPONENT: DatosRegistroVentaModal
// ============================================================================
// Descripción: Modal previo para capturar datos faltantes antes de abrir modal "Financiamiento de Local"
// Solo accesible por: admin, jefe_ventas
// SESIÓN 52C: Feature - Captura monto_separacion, monto_venta, vinculación lead
// ============================================================================
// Flujo:
// 1. Admin/Jefe Ventas hace click en "Iniciar Registro de Venta" (local ROJO)
// 2. Si faltan datos (monto_venta || monto_separacion || lead_id) → Abrir este modal
// 3. Usuario completa datos faltantes
// 4. Click "Confirmar local" → Guarda datos + registra historial + auto-abre modal Financiamiento
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { X, Search, User, Phone, Mail, Building2, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { searchLeadByPhone, getAllProyectos } from '@/lib/db';
import type { Lead, Proyecto } from '@/lib/db';
import type { Local } from '@/lib/locales';

interface DatosRegistroVentaModalProps {
  isOpen: boolean;
  local: Local | null;
  onClose: () => void;
  onSuccess: (updatedLocal: Local) => void;
  usuarioId: string;
}

type ViewState = 'search' | 'lead-found' | 'not-found';

export default function DatosRegistroVentaModal({
  isOpen,
  local,
  onClose,
  onSuccess,
  usuarioId,
}: DatosRegistroVentaModalProps) {
  // ====== STATE ======
  const [viewState, setViewState] = useState<ViewState>('search');
  const [montoSeparacion, setMontoSeparacion] = useState('');
  const [montoVenta, setMontoVenta] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [manualName, setManualName] = useState('');
  const [selectedProyecto, setSelectedProyecto] = useState('');
  const [foundLead, setFoundLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);

  // ====== EFFECTS ======
  useEffect(() => {
    // Cargar proyectos al montar
    const loadProyectos = async () => {
      const proyectosData = await getAllProyectos();
      setProyectos(proyectosData);
    };

    if (isOpen) {
      loadProyectos();
      // Pre-fill montos si ya existen (edit mode)
      if (local?.monto_venta) setMontoVenta(local.monto_venta.toString());
      if (local?.monto_separacion) setMontoSeparacion(local.monto_separacion.toString());
    }
  }, [isOpen, local]);

  if (!isOpen || !local) return null;

  // ====== VALIDATIONS ======

  const validarTelefonoInternacional = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return /^[1-9]\d{9,14}$/.test(cleaned);
  };

  const telefonoValido = validarTelefonoInternacional(phoneInput);
  const montoSeparacionNum = parseFloat(montoSeparacion);
  const montoSeparacionValido = !isNaN(montoSeparacionNum) && montoSeparacionNum > 0;
  const montoVentaNum = parseFloat(montoVenta);
  const montoVentaValido = !isNaN(montoVentaNum) && montoVentaNum > 0;

  const canSubmit =
    montoSeparacionValido &&
    montoVentaValido &&
    phoneInput.trim().length > 0 &&
    telefonoValido &&
    (viewState === 'lead-found' ||
      (viewState === 'not-found' && manualName.trim().length > 0 && selectedProyecto.trim().length > 0));

  // ====== HANDLERS ======

  const handleSearch = async () => {
    if (!phoneInput.trim()) {
      setError('Ingrese un número de teléfono');
      return;
    }

    if (!telefonoValido) {
      setError('Teléfono inválido. Incluye el código de país (ej: 51987654321)');
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

  const handleConfirm = async () => {
    // Validar montos
    if (!montoSeparacionValido) {
      setError('Debe ingresar un monto de separación válido mayor a 0');
      return;
    }
    if (!montoVentaValido) {
      setError('Debe ingresar un monto de venta válido mayor a 0');
      return;
    }

    // Validar teléfono
    if (!phoneInput.trim() || !telefonoValido) {
      setError('Debe buscar y vincular un lead antes de confirmar');
      return;
    }

    // Validar lead no encontrado
    if (viewState === 'not-found') {
      if (!manualName.trim()) {
        setError('Debe ingresar el nombre del cliente');
        return;
      }
      if (!selectedProyecto) {
        setError('Debe seleccionar un proyecto');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      // Importar server action dinámicamente
      const { saveDatosRegistroVenta } = await import('@/lib/actions-locales');

      const result = await saveDatosRegistroVenta(
        local.id,
        montoSeparacionNum,
        montoVentaNum,
        foundLead?.id || null, // leadId existente
        viewState === 'not-found'
          ? {
              telefono: phoneInput.trim(),
              nombre: manualName.trim(),
              proyectoId: selectedProyecto,
            }
          : null, // newLeadData
        usuarioId
      );

      if (result.success && result.local) {
        // Callback con local actualizado
        onSuccess(result.local);
        // Reset y cerrar
        handleReset();
      } else {
        setError(result.message || 'Error al guardar datos');
      }
    } catch (err) {
      console.error('Error guardando datos:', err);
      setError('Error inesperado al guardar datos');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setViewState('search');
    setMontoSeparacion('');
    setMontoVenta('');
    setPhoneInput('');
    setManualName('');
    setSelectedProyecto('');
    setFoundLead(null);
    setError(null);
  };

  const handleBackToSearch = () => {
    setViewState('search');
    setFoundLead(null);
    setManualName('');
    setError(null);
  };

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
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-primary text-white p-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Datos necesarios para iniciar proceso</h2>
              <p className="text-sm text-white/80">
                Proyecto {local.proyecto_nombre} - Local {local.codigo}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* SECCIÓN 1: Monto de Separación */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <label className="text-sm font-medium text-gray-700">
                  Monto de Separación <span className="text-red-500">*</span>
                </label>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoSeparacion}
                  onChange={(e) => {
                    setMontoSeparacion(e.target.value);
                    setError(null);
                  }}
                  placeholder="Ej: 5000.00"
                  className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    error && !montoSeparacionValido
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-primary'
                  }`}
                  disabled={submitting}
                />
              </div>

              <p className="text-xs text-gray-500">
                Monto de separación en dólares (USD). Ej: 5000 o 5000.50
              </p>
            </div>

            {/* SECCIÓN 2: Monto de Venta */}
            <div className="border-t border-gray-200 pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <label className="text-sm font-medium text-gray-700">
                  Monto de Venta <span className="text-red-500">*</span>
                </label>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoVenta}
                  onChange={(e) => {
                    setMontoVenta(e.target.value);
                    setError(null);
                  }}
                  placeholder="Ej: 45000.00"
                  className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                    error && !montoVentaValido
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-primary'
                  }`}
                  disabled={submitting}
                />
              </div>

              <p className="text-xs text-gray-500">
                Monto de venta en dólares (USD). Ej: 45000 o 45000.50
              </p>
            </div>

            {/* SECCIÓN 3: Vincular Lead (Cliente) */}
            <div className="border-t border-gray-200 pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                <label className="text-sm font-medium text-gray-700">
                  Vincular Lead (Cliente) <span className="text-red-500">*</span>
                </label>
              </div>

              {/* VIEW: Search */}
              {viewState === 'search' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Busque el lead por número de teléfono para vincularlo a este local.
                  </p>
                  <p className="text-sm text-gray-700 font-bold italic">
                    * Incluir código de país (Ej: 51987654321)
                  </p>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={phoneInput}
                        onChange={(e) => {
                          setPhoneInput(e.target.value);
                          setError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && telefonoValido) handleSearch();
                        }}
                        placeholder="Ej: 51987654321"
                        className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all ${
                          phoneInput.length > 0 && !telefonoValido
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-primary'
                        }`}
                        disabled={submitting}
                      />
                      <button
                        onClick={handleSearch}
                        disabled={loading || submitting || !telefonoValido}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Search className="w-4 h-4" />
                        {loading ? 'Buscando...' : 'Buscar'}
                      </button>
                    </div>
                    {phoneInput.length > 0 && !telefonoValido && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Teléfono inválido. Incluye el código de país (ej: 51987654321)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW: Lead Found */}
              {viewState === 'lead-found' && foundLead && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <p className="font-semibold">Lead encontrado</p>
                  </div>

                  {/* Lead Info Card */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-green-700 uppercase font-medium">Nombre</p>
                        <p className="font-semibold text-gray-900">{foundLead.nombre || 'Sin nombre'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-green-700 uppercase font-medium">Teléfono</p>
                        <p className="font-semibold text-gray-900">{foundLead.telefono}</p>
                      </div>
                    </div>

                    {foundLead.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-green-700 uppercase font-medium">Email</p>
                          <p className="font-semibold text-gray-900">{foundLead.email}</p>
                        </div>
                      </div>
                    )}

                    {foundLead.proyecto_nombre && (
                      <div className="flex items-start gap-3">
                        <Building2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-green-700 uppercase font-medium">Proyecto</p>
                          <p className="font-semibold text-gray-900">{foundLead.proyecto_nombre}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleBackToSearch}
                    disabled={submitting}
                    className="text-sm text-primary hover:underline"
                  >
                    ← Buscar otro teléfono
                  </button>
                </div>
              )}

              {/* VIEW: Not Found */}
              {viewState === 'not-found' && (
                <div className="space-y-3">
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
                    Ingrese el nombre del cliente para registrar la vinculación:
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        readOnly
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre Completo del Cliente <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={manualName}
                        onChange={(e) => {
                          setManualName(e.target.value);
                          setError(null);
                        }}
                        placeholder="Ej: Juan Pérez"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proyecto <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedProyecto}
                        onChange={(e) => {
                          setSelectedProyecto(e.target.value);
                          setError(null);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                        disabled={submitting}
                      >
                        <option value="">- - -</option>
                        {proyectos.map((proyecto) => (
                          <option key={proyecto.id} value={proyecto.id}>
                            {proyecto.nombre}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Seleccione el proyecto al que pertenece este lead
                      </p>
                    </div>

                    {/* Mensaje informativo */}
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-800">
                        Se creará un nuevo lead en la tabla de leads con estado 'lead_manual' y asistió='Sí'
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleBackToSearch}
                    disabled={submitting}
                    className="text-sm text-primary hover:underline"
                  >
                    ← Buscar otro teléfono
                  </button>
                </div>
              )}
            </div>

            {/* Error Message Global */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white">
            <button
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={submitting || !canSubmit}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Guardando...' : 'Confirmar local'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
