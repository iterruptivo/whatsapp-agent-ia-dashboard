// Script para ejecutar migración SQL usando fetch directo a Supabase
// Ejecutar con: node scripts/execute-migration.js

const fs = require('fs');
const path = require('path');

async function executeMigration() {
  const supabaseUrl = 'https://ydnahspmgfftnovamcal.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    // Intentar leer de .env.local
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
      if (match) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = match[1].trim();
      }
    }
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    console.error('ERROR: No se encontró SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Leer SQL
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260103_aprobaciones_descuento.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('=== Ejecutando migración de Aprobaciones ===\n');

  // Dividir en statements
  const statements = sqlContent
    .split(/;[\s]*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Total de statements: ${statements.length}\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');

    // Skip comments
    if (stmt.startsWith('--') || stmt.startsWith('/*')) {
      continue;
    }

    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({})
      });

      // Usar la API de SQL directa de Supabase
      const sqlResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        }
      });

    } catch (err) {
      // Ignorar errores de fetch, usaremos otro método
    }

    console.log(' [PENDIENTE]');
  }

  console.log('\n=== Nota: Usar SQL Editor en Supabase Dashboard ===');
  console.log('La API REST no permite ejecutar DDL directamente.');
  console.log('Copia el SQL y ejecútalo manualmente en el SQL Editor.');
}

// Método alternativo: crear las tablas via la API de Supabase si existen funciones RPC
async function checkTables() {
  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = 'https://ydnahspmgfftnovamcal.supabase.co';

  // Leer key de .env.local
  const envPath = path.join(__dirname, '..', '.env.local');
  let anonKey = '';
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
    if (match) {
      anonKey = match[1].trim();
    }
  }

  if (!anonKey) {
    console.log('No se encontró ANON_KEY');
    return;
  }

  const supabase = createClient(supabaseUrl, anonKey);

  console.log('\n=== Verificando tablas ===\n');

  // Intentar consultar las tablas
  const { data: configData, error: configError } = await supabase
    .from('config_aprobaciones_descuento')
    .select('id')
    .limit(1);

  if (configError) {
    console.log('config_aprobaciones_descuento:', configError.message);
  } else {
    console.log('config_aprobaciones_descuento: OK ✓');
  }

  const { data: aprobData, error: aprobError } = await supabase
    .from('aprobaciones_descuento')
    .select('id')
    .limit(1);

  if (aprobError) {
    console.log('aprobaciones_descuento:', aprobError.message);
  } else {
    console.log('aprobaciones_descuento: OK ✓');
  }
}

checkTables().catch(console.error);
