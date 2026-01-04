// Script para migrar OCR de vouchers existentes - Proyecto San Gabriel
// Ejecutar con: node scripts/migrate-vouchers-ocr.js
//
// Este script procesa TODAS las fichas de San Gabriel que tienen vouchers
// pero no tienen OCR, y les aplica el procesamiento OCR.

const fs = require('fs');
const path = require('path');
const https = require('https');

// Prompt para extraccion de voucher
const PROMPT_VOUCHER = `Analiza esta imagen de un voucher/comprobante bancario peruano y extrae los siguientes datos:

1. Monto de la operacion (solo el numero, sin simbolos)
2. Moneda (USD o PEN)
3. Fecha de la operacion (formato YYYY-MM-DD)
4. Nombre del banco
5. Numero de operacion/transaccion
6. Nombre del depositante/ordenante
7. Tipo de operacion (deposito, transferencia, etc)

IMPORTANTE:
- Si no puedes leer algun dato claramente, usa "N/A"
- El monto debe ser un numero decimal (ej: 5000.00)
- La fecha debe estar en formato YYYY-MM-DD
- Incluye un campo "confianza" del 0 al 100 indicando que tan seguro estas de los datos

Responde SOLO con JSON valido en este formato exacto:
{
  "monto": 5000.00,
  "moneda": "USD",
  "fecha": "2025-01-01",
  "banco": "Interbank",
  "numero_operacion": "804263",
  "nombre_depositante": "JUAN PEREZ GARCIA",
  "tipo_operacion": "deposito",
  "confianza": 95
}`;

async function fetchImage(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : require('http');

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        return fetchImage(response.headers.location).then(resolve).catch(reject);
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        resolve(base64);
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function callOpenAIOCR(base64Image, openaiApiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente de extraccion de datos para EcoPlaza, una empresa inmobiliaria peruana. Extrae datos de vouchers bancarios que los clientes proporcionan voluntariamente.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT_VOUCHER },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} - ${errorData?.error?.message || 'Unknown'}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response content from OpenAI');
  }

  // Parse JSON from response
  const jsonStr = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const parsedData = JSON.parse(jsonStr);
  return { success: true, data: parsedData };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runMigration() {
  console.log('='.repeat(60));
  console.log('MIGRACION OCR - Proyecto San Gabriel');
  console.log('='.repeat(60));
  console.log('');

  // Cargar DATABASE_URL y OPENAI_API_KEY de .env.local
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
  const openaiKeyMatch = envContent.match(/OPENAI_API_KEY=(.+)/);

  if (!dbUrlMatch) {
    console.error('ERROR: No se encontro DATABASE_URL en .env.local');
    process.exit(1);
  }

  if (!openaiKeyMatch) {
    console.error('ERROR: No se encontro OPENAI_API_KEY en .env.local');
    process.exit(1);
  }

  const databaseUrl = dbUrlMatch[1].trim();
  const openaiApiKey = openaiKeyMatch[1].trim();

  const { Client } = require('pg');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos\n');

    // 1. Obtener todas las fichas de San Gabriel con vouchers sin OCR
    const fichasResult = await client.query(`
      SELECT
        cf.id as ficha_id,
        l.codigo as local_codigo,
        COALESCE(cf.titular_nombres, '') || ' ' || COALESCE(cf.titular_apellido_paterno, '') as cliente,
        cf.comprobante_deposito_fotos,
        cf.comprobante_deposito_ocr
      FROM clientes_ficha cf
      JOIN locales l ON cf.local_id = l.id
      JOIN proyectos p ON l.proyecto_id = p.id
      WHERE p.nombre NOT ILIKE '%prueba%'
        AND cf.comprobante_deposito_fotos IS NOT NULL
        AND array_length(cf.comprobante_deposito_fotos, 1) > 0
        AND (cf.comprobante_deposito_ocr IS NULL OR jsonb_array_length(cf.comprobante_deposito_ocr) = 0)
      ORDER BY l.codigo
    `);

    const fichas = fichasResult.rows;
    console.log(`Fichas a procesar: ${fichas.length}`);

    let totalVouchers = 0;
    fichas.forEach(f => totalVouchers += f.comprobante_deposito_fotos.length);
    console.log(`Total vouchers: ${totalVouchers}`);
    console.log(`Costo estimado: ~$${(totalVouchers * 0.02).toFixed(2)} USD\n`);

    if (fichas.length === 0) {
      console.log('No hay fichas pendientes de migrar. Todo esta al dia!');
      return;
    }

    // Stats
    let fichasProcesadas = 0;
    let vouchersProcesados = 0;
    let vouchersExitosos = 0;
    let vouchersFallidos = 0;

    // 2. Procesar cada ficha
    for (const ficha of fichas) {
      fichasProcesadas++;
      console.log('='.repeat(50));
      console.log(`[${fichasProcesadas}/${fichas.length}] ${ficha.local_codigo} - ${ficha.cliente}`);
      console.log(`Vouchers: ${ficha.comprobante_deposito_fotos.length}`);
      console.log('='.repeat(50));

      const ocrResults = [];
      const voucherUrls = ficha.comprobante_deposito_fotos;

      for (let i = 0; i < voucherUrls.length; i++) {
        vouchersProcesados++;
        const url = voucherUrls[i];
        console.log(`\n  [Voucher ${i + 1}/${voucherUrls.length}]`);

        try {
          // Descargar imagen
          console.log('    Descargando imagen...');
          const base64 = await fetchImage(url);
          console.log(`    OK (${Math.round(base64.length / 1024)} KB)`);

          // Llamar OCR
          console.log('    Ejecutando OCR...');
          const ocrResult = await callOpenAIOCR(base64, openaiApiKey);

          if (ocrResult.success && ocrResult.data) {
            vouchersExitosos++;
            console.log(`    EXITO: ${ocrResult.data.monto} ${ocrResult.data.moneda} - ${ocrResult.data.banco}`);

            ocrResults.push({
              monto: ocrResult.data.monto || null,
              moneda: ocrResult.data.moneda || null,
              fecha: ocrResult.data.fecha || null,
              banco: ocrResult.data.banco || null,
              numero_operacion: ocrResult.data.numero_operacion || null,
              depositante: ocrResult.data.nombre_depositante || null,
              confianza: ocrResult.data.confianza || 0,
            });
          } else {
            vouchersFallidos++;
            console.log(`    FALLO: ${ocrResult.error}`);
            ocrResults.push(null);
          }

          // Rate limiting - esperar 500ms entre llamadas
          await sleep(500);

        } catch (error) {
          vouchersFallidos++;
          console.error(`    ERROR: ${error.message}`);
          ocrResults.push(null);
        }
      }

      // 3. Actualizar la base de datos con los resultados
      const validResults = ocrResults.filter(r => r !== null);

      if (validResults.length > 0) {
        console.log(`\n  Guardando ${validResults.length} resultados en DB...`);

        await client.query(`
          UPDATE clientes_ficha
          SET comprobante_deposito_ocr = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [JSON.stringify(validResults), ficha.ficha_id]);

        console.log('  DB actualizada!');
      } else {
        console.log('\n  Sin resultados validos para guardar');
      }

      console.log('');
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('RESUMEN DE MIGRACION');
    console.log('='.repeat(60));
    console.log(`Fichas procesadas: ${fichasProcesadas}`);
    console.log(`Vouchers procesados: ${vouchersProcesados}`);
    console.log(`Exitosos: ${vouchersExitosos}`);
    console.log(`Fallidos: ${vouchersFallidos}`);
    console.log(`Tasa de exito: ${((vouchersExitosos / vouchersProcesados) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error fatal:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nConexion cerrada.');
  }
}

runMigration();
