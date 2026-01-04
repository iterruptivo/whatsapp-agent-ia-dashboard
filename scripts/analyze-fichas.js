// Script para analizar fichas de inscripcion en produccion
const fs = require('fs');
const path = require('path');

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

  try {
    await client.connect();
    console.log('Conectado a la base de datos\n');

    // Query 1: Resumen general
    const resumen = await client.query(`
      SELECT
        COUNT(*) as total_fichas,
        COUNT(*) FILTER (WHERE dni_fotos IS NOT NULL AND array_length(dni_fotos, 1) > 0) as con_dni,
        COUNT(*) FILTER (WHERE comprobante_deposito_fotos IS NOT NULL AND array_length(comprobante_deposito_fotos, 1) > 0) as con_voucher,
        COUNT(*) FILTER (WHERE
          dni_fotos IS NOT NULL AND array_length(dni_fotos, 1) > 0
          AND comprobante_deposito_fotos IS NOT NULL AND array_length(comprobante_deposito_fotos, 1) > 0
        ) as con_ambos,
        COUNT(*) FILTER (WHERE comprobante_deposito_ocr IS NOT NULL AND jsonb_array_length(comprobante_deposito_ocr) > 0) as con_ocr
      FROM clientes_ficha
    `);

    console.log('=== RESUMEN GENERAL ===');
    console.log('Total fichas:', resumen.rows[0].total_fichas);
    console.log('Con DNI:', resumen.rows[0].con_dni);
    console.log('Con Voucher:', resumen.rows[0].con_voucher);
    console.log('Con Ambos:', resumen.rows[0].con_ambos);
    console.log('Con OCR:', resumen.rows[0].con_ocr);

    // Query 2: Por proyecto (excluyendo Pruebas)
    const porProyecto = await client.query(`
      SELECT
        p.nombre as proyecto,
        COUNT(cf.id) as total_fichas,
        COUNT(*) FILTER (WHERE cf.dni_fotos IS NOT NULL AND array_length(cf.dni_fotos, 1) > 0) as con_dni,
        COUNT(*) FILTER (WHERE cf.comprobante_deposito_fotos IS NOT NULL AND array_length(cf.comprobante_deposito_fotos, 1) > 0) as con_voucher
      FROM clientes_ficha cf
      JOIN locales l ON cf.local_id = l.id
      JOIN proyectos p ON l.proyecto_id = p.id
      WHERE p.nombre NOT ILIKE '%prueba%'
      GROUP BY p.nombre
      ORDER BY total_fichas DESC
    `);

    console.log('\n=== POR PROYECTO (sin Pruebas) ===');
    console.table(porProyecto.rows);

    // Query 3: Detalle fichas con vouchers (excluyendo Pruebas)
    const conVouchers = await client.query(`
      SELECT
        l.codigo as local,
        p.nombre as proyecto,
        COALESCE(cf.titular_nombres, '') || ' ' || COALESCE(cf.titular_apellido_paterno, '') as cliente,
        COALESCE(array_length(cf.dni_fotos, 1), 0) as num_dni,
        COALESCE(array_length(cf.comprobante_deposito_fotos, 1), 0) as num_vouchers,
        CASE WHEN cf.comprobante_deposito_ocr IS NOT NULL AND jsonb_array_length(cf.comprobante_deposito_ocr) > 0 THEN 'SI' ELSE 'NO' END as tiene_ocr,
        cf.id as ficha_id
      FROM clientes_ficha cf
      JOIN locales l ON cf.local_id = l.id
      JOIN proyectos p ON l.proyecto_id = p.id
      WHERE p.nombre NOT ILIKE '%prueba%'
        AND cf.comprobante_deposito_fotos IS NOT NULL
        AND array_length(cf.comprobante_deposito_fotos, 1) > 0
      ORDER BY p.nombre, l.codigo
    `);

    console.log('\n=== FICHAS CON VOUCHERS (a migrar) ===');
    console.table(conVouchers.rows);
    console.log('\nTotal fichas a migrar:', conVouchers.rows.length);

    // Contar total de vouchers
    let totalVouchers = 0;
    conVouchers.rows.forEach(r => totalVouchers += parseInt(r.num_vouchers));
    console.log('Total vouchers a procesar:', totalVouchers);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
