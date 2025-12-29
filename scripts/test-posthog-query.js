const apiKey = 'phx_B3pBlK1Hcjuu18EfzapIH6iSA5RBoyGA1k0ALbUSBKjdQPE';
const projectId = '274206';

async function testQuery() {
  // Query para obtener actividad por usuario usando pdi (person_distinct_id)
  const query = `
    SELECT
      pdi.person.properties.email as email,
      pdi.person.properties.name as nombre,
      pdi.person.properties.rol as rol,
      count(DISTINCT e.properties.$session_id) as sesiones,
      count(e.uuid) as pageviews,
      min(e.timestamp) as primera_actividad,
      max(e.timestamp) as ultima_actividad
    FROM events e
    LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
    WHERE e.timestamp >= now() - INTERVAL 7 DAY
      AND e.event = '$pageview'
    GROUP BY pdi.person.properties.email, pdi.person.properties.name, pdi.person.properties.rol
    ORDER BY pageviews DESC
    LIMIT 20
  `;

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
      return;
    }

    console.log('=== COLUMNS ===');
    console.log(data.columns);

    console.log('\n=== SAMPLE DATA (first 10 rows) ===');
    data.results?.slice(0, 10).forEach((row, i) => {
      console.log(`\nRow ${i + 1}:`);
      data.columns?.forEach((col, j) => {
        console.log(`  ${col}: ${row[j]}`);
      });
    });

  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testQuery();
