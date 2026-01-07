/**
 * Script para verificar la conexión a Supabase y listar tablas existentes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    }

    // Instrucciones
    console.log('\n' + '='.repeat(70));
    console.log('📋 INSTRUCCIONES');
    console.log('='.repeat(70));

    if (rError && aError) {
      console.log('\n🔧 Las tablas NO existen. Ejecutar migración:\n');
      console.log('   1. Ir a: https://supabase.com/dashboard/project/qssefegfzxxurqbzndrs/sql');
      console.log('   2. Abrir el archivo: migrations/20260106_create_reuniones_tables.sql');
      console.log('   3. Copiar TODO el contenido');
      console.log('   4. Pegar en SQL Editor y hacer click en "Run"');
    } else {
      console.log('\n✅ Las tablas YA existen. Migración completada previamente.\n');
    }

    const reunionesBucket = buckets && buckets.find(b => b.id === 'reuniones-media');
    if (!reunionesBucket) {
      console.log('\n🪣 Crear el bucket "reuniones-media":\n');
      console.log('   1. Ir a: https://supabase.com/dashboard/project/qssefegfzxxurqbzndrs/storage/buckets');
      console.log('   2. Click en "New Bucket"');
      console.log('   3. Name: reuniones-media');
      console.log('   4. Public: NO (privado)');
      console.log('   5. File size limit: 2GB');
      console.log('   6. Allowed MIME types: audio/*, video/*');
    }

    console.log('\n✅ Verificación completada\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

verify();
