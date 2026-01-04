// Script para ejecutar la migración de pagos consolidados
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://postgres:1T3rrupt1v02025$@db.qssefegfzxxurqbzndrs.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260102_pagos_consolidados.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Ejecutando migración de pagos consolidados...');
    await client.query(sql);
    console.log('Migración ejecutada exitosamente!');

    // Verificar tablas creadas
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('pagos_consolidados', 'pagos_consolidados_distribucion')
      ORDER BY table_name
    `);

    console.log('Tablas creadas:', result.rows.map(r => r.table_name).join(', '));

    // Verificar columnas de pagos_consolidados
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'pagos_consolidados'
      ORDER BY ordinal_position
    `);
    console.log('\nColumnas de pagos_consolidados:');
    columns.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));

  } catch (err) {
    console.error('Error ejecutando migración:', err.message);
    if (err.message.includes('already exists')) {
      console.log('Las tablas ya existen, verificando...');
      const result = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('pagos_consolidados', 'pagos_consolidados_distribucion')
      `);
      console.log('Tablas existentes:', result.rows.map(r => r.table_name).join(', '));
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
