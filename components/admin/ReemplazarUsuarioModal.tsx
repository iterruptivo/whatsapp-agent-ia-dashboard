'use client';

import { useState, useEffect } from 'react';
import { X, User, Mail, Lock, Phone, Loader2, RefreshCw, Copy, Check, AlertTriangle, UserPlus } from 'lucide-react';
import { type UsuarioConDatos, reemplazarUsuario } from '@/lib/actions-usuarios';

interface ReemplazarUsuarioModalProps {
  usuario: UsuarioConDatos;
  onClose: () => void;
  onSuccess: () => void;
}

const ROL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  gerencia: 'Gerencia',
  jefe_ventas: 'Jefe de Ventas',
  vendedor: 'Vendedor',
  vendedor_caseta: 'Vendedor Caseta',
  coordinador: 'Coordinador',
  finanzas: 'Finanzas',
  marketing: 'Marketing',
};

export default function ReemplazarUsuarioModal({
  usuario,
  onClose,
  onSuccess,
}: ReemplazarUsuarioModalProps) {
  // Form state para nuevo usuario
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Formatear teléfono para display
  const formatTelefono = (tel: string | null | undefined) => {
    if (!tel) return 'Sin teléfono';
    // Si tiene más de 9 dígitos, asumir que tiene código de país
    if (tel.length > 9) {
      const countryCode = tel.slice(0, tel.length - 9);
      const number = tel.slice(-9);
      return `+${countryCode} ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
    }
    return tel;
  };

  // Generar contraseña segura
  const generateSecurePassword = () => {
    const length = 16;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = uppercase + lowercase + numbers + special;

    let pwd = '';
    pwd += uppercase[Math.floor(Math.random() * uppercase.length)];
    pwd += lowercase[Math.floor(Math.random() * lowercase.length)];
    pwd += numbers[Math.floor(Math.random() * numbers.length)];
    pwd += special[Math.floor(Math.random() * special.length)];

    for (let i = pwd.length; i < length; i++) {
      pwd += allChars[Math.floor(Math.random() * allChars.length)];
    }

    pwd = pwd.split('').sort(() => Math.random() - 0.5).join('');
    setPassword(pwd);
    setShowPassword(true);
    setCopied(false);
  };

  // Copiar contraseña
  const copyToClipboard = async () => {
    if (password) {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!nuevoNombre.trim()) {
      setError('El nombre del nuevo usuario es obligatorio');
      return;
    }

    if (!nuevoEmail.trim()) {
      setError('El email del nuevo usuario es obligatorio');
      return;
    }

    if (!password) {
      setError('La contraseña es obligatoria');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await reemplazarUsuario({
        usuarioAnteriorId: usuario.id,
        nuevoNombre: nuevoNombre.trim(),
        nuevoEmail: nuevoEmail.trim().toLowerCase(),
        nuevoPassword: password,
      });

      if (!result.success) {
        setError(result.message);
        return;
      }

      onSuccess();
    } catch (err) {
      console.error('Error reemplazando usuario:', err);
      setError('Error inesperado. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, isSubmitting]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-amber-600 rounded-t-lg">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Reemplazar Usuario
            </h3>
            <button
              onClick={() => !isSubmitting && onClose()}
              disabled={isSubmitting}
              className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5" autoComplete="off">
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Usuario Actual (read-only) */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                USUARIO ACTUAL (será desactivado)
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nombre:</span>
                  <span className="font-medium text-gray-900">{usuario.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email:</span>
                  <span className="font-medium text-gray-900">{usuario.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rol:</span>
                  <span className="font-medium text-gray-900">{ROL_LABELS[usuario.rol] || usuario.rol}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Teléfono:
                  </span>
                  <span className="font-semibold text-primary">{formatTelefono(usuario.telefono)}</span>
                </div>
              </div>
            </div>

            {/* Nuevo Usuario */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                NUEVO USUARIO (heredará rol y teléfono)
              </h4>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Nombre del nuevo usuario"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    disabled={isSubmitting}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (login) *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={nuevoEmail}
                    onChange={(e) => setNuevoEmail(e.target.value)}
                    placeholder="nuevo.usuario@ecoplaza.pe"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    disabled={isSubmitting}
                    autoComplete="new-email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {password && (
                      <button
                        type="button"
                        onClick={copyToClipboard}
                        className="p-1 text-gray-400 hover:text-amber-600 transition-colors"
                        title="Copiar contraseña"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={generateSecurePassword}
                  disabled={isSubmitting}
                  className="mt-2 flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Generar contraseña segura
                </button>
                {password && showPassword && (
                  <p className="text-xs text-gray-500 mt-1">
                    Contraseña: <span className="font-mono bg-gray-100 px-1 rounded">{password}</span>
                  </p>
                )}
              </div>

              {/* Teléfono heredado (disabled) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono corporativo (heredado)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formatTelefono(usuario.telefono)}
                    disabled
                    className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                </div>
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Este teléfono se mantiene con el nuevo usuario
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Al confirmar:</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-700">
                    <li><strong>{usuario.nombre}</strong> no podrá iniciar sesión</li>
                    <li>El nuevo usuario heredará el rol <strong>{ROL_LABELS[usuario.rol]}</strong></li>
                    <li>El teléfono corporativo pasará automáticamente</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reemplazando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Reemplazar Usuario
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
