'use client';

/**
 * CambiarTitularModal - Modal para cambiar el titular de una ficha de inscripción
 * Operación sensible que requiere motivo obligatorio
 */

import { useState } from 'react';
import { X, UserCog, AlertTriangle, Loader2, Save, User } from 'lucide-react';
import { toast } from 'sonner';
import { cambiarTitularFicha } from '@/lib/actions-fichas-historial';

interface TitularActual {
  nombres: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  tipo_documento: string | null;
  numero_documento: string | null;
  celular: string | null;
  email: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  distrito: string | null;
  provincia: string | null;
  departamento: string | null;
}

interface CambiarTitularModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fichaId: string;
  localCodigo: string;
  titularActual: TitularActual;
}

export default function CambiarTitularModal({
  isOpen,
  onClose,
  onSuccess,
  fichaId,
  localCodigo,
  titularActual,
}: CambiarTitularModalProps) {
  const [saving, setSaving] = useState(false);

  // Form state
  const [nombres, setNombres] = useState('');
  const [apellidoPaterno, setApellidoPaterno] = useState('');
  const [apellidoMaterno, setApellidoMaterno] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('dni');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [direccion, setDireccion] = useState('');
  const [distrito, setDistrito] = useState('');
  const [provincia, setProvincia] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [motivo, setMotivo] = useState('');

  // Validaciones
  const isFormValid =
    nombres.trim().length > 0 &&
    apellidoPaterno.trim().length > 0 &&
    numeroDocumento.trim().length >= 8 &&
    celular.trim().length >= 9 &&
    motivo.trim().length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    setSaving(true);

    try {
      const result = await cambiarTitularFicha({
        fichaId,
        nuevoTitular: {
          nombres: nombres.trim(),
          apellido_paterno: apellidoPaterno.trim(),
          apellido_materno: apellidoMaterno.trim() || null,
          tipo_documento: tipoDocumento,
          numero_documento: numeroDocumento.trim(),
          celular: celular.trim(),
          email: email.trim() || null,
          fecha_nacimiento: fechaNacimiento || null,
          direccion: direccion.trim() || null,
          distrito: distrito.trim() || null,
          provincia: provincia.trim() || null,
          departamento: departamento.trim() || null,
        },
        motivo: motivo.trim(),
      });

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error al cambiar titularidad');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const nombreCompletoActual = [
    titularActual.nombres,
    titularActual.apellido_paterno,
    titularActual.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ') || 'Sin nombre';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <UserCog className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Cambiar Titularidad</h2>
                <p className="text-sm text-white/80">Local {localCodigo}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Titular Actual */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Titular Actual</span>
                <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                  Datos actuales
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Nombre:</span>
                  <span className="ml-2 text-gray-900">{nombreCompletoActual}</span>
                </div>
                <div>
                  <span className="text-gray-500">Documento:</span>
                  <span className="ml-2 text-gray-900">
                    {titularActual.tipo_documento?.toUpperCase() || 'DNI'}: {titularActual.numero_documento || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Celular:</span>
                  <span className="ml-2 text-gray-900">{titularActual.celular || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2 text-gray-900">{titularActual.email || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Nuevo Titular */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <UserCog className="w-4 h-4" />
                Datos del Nuevo Titular
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombres */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombres <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ingrese nombres"
                    required
                  />
                </div>

                {/* Apellido Paterno */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido Paterno <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={apellidoPaterno}
                    onChange={(e) => setApellidoPaterno(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ingrese apellido paterno"
                    required
                  />
                </div>

                {/* Apellido Materno */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido Materno
                  </label>
                  <input
                    type="text"
                    value={apellidoMaterno}
                    onChange={(e) => setApellidoMaterno(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ingrese apellido materno"
                  />
                </div>

                {/* Tipo Documento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Documento
                  </label>
                  <select
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="dni">DNI</option>
                    <option value="ce">Carné de Extranjería</option>
                    <option value="pasaporte">Pasaporte</option>
                    <option value="ruc">RUC</option>
                  </select>
                </div>

                {/* Número Documento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Documento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ingrese número"
                    required
                    minLength={8}
                  />
                </div>

                {/* Celular */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Celular <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={celular}
                    onChange={(e) => setCelular(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="9XX XXX XXX"
                    required
                    minLength={9}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                {/* Fecha Nacimiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Dirección */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Av. / Jr. / Calle..."
                  />
                </div>

                {/* Distrito */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Distrito
                  </label>
                  <input
                    type="text"
                    value={distrito}
                    onChange={(e) => setDistrito(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Distrito"
                  />
                </div>

                {/* Provincia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provincia
                  </label>
                  <input
                    type="text"
                    value={provincia}
                    onChange={(e) => setProvincia(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Provincia"
                  />
                </div>

                {/* Departamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={departamento}
                    onChange={(e) => setDepartamento(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Departamento"
                  />
                </div>
              </div>
            </div>

            {/* Motivo del Cambio */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <label className="text-sm font-semibold text-yellow-800">
                  Motivo del Cambio <span className="text-red-500">*</span>
                </label>
              </div>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white"
                placeholder="Explique detalladamente el motivo del cambio de titularidad (mínimo 10 caracteres)"
                required
                minLength={10}
              />
              <p className="mt-1 text-xs text-yellow-700">
                Este campo es obligatorio para auditoría. Será registrado en el historial de la ficha.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 rounded-b-xl flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isFormValid || saving}
              className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Cambiar Titular
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
