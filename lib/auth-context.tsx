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

  // SESIÓN 45B: Prevenir validaciones simultáneas
  const isValidating = useRef(false);
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

  // CRITICAL FIX: Wrapper with timeout to prevent infinite loading
  const fetchUserDataWithTimeout = async (authUser: SupabaseUser, timeoutMs = 10000) => {
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn('[AUTH WARNING] Timeout fetching user data after', timeoutMs, 'ms');
        resolve(null);
      }, timeoutMs)
    );

    try {
      return await Promise.race([
        fetchUserData(authUser),
        timeoutPromise
      ]);
    } catch (error) {
      console.error('[AUTH ERROR] Error in fetchUserDataWithTimeout:', error);
      return null;
    }
  };

  // ============================================================================
  // SESIÓN 45B FIX: Validar JWT con servidor ANTES de fetch (con protección contra llamadas simultáneas)
  // ============================================================================
  const validateAndFetchUserData = async (timeoutMs = 10000, skipLogoutOnError = false): Promise<Usuario | null> => {
    // Prevenir validaciones simultáneas
    if (isValidating.current) {
      console.log('[AUTH] Validation already in progress, skipping...');
      return null;
    }

    isValidating.current = true;

    try {
      console.log('[AUTH] Validating session with server...');

      // PASO 1: Validar JWT con servidor (NO cookies)
      const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();

      if (userError || !validatedUser) {
        console.error('[AUTH] Session validation failed:', userError?.message);

        // SESIÓN 45B: NO hacer logout si estamos en inicialización y no hay sesión (es normal)
        if (skipLogoutOnError) {
          console.log('[AUTH] No session found, but skipping logout (initial load)');
          isValidating.current = false;
          return null;
        }

        console.log('[AUTH] Forcing logout (invalid/expired session)');

        // JWT inválido/expirado → Logout automático
        await supabase.auth.signOut();
        setSupabaseUser(null);
        setUser(null);
        setLoading(false);
        router.push('/login');
        isValidating.current = false;
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
        isValidating.current = false;
        return null;
      }

      isValidating.current = false;
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

      isValidating.current = false;
      return null;
    }
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
  // SESIÓN 45B: FIX LOOP INFINITO - Validar antes de fetch (con protección contra re-inicializaciones)
  // ============================================================================
  // useEffect #1: Initialize auth system ONCE (no dependency)
  useEffect(() => {
    // SESIÓN 45B: Prevenir múltiples inicializaciones
    if (hasInitialized.current) {
      console.log('[AUTH] Already initialized, skipping...');
      return;
    }

    console.log('[AUTH] Initializing auth system...');
    hasInitialized.current = true;

    const initializeAuth = async () => {
      try {
        // SESIÓN 45B FIX: Skip logout en carga inicial (no hay sesión todavía)
        const userData = await validateAndFetchUserData(10000, true);

        if (userData) {
          setUser(userData);
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

        // SESIÓN 45 FIX: Manejar SIGNED_OUT explícitamente
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSupabaseUser(null);
          setLoading(false);
          return;
        }

        // SESIÓN 45B FIX: Manejar INITIAL_SESSION explícitamente (solo si hay sesión)
        if (event === 'INITIAL_SESSION') {
          console.log('[AUTH] INITIAL_SESSION detected');

          if (session?.user) {
            console.log('[AUTH] INITIAL_SESSION with valid session, validating...');
            // Validar con skipLogoutOnError porque podría estar recuperando sesión
            const userData = await validateAndFetchUserData(10000, true);
            if (userData) {
              setUser(userData);
            }
          } else {
            console.log('[AUTH] INITIAL_SESSION without session, waiting for SIGNED_IN event...');
          }

          setLoading(false);
          return;
        }

        // SESIÓN 45B FIX: SIGNED_IN y USER_UPDATED (solo validar si NO estamos ya validados)
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (session?.user) {
            // Solo validar si no tenemos usuario todavía o si cambió el ID
            if (!user || user.id !== session.user.id) {
              console.log('[AUTH] New session detected, validating...');
              const userData = await validateAndFetchUserData(10000);
              if (userData) {
                setUser(userData);
              }
            } else {
              console.log('[AUTH] Session event but user already validated, skipping...');
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
