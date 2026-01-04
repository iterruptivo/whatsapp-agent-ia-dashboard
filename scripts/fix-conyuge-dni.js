// Script para corregir DNI de cónyuges
// Las fichas que tienen 2 personas: la segunda debe ser cónyuge

const fs = require('fs');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Fichas a corregir (identificadas manualmente)
const FICHAS_CON_CONYUGE = {
  'LOCAL-392': {
    // 2 frentes: FELICITA (titular), DENIS DAVID (cónyuge)
    // Imagen 2 debe ser conyuge-frente
    renombrar: [{ index: 1, nuevoNombre: 'conyuge-frente' }]
  },
  'LOCAL-60': {
    // 4 imágenes: MAURO IVAN (titular frente+reverso), MARIA ERIKA (cónyuge frente+reverso)
    // Imágenes 3 y 4 deben ser conyuge-frente y conyuge-reverso
    renombrar: [
      { index: 2, nuevoNombre: 'conyuge-frente' },
      { index: 3, nuevoNombre: 'conyuge-reverso' }
    ]
  },
  'LOCAL-712': {
    // 2 frentes: HUBER LUIS (titular), MARY AGUSTINA (cónyuge)
    // Imagen 2 debe ser conyuge-frente
    renombrar: [{ index: 1, nuevoNombre: 'conyuge-frente' }]
  }
};

async function fetchImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return fetchImage(response.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function run() {
  console.log('='.repeat(60));
  console.log('CORRECCION DNI CONYUGES');
  console.log('='.repeat(60));
  console.log('');

  // Cargar credenciales
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');

  const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
  const supabaseUrlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  const supabaseKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

  const databaseUrl = dbUrlMatch[1].trim();
  const supabaseUrl = supabaseUrlMatch[1].trim();
  const supabaseKey = supabaseKeyMatch[1].trim();

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { Client } = require('pg');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos\n');

    for (const [localCodigo, config] of Object.entries(FICHAS_CON_CONYUGE)) {
      console.log(`\n=== ${localCodigo} ===`);

      // Obtener ficha
      const fichaResult = await client.query(`
        SELECT cf.id, cf.local_id, cf.dni_fotos
        FROM clientes_ficha cf
        JOIN locales l ON cf.local_id = l.id
        WHERE l.codigo = $1
      `, [localCodigo]);

      if (fichaResult.rows.length === 0) {
        console.log(`  No encontrada`);
        continue;
      }

      const ficha = fichaResult.rows[0];
      const newUrls = [...ficha.dni_fotos];

      console.log(`  Ficha ID: ${ficha.id}`);
      console.log(`  URLs actuales: ${ficha.dni_fotos.length}`);

      for (const cambio of config.renombrar) {
        const oldUrl = ficha.dni_fotos[cambio.index];
        console.log(`\n  [${cambio.index + 1}] Renombrando a ${cambio.nuevoNombre}...`);

        try {
          // Descargar imagen
          const imageBuffer = await fetchImage(oldUrl);
          console.log(`    Descargado (${Math.round(imageBuffer.length / 1024)} KB)`);

          // Subir con nuevo nombre
          const timestamp = Date.now();
          const newFilename = `${cambio.nuevoNombre}-${timestamp}.jpg`;
          const newPath = `${ficha.local_id}/dni/${newFilename}`;

          const { error: uploadError } = await supabase.storage
            .from('documentos-ficha')
            .upload(newPath, imageBuffer, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) throw new Error(uploadError.message);

          // Obtener URL pública
          const { data: urlData } = supabase.storage
            .from('documentos-ficha')
            .getPublicUrl(newPath);

          newUrls[cambio.index] = urlData.publicUrl;
          console.log(`    ✓ Renombrado a: ${newFilename}`);

        } catch (error) {
          console.error(`    ✗ Error: ${error.message}`);
        }
      }

      // Actualizar base de datos
      await client.query(`
        UPDATE clientes_ficha
        SET dni_fotos = $1::text[],
            tiene_conyuge = true,
            updated_at = NOW()
        WHERE id = $2
      `, [newUrls, ficha.id]);

      console.log(`\n  ✓ Base de datos actualizada (tiene_conyuge = true)`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('CORRECCION COMPLETADA');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
