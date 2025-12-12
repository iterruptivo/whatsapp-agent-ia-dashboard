'use client';

import { useState, useEffect } from 'react';
import { X, User, Mail, Lock, Shield, Loader2, RefreshCw, Copy, Check } from 'lucide-react';
import {
  type UsuarioConDatos,
  createUsuario,
  updateUsuario,
} from '@/lib/actions-usuarios';
import PhoneInputCustom from '@/components/shared/PhoneInputCustom';

interface UsuarioFormModalProps {
  usuario: UsuarioConDatos | null; // null = crear nuevo
  onClose: () => void;
  onSuccess: () => void;
}

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'jefe_ventas', label: 'Jefe de Ventas' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'vendedor_caseta', label: 'Vendedor Caseta' },
  { value: 'coordinador', label: 'Coordinador' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'marketing', label: 'Marketing' },
];

export default function UsuarioFormModal({
  usuario,
  onClose,
  onSuccess,
}: UsuarioFormModalProps) {
  const isEditing = !!usuario;

  // Form state
  const [nombre, setNombre] = useState(usuario?.nombre || '');
  const [email, setEmail] = useState(usuario?.email || '');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<string>(usuario?.rol || 'vendedor');
  const [telefono, setTelefono] = useState(usuario?.telefono || '');
  const [emailAlternativo, setEmailAlternativo] = useState(
    usuario?.email_alternativo || ''
  );

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generar contraseña segura compatible con Supabase
  const generateSecurePassword = () => {
    const length = 16;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = uppercase + lowercase + numbers + special;

    // Asegurar al menos uno de cada tipo
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Completar el resto
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Mezclar los caracteres
    password = password.split('').sort(() => Math.random() - 0.5).join('');

    setPassword(password);
    setShowPassword(true); // Mostrar la contraseña generada
    setCopied(false);
  };

  // Copiar contraseña al portapapeles
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

    // Validaciones básicas
    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    if (!email.trim()) {
      setError('El email es obligatorio');
      return;
    }

    if (!isEditing && !password) {
      setError('La contraseña es obligatoria para nuevos usuarios');
      return;
    }

    if (!isEditing && password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!telefono) {
      setError('El teléfono es obligatorio');
      return;
    }

    // PhoneInputCustom ya retorna el número sin +, solo dígitos con código de país
    // Ej: 51987654321 (código país + número)
    if (telefono.length < 10) {
      setError('El teléfono debe incluir código de país y número');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing) {
        // Update
        const result = await updateUsuario({
          id: usuario.id,
          nombre: nombre.trim(),
          rol: rol as UsuarioConDatos['rol'],
          telefono: telefono, // Ya viene limpio de PhoneInputCustom
          email_alternativo: emailAlternativo.trim() || undefined,
        });

        if (!result.success) {
          setError(result.message);
          return;
        }
      } else {
        // Create
        const result = await createUsuario({
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          password,
          rol: rol as UsuarioConDatos['rol'],
          telefono: telefono, // Ya viene limpio de PhoneInputCustom
          email_alternativo: emailAlternativo.trim() || undefined,
        });

        if (!result.success) {
          setError(result.message);
          return;
        }
      }

      onSuccess();
    } catch (err) {
      console.error('Error en formulario usuario:', err);
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
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-primary rounded-t-lg">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
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
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4" autoComplete="off">
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@ecoplaza.pe"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-100"
                  disabled={isSubmitting || isEditing}
                  autoComplete="new-email"
                />
              </div>
              {isEditing && (
                <p className="text-xs text-gray-500 mt-1">
                  El email no se puede cambiar
                </p>
              )}
            </div>

            {/* Password - solo para crear */}
            {!isEditing && (
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
                    className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                  {/* Botones dentro del input */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {password && (
                      <button
                        type="button"
                        onClick={copyToClipboard}
                        className="p-1 text-gray-400 hover:text-primary transition-colors"
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
                {/* Botón generar contraseña */}
                <button
                  type="button"
                  onClick={generateSecurePassword}
                  disabled={isSubmitting}
                  className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
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
            )}

            {/* Rol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol *
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none bg-white"
                  disabled={isSubmitting}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono *
              </label>
              <PhoneInputCustom
                value={telefono}
                onChange={setTelefono}
                defaultCountry="PE"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se guarda con código de país (sin +)
              </p>
            </div>

            {/* Email Alternativo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email alternativo
                <span className="text-gray-400 font-normal"> (opcional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={emailAlternativo}
                  onChange={(e) => setEmailAlternativo(e.target.value)}
                  placeholder="email.personal@gmail.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  disabled={isSubmitting}
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Solo referencia, NO se usa para login
              </p>
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
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isEditing ? 'Guardando...' : 'Creando...'}
                  </>
                ) : (
                  <>{isEditing ? 'Guardar Cambios' : 'Crear Usuario'}</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
