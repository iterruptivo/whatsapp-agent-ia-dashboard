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
  rol: 'admin' | 'vendedor' | 'jefe_ventas' | 'vendedor_caseta';
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

  // SESIÓN 45D: Wrapper with timeout + detailed logging
  const fetchUserDataWithTimeout = async (authUser: SupabaseUser, timeoutMs = 10000) => {
    console.log(`[AUTH] Starting fetch user data for ${authUser.email} with ${timeoutMs}ms timeout`);

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
      try {
        // SESIÓN 45E: Leer sesión de cookies (NO validar con servidor)
        const { data: { session } } = await supabase.auth.getSession();
        console.log('[AUTH] Session from cookies:', session ? 'exists' : 'none');

        if (session?.user) {
          setSupabaseUser(session.user);

          // Fetch user data directamente (confiar en la sesión)
          const userData = await fetchUserDataWithTimeout(session.user, 10000);

          if (userData) {
            setUser(userData);
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
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH] State changed:', event);

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

        // SESIÓN 45E: SIGNED_IN - Fetch datos SOLO si usuario cambió (NO validar con servidor)
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          console.log(`[AUTH] ${event} detected`);

          if (session?.user) {
            // Solo fetch si no tenemos usuario O si cambió el ID
            if (!user || user.id !== session.user.id) {
              console.log('[AUTH] New user detected, fetching data...');
              setSupabaseUser(session.user);

              // Fetch datos directamente (NO validar con servidor)
              const userData = await fetchUserDataWithTimeout(session.user, 10000);

              if (userData) {
                setUser(userData);
              } else {
                console.error('[AUTH] Failed to fetch user data, logging out');
                await supabase.auth.signOut();
              }
            } else {
              console.log('[AUTH] Same user, skipping fetch');
            }
            setLoading(false);
          } else {
            setLoading(false);
          }
        }

        // SESIÓN 45 FIX: TOKEN_REFRESHED (nuevo evento)
        if (event === 'TOKEN_REFRESHED') {
          console.log('[AUTH] Token refreshed successfully');
          // No hacer nada, el token se refrescó automáticamente
          // El usuario ya está logueado, no necesitamos re-fetch
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

      // Save proyecto to sessionStorage for persistence
      sessionStorage.setItem('selected_proyecto_id', proyectoId);

      // Redirect based on role
      if (userData.rol === 'admin') {
        router.push('/');
      } else if (userData.rol === 'vendedor') {
        router.push('/operativo');
      } else if (userData.rol === 'jefe_ventas' || userData.rol === 'vendedor_caseta') {
        router.push('/locales');
      }

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
      sessionStorage.removeItem('selected_proyecto_id');
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

export function useRequireRole(requiredRole: 'admin' | 'vendedor' | 'jefe_ventas' | 'vendedor_caseta') {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.rol !== requiredRole)) {
      // Redirect based on role
      if (user?.rol === 'vendedor' && requiredRole === 'admin') {
        router.push('/operativo'); // Vendedor trying to access admin
      } else if ((user?.rol === 'jefe_ventas' || user?.rol === 'vendedor_caseta') && requiredRole === 'admin') {
        router.push('/locales'); // Jefe/Caseta trying to access admin
      } else if ((user?.rol === 'jefe_ventas' || user?.rol === 'vendedor_caseta') && requiredRole === 'vendedor') {
        router.push('/locales'); // Jefe/Caseta trying to access vendedor routes
      } else {
        router.push('/login'); // Not authenticated
      }
    }
  }, [user, loading, requiredRole, router]);

  return { user, loading };
}
