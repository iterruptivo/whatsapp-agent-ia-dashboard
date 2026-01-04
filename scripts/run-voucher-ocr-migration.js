// Script para ejecutar la migracion de voucher OCR usando conexion directa
// Ejecutar con: node scripts/run-voucher-ocr-migration.js

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
  console.log('=== Ejecutando migracion de Voucher OCR Data ===\n');
  console.log('Conectando a Supabase PostgreSQL...\n');

  // Importar pg
  const { Client } = require('pg');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conectado exitosamente!\n');

    // Leer el archivo SQL de migracion
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260103_add_voucher_ocr_data.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Ejecutando migracion...\n');
    console.log('---');
    console.log(migrationSQL);
    console.log('---\n');

    await client.query(migrationSQL);

    console.log('Migracion ejecutada exitosamente!');

    // Verificar que la columna existe
    const verifyResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'clientes_ficha'
      AND column_name = 'comprobante_deposito_ocr'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('\nVerificacion: Columna comprobante_deposito_ocr creada correctamente');
      console.log('Tipo de dato:', verifyResult.rows[0].data_type);
    } else {
      console.log('\nADVERTENCIA: No se pudo verificar la columna');
    }

  } catch (error) {
    console.error('Error ejecutando migracion:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nConexion cerrada.');
  }
}

runMigration();
