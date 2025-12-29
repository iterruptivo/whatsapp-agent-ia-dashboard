/**
 * POSTHOG EXECUTIVE REPORT
 *
 * Genera un reporte ejecutivo con las métricas disponibles en PostHog.
 *
 * Uso: node scripts/posthog-executive-report.js [días]
 * Ejemplo: node scripts/posthog-executive-report.js 30
 */

const apiKey = 'phx_B3pBlK1Hcjuu18EfzapIH6iSA5RBoyGA1k0ALbUSBKjdQPE';
const projectId = '274206';

async function runQuery(query) {
  try {
    const res = await fetch(`https://us.posthog.com/api/projects/${projectId}/query/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query } })
    });

    const data = await res.json();
    if (data.error || !data.results) {
      console.error('Query error:', data.error || 'No results');
      return null;
    }

    return data;
  } catch (e) {
    console.error('Fetch error:', e);
    return null;
  }
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatDate(isoDate) {
  const d = new Date(isoDate);
  return d.toLocaleString('es-PE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function generateReport(days = 7) {
  console.log('='.repeat(80));
  console.log(`REPORTE EJECUTIVO - POSTHOG ANALYTICS`);
  console.log(`Periodo: Últimos ${days} días`);
  console.log(`Generado: ${new Date().toLocaleString('es-PE')}`);
  console.log('='.repeat(80));

  // 1. Resumen General
  console.log('\n1. RESUMEN GENERAL\n');
  const summary = await runQuery(`
    SELECT
      count(DISTINCT distinct_id) as usuarios_activos,
      count(DISTINCT properties.$session_id) as sesiones_totales,
      count(uuid) as eventos_totales,
      count(DISTINCT DATE(timestamp)) as dias_con_actividad,
      avg(dateDiff('second', min(timestamp), max(timestamp))) as duracion_promedio_sesion
    FROM events
    WHERE timestamp >= now() - INTERVAL ${days} DAY
      AND properties.$session_id IS NOT NULL
  `);

  if (summary?.results?.[0]) {
    const [usuarios, sesiones, eventos, diasActivos, duracion] = summary.results[0];
    console.log(`  Usuarios Activos:          ${usuarios}`);
    console.log(`  Sesiones Totales:          ${sesiones}`);
    console.log(`  Eventos Totales:           ${eventos}`);
    console.log(`  Días con Actividad:        ${diasActivos} de ${days}`);
    console.log(`  Duración Promedio Sesión:  ${formatDuration(Math.floor(duracion || 0))}`);
    console.log(`  Eventos por Sesión:        ${sesiones > 0 ? Math.floor(eventos / sesiones) : 0}`);
  }

  // 2. Usuarios Activos por Rol
  console.log('\n2. ACTIVIDAD POR ROL\n');
  const byRole = await runQuery(`
    SELECT
      pdi.person.properties.rol as rol,
      count(DISTINCT e.distinct_id) as usuarios,
      count(DISTINCT e.properties.$session_id) as sesiones,
      count(e.uuid) as eventos
    FROM events e
    LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
    WHERE e.timestamp >= now() - INTERVAL ${days} DAY
      AND pdi.person.properties.rol IS NOT NULL
    GROUP BY pdi.person.properties.rol
    ORDER BY eventos DESC
  `);

  if (byRole?.results?.length > 0) {
    console.log('  Rol          | Usuarios | Sesiones | Eventos');
    console.log('  ' + '-'.repeat(50));
    byRole.results.forEach(row => {
      const [rol, usuarios, sesiones, eventos] = row;
      console.log(`  ${(rol || 'Sin rol').padEnd(12)} | ${String(usuarios).padStart(8)} | ${String(sesiones).padStart(8)} | ${String(eventos).padStart(7)}`);
    });
  } else {
    console.log('  No hay datos de roles disponibles');
  }

  // 3. Usuarios Más Activos
  console.log('\n3. TOP 10 USUARIOS MÁS ACTIVOS\n');
  const topUsers = await runQuery(`
    SELECT
      pdi.person.properties.email as email,
      pdi.person.properties.name as nombre,
      pdi.person.properties.rol as rol,
      count(DISTINCT e.properties.$session_id) as sesiones,
      count(e.uuid) as eventos,
      max(e.timestamp) as ultima_actividad
    FROM events e
    LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
    WHERE e.timestamp >= now() - INTERVAL ${days} DAY
      AND pdi.person.properties.email IS NOT NULL
    GROUP BY pdi.person.properties.email, pdi.person.properties.name, pdi.person.properties.rol
    ORDER BY eventos DESC
    LIMIT 10
  `);

  if (topUsers?.results?.length > 0) {
    console.log('  Email                     | Nombre          | Rol    | Sesiones | Eventos | Última Actividad');
    console.log('  ' + '-'.repeat(100));
    topUsers.results.forEach(row => {
      const [email, nombre, rol, sesiones, eventos, ultima] = row;
      console.log(`  ${(email || '').padEnd(25)} | ${(nombre || '').padEnd(15)} | ${(rol || '').padEnd(6)} | ${String(sesiones).padStart(8)} | ${String(eventos).padStart(7)} | ${formatDate(ultima)}`);
    });
  } else {
    console.log('  No hay usuarios identificados');
  }

  // 4. Páginas Más Visitadas
  console.log('\n4. PÁGINAS MÁS VISITADAS\n');
  const topPages = await runQuery(`
    SELECT
      properties.$pathname as pagina,
      count(*) as visitas,
      count(DISTINCT distinct_id) as visitantes_unicos,
      avg(properties.$prev_pageview_duration) as tiempo_promedio
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= now() - INTERVAL ${days} DAY
    GROUP BY properties.$pathname
    ORDER BY visitas DESC
    LIMIT 10
  `);

  if (topPages?.results?.length > 0) {
    console.log('  Página                    | Visitas | Visitantes | Tiempo Prom.');
    console.log('  ' + '-'.repeat(70));
    topPages.results.forEach(row => {
      const [pagina, visitas, visitantes, tiempo] = row;
      const tiempoStr = tiempo ? formatDuration(Math.floor(tiempo)) : 'N/A';
      console.log(`  ${(pagina || '/').padEnd(25)} | ${String(visitas).padStart(7)} | ${String(visitantes).padStart(10)} | ${tiempoStr}`);
    });
  }

  // 5. Actividad Diaria
  console.log('\n5. ACTIVIDAD DIARIA\n');
  const daily = await runQuery(`
    SELECT
      DATE(timestamp) as fecha,
      count(DISTINCT distinct_id) as usuarios,
      count(DISTINCT properties.$session_id) as sesiones,
      count(uuid) as eventos
    FROM events
    WHERE timestamp >= now() - INTERVAL ${days} DAY
      AND properties.$session_id IS NOT NULL
    GROUP BY DATE(timestamp)
    ORDER BY fecha DESC
    LIMIT 10
  `);

  if (daily?.results?.length > 0) {
    console.log('  Fecha       | Usuarios | Sesiones | Eventos');
    console.log('  ' + '-'.repeat(50));
    daily.results.forEach(row => {
      const [fecha, usuarios, sesiones, eventos] = row;
      console.log(`  ${fecha.padEnd(11)} | ${String(usuarios).padStart(8)} | ${String(sesiones).padStart(8)} | ${String(eventos).padStart(7)}`);
    });
  }

  // 6. Distribución de Eventos
  console.log('\n6. DISTRIBUCIÓN DE EVENTOS\n');
  const eventDist = await runQuery(`
    SELECT
      event,
      count(*) as total,
      count(DISTINCT distinct_id) as usuarios_unicos
    FROM events
    WHERE timestamp >= now() - INTERVAL ${days} DAY
    GROUP BY event
    ORDER BY total DESC
  `);

  if (eventDist?.results?.length > 0) {
    console.log('  Evento                    | Total   | Usuarios');
    console.log('  ' + '-'.repeat(50));
    eventDist.results.forEach(row => {
      const [evento, total, usuarios] = row;
      console.log(`  ${(evento || '').padEnd(25)} | ${String(total).padStart(7)} | ${String(usuarios).padStart(8)}`);
    });
  }

  // 7. Tecnología Utilizada
  console.log('\n7. TECNOLOGÍA UTILIZADA\n');
  const tech = await runQuery(`
    SELECT
      properties.$browser as browser,
      properties.$os as os,
      properties.$device_type as device,
      count(DISTINCT distinct_id) as usuarios,
      count(uuid) as eventos
    FROM events
    WHERE timestamp >= now() - INTERVAL ${days} DAY
    GROUP BY properties.$browser, properties.$os, properties.$device_type
    ORDER BY usuarios DESC
    LIMIT 10
  `);

  if (tech?.results?.length > 0) {
    console.log('  Browser    | OS         | Device  | Usuarios | Eventos');
    console.log('  ' + '-'.repeat(60));
    tech.results.forEach(row => {
      const [browser, os, device, usuarios, eventos] = row;
      console.log(`  ${(browser || 'N/A').padEnd(10)} | ${(os || 'N/A').padEnd(10)} | ${(device || 'N/A').padEnd(7)} | ${String(usuarios).padStart(8)} | ${String(eventos).padStart(7)}`);
    });
  }

  // 8. Sesiones Largas (engagement alto)
  console.log('\n8. SESIONES MÁS LARGAS (TOP 10)\n');
  const longSessions = await runQuery(`
    SELECT
      properties.$session_id as session_id,
      pdi.person.properties.email as usuario,
      count(e.uuid) as eventos,
      min(e.timestamp) as inicio,
      max(e.timestamp) as fin,
      dateDiff('second', min(e.timestamp), max(e.timestamp)) as duracion
    FROM events e
    LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
    WHERE e.timestamp >= now() - INTERVAL ${days} DAY
      AND properties.$session_id IS NOT NULL
    GROUP BY properties.$session_id, pdi.person.properties.email
    HAVING duracion > 0
    ORDER BY duracion DESC
    LIMIT 10
  `);

  if (longSessions?.results?.length > 0) {
    console.log('  Usuario                   | Eventos | Duración  | Inicio');
    console.log('  ' + '-'.repeat(80));
    longSessions.results.forEach(row => {
      const [, usuario, eventos, inicio, , duracion] = row;
      console.log(`  ${(usuario || 'Anónimo').padEnd(25)} | ${String(eventos).padStart(7)} | ${formatDuration(duracion).padEnd(9)} | ${formatDate(inicio)}`);
    });
  }

  // 9. Problemas UX (Rage Clicks)
  console.log('\n9. PROBLEMAS UX (RAGE CLICKS)\n');
  const rageClicks = await runQuery(`
    SELECT
      properties.$current_url as url,
      count(*) as rage_clicks,
      count(DISTINCT distinct_id) as usuarios_afectados
    FROM events
    WHERE event = '$rageclick'
      AND timestamp >= now() - INTERVAL ${days} DAY
    GROUP BY properties.$current_url
    ORDER BY rage_clicks DESC
  `);

  if (rageClicks?.results?.length > 0) {
    console.log('  URL                                          | Rage Clicks | Usuarios');
    console.log('  ' + '-'.repeat(70));
    rageClicks.results.forEach(row => {
      const [url, clicks, usuarios] = row;
      const urlShort = url.length > 45 ? url.substring(0, 42) + '...' : url;
      console.log(`  ${urlShort.padEnd(45)} | ${String(clicks).padStart(11)} | ${String(usuarios).padStart(8)}`);
    });
  } else {
    console.log('  No se detectaron rage clicks (excelente UX!)');
  }

  // 10. Métricas de Retención
  console.log('\n10. RETENCIÓN\n');
  const retention = await runQuery(`
    SELECT
      pdi.person.properties.email as usuario,
      count(DISTINCT DATE(e.timestamp)) as dias_activos,
      min(DATE(e.timestamp)) as primer_dia,
      max(DATE(e.timestamp)) as ultimo_dia
    FROM events e
    LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
    WHERE e.timestamp >= now() - INTERVAL ${days} DAY
      AND pdi.person.properties.email IS NOT NULL
    GROUP BY pdi.person.properties.email
    ORDER BY dias_activos DESC
  `);

  if (retention?.results?.length > 0) {
    const totalUsuarios = retention.results.length;
    const usuariosRecurrentes = retention.results.filter(r => r[1] > 1).length;
    const porcentajeRetencion = ((usuariosRecurrentes / totalUsuarios) * 100).toFixed(1);

    console.log(`  Total Usuarios:            ${totalUsuarios}`);
    console.log(`  Usuarios Recurrentes:      ${usuariosRecurrentes}`);
    console.log(`  Tasa de Retención:         ${porcentajeRetencion}%`);
    console.log('');
    console.log('  Usuario                   | Días Activos | Primer Día  | Último Día');
    console.log('  ' + '-'.repeat(70));
    retention.results.slice(0, 10).forEach(row => {
      const [usuario, dias, primero, ultimo] = row;
      console.log(`  ${(usuario || '').padEnd(25)} | ${String(dias).padStart(12)} | ${primero.padEnd(11)} | ${ultimo}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('FIN DEL REPORTE');
  console.log('='.repeat(80));
}

// Ejecutar
const days = parseInt(process.argv[2]) || 7;
generateReport(days);
