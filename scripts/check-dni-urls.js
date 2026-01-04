// Script para verificar formato de URLs de DNI
const fs = require('fs');
const path = require('path');

async function run() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
  const databaseUrl = dbUrlMatch[1].trim();

  const { Client } = require('pg');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const result = await client.query(`
    SELECT l.codigo, cf.dni_fotos
    FROM clientes_ficha cf
    JOIN locales l ON cf.local_id = l.id
    JOIN proyectos p ON l.proyecto_id = p.id
    WHERE p.nombre NOT ILIKE '%prueba%'
      AND cf.dni_fotos IS NOT NULL
      AND array_length(cf.dni_fotos, 1) > 0
    ORDER BY l.codigo
  `);

  console.log('=== FORMATO ACTUAL DE URLs DE DNI ===\n');

  result.rows.forEach(r => {
    console.log(`--- ${r.codigo} (${r.dni_fotos.length} fotos) ---`);
    r.dni_fotos.forEach((url, i) => {
      // Extraer solo el path después del bucket
      const parts = url.split('/clientes-documentos/');
      const filename = parts[1] || url;
      console.log(`  [${i+1}] ${filename}`);

      // Verificar si tiene el nuevo formato
      const match = url.match(/\/dni\/(titular|conyuge|copropietario\d*)-?(frente|reverso)-/i);
      if (match) {
        console.log(`      ✓ Formato nuevo: ${match[1]}-${match[2]}`);
      } else {
        console.log(`      ✗ Formato antiguo (no reconocido)`);
      }
    });
    console.log('');
  });

  await client.end();
}

run();
