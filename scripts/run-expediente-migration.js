// Script para ejecutar la migracion de expediente digital
// Ejecutar con: node scripts/run-expediente-migration.js

const fs = require('fs');
const path = require('path');

async function runMigration() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);

  if (!dbUrlMatch) {
    console.error('ERROR: No se encontro DATABASE_URL en .env.local');
    process.exit(1);
  }

  const databaseUrl = dbUrlMatch[1].trim();
  console.log('=== Ejecutando migracion de Expediente Digital ===\n');
  console.log('Conectando a Supabase PostgreSQL...\n');

  const { Client } = require('pg');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conexion exitosa!\n');

    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260101_expediente_digital.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Ejecutando SQL...\n');

    await client.query(sqlContent);

    console.log('=== MIGRACION COMPLETADA EXITOSAMENTE ===\n');

    // Verificar
    const checkTable = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'expediente_eventos'
    `);

    const checkColumn = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.columns
      WHERE table_name = 'control_pagos' AND column_name = 'expediente_completo'
    `);

    if (parseInt(checkTable.rows[0].count) > 0) {
      console.log('expediente_eventos: OK');
    } else {
      console.log('expediente_eventos: NO ENCONTRADA');
    }

    if (parseInt(checkColumn.rows[0].count) > 0) {
      console.log('control_pagos.expediente_completo: OK');
    } else {
      console.log('control_pagos.expediente_completo: NO ENCONTRADA');
    }

    console.log('\nMigracion FASE 6 completada!');

  } catch (error) {
    console.error('ERROR durante la migracion:', error.message);
    if (error.detail) console.error('Detalle:', error.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
