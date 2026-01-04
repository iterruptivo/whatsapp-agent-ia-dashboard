#!/usr/bin/env node
/**
 * Script para hacer el bucket constancias-templates público
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
  console.error('Error: Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Updating bucket constancias-templates to public...');

  const { error } = await supabase.storage.updateBucket('constancias-templates', {
    public: true,
  });

  if (error) {
    console.error('Error updating bucket:', error);
    process.exit(1);
  }

  console.log('✓ Bucket updated to public successfully!');

  // Verify by listing files
  const { data, error: listError } = await supabase.storage
    .from('constancias-templates')
    .list();

  if (listError) {
    console.error('Error listing files:', listError);
  } else {
    console.log('Files in bucket:', data.map(f => f.name));
  }
}

main().catch(console.error);
