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
      console.log(`  ${col}: ${JSON.stringify(row[j])}`);
    });
  });
}

async function explorePostHog() {
  // 1. Lista de TODOS los eventos únicos
  const query1 = `
    SELECT DISTINCT event as event_name
    FROM events
    WHERE timestamp >= now() - INTERVAL 7 DAY
    ORDER BY event
  `;
  const events = await runQuery('1. TODOS LOS EVENTOS ÚNICOS (últimos 7 días)', query1);
  displayResults(events);

  // 2. Conteo de eventos por tipo
  const query2 = `
    SELECT
      event as event_name,
      count(*) as total_events,
      min(timestamp) as first_seen,
      max(timestamp) as last_seen,
      count(DISTINCT distinct_id) as unique_users
    FROM events
    WHERE timestamp >= now() - INTERVAL 7 DAY
    GROUP BY event
    ORDER BY total_events DESC
  `;
  const eventCounts = await runQuery('2. CONTEO DE EVENTOS POR TIPO', query2);
  displayResults(eventCounts);

  // 3. Eventos custom (no $ de PostHog)
  const query3 = `
    SELECT
      event as custom_event,
      count(*) as total,
      count(DISTINCT distinct_id) as unique_users
    FROM events
    WHERE timestamp >= now() - INTERVAL 7 DAY
      AND event NOT LIKE '$%'
    GROUP BY event
    ORDER BY total DESC
  `;
  const customEvents = await runQuery('3. EVENTOS CUSTOM (no $ de PostHog)', query3);
  displayResults(customEvents);

  // 4. Propiedades disponibles para $pageview
  const query4 = `
    SELECT DISTINCT
      arrayJoin(JSONExtractKeys(properties)) as property_key
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - INTERVAL 7 DAY
    ORDER BY property_key
    LIMIT 100
  `;
  const pageviewProps = await runQuery('4. PROPIEDADES DISPONIBLES EN $pageview', query4);
  displayResults(pageviewProps);

  // 5. Sample de propiedades de $pageview
  const query5 = `
    SELECT
      properties.$current_url as url,
      properties.$pathname as pathname,
      properties.$screen_name as screen,
      properties.proyecto_id as proyecto_id,
      properties.rol as rol,
      timestamp
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - INTERVAL 7 DAY
    ORDER BY timestamp DESC
    LIMIT 20
  `;
  const pageviewSample = await runQuery('5. SAMPLE DE DATOS $pageview', query5);
  displayResults(pageviewSample, 10);

  // 6. Propiedades de persona (person properties)
  const query6 = `
    SELECT DISTINCT
      arrayJoin(JSONExtractKeys(pdi.person.properties)) as person_property
    FROM events e
    LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
    WHERE e.timestamp >= now() - INTERVAL 7 DAY
    ORDER BY person_property
  `;
  const personProps = await runQuery('6. PROPIEDADES DE PERSONA DISPONIBLES', query6);
  displayResults(personProps);

  // 7. Sample de eventos custom (si existen)
  const query7 = `
    SELECT
      event,
      properties,
      timestamp,
      distinct_id
    FROM events
    WHERE timestamp >= now() - INTERVAL 7 DAY
      AND event NOT LIKE '$%'
    ORDER BY timestamp DESC
    LIMIT 10
  `;
  const customSample = await runQuery('7. SAMPLE DE EVENTOS CUSTOM', query7);
  displayResults(customSample, 5);

  // 8. URLs más visitadas
  const query8 = `
    SELECT
      properties.$pathname as pathname,
      count(*) as pageviews,
      count(DISTINCT distinct_id) as unique_visitors
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - INTERVAL 7 DAY
    GROUP BY properties.$pathname
    ORDER BY pageviews DESC
    LIMIT 20
  `;
  const topUrls = await runQuery('8. URLs MÁS VISITADAS', query8);
  displayResults(topUrls);

  // 9. Distribución por proyecto_id
  const query9 = `
    SELECT
      properties.proyecto_id as proyecto_id,
      count(*) as events,
      count(DISTINCT distinct_id) as unique_users
    FROM events
    WHERE timestamp >= now() - INTERVAL 7 DAY
      AND properties.proyecto_id IS NOT NULL
    GROUP BY properties.proyecto_id
    ORDER BY events DESC
  `;
  const proyectos = await runQuery('9. DISTRIBUCIÓN POR PROYECTO', query9);
  displayResults(proyectos);

  // 10. Distribución por rol
  const query10 = `
    SELECT
      pdi.person.properties.rol as rol,
      count(*) as events,
      count(DISTINCT e.distinct_id) as unique_users
    FROM events e
    LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
    WHERE e.timestamp >= now() - INTERVAL 7 DAY
    GROUP BY pdi.person.properties.rol
    ORDER BY events DESC
  `;
  const roles = await runQuery('10. DISTRIBUCIÓN POR ROL', query10);
  displayResults(roles);

  console.log('\n' + '='.repeat(80));
  console.log('EXPLORACIÓN COMPLETADA');
  console.log('='.repeat(80));
}

explorePostHog();
