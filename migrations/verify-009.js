/**
 * Script de verificación para migración 009
 * Verifica que la política RLS fue actualizada correctamente
 */

const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:1T3rrupt1v02025$@db.qssefegfzxxurqbzndrs.supabase.co:5432/postgres';

async function verifyMigration() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('VERIFICACIÓN: Migración 009 - RLS Policy');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a Supabase PostgreSQL\n');

    // Verificar políticas
    console.log('📋 Políticas RLS en purchase_requisitions:\n');

    const { rows: policies } = await client.query(`
      SELECT
        policyname,
        cmd,
        permissive,
        CASE
          WHEN qual IS NOT NULL THEN 'SÍ'
          ELSE 'NO'
        END as tiene_using,
        CASE
          WHEN with_check IS NOT NULL THEN 'SÍ'
          ELSE 'NO'
        END as tiene_with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'purchase_requisitions'
      ORDER BY cmd, policyname;
    `);

    console.log('Políticas encontradas:');
    console.log('───────────────────────────────────────────────────────────────');

    if (policies.length === 0) {
      console.log('⚠️  No se encontraron políticas RLS');
    } else {
      policies.forEach((p, idx) => {
        console.log(`${idx + 1}. ${p.policyname}`);
        console.log(`   Comando: ${p.cmd}`);
        console.log(`   Permissive: ${p.permissive ? 'SÍ' : 'NO'}`);
        console.log(`   USING: ${p.tiene_using}`);
        console.log(`   WITH CHECK: ${p.tiene_with_check}`);
        console.log('');
      });
    }

    // Verificar específicamente la política de UPDATE
    const updatePolicy = policies.find(p =>
      p.cmd === 'UPDATE' &&
      p.policyname.includes('Requester can update own PR')
    );

    if (updatePolicy) {
      console.log('✅ Política de UPDATE actualizada correctamente');
      console.log(`   Nombre: ${updatePolicy.policyname}`);
    } else {
      console.log('⚠️  Política esperada no encontrada');
      console.log('   Buscando: "Requester can update own PR..."');
    }

    // Test de conteo
    console.log('\n📊 Estadísticas de purchase_requisitions:\n');

    const { rows: stats } = await client.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM purchase_requisitions
      GROUP BY status
      ORDER BY
        CASE status
          WHEN 'draft' THEN 1
          WHEN 'submitted' THEN 2
          WHEN 'pending_approval' THEN 3
          WHEN 'approved' THEN 4
          WHEN 'rejected' THEN 5
          WHEN 'completed' THEN 6
          WHEN 'cancelled' THEN 7
          ELSE 99
        END;
    `);

    if (stats.length === 0) {
      console.log('   No hay PRs en el sistema todavía');
    } else {
      stats.forEach(s => {
        console.log(`   ${s.status.padEnd(20)} → ${s.count} PRs`);
      });
    }

    const { rows: total } = await client.query(`SELECT COUNT(*) as count FROM purchase_requisitions;`);
    console.log(`\n   TOTAL: ${total[0].count} PRs`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ VERIFICACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ERROR durante verificación:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  });
