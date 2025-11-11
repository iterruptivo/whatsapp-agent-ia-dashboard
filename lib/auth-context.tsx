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
  const fetchUserDataWithTimeout = async (authUser: SupabaseUser, timeoutMs = 30000) => {
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
  // FIX CRÍTICO: Split useEffect para prevenir doble subscription
  // ============================================================================
  // useEffect #1: Initialize auth system ONCE (no dependency)
  useEffect(() => {
    console.log('[AUTH] Initializing auth system...');

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setSupabaseUser(session.user);
          const userData = await fetchUserDataWithTimeout(session.user, 30000);
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

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSupabaseUser(null);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          setSupabaseUser(session?.user || null);

          if (session?.user) {
            // SOLUCIÓN #2: Fetch ANTES de setLoading(false)
            const userData = await fetchUserDataWithTimeout(session.user, 30000);
            setUser(userData);
            setLoading(false); // ← Después de fetch completo
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
