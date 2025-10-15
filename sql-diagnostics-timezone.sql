-- ============================================================
-- DIAGNÓSTICO COMPLETO: TIMEZONE Y TIMESTAMP VERIFICATION
-- Proyecto: EcoPlaza Dashboard
-- Fecha: 14 Octubre 2025
-- ============================================================

-- ===========================
-- 1. VERIFICAR TIMEZONE DEL SERVIDOR SUPABASE
-- ===========================

-- Timezone actual del servidor PostgreSQL
SELECT current_setting('TIMEZONE') AS server_timezone;

-- Expected: UTC (Supabase siempre usa UTC por defecto)


-- ===========================
-- 2. VERIFICAR FECHA Y HORA ACTUAL EN DIFERENTES TIMEZONES
-- ===========================

-- Hora actual en UTC (servidor)
SELECT NOW() AS current_time_utc;

-- Hora actual en Lima (UTC-5)
SELECT NOW() AT TIME ZONE 'America/Lima' AS current_time_lima;

-- Diferencia en horas entre UTC y Lima
SELECT
  NOW() AS utc,
  NOW() AT TIME ZONE 'America/Lima' AS lima,
  EXTRACT(EPOCH FROM (NOW() - (NOW() AT TIME ZONE 'America/Lima'))) / 3600 AS hour_difference;

-- Expected hour_difference: 0 (porque ambos son el mismo momento, solo representación diferente)


-- ===========================
-- 3. VERIFICAR DATOS DEL ÚLTIMO LEAD (TU PRUEBA)
-- ===========================

SELECT
  telefono,
  nombre,
  horario_visita AS usuario_dijo,
  horario_visita_timestamp AS guardado_utc,

  -- Convertir a Lima timezone para display
  horario_visita_timestamp AT TIME ZONE 'America/Lima' AS guardado_lima,

  -- Extraer componentes en timezone Lima
  EXTRACT(YEAR FROM horario_visita_timestamp AT TIME ZONE 'America/Lima') AS year_lima,
  EXTRACT(MONTH FROM horario_visita_timestamp AT TIME ZONE 'America/Lima') AS month_lima,
  EXTRACT(DAY FROM horario_visita_timestamp AT TIME ZONE 'America/Lima') AS day_lima,
  EXTRACT(DOW FROM horario_visita_timestamp AT TIME ZONE 'America/Lima') AS day_of_week_number,

  -- Nombre del día de la semana
  TO_CHAR(horario_visita_timestamp AT TIME ZONE 'America/Lima', 'Day') AS day_name,
  TO_CHAR(horario_visita_timestamp AT TIME ZONE 'America/Lima', 'DD/MM/YYYY') AS fecha_lima,

  -- Hora en Lima
  EXTRACT(HOUR FROM horario_visita_timestamp AT TIME ZONE 'America/Lima') AS hour_lima,
  EXTRACT(MINUTE FROM horario_visita_timestamp AT TIME ZONE 'America/Lima') AS minute_lima,
  TO_CHAR(horario_visita_timestamp AT TIME ZONE 'America/Lima', 'HH12:MI AM') AS hora_formateada,

  -- Metadata
  fecha_captura,
  estado
FROM leads
WHERE horario_visita_timestamp IS NOT NULL
ORDER BY fecha_captura DESC
LIMIT 5;

-- Expected para tu prueba "próximo jueves 4pm":
-- guardado_utc: 2025-10-XX 21:00:00+00 (9pm UTC)
-- guardado_lima: 2025-10-XX 16:00:00 (4pm Lima)
-- day_of_week_number: 4 (jueves = Thursday = 4)
-- day_name: Thursday (o Jueves si locale es español)
-- hour_lima: 16 (4pm en formato 24h)
-- hora_formateada: 04:00 PM


-- ===========================
-- 4. VERIFICAR SI FECHA ES CORRECTA (JUEVES)
-- ===========================

-- Días de la semana en PostgreSQL:
-- 0 = Sunday (Domingo)
-- 1 = Monday (Lunes)
-- 2 = Tuesday (Martes)
-- 3 = Wednesday (Miércoles)
-- 4 = Thursday (Jueves) ← ESPERADO
-- 5 = Friday (Viernes)
-- 6 = Saturday (Sábado)

SELECT
  telefono,
  horario_visita AS usuario_dijo,
  horario_visita_timestamp AT TIME ZONE 'America/Lima' AS timestamp_lima,
  EXTRACT(DOW FROM horario_visita_timestamp AT TIME ZONE 'America/Lima') AS day_number,
  CASE EXTRACT(DOW FROM horario_visita_timestamp AT TIME ZONE 'America/Lima')
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Lunes'
    WHEN 2 THEN 'Martes'
    WHEN 3 THEN 'Miércoles'
    WHEN 4 THEN 'Jueves'  -- ← ESTE DEBE SER EL RESULTADO
    WHEN 5 THEN 'Viernes'
    WHEN 6 THEN 'Sábado'
  END AS dia_semana,

  -- Verificar si el día es jueves
  CASE
    WHEN EXTRACT(DOW FROM horario_visita_timestamp AT TIME ZONE 'America/Lima') = 4
    THEN '✅ CORRECTO - Es jueves'
    ELSE '❌ ERROR - NO es jueves'
  END AS validacion
FROM leads
WHERE horario_visita_timestamp IS NOT NULL
ORDER BY fecha_captura DESC
LIMIT 1;


-- ===========================
-- 5. CALCULAR "PRÓXIMO JUEVES" DESDE HOY
-- ===========================

-- Fecha de hoy en Lima
SELECT
  CURRENT_DATE AS hoy_utc,
  (NOW() AT TIME ZONE 'America/Lima')::DATE AS hoy_lima,
  EXTRACT(DOW FROM (NOW() AT TIME ZONE 'America/Lima')::DATE) AS dow_hoy,
  CASE EXTRACT(DOW FROM (NOW() AT TIME ZONE 'America/Lima')::DATE)
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Lunes'
    WHEN 2 THEN 'Martes'  -- ← HOY (14 Oct 2025)
    WHEN 3 THEN 'Miércoles'
    WHEN 4 THEN 'Jueves'
    WHEN 5 THEN 'Viernes'
    WHEN 6 THEN 'Sábado'
  END AS dia_hoy;

-- Calcular próximo jueves desde hoy (14 Oct = Martes)
WITH hoy AS (
  SELECT (NOW() AT TIME ZONE 'America/Lima')::DATE AS fecha
),
calculo AS (
  SELECT
    fecha AS hoy,
    EXTRACT(DOW FROM fecha) AS dow_hoy,
    -- Si hoy es martes (2), próximo jueves = hoy + 2 días
    -- Si hoy es jueves (4), próximo jueves = hoy + 7 días
    -- Formula: (4 - dow_hoy + 7) % 7 días (o +7 si resultado = 0)
    CASE
      WHEN EXTRACT(DOW FROM fecha) < 4 THEN fecha + (4 - EXTRACT(DOW FROM fecha))::INTEGER
      ELSE fecha + (7 - EXTRACT(DOW FROM fecha) + 4)::INTEGER
    END AS proximo_jueves
  FROM hoy
)
SELECT
  hoy,
  dow_hoy,
  proximo_jueves,
  TO_CHAR(proximo_jueves, 'Day DD/MM/YYYY') AS proximo_jueves_formato,
  EXTRACT(DOW FROM proximo_jueves) AS dow_jueves,
  CASE
    WHEN proximo_jueves = '2025-10-16'::DATE
    THEN '✅ CORRECTO - 16 Oct es próximo jueves'
    ELSE '❌ ERROR - Debería ser 16 Oct'
  END AS validacion
FROM calculo;

-- Expected:
-- hoy: 2025-10-14
-- dow_hoy: 2 (martes)
-- proximo_jueves: 2025-10-16 (jueves)
-- dow_jueves: 4 (jueves)


-- ===========================
-- 6. COMPARAR TIMESTAMP GUARDADO VS ESPERADO
-- ===========================

SELECT
  'Tu prueba' AS tipo,
  horario_visita AS input_usuario,
  horario_visita_timestamp AT TIME ZONE 'America/Lima' AS guardado,
  '2025-10-16 16:00:00' AS esperado,
  CASE
    WHEN (horario_visita_timestamp AT TIME ZONE 'America/Lima')::TEXT LIKE '2025-10-16 16:00%'
    THEN '✅ CORRECTO'
    ELSE '❌ ERROR - Fecha u hora incorrecta'
  END AS resultado
FROM leads
WHERE horario_visita_timestamp IS NOT NULL
ORDER BY fecha_captura DESC
LIMIT 1;


-- ===========================
-- 7. VERIFICAR TODOS LOS TIMESTAMPS (HISTÓRICO)
-- ===========================

SELECT
  telefono,
  horario_visita AS usuario_dijo,
  horario_visita_timestamp AS utc,
  horario_visita_timestamp AT TIME ZONE 'America/Lima' AS lima,
  TO_CHAR(horario_visita_timestamp AT TIME ZONE 'America/Lima', 'Day DD/MM/YYYY HH12:MI AM') AS formato_legible,
  fecha_captura
FROM leads
WHERE horario_visita_timestamp IS NOT NULL
ORDER BY fecha_captura DESC
LIMIT 10;


-- ===========================
-- 8. RESUMEN PARA PROJECT LEADER
-- ===========================

SELECT
  '=== RESUMEN TIMEZONE CONFIGURATION ===' AS titulo
UNION ALL
SELECT 'Servidor PostgreSQL timezone: ' || current_setting('TIMEZONE')
UNION ALL
SELECT 'Hora actual UTC: ' || NOW()::TEXT
UNION ALL
SELECT 'Hora actual Lima: ' || (NOW() AT TIME ZONE 'America/Lima')::TEXT
UNION ALL
SELECT 'Hoy (fecha Lima): ' || (NOW() AT TIME ZONE 'America/Lima')::DATE::TEXT
UNION ALL
SELECT 'Próximo jueves esperado: 2025-10-16'
UNION ALL
SELECT '=== FIN RESUMEN ===';
