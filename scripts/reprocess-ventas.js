const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://qssefegfzxxurqbzndrs.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzc2VmZWdmenh4dXJxYnpuZHJzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDEyMDYxMSwiZXhwIjoyMDc1Njk2NjExfQ.ek4Luc6s8YaDjsP_wks04MFRQ1f5Mn21sjA23JMGq0E'
);

async function reprocess() {
  console.log('=== RE-PROCESANDO VENTAS ===\n');

  // 1. Load ALL leads (paginated with 1000 limit - Supabase max)
  const leadsMap = new Map();
  const PAGE_SIZE = 1000; // Supabase hard limit
  let offset = 0;
  let hasMore = true;
  let totalLoaded = 0;
  const numericUtmRegex = /^\d+$/; // For Victoria detection (pure numbers)

  while (hasMore) {
    const { data: leadsPage, error } = await supabase
      .from('leads')
      .select('id, telefono, utm, nombre, created_at')
      .not('telefono', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Error loading leads:', error);
      break;
    }

    if (!leadsPage || leadsPage.length === 0) {
      hasMore = false;
    } else {
      leadsPage.forEach(lead => {
        if (lead.telefono) {
          const existing = leadsMap.get(lead.telefono);
          const currentUtm = (lead.utm || '').toLowerCase();
          const isCurrentVictoria = currentUtm === 'victoria' || numericUtmRegex.test(lead.utm || '');

          // If no existing lead, or current is Victoria and existing is not, use current
          if (!existing) {
            leadsMap.set(lead.telefono, {
              id: lead.id,
              utm: lead.utm || '',
              nombre: lead.nombre || '',
              created_at: lead.created_at,
            });
          } else {
            const existingUtm = existing.utm.toLowerCase();
            const isExistingVictoria = existingUtm === 'victoria' || numericUtmRegex.test(existing.utm);
            // Prefer Victoria lead over non-Victoria
            if (isCurrentVictoria && !isExistingVictoria) {
              leadsMap.set(lead.telefono, {
                id: lead.id,
                utm: lead.utm || '',
                nombre: lead.nombre || '',
                created_at: lead.created_at,
              });
            }
          }
        }
      });
      totalLoaded += leadsPage.length;
      offset += PAGE_SIZE;
      hasMore = leadsPage.length === PAGE_SIZE;

      if (totalLoaded % 10000 === 0) {
        console.log(`  Loaded ${totalLoaded} leads...`);
      }
    }
  }

  console.log(`\nTotal leads cargados: ${leadsMap.size}`);

  // 2. Get all ventas
  const { data: ventas, error: ventasError } = await supabase
    .from('ventas_externas')
    .select('id, telefono, match_type, lead_id');

  if (ventasError) {
    console.error('Error loading ventas:', ventasError);
    return;
  }

  console.log(`Ventas a procesar: ${ventas?.length}\n`);

  // 3. Process each venta
  let updated = 0, victoria = 0, otroUtm = 0, sinLead = 0;

  for (const venta of ventas || []) {
    const lead = leadsMap.get(venta.telefono);
    let newMatchType = 'sin_lead';
    let newLeadId = null;
    let newLeadUtm = null;
    let newLeadNombre = null;
    let newLeadFecha = null;

    if (lead) {
      const utm = lead.utm.toLowerCase();
      const isVictoria = utm === 'victoria' || numericUtmRegex.test(lead.utm);
      newMatchType = isVictoria ? 'victoria' : 'otro_utm';
      newLeadId = lead.id;
      newLeadUtm = lead.utm;
      newLeadNombre = lead.nombre;
      newLeadFecha = lead.created_at;
    }

    // Update if changed
    if (newMatchType !== venta.match_type || newLeadId !== venta.lead_id) {
      const { error } = await supabase
        .from('ventas_externas')
        .update({
          lead_id: newLeadId,
          lead_utm: newLeadUtm,
          lead_nombre: newLeadNombre,
          lead_fecha_creacion: newLeadFecha,
          match_type: newMatchType,
          match_timestamp: new Date().toISOString(),
        })
        .eq('id', venta.id);

      if (!error) {
        updated++;
        if (venta.match_type !== newMatchType) {
          console.log(`  Updated ${venta.telefono}: ${venta.match_type} -> ${newMatchType}`);
        }
      }
    }

    // Count stats
    if (newMatchType === 'victoria') victoria++;
    else if (newMatchType === 'otro_utm') otroUtm++;
    else sinLead++;
  }

  console.log('\n=== RESULTADOS ===');
  console.log(`Total ventas: ${ventas?.length}`);
  console.log(`Actualizadas: ${updated}`);
  console.log(`Victoria: ${victoria}`);
  console.log(`Otro UTM: ${otroUtm}`);
  console.log(`Sin Lead: ${sinLead}`);
}

reprocess().catch(console.error);
