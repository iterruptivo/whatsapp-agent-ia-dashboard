// Script para ejecutar la migracion de contratos flexibles
// Ejecutar con: node scripts/run-contratos-flexibles-migration.js

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
  console.log('=== Ejecutando migracion de Contratos Flexibles (FASE 7) ===\n');
  console.log('Conectando a Supabase PostgreSQL...\n');

  const { Client } = require('pg');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conexion exitosa!\n');

    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260101_contratos_flexibles.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Ejecutando SQL...\n');

    await client.query(sqlContent);

    console.log('=== MIGRACION COMPLETADA EXITOSAMENTE ===\n');

    // Verificar columnas
    const checkColumns = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'control_pagos'
      AND column_name IN ('contrato_template_personalizado_url', 'contrato_template_usado', 'contrato_generado_url', 'contrato_generado_at')
    `);

    console.log('Columnas agregadas:');
    checkColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: OK`);
    });

    console.log('\nMigracion FASE 7 completada!');

  } catch (error) {
    console.error('ERROR durante la migracion:', error.message);
    if (error.detail) console.error('Detalle:', error.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
