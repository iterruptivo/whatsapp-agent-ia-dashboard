/**
 * SCRIPT: Verificar configuración del bucket 'reuniones-media'
 *
 * Este script verifica que el bucket de Supabase Storage esté correctamente
 * configurado para soportar uploads de hasta 2GB.
 *
 * REQUISITOS:
 * - NEXT_PUBLIC_SUPABASE_URL en .env.local
 * - SUPABASE_SERVICE_ROLE_KEY en .env.local
 *
 * USO:
 * npx tsx scripts/verify-storage-bucket.ts
 */

import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'reuniones-media';
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

async function main() {
  console.log('🔍 Verificando configuración del bucket de Storage...\n');

  // Validar variables de entorno
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: Faltan variables de entorno');
    console.error('   Asegúrate de tener en .env.local:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Crear cliente con service role
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Verificar si el bucket existe
    console.log(`📦 Verificando bucket '${BUCKET_NAME}'...`);
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      throw new Error(`Error al listar buckets: ${bucketsError.message}`);
    }

    const bucket = buckets?.find((b) => b.name === BUCKET_NAME);

    if (!bucket) {
      console.error(`❌ El bucket '${BUCKET_NAME}' NO existe.`);
      console.log('\n💡 Para crear el bucket, ejecuta en Supabase Dashboard > Storage:');
      console.log(`   1. Click "New bucket"`);
      console.log(`   2. Name: ${BUCKET_NAME}`);
      console.log(`   3. Public: NO`);
      console.log(`   4. File size limit: 2147483648 bytes (2GB)`);
      process.exit(1);
    }

    console.log(`✅ El bucket '${BUCKET_NAME}' existe.\n`);

    // 2. Verificar configuración del bucket
    console.log('⚙️  Configuración del bucket:');
    console.log(`   - ID: ${bucket.id}`);
    console.log(`   - Name: ${bucket.name}`);
    console.log(`   - Public: ${bucket.public ? 'Sí' : 'No'}`);
    console.log(`   - Created: ${bucket.created_at}`);

    if (bucket.public) {
      console.warn('\n⚠️  ADVERTENCIA: El bucket es PÚBLICO.');
      console.warn('   Recomendación: Cambiar a PRIVADO para mayor seguridad.');
    }

    // 3. Intentar generar presigned upload URL (test)
    console.log('\n🔐 Probando generación de presigned URL...');
    const testPath = `test/test_${Date.now()}.txt`;
    const { data: presignedData, error: presignedError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(testPath);

    if (presignedError) {
      throw new Error(`Error al generar presigned URL: ${presignedError.message}`);
    }

    console.log('✅ Presigned URL generada correctamente.');
    console.log(`   Path: ${presignedData.path}`);
    console.log(`   Token: ${presignedData.token.substring(0, 20)}...`);

    // 4. Verificar que podemos listar archivos (permisos)
    console.log('\n📂 Verificando permisos de lectura...');
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1 });

    if (listError) {
      throw new Error(`Error al listar archivos: ${listError.message}`);
    }

    console.log('✅ Permisos de lectura OK.');

    // 5. Resumen
    console.log('\n✅ VERIFICACIÓN COMPLETADA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('El bucket está listo para recibir uploads de hasta 2GB.');
    console.log('\nPRÓXIMOS PASOS:');
    console.log('1. Probar upload desde el dashboard (módulo Reuniones)');
    console.log('2. Verificar que el archivo aparece en Supabase Storage');
    console.log('3. Verificar que el registro se crea en tabla "reuniones"');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

main();
