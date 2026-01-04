// Script para ejecutar la migración de validación bancaria
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
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260101_validacion_bancaria.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Ejecutando migración de validación bancaria...');
    await client.query(sql);
    console.log('Migración ejecutada exitosamente!');

    // Verificar tablas creadas
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('config_bancos', 'importaciones_bancarias', 'transacciones_bancarias')
      ORDER BY table_name
    `);

    console.log('Tablas creadas:', result.rows.map(r => r.table_name).join(', '));

    // Verificar bancos insertados
    const bancos = await client.query('SELECT nombre, nombre_display FROM config_bancos');
    console.log('Bancos configurados:', bancos.rows.length);
    bancos.rows.forEach(b => console.log(`  - ${b.nombre_display}`));

  } catch (err) {
    console.error('Error ejecutando migración:', err.message);
    // Si ya existen las tablas, verificar
    if (err.message.includes('already exists')) {
      console.log('Las tablas ya existen, verificando...');
      const result = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('config_bancos', 'importaciones_bancarias', 'transacciones_bancarias')
      `);
      console.log('Tablas existentes:', result.rows.map(r => r.table_name).join(', '));
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
