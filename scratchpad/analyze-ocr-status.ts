/**
 * Script temporal para analizar el estado de los datos OCR en fichas de inscripción
 *
 * Propósito:
 * - Contar fichas con/sin datos OCR
 * - Identificar fichas con fotos de voucher pero sin OCR procesado
 * - Excluir proyecto PRUEBAS del análisis
 *
 * Ejecutar con: npx tsx scratchpad/analyze-ocr-status.ts
 */

import { createClient } from '@supabase/supabase-js';

// Variables de entorno (hardcoded para este script temporal)
const SUPABASE_URL = 'https://qssefegfzxxurqbzndrs.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzc2VmZWdmenh4dXJxYnpuZHJzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDEyMDYxMSwiZXhwIjoyMDc1Njk2NjExfQ.ek4Luc6s8YaDjsP_wks04MFRQ1f5Mn21sjA23JMGq0E';

// Cliente de Supabase con service role (bypass RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface FichaOCRStatus {
  id: string;
  local_id: string;
  proyecto_id: string;
  proyecto_nombre?: string;
  comprobante_deposito_ocr: any;
  comprobante_deposito_fotos: string[] | null;
}

async function main() {
  console.log('🔍 Analizando estado de OCR en fichas de inscripción...\n');

  // PASO 1: Obtener ID del proyecto PRUEBAS
  console.log('📋 Paso 1: Identificando proyecto PRUEBAS...');
  const { data: proyectoPruebas, error: errorPruebas } = await supabase
    .from('proyectos')
    .select('id, nombre')
    .ilike('nombre', '%prueba%')
    .single();

  if (errorPruebas || !proyectoPruebas) {
    console.error('⚠️  No se encontró proyecto PRUEBAS, continuando sin exclusión...');
  } else {
    console.log(`✅ Proyecto PRUEBAS encontrado: ${proyectoPruebas.nombre} (${proyectoPruebas.id})\n`);
  }

  const proyectoPruebasId = proyectoPruebas?.id;

  // PASO 2: Obtener todas las fichas (excluyendo PRUEBAS)
  console.log('📋 Paso 2: Obteniendo fichas de inscripción...');
  const { data: fichas, error: errorFichas } = await supabase
    .from('clientes_ficha')
    .select(`
      id,
      local_id,
      comprobante_deposito_ocr,
      comprobante_deposito_fotos,
      local:locales!clientes_ficha_local_id_fkey(proyecto_id)
    `);

  // PASO 2.5: Obtener nombres de proyectos
  const { data: proyectos, error: errorProyectos } = await supabase
    .from('proyectos')
    .select('id, nombre');

  const proyectosMap = new Map((proyectos || []).map(p => [p.id, p.nombre]));

  // PASO 2.6: Filtrar fichas excluyendo proyecto PRUEBAS
  let fichasFiltradas = fichas || [];
  if (proyectoPruebasId) {
    fichasFiltradas = fichasFiltradas.filter(
      (f: any) => f.local?.proyecto_id !== proyectoPruebasId
    );
  }

  if (errorFichas) {
    console.error('❌ Error al obtener fichas:', errorFichas);
    process.exit(1);
  }

  if (fichasFiltradas.length === 0) {
    console.log('⚠️  No se encontraron fichas');
    process.exit(0);
  }

  console.log(`✅ Se obtuvieron ${fichasFiltradas.length} fichas (${(fichas || []).length} total antes de filtrar)\n`);

  // PASO 3: Clasificar fichas por estado de OCR
  console.log('📊 Paso 3: Clasificando fichas...\n');

  const fichasConOCR: FichaOCRStatus[] = [];
  const fichasSinOCRConFotos: FichaOCRStatus[] = [];
  const fichasSinVoucher: FichaOCRStatus[] = [];

  for (const ficha of fichasFiltradas) {
    const proyectoId = (ficha as any).local?.proyecto_id;
    const fichaData: FichaOCRStatus = {
      id: ficha.id,
      local_id: ficha.local_id,
      proyecto_id: proyectoId,
      proyecto_nombre: proyectosMap.get(proyectoId) || 'N/A',
      comprobante_deposito_ocr: ficha.comprobante_deposito_ocr,
      comprobante_deposito_fotos: ficha.comprobante_deposito_fotos,
    };

    // Verificar si tiene datos OCR válidos
    const tieneOCR =
      ficha.comprobante_deposito_ocr !== null &&
      Array.isArray(ficha.comprobante_deposito_ocr) &&
      ficha.comprobante_deposito_ocr.length > 0;

    // Verificar si tiene fotos de voucher
    const tieneFotos =
      ficha.comprobante_deposito_fotos !== null &&
      Array.isArray(ficha.comprobante_deposito_fotos) &&
      ficha.comprobante_deposito_fotos.length > 0;

    if (tieneOCR) {
      fichasConOCR.push(fichaData);
    } else if (tieneFotos) {
      fichasSinOCRConFotos.push(fichaData);
    } else {
      fichasSinVoucher.push(fichaData);
    }
  }

  // PASO 4: Mostrar estadísticas
  console.log('═'.repeat(80));
  console.log('📊 RESUMEN DE ANÁLISIS OCR');
  console.log('═'.repeat(80));
  console.log();
  console.log(`Total de fichas analizadas:              ${fichasFiltradas.length}`);
  console.log(`  └─ Excluye proyecto PRUEBAS:           ${proyectoPruebasId ? 'SÍ' : 'NO'}`);
  console.log();
  console.log(`✅ Fichas CON datos OCR:                  ${fichasConOCR.length} (${((fichasConOCR.length / fichasFiltradas.length) * 100).toFixed(1)}%)`);
  console.log(`⚠️  Fichas SIN OCR pero CON fotos:        ${fichasSinOCRConFotos.length} (${((fichasSinOCRConFotos.length / fichasFiltradas.length) * 100).toFixed(1)}%)`);
  console.log(`❌ Fichas SIN voucher (sin fotos):        ${fichasSinVoucher.length} (${((fichasSinVoucher.length / fichasFiltradas.length) * 100).toFixed(1)}%)`);
  console.log();

  // PASO 5: Mostrar ejemplos de fichas sin OCR pero con fotos
  if (fichasSinOCRConFotos.length > 0) {
    console.log('═'.repeat(80));
    console.log('🔍 EJEMPLOS DE FICHAS SIN OCR PERO CON FOTOS');
    console.log('═'.repeat(80));
    console.log();
    console.log('Mostrando los primeros 5 casos:');
    console.log();

    const ejemplos = fichasSinOCRConFotos.slice(0, 5);

    ejemplos.forEach((ficha, index) => {
      console.log(`${index + 1}. Ficha ID: ${ficha.id}`);
      console.log(`   └─ Local ID: ${ficha.local_id}`);
      console.log(`   └─ Proyecto: ${ficha.proyecto_nombre}`);
      console.log(`   └─ Fotos de voucher: ${ficha.comprobante_deposito_fotos?.length || 0} archivo(s)`);

      if (ficha.comprobante_deposito_fotos && ficha.comprobante_deposito_fotos.length > 0) {
        ficha.comprobante_deposito_fotos.forEach((foto, fotoIndex) => {
          const nombreCorto = foto.split('/').pop() || foto;
          console.log(`      ${fotoIndex + 1}. ${nombreCorto}`);
        });
      }
      console.log();
    });

    if (fichasSinOCRConFotos.length > 5) {
      console.log(`... y ${fichasSinOCRConFotos.length - 5} casos adicionales\n`);
    }
  } else {
    console.log('═'.repeat(80));
    console.log('✅ Todas las fichas con fotos tienen datos OCR procesados');
    console.log('═'.repeat(80));
    console.log();
  }

  // PASO 6: Análisis adicional - Ejemplos de datos OCR existentes
  if (fichasConOCR.length > 0) {
    console.log('═'.repeat(80));
    console.log('📝 EJEMPLO DE DATOS OCR EXISTENTES (primeros 2 casos)');
    console.log('═'.repeat(80));
    console.log();

    const ejemplosOCR = fichasConOCR.slice(0, 2);

    for (const ficha of ejemplosOCR) {
      console.log(`Ficha ID: ${ficha.id}`);
      console.log(`Local ID: ${ficha.local_id}`);
      console.log(`Proyecto: ${ficha.proyecto_nombre}`);
      console.log('Datos OCR:');
      console.log(JSON.stringify(ficha.comprobante_deposito_ocr, null, 2));
      console.log();
    }
  }

  console.log('═'.repeat(80));
  console.log('✅ Análisis completado');
  console.log('═'.repeat(80));
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
