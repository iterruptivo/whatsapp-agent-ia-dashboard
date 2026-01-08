/**
 * Script para crear usuario hwilliam@ecoplaza.com.pe
 * Diagnóstico y creación directa
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar .env.local manualmente
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split(/\r?\n/).forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const key = line.substring(0, idx).trim();
    const value = line.substring(idx + 1).trim();
    process.env[key] = value;
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Datos del screenshot
const userData = {
  nombre: 'Heyse William Quispe Espinoza',
  email: 'hwilliam@ecoplaza.com.pe',
  password: '8O44xc%X)x{91?AQ',
  rol: 'admin',
  telefono: '971542208999', // Formato sin +
  email_alternativo: null
};

async function main() {
  console.log('='.repeat(60));
  console.log('DIAGNÓSTICO Y CREACIÓN DE USUARIO');
  console.log('='.repeat(60));
  console.log('\nDatos a crear:');
  console.log(`  Nombre: ${userData.nombre}`);
  console.log(`  Email: ${userData.email}`);
  console.log(`  Password: ${userData.password}`);
  console.log(`  Rol: ${userData.rol}`);
  console.log(`  Teléfono: ${userData.telefono}`);

  // PASO 1: Verificar si el email ya existe en usuarios
  console.log('\n📋 PASO 1: Verificando email en tabla usuarios...');
  const { data: existingUsuario, error: usuarioError } = await supabase
    .from('usuarios')
    .select('id, email, nombre, rol')
    .eq('email', userData.email)
    .single();

  if (existingUsuario) {
    console.log('   ⚠️ El email YA EXISTE en usuarios:');
    console.log(`      ID: ${existingUsuario.id}`);
    console.log(`      Nombre: ${existingUsuario.nombre}`);
    console.log(`      Rol: ${existingUsuario.rol}`);
    return;
  }
  console.log('   ✅ Email no existe en usuarios');

  // PASO 2: Verificar si el email ya existe en auth.users
  console.log('\n📋 PASO 2: Verificando email en auth.users...');
  const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers();

  if (authListError) {
    console.log('   ❌ Error listando auth users:', authListError.message);
  } else {
    const existingAuth = authUsers.users.find(u => u.email === userData.email);
    if (existingAuth) {
      console.log('   ⚠️ El email YA EXISTE en auth.users:');
      console.log(`      ID: ${existingAuth.id}`);
      console.log(`      Email: ${existingAuth.email}`);
      console.log('   🔧 Eliminando usuario huérfano de auth...');

      const { error: deleteError } = await supabase.auth.admin.deleteUser(existingAuth.id);
      if (deleteError) {
        console.log('   ❌ Error eliminando:', deleteError.message);
        return;
      }
      console.log('   ✅ Usuario huérfano eliminado de auth');
    } else {
      console.log('   ✅ Email no existe en auth.users');
    }
  }

  // PASO 3: Verificar teléfono
  console.log('\n📋 PASO 3: Verificando teléfono...');
  const { data: existingPhone } = await supabase
    .from('usuarios_datos_no_vendedores')
    .select('usuario_id, telefono')
    .eq('telefono', userData.telefono)
    .single();

  if (existingPhone) {
    console.log('   ⚠️ El teléfono YA EXISTE:', existingPhone);
  } else {
    console.log('   ✅ Teléfono disponible');
  }

  // PASO 4: Crear usuario en auth
  console.log('\n📋 PASO 4: Creando usuario en auth.users...');
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    email_confirm: true,
    user_metadata: {
      nombre: userData.nombre,
      rol: userData.rol
    }
  });

  if (authError) {
    console.log('   ❌ ERROR CREANDO AUTH USER:');
    console.log(`      Código: ${authError.code}`);
    console.log(`      Mensaje: ${authError.message}`);
    console.log(`      Status: ${authError.status}`);
    console.log('   Full error:', JSON.stringify(authError, null, 2));
    return;
  }

  console.log('   ✅ Usuario auth creado:', authData.user.id);
  const userId = authData.user.id;

  // PASO 5: Crear en tabla usuarios
  console.log('\n📋 PASO 5: Creando registro en tabla usuarios...');
  const { error: insertError } = await supabase
    .from('usuarios')
    .insert({
      id: userId,
      nombre: userData.nombre,
      email: userData.email,
      rol: userData.rol,
      activo: true,
      vendedor_id: null
    });

  if (insertError) {
    console.log('   ❌ ERROR INSERTANDO EN USUARIOS:');
    console.log(`      Código: ${insertError.code}`);
    console.log(`      Mensaje: ${insertError.message}`);
    // Rollback
    await supabase.auth.admin.deleteUser(userId);
    return;
  }
  console.log('   ✅ Registro usuarios creado');

  // PASO 6: Crear datos adicionales (admin → usuarios_datos_no_vendedores)
  console.log('\n📋 PASO 6: Creando datos adicionales...');
  const { error: datosError } = await supabase
    .from('usuarios_datos_no_vendedores')
    .insert({
      usuario_id: userId,
      telefono: userData.telefono,
      email_alternativo: userData.email_alternativo
    });

  if (datosError) {
    console.log('   ⚠️ Error en datos adicionales (no crítico):', datosError.message);
  } else {
    console.log('   ✅ Datos adicionales creados');
  }

  // RESUMEN
  console.log('\n' + '='.repeat(60));
  console.log('✅ USUARIO CREADO EXITOSAMENTE');
  console.log('='.repeat(60));
  console.log(`ID:       ${userId}`);
  console.log(`Nombre:   ${userData.nombre}`);
  console.log(`Email:    ${userData.email}`);
  console.log(`Password: ${userData.password}`);
  console.log(`Rol:      ${userData.rol}`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Error fatal:', err);
});
