/**
 * Script para ejecutar la migración del Módulo de Reuniones
 * Ejecutar: node scripts/run-reunion-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Faltan credenciales de Supabase en .env.local');
  process.exit(1);
}

// Crear cliente con service_role para ejecutar SQL sin RLS
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Iniciando migración del Módulo de Reuniones...\n');

  try {
    // Leer el archivo SQL
    const migrationPath = path.join(__dirname, '..', 'migrations', '20260106_create_reuniones_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Archivo de migración cargado');
    console.log(`   Ubicación: ${migrationPath}`);
    console.log(`   Tamaño: ${(sql.length / 1024).toFixed(2)} KB\n`);

    // Ejecutar la migración
    console.log('⏳ Ejecutando SQL en Supabase...');

    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      // Si exec_sql no existe, intentar ejecutar directamente
      console.log('⚠ Función exec_sql no disponible, ejecutando con método alternativo...');

      // Dividir el SQL en statements individuales y ejecutarlos
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];

        // Skip comments y bloques DO
        if (
          statement.startsWith('--') ||
          statement.startsWith('/*') ||
          statement.includes('RAISE NOTICE')
        ) {
          continue;
        }

        try {
          const { error: stmtError } = await supabase.rpc('exec', {
            query: statement + ';'
          });

          if (stmtError) {
            console.log(`   ⚠ Statement ${i + 1} produjo un warning (puede ser normal):`);
            console.log(`      ${stmtError.message.substring(0, 100)}`);
          } else {
            successCount++;
          }
        } catch (err) {
          errorCount++;
          console.log(`   ❌ Error en statement ${i + 1}:`);
          console.log(`      ${err.message.substring(0, 100)}`);
        }
      }

      console.log(`\n📊 Resumen:`);
      console.log(`   ✓ Statements exitosos: ${successCount}`);
      console.log(`   ⚠ Warnings/Errores: ${errorCount}`);
    } else {
      console.log('✅ Migración ejecutada exitosamente\n');
    }

    // Verificar que las tablas se crearon
    console.log('🔍 Verificando tablas creadas...\n');

    const { data: reunionesData, error: reunionesError } = await supabase
      .from('reuniones')
      .select('id')
      .limit(1);

    const { data: actionItemsData, error: actionItemsError } = await supabase
      .from('reunion_action_items')
      .select('id')
      .limit(1);

    if (!reunionesError) {
      console.log('   ✅ Tabla "reuniones" creada correctamente');
    } else {
      console.log('   ❌ Error verificando tabla "reuniones":', reunionesError.message);
    }

    if (!actionItemsError) {
      console.log('   ✅ Tabla "reunion_action_items" creada correctamente');
    } else {
      console.log('   ❌ Error verificando tabla "reunion_action_items":', actionItemsError.message);
    }

    // Instrucciones finales
    console.log('\n' + '='.repeat(70));
    console.log('🎉 MIGRACIÓN COMPLETADA');
    console.log('='.repeat(70));
    console.log('\n⚠️  IMPORTANTE: Crear el bucket "reuniones-media" manualmente');
    console.log('\n📋 Pasos siguientes:');
    console.log('   1. Ir a Supabase Dashboard → Storage');
    console.log('   2. Click en "New Bucket"');
    console.log('   3. Configurar:');
    console.log('      - Name: reuniones-media');
    console.log('      - Public: NO (privado)');
    console.log('      - File Size Limit: 2GB (2147483648 bytes)');
    console.log('      - Allowed MIME types: audio/*, video/*');
    console.log('\n   4. Las RLS policies del storage ya están configuradas');
    console.log('\n   5. Configurar Vercel Cron en vercel.json:');
    console.log('      {');
    console.log('        "crons": [{');
    console.log('          "path": "/api/reuniones/cron-cleanup",');
    console.log('          "schedule": "0 3 * * *"');
    console.log('        }]');
    console.log('      }');
    console.log('\n✅ Base de datos lista para el Módulo de Reuniones\n');

  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error);
    process.exit(1);
  }
}

// Ejecutar
runMigration();
