'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useRouter } from 'next/navigation';

// ============================================================================
// TYPES
// ============================================================================

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'vendedor';
  vendedor_id: string | null;
  activo: boolean;
}

interface AuthContextType {
  user: Usuario | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
  const [loading, setLoading] = useState(true);

  // ============================================================================
  // FETCH USER DATA FROM USUARIOS TABLE
  // ============================================================================
  const fetchUserData = async (authUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return null;
      }

      if (!data) {
        console.error('User not found in usuarios table');
        return null;
      }

      // Check if user is active
      if (!data.activo) {
        console.error('User is deactivated');
        return null;
      }

      return data as Usuario;
    } catch (error) {
      console.error('Unexpected error fetching user data:', error);
      return null;
    }
  };

  // ============================================================================
  // INITIALIZE SESSION ON MOUNT
  // ============================================================================
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setSupabaseUser(session.user);
          const userData = await fetchUserData(session.user);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);

        if (session?.user) {
          setSupabaseUser(session.user);
          const userData = await fetchUserData(session.user);
          setUser(userData);
        } else {
          setSupabaseUser(null);
          setUser(null);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ============================================================================
  // SIGN IN
  // ============================================================================
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
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

      setSupabaseUser(data.user);
      setUser(userData);

      // Redirect based on role
      if (userData.rol === 'admin') {
        router.push('/');
      } else if (userData.rol === 'vendedor') {
        router.push('/operativo');
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

export function useRequireRole(requiredRole: 'admin' | 'vendedor') {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.rol !== requiredRole)) {
      // Redirect based on role
      if (user?.rol === 'vendedor' && requiredRole === 'admin') {
        router.push('/operativo'); // Vendedor trying to access admin
      } else {
        router.push('/login'); // Not authenticated
      }
    }
  }, [user, loading, requiredRole, router]);

  return { user, loading };
}
