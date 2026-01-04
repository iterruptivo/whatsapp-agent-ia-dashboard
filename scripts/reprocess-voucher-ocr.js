// Script para reprocesar OCR de vouchers existentes
// Ejecutar con: node scripts/reprocess-voucher-ocr.js
//
// Este script:
// 1. Obtiene la ficha del local especificado
// 2. Descarga las imagenes de vouchers
// 3. Ejecuta OCR con OpenAI directamente
// 4. Actualiza la base de datos con los datos del OCR

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuracion - Cambiar segun necesidad
const LOCAL_CODIGO = 'A-106';

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
    https.get(url, (response) => {
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

async function runReprocess() {
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
  console.log(`=== Reprocesando OCR de vouchers para ${LOCAL_CODIGO} ===\n`);

  const { Client } = require('pg');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos\n');

    // 1. Obtener el local_id de A-106
    const localResult = await client.query(`
      SELECT id FROM locales WHERE codigo = $1
    `, [LOCAL_CODIGO]);

    if (localResult.rows.length === 0) {
      console.error(`ERROR: No se encontro el local ${LOCAL_CODIGO}`);
      process.exit(1);
    }

    const localId = localResult.rows[0].id;
    console.log(`Local ID: ${localId}\n`);

    // 2. Obtener la ficha del local
    const fichaResult = await client.query(`
      SELECT id, comprobante_deposito_fotos, comprobante_deposito_ocr
      FROM clientes_ficha
      WHERE local_id = $1
    `, [localId]);

    if (fichaResult.rows.length === 0) {
      console.error(`ERROR: No se encontro ficha para el local ${LOCAL_CODIGO}`);
      process.exit(1);
    }

    const ficha = fichaResult.rows[0];
    const voucherUrls = ficha.comprobante_deposito_fotos || [];

    console.log(`Ficha ID: ${ficha.id}`);
    console.log(`Vouchers encontrados: ${voucherUrls.length}`);
    console.log(`OCR existente: ${ficha.comprobante_deposito_ocr ? 'Si' : 'No'}\n`);

    if (voucherUrls.length === 0) {
      console.log('No hay vouchers para procesar');
      return;
    }

    // 3. Procesar cada voucher
    const ocrResults = [];

    for (let i = 0; i < voucherUrls.length; i++) {
      const url = voucherUrls[i];
      console.log(`\n[${i + 1}/${voucherUrls.length}] Procesando voucher...`);
      console.log(`URL: ${url.substring(0, 80)}...`);

      try {
        // Descargar imagen
        console.log('  Descargando imagen...');
        const base64 = await fetchImage(url);
        console.log(`  Imagen descargada (${Math.round(base64.length / 1024)} KB)`);

        // Llamar OCR directo a OpenAI
        console.log('  Ejecutando OCR con OpenAI...');
        const ocrResult = await callOpenAIOCR(base64, openaiApiKey);

        if (ocrResult.success && ocrResult.data) {
          console.log('  OCR exitoso!');
          console.log(`    - Monto: ${ocrResult.data.monto} ${ocrResult.data.moneda}`);
          console.log(`    - Banco: ${ocrResult.data.banco}`);
          console.log(`    - Operacion: ${ocrResult.data.numero_operacion}`);
          console.log(`    - Fecha: ${ocrResult.data.fecha}`);
          console.log(`    - Confianza: ${ocrResult.data.confianza}%`);

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
          console.log(`  OCR fallido: ${ocrResult.error}`);
          ocrResults.push(null);
        }
      } catch (error) {
        console.error(`  Error procesando voucher: ${error.message}`);
        ocrResults.push(null);
      }
    }

    // 4. Actualizar la base de datos
    const validResults = ocrResults.filter(r => r !== null);

    if (validResults.length > 0) {
      console.log(`\n=== Actualizando base de datos ===`);
      console.log(`Resultados validos: ${validResults.length}/${ocrResults.length}`);

      await client.query(`
        UPDATE clientes_ficha
        SET comprobante_deposito_ocr = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify(validResults), ficha.id]);

      console.log('Base de datos actualizada exitosamente!');
    } else {
      console.log('\nNo hay resultados validos para guardar');
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nConexion cerrada.');
  }
}

runReprocess();
