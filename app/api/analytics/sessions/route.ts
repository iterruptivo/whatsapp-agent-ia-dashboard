// ============================================================================
// API: Analytics Sessions
// ============================================================================
// Consulta datos de sesiones desde PostHog usando HogQL
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const POSTHOG_HOST = process.env.POSTHOG_API_HOST || 'https://us.posthog.com';
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY || '';
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID || '';

interface PostHogQueryResult {
  results: unknown[][];
  columns: string[];
}

async function queryPostHog(sql: string): Promise<PostHogQueryResult | null> {
  if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
    console.error('[Analytics] Falta POSTHOG_PERSONAL_API_KEY o POSTHOG_PROJECT_ID');
    return null;
  }

  try {
    const response = await fetch(
      `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${POSTHOG_API_KEY}`,
        },
        body: JSON.stringify({
          query: {
            kind: 'HogQLQuery',
            query: sql,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Analytics] PostHog API error:', error);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Analytics] Query error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  // Verificar credenciales antes de intentar queries
  if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
    return NextResponse.json({
      success: false,
      error: 'API no configurada',
      message: 'Falta configurar POSTHOG_PERSONAL_API_KEY y POSTHOG_PROJECT_ID en .env.local',
      instructions: {
        step1: 'Ve a PostHog → Settings → Personal API Keys',
        step2: 'Crea una nueva key con permiso "Query read"',
        step3: 'Copia el Project ID desde Settings → Project Details',
        step4: 'Agrega a .env.local: POSTHOG_PERSONAL_API_KEY=phx_xxx y POSTHOG_PROJECT_ID=12345',
      },
    });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '7', 10);

  // Query 1: Resumen general (usando events + pdi)
  const summaryQuery = `
    SELECT
      count(DISTINCT pdi.person_id) as usuarios_unicos,
      count(DISTINCT e.properties.$session_id) as total_sesiones,
      count(e.uuid) as total_pageviews,
      dateDiff('second', min(e.timestamp), max(e.timestamp)) /
        GREATEST(count(DISTINCT e.properties.$session_id), 1) as duracion_promedio_segundos
    FROM events e
    LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
    WHERE e.timestamp >= now() - INTERVAL ${days} DAY
      AND e.event IN ('$pageview', '$pageleave')
  `;

  // Query 2: Sesiones por usuario (usando pdi.person.properties)
  // Calcular duración como diferencia entre primer y último evento
  const userSessionsQuery = `
    SELECT
      pdi.person.properties.email as email,
      pdi.person.properties.name as nombre,
      pdi.person.properties.rol as rol,
      count(DISTINCT e.properties.$session_id) as sesiones,
      count(e.uuid) as pageviews,
      dateDiff('second', min(e.timestamp), max(e.timestamp)) as tiempo_total_segundos,
      min(e.timestamp) as primera_actividad,
      max(e.timestamp) as ultima_sesion
    FROM events e
    LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
    WHERE e.timestamp >= now() - INTERVAL ${days} DAY
      AND e.event IN ('$pageview', '$pageleave')
      AND pdi.person.properties.email IS NOT NULL
    GROUP BY pdi.person.properties.email, pdi.person.properties.name, pdi.person.properties.rol
    ORDER BY pageviews DESC
    LIMIT 50
  `;

  // Query 3: Páginas más visitadas (simplificar URL)
  const topPagesQuery = `
    SELECT
      replaceRegexpAll(e.properties.$current_url, '^https?://[^/]+', '') as pagina,
      count(e.uuid) as visitas
    FROM events e
    WHERE e.event = '$pageview'
      AND e.timestamp >= now() - INTERVAL ${days} DAY
    GROUP BY pagina
    ORDER BY visitas DESC
    LIMIT 10
  `;

  // Query 4: Actividad por día
  const dailyActivityQuery = `
    SELECT
      toDate(e.timestamp) as fecha,
      count(DISTINCT pdi.person_id) as usuarios,
      count(DISTINCT e.properties.$session_id) as sesiones,
      count(e.uuid) as pageviews
    FROM events e
    LEFT JOIN person_distinct_ids pdi ON e.distinct_id = pdi.distinct_id
    WHERE e.timestamp >= now() - INTERVAL ${days} DAY
      AND e.event = '$pageview'
    GROUP BY fecha
    ORDER BY fecha ASC
  `;

  try {
    const [summary, userSessions, topPages, dailyActivity] = await Promise.all([
      queryPostHog(summaryQuery),
      queryPostHog(userSessionsQuery),
      queryPostHog(topPagesQuery),
      queryPostHog(dailyActivityQuery),
    ]);

    // Transformar resultados a formato legible
    const formatResults = (result: PostHogQueryResult | null) => {
      if (!result) return [];
      return result.results.map((row) => {
        const obj: Record<string, unknown> = {};
        result.columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      });
    };

    return NextResponse.json({
      success: true,
      days,
      data: {
        summary: formatResults(summary)[0] || null,
        userSessions: formatResults(userSessions),
        topPages: formatResults(topPages),
        dailyActivity: formatResults(dailyActivity),
      },
    });
  } catch (error) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al consultar analytics' },
      { status: 500 }
    );
  }
}
