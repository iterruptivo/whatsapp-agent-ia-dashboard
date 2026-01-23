-- ============================================================================
-- MIGRACIÓN 021: Crear rol Postventa y usuario
-- Fecha: 2026-01-22
-- Descripción: Agregar rol postventa al constraint y crear usuario
-- ============================================================================

-- PASO 1: Actualizar constraint para incluir rol 'postventa'
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;

ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_rol_check
CHECK (rol IN (
  'superadmin',
  'admin',
  'gerencia',
  'jefe_ventas',
  'marketing',
  'finanzas',
  'coordinador',
  'vendedor',
  'vendedor_caseta',
  'corredor',
  'legal',
  'postventa'
));

-- PASO 2: Crear usuario en auth y public.usuarios
-- Datos del usuario:
-- Nombre: Cynthia Manrique Vega
-- Email: atencionalcliente@ecoplaza.com.pe
-- Celular: 985992578 (no hay columna en tabla)
-- Rol: postventa
-- Password: Postventa2026#Eco

DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Verificar si el usuario ya existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'atencionalcliente@ecoplaza.com.pe') THEN
    RAISE NOTICE 'Usuario ya existe con email atencionalcliente@ecoplaza.com.pe';

    -- Obtener el ID existente
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'atencionalcliente@ecoplaza.com.pe';

    -- Actualizar en tabla usuarios si no existe
    INSERT INTO public.usuarios (id, email, nombre, rol, activo, created_at)
    VALUES (
      new_user_id,
      'atencionalcliente@ecoplaza.com.pe',
      'Cynthia Manrique Vega',
      'postventa',
      true,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      nombre = 'Cynthia Manrique Vega',
      rol = 'postventa',
      activo = true;

    RAISE NOTICE 'Usuario actualizado en tabla usuarios';
  ELSE
    -- Crear nuevo usuario en auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'atencionalcliente@ecoplaza.com.pe',
      crypt('Postventa2026#Eco', gen_salt('bf')),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"nombre": "Cynthia Manrique Vega"}',
      NOW(),
      NOW()
    )
    RETURNING id INTO new_user_id;

    RAISE NOTICE 'Usuario creado en auth.users con ID: %', new_user_id;

    -- Crear identidad en auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', 'atencionalcliente@ecoplaza.com.pe'),
      'email',
      new_user_id::text,
      NOW(),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Identidad creada en auth.identities';

    -- Crear registro en tabla usuarios
    INSERT INTO public.usuarios (id, email, nombre, rol, activo, created_at)
    VALUES (
      new_user_id,
      'atencionalcliente@ecoplaza.com.pe',
      'Cynthia Manrique Vega',
      'postventa',
      true,
      NOW()
    );

    RAISE NOTICE 'Usuario creado en tabla public.usuarios';
  END IF;
END $$;

-- Verificar creación
SELECT
  u.id,
  u.email,
  u.nombre,
  u.rol,
  u.activo,
  u.created_at
FROM public.usuarios u
WHERE u.email = 'atencionalcliente@ecoplaza.com.pe';
