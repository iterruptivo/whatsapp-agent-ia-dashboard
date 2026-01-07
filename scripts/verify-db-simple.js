/**
 * Script para verificar la conexión a Supabase
 * Sin dependencias externas
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnvVar(name) {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : null;
}

const SUPABASE_URL = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_ROLE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Faltan credenciales');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verify() {
  console.log('🔍 Verificando conexión a Supabase...\n');
  console.log(`   URL: ${SUPABASE_URL}\n`);

  try {
    // Verificar si las tablas ya existen
    const { data: reuniones, error: rError } = await supabase
      .from('reuniones')
      .select('id')
      .limit(1);

    const { data: actionItems, error: aError } = await supabase
      .from('reunion_action_items')
      .select('id')
      .limit(1);

    console.log('📊 Estado de las tablas:\n');

    if (!rError) {
      console.log('   ✅ Tabla "reuniones" existe');
    } else if (rError.code === 'PGRST116' || rError.message.includes('not found')) {
      console.log('   ❌ Tabla "reuniones" NO existe');
    } else {
      console.log('   ⚠️  Error verificando "reuniones":', rError.message);
    }

    if (!aError) {
      console.log('   ✅ Tabla "reunion_action_items" existe');
    } else if (aError.code === 'PGRST116' || aError.message.includes('not found')) {
      console.log('   ❌ Tabla "reunion_action_items" NO existe');
    } else {
      console.log('   ⚠️  Error verificando "reunion_action_items":', aError.message);
    }

    // Verificar bucket de storage
    console.log('\n📦 Verificando Storage Buckets:\n');

    const { data: buckets, error: bError } = await supabase.storage.listBuckets();

    if (bError) {
      console.log('   ⚠️  Error listando buckets:', bError.message);
    } else {
      const reunionesBucket = buckets.find(b => b.id === 'reuniones-media');

      if (reunionesBucket) {
        console.log('   ✅ Bucket "reuniones-media" existe');
        console.log(`      - Public: ${reunionesBucket.public}`);
        console.log(`      - File Size Limit: ${reunionesBucket.file_size_limit || 'default'}`);
      } else {
        console.log('   ❌ Bucket "reuniones-media" NO existe');
      }

      console.log(`\n   Buckets existentes: ${buckets.map(b => b.id).join(', ')}`);
    }

    // Instrucciones
    console.log('\n' + '='.repeat(70));
    console.log('📋 PRÓXIMOS PASOS');
    console.log('='.repeat(70));

    if (rError && (rError.code === 'PGRST116' || rError.message.includes('not found'))) {
      console.log('\n🔧 PASO 1: Ejecutar Migración SQL\n');
      console.log('   Las tablas NO existen. Debes ejecutar la migración:\n');
      console.log('   1. Abrir: https://supabase.com/dashboard/project/qssefegfzxxurqbzndrs/sql');
      console.log('   2. Click en "New query"');
      console.log('   3. Abrir archivo: migrations/20260106_create_reuniones_tables.sql');
      console.log('   4. Copiar TODO el contenido y pegarlo en el SQL Editor');
      console.log('   5. Click en "Run" (botón verde)\n');
      console.log('   ⚠️  IMPORTANTE: Esperar a que termine completamente (puede tomar 10-30 segundos)\n');
    } else {
      console.log('\n✅ PASO 1: Migración SQL completada previamente\n');
    }

    const reunionesBucket = buckets && buckets.find(b => b.id === 'reuniones-media');
    if (!reunionesBucket) {
      console.log('🪣 PASO 2: Crear Bucket de Storage\n');
      console.log('   El bucket NO existe. Debes crearlo:\n');
      console.log('   1. Abrir: https://supabase.com/dashboard/project/qssefegfzxxurqbzndrs/storage/buckets');
      console.log('   2. Click en "New Bucket"');
      console.log('   3. Configurar:');
      console.log('      - Name: reuniones-media');
      console.log('      - Public: NO (debe estar DESMARCADO)');
      console.log('      - File size limit: 2147483648 (2GB en bytes)');
      console.log('      - Allowed MIME types:');
      console.log('         audio/mpeg, audio/mp3, audio/wav, audio/mp4, audio/x-m4a');
      console.log('         video/mp4, video/webm, video/quicktime');
      console.log('   4. Click en "Create bucket"\n');
    } else {
      console.log('\n✅ PASO 2: Bucket "reuniones-media" ya existe\n');
    }

    console.log('📄 Ver instrucciones completas en: migrations/README_EJECUTAR_MIGRACION.md\n');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack:', error.stack);
  }
}

verify();
