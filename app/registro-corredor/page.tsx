/**
 * Page: /registro-corredor
 *
 * Registro publico de corredores externos.
 * Wizard de 3 pasos para crear cuenta y enviar solicitud.
 *
 * @version 1.0
 * @fecha 12 Enero 2026
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  UserCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { createBrowserClient } from '@supabase/ssr';
import WizardSteps from '@/components/auth/WizardSteps';
import PasswordStrength from '@/components/auth/PasswordStrength';

// Tipos
type TipoPersona = 'natural' | 'juridica';

interface Country {
  code: string;      // "+51"
  iso: string;       // "PE"
  name: string;      // "Perú"
  flag: string;      // "🇵🇪"
  phoneLength?: number;  // 9
  startsWithRule?: string; // "9" (opcional)
  placeholder?: string; // "999 888 777"
}

interface FormData {
  // Paso 1
  email: string;
  password: string;
  confirmPassword: string;
  // Paso 2
  tipoPersona: TipoPersona;
  nombre: string;
  codigoPais: string;
  telefono: string;
  // Paso 3
  aceptaTerminos: boolean;
  turnstileToken: string;
}

const STEPS = [
  { number: 1, label: 'Cuenta' },
  { number: 2, label: 'Datos' },
  { number: 3, label: 'Confirmar' },
];

// Lista de países soportados
const COUNTRIES: Country[] = [
  { code: '+51', iso: 'PE', name: 'Perú', flag: '🇵🇪', phoneLength: 9, startsWithRule: '9', placeholder: '999 888 777' },
  { code: '+56', iso: 'CL', name: 'Chile', flag: '🇨🇱', phoneLength: 9, placeholder: '912 345 678' },
  { code: '+57', iso: 'CO', name: 'Colombia', flag: '🇨🇴', phoneLength: 10, placeholder: '300 123 4567' },
  { code: '+52', iso: 'MX', name: 'México', flag: '🇲🇽', phoneLength: 10, placeholder: '55 1234 5678' },
  { code: '+54', iso: 'AR', name: 'Argentina', flag: '🇦🇷', phoneLength: 10, placeholder: '11 1234 5678' },
  { code: '+1', iso: 'US', name: 'Estados Unidos', flag: '🇺🇸', phoneLength: 10, placeholder: '(555) 123-4567' },
  { code: '+34', iso: 'ES', name: 'España', flag: '🇪🇸', phoneLength: 9, placeholder: '612 345 678' },
  { code: '+593', iso: 'EC', name: 'Ecuador', flag: '🇪🇨', phoneLength: 9, placeholder: '991 234 567' },
  { code: '+591', iso: 'BO', name: 'Bolivia', flag: '🇧🇴', phoneLength: 8, placeholder: '7123 4567' },
  { code: '+595', iso: 'PY', name: 'Paraguay', flag: '🇵🇾', phoneLength: 9, placeholder: '981 123 456' },
];

const initialFormData: FormData = {
  email: '',
  password: '',
  confirmPassword: '',
  tipoPersona: 'natural',
  nombre: '',
  codigoPais: '+51', // Perú por defecto
  telefono: '',
  aceptaTerminos: false,
  turnstileToken: '',
};

export default function RegistroCorredorPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  // Crear cliente de Supabase para auto-login
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Verificar disponibilidad de email
  useEffect(() => {
    const checkEmail = async () => {
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setEmailAvailable(null);
        return;
      }

      setEmailChecking(true);
      try {
        const response = await fetch(
          `/api/auth/register-corredor?email=${encodeURIComponent(formData.email)}`
        );
        const data = await response.json();
        setEmailAvailable(data.available);
        if (!data.available) {
          setErrors((prev) => ({ ...prev, email: data.error }));
        } else {
          setErrors((prev) => {
            const { email, ...rest } = prev;
            return rest;
          });
        }
      } catch {
        setEmailAvailable(null);
      } finally {
        setEmailChecking(false);
      }
    };

    const debounce = setTimeout(checkEmail, 500);
    return () => clearTimeout(debounce);
  }, [formData.email]);

  // Handlers
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpiar error del campo
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const formatPhone = (value: string) => {
    // Solo numeros
    const numbers = value.replace(/\D/g, '');
    // Obtener límite según país
    const country = COUNTRIES.find((c) => c.code === formData.codigoPais);
    const maxLength = country?.phoneLength || 15; // Fallback a 15 si no hay límite
    return numbers.slice(0, maxLength);
  };

  // Validaciones por paso
  const validateStep1 = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
    } else if (emailAvailable === false) {
      newErrors.email = 'Este email ya tiene una cuenta';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Mínimo 8 caracteres';
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Debe incluir una mayúscula';
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Debe incluir un número';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = formData.tipoPersona === 'natural'
        ? 'El nombre completo es requerido'
        : 'La razón social es requerida';
    }

    if (!formData.telefono) {
      newErrors.telefono = 'El teléfono es requerido';
    } else {
      // Validación dinámica según país
      const country = COUNTRIES.find((c) => c.code === formData.codigoPais);

      if (country?.phoneLength && formData.telefono.length !== country.phoneLength) {
        newErrors.telefono = `Debe tener ${country.phoneLength} dígitos`;
      } else if (country?.startsWithRule && !formData.telefono.startsWith(country.startsWithRule)) {
        newErrors.telefono = `Debe empezar con ${country.startsWithRule}`;
      } else if (!/^\d+$/.test(formData.telefono)) {
        newErrors.telefono = 'Solo números';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.aceptaTerminos) {
      newErrors.aceptaTerminos = 'Debes aceptar los términos y condiciones';
    }

    if (!formData.turnstileToken) {
      newErrors.turnstileToken = 'Verificación de seguridad requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navegacion
  const handleNext = () => {
    let isValid = false;

    if (currentStep === 1) {
      isValid = validateStep1();
    } else if (currentStep === 2) {
      isValid = validateStep2();
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Submit
  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/auth/register-corredor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          nombre: formData.nombre,
          telefono: `${formData.codigoPais}${formData.telefono}`, // Teléfono completo con código
          tipoPersona: formData.tipoPersona,
          turnstileToken: formData.turnstileToken,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al crear cuenta');
      }

      setSubmitSuccess(true);

      // Auto-login despues de 2 segundos
      setTimeout(async () => {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          // Si falla auto-login, redirigir a login normal
          router.push('/login');
        } else {
          // Redirigir a completar registro
          router.push('/expansion/registro');
        }
      }, 2000);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render: Success State
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary to-primary flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Cuenta creada!
          </h2>
          <p className="text-gray-600 mb-4">
            Tu cuenta ha sido creada exitosamente. Te estamos redirigiendo para completar tu solicitud...
          </p>
          <div className="flex items-center justify-center gap-2 text-primary">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Iniciando sesión...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary to-primary flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Colabora con EcoPlaza</h1>
          <p className="text-gray-600 mt-1">Trabaja con nosotros como corredor independiente</p>
        </div>

        {/* Wizard Steps */}
        <WizardSteps steps={STEPS} currentStep={currentStep} />

        {/* Error general */}
        {submitError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error al crear cuenta</p>
              <p className="text-red-600 text-sm">{submitError}</p>
            </div>
          </div>
        )}

        {/* PASO 1: Credenciales */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Crea tu cuenta
            </h2>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="tu@email.com"
                  className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {emailChecking && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}
                {!emailChecking && emailAvailable === true && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
              <div className="mt-2">
                <PasswordStrength password={formData.password} />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar contraseña *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Repite tu contraseña"
                  className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <Check className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        )}

        {/* PASO 2: Datos basicos */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Datos básicos
            </h2>

            {/* Tipo Persona */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de registro
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleInputChange('tipoPersona', 'natural')}
                  className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                    formData.tipoPersona === 'natural'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <UserCircle className={`w-8 h-8 ${
                    formData.tipoPersona === 'natural' ? 'text-primary' : 'text-gray-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    formData.tipoPersona === 'natural' ? 'text-primary' : 'text-gray-600'
                  }`}>
                    Persona Natural
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInputChange('tipoPersona', 'juridica')}
                  className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                    formData.tipoPersona === 'juridica'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building2 className={`w-8 h-8 ${
                    formData.tipoPersona === 'juridica' ? 'text-primary' : 'text-gray-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    formData.tipoPersona === 'juridica' ? 'text-primary' : 'text-gray-600'
                  }`}>
                    Empresa
                  </span>
                </button>
              </div>
            </div>

            {/* Nombre / Razon Social */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.tipoPersona === 'natural' ? 'Nombre completo *' : 'Razón social *'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  placeholder={formData.tipoPersona === 'natural' ? 'Juan Pérez García' : 'Mi Empresa S.A.C.'}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                    errors.nombre ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.nombre && (
                <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>
              )}
            </div>

            {/* Telefono con selector de país */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono celular *
              </label>
              <div className="flex gap-2">
                {/* Selector de país */}
                <div className="relative flex-shrink-0">
                  <select
                    value={formData.codigoPais}
                    onChange={(e) => {
                      handleInputChange('codigoPais', e.target.value);
                      // Limpiar el teléfono al cambiar de país
                      handleInputChange('telefono', '');
                    }}
                    className="h-full px-3 py-3 border border-gray-300 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-primary focus:border-primary appearance-none pr-8 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.code}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Input de teléfono */}
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => handleInputChange('telefono', formatPhone(e.target.value))}
                    placeholder={
                      COUNTRIES.find((c) => c.code === formData.codigoPais)?.placeholder || 'Número de teléfono'
                    }
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                      errors.telefono ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>
              {errors.telefono && (
                <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>
              )}
              {/* Mensaje de ayuda dinámico */}
              <p className="text-gray-500 text-xs mt-1">
                {(() => {
                  const country = COUNTRIES.find((c) => c.code === formData.codigoPais);
                  if (!country) return 'Ingresa tu número de teléfono';
                  let message = `${country.phoneLength} dígitos`;
                  if (country.startsWithRule) {
                    message += ` que empiece con ${country.startsWithRule}`;
                  }
                  return message;
                })()}
              </p>
            </div>
          </div>
        )}

        {/* PASO 3: Confirmacion */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Confirma tu solicitud
            </h2>

            {/* Resumen */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Resumen</h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Email:</span>
                <span className="text-gray-900 font-medium">{formData.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tipo:</span>
                <span className="text-gray-900 font-medium">
                  {formData.tipoPersona === 'natural' ? 'Persona Natural' : 'Empresa'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {formData.tipoPersona === 'natural' ? 'Nombre:' : 'Razón social:'}
                </span>
                <span className="text-gray-900 font-medium">{formData.nombre}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Teléfono:</span>
                <span className="text-gray-900 font-medium">
                  {formData.codigoPais} {formData.telefono}
                </span>
              </div>
            </div>

            {/* Info adicional */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Después de registrarte:</strong> Podrás completar tu solicitud
                subiendo los documentos requeridos (DNI, recibo de luz, etc.).
              </p>
            </div>

            {/* Terminos */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terminos"
                checked={formData.aceptaTerminos}
                onChange={(e) => handleInputChange('aceptaTerminos', e.target.checked)}
                className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="terminos" className="text-sm text-gray-600">
                Acepto los{' '}
                <Link href="/terminos" target="_blank" className="text-primary hover:underline">
                  términos y condiciones
                </Link>{' '}
                y la{' '}
                <Link href="/privacidad" target="_blank" className="text-primary hover:underline">
                  política de privacidad
                </Link>
              </label>
            </div>
            {errors.aceptaTerminos && (
              <p className="text-red-500 text-sm">{errors.aceptaTerminos}</p>
            )}

            {/* Turnstile */}
            <div className="flex justify-center">
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onSuccess={(token) => handleInputChange('turnstileToken', token)}
                onError={() => setErrors((prev) => ({ ...prev, turnstileToken: 'Error de verificación' }))}
              />
            </div>
            {errors.turnstileToken && (
              <p className="text-red-500 text-sm text-center">{errors.turnstileToken}</p>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Atrás
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al login
            </Link>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Continuar
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.turnstileToken}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  Enviar Solicitud
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Inicia sesión
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
