/**
 * Script para agregar los 71 leads recién creados a Repulse
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar .env.local manualmente
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split(/\r?\n/).forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const key = line.substring(0, idx).trim();
    const value = line.substring(idx + 1).trim();
    process.env[key] = value;
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const UTM = '120241039661610316';

async function main() {
  console.log('Buscando leads con UTM:', UTM);

  // Obtener proyecto Chincha
  const { data: proyecto } = await supabase
    .from('proyectos')
    .select('id, nombre')
    .ilike('nombre', '%Chincha%')
    .single();

  console.log('Proyecto:', proyecto.nombre);

  // Obtener los 71 leads creados hoy con ese UTM
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, telefono')
    .eq('proyecto_id', proyecto.id)
    .eq('utm', UTM);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Leads encontrados: ${leads.length}`);

  // Agregar a repulse_leads (origen debe ser 'cron_automatico' o 'manual')
  const repulseEntries = leads.map(lead => ({
    lead_id: lead.id,
    proyecto_id: proyecto.id,
    origen: 'cron_automatico',
    estado: 'pendiente'
  }));

  const { error: repulseError } = await supabase
    .from('repulse_leads')
    .insert(repulseEntries);

  if (repulseError) {
    console.error('Error agregando a Repulse:', repulseError.message);
  } else {
    console.log(`✅ ${leads.length} leads agregados a Repulse`);
  }
}

main().catch(console.error);
