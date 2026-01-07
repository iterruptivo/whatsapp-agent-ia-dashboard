import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client that doesn't persist sessions
// This is safe for API routes - no cookies or localStorage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/auth/validate-credentials
 *
 * Validates email and password WITHOUT requiring proyecto selection
 * This prevents scrapers from getting the project list before authentication
 *
 * Request Body:
 *   { email: string, password: string }
 *
 * Response:
 *   Success: { success: true, user: { nombre: string, email: string } }
 *   Error:   { success: false, error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Por favor ingresa un email válido' },
        { status: 400 }
      );
    }

    // Create a fresh client for this request (no session persistence)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    // Attempt authentication
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Fetch user data from usuarios table
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, nombre, email, rol, activo')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      // Sign out to clean up
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado en el sistema' },
        { status: 404 }
      );
    }

    // Check if user is active
    if (!userData.activo) {
      // Sign out to clean up
      await supabase.auth.signOut();
      return NextResponse.json(
        { success: false, error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' },
        { status: 403 }
      );
    }

    // Sign out immediately - we only wanted to validate credentials
    // The actual login will happen after proyecto selection
    await supabase.auth.signOut();

    // Return success with user info
    return NextResponse.json({
      success: true,
      user: {
        nombre: userData.nombre,
        email: userData.email,
      }
    });

  } catch (error) {
    console.error('Error validating credentials:', error);
    return NextResponse.json(
      { success: false, error: 'Error inesperado. Por favor intenta nuevamente.' },
      { status: 500 }
    );
  }
}
