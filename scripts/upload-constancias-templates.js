#!/usr/bin/env node
/**
 * Script para subir templates de constancias a Supabase Storage
 * Ejecutar: node scripts/upload-constancias-templates.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    });
  }
}
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET_NAME = 'constancias-templates';
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'constancias');

async function ensureBucketExists() {
  console.log(`\nVerificando bucket "${BUCKET_NAME}"...`);

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('Error listando buckets:', listError);
    return false;
  }

  const bucketExists = buckets.some(b => b.name === BUCKET_NAME);

  if (!bucketExists) {
    console.log(`Creando bucket "${BUCKET_NAME}"...`);
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 10485760, // 10MB
    });

    if (createError) {
      console.error('Error creando bucket:', createError);
      return false;
    }
    console.log('Bucket creado exitosamente');
  } else {
    console.log('Bucket ya existe');
  }

  return true;
}

async function uploadTemplate(fileName) {
  const filePath = path.join(TEMPLATES_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    console.error(`  ✗ Archivo no encontrado: ${filePath}`);
    return false;
  }

  const fileBuffer = fs.readFileSync(filePath);

  console.log(`  Subiendo ${fileName}...`);

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, fileBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    });

  if (error) {
    console.error(`  ✗ Error subiendo ${fileName}:`, error.message);
    return false;
  }

  console.log(`  ✓ ${fileName} subido exitosamente`);
  return true;
}

async function main() {
  console.log('='.repeat(50));
  console.log('Upload Constancias Templates to Supabase Storage');
  console.log('='.repeat(50));

  // Verificar/crear bucket
  const bucketReady = await ensureBucketExists();
  if (!bucketReady) {
    console.error('\nNo se pudo preparar el bucket. Abortando.');
    process.exit(1);
  }

  // Templates a subir
  const templates = [
    'constancia-separacion.docx',
    'constancia-abono.docx',
    'constancia-cancelacion.docx',
  ];

  console.log('\nSubiendo templates...');

  let successCount = 0;
  for (const template of templates) {
    const success = await uploadTemplate(template);
    if (success) successCount++;
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Resultado: ${successCount}/${templates.length} templates subidos`);
  console.log('='.repeat(50));

  if (successCount === templates.length) {
    console.log('\n✓ Todos los templates subidos exitosamente!');
    process.exit(0);
  } else {
    console.log('\n✗ Algunos templates fallaron. Revisa los errores arriba.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
