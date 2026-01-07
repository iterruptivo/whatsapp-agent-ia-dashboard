// Script para verificar el schema de la tabla usuarios
const { Client } = require('pg');

async function checkSchema() {
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
    console.log('✅ Conectado a PostgreSQL');

    // Obtener columnas de la tabla usuarios
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'usuarios'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Columnas de la tabla usuarios:\n');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    await client.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkSchema();
