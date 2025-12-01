// ============================================================================
// COMPONENT: ComentarioNaranjaModal (CON VINCULACIÓN OBLIGATORIA)
// ============================================================================
// Descripción: Modal para comentario + vinculación OBLIGATORIOS al cambiar a NARANJA
// Uso: Solo para vendedor/vendedor_caseta (admin/jefe_ventas NO lo ven)
// Validaciones:
//   - Comentario: Mínimo 10 caracteres
//   - Vinculación: Teléfono + lead (existente o nuevo)
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, MessageSquare, Phone, Search, User, Mail, Building2, CheckCircle, DollarSign } from 'lucide-react';
import { searchLeadByPhone } from '@/lib/db';
import type { Lead } from '@/lib/db';
import type { Local } from '@/lib/locales';

interface ComentarioNaranjaModalProps {
  isOpen: boolean;
  local: Local | null;
  onConfirm: (
    comentario: string,
    telefono: string,
    nombreCliente: string,
    montoSeparacion: number,
    montoVenta: number,
    leadId?: string,
    proyectoId?: string,
    agregarComoLead?: boolean
  ) => Promise<void>;
  onCancel: () => void;
}

type ViewState = 'form' | 'lead-found' | 'lead-not-found';

export default function ComentarioNaranjaModal({
  isOpen,
  local,
  onConfirm,
  onCancel,
}: ComentarioNaranjaModalProps) {
  // ====== STATE ======
  const [viewState, setViewState] = useState<ViewState>('form');
  const [comentario, setComentario] = useState('');
  const [telefono, setTelefono] = useState('');
  const [telefonoError, setTelefonoError] = useState('');
  const [nombreManual, setNombreManual] = useState('');
  const [montoSeparacion, setMontoSeparacion] = useState('');
  const [montoVenta, setMontoVenta] = useState('');
  const [foundLead, setFoundLead] = useState<Lead | null>(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // SESIÓN 56: proyectoId ahora viene del local, no de un dropdown
  const [proyectoId, setProyectoId] = useState('');
  const [agregarComoLead, setAgregarComoLead] = useState(true);

  // ====== EFFECTS ======
  useEffect(() => {
    // SESIÓN 56: Ya no necesitamos cargar proyectos, usamos el proyecto del local
    if (isOpen && local) {
      // Pre-seleccionar proyecto del local automáticamente
      setProyectoId(local.proyecto_id);
    }
  }, [isOpen, local]);

  if (!isOpen || !local) return null;

  // ====== VALIDACIÓN ======

  // Validar teléfono internacional (E.164: código país + número)
  // - Empieza con dígito 1-9 (código de país)
  // - Total entre 10-15 dígitos
  // Ejemplos válidos:
  // - 51987654321 (Perú: 11 dígitos)
  // - 12025551234 (USA: 11 dígitos)
  // - 34612345678 (España: 11 dígitos)
  const validarTelefonoInternacional = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return /^[1-9]\d{9,14}$/.test(cleaned);
  };

  const telefonoValido = validarTelefonoInternacional(telefono);

  // ====== HANDLERS ======

  const handleSearchLead = async () => {
    if (!telefono.trim()) {
      setTelefonoError('Ingrese un número de teléfono');
      return;
    }

    // Validar formato internacional
    if (!telefonoValido) {
      setTelefonoError('Teléfono inválido. Incluye el código de país (ej: 51987654321)');
      return;
    }

    setSearching(true);
    setError('');
    setTelefonoError('');

    try {
      // SESIÓN 56: Filtrar búsqueda por proyecto del local
      const lead = await searchLeadByPhone(telefono, local?.proyecto_id);

      if (lead) {
        setFoundLead(lead);
        setViewState('lead-found');
      } else {
        setViewState('lead-not-found');
      }
    } catch (err) {
      console.error('Error searching lead:', err);
      setError('Error al buscar lead');
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async () => {
    // Validar comentario
    if (comentario.trim().length < 10) {
      setError('El comentario debe tener al menos 10 caracteres');
      return;
    }

    // Validar vinculación
    if (!telefono.trim()) {
      setError('Debe buscar y vincular un lead antes de confirmar');
      return;
    }

    // Validar formato de teléfono
    if (!telefonoValido) {
      setTelefonoError('Teléfono inválido. Incluye el código de país (ej: 51987654321)');
      return;
    }

    // Validar monto de separación (REQUERIDO)
    const montoSeparacionNumerico = parseFloat(montoSeparacion);
    if (!montoSeparacion.trim() || isNaN(montoSeparacionNumerico) || montoSeparacionNumerico <= 0) {
      setError('Debe ingresar un monto de separación válido mayor a 0');
      return;
    }

    // Validar monto de venta (REQUERIDO)
    const montoVentaNumerico = parseFloat(montoVenta);
    if (!montoVenta.trim() || isNaN(montoVentaNumerico) || montoVentaNumerico <= 0) {
      setError('Debe ingresar un monto de venta válido mayor a 0');
      return;
    }

    // Si el lead NO fue encontrado, validar campos adicionales
    if (viewState === 'lead-not-found') {
      if (!nombreManual.trim()) {
        setError('Debe ingresar el nombre del cliente');
        return;
      }

      // SESIÓN 56: Proyecto viene del local (prop), validar que exista
      if (!local?.proyecto_id) {
        setError('Error: No se pudo obtener el proyecto del local');
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      // Confirmar con comentario + vinculación + montos
      // SESIÓN 56: Usar local.proyecto_id directamente (no el state)
      await onConfirm(
        comentario.trim(),
        telefono.trim(),
        viewState === 'lead-found' && foundLead ? (foundLead.nombre || 'Sin nombre') : nombreManual.trim(),
        montoSeparacionNumerico, // Monto de separación
        montoVentaNumerico, // Monto de venta
        foundLead?.id, // Si existe lead, pasar su ID
        local?.proyecto_id || undefined, // Proyecto del local (solo si lead no encontrado)
        viewState === 'lead-not-found' ? agregarComoLead : undefined // Checkbox (solo si lead no encontrado)
      );

      // Limpiar y cerrar
      handleReset();
    } catch (err) {
      setError('Error al confirmar el local. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    handleReset();
    onCancel();
  };

  const handleReset = () => {
    setViewState('form');
    setComentario('');
    setTelefono('');
    setTelefonoError('');
    setNombreManual('');
    setMontoSeparacion('');
    setMontoVenta('');
    setFoundLead(null);
    setError('');
    setAgregarComoLead(true); // Reset checkbox a true (por defecto)
    // proyectoId y proyectos NO se resetean (se mantienen para próxima vez)
  };

  const handleBackToForm = () => {
    setViewState('form');
    setFoundLead(null);
    setNombreManual('');
    setTelefonoError('');
    setError('');
    setAgregarComoLead(true); // Reset checkbox a true
  };

  const montoSeparacionNum = parseFloat(montoSeparacion);
  const montoSeparacionValido = montoSeparacion.trim().length > 0 && !isNaN(montoSeparacionNum) && montoSeparacionNum > 0;

  const montoVentaNum = parseFloat(montoVenta);
  const montoVentaValido = montoVenta.trim().length > 0 && !isNaN(montoVentaNum) && montoVentaNum > 0;

  // Mostrar error de teléfono en tiempo real (solo si ya empezó a escribir)
  const mostrarErrorTelefono = telefono.length > 0 && !telefonoValido;

  // SESIÓN 56: proyectoId ya viene del local automáticamente
  const canSubmit =
    comentario.trim().length >= 10 &&
    telefono.trim().length > 0 &&
    telefonoValido && // Teléfono con código de país válido
    montoSeparacionValido && // Monto separación SIEMPRE requerido
    montoVentaValido && // Monto venta SIEMPRE requerido
    (viewState === 'lead-found' ||
      (viewState === 'lead-not-found' &&
        nombreManual.trim().length > 0
      )
    );

  // ====== RENDER ======

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 sticky top-0 z-10 bg-orange-500">
          <div>
            <h2 className="text-xl font-bold text-white">
              Confirmar Local - Estado NARANJA
            </h2>
            <p className="text-sm text-white/80 mt-1">
              {local.proyecto_nombre} - Local {local.codigo}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            disabled={submitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* SECCIÓN 1: Comentario (siempre visible) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              <label className="text-sm font-medium text-gray-700">
                ¿Por qué pasas este local a confirmado? <span className="text-red-500">*</span>
              </label>
            </div>

            <textarea
              value={comentario}
              onChange={(e) => {
                setComentario(e.target.value);
                setError('');
              }}
              placeholder="Ej: Cliente confirmó compra, pidió enviar contrato por email..."
              rows={3}
              className={`w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 transition-all ${
                error && comentario.trim().length < 10
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-orange-500'
              }`}
              disabled={submitting}
            />

            <p className="text-xs text-gray-500">
              Mínimo 10 caracteres
            </p>
          </div>

          {/* SECCIÓN 2: Monto de Separación (siempre visible) */}
          <div className="border-t border-gray-200 pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-500" />
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
                  setError('');
                }}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="Ej: 5000.00"
                className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  error && (!montoSeparacion.trim() || parseFloat(montoSeparacion) <= 0)
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-orange-500'
                }`}
                disabled={submitting}
              />
            </div>

            <p className="text-xs text-gray-500">
              Monto de separación en dólares (USD). Ej: 5000 o 5000.50
            </p>
          </div>

          {/* SECCIÓN 3: Monto de Venta (siempre visible) */}
          <div className="border-t border-gray-200 pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-500" />
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
                  setError('');
                }}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="Ej: 150000.00"
                className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  error && (!montoVenta.trim() || parseFloat(montoVenta) <= 0)
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-orange-500'
                }`}
                disabled={submitting}
              />
            </div>

            <p className="text-xs text-gray-500">
              Monto en dólares (USD). Ej: 150000 o 150000.50
            </p>
          </div>

          {/* SECCIÓN 4: Vinculación de Lead */}
          <div className="border-t border-gray-200 pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-orange-500" />
              <label className="text-sm font-medium text-gray-700">
                Vincular Lead (Cliente) <span className="text-red-500">*</span>
              </label>
            </div>

            {/* VIEW: Form - Búsqueda */}
            {viewState === 'form' && (
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
                      value={telefono}
                      onChange={(e) => {
                        setTelefono(e.target.value);
                        setError('');
                        if (telefonoError) setTelefonoError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && telefonoValido) handleSearchLead();
                      }}
                      placeholder="Ej: 51987654321"
                      className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent outline-none transition-all ${
                        mostrarErrorTelefono || telefonoError
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-primary'
                      }`}
                      disabled={submitting}
                    />
                    <button
                      onClick={handleSearchLead}
                      disabled={searching || submitting || !telefono.trim() || !telefonoValido}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Search className="w-4 h-4" />
                      {searching ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                  {(mostrarErrorTelefono || telefonoError) && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {telefonoError || 'Teléfono inválido. Incluye el código de país (ej: 51987654321)'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* VIEW: Lead Encontrado */}
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
                  onClick={handleBackToForm}
                  className="text-sm text-primary hover:underline"
                  disabled={submitting}
                >
                  ← Buscar otro teléfono
                </button>
              </div>
            )}

            {/* VIEW: Lead NO Encontrado */}
            {viewState === 'lead-not-found' && (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-800">No encontrado</p>
                    <p className="text-sm text-yellow-700">
                      No se encontró ningún lead con el teléfono <strong>{telefono}</strong>.
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  Ingrese el nombre del cliente para registrar la vinculación:
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo del Cliente <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nombreManual}
                    onChange={(e) => {
                      setNombreManual(e.target.value);
                      setError('');
                    }}
                    placeholder="Ej: Juan Pérez"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    disabled={submitting}
                  />
                </div>

                {/* SESIÓN 56: Proyecto fijo (viene del local) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proyecto
                  </label>
                  <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-medium">
                    {local?.proyecto_nombre || 'Cargando...'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    El lead se creará en el mismo proyecto del local
                  </p>
                </div>

                {/* Checkbox "Agregar como lead" */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="agregarComoLead"
                    checked={agregarComoLead}
                    onChange={(e) => setAgregarComoLead(e.target.checked)}
                    className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                    disabled={submitting}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="agregarComoLead"
                      className="text-sm font-medium text-gray-900 cursor-pointer"
                    >
                      Agregar como lead
                    </label>
                    <p className="text-xs text-gray-600 mt-1">
                      {agregarComoLead
                        ? 'Se creará un nuevo lead en la tabla de leads con estado "lead_manual" y asistió="Sí"'
                        : 'Solo se registrará en el historial del local (no se creará lead)'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleBackToForm}
                  className="text-sm text-primary hover:underline"
                  disabled={submitting}
                >
                  ← Buscar otro teléfono
                </button>
              </div>
            )}
          </div>

          {/* Error Message Global */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {/* Info Final */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Importante:</strong> Todos los campos son obligatorios
              y quedarán registrados en el historial del local.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={submitting || !canSubmit}
          >
            {submitting ? 'Confirmando...' : 'Confirmar local'}
          </button>
        </div>
      </div>
    </div>
  );
}
