/**
 * Script para importar leads de VictorIA Chincha que fallaron en n8n
 *
 * Plan SIMPLIFICADO (leads tienen proyecto_id directo):
 * 1. Limpiar duplicados por teléfono
 * 2. Verificar si existen en proyecto Chincha
 * 3. Crear los que no existen
 * 4. Agregar a Repulse
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
  process.env.SUPABASE_SERVICE_ROLE_KEY // Usar service role para bypass RLS
);

// Lista de teléfonos extraída del documento
const leadsRaw = [
  '51953230370', '51915027921', '51921398966', '51959935416', '51980561361',
  '51904179652', '51955005075', '51913564181', '51960112439', '51929064446',
  '51961317214', '51956151330', '51921398966', '51959935416', '51953332581',
  '51977518295', '51977518295', '51977518295', '51914573264', '51968588047',
  '51956974606', '51907493507', '51921398966', '51920676516', '51920676516',
  '51987479783', '51933853978', '51989458782', '51989458782', '51944503098',
  '51906255854', '51924138611', '51924138611', '51959928814', '51967703756',
  '51983691933', '51955259383', '51987971136', '51930619101', '51930619101',
  '51923235388', '51918979891', '51927994187', '51960378454', '51976023074',
  '51900276782', '51945299557', '51945299557', '51970408674', '51927994187',
  '51999093334', '51998276105', '51998276105', '51929619900', '51944503098',
  '51929624868', '51944503098', '51935110894', '51907692333', '51959442942',
  '51959442942', '51976517125', '51985206923', '51972508876', '51972508876',
  '51956974606', '51976150944', '51976150944', '51980811531', '51936596788',
  '51936596788', '51934668802', '51936414312', '51936414312', '51901116534',
  '51946000861', '51989594258', '51924742707', '51918306208', '51916455316',
  '51968434841', '51938559090', '51981520251', '51998154295', '51998154295',
  '51983989317', '51933448627', '51988617140', '51940756056', '51960776953',
  '51964485741', '51908840384', '51955103413', '51980645413', '51913564181',
  '51946266414', '51946429894', '51936689487', '51926842926', '51907490669',
  '51969307975', '51973947793', '51957673446', '51907493507', '51907493507',
  '51904380249', '51920676516', '51986820141', '51970675436', '51970675436',
  '51970675436', '51970675436', '51992508033', '51955259383', '51992777677'
];

const UTM = '120241039661610316';
const PROYECTO_NOMBRE = 'Chincha';

async function main() {
  console.log('='.repeat(60));
  console.log('IMPORTACIÓN DE LEADS VICTORIA - CHINCHA');
  console.log('='.repeat(60));

  // PASO 1: Eliminar duplicados
  const telefonosUnicos = [...new Set(leadsRaw)];
  console.log(`\n📋 Total en lista: ${leadsRaw.length}`);
  console.log(`📋 Duplicados eliminados: ${leadsRaw.length - telefonosUnicos.length}`);
  console.log(`📋 Teléfonos únicos: ${telefonosUnicos.length}`);

  // PASO 2: Obtener ID del proyecto Chincha
  const { data: proyecto, error: proyectoError } = await supabase
    .from('proyectos')
    .select('id, nombre')
    .ilike('nombre', `%${PROYECTO_NOMBRE}%`)
    .single();

  if (proyectoError || !proyecto) {
    console.error('❌ Error: No se encontró el proyecto Chincha');
    console.error(proyectoError);
    return;
  }

  console.log(`\n🏗️ Proyecto: ${proyecto.nombre} (${proyecto.id})`);

  // PASO 3: Verificar cuáles ya existen EN CHINCHA
  const { data: leadsExistentes, error: leadsError } = await supabase
    .from('leads')
    .select('id, telefono')
    .eq('proyecto_id', proyecto.id)
    .in('telefono', telefonosUnicos);

  if (leadsError) {
    console.error('❌ Error consultando leads:', leadsError);
    return;
  }

  const telefonosEnChincha = new Set(leadsExistentes?.map(l => l.telefono) || []);
  console.log(`\n🔍 Leads ya existentes en Chincha: ${telefonosEnChincha.size}`);

  // PASO 4: Clasificar
  const nuevos = telefonosUnicos.filter(t => !telefonosEnChincha.has(t));
  const ignorar = telefonosUnicos.filter(t => telefonosEnChincha.has(t));

  console.log('\n📊 CLASIFICACIÓN:');
  console.log(`   ✅ Nuevos a crear: ${nuevos.length}`);
  console.log(`   ⏭️ Ya existen en Chincha (ignorar): ${ignorar.length}`);

  // PASO 5: Crear leads nuevos
  let leadsCreados = [];
  if (nuevos.length > 0) {
    console.log('\n📝 Creando leads nuevos...');

    const nuevosLeads = nuevos.map(telefono => ({
      proyecto_id: proyecto.id,
      telefono,
      nombre: '', // Vacío como solicitado
      utm: UTM,
      estado: 'en_conversacion',
      created_at: new Date().toISOString()
    }));

    const { data: creados, error: createError } = await supabase
      .from('leads')
      .insert(nuevosLeads)
      .select('id, telefono');

    if (createError) {
      console.error('❌ Error creando leads:', createError);
      return;
    }

    leadsCreados = creados || [];
    console.log(`   ✅ Leads creados: ${leadsCreados.length}`);
  }

  // PASO 6: Agregar a Repulse
  if (leadsCreados.length > 0) {
    console.log('\n🔄 Agregando a Repulse...');

    const repulseEntries = leadsCreados.map(lead => ({
      lead_id: lead.id,
      proyecto_id: proyecto.id,
      origen: 'automatico',
      estado: 'pendiente'
    }));

    const { error: repulseError } = await supabase
      .from('repulse_leads')
      .insert(repulseEntries);

    if (repulseError) {
      console.error('⚠️ Error agregando a Repulse:', repulseError.message);
      // No es crítico, continuamos
    } else {
      console.log(`   ✅ Agregados a Repulse: ${leadsCreados.length}`);
    }
  }

  // RESUMEN FINAL
  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN FINAL');
  console.log('='.repeat(60));
  console.log(`📋 Total teléfonos en lista: ${leadsRaw.length}`);
  console.log(`📋 Teléfonos únicos: ${telefonosUnicos.length}`);
  console.log(`✅ Leads nuevos creados: ${leadsCreados.length}`);
  console.log(`⏭️ Leads ignorados (ya existían en Chincha): ${ignorar.length}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
