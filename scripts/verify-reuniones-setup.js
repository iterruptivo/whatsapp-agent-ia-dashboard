// Script para verificar que el módulo de reuniones está correctamente configurado
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function verifySetup() {
  const client = new Client({
    host: 'db.qssefegfzxxurqbzndrs.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '1T3rrupt1v02025$',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL\n');

    // 1. Verificar tablas
    console.log('📋 Verificando tablas...');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('reuniones', 'reunion_action_items')
      ORDER BY table_name;
    `);

    if (tables.rows.length === 2) {
      console.log('   ✅ Tabla "reuniones" existe');
      console.log('   ✅ Tabla "reunion_action_items" existe');
    } else {
      console.log('   ❌ Faltan tablas. Encontradas:', tables.rows.map(r => r.table_name));
      throw new Error('Tablas faltantes');
    }

    // 2. Verificar bucket de storage
    console.log('\n📦 Verificando bucket de storage...');
    const bucket = await client.query(`
      SELECT id, name, public, file_size_limit
      FROM storage.buckets
      WHERE id = 'reuniones-media';
    `);

    if (bucket.rows.length === 1) {
      console.log('   ✅ Bucket "reuniones-media" existe');
      console.log(`   - Público: ${bucket.rows[0].public ? 'Sí' : 'No'}`);
      console.log(`   - Límite de tamaño: ${Math.round(bucket.rows[0].file_size_limit / 1024 / 1024 / 1024)}GB`);
    } else {
      console.log('   ❌ Bucket "reuniones-media" no existe');
      throw new Error('Bucket faltante');
    }

    // 3. Verificar RLS policies
    console.log('\n🔒 Verificando RLS policies...');
    const policies = await client.query(`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE tablename IN ('reuniones', 'reunion_action_items')
      ORDER BY tablename, policyname;
    `);

    console.log(`   ✅ ${policies.rows.length} policies encontradas:`);
    policies.rows.forEach(p => {
      console.log(`      - ${p.tablename}: ${p.policyname}`);
    });

    // 4. Verificar funciones
    console.log('\n⚙️  Verificando funciones...');
    const functions = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN ('cleanup_old_media_files', 'get_user_reuniones', 'get_user_action_items')
      ORDER BY routine_name;
    `);

    if (functions.rows.length === 3) {
      console.log('   ✅ cleanup_old_media_files()');
      console.log('   ✅ get_user_reuniones()');
      console.log('   ✅ get_user_action_items()');
    } else {
      console.log('   ⚠️  Algunas funciones faltantes. Encontradas:', functions.rows.length);
    }

    // 5. Verificar archivos del proyecto
    console.log('\n📁 Verificando archivos del proyecto...');

    const requiredFiles = [
      'types/reuniones.ts',
      'lib/actions-reuniones.ts',
      'lib/actions-action-items.ts',
      'lib/utils/prompts-reuniones.ts',
      'lib/utils/reunion-file-validator.ts',
      'app/api/reuniones/route.ts',
      'app/api/reuniones/upload/route.ts',
      'app/api/reuniones/[id]/route.ts',
      'app/api/reuniones/[id]/process/route.ts',
      'app/api/cron/cleanup-reuniones/route.ts',
      'vercel.json',
    ];

    let allFilesExist = true;
    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${file}`);
      } else {
        console.log(`   ❌ ${file} (FALTANTE)`);
        allFilesExist = false;
      }
    }

    // 6. Verificar .env.local
    console.log('\n🔑 Verificando variables de entorno...');
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');

    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'OPENAI_API_KEY',
      'CRON_SECRET',
    ];

    requiredEnvVars.forEach(varName => {
      if (envContent.includes(`${varName}=`)) {
        console.log(`   ✅ ${varName}`);
      } else {
        console.log(`   ❌ ${varName} (FALTANTE)`);
        allFilesExist = false;
      }
    });

    await client.end();

    // Resumen final
    console.log('\n═══════════════════════════════════════════════════════════');
    if (allFilesExist) {
      console.log('✅ VERIFICACIÓN COMPLETA - TODO CONFIGURADO CORRECTAMENTE');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('\n📌 SIGUIENTE PASO:');
      console.log('   Implementar componentes de frontend en:');
      console.log('   - components/reuniones/');
      console.log('   - app/(routes)/reuniones/');
      console.log('\n💡 RECORDAR:');
      console.log('   - Configurar CRON_SECRET en Vercel Production');
      console.log('   - Verificar que OpenAI API key esté activa');
      console.log('   - Hacer deploy para activar el cron job');
    } else {
      console.log('⚠️  VERIFICACIÓN INCOMPLETA - REVISAR ERRORES ARRIBA');
      console.log('═══════════════════════════════════════════════════════════');
    }

  } catch (err) {
    console.error('\n❌ Error durante verificación:', err.message);
    process.exit(1);
  }
}

verifySetup();
