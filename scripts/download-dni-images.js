// Script para descargar imágenes de DNI de las fichas
// Ejecutar con: node scripts/download-dni-images.js

const fs = require('fs');
const path = require('path');
const https = require('https');

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);

    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(filepath);
        return downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlinkSync(filepath);
      reject(err);
    });
  });
}

async function run() {
  // Cargar .env.local
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);

  if (!dbUrlMatch) {
    console.error('ERROR: No se encontro DATABASE_URL en .env.local');
    process.exit(1);
  }

  const databaseUrl = dbUrlMatch[1].trim();

  const { Client } = require('pg');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  // Crear carpeta de destino
  const outputDir = path.join(__dirname, '..', 'temp-dni-review');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    await client.connect();
    console.log('Conectado a la base de datos\n');

    // Obtener todas las fichas de San Gabriel con DNI
    const result = await client.query(`
      SELECT
        l.codigo as local_codigo,
        COALESCE(cf.titular_nombres, '') || ' ' || COALESCE(cf.titular_apellido_paterno, '') as cliente,
        cf.dni_fotos,
        array_length(cf.dni_fotos, 1) as num_dni
      FROM clientes_ficha cf
      JOIN locales l ON cf.local_id = l.id
      JOIN proyectos p ON l.proyecto_id = p.id
      WHERE p.nombre NOT ILIKE '%prueba%'
        AND cf.dni_fotos IS NOT NULL
        AND array_length(cf.dni_fotos, 1) > 0
      ORDER BY l.codigo
    `);

    console.log('=== RESUMEN DNI POR FICHA ===\n');

    let totalImages = 0;

    for (const row of result.rows) {
      console.log(`${row.local_codigo} - ${row.cliente.trim()}`);
      console.log(`  Imágenes DNI: ${row.num_dni}`);

      // Crear subcarpeta para este local
      const localDir = path.join(outputDir, row.local_codigo.replace(/[^a-zA-Z0-9-]/g, '_'));
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      // Descargar cada imagen
      for (let i = 0; i < row.dni_fotos.length; i++) {
        const url = row.dni_fotos[i];
        const ext = url.match(/\.(jpg|jpeg|png|gif|webp)/i)?.[1] || 'jpg';
        const filename = `dni_${i + 1}.${ext}`;
        const filepath = path.join(localDir, filename);

        console.log(`    [${i + 1}] Descargando ${filename}...`);

        try {
          await downloadImage(url, filepath);
          console.log(`        OK`);
          totalImages++;
        } catch (error) {
          console.log(`        ERROR: ${error.message}`);
        }
      }

      console.log('');
    }

    console.log('='.repeat(50));
    console.log(`TOTAL: ${result.rows.length} fichas, ${totalImages} imágenes descargadas`);
    console.log(`Carpeta: ${outputDir}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
