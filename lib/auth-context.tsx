'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useRouter } from 'next/navigation';
import { Proyecto } from './db';

// ============================================================================
// TYPES
// ============================================================================

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'vendedor' | 'jefe_ventas' | 'vendedor_caseta' | 'coordinador' | 'finanzas' | 'marketing';
  vendedor_id: string | null;
  activo: boolean;
}

interface AuthContextType {
  user: Usuario | null;
  supabaseUser: SupabaseUser | null;
  selectedProyecto: Proyecto | null;
  loading: boolean;
  signIn: (email: string, password: string, proyectoId: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// AUTH PROVIDER COMPONENT
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<Usuario | null>(null);
  const [selectedProyecto, setSelectedProyecto] = useState<Proyecto | null>(null);
  const [loading, setLoading] = useState(true);

  // SESIÓN 45C: Promise compartida para validaciones simultáneas
  const validationPromise = useRef<Promise<Usuario | null> | null>(null);
  const hasInitialized = useRef(false);

  // SESIÓN 45G: Flag para prevenir loop de eventos durante inicialización
  const isInitializing = useRef(false);

  // SESIÓN 45H: Timestamp para ignorar eventos inmediatamente después de init
  const ignoreEventsUntil = useRef<number>(0);

  // SESIÓN 46: Timestamp de inicio de sesión (para tracking de cache expiration)
  const loginTimestamp = useRef<number>(0);

  // FIX STALE CLOSURE: Refs para acceder a valores actuales en callbacks
  const userRef = useRef<Usuario | null>(null);
  const supabaseUserRef = useRef<SupabaseUser | null>(null);
  const selectedProyectoRef = useRef<Proyecto | null>(null);

  // Sincronizar refs con state (previene stale closures)
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    supabaseUserRef.current = supabaseUser;
  }, [supabaseUser]);

  useEffect(() => {
    selectedProyectoRef.current = selectedProyecto;
  }, [selectedProyecto]);

  // ============================================================================
  // FETCH USER DATA FROM USUARIOS TABLE (WITH TIMEOUT)
  // ============================================================================
  const fetchUserData = async (authUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('[AUTH ERROR] Error fetching user data:', error);
        return null;
      }

      if (!data) {
        console.error('[AUTH ERROR] User not found in usuarios table for ID:', authUser.id);
        return null;
      }

      // Check if user is active
      if (!data.activo) {
        console.error('[AUTH ERROR] User is deactivated:', data.email);
        return null;
      }

      return data as Usuario;
    } catch (error) {
      console.error('[AUTH ERROR] Unexpected error fetching user data:', error);
      return null;
    }
  };

  // SESIÓN 45F: Cache en localStorage + timeout aumentado
  // FIX: Timeout default 60s (Plan Pro Supabase tiene mejor performance)
  const fetchUserDataWithTimeout = async (authUser: SupabaseUser, timeoutMs = 60000) => {
    console.log(`[AUTH] Starting fetch user data for ${authUser.email} with ${timeoutMs}ms timeout`);

    // SESIÓN 45F: Intentar leer de cache primero
    try {
      const cacheKey = `user_data_${authUser.id}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const cachedData = JSON.parse(cached);
        const cacheAge = Date.now() - cachedData.timestamp;

        // Cache válido por 5 minutos
        if (cacheAge < 5 * 60 * 1000) {
          console.log('[AUTH] Using cached user data (age:', Math.round(cacheAge / 1000), 'seconds)');
          return cachedData.user as Usuario;
        } else {
          // SESIÓN 46: Mostrar tiempo desde login
          const timeSinceLogin = Date.now() - loginTimestamp.current;
          const minutes = Math.floor(timeSinceLogin / 60000);
          const seconds = Math.floor((timeSinceLogin % 60000) / 1000);
          console.log(`[AUTH] Cache expired, fetching fresh data (${minutes}m ${seconds}s desde login)`);
        }
      }
    } catch (error) {
      console.warn('[AUTH] Error reading cache:', error);
    }

    // SESIÓN 45F: Fetch de BD con timeout aumentado a 30s
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn('[AUTH WARNING] Timeout fetching user data after', timeoutMs, 'ms');
        resolve(null);
      }, timeoutMs)
    );

    try {
      const result = await Promise.race([
        fetchUserData(authUser),
        timeoutPromise
      ]);

      if (result === null) {
        console.error('[AUTH] fetchUserDataWithTimeout returned null (timeout or DB error)');
      } else {
        console.log('[AUTH] fetchUserDataWithTimeout completed successfully');

        // SESIÓN 45F: Guardar en cache
        try {
          const cacheKey = `user_data_${authUser.id}`;
          localStorage.setItem(cacheKey, JSON.stringify({
            user: result,
            timestamp: Date.now()
          }));
          console.log('[AUTH] User data cached successfully');
        } catch (error) {
          console.warn('[AUTH] Error saving cache:', error);
        }
      }

      return result;
    } catch (error) {
      console.error('[AUTH ERROR] Error in fetchUserDataWithTimeout:', error);
      return null;
    }
  };

  // ============================================================================
  // SESIÓN 45D FIX: Promise compartida con timeout de seguridad
  // ============================================================================
  const validateAndFetchUserData = async (timeoutMs = 10000, skipLogoutOnError = false): Promise<Usuario | null> => {
    // Si hay una validación en progreso, ESPERAR a que termine con timeout de seguridad
    if (validationPromise.current) {
      console.log('[AUTH] Validation already in progress, waiting for result...');

      // SESIÓN 45D: Timeout de seguridad - si la Promise no resuelve en 12s, limpiar y continuar
      const safetyTimeout = new Promise<Usuario | null>((resolve) => {
        setTimeout(() => {
          console.warn('[AUTH] Shared promise timeout, cleaning up and retrying...');
          validationPromise.current = null;
          resolve(null);
        }, 12000); // 12s > 10s (timeout de fetch)
      });

      const result = await Promise.race([
        validationPromise.current,
        safetyTimeout
      ]);

      // Si el timeout ganó, result será null y validationPromise.current ya está limpia
      if (result === null && validationPromise.current === null) {
        console.log('[AUTH] Retrying validation after shared promise timeout...');
        // Reintentar sin el shared promise
        return validateAndFetchUserData(timeoutMs, skipLogoutOnError);
      }

      return result;
    }

    // Crear nueva Promise y guardarla
    const promise = (async () => {
      try {
        console.log('[AUTH] Validating session with server...');

        // PASO 1: Validar JWT con servidor (NO cookies)
        const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();

        if (userError || !validatedUser) {
          console.error('[AUTH] Session validation failed:', userError?.message);

          // SESIÓN 45D: NO hacer logout si estamos en inicialización y no hay sesión (es normal)
          if (skipLogoutOnError) {
            console.log('[AUTH] No session found, but skipping logout (initial load)');
            return null;
          }

          console.log('[AUTH] Forcing logout (invalid/expired session)');

          // JWT inválido/expirado → Logout automático
          await supabase.auth.signOut();
          setSupabaseUser(null);
          setUser(null);
          setLoading(false);
          router.push('/login');
          return null;
        }

        console.log('[AUTH] Session validated successfully for:', validatedUser.email);

        // PASO 2: Fetch user data SOLO si JWT es válido
        setSupabaseUser(validatedUser);
        const userData = await fetchUserDataWithTimeout(validatedUser, timeoutMs);

        if (!userData) {
          console.error('[AUTH] Failed to fetch user data, forcing logout');
          await supabase.auth.signOut();
          setSupabaseUser(null);
          setUser(null);
          setLoading(false);
          router.push('/login');
          return null;
        }

        console.log('[AUTH] User data fetched successfully');
        return userData;
      } catch (error) {
        console.error('[AUTH ERROR] Unexpected error in validateAndFetchUserData:', error);

        if (!skipLogoutOnError) {
          await supabase.auth.signOut();
          setSupabaseUser(null);
          setUser(null);
          setLoading(false);
          router.push('/login');
        }

        return null;
      } finally {
        // Limpiar Promise cuando termine (éxito o error)
        console.log('[AUTH] Cleaning up shared promise');
        validationPromise.current = null;
      }
    })();

    // Guardar Promise para que otras llamadas esperen
    validationPromise.current = promise;
    return promise;
  };

  // ============================================================================
  // FETCH PROYECTO DATA (for multi-proyecto support)
  // ============================================================================
  const fetchProyectoData = async (proyectoId: string) => {
    try {
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .eq('id', proyectoId)
        .eq('activo', true)
        .single();

      if (error) {
        console.error('[AUTH ERROR] Error fetching proyecto:', error);
        return null;
      }

      if (!data) {
        console.error('[AUTH ERROR] Proyecto not found or inactive:', proyectoId);
        return null;
      }

      return data as Proyecto;
    } catch (error) {
      console.error('[AUTH ERROR] Unexpected error fetching proyecto:', error);
      return null;
    }
  };

  // ============================================================================
  // SESIÓN 45E: FIX DEFINITIVO - Solo validar en login, confiar en cookies
  // ============================================================================
  // useEffect #1: Initialize auth system ONCE (no dependency)
  useEffect(() => {
    // SESIÓN 45E: Prevenir múltiples inicializaciones
    if (hasInitialized.current) {
      console.log('[AUTH] Already initialized, skipping...');
      return;
    }

    console.log('[AUTH] Initializing auth system...');
    hasInitialized.current = true;

    const initializeAuth = async () => {
      // SESIÓN 45G: Marcar que estamos inicializando (previene loop de eventos)
      isInitializing.current = true;

      try {
        // SESIÓN 45E: Leer sesión de cookies (NO validar con servidor)
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AUTH] Session from cookies:', session ? 'exists' : 'none');

        if (session?.user) {
          setSupabaseUser(session.user);

          // Fetch user data directamente (confiar en la sesión)
          // FIX: Timeout 60s en init también (Plan Pro)
          const userData = await fetchUserDataWithTimeout(session.user, 60000);

          if (userData) {
            setUser(userData);
            loginTimestamp.current = Date.now(); // SESIÓN 46: Guardar timestamp de login

            // FIX MULTI-TAB: Recuperar proyecto de localStorage (compartido entre tabs)
            const savedProyectoId = localStorage.getItem('selected_proyecto_id');
            if (savedProyectoId) {
              console.log('[AUTH] Restoring proyecto from localStorage:', savedProyectoId);
              const proyectoData = await fetchProyectoData(savedProyectoId);
              if (proyectoData) {
                setSelectedProyecto(proyectoData);
              } else {
                console.warn('[AUTH] Proyecto not found, clearing localStorage');
                localStorage.removeItem('selected_proyecto_id');
                // SESIÓN 55: Limpiar cookie también
                document.cookie = 'selected_proyecto_id=; path=/; max-age=0';
              }
            }
          } else {
            // Si falla fetch de datos, logout
            console.error('[AUTH] Failed to fetch user data on init, logging out');
            await supabase.auth.signOut();
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('[AUTH ERROR] Error initializing auth:', error);
        setLoading(false);
      } finally {
        // SESIÓN 45G: Inicialización completa, permitir que eventos se procesen
        isInitializing.current = false;

        // SESIÓN 45H: Ignorar eventos por 2 segundos después de init (previene loop)
        ignoreEventsUntil.current = Date.now() + 2000;
        console.log('[AUTH] Initialization complete, ignoring events for 2s to prevent loop');
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH] State changed:', event);

        // SESIÓN 45G: IGNORAR eventos durante inicialización (previene loop)
        if (isInitializing.current) {
          console.log('[AUTH] ⏸️ Ignoring event during initialization:', event);
          return;
        }

        // SESIÓN 45H: IGNORAR eventos inmediatamente después de init (previene loop)
        if (Date.now() < ignoreEventsUntil.current) {
          console.log('[AUTH] ⏸️ Ignoring event after initialization (cooldown period):', event);
          return;
        }

        // SESIÓN 45E: Manejar SIGNED_OUT explícitamente
        if (event === 'SIGNED_OUT') {
          console.log('[AUTH] SIGNED_OUT detected');
          setUser(null);
          setSupabaseUser(null);
          setLoading(false);
          return;
        }

        // SESIÓN 45E: INITIAL_SESSION - Solo actualizar si tenemos datos
        if (event === 'INITIAL_SESSION') {
          console.log('[AUTH] INITIAL_SESSION detected');
          // initializeAuth ya manejó esto, no hacer nada
          setLoading(false);
          return;
        }

        // SESIÓN 45I: TOKEN_REFRESHED - Auto-refresh de JWT cada ~55min (NO hacer fetch)
        if (event === 'TOKEN_REFRESHED') {
          console.log('[AUTH] ✅ Token refreshed successfully (auto-refresh every ~55min)');
          // No hacer nada - el token se refrescó automáticamente
          // El usuario ya está logueado, NO necesitamos re-fetch ni re-validar
          return;
        }

        // SESIÓN 45I: SIGNED_IN - Solo fetch si es LOGIN REAL (no token refresh)
        // SESIÓN 46: FIX Chrome duplicate SIGNED_IN event
        // FIX MULTI-TAB: Ignorar SIGNED_IN si usuario ya autenticado (previene logout spurious)
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          console.log(`[AUTH] ${event} detected`);

          if (session?.user) {
            // FIX STALE CLOSURE: Verificar cache localStorage directamente
            // (NO confiar en state 'user' porque puede ser stale closure)
            const cacheKey = `user_data_${session.user.id}`;
            const cached = localStorage.getItem(cacheKey);

            if (cached) {
              try {
                const cachedData = JSON.parse(cached);
                const cacheAge = Date.now() - cachedData.timestamp;

                // Si cache es válido (< 5 min), usuario YA está logueado
                if (cacheAge < 5 * 60 * 1000) {
                  console.log('[AUTH] ✅ User already cached (age:', Math.round(cacheAge / 1000), 's), ignoring spurious event');

                  // FIX STALE CLOSURE: Usar refs en vez de state para verificar
                  if (!userRef.current) {
                    console.log('[AUTH] Restoring user from cache');
                    setUser(cachedData.user);
                  }

                  if (!supabaseUserRef.current) {
                    setSupabaseUser(session.user);
                  }

                  // FIX: Restaurar selectedProyecto solo si NO está ya seteado
                  if (!selectedProyectoRef.current) {
                    const savedProyectoId = localStorage.getItem('selected_proyecto_id');
                    if (savedProyectoId) {
                      console.log('[AUTH] Restoring proyecto from localStorage:', savedProyectoId);
                      fetchProyectoData(savedProyectoId).then(proyectoData => {
                        if (proyectoData) {
                          setSelectedProyecto(proyectoData);
                        }
                      });
                    }
                  }

                  setLoading(false);
                  return;
                }
              } catch (error) {
                console.warn('[AUTH] Error parsing cache, proceeding with fetch:', error);
              }
            }

            // SESIÓN 46: FIX - Verificar AMBOS estados (user Y supabaseUser)
            // FIX STALE CLOSURE: Usar refs en vez de state
            if (!userRef.current && !supabaseUserRef.current) {
              console.log('[AUTH] New login detected, fetching user data...');
              setSupabaseUser(session.user);

              // FIX: Timeout aumentado a 60s (Plan Pro Supabase)
              const userData = await fetchUserDataWithTimeout(session.user, 60000);

              if (userData) {
                setUser(userData);
                loginTimestamp.current = Date.now(); // SESIÓN 46: Guardar timestamp de login
              } else {
                // FIX: Solo logout si es login NUEVO (no re-fetch de usuario existente)
                console.error('[AUTH] Failed to fetch user data on NEW login, logging out');
                await supabase.auth.signOut();
              }
            } else if (userRef.current && userRef.current.id !== session.user.id) {
              // Usuario diferente (edge case: cambio de cuenta)
              console.log('[AUTH] Different user detected, fetching new user data...');
              setSupabaseUser(session.user);
              const userData = await fetchUserDataWithTimeout(session.user, 60000);
              if (userData) {
                setUser(userData);
                loginTimestamp.current = Date.now(); // SESIÓN 46: Guardar timestamp de login
              } else {
                // Solo logout si es cambio de usuario (no re-fetch de usuario existente)
                console.error('[AUTH] Failed to fetch new user data, logging out');
                await supabase.auth.signOut();
              }
            } else {
              // SESIÓN 46: Usuario ya autenticado - ignorar evento duplicado
              console.log('[AUTH] ✅ User already authenticated, ignoring duplicate SIGNED_IN event');
            }
            setLoading(false);
          } else {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      console.log('[AUTH] Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []); // ← Empty dependency array (ejecuta solo 1 vez)

  // ============================================================================
  // useEffect #2: Polling de usuario activo (depende de supabaseUser?.id)
  // ============================================================================
  useEffect(() => {
    if (!supabaseUser?.id) return;

    console.log('[AUTH POLLING] Iniciando polling de estado activo (cada 60s)');

    const pollingInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('activo')
          .eq('id', supabaseUser.id)
          .single();

        if (error) {
          console.warn('[AUTH POLLING] Error checking activo status (ignoring):', error);
          return;
        }

        if (data && !data.activo) {
          console.error('[AUTH POLLING] User deactivated, logging out');
          await signOut();
        }
      } catch (error) {
        console.error('[AUTH POLLING] Unexpected error (ignoring):', error);
      }
    }, 60000);

    return () => {
      console.log('[AUTH POLLING] Polling detenido');
      clearInterval(pollingInterval);
    };
  }, [supabaseUser?.id]); // ← Dependency solo para polling

  // ============================================================================
  // SIGN IN (with proyecto selection)
  // ============================================================================
  const signIn = async (email: string, password: string, proyectoId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'No se pudo obtener información del usuario' };
      }

      // Fetch user data from usuarios table
      const userData = await fetchUserData(data.user);

      if (!userData) {
        // User exists in auth but not in usuarios table or is deactivated
        await supabase.auth.signOut(); // Clean up session
        return { success: false, error: 'Usuario no autorizado o desactivado' };
      }

      // MULTI-PROYECTO: Fetch and validate selected proyecto
      const proyectoData = await fetchProyectoData(proyectoId);

      if (!proyectoData) {
        await supabase.auth.signOut(); // Clean up session
        return { success: false, error: 'Proyecto no válido o inactivo' };
      }

      // Set auth state
      setSupabaseUser(data.user);
      setUser(userData);
      setSelectedProyecto(proyectoData);

      // FIX MULTI-TAB: Save proyecto to localStorage (compartido entre tabs)
      localStorage.setItem('selected_proyecto_id', proyectoId);

      // SESIÓN 55: Guardar en cookie para acceso desde Server Components
      document.cookie = `selected_proyecto_id=${proyectoId}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30 días

      // Redirect based on role
      if (userData.rol === 'admin' || userData.rol === 'marketing') {
        router.push('/');
      } else if (userData.rol === 'vendedor' || userData.rol === 'vendedor_caseta') {
        router.push('/operativo');
      } else if (userData.rol === 'jefe_ventas' || userData.rol === 'coordinador' || userData.rol === 'finanzas') {
        router.push('/locales');
      }

      // SESIÓN 45H: Resetear cooldown para que eventos de login se procesen
      ignoreEventsUntil.current = 0;

      return { success: true };
    } catch (error) {
      console.error('Unexpected error during sign in:', error);
      return { success: false, error: 'Error inesperado. Por favor intenta nuevamente.' };
    }
  };

  // ============================================================================
  // SIGN OUT
  // ============================================================================
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSupabaseUser(null);
      setUser(null);
      setSelectedProyecto(null);
      // FIX MULTI-TAB: Limpiar proyecto de localStorage (compartido entre tabs)
      localStorage.removeItem('selected_proyecto_id');
      // SESIÓN 55: Limpiar cookie también
      document.cookie = 'selected_proyecto_id=; path=/; max-age=0';
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================
  const value: AuthContextType = {
    user,
    supabaseUser,
    selectedProyecto,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================================================
// HELPER FUNCTIONS (for components)
// ============================================================================

export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  return { user, loading };
}

export function useRequireRole(requiredRole: 'admin' | 'vendedor' | 'jefe_ventas' | 'vendedor_caseta' | 'coordinador' | 'finanzas' | 'marketing') {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.rol !== requiredRole)) {
      // Redirect based on role
      if (user?.rol === 'vendedor' && requiredRole === 'admin') {
        router.push('/operativo'); // Vendedor trying to access admin
      } else if ((user?.rol === 'jefe_ventas' || user?.rol === 'vendedor_caseta' || user?.rol === 'coordinador' || user?.rol === 'finanzas') && requiredRole === 'admin') {
        router.push('/locales'); // Jefe/Caseta/Coordinador/Finanzas trying to access admin
      } else if ((user?.rol === 'jefe_ventas' || user?.rol === 'vendedor_caseta' || user?.rol === 'coordinador' || user?.rol === 'finanzas') && requiredRole === 'vendedor') {
        router.push('/locales'); // Jefe/Caseta/Coordinador/Finanzas trying to access vendedor routes
      } else {
        router.push('/login'); // Not authenticated
      }
    }
  }, [user, loading, requiredRole, router]);

  return { user, loading };
}
