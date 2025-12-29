const apiKey = 'phx_B3pBlK1Hcjuu18EfzapIH6iSA5RBoyGA1k0ALbUSBKjdQPE';
const projectId = '274206';

async function runQuery(queryName, query) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`QUERY: ${queryName}`);
  console.log('='.repeat(80));

  try {
    const res = await fetch(`https://us.posthog.com/api/projects/${projectId}/query/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: query } })
    });

    const data = await res.json();

    if (data.error || !data.results) {
      console.log('Error/Response:', JSON.stringify(data, null, 2));
      return null;
    }

    return data;
  } catch (e) {
    console.error('Fetch error:', e);
    return null;
  }
}

function displayResults(data, limit = null) {
  if (!data || !data.results) return;

  console.log('\nColumns:', data.columns);
  console.log(`\nTotal rows: ${data.results.length}`);
  console.log('\nResults:');

  const rowsToShow = limit ? data.results.slice(0, limit) : data.results;
  rowsToShow.forEach((row, i) => {
    console.log(`\n${i + 1}.`);
    data.columns?.forEach((col, j) => {
      const value = row[j];
      if (typeof value === 'object' && value !== null) {
        console.log(`  ${col}: ${JSON.stringify(value, null, 2)}`);
      } else {
        console.log(`  ${col}: ${value}`);
      }
    });
  });
}

async function deepExplore() {
  // 1. Ver personas identificadas con sus propiedades
  const query1 = `
    SELECT
      pdi.person_id,
      pdi.person.properties.email as email,
      pdi.person.properties.name as name,
      pdi.person.properties.rol as rol,
      pdi.person.properties.proyecto_id as proyecto_id,
      pdi.person.created_at as person_created
    FROM person_distinct_ids pdi
    WHERE pdi.person.properties.email IS NOT NULL
    LIMIT 20
  `;
  const personas = await runQuery('1. PERSONAS IDENTIFICADAS CON PROPIEDADES', query1);
  displayResults(personas);

  // 2. Propiedades disponibles en events (no $pageview)
  const query2 = `
    SELECT DISTINCT
      arrayJoin(JSONExtractKeys(properties)) as property_key
    FROM events
    WHERE event = '$autocapture'
      AND timestamp >= now() - INTERVAL 7 DAY
    ORDER BY property_key
    LIMIT 100
  `;
  const autocaptureProps = await runQuery('2. PROPIEDADES EN $autocapture', query2);
  displayResults(autocaptureProps);

  // 3. Sample completo de $autocapture con todas las propiedades
  const query3 = `
    SELECT
      event,
      properties.$current_url as url,
      properties.$event_type as event_type,
      properties.elements as elements,
      timestamp
    FROM events
    WHERE event = '$autocapture'
      AND timestamp >= now() - INTERVAL 7 DAY
    ORDER BY timestamp DESC
    LIMIT 10
  `;
  const autoCaptureSample = await runQuery('3. SAMPLE DE $autocapture', query3);
  displayResults(autoCaptureSample, 5);

  // 4. Buscar si hay propiedades custom en eventos
  const query4 = `
    SELECT
      event,
      properties.$current_url as url,
      properties.proyecto_id as proyecto_id,
      properties.rol as rol,
      properties.lead_id as lead_id,
      properties.user_id as user_id,
      timestamp
    FROM events
    WHERE timestamp >= now() - INTERVAL 7 DAY
      AND (
        properties.proyecto_id IS NOT NULL
        OR properties.rol IS NOT NULL
        OR properties.lead_id IS NOT NULL
        OR properties.user_id IS NOT NULL
      )
    ORDER BY timestamp DESC
    LIMIT 20
  `;
  const customProps = await runQuery('4. EVENTOS CON PROPIEDADES CUSTOM', query4);
  displayResults(customProps);

  // 5. Distribución por rol (corregida)
  const query5 = `
    SELECT
      pdi.person.properties.rol as rol,
      count(e.uuid) as events,
      count(DISTINCT e.distinct_id) as unique_users
    FROM events e
    LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
    WHERE e.timestamp >= now() - INTERVAL 7 DAY
    GROUP BY pdi.person.properties.rol
    ORDER BY events DESC
  `;
  const roles = await runQuery('5. DISTRIBUCIÓN POR ROL', query5);
  displayResults(roles);

  // 6. Actividad por usuario identificado
  const query6 = `
    SELECT
      pdi.person.properties.email as email,
      pdi.person.properties.name as name,
      pdi.person.properties.rol as rol,
      count(DISTINCT e.properties.$session_id) as sessions,
      count(e.uuid) as total_events,
      min(e.timestamp) as first_seen,
      max(e.timestamp) as last_seen
    FROM events e
    LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
    WHERE e.timestamp >= now() - INTERVAL 7 DAY
      AND pdi.person.properties.email IS NOT NULL
    GROUP BY pdi.person.properties.email, pdi.person.properties.name, pdi.person.properties.rol
    ORDER BY total_events DESC
  `;
  const userActivity = await runQuery('6. ACTIVIDAD POR USUARIO IDENTIFICADO', query6);
  displayResults(userActivity);

  // 7. Sesiones y duración
  const query7 = `
    SELECT
      properties.$session_id as session_id,
      pdi.person.properties.email as user,
      count(e.uuid) as events_in_session,
      min(e.timestamp) as session_start,
      max(e.timestamp) as session_end,
      dateDiff('second', min(e.timestamp), max(e.timestamp)) as duration_seconds
    FROM events e
    LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
    WHERE e.timestamp >= now() - INTERVAL 7 DAY
      AND properties.$session_id IS NOT NULL
    GROUP BY properties.$session_id, pdi.person.properties.email
    ORDER BY session_start DESC
    LIMIT 20
  `;
  const sessions = await runQuery('7. SESIONES Y DURACIÓN', query7);
  displayResults(sessions, 10);

  // 8. Rage clicks (UX problems)
  const query8 = `
    SELECT
      properties.$current_url as url,
      properties.$rageclick_count as rage_count,
      pdi.person.properties.email as user,
      timestamp
    FROM events
    WHERE event = '$rageclick'
      AND timestamp >= now() - INTERVAL 7 DAY
    LEFT JOIN person_distinct_ids pdi ON events.distinct_id = pdi.distinct_id
    ORDER BY timestamp DESC
  `;
  const rageClicks = await runQuery('8. RAGE CLICKS (problemas UX)', query8);
  displayResults(rageClicks);

  // 9. Browser y device info
  const query9 = `
    SELECT
      properties.$browser as browser,
      properties.$os as os,
      properties.$device_type as device_type,
      count(DISTINCT distinct_id) as unique_users,
      count(e.uuid) as events
    FROM events e
    WHERE timestamp >= now() - INTERVAL 7 DAY
    GROUP BY properties.$browser, properties.$os, properties.$device_type
    ORDER BY events DESC
  `;
  const techStack = await runQuery('9. BROWSERS Y DISPOSITIVOS', query9);
  displayResults(techStack);

  // 10. Todas las propiedades únicas en TODOS los eventos
  const query10 = `
    SELECT DISTINCT
      arrayJoin(JSONExtractKeys(properties)) as property_key
    FROM events
    WHERE timestamp >= now() - INTERVAL 7 DAY
    ORDER BY property_key
  `;
  const allProps = await runQuery('10. TODAS LAS PROPIEDADES DISPONIBLES', query10);
  displayResults(allProps);

  console.log('\n' + '='.repeat(80));
  console.log('EXPLORACIÓN PROFUNDA COMPLETADA');
  console.log('='.repeat(80));
}

deepExplore();
