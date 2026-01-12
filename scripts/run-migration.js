// Script para ejecutar migraciones en Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const supabaseUrl = 'https://qssefegfzxxurqbzndrs.supabase.co';
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzc2VmZWdmenh4dXJxYnpuZHJzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDEyMDYxMSwiZXhwIjoyMDc1Njk2NjExfQ.ek4Luc6s8YaDjsP_wks04MFRQ1f5Mn21sjA23JMGq0E';

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Leer el archivo de migración
  const migrationPath = path.join(__dirname, '..', 'migrations', '20260111_repulse_rls_superadmin.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📦 Ejecutando migración...');
  console.log('📝 Archivo:', migrationPath);

  try {
    // Ejecutar SQL usando la función RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Error ejecutando migración:', error);

      // Intentar ejecutar directamente con pg
      console.log('\n⚠️  Intentando método alternativo con pg...');
      const { Client } = require('pg');

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

      await client.connect();
      console.log('✅ Conectado a PostgreSQL');

      await client.query(sql);
      console.log('✅ Migración ejecutada correctamente');

      await client.end();
    } else {
      console.log('✅ Migración ejecutada correctamente');
      console.log('📊 Resultado:', data);
    }

    console.log('\n🎉 Proceso completado');
  } catch (err) {
    console.error('💥 Error fatal:', err.message);
    process.exit(1);
  }
}

runMigration();
