// Script para crear el bucket de reuniones-media
const { Client } = require('pg');

async function createBucket() {
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

    // Verificar si el bucket ya existe
    const checkBucket = await client.query(`
      SELECT id FROM storage.buckets WHERE id = 'reuniones-media';
    `);

    if (checkBucket.rows.length > 0) {
      console.log('⚠️  El bucket "reuniones-media" ya existe. Saltando creación...');
    } else {
      // Crear el bucket
      await client.query(`
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
          'reuniones-media',
          'reuniones-media',
          false,
          2147483648,
          ARRAY[
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/x-wav',
            'audio/mp4',
            'audio/x-m4a',
            'video/mp4',
            'video/webm',
            'video/quicktime',
            'video/x-msvideo'
          ]
        );
      `);

      console.log('✅ Bucket "reuniones-media" creado correctamente');
      console.log('   - Tamaño máximo: 2GB');
      console.log('   - Privado: Sí');
      console.log('   - MIME types permitidos: audio/*, video/*');
    }

    await client.end();
    console.log('\n🎉 Proceso completado');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createBucket();
