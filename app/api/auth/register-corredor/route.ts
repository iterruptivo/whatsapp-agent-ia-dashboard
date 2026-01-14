/**
 * API Route: /api/auth/register-corredor
 *
 * Registro atomico de corredores externos.
 * Crea auth.user + usuario + corredores_registro en una transaccion.
 *
 * @version 1.0
 * @fecha 12 Enero 2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente admin con service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Tipos
interface RegisterRequest {
  email: string;
  password: string;
  nombre: string;
  telefono: string;
  tipoPersona: 'natural' | 'juridica';
  turnstileToken: string;
}

interface RegisterResponse {
  success: boolean;
  message?: string;
  error?: string;
  userId?: string;
}

// Validar token de Turnstile
async function verifyTurnstile(token: string): Promise<boolean> {
  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: token,
        }),
      }
    );

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('[REGISTER] Turnstile verification error:', error);
    return false;
  }
}

// Validaciones
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe tener al menos una mayúscula' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'La contraseña debe tener al menos un número' };
  }
  return { valid: true };
}

// Validación de teléfono internacional
interface PhoneValidation {
  valid: boolean;
  message?: string;
}

const PHONE_RULES: Record<string, { length: number; startsWith?: string }> = {
  '+51': { length: 9, startsWith: '9' },  // Perú
  '+56': { length: 9 },                    // Chile
  '+57': { length: 10 },                   // Colombia
  '+52': { length: 10 },                   // México
  '+54': { length: 10 },                   // Argentina
  '+1': { length: 10 },                    // USA
  '+34': { length: 9 },                    // España
  '+593': { length: 9 },                   // Ecuador
  '+591': { length: 8 },                   // Bolivia
  '+595': { length: 9 },                   // Paraguay
};

function validatePhone(telefono: string): PhoneValidation {
  // Limpiar espacios
  const cleanPhone = telefono.replace(/\s/g, '');

  // Debe empezar con +
  if (!cleanPhone.startsWith('+')) {
    return { valid: false, message: 'El teléfono debe incluir código de país' };
  }

  // Encontrar el código de país
  let countryCode = '';
  let phoneNumber = '';

  for (const code of Object.keys(PHONE_RULES).sort((a, b) => b.length - a.length)) {
    if (cleanPhone.startsWith(code)) {
      countryCode = code;
      phoneNumber = cleanPhone.slice(code.length);
      break;
    }
  }

  // Si no encontramos código conocido, aceptar si tiene al menos 7 dígitos
  if (!countryCode) {
    const digits = cleanPhone.replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 15) {
      return { valid: true };
    }
    return { valid: false, message: 'Número de teléfono inválido' };
  }

  // Validar según reglas del país
  const rules = PHONE_RULES[countryCode];

  if (phoneNumber.length !== rules.length) {
    return { valid: false, message: `El teléfono debe tener ${rules.length} dígitos` };
  }

  if (rules.startsWith && !phoneNumber.startsWith(rules.startsWith)) {
    return { valid: false, message: `El teléfono debe empezar con ${rules.startsWith}` };
  }

  if (!/^\d+$/.test(phoneNumber)) {
    return { valid: false, message: 'El teléfono solo debe contener números' };
  }

  return { valid: true };
}

export async function POST(request: NextRequest): Promise<NextResponse<RegisterResponse>> {
  try {
    const body: RegisterRequest = await request.json();
    const { email, password, nombre, telefono, tipoPersona, turnstileToken } = body;

    // 1. Validar campos requeridos
    if (!email || !password || !nombre || !telefono || !tipoPersona) {
      return NextResponse.json(
        { success: false, error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    // 2. Validar Turnstile
    if (!turnstileToken) {
      return NextResponse.json(
        { success: false, error: 'Verificación de seguridad requerida' },
        { status: 400 }
      );
    }

    const turnstileValid = await verifyTurnstile(turnstileToken);
    if (!turnstileValid) {
      return NextResponse.json(
        { success: false, error: 'Verificación de seguridad fallida. Intenta de nuevo.' },
        { status: 400 }
      );
    }

    // 3. Validar formato de email
    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'El formato del email no es válido' },
        { status: 400 }
      );
    }

    // 4. Validar password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      );
    }

    // 5. Validar telefono (ahora acepta formato internacional)
    const phoneValidation = validatePhone(telefono);
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { success: false, error: phoneValidation.message || 'Teléfono inválido' },
        { status: 400 }
      );
    }

    // 6. Verificar email único en auth.users
    const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingAuth?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
      return NextResponse.json(
        { success: false, error: 'Este email ya tiene una cuenta. ¿Deseas iniciar sesión?' },
        { status: 409 }
      );
    }

    // 7. Verificar email único en tabla usuarios (por si acaso)
    const { data: existingUser } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Este email ya está registrado' },
        { status: 409 }
      );
    }

    // ========================================
    // INICIO DE TRANSACCIÓN ATÓMICA
    // ========================================

    let authUserId: string | null = null;
    let usuarioCreated = false;
    let registroId: string | null = null;

    try {
      // PASO 1: Crear auth.user
      console.log('[REGISTER] Creando auth.user para:', email);
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true, // Auto-confirmado para que pueda hacer login inmediatamente
        user_metadata: {
          nombre,
          rol: 'corredor',
        },
      });

      if (authError || !authUser.user) {
        console.error('[REGISTER] Error creando auth.user:', authError);
        throw new Error(`Error al crear cuenta: ${authError?.message || 'Unknown error'}`);
      }

      authUserId = authUser.user.id;
      console.log('[REGISTER] Auth user creado:', authUserId);

      // PASO 2: Crear registro en tabla usuarios
      console.log('[REGISTER] Creando registro en usuarios...');
      const { error: userError } = await supabaseAdmin.from('usuarios').insert({
        id: authUserId,
        email: email.toLowerCase(),
        nombre,
        rol: 'corredor',
        activo: true,
      });

      if (userError) {
        console.error('[REGISTER] Error creando usuario:', userError);
        throw new Error(`Error al crear perfil: ${userError.message}`);
      }

      usuarioCreated = true;
      console.log('[REGISTER] Usuario creado en tabla usuarios');

      // PASO 3: Crear registro en corredores_registro
      console.log('[REGISTER] Creando registro de corredor...');
      const cleanPhone = telefono.replace(/\s/g, '');

      const registroData = {
        usuario_id: authUserId,
        tipo_persona: tipoPersona,
        email: email.toLowerCase(),
        telefono: cleanPhone,
        // Campos segun tipo de persona
        ...(tipoPersona === 'natural'
          ? { nombres: nombre }
          : { razon_social: nombre }),
        estado: 'borrador',
      };

      const { data: registro, error: registroError } = await supabaseAdmin
        .from('corredores_registro')
        .insert(registroData)
        .select('id')
        .single();

      if (registroError || !registro) {
        console.error('[REGISTER] Error creando registro:', registroError);
        throw new Error(`Error al crear solicitud: ${registroError?.message || 'Unknown error'}`);
      }

      registroId = registro.id;
      console.log('[REGISTER] Registro de corredor creado:', registroId);

      // PASO 4: Crear entrada en historial
      console.log('[REGISTER] Creando entrada en historial...');
      const { error: historialError } = await supabaseAdmin.from('corredores_historial').insert({
        registro_id: registroId,
        accion: 'creado',
        comentario: 'Auto-registro desde página pública',
        realizado_por: authUserId,
      });

      if (historialError) {
        console.warn('[REGISTER] Warning: Error creando historial:', historialError);
        // No lanzamos error aqui, el historial no es critico
      }

      // ========================================
      // ÉXITO - TRANSACCIÓN COMPLETA
      // ========================================

      console.log('[REGISTER] ✅ Registro completo exitoso para:', email);

      return NextResponse.json(
        {
          success: true,
          message: '¡Tu cuenta ha sido creada! Ya puedes iniciar sesión.',
          userId: authUserId,
        },
        { status: 201 }
      );
    } catch (transactionError) {
      // ========================================
      // ROLLBACK EN CASO DE ERROR
      // ========================================

      console.error('[REGISTER] ❌ Error en transacción, iniciando rollback...');

      // Rollback: Eliminar registro de corredor
      if (registroId) {
        console.log('[REGISTER] Rollback: Eliminando registro de corredor...');
        await supabaseAdmin.from('corredores_registro').delete().eq('id', registroId);
      }

      // Rollback: Eliminar usuario
      if (usuarioCreated && authUserId) {
        console.log('[REGISTER] Rollback: Eliminando usuario...');
        await supabaseAdmin.from('usuarios').delete().eq('id', authUserId);
      }

      // Rollback: Eliminar auth.user
      if (authUserId) {
        console.log('[REGISTER] Rollback: Eliminando auth.user...');
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }

      console.log('[REGISTER] Rollback completado');

      // Re-lanzar el error para el catch externo
      throw transactionError;
    }
  } catch (error) {
    console.error('[REGISTER] Error general:', error);

    const errorMessage = error instanceof Error ? error.message : 'Error inesperado';

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Endpoint de verificacion de email (para validacion en tiempo real)
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ available: false, error: 'Email requerido' }, { status: 400 });
  }

  if (!validateEmail(email)) {
    return NextResponse.json({ available: false, error: 'Formato de email inválido' });
  }

  // Verificar en auth.users
  const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers();
  const emailExists = existingAuth?.users?.some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (emailExists) {
    return NextResponse.json({ available: false, error: 'Este email ya tiene una cuenta' });
  }

  return NextResponse.json({ available: true });
}
