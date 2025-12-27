/**
 * Script para ejecutar la migración de tipificaciones
 * Ejecutar con: node scripts/run-tipificaciones-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: 'postgresql://postgres:1T3rrupt1v02025$@db.qssefegfzxxurqbzndrs.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Conectando a Supabase PostgreSQL...');
    await client.connect();
    console.log('Conectado exitosamente.\n');

    // Verificar si las tablas ya existen
    const checkResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'tipificaciones%'
    `);

    if (checkResult.rows.length > 0) {
      console.log('Las tablas de tipificaciones ya existen:');
      checkResult.rows.forEach(row => console.log('  -', row.table_name));
      console.log('\nMigración ya fue ejecutada anteriormente.');
      await client.end();
      return;
    }

    console.log('Tablas no existen. Ejecutando migración...\n');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251224_tipificaciones_config.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Ejecutar la migración completa
    await client.query(sqlContent);

    console.log('Migración ejecutada exitosamente.\n');

    // Verificar los datos insertados
    const n1 = await client.query('SELECT COUNT(*) as count FROM tipificaciones_nivel_1');
    const n2 = await client.query('SELECT COUNT(*) as count FROM tipificaciones_nivel_2');
    const n3 = await client.query('SELECT COUNT(*) as count FROM tipificaciones_nivel_3');

    console.log('==============================================');
    console.log('MIGRACIÓN COMPLETADA');
    console.log('==============================================');
    console.log(`Tipificaciones Nivel 1: ${n1.rows[0].count} registros`);
    console.log(`Tipificaciones Nivel 2: ${n2.rows[0].count} registros`);
    console.log(`Tipificaciones Nivel 3: ${n3.rows[0].count} registros`);
    console.log('==============================================\n');

  } catch (error) {
    console.error('Error ejecutando migración:', error.message);
    if (error.position) {
      console.error('Error en posición:', error.position);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
