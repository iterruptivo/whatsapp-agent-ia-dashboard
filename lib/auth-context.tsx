'use client';

import { createContext, useContext, useEffect, useState } from 'react';
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

  // ============================================================================
  // FETCH USER DATA FROM USUARIOS TABLE (WITH TIMEOUT)
  // ============================================================================
  const fetchUserData = async (authUser: SupabaseUser) => {
    try {
      console.log('[AUTH DEBUG] Fetching user data for ID:', authUser.id);

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authUser.id)
        .single();

      console.log('[AUTH DEBUG] Query result:', { data, error });

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

      console.log('[AUTH SUCCESS] User data fetched:', data);
      return data as Usuario;
    } catch (error) {
      console.error('[AUTH ERROR] Unexpected error fetching user data:', error);
      return null;
    }
  };

  // CRITICAL FIX: Wrapper with timeout to prevent infinite loading
  const fetchUserDataWithTimeout = async (authUser: SupabaseUser, timeoutMs = 8000) => {
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
  // INITIALIZE SESSION ON MOUNT
  // ============================================================================
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Step 1: Check if session exists (fast, from cookies)
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          // No session - user is not logged in
          setLoading(false);
          return;
        }

        // Step 2: SECURITY FIX - Verify session with server using getUser()
        const { data: { user: authUser }, error } = await supabase.auth.getUser();

        if (error || !authUser) {
          console.error('[AUTH ERROR] Session validation failed:', error);
          // Session is invalid - clear it
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Session is valid and verified
        setSupabaseUser(authUser);
        const userData = await fetchUserDataWithTimeout(authUser, 8000);
        setUser(userData);

        // MULTI-PROYECTO: Restore selected proyecto from sessionStorage
        const savedProyectoId = sessionStorage.getItem('selected_proyecto_id');
        if (savedProyectoId && userData) {
          const proyectoData = await fetchProyectoData(savedProyectoId);
          setSelectedProyecto(proyectoData);
        }
      } catch (error) {
        console.error('[AUTH ERROR] Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH] State changed:', event);

        // CRITICAL FIX: Only re-fetch user data on SIGN_IN or USER_UPDATED
        // Token refresh events should NOT trigger expensive DB queries
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          if (session?.user) {
            setSupabaseUser(session.user);
            // Use timeout wrapper to prevent infinite loading
            const userData = await fetchUserDataWithTimeout(session.user, 8000);
            setUser(userData);
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refresh: only update session, keep existing user data
          console.log('[AUTH] Token refreshed, keeping current user data');
          if (session?.user) {
            setSupabaseUser(session.user);
            // user state unchanged - no DB fetch needed
          }
        } else if (event === 'SIGNED_OUT') {
          setSupabaseUser(null);
          setUser(null);
        }

        setLoading(false);
      }
    );

    // ============================================================================
    // POLLING: Check periódico de estado activo
    // ============================================================================
    // Compensar pérdida de check en middleware (FIX #4)
    // Verifica cada 60s si usuario sigue activo en BD
    let pollingInterval: NodeJS.Timeout | null = null;

    if (supabaseUser?.id) {
      console.log('[AUTH POLLING] Iniciando polling de estado activo (cada 60s)');

      pollingInterval = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('usuarios')
            .select('activo')
            .eq('id', supabaseUser.id)
            .single();

          if (error) {
            console.warn('[AUTH POLLING] Error checking activo status (ignoring):', error);
            return; // No logout por error transitorio
          }

          if (data && !data.activo) {
            console.error('[AUTH POLLING] User deactivated, logging out');
            await signOut();
          }
        } catch (error) {
          console.error('[AUTH POLLING] Unexpected error (ignoring):', error);
          // No logout por error inesperado
        }
      }, 60000); // Check cada 60 segundos
    }

    return () => {
      subscription.unsubscribe();
      if (pollingInterval) {
        clearInterval(pollingInterval);
        console.log('[AUTH POLLING] Polling detenido');
      }
    };
  }, [supabaseUser?.id]);

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
