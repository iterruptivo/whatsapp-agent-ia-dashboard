// ============================================================================
// COMPONENT: AprobacionesConfigPanel
// ============================================================================
// Descripcion: Panel de configuracion de rangos de aprobacion de descuentos
// Features: Configurar rangos por proyecto, roles aprobadores, notificaciones
// Fase: 5 - Aprobacion de Descuentos
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  Check,
  Bell,
  Lock,
  Clock,
  X,
} from 'lucide-react';
import {
  getConfigAprobaciones,
  saveConfigAprobaciones,
  type RangoAprobacion,
  type ConfigAprobaciones,
} from '@/lib/actions-aprobaciones';
import { useAuth } from '@/lib/auth-context';

interface AprobacionesConfigPanelProps {
  proyectoId: string;
  onClose?: () => void;
}

const ROLES_DISPONIBLES = [
  { value: 'jefe_ventas', label: 'Jefe de Ventas' },
  { value: 'admin', label: 'Gerencia (Admin)' },
  { value: 'finanzas', label: 'Finanzas' },
];

export default function AprobacionesConfigPanel({ proyectoId, onClose }: AprobacionesConfigPanelProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Estado del formulario
  const [rangos, setRangos] = useState<RangoAprobacion[]>([]);
  const [notificarWhatsapp, setNotificarWhatsapp] = useState(true);
  const [bloquearHastaAprobacion, setBloquearHastaAprobacion] = useState(true);
  const [permitirVentaProvisional, setPermitirVentaProvisional] = useState(false);

  // Cargar configuracion
  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      setError(null);

      const result = await getConfigAprobaciones(proyectoId);

      if (result.success && result.data) {
        setRangos(result.data.rangos);
        setNotificarWhatsapp(result.data.notificar_whatsapp);
        setBloquearHastaAprobacion(result.data.bloquear_hasta_aprobacion);
        setPermitirVentaProvisional(result.data.permitir_venta_provisional);
      } else {
        setError(result.error || 'Error al cargar configuracion');
      }

      setLoading(false);
    };

    loadConfig();
  }, [proyectoId]);

  // Agregar rango
  const handleAddRango = () => {
    const ultimoRango = rangos[rangos.length - 1];
    const nuevoMin = ultimoRango ? ultimoRango.max : 0;

    setRangos([
      ...rangos,
      {
        min: nuevoMin,
        max: nuevoMin + 5,
        aprobadores: [],
        descripcion: 'Nuevo rango',
      },
    ]);
  };

  // Eliminar rango
  const handleRemoveRango = (index: number) => {
    if (rangos.length <= 1) return;
    const nuevosRangos = rangos.filter((_, i) => i !== index);
    setRangos(nuevosRangos);
  };

  // Actualizar rango
  const handleUpdateRango = (index: number, field: keyof RangoAprobacion, value: unknown) => {
    const nuevosRangos = [...rangos];
    nuevosRangos[index] = {
      ...nuevosRangos[index],
      [field]: value,
    };
    setRangos(nuevosRangos);
  };

  // Toggle aprobador en rango
  const handleToggleAprobador = (rangoIndex: number, rol: string) => {
    const nuevosRangos = [...rangos];
    const aprobadores = nuevosRangos[rangoIndex].aprobadores;

    if (aprobadores.includes(rol)) {
      nuevosRangos[rangoIndex].aprobadores = aprobadores.filter(r => r !== rol);
    } else {
      nuevosRangos[rangoIndex].aprobadores = [...aprobadores, rol];
    }

    setRangos(nuevosRangos);
  };

  // Guardar configuracion
  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    // Validar rangos
    for (let i = 0; i < rangos.length; i++) {
      if (rangos[i].min >= rangos[i].max) {
        setError(`Rango ${i + 1}: El minimo debe ser menor que el maximo`);
        setSaving(false);
        return;
      }
      if (i > 0 && rangos[i].min !== rangos[i - 1].max) {
        setError(`Los rangos deben ser continuos. El rango ${i + 1} debe empezar en ${rangos[i - 1].max}%`);
        setSaving(false);
        return;
      }
    }

    const result = await saveConfigAprobaciones(
      proyectoId,
      {
        rangos,
        notificar_whatsapp: notificarWhatsapp,
        bloquear_hasta_aprobacion: bloquearHastaAprobacion,
        permitir_venta_provisional: permitirVentaProvisional,
      },
      user.id
    );

    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || 'Error al guardar');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando configuracion...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-[#1b967a] text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">Configuracion de Aprobaciones</h2>
              <p className="text-sm text-green-100">Define los rangos de descuento y aprobadores</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Mensajes */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span>Configuracion guardada correctamente</span>
          </div>
        )}

        {/* Rangos de Descuento */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Rangos de Descuento</h3>
            <button
              onClick={handleAddRango}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Agregar Rango
            </button>
          </div>

          <div className="space-y-4">
            {rangos.map((rango, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Rango de porcentajes */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Desde</span>
                    <input
                      type="number"
                      value={rango.min}
                      onChange={(e) => handleUpdateRango(index, 'min', parseFloat(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
                      min={0}
                      max={100}
                      disabled={index > 0} // El min lo define el rango anterior
                    />
                    <span className="text-sm text-gray-500">% hasta</span>
                    <input
                      type="number"
                      value={rango.max}
                      onChange={(e) => handleUpdateRango(index, 'max', parseFloat(e.target.value) || 0)}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-[#1b967a] focus:border-transparent"
                      min={rango.min + 1}
                      max={100}
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>

                  {/* Boton eliminar */}
                  {rangos.length > 1 && (
                    <button
                      onClick={() => handleRemoveRango(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar rango"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Descripcion */}
                <div className="mt-3">
                  <input
                    type="text"
                    value={rango.descripcion}
                    onChange={(e) => handleUpdateRango(index, 'descripcion', e.target.value)}
                    placeholder="Descripcion del rango..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1b967a] focus:border-transparent text-sm"
                  />
                </div>

                {/* Aprobadores */}
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aprobadores requeridos:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {rango.aprobadores.length === 0 && (
                      <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                        Sin aprobacion requerida
                      </span>
                    )}
                    {ROLES_DISPONIBLES.map((rol) => (
                      <button
                        key={rol.value}
                        onClick={() => handleToggleAprobador(index, rol.value)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          rango.aprobadores.includes(rol.value)
                            ? 'bg-[#1b967a] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {rol.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Opciones adicionales */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Opciones de Comportamiento</h3>

          <div className="space-y-4">
            {/* Notificar WhatsApp */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={notificarWhatsapp}
                onChange={(e) => setNotificarWhatsapp(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-[#1b967a] focus:ring-[#1b967a]"
              />
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                <div>
                  <span className="font-medium text-gray-800">Notificar por WhatsApp</span>
                  <p className="text-sm text-gray-500">
                    Enviar notificacion a aprobadores cuando hay solicitudes pendientes
                  </p>
                </div>
              </div>
            </label>

            {/* Bloquear hasta aprobacion */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={bloquearHastaAprobacion}
                onChange={(e) => setBloquearHastaAprobacion(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-[#1b967a] focus:ring-[#1b967a]"
              />
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                <div>
                  <span className="font-medium text-gray-800">Bloquear venta hasta aprobacion</span>
                  <p className="text-sm text-gray-500">
                    No permitir continuar con la venta hasta que se apruebe el descuento
                  </p>
                </div>
              </div>
            </label>

            {/* Permitir venta provisional */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={permitirVentaProvisional}
                onChange={(e) => setPermitirVentaProvisional(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-[#1b967a] focus:ring-[#1b967a]"
              />
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                <div>
                  <span className="font-medium text-gray-800">Permitir venta provisional</span>
                  <p className="text-sm text-gray-500">
                    Continuar con la venta marcada como &quot;pendiente de aprobacion&quot;
                  </p>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Boton guardar */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#1b967a] text-white rounded-lg hover:bg-[#157a63] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Guardar Configuracion
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
