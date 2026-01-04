// Script para migrar DNI al nuevo formato con OCR
// Ejecutar con: node scripts/migrate-dni-format.js
//
// Este script:
// 1. Obtiene todas las fichas con DNI en formato antiguo
// 2. Descarga cada imagen y usa OCR para identificar frente/reverso
// 3. Sube con nuevo nombre (titular-frente-xxx.jpg)
// 4. Actualiza URLs en la base de datos
// 5. Llena campos del titular con datos del OCR

const fs = require('fs');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Prompts para identificar y extraer datos del DNI
const PROMPT_IDENTIFICAR_LADO = `Analiza esta imagen de un DNI peruano.

Determina si es el FRENTE o el REVERSO del DNI:
- FRENTE: Tiene la foto de la persona, nombre completo, número de DNI, fecha de nacimiento, sexo
- REVERSO: Tiene la dirección, ubigeo, departamento/provincia/distrito, huella dactilar

Responde SOLO con JSON:
{
  "lado": "frente" o "reverso",
  "confianza": 0-100
}`;

const PROMPT_DNI_FRENTE = `Analiza esta imagen del FRENTE de un DNI peruano y extrae:

1. Número de DNI (8 dígitos)
2. Apellido paterno
3. Apellido materno
4. Nombres
5. Fecha de nacimiento (formato YYYY-MM-DD)
6. Sexo (M o F)

IMPORTANTE:
- Si no puedes leer algún dato, usa null
- El número de DNI tiene 8 dígitos
- La fecha debe estar en formato YYYY-MM-DD

Responde SOLO con JSON:
{
  "numero_dni": "12345678",
  "apellido_paterno": "PEREZ",
  "apellido_materno": "GARCIA",
  "nombres": "JUAN CARLOS",
  "fecha_nacimiento": "1990-05-15",
  "sexo": "M",
  "confianza": 95
}`;

const PROMPT_DNI_REVERSO = `Analiza esta imagen del REVERSO de un DNI peruano y extrae:

1. Dirección completa
2. Ubigeo (6 dígitos)
3. Departamento
4. Provincia
5. Distrito

IMPORTANTE:
- Si no puedes leer algún dato, usa null
- El ubigeo tiene 6 dígitos

Responde SOLO con JSON:
{
  "direccion": "JR. LOS OLIVOS 123",
  "ubigeo": "150101",
  "departamento": "LIMA",
  "provincia": "LIMA",
  "distrito": "LIMA",
  "confianza": 90
}`;

async function fetchImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return fetchImage(response.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function callOpenAI(base64Image, prompt, openaiApiKey) {
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
          content: 'Eres un asistente de extracción de datos de DNI peruano para EcoPlaza.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
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

  const jsonStr = content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  return JSON.parse(jsonStr);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runMigration() {
  console.log('='.repeat(60));
  console.log('MIGRACION DNI - Nuevo Formato + OCR');
  console.log('='.repeat(60));
  console.log('');

  // Cargar credenciales
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');

  const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
  const openaiKeyMatch = envContent.match(/OPENAI_API_KEY=(.+)/);
  const supabaseUrlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
  const supabaseKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

  if (!dbUrlMatch || !openaiKeyMatch || !supabaseUrlMatch || !supabaseKeyMatch) {
    console.error('ERROR: Faltan credenciales en .env.local');
    console.error('Necesarios: DATABASE_URL, OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const databaseUrl = dbUrlMatch[1].trim();
  const openaiApiKey = openaiKeyMatch[1].trim();
  const supabaseUrl = supabaseUrlMatch[1].trim();
  const supabaseKey = supabaseKeyMatch[1].trim();

  // Inicializar Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { Client } = require('pg');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos\n');

    // Obtener fichas con DNI en formato antiguo
    const fichasResult = await client.query(`
      SELECT
        cf.id as ficha_id,
        cf.local_id,
        l.codigo as local_codigo,
        COALESCE(cf.titular_nombres, '') || ' ' || COALESCE(cf.titular_apellido_paterno, '') as cliente_actual,
        cf.dni_fotos,
        cf.tiene_conyuge
      FROM clientes_ficha cf
      JOIN locales l ON cf.local_id = l.id
      JOIN proyectos p ON l.proyecto_id = p.id
      WHERE p.nombre NOT ILIKE '%prueba%'
        AND cf.dni_fotos IS NOT NULL
        AND array_length(cf.dni_fotos, 1) > 0
      ORDER BY l.codigo
    `);

    const fichas = fichasResult.rows;
    console.log(`Fichas a procesar: ${fichas.length}`);

    let totalImages = 0;
    fichas.forEach(f => totalImages += f.dni_fotos.length);
    console.log(`Total imágenes: ${totalImages}`);
    console.log(`Costo estimado: ~$${(totalImages * 0.03).toFixed(2)} USD\n`);

    // Stats
    let fichasProcesadas = 0;
    let imagenesProcesadas = 0;
    let exitosas = 0;
    let fallidas = 0;

    for (const ficha of fichas) {
      fichasProcesadas++;
      console.log('='.repeat(50));
      console.log(`[${fichasProcesadas}/${fichas.length}] ${ficha.local_codigo}`);
      console.log(`Cliente actual: ${ficha.cliente_actual.trim() || '(sin datos)'}`);
      console.log(`Imágenes: ${ficha.dni_fotos.length}`);
      console.log('='.repeat(50));

      const newUrls = [];
      let titularFrenteData = null;
      let titularReversoData = null;

      // Procesar cada imagen
      for (let i = 0; i < ficha.dni_fotos.length; i++) {
        imagenesProcesadas++;
        const oldUrl = ficha.dni_fotos[i];
        console.log(`\n  [Imagen ${i + 1}/${ficha.dni_fotos.length}]`);

        try {
          // 1. Descargar imagen
          console.log('    Descargando...');
          const imageBuffer = await fetchImage(oldUrl);
          const base64 = imageBuffer.toString('base64');
          console.log(`    OK (${Math.round(imageBuffer.length / 1024)} KB)`);

          // 2. Identificar si es frente o reverso
          console.log('    Identificando lado...');
          const ladoResult = await callOpenAI(base64, PROMPT_IDENTIFICAR_LADO, openaiApiKey);
          const lado = ladoResult.lado;
          console.log(`    -> ${lado.toUpperCase()} (confianza: ${ladoResult.confianza}%)`);

          await sleep(300);

          // 3. Extraer datos según el lado
          let ocrData = null;
          if (lado === 'frente') {
            console.log('    Extrayendo datos del frente...');
            ocrData = await callOpenAI(base64, PROMPT_DNI_FRENTE, openaiApiKey);
            if (!titularFrenteData) {
              titularFrenteData = ocrData;
            }
            console.log(`    -> DNI: ${ocrData.numero_dni}, ${ocrData.nombres} ${ocrData.apellido_paterno}`);
          } else {
            console.log('    Extrayendo datos del reverso...');
            ocrData = await callOpenAI(base64, PROMPT_DNI_REVERSO, openaiApiKey);
            if (!titularReversoData) {
              titularReversoData = ocrData;
            }
            console.log(`    -> ${ocrData.direccion || 'Sin dirección'}, ${ocrData.distrito || ''}`);
          }

          await sleep(300);

          // 4. Subir con nuevo nombre
          const timestamp = Date.now();
          const newFilename = `titular-${lado}-${timestamp}.jpg`;
          const newPath = `${ficha.local_id}/dni/${newFilename}`;

          console.log(`    Subiendo como: ${newFilename}`);
          const { error: uploadError } = await supabase.storage
            .from('documentos-ficha')
            .upload(newPath, imageBuffer, {
              contentType: 'image/jpeg',
              upsert: true
            });

          if (uploadError) {
            throw new Error(`Upload error: ${uploadError.message}`);
          }

          // Obtener URL pública
          const { data: urlData } = supabase.storage
            .from('documentos-ficha')
            .getPublicUrl(newPath);

          newUrls.push(urlData.publicUrl);
          console.log('    ✓ Subido exitosamente');

          // 5. Borrar archivo antiguo (opcional, comentado por seguridad)
          // const oldPath = oldUrl.split('/documentos-ficha/')[1];
          // await supabase.storage.from('documentos-ficha').remove([oldPath]);

          exitosas++;

        } catch (error) {
          console.error(`    ✗ ERROR: ${error.message}`);
          // Mantener URL antigua si falla
          newUrls.push(oldUrl);
          fallidas++;
        }

        await sleep(500);
      }

      // 6. Actualizar base de datos
      console.log('\n  Actualizando base de datos...');

      // Preparar campos a actualizar
      const updates = {
        dni_fotos: newUrls,
      };

      // Agregar datos del OCR si los tenemos
      if (titularFrenteData) {
        if (titularFrenteData.numero_dni) updates.titular_numero_documento = titularFrenteData.numero_dni;
        if (titularFrenteData.nombres) updates.titular_nombres = titularFrenteData.nombres;
        if (titularFrenteData.apellido_paterno) updates.titular_apellido_paterno = titularFrenteData.apellido_paterno;
        if (titularFrenteData.apellido_materno) updates.titular_apellido_materno = titularFrenteData.apellido_materno;
        if (titularFrenteData.fecha_nacimiento) updates.titular_fecha_nacimiento = titularFrenteData.fecha_nacimiento;
        if (titularFrenteData.sexo) updates.titular_genero = titularFrenteData.sexo === 'M' ? 'Masculino' : 'Femenino';
      }

      if (titularReversoData) {
        if (titularReversoData.direccion) updates.titular_direccion = titularReversoData.direccion;
        if (titularReversoData.departamento) updates.titular_departamento = titularReversoData.departamento;
        if (titularReversoData.provincia) updates.titular_provincia = titularReversoData.provincia;
        if (titularReversoData.distrito) updates.titular_distrito = titularReversoData.distrito;
      }

      // Construir query dinámico
      const setClauses = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (key === 'dni_fotos') {
          setClauses.push(`${key} = $${paramIndex}::text[]`);
        } else {
          setClauses.push(`${key} = $${paramIndex}`);
        }
        values.push(value);
        paramIndex++;
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(ficha.ficha_id);

      const updateQuery = `
        UPDATE clientes_ficha
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
      `;

      await client.query(updateQuery, values);
      console.log('  ✓ Base de datos actualizada');

      if (titularFrenteData) {
        console.log(`  -> Titular: ${titularFrenteData.nombres} ${titularFrenteData.apellido_paterno}`);
      }

      console.log('');
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('RESUMEN DE MIGRACION DNI');
    console.log('='.repeat(60));
    console.log(`Fichas procesadas: ${fichasProcesadas}`);
    console.log(`Imágenes procesadas: ${imagenesProcesadas}`);
    console.log(`Exitosas: ${exitosas}`);
    console.log(`Fallidas: ${fallidas}`);
    console.log(`Tasa de éxito: ${((exitosas / imagenesProcesadas) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error fatal:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nConexión cerrada.');
  }
}

runMigration();
