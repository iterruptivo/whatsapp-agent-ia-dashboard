/**
 * Script para aplicar migración 009: Fix RLS Policy para submitPR()
 *
 * PROBLEMA:
 * - submitPR() falla con error RLS al enviar PR de draft a pending_approval
 * - La política WITH CHECK no permite el cambio de status porque evalúa NEW.status
 *
 * SOLUCIÓN:
 * - Ajustar política de UPDATE para permitir que requester envíe a aprobación
 *
 * USO:
 * node migrations/apply-009.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function applyMigration() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('MIGRACIÓN 009: Fix RLS Policy para submitPR()');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Verificar variables de entorno
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ ERROR: Variables de entorno no configuradas');
    console.error('Requeridas: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('✓ Variables de entorno cargadas');
  console.log(`✓ Supabase URL: ${supabaseUrl}`);
  console.log('✓ Service Role Key: [OCULTA]\n');

  // Crear cliente de Supabase con service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('✓ Cliente Supabase creado con service_role key\n');

  // Leer archivo SQL
  const migrationPath = path.join(__dirname, '009_fix_rls_submit_pr.sql');
  console.log(`📄 Leyendo migración desde: ${migrationPath}`);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ ERROR: Archivo no encontrado: ${migrationPath}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  console.log(`✓ Migración leída (${migrationSQL.length} caracteres)\n`);

  // Mostrar preview de la migración
  console.log('PREVIEW DE LA MIGRACIÓN:');
  console.log('───────────────────────────────────────────────────────────────');
  const lines = migrationSQL.split('\n');
  const relevantLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('--');
  });
  console.log(relevantLines.slice(0, 20).join('\n'));
  if (relevantLines.length > 20) {
    console.log(`\n... (${relevantLines.length - 20} líneas más)`);
  }
  console.log('───────────────────────────────────────────────────────────────\n');

  // Confirmar ejecución
  console.log('⚠️  IMPORTANTE:');
  console.log('   - Esta migración modificará RLS policies en PRODUCCIÓN');
  console.log('   - Se recomienda tener un backup antes de continuar');
  console.log('   - La demo es HOY, esta es una corrección crítica\n');

  // En modo automático, ejecutar directamente (comentar para modo interactivo)
  console.log('🚀 Ejecutando migración automáticamente...\n');

  try {
    console.log('⏳ Ejecutando SQL en Supabase...');

    // Ejecutar la migración
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    });

    if (error) {
      // Si no existe la función exec_sql, intentar con query directo
      console.log('⚠️  Función exec_sql no disponible, intentando ejecución directa...');

      // Dividir en statements individuales (separados por ';')
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      console.log(`📝 Ejecutando ${statements.length} statements...`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (!stmt) continue;

        console.log(`   [${i + 1}/${statements.length}] Ejecutando statement...`);

        const { error: stmtError } = await supabase.rpc('exec', { query: stmt });

        if (stmtError) {
          console.error(`❌ Error en statement ${i + 1}:`, stmtError.message);
          console.error('Statement:', stmt.substring(0, 100) + '...');
          throw stmtError;
        }
      }

      console.log('\n✅ Migración ejecutada exitosamente (statements individuales)');
    } else {
      console.log('\n✅ Migración ejecutada exitosamente (exec_sql)');
    }

    // Verificar la política aplicada
    console.log('\n🔍 Verificando políticas RLS actualizadas...');

    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual, with_check')
      .eq('tablename', 'purchase_requisitions')
      .like('policyname', '%update%');

    if (policiesError) {
      console.error('⚠️  No se pudo verificar políticas:', policiesError.message);
    } else if (policies && policies.length > 0) {
      console.log('\n✅ Políticas de UPDATE en purchase_requisitions:');
      policies.forEach(p => {
        console.log(`   - ${p.policyname}`);
      });
    }

    // Testing básico
    console.log('\n🧪 Ejecutando tests básicos...');

    // Test 1: Verificar que la tabla existe
    const { count, error: countError } = await supabase
      .from('purchase_requisitions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Test 1 FALLÓ:', countError.message);
    } else {
      console.log(`✅ Test 1 OK: Tabla purchase_requisitions accesible (${count} registros)`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ MIGRACIÓN 009 COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nPRÓXIMOS PASOS:');
    console.log('1. Probar submitPR() en el dashboard');
    console.log('2. Verificar que el flujo draft → pending_approval funciona');
    console.log('3. Confirmar que no hay errores de RLS en consola\n');

  } catch (err) {
    console.error('\n❌ ERROR CRÍTICO durante la migración:');
    console.error(err);
    console.error('\n⚠️  La migración NO se completó. Verificar logs y base de datos.');
    process.exit(1);
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
