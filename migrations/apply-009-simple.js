/**
 * Script simplificado para aplicar migración 009
 * Usa solo módulos nativos de Node.js y pg (ya instalado)
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración manual desde .env.local
const DATABASE_URL = 'postgresql://postgres:1T3rrupt1v02025$@db.qssefegfzxxurqbzndrs.supabase.co:5432/postgres';

async function applyMigration() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('MIGRACIÓN 009: Fix RLS Policy para submitPR()');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Crear cliente PostgreSQL
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('⏳ Conectando a PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado a Supabase PostgreSQL\n');

    // Leer archivo SQL
    const migrationPath = path.join(__dirname, '009_fix_rls_submit_pr.sql');
    console.log(`📄 Leyendo migración: ${migrationPath}`);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Archivo no encontrado: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`✅ Migración leída (${migrationSQL.length} caracteres)\n`);

    // Preview
    console.log('PREVIEW DE CAMBIOS:');
    console.log('───────────────────────────────────────────────────────────────');
    console.log('1. DROP POLICY "Requester can update draft, approver can update status, admin can update all"');
    console.log('2. CREATE POLICY "Requester can update own PR, approver can update status, admin can update all"');
    console.log('   → Permite al requester enviar a aprobación (draft → pending_approval)');
    console.log('───────────────────────────────────────────────────────────────\n');

    // Ejecutar migración
    console.log('🚀 Ejecutando migración...\n');

    await client.query(migrationSQL);

    console.log('✅ Migración ejecutada exitosamente\n');

    // Verificar políticas
    console.log('🔍 Verificando políticas RLS...');

    const { rows: policies } = await client.query(`
      SELECT
        policyname,
        cmd,
        pg_get_expr(qual, 'purchase_requisitions'::regclass) as using_expr,
        pg_get_expr(with_check, 'purchase_requisitions'::regclass) as with_check_expr
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'purchase_requisitions'
        AND cmd = 'UPDATE'
      ORDER BY policyname;
    `);

    if (policies.length > 0) {
      console.log('\n✅ Políticas de UPDATE encontradas:');
      policies.forEach(p => {
        console.log(`\n   Policy: ${p.policyname}`);
        console.log(`   Command: ${p.cmd}`);
        if (p.using_expr) {
          console.log(`   USING: ${p.using_expr.substring(0, 100)}...`);
        }
        if (p.with_check_expr) {
          console.log(`   WITH CHECK: ${p.with_check_expr.substring(0, 100)}...`);
        }
      });
    }

    // Test básico
    console.log('\n🧪 Test básico: Verificar tabla purchase_requisitions...');

    const { rows: countResult } = await client.query(`
      SELECT COUNT(*) as count FROM purchase_requisitions;
    `);

    console.log(`✅ Tabla accesible: ${countResult[0].count} registros\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ MIGRACIÓN 009 COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nPRÓXIMOS PASOS:');
    console.log('1. Probar submitPR() en el dashboard');
    console.log('2. Crear PR en borrador');
    console.log('3. Enviar a aprobación (debe funcionar sin error RLS)');
    console.log('4. Verificar que el aprobador recibe la notificación\n');

  } catch (error) {
    console.error('\n❌ ERROR durante la migración:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('✓ Conexión cerrada');
  }
}

// Ejecutar
applyMigration()
  .then(() => {
    console.log('✓ Script finalizado correctamente');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  });
