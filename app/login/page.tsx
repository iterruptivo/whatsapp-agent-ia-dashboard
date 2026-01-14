'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getAllProyectos, Proyecto } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, LogIn, AlertCircle, FolderOpen, BarChart3, CheckCircle2, Users } from 'lucide-react';
import Link from 'next/link';
import VersionBadge from '@/components/shared/VersionBadge';

// State machine for login flow
type LoginState = 'idle' | 'validating' | 'credentials_valid' | 'logging_in' | 'error';

export default function LoginPage() {
  const { signIn, loading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [proyectoId, setProyectoId] = useState('');
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);

  // State management
  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [userRol, setUserRol] = useState('');

  // Check for URL error parameter (e.g., ?error=deactivated)
  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError === 'deactivated') {
      setError('Tu cuenta ha sido desactivada. Contacta al administrador.');
      setLoginState('error');
    }
  }, [searchParams]);

  // Fetch proyectos (only after credentials are validated)
  const fetchProyectos = async () => {
    const data = await getAllProyectos();
    setProyectos(data);
  };

  // STEP 1: Validate credentials
  const handleValidateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginState('validating');

    // Basic validation
    if (!email || !password) {
      setError('Por favor ingresa email y contraseña');
      setLoginState('error');
      setTimeout(() => setLoginState('idle'), 500); // Shake animation
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido');
      setLoginState('error');
      setTimeout(() => setLoginState('idle'), 500);
      return;
    }

    try {
      // Call the validation API
      const response = await fetch('/api/auth/validate-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Credenciales inválidas');
        setLoginState('error');
        setTimeout(() => setLoginState('idle'), 500);
        return;
      }

      // Credentials are valid!
      setUserName(data.user.nombre);
      setUserRol(data.user.rol);

      // SPECIAL CASE: Corredores skip proyecto selection
      if (data.user.rol === 'corredor') {
        setLoginState('logging_in');

        // Login directly (corredores don't need proyecto)
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError || !authData.user) {
          setError('Error al iniciar sesión. Intenta nuevamente.');
          setLoginState('error');
          setTimeout(() => setLoginState('idle'), 500);
          return;
        }

        // Redirect directly to /expansion/registro
        router.push('/expansion/registro');
        return;
      }

      // For other roles: show proyecto selector
      setLoginState('credentials_valid');

      // Fetch proyectos for step 2
      await fetchProyectos();

    } catch (error) {
      console.error('Error validating credentials:', error);
      setError('Error de conexión. Por favor intenta nuevamente.');
      setLoginState('error');
      setTimeout(() => setLoginState('idle'), 500);
    }
  };

  // STEP 2: Complete login with proyecto selection
  const handleCompleteLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginState('logging_in');

    // REPORTERÍA MODE: If "Reportería" is selected
    if (proyectoId === 'REPORTERIA') {
      try {
        // Manual authentication for reportería mode
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          setLoginState('error');
          setTimeout(() => setLoginState('credentials_valid'), 500);
          return;
        }

        if (!data.user) {
          setError('No se pudo obtener información del usuario');
          setLoginState('error');
          setTimeout(() => setLoginState('credentials_valid'), 500);
          return;
        }

        // Fetch user data to verify role
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (userError || !userData) {
          await supabase.auth.signOut();
          setError('Usuario no autorizado');
          setLoginState('error');
          setTimeout(() => setLoginState('credentials_valid'), 500);
          return;
        }

        // Check if user is active
        if (!userData.activo) {
          await supabase.auth.signOut();
          setError('Tu cuenta ha sido desactivada. Contacta al administrador.');
          setLoginState('error');
          setTimeout(() => setLoginState('credentials_valid'), 500);
          return;
        }

        // Verify user has permission for Reportería
        if (userData.rol !== 'admin' && userData.rol !== 'jefe_ventas' && userData.rol !== 'marketing') {
          await supabase.auth.signOut();
          setError('No tienes permisos para acceder a Reportería');
          setLoginState('error');
          setTimeout(() => setLoginState('credentials_valid'), 500);
          return;
        }

        // Set a temporary proyecto in localStorage for the session
        const firstProyecto = proyectos.length > 0 ? proyectos[0] : null;
        if (firstProyecto) {
          localStorage.setItem('selected_proyecto_id', firstProyecto.id);
          localStorage.setItem('selected_proyecto', JSON.stringify(firstProyecto));
          // Set cookie for server components
          document.cookie = `selected_proyecto_id=${firstProyecto.id}; path=/; max-age=${60 * 60 * 24 * 30}`;
        }

        // Redirect to reportería
        router.push('/reporteria');
      } catch (error) {
        console.error('Error during reportería login:', error);
        setError('Error inesperado. Por favor intenta nuevamente.');
        setLoginState('error');
        setTimeout(() => setLoginState('credentials_valid'), 500);
      }
      return;
    }

    // MULTI-PROYECTO: Validate proyecto is selected
    if (!proyectoId) {
      setError('Por favor selecciona un proyecto');
      setLoginState('error');
      setTimeout(() => setLoginState('credentials_valid'), 500);
      return;
    }

    // Sign in with proyecto
    const result = await signIn(email, password, proyectoId);

    if (!result.success) {
      setError(result.error || 'Error al iniciar sesión');
      setLoginState('error');
      setTimeout(() => setLoginState('credentials_valid'), 500);
    }
    // If success, router.push is called in signIn function
  };

  // Determine if we should show the proyecto selector
  const showProyectoSelector = loginState === 'credentials_valid' || loginState === 'logging_in';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary via-secondary to-primary">
      {/* Background pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>

      {/* Login Card */}
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-secondary px-8 py-10 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">EcoPlaza</h1>
            <p className="text-gray-200 text-sm">Command Center</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <form
              onSubmit={showProyectoSelector ? handleCompleteLogin : handleValidateCredentials}
              className="space-y-6"
            >
              {/* Error Message */}
              {error && (
                <div
                  className={`bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 transition-all duration-300 ${
                    loginState === 'error' ? 'animate-shake' : ''
                  }`}
                >
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error de autenticación</p>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Success Message - Welcome user */}
              {showProyectoSelector && userRol !== 'corredor' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 animate-slideDown">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">¡Bienvenido/a, {userName}!</p>
                    <p className="text-sm text-green-600 mt-1">Selecciona tu proyecto para continuar</p>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className={`transition-all duration-500 ${showProyectoSelector ? 'opacity-50' : 'opacity-100'}`}>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    disabled={loginState !== 'idle' && loginState !== 'error'}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    autoComplete="email"
                    autoFocus={!showProyectoSelector}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className={`transition-all duration-500 ${showProyectoSelector ? 'opacity-50' : 'opacity-100'}`}>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loginState !== 'idle' && loginState !== 'error'}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Proyecto Dropdown - ANIMATED REVEAL (hidden until credentials validated and not corredor) */}
              {showProyectoSelector && userRol !== 'corredor' && (
                <div className="animate-slideDown">
                  <label htmlFor="proyecto" className="block text-sm font-medium text-gray-700 mb-2">
                    Proyecto
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      {proyectoId === 'REPORTERIA' ? (
                        <BarChart3 className="h-5 w-5 text-gray-400" />
                      ) : (
                        <FolderOpen className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <select
                      id="proyecto"
                      value={proyectoId}
                      onChange={(e) => setProyectoId(e.target.value)}
                      disabled={loginState === 'logging_in' || proyectos.length === 0}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none bg-white"
                      autoFocus={showProyectoSelector}
                    >
                      <option value="">-- Selecciona un proyecto --</option>
                      {proyectos.map((proyecto) => (
                        <option key={proyecto.id} value={proyecto.id}>
                          {proyecto.nombre}
                        </option>
                      ))}
                      {/* Separator line - rendered as disabled option */}
                      <option disabled className="text-gray-400">
                        ──────────────────────
                      </option>
                      {/* Reportería option - shown for all users, will validate role on submit */}
                      <option value="REPORTERIA" className="font-semibold">
                        📊 Reportería
                      </option>
                    </select>
                    {/* Custom dropdown arrow */}
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loginState === 'validating' || loginState === 'logging_in' || loading}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white py-3 px-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loginState === 'validating' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Validando...</span>
                  </>
                ) : loginState === 'logging_in' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Ingresando...</span>
                  </>
                ) : showProyectoSelector ? (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Continuar</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Iniciar Sesión</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-400 text-center">
                Powered by: iterruptivo
              </p>
              <div className="text-center mt-2">
                <VersionBadge variant="login" />
              </div>
            </div>
          </div>
        </div>

        {/* Link de Colaboradores - Debajo del card */}
        <div className="mt-6 text-center">
          <Link
            href="/registro-corredor"
            className="inline-flex items-center gap-2 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition-all group"
          >
            <Users className="w-5 h-5 text-accent" />
            <div className="text-left">
              <p className="text-sm text-gray-200">¿Eres corredor inmobiliario?</p>
              <p className="text-base font-semibold text-white group-hover:text-accent transition-colors">
                Colabora con EcoPlaza →
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        .animate-slideDown {
          animation: slideDown 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
