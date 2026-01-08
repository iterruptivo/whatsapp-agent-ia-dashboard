/**
 * Script para importar leads de Trujillo y agregarlos a Repulse
 * Los leads se marcan con utm="victoria" para simular que vienen de Victoria
 *
 * Lógica:
 * - Leads NUEVOS: Insertar en leads + agregar a repulse
 * - Leads DUPLICADOS: Solo agregar a repulse (si no están ya)
 * - Generar informe con detalle de duplicados
 */

const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
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

const EXCEL_PATH = path.join(__dirname, '..', 'docs', 'trujillo-leads.xlsx');
const UTM = 'victoria';
const PROYECTO_NOMBRE = 'Trujillo';

/**
 * Limpiar teléfono al formato estándar: 51 + 9 dígitos
 */
function cleanPhone(rawPhone) {
  if (!rawPhone) return null;

  // Convertir a string y eliminar todo excepto dígitos
  let cleaned = String(rawPhone).replace(/\D/g, '');

  // Si tiene 9 dígitos, agregar 51
  if (cleaned.length === 9) {
    cleaned = '51' + cleaned;
  }

  // Si empieza con 51 y tiene 11 dígitos, está correcto
  if (cleaned.startsWith('51') && cleaned.length === 11) {
    return cleaned;
  }

  // Si tiene más de 11 y empieza con 51, tomar los primeros 11
  if (cleaned.length > 11 && cleaned.startsWith('51')) {
    return cleaned.substring(0, 11);
  }

  // Retornar lo que tengamos (puede ser inválido)
  return cleaned || null;
}

/**
 * Leer y parsear el Excel
 */
function readExcel() {
  console.log(`\n📖 Leyendo Excel: ${EXCEL_PATH}`);

  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`   Filas encontradas: ${data.length}`);

  // Mapear y limpiar datos
  const leads = data.map((row, index) => {
    const telefono = cleanPhone(row['CELULAR']);
    const nombre = row['DATOS DEL CLIENTE'] ? String(row['DATOS DEL CLIENTE']).trim() : '';

    // Parsear fechas
    let fechaCaptura = null;
    let fechaVisita = null;

    if (row['FECHA']) {
      // Excel almacena fechas como números seriales
      if (typeof row['FECHA'] === 'number') {
        const date = XLSX.SSF.parse_date_code(row['FECHA']);
        fechaCaptura = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      } else {
        fechaCaptura = String(row['FECHA']);
      }
    }

    if (row['FECHA DE VISITA']) {
      if (typeof row['FECHA DE VISITA'] === 'number') {
        const date = XLSX.SSF.parse_date_code(row['FECHA DE VISITA']);
        fechaVisita = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      } else {
        fechaVisita = String(row['FECHA DE VISITA']);
      }
    }

    return {
      rowNum: index + 1,
      telefono,
      nombre,
      fechaCaptura,
      fechaVisita,
      asesor: row['ASESOR'] || null
    };
  });

  // Filtrar los que tienen teléfono válido
  const validLeads = leads.filter(l => l.telefono && l.telefono.length === 11);
  const invalidLeads = leads.filter(l => !l.telefono || l.telefono.length !== 11);

  if (invalidLeads.length > 0) {
    console.log(`   ⚠️ Leads con teléfono inválido: ${invalidLeads.length}`);
    invalidLeads.slice(0, 5).forEach(l => {
      console.log(`      Fila ${l.rowNum}: "${l.telefono}" - ${l.nombre}`);
    });
  }

  return validLeads;
}

async function main() {
  console.log('='.repeat(60));
  console.log('IMPORTACIÓN DE LEADS TRUJILLO → REPULSE');
  console.log('UTM: "victoria" (simula captura por Victoria)');
  console.log('='.repeat(60));

  // PASO 1: Leer Excel
  const leadsExcel = readExcel();
  console.log(`\n📋 Leads válidos en Excel: ${leadsExcel.length}`);

  // PASO 2: Eliminar duplicados por teléfono (quedarse con el primero)
  const telefonosVistos = new Set();
  const leadsUnicos = [];
  const duplicadosExcel = [];

  for (const lead of leadsExcel) {
    if (telefonosVistos.has(lead.telefono)) {
      duplicadosExcel.push(lead);
    } else {
      telefonosVistos.add(lead.telefono);
      leadsUnicos.push(lead);
    }
  }

  console.log(`📋 Duplicados en Excel eliminados: ${duplicadosExcel.length}`);
  console.log(`📋 Teléfonos únicos: ${leadsUnicos.length}`);

  // PASO 3: Obtener ID del proyecto Trujillo
  const { data: proyecto, error: proyectoError } = await supabase
    .from('proyectos')
    .select('id, nombre')
    .ilike('nombre', `%${PROYECTO_NOMBRE}%`)
    .single();

  if (proyectoError || !proyecto) {
    console.error('\n❌ Error: No se encontró el proyecto Trujillo');
    console.error(proyectoError);
    return;
  }

  console.log(`\n🏗️ Proyecto: ${proyecto.nombre} (${proyecto.id})`);

  // PASO 4: Verificar cuáles ya existen en Trujillo
  const telefonos = leadsUnicos.map(l => l.telefono);

  const { data: leadsExistentes, error: leadsError } = await supabase
    .from('leads')
    .select('id, telefono, nombre')
    .eq('proyecto_id', proyecto.id)
    .in('telefono', telefonos);

  if (leadsError) {
    console.error('❌ Error consultando leads:', leadsError);
    return;
  }

  // Crear mapa de existentes
  const existentesMap = new Map();
  (leadsExistentes || []).forEach(l => {
    existentesMap.set(l.telefono, l);
  });

  console.log(`\n🔍 Leads ya existentes en Trujillo: ${existentesMap.size}`);

  // PASO 5: Clasificar
  const nuevos = leadsUnicos.filter(l => !existentesMap.has(l.telefono));
  const duplicadosBD = leadsUnicos.filter(l => existentesMap.has(l.telefono));

  console.log('\n📊 CLASIFICACIÓN:');
  console.log(`   ✅ Nuevos a crear: ${nuevos.length}`);
  console.log(`   🔄 Ya existen (solo a Repulse): ${duplicadosBD.length}`);

  // PASO 6: Insertar leads nuevos
  let leadsCreados = [];
  if (nuevos.length > 0) {
    console.log('\n📝 Insertando leads nuevos...');

    const nuevosLeads = nuevos.map(lead => ({
      proyecto_id: proyecto.id,
      telefono: lead.telefono,
      nombre: lead.nombre || '',
      utm: UTM,
      estado: 'lead_manual',
      fecha_captura: lead.fechaCaptura ? new Date(lead.fechaCaptura).toISOString() : new Date().toISOString(),
      horario_visita: lead.fechaVisita || null,
      asistio: false,
      intentos_bot: 0,
      notificacion_enviada: false,
      excluido_repulse: false
    }));

    // Insertar en batches de 50
    const batchSize = 50;
    for (let i = 0; i < nuevosLeads.length; i += batchSize) {
      const batch = nuevosLeads.slice(i, i + batchSize);
      const { data: creados, error: createError } = await supabase
        .from('leads')
        .insert(batch)
        .select('id, telefono');

      if (createError) {
        console.error(`❌ Error en batch ${i / batchSize + 1}:`, createError.message);
        continue;
      }

      leadsCreados.push(...(creados || []));
      process.stdout.write(`   Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(nuevosLeads.length / batchSize)} - ${creados?.length || 0} creados\r`);
    }
    console.log(`\n   ✅ Total leads creados: ${leadsCreados.length}`);
  }

  // PASO 7: Preparar todos los leads para Repulse (nuevos + duplicados)
  // Crear mapa de leads creados
  const creadosMap = new Map();
  leadsCreados.forEach(l => {
    creadosMap.set(l.telefono, l.id);
  });

  // Todos los leads que van a Repulse
  const leadsParaRepulse = [];

  // Agregar los nuevos creados
  for (const lead of nuevos) {
    const leadId = creadosMap.get(lead.telefono);
    if (leadId) {
      leadsParaRepulse.push({
        lead_id: leadId,
        proyecto_id: proyecto.id,
        telefono: lead.telefono
      });
    }
  }

  // Agregar los duplicados (usar ID existente)
  for (const lead of duplicadosBD) {
    const existente = existentesMap.get(lead.telefono);
    if (existente) {
      leadsParaRepulse.push({
        lead_id: existente.id,
        proyecto_id: proyecto.id,
        telefono: lead.telefono
      });
    }
  }

  // PASO 8: Verificar cuáles ya están en Repulse
  const leadIds = leadsParaRepulse.map(l => l.lead_id);

  const { data: yaEnRepulse, error: repulseCheckError } = await supabase
    .from('repulse_leads')
    .select('lead_id')
    .eq('proyecto_id', proyecto.id)
    .in('lead_id', leadIds);

  if (repulseCheckError) {
    console.error('⚠️ Error verificando Repulse:', repulseCheckError.message);
  }

  const yaEnRepulseSet = new Set((yaEnRepulse || []).map(r => r.lead_id));
  const leadsNuevosEnRepulse = leadsParaRepulse.filter(l => !yaEnRepulseSet.has(l.lead_id));

  console.log(`\n🔄 Leads a agregar a Repulse: ${leadsNuevosEnRepulse.length}`);
  console.log(`   (${yaEnRepulseSet.size} ya estaban en Repulse)`);

  // PASO 9: Insertar en Repulse
  let agregadosRepulse = 0;
  const repulseBatchSize = 50;
  if (leadsNuevosEnRepulse.length > 0) {
    console.log('\n🔄 Agregando a Repulse...');

    const repulseEntries = leadsNuevosEnRepulse.map(lead => ({
      lead_id: lead.lead_id,
      proyecto_id: proyecto.id,
      origen: 'manual',
      estado: 'pendiente',
      conteo_repulses: 0
    }));

    // Insertar en batches
    for (let i = 0; i < repulseEntries.length; i += repulseBatchSize) {
      const batch = repulseEntries.slice(i, i + repulseBatchSize);
      const { error: repulseError } = await supabase
        .from('repulse_leads')
        .insert(batch);

      if (repulseError) {
        console.error(`⚠️ Error en batch Repulse ${Math.floor(i / repulseBatchSize) + 1}:`, repulseError.message);
        continue;
      }

      agregadosRepulse += batch.length;
    }
    console.log(`   ✅ Agregados a Repulse: ${agregadosRepulse}`);
  }

  // RESUMEN FINAL
  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN FINAL');
  console.log('='.repeat(60));
  console.log(`📋 Total en Excel: ${leadsExcel.length}`);
  console.log(`📋 Teléfonos únicos: ${leadsUnicos.length}`);
  console.log(`✅ Leads NUEVOS insertados: ${leadsCreados.length}`);
  console.log(`🔄 Duplicados (ya existían en Trujillo): ${duplicadosBD.length}`);
  console.log(`🎯 Total agregados a Repulse: ${agregadosRepulse}`);

  // Detalle de duplicados
  if (duplicadosBD.length > 0) {
    console.log('\n📝 DETALLE DUPLICADOS (ya existían en BD):');
    duplicadosBD.forEach(lead => {
      const existente = existentesMap.get(lead.telefono);
      console.log(`   - ${lead.telefono} | Excel: "${lead.nombre}" | BD: "${existente?.nombre || 'N/A'}"`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ PROCESO COMPLETADO');
  console.log('='.repeat(60));
}

main().catch(console.error);
