// Script para ejecutar la migracion de aprobaciones usando conexion directa
// Ejecutar con: node scripts/run-aprobaciones-migration.js

const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Cargar DATABASE_URL de .env.local
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);

  if (!dbUrlMatch) {
    console.error('ERROR: No se encontro DATABASE_URL en .env.local');
    process.exit(1);
  }

  const databaseUrl = dbUrlMatch[1].trim();
  console.log('=== Ejecutando migracion de Aprobaciones ===\n');
  console.log('Conectando a Supabase PostgreSQL...\n');

  // Importar pg
  const { Client } = require('pg');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conexion exitosa!\n');

    // Leer SQL
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260103_aprobaciones_descuento.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Ejecutar todo el SQL de una vez
    console.log('Ejecutando SQL...\n');

    await client.query(sqlContent);

    console.log('=== MIGRACION COMPLETADA EXITOSAMENTE ===\n');

    // Verificar que las tablas existen
    console.log('Verificando tablas creadas...\n');

    const checkConfig = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'config_aprobaciones_descuento'
    `);

    const checkAprobaciones = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'aprobaciones_descuento'
    `);

    if (parseInt(checkConfig.rows[0].count) > 0) {
      console.log('config_aprobaciones_descuento: OK');
    } else {
      console.log('config_aprobaciones_descuento: NO ENCONTRADA');
    }

    if (parseInt(checkAprobaciones.rows[0].count) > 0) {
      console.log('aprobaciones_descuento: OK');
    } else {
      console.log('aprobaciones_descuento: NO ENCONTRADA');
    }

    console.log('\nMigracion FASE 5 completada!');

  } catch (error) {
    console.error('ERROR durante la migracion:', error.message);
    if (error.detail) console.error('Detalle:', error.detail);
    if (error.hint) console.error('Sugerencia:', error.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
